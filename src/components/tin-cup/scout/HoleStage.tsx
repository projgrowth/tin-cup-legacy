import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Layers,
  LocateFixed,
} from "lucide-react";

import { HoleMap } from "@/components/tin-cup/HoleMap";
import {
  SatelliteHoleMap,
  type SatelliteHoleMapHandle,
} from "@/components/tin-cup/SatelliteHoleMap";
import { DistanceStack } from "@/components/tin-cup/scout/DistanceStack";
import type { CourseId, Hole } from "@/lib/courses";
import { getGeoHole, greenTarget } from "@/lib/geo-courses";
import { bboxContains, haversineYards } from "@/lib/geo";
import { useGeolocation } from "@/hooks/useGeolocation";

export type MapMode = "sat" | "diagram";

const MODE_KEY = "tc-hole-map-mode-v3";

/**
 * Immersive map stage — satellite first, minimal chrome, robust fallback.
 */
export function HoleStage({
  courseId,
  hole,
  accentClass,
  isSnake,
  index,
  total,
  onPrev,
  onNext,
  canPrev,
  canNext,
  topBar,
}: {
  courseId: CourseId;
  hole: Hole;
  accentClass: string;
  isSnake?: boolean;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  /** Course/hole control row rendered over the map */
  topBar?: ReactNode;
}) {
  const geo = useMemo(() => getGeoHole(courseId, hole.h), [courseId, hole.h]);
  const hasSat = Boolean(geo);
  const satRef = useRef<SatelliteHoleMapHandle>(null);

  const [mode, setMode] = useState<MapMode>(hasSat ? "sat" : "diagram");
  const [gpsOn, setGpsOn] = useState(false);
  const [satFailed, setSatFailed] = useState(false);

  const { fix, error: gpsError, active: gpsActive } = useGeolocation(gpsOn);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(MODE_KEY);
      if (saved === "sat" || saved === "diagram") {
        if (saved === "sat" && !hasSat) setMode("diagram");
        else setMode(saved);
      }
    } catch {
      /* ignore */
    }
  }, [hasSat]);

  useEffect(() => {
    if (mode === "sat" && (!hasSat || satFailed)) setMode("diagram");
  }, [mode, hasSat, satFailed]);

  useEffect(() => {
    setSatFailed(false);
  }, [courseId, hole.h]);

  function selectMode(next: MapMode) {
    if (next === "sat" && (!hasSat || satFailed)) return;
    setMode(next);
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const pin = geo ? greenTarget(geo) : null;
  const gpsYardsToGreen =
    fix && pin ? Math.round(haversineYards(fix.point, pin)) : null;
  const nearHole =
    fix && geo ? bboxContains(geo.bounds, fix.point, 0.003) : null;

  const mapHeight = "h-[min(68svh,520px)] w-full sm:h-[min(62vh,500px)]";

  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);

  return (
    <section
      className={`relative overflow-hidden rounded-[1.35rem] ring-1 ${accentClass} ${
        isSnake ? "ring-copper/45" : ""
      } bg-[var(--turf-rough)] shadow-[0_24px_60px_-28px_oklch(0_0_0/80%)]`}
    >
      {/* Single top instrument row */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2.5 sm:p-3">
        <div className="min-w-0 flex-1">{topBar}</div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <DistanceStack
            hole={hole}
            gpsYardsToGreen={gpsYardsToGreen}
            gpsNearHole={nearHole}
            compact
          />
        </div>
      </div>

      {/* Floating tools — left */}
      <div className="absolute bottom-[3.75rem] left-2.5 z-20 flex flex-col gap-1.5 sm:left-3">
        <div className="glass-panel flex p-0.5">
          <button
            type="button"
            onClick={() => selectMode("sat")}
            disabled={!hasSat || satFailed}
            className={`press min-h-10 rounded-xl px-3 text-xs font-bold disabled:opacity-35 ${
              mode === "sat" ? "bg-white/15 text-white" : "text-white/55"
            }`}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => selectMode("diagram")}
            className={`press min-h-10 rounded-xl px-3 text-xs font-bold ${
              mode === "diagram" ? "bg-white/15 text-white" : "text-white/55"
            }`}
          >
            <Layers className="size-3.5 sm:mr-1 sm:inline" />
            <span className="hidden sm:inline">Diagram</span>
          </button>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setGpsOn((v) => !v)}
            className={`press glass-panel inline-flex min-h-10 items-center gap-1.5 px-3 text-xs font-bold ${
              gpsOn && gpsActive ? "text-sky-100" : "text-white/65"
            }`}
            aria-pressed={gpsOn}
          >
            <LocateFixed className="size-3.5 opacity-85" />
            {gpsOn ? (gpsActive ? "Live" : "…") : "GPS"}
          </button>
          {mode === "sat" && hasSat && (
            <button
              type="button"
              onClick={() => satRef.current?.resetView()}
              className="press glass-panel inline-flex min-h-10 items-center gap-1.5 px-3 text-xs font-bold text-white/65"
              aria-label="Recenter hole"
            >
              <Crosshair className="size-3.5 opacity-85" />
              Fit
            </button>
          )}
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(ellipse_at_center,transparent_52%,oklch(0.06_0.02_160/45%)_100%)]"
      />

      {mode === "sat" && geo ? (
        <div
          className={mapHeight}
          onTouchStart={(e) => {
            if (e.touches.length !== 1) {
              swipeRef.current = null;
              return;
            }
            const t = e.touches[0]!;
            swipeRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
          }}
          onTouchEnd={(e) => {
            const start = swipeRef.current;
            swipeRef.current = null;
            if (!start || e.changedTouches.length !== 1) return;
            const t = e.changedTouches[0]!;
            const dx = t.clientX - start.x;
            const dy = t.clientY - start.y;
            const dt = Date.now() - start.t;
            if (dt > 420 || Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.6)
              return;
            if (dx < 0 && canNext) onNext();
            if (dx > 0 && canPrev) onPrev();
          }}
        >
          <SatelliteHoleMap
            ref={satRef}
            geo={geo}
            className="size-full"
            gpsPoint={gpsOn ? fix?.point ?? null : null}
            gpsAccuracyM={gpsOn ? fix?.accuracyM ?? null : null}
            onError={() => setSatFailed(true)}
          />
        </div>
      ) : (
        <HoleMap
          hole={hole}
          className={`block ${mapHeight} bg-transparent`}
          onSwipeHole={(delta) => {
            if (delta < 0 && canPrev) onPrev();
            if (delta > 0 && canNext) onNext();
          }}
        />
      )}

      {/* Minimal hole stepper */}
      <div className="flex items-center border-t border-white/10 bg-black/55 backdrop-blur-md">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          className="press flex min-h-12 flex-1 items-center justify-center text-white disabled:opacity-30"
          aria-label="Previous hole"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="min-w-[5.5rem] text-center">
          <p className="text-sm font-bold tabular-nums text-white">
            {index + 1}
            <span className="text-white/35">/{total}</span>
          </p>
          {(gpsError || (gpsOn && nearHole === false)) && (
            <p className="text-[0.6rem] font-medium text-white/45">
              {gpsError ? "Location off" : "Walk to hole"}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="press flex min-h-12 flex-1 items-center justify-center text-white disabled:opacity-30"
          aria-label="Next hole"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </section>
  );
}
