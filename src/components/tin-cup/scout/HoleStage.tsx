import { useEffect, useMemo, useRef } from "react";

import { HoleMap } from "@/components/tin-cup/HoleMap";
import { SatelliteHoleMap } from "@/components/tin-cup/SatelliteHoleMap";
import type { CourseId, Hole } from "@/lib/courses";
import { getGeoHole, holeGreenTriple } from "@/lib/geo-courses";
import { haversineYards } from "@/lib/geo";
import { useGeolocation } from "@/hooks/useGeolocation";

export type MapMode = "sat" | "diagram";

/**
 * Aerial is the screen. HUD is PAR / YARDS only.
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
}) {
  const geo = useMemo(() => getGeoHole(courseId, hole.h), [courseId, hole.h]);
  const triple = useMemo(() => (geo ? holeGreenTriple(geo) : null), [geo]);
  const hasSat = Boolean(geo);
  const { fix, active: gpsActive } = useGeolocation(gpsOn);
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    if (mapMode === "sat" && !hasSat) onMapMode("diagram");
  }, [mapMode, hasSat, onMapMode]);

  const liveYards =
    gpsOn && gpsActive && fix && triple
      ? Math.round(haversineYards(fix.point, triple.center))
      : hole.yards;

  const showSat = mapMode === "sat" && hasSat;

  return (
    <section className="absolute inset-0 overflow-hidden bg-black">
      <div className="pointer-events-none absolute left-4 z-20 drop-shadow-[0_2px_14px_oklch(0_0_0/80%)] pt-[max(4.75rem,calc(env(safe-area-inset-top)+3.35rem))]">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/55">Par</p>
        <p className="hud-num mt-0.5 text-[2.45rem] leading-none text-white">{hole.par}</p>
        {isSnake ? (
          <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-copper">
            Pit
          </p>
        ) : null}
        <p className="mt-4 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/55">
          Yards
        </p>
        <p className="hud-num mt-0.5 text-[2.45rem] leading-none text-white">{liveYards}</p>
        <p className="sr-only">Black {hole.yards}</p>
      </div>

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
              onMapMode("diagram");
            }}
          />
        </div>
      ) : (
        <HoleMap
          hole={hole}
          className="absolute inset-0 block size-full bg-transparent"
          onSwipeHole={(delta) => {
            if (delta < 0 && canPrev) onPrev();
            if (delta > 0 && canNext) onNext();
          }}
        />
      )}
    </section>
  );
}
