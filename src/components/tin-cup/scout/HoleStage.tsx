import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, LocateFixed, Map as MapIcon } from "lucide-react";

import { HoleMap } from "@/components/tin-cup/HoleMap";
import { DistanceStack } from "@/components/tin-cup/scout/DistanceStack";
import type { CourseId, Hole } from "@/lib/courses";
import { getGeoHole } from "@/lib/geo-courses";
import { bboxContains, haversineYards } from "@/lib/geo";
import { useGeolocation } from "@/hooks/useGeolocation";

const HoleMap3D = lazy(() => import("@/components/tin-cup/HoleMap3D"));
const SatelliteHoleMap = lazy(() => import("@/components/tin-cup/SatelliteHoleMap"));

export type MapMode = "sat" | "2d" | "3d";

const MODE_KEY = "tc-hole-map-mode-v2";

/**
 * Hero map stage — satellite-first (Grint-class), schematic/3D fallback.
 * Mobile-first: full-bleed aerial + glass HUD; GPS opt-in.
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

  // Reset sat failure when hole/course changes
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
    fix && geo
      ? Math.round(haversineYards(fix.point, geo.green))
      : null;
  const nearHole =
    fix && geo ? bboxContains(geo.bounds, fix.point, 0.003) : null;

  const mapHeight =
    "h-[min(78svh,620px)] w-full sm:h-[min(70vh,560px)] lg:h-[560px]";

  return (
    <section
      className={`relative overflow-hidden rounded-[1.25rem] ring-1 ${accentClass} ${
        isSnake ? "ring-copper/50" : ""
      } bg-[var(--turf-rough)] shadow-[0_28px_70px_-30px_oklch(0_0_0/88%)]`}
    >
      {/* Top-left: mode + GPS */}
      <div className="absolute left-3 top-3 z-20 flex flex-col gap-2">
        <div
          className="hud-pod inline-flex p-0.5"
          role="group"
          aria-label="Map mode"
        >
          <button
            type="button"
            onClick={() => selectMode("sat")}
            disabled={!hasSat || satFailed}
            className={`press min-h-10 rounded-full px-3 text-xs font-bold disabled:opacity-35 ${
              mode === "sat" ? "bg-white/15 text-white" : "text-white/60"
            }`}
          >
            Sat
          </button>
          <button
            type="button"
            onClick={() => selectMode("2d")}
            className={`press min-h-10 rounded-full px-3 text-xs font-bold ${
              mode === "2d" ? "bg-white/15 text-white" : "text-white/60"
            }`}
          >
            2D
          </button>
          <button
            type="button"
            onClick={() => selectMode("3d")}
            disabled={reducedMotion}
            className={`press min-h-10 rounded-full px-3 text-xs font-bold disabled:opacity-40 ${
              mode === "3d" ? "bg-white/15 text-white" : "text-white/60"
            }`}
          >
            3D
          </button>
        </div>
        <button
          type="button"
          onClick={() => setGpsOn((v) => !v)}
          className={`press hud-pod inline-flex min-h-10 items-center gap-1.5 px-3 text-xs font-bold ${
            gpsOn && gpsActive
              ? "border-sky-400/40 text-sky-200"
              : "text-white/70"
          }`}
          aria-pressed={gpsOn}
        >
          <LocateFixed className="size-3.5 opacity-80" />
          {gpsOn ? (gpsActive ? "GPS on" : "GPS…") : "GPS"}
        </button>
        {topLeftBadge}
      </div>

      {/* Top-right: hole meta + distance */}
      <div className="absolute right-3 top-3 z-20 flex max-w-[min(54%,15rem)] flex-col items-end gap-2">
        {holeMeta}
        <DistanceStack
          hole={hole}
          gpsYardsToGreen={gpsYardsToGreen}
          gpsNearHole={nearHole}
          compact={mode === "sat"}
        />
      </div>

      {/* Edge vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(ellipse_at_center,transparent_48%,var(--map-vignette)_100%)]"
      />

      {mode === "sat" && geo ? (
        <Suspense
          fallback={
            <div
              className={`${mapHeight} flex items-center justify-center bg-[var(--turf-rough)] text-sm text-white/70`}
            >
              Loading satellite…
            </div>
          }
        >
          <div className={mapHeight}>
            <SatelliteHoleMap
              geo={geo}
              className="size-full"
              gpsPoint={gpsOn ? fix?.point ?? null : null}
              gpsAccuracyM={gpsOn ? fix?.accuracyM ?? null : null}
              onError={() => setSatFailed(true)}
            />
          </div>
        </Suspense>
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
      <div className="border-t border-white/10 bg-black/55 px-2 py-1.5 backdrop-blur-md">
        <p className="hud-label mb-1 text-center tracking-[0.12em] text-white/50">
          {mode === "sat"
            ? "Satellite · OSM overlays · Black scorecard yards"
            : mode === "3d"
              ? "Schematic 3D · not rangefinder"
              : "Schematic layout · Black tee yards"}
          {gpsError ? ` · ${gpsError}` : ""}
          {gpsOn && nearHole === false ? " · Not near this hole" : ""}
        </p>
        <div className="flex items-stretch">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            className="press flex min-h-12 flex-1 items-center justify-center gap-1 text-sm font-bold text-white disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex min-h-12 min-w-[4.5rem] items-center justify-center border-x border-white/10 font-bold tabular-nums text-white/80">
            {index + 1}
            <span className="text-white/35">/{total}</span>
          </div>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className="press flex min-h-12 flex-1 items-center justify-center gap-1 text-sm font-bold text-white disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        {mode !== "sat" && hasSat && !satFailed && (
          <button
            type="button"
            onClick={() => selectMode("sat")}
            className="press mt-1 flex w-full items-center justify-center gap-1.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white/55"
          >
            <MapIcon className="size-3 opacity-70" />
            Switch to satellite
          </button>
        )}
      </div>
    </section>
  );
}
