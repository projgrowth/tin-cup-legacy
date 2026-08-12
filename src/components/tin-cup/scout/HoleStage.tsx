import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  Map as MapIcon,
  Crosshair,
} from "lucide-react";

import { HoleMap } from "@/components/tin-cup/HoleMap";
import {
  SatelliteHoleMap,
  type SatelliteHoleMapHandle,
} from "@/components/tin-cup/SatelliteHoleMap";
import { DistanceStack } from "@/components/tin-cup/scout/DistanceStack";
import type { CourseId, Hole } from "@/lib/courses";
import { getGeoHole } from "@/lib/geo-courses";
import { bboxContains, haversineYards } from "@/lib/geo";
import { useGeolocation } from "@/hooks/useGeolocation";

const HoleMap3D = lazy(() => import("@/components/tin-cup/HoleMap3D"));

export type MapMode = "sat" | "2d" | "3d";

const MODE_KEY = "tc-hole-map-mode-v2";

/**
 * Hero map stage — satellite-first, mobile glass HUD, smooth hole transitions.
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
  topLeftBadge,
  holeMeta,
  mapTools,
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
  topLeftBadge?: ReactNode;
  holeMeta?: ReactNode;
  mapTools?: ReactNode;
}) {
  const geo = useMemo(
    () => getGeoHole(courseId, hole.h),
    [courseId, hole.h],
  );
  const hasSat = Boolean(geo);
  const satRef = useRef<SatelliteHoleMapHandle>(null);

  const [mode, setMode] = useState<MapMode>(hasSat ? "sat" : "2d");
  const [fullscreen, setFullscreen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [gpsOn, setGpsOn] = useState(false);
  const [satFailed, setSatFailed] = useState(false);

  const { fix, error: gpsError, active: gpsActive } = useGeolocation(gpsOn);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    try {
      const saved = window.localStorage.getItem(MODE_KEY);
      if (saved === "sat" || saved === "2d" || saved === "3d") {
        if (saved === "sat" && !hasSat) setMode("2d");
        else setMode(saved);
      }
    } catch {
      /* ignore */
    }
    return () => mq.removeEventListener("change", onChange);
  }, [hasSat]);

  useEffect(() => {
    if (reducedMotion && mode === "3d") setMode("2d");
  }, [reducedMotion, mode]);

  useEffect(() => {
    if (mode === "sat" && (!hasSat || satFailed)) setMode("2d");
  }, [mode, hasSat, satFailed]);

  useEffect(() => {
    setSatFailed(false);
  }, [courseId, hole.h]);

  function selectMode(next: MapMode) {
    if (next === "3d" && reducedMotion) return;
    if (next === "sat" && (!hasSat || satFailed)) return;
    setMode(next);
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  const gpsYardsToGreen =
    fix && geo ? Math.round(haversineYards(fix.point, geo.green)) : null;
  const nearHole =
    fix && geo ? bboxContains(geo.bounds, fix.point, 0.003) : null;

  const mapHeight =
    "h-[min(78svh,620px)] w-full sm:h-[min(70vh,560px)] lg:h-[560px]";

  const modeBtn = (id: MapMode, label: string, disabled?: boolean) => (
    <button
      type="button"
      onClick={() => selectMode(id)}
      disabled={disabled}
      className={`press min-h-10 rounded-full px-3.5 text-xs font-bold tracking-wide disabled:opacity-35 ${
        mode === id
          ? "bg-white/18 text-white shadow-sm"
          : "text-white/55 hover:text-white/80"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section
      className={`relative overflow-hidden rounded-[1.35rem] ring-1 ${accentClass} ${
        isSnake ? "ring-copper/50" : ""
      } bg-[var(--turf-rough)] shadow-[0_28px_70px_-30px_oklch(0_0_0/88%)]`}
    >
      {/* Top-left: mode + tools */}
      <div className="absolute left-2.5 top-2.5 z-20 flex flex-col gap-1.5 sm:left-3 sm:top-3">
        <div
          className="hud-pod inline-flex p-0.5 backdrop-blur-xl"
          role="group"
          aria-label="Map mode"
        >
          {modeBtn("sat", "Sat", !hasSat || satFailed)}
          {modeBtn("2d", "Plan")}
          {modeBtn("3d", "3D", reducedMotion)}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setGpsOn((v) => !v)}
            className={`press hud-pod inline-flex min-h-10 items-center gap-1.5 px-3 text-xs font-bold backdrop-blur-xl ${
              gpsOn && gpsActive
                ? "border-sky-400/45 text-sky-100"
                : "text-white/65"
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
              className="press hud-pod inline-flex min-h-10 items-center gap-1.5 px-3 text-xs font-bold text-white/65 backdrop-blur-xl"
              aria-label="Recenter hole"
            >
              <Crosshair className="size-3.5 opacity-85" />
              Fit
            </button>
          )}
        </div>
        {topLeftBadge}
      </div>

      {/* Top-right: hole meta + distance */}
      <div className="absolute right-2.5 top-2.5 z-20 flex max-w-[min(56%,15.5rem)] flex-col items-end gap-1.5 sm:right-3 sm:top-3">
        {holeMeta}
        <DistanceStack
          hole={hole}
          gpsYardsToGreen={gpsYardsToGreen}
          gpsNearHole={nearHole}
          compact
        />
      </div>

      {/* Soft edge vignette — doesn’t block map tiles under chrome */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(ellipse_at_center,transparent_50%,oklch(0.06_0.02_160/50%)_100%)]"
      />

      {mode === "sat" && geo ? (
        <div className={mapHeight}>
          <SatelliteHoleMap
            ref={satRef}
            geo={geo}
            className="size-full"
            gpsPoint={gpsOn ? fix?.point ?? null : null}
            gpsAccuracyM={gpsOn ? fix?.accuracyM ?? null : null}
            onError={() => setSatFailed(true)}
          />
        </div>
      ) : mode === "2d" || (mode === "sat" && !geo) ? (
        <HoleMap
          hole={hole}
          className={`block ${mapHeight} bg-transparent`}
          fullscreen={fullscreen}
          onToggleFullscreen={() => setFullscreen((v) => !v)}
          onSwipeHole={(delta) => {
            if (delta < 0 && canPrev) onPrev();
            if (delta > 0 && canNext) onNext();
          }}
        />
      ) : (
        <Suspense
          fallback={
            <div
              className={`${mapHeight} flex items-center justify-center bg-[var(--turf-rough)] text-sm text-white/70`}
            >
              Loading 3D…
            </div>
          }
        >
          <HoleMap3D hole={hole} className={mapHeight} />
        </Suspense>
      )}

      {mapTools}

      {/* Instrument footer */}
      <div className="border-t border-white/10 bg-black/60 px-2 py-1.5 backdrop-blur-md">
        <p className="mb-1 text-center text-[0.62rem] font-semibold tracking-[0.1em] text-white/45">
          {mode === "sat"
            ? "Aerial · hole plays up · Black yards official"
            : mode === "3d"
              ? "3D schematic · not a rangefinder"
              : "Diagram plan · Black tee yards"}
          {gpsError ? (
            <span className="text-copper/90"> · Location blocked</span>
          ) : null}
          {gpsOn && nearHole === false ? (
            <span className="text-white/50"> · Walk to this hole for GPS</span>
          ) : null}
        </p>
        <div className="flex items-stretch">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            className="press flex min-h-12 flex-1 items-center justify-center gap-1 text-sm font-bold text-white disabled:opacity-30"
            aria-label="Previous hole"
          >
            <ChevronLeft className="size-5" />
            <span className="hidden text-xs font-semibold text-white/50 sm:inline">
              Prev
            </span>
          </button>
          <div className="flex min-h-12 min-w-[5rem] flex-col items-center justify-center border-x border-white/10">
            <span className="font-bold tabular-nums text-white">
              {index + 1}
              <span className="text-white/35">/{total}</span>
            </span>
            <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-white/40">
              Hole
            </span>
          </div>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className="press flex min-h-12 flex-1 items-center justify-center gap-1 text-sm font-bold text-white disabled:opacity-30"
            aria-label="Next hole"
          >
            <span className="hidden text-xs font-semibold text-white/50 sm:inline">
              Next
            </span>
            <ChevronRight className="size-5" />
          </button>
        </div>
        {mode !== "sat" && hasSat && !satFailed && (
          <button
            type="button"
            onClick={() => selectMode("sat")}
            className="press mt-1 flex w-full items-center justify-center gap-1.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-gold-light/80"
          >
            <MapIcon className="size-3 opacity-80" />
            Back to aerial
          </button>
        )}
      </div>
    </section>
  );
}
