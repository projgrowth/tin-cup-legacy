import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { HoleMap } from "@/components/tin-cup/HoleMap";
import { DistanceStack } from "@/components/tin-cup/scout/DistanceStack";
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
  holeMeta,
  mapTools,
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
  /** Overlay: hole # / name / par — Grint-style HUD on the canvas */
  holeMeta?: ReactNode;
  /** Floating tool strip (club / shape) above the prev/next bar */
  mapTools?: ReactNode;
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
    "h-[min(62vh,480px)] w-full sm:h-[400px] lg:h-[480px]";

  return (
    <section
      className={`relative overflow-hidden rounded-[1.25rem] ring-1 ${accentClass} ${
        isSnake ? "ring-copper/50" : ""
      } bg-[var(--turf-rough)] shadow-[0_24px_60px_-28px_oklch(0_0_0/85%)]`}
    >
      {/* Top-left: mode */}
      <div className="absolute left-3 top-3 z-20 flex flex-col gap-2">
        <div
          className="hud-pod inline-flex p-0.5"
          role="group"
          aria-label="Map mode"
        >
          <button
            type="button"
            onClick={() => selectMode("2d")}
            className={`press min-h-9 rounded-full px-3.5 text-xs font-bold ${
              mode === "2d" ? "bg-white/15 text-white" : "text-white/60"
            }`}
          >
            2D
          </button>
          <button
            type="button"
            onClick={() => selectMode("3d")}
            disabled={reducedMotion}
            className={`press min-h-9 rounded-full px-3.5 text-xs font-bold disabled:opacity-40 ${
              mode === "3d" ? "bg-white/15 text-white" : "text-white/60"
            }`}
          >
            3D
          </button>
        </div>
        {topLeftBadge}
      </div>

      {/* Top-right: hole meta + distance instrument */}
      <div className="absolute right-3 top-3 z-20 flex max-w-[min(52%,14rem)] flex-col items-end gap-2">
        {holeMeta}
        <DistanceStack hole={hole} />
      </div>

      {/* Edge vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(ellipse_at_center,transparent_45%,oklch(0.08_0.02_160/55%)_100%)]"
      />

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

      {mapTools}

      {/* Instrument footer */}
      <div className="border-t border-white/10 bg-black/50 px-2 py-1.5 backdrop-blur-md">
        <p className="hud-label mb-1.5 text-center tracking-[0.14em] text-white/50">
          {mode === "3d"
            ? "Schematic 3D · Black line ticks · not rangefinder"
            : "Schematic map · Black scorecard · OSM outline"}
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
      </div>
    </section>
  );
}
