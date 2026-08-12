import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Flag,
  Layers,
  LocateFixed,
  Map as MapIcon,
} from "lucide-react";

import { HoleMap } from "@/components/tin-cup/HoleMap";
import {
  SatelliteHoleMap,
  type SatelliteHoleMapHandle,
} from "@/components/tin-cup/SatelliteHoleMap";
import { DistanceStack } from "@/components/tin-cup/scout/DistanceStack";
import type { CourseId, Hole } from "@/lib/courses";
import { getGeoHole, holeGreenTriple } from "@/lib/geo-courses";
import { bboxContains, haversineYards } from "@/lib/geo";
import { useGeolocation } from "@/hooks/useGeolocation";

export type MapMode = "sat" | "diagram";

const MODE_KEY = "tc-hole-map-mode-v5";

/**
 * Grint-class hole stage: full-bleed aerial, F/C/B widget, Play (GPS) mode.
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
  onPlayModeChange,
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
  /** Notify parent when Play GPS is on (collapse plan sheet, etc.). */
  onPlayModeChange?: (on: boolean) => void;
}) {
  const geo = useMemo(() => getGeoHole(courseId, hole.h), [courseId, hole.h]);
  const triple = useMemo(() => (geo ? holeGreenTriple(geo) : null), [geo]);
  const hasSat = Boolean(geo);
  const satRef = useRef<SatelliteHoleMapHandle>(null);

  const [mode, setMode] = useState<MapMode>(hasSat ? "sat" : "diagram");
  const [gpsOn, setGpsOn] = useState(false);
  const [satFailed, setSatFailed] = useState(false);

  const { fix, error: gpsError, active: gpsActive } = useGeolocation(gpsOn);

  useEffect(() => {
    onPlayModeChange?.(gpsOn);
  }, [gpsOn, onPlayModeChange]);

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

  useEffect(() => {
    if (gpsOn && hasSat && !satFailed) setMode("sat");
  }, [gpsOn, hasSat, satFailed]);

  function selectMode(next: MapMode) {
    if (next === "sat" && (!hasSat || satFailed)) return;
    if (next === "diagram" && gpsOn) setGpsOn(false);
    setMode(next);
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const nearHole =
    fix && geo ? bboxContains(geo.bounds, fix.point, 0.003) : null;

  // F/C/B: scorecard yards from tee, or live GPS distances
  const fcb = useMemo(() => {
    if (!triple) {
      return {
        front: Math.max(1, hole.yards - 14),
        center: hole.yards,
        back: hole.yards + 12,
      };
    }
    if (gpsOn && gpsActive && fix) {
      return {
        front: Math.round(haversineYards(fix.point, triple.front)),
        center: Math.round(haversineYards(fix.point, triple.center)),
        back: Math.round(haversineYards(fix.point, triple.back)),
      };
    }
    return {
      front: triple.yardsFromTee.front,
      center: triple.yardsFromTee.center,
      back: triple.yardsFromTee.back,
    };
  }, [triple, gpsOn, gpsActive, fix, hole.yards]);

  // Play mode: taller map, less chrome noise
  const mapHeight = gpsOn
    ? "h-[min(84svh,680px)] w-full sm:h-[min(78vh,700px)] lg:h-[min(80vh,760px)]"
    : "h-[min(78svh,620px)] w-full sm:h-[min(72vh,640px)] lg:h-[min(74vh,700px)]";

  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const toolBtn = (on: boolean, extra = "") =>
    `press flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-xl px-2.5 text-xs font-bold ${
      on ? "bg-white/18 text-white" : "text-white/55"
    } ${extra}`;

  return (
    <section
      className={`relative overflow-hidden rounded-[1.15rem] ${accentClass} ${
        isSnake ? "ring-1 ring-copper/40" : "ring-1 ring-white/10"
      } bg-black shadow-[0_20px_50px_-24px_oklch(0_0_0/75%)]`}
    >
      {/* Top HUD — slimmer in Play */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2.5 sm:p-3">
        <div
          className={`pointer-events-auto glass-panel max-w-[min(100%,11.5rem)] ${
            gpsOn ? "px-2.5 py-1.5" : "px-3 py-2"
          }`}
        >
          <p className="flex items-baseline gap-2">
            <span
              className={`hud-num leading-none text-white ${
                gpsOn ? "text-2xl" : "text-3xl"
              }`}
            >
              {hole.h}
            </span>
            <span className="text-sm font-bold text-white/85">
              Par {hole.par}
            </span>
          </p>
          {!gpsOn && (
            <p className="mt-1 truncate text-xs font-semibold text-white/60">
              {hole.name ?? `Hole ${hole.h}`}
              {isSnake ? " · Pit" : ""}
            </p>
          )}
        </div>
        <div className="pointer-events-auto">
          <DistanceStack
            front={fcb.front}
            center={fcb.center}
            back={fcb.back}
            blackYards={hole.yards}
            gpsEnabled={gpsOn}
            gpsActive={gpsActive}
            gpsError={gpsError}
            gpsNearHole={nearHole}
          />
        </div>
      </div>

      {/* Tool cluster */}
      <div className="absolute bottom-[3.35rem] left-2.5 z-20 sm:left-3">
        <div className="glass-panel flex items-center gap-0.5 p-0.5">
          {!gpsOn && (
            <>
              <button
                type="button"
                onClick={() => selectMode("sat")}
                disabled={!hasSat || satFailed}
                className={toolBtn(mode === "sat", "disabled:opacity-35")}
                aria-label="Satellite map"
              >
                <MapIcon className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => selectMode("diagram")}
                className={toolBtn(mode === "diagram")}
                aria-label="Schematic diagram"
              >
                <Layers className="size-3.5" />
              </button>
              <span className="mx-0.5 h-5 w-px bg-white/15" aria-hidden />
            </>
          )}
          <button
            type="button"
            onClick={() => setGpsOn((v) => !v)}
            className={toolBtn(
              gpsOn && gpsActive,
              gpsOn ? "text-sky-100 ring-1 ring-sky-400/25" : "",
            )}
            aria-pressed={gpsOn}
            aria-label={gpsOn ? "Exit play GPS" : "Play GPS mode"}
          >
            <LocateFixed className="size-3.5" />
            <span className={gpsOn ? "" : "hidden sm:inline"}>
              {gpsOn ? (gpsActive ? "Play" : "…") : "Play"}
            </span>
          </button>
          {mode === "sat" && hasSat && (
            <>
              <button
                type="button"
                onClick={() => satRef.current?.focusGreen()}
                className={toolBtn(false, "text-gold-light/90")}
                aria-label="Focus green"
              >
                <Flag className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => satRef.current?.resetView()}
                className={toolBtn(false)}
                aria-label="Fit hole"
              >
                <Crosshair className="size-3.5" />
              </button>
            </>
          )}
        </div>
        {gpsOn && gpsError && (
          <p className="mt-1.5 max-w-[13rem] rounded-lg bg-black/60 px-2 py-1 text-[0.62rem] font-semibold leading-snug text-copper backdrop-blur-sm">
            Location blocked — enable in phone Settings
          </p>
        )}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(ellipse_at_center,transparent_58%,oklch(0.05_0.02_160/38%)_100%)]"
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

      <div className="flex items-center border-t border-white/10 bg-black/65 backdrop-blur-md">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          className="press flex min-h-11 flex-1 items-center justify-center text-white disabled:opacity-30"
          aria-label="Previous hole"
        >
          <ChevronLeft className="size-5" />
        </button>
        <p className="min-w-[4rem] text-center text-sm font-bold tabular-nums text-white/90">
          {index + 1}
          <span className="text-white/35">/{total}</span>
        </p>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="press flex min-h-11 flex-1 items-center justify-center text-white disabled:opacity-30"
          aria-label="Next hole"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </section>
  );
}
