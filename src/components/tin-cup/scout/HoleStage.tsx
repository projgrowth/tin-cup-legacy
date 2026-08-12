import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { HoleMap } from "@/components/tin-cup/HoleMap";
import type { Hole } from "@/lib/courses";

const HoleMap3D = lazy(() => import("@/components/tin-cup/HoleMap3D"));

export type MapMode = "2d" | "3d";

const MODE_KEY = "tc-hole-map-mode-v1";

/**
 * Hero map stage: official Black yards stay outside this component.
 * 3D is schematic extrusion of the same OSM outlines as 2D — not survey topo.
 */
export function HoleStage({
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
}: {
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
}) {
  const [mode, setMode] = useState<MapMode>("2d");
  const [fullscreen, setFullscreen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    try {
      const saved = window.localStorage.getItem(MODE_KEY);
      if (saved === "3d" || saved === "2d") setMode(saved);
    } catch {
      /* ignore */
    }
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion && mode === "3d") setMode("2d");
  }, [reducedMotion, mode]);

  function selectMode(next: MapMode) {
    if (next === "3d" && reducedMotion) return;
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

  const mapHeight =
    "h-[min(58vh,440px)] w-full sm:h-[380px] lg:h-[460px]";

  return (
    <section
      className={`relative overflow-hidden rounded-2xl ring-1 ${accentClass} ${
        isSnake ? "ring-copper/50" : ""
      } bg-[var(--turf-rough)] shadow-[0_20px_50px_-28px_oklch(0_0_0/80%)]`}
    >
      {/* Mode toggle + accuracy */}
      <div className="absolute left-3 top-3 z-20 flex max-w-[min(100%-6rem,18rem)] flex-col gap-1.5">
        <div
          className="inline-flex rounded-full border border-white/15 bg-black/55 p-0.5 backdrop-blur-md"
          role="group"
          aria-label="Map mode"
        >
          <button
            type="button"
            onClick={() => selectMode("2d")}
            className={`press min-h-9 rounded-full px-3 text-xs font-bold ${
              mode === "2d" ? "bg-white/15 text-white" : "text-white/65"
            }`}
          >
            2D
          </button>
          <button
            type="button"
            onClick={() => selectMode("3d")}
            disabled={reducedMotion}
            className={`press min-h-9 rounded-full px-3 text-xs font-bold disabled:opacity-40 ${
              mode === "3d" ? "bg-white/15 text-white" : "text-white/65"
            }`}
          >
            3D
          </button>
        </div>
        {topLeftBadge}
      </div>

      {mode === "2d" ? (
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

      {/* Footer controls */}
      <div className="border-t border-white/10 bg-black/40 px-3 py-2">
        <p className="mb-2 text-center text-[0.7rem] leading-snug text-white/65">
          {mode === "3d" ? (
            <>
              Schematic 3D from course outline · Black yard ticks along target line (proportional) ·
              not a rangefinder · drag to orbit · pinch zoom
            </>
          ) : (
            <>Orientation map · Black yards on scorecard · OSM outline only</>
          )}
        </p>
        <div className="flex items-stretch">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            className="press flex min-h-12 flex-1 items-center justify-center gap-1 text-sm font-semibold text-white/90 disabled:opacity-30"
          >
            <ChevronLeft className="size-5" /> Prev
          </button>
          <div className="flex min-h-12 items-center border-x border-white/10 px-4 text-sm tabular-nums text-white/70">
            {index + 1}/{total}
          </div>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className="press flex min-h-12 flex-1 items-center justify-center gap-1 text-sm font-semibold text-white/90 disabled:opacity-30"
          >
            Next <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
