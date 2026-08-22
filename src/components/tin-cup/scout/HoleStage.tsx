import { useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { HoleMap } from "@/components/tin-cup/HoleMap";
import { SatelliteHoleMap } from "@/components/tin-cup/SatelliteHoleMap";
import { DistanceStack } from "@/components/tin-cup/scout/DistanceStack";
import type { CourseId, Hole } from "@/lib/courses";
import { getGeoHole, holeGreenTriple } from "@/lib/geo-courses";
import { bboxContains, haversineYards } from "@/lib/geo";
import { useGeolocation } from "@/hooks/useGeolocation";

export type MapMode = "sat" | "schematic";

/**
 * Hole theater. Default is the 2D aerial schematic. Satellite (and GPS) paints turf on Esri.
 */
export function HoleStage({
  courseId,
  hole,
  isSnake,
  onPrev,
  onNext,
  canPrev,
  canNext,
  gpsOn,
  mapMode,
  onMapMode,
  onSatFailed,
  holeCount = 18,
  courseLabel,
  note = null,
}: {
  courseId: CourseId;
  hole: Hole;
  isSnake?: boolean;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  gpsOn: boolean;
  mapMode: MapMode;
  onMapMode: (mode: MapMode) => void;
  onSatFailed?: () => void;
  holeCount?: number;
  courseLabel?: string;
  note?: string | null;
}) {
  const geo = useMemo(() => getGeoHole(courseId, hole.h), [courseId, hole.h]);
  const triple = useMemo(() => (geo ? holeGreenTriple(geo) : null), [geo]);
  const hasSat = Boolean(geo);
  const { fix, error: gpsError, active: gpsActive } = useGeolocation(gpsOn);
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    if (mapMode === "sat" && !hasSat) onMapMode("schematic");
  }, [mapMode, hasSat, onMapMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && canPrev) onPrev();
      if (e.key === "ArrowRight" && canNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canNext, canPrev, onNext, onPrev]);

  const liveYards =
    gpsOn && gpsActive && fix && triple
      ? Math.round(haversineYards(fix.point, triple.center))
      : hole.yards;
  const liveStack =
    gpsOn && gpsActive && fix && triple
      ? {
          front: Math.round(haversineYards(fix.point, triple.front)),
          center: Math.round(haversineYards(fix.point, triple.center)),
          back: Math.round(haversineYards(fix.point, triple.back)),
        }
      : triple
        ? {
            front: triple.yardsFromTee.front,
            center: triple.yardsFromTee.center,
            back: triple.yardsFromTee.back,
          }
        : null;
  const gpsNearHole =
    gpsOn && fix && geo ? bboxContains(geo.bounds, fix.point, 0.002) : null;

  const showSat = mapMode === "sat" && hasSat;

  return (
    <section className="absolute inset-0 overflow-hidden bg-black">
      <p className="sr-only" aria-live="polite">
        Hole {hole.h} of {holeCount}, par {hole.par}, {liveYards} yards
        {courseLabel ? ` · ${courseLabel}` : ""}
      </p>
      <div className="pointer-events-none absolute left-3 z-20 drop-shadow-[0_2px_14px_oklch(0_0_0/80%)] pt-[max(4.5rem,calc(env(safe-area-inset-top)+3.2rem))]">
        <p className="hud-num text-[1.85rem] leading-none text-white">
          {hole.h}
          <span className="ml-1 text-[0.85rem] font-semibold text-white/45">/{holeCount}</span>
        </p>
        <p className="mt-1 text-[0.72rem] font-semibold tracking-wide text-white/70">
          Par {hole.par}
          <span className="mx-1.5 text-white/30">·</span>
          {liveYards}
          {isSnake ? <span className="ml-1.5 text-copper">Pit</span> : null}
        </p>
        <p className="sr-only">Black {hole.yards}</p>
        {note ? (
          <p className="mt-2 max-w-[16rem] text-[0.78rem] font-semibold leading-snug text-white/85">
            {note}
          </p>
        ) : null}
      </div>

      {gpsOn && liveStack ? (
        <div
          className="pointer-events-none absolute left-3 z-20 w-[min(100%-1.5rem,16rem)]"
          style={{
            bottom: "max(8.25rem, calc(env(safe-area-inset-bottom) + 6.75rem))",
          }}
        >
          <DistanceStack
            front={liveStack.front}
            center={liveStack.center}
            back={liveStack.back}
            blackYards={hole.yards}
            gpsEnabled={gpsOn}
            gpsActive={gpsActive}
            gpsError={gpsError}
            gpsNearHole={gpsNearHole}
          />
        </div>
      ) : null}

      {showSat && geo ? (
        <div
          className="absolute inset-0"
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
            if (dt > 420 || Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
            if (dx < 0 && canNext) onNext();
            if (dx > 0 && canPrev) onPrev();
          }}
        >
          <SatelliteHoleMap
            geo={geo}
            className="size-full"
            gpsPoint={gpsOn ? (fix?.point ?? null) : null}
            gpsAccuracyM={gpsOn ? (fix?.accuracyM ?? null) : null}
            onError={() => {
              onSatFailed?.();
              onMapMode("schematic");
            }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-[var(--turf-rough)]">
          <HoleMap
            hole={hole}
            className="size-full"
            controls={false}
            onSwipeHole={(delta) => {
              if (delta < 0 && canPrev) onPrev();
              if (delta > 0 && canNext) onNext();
            }}
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-[42%] z-30 flex justify-between px-2">
        <Link
          to="/scout"
          search={{ course: courseId, hole: Math.max(1, hole.h - 1), map: true }}
          replace
          aria-label="Previous hole"
          aria-disabled={!canPrev}
          tabIndex={canPrev ? undefined : -1}
          className={`press pointer-events-auto flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md ${
            canPrev ? "" : "pointer-events-none opacity-30"
          }`}
        >
          <ChevronLeft className="size-5" />
        </Link>
        <Link
          to="/scout"
          search={{ course: courseId, hole: Math.min(holeCount, hole.h + 1), map: true }}
          replace
          aria-label="Next hole"
          aria-disabled={!canNext}
          tabIndex={canNext ? undefined : -1}
          className={`press pointer-events-auto flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md ${
            canNext ? "" : "pointer-events-none opacity-30"
          }`}
        >
          <ChevronRight className="size-5" />
        </Link>
      </div>
    </section>
  );
}
