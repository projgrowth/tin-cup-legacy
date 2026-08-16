import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Flag, Layers, LocateFixed, Map as MapIcon } from "lucide-react";

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
 * Full-bleed hole theater: aerial is the screen, PAR / YARDS HUD, Play GPS.
 */
export function HoleStage({
  courseId,
  hole,
  isSnake,
  onPrev,
  onNext,
  canPrev,
  canNext,
  onPlayModeChange,
  contests = [],
}: {
  courseId: CourseId;
  hole: Hole;
  isSnake?: boolean;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  onPlayModeChange?: (on: boolean) => void;
  contests?: Array<"ctp" | "ld">;
}) {
  const geo = useMemo(() => getGeoHole(courseId, hole.h), [courseId, hole.h]);
  const triple = useMemo(() => (geo ? holeGreenTriple(geo) : null), [geo]);
  const hasSat = Boolean(geo);
  const satRef = useRef<SatelliteHoleMapHandle>(null);

  const [mode, setMode] = useState<MapMode>(hasSat ? "sat" : "diagram");
  const [gpsOn, setGpsOn] = useState(false);
  const [satFailed, setSatFailed] = useState(false);
  const [yardsOpen, setYardsOpen] = useState(false);

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
    setYardsOpen(false);
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

  const nearHole = fix && geo ? bboxContains(geo.bounds, fix.point, 0.003) : null;

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

  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const showDetail = gpsOn || yardsOpen;

  const toolBtn = (on: boolean, extra = "") =>
    `press flex size-10 items-center justify-center rounded-full text-xs font-bold ${
      on ? "bg-white/20 text-white" : "text-white/60"
    } ${extra}`;

  return (
    <section className="absolute inset-0 overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-3 pt-[max(4.75rem,calc(env(safe-area-inset-top)+3.4rem))]">
        <div className="pointer-events-auto max-w-[9.5rem] drop-shadow-[0_2px_12px_oklch(0_0_0/70%)]">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white/55">Par</p>
          <p className="hud-num mt-0.5 text-[2.35rem] leading-none text-white">{hole.par}</p>
          {isSnake ? (
            <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-copper">
              Pit
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setYardsOpen((v) => !v)}
            className="press mt-4 block text-left"
            aria-expanded={showDetail}
          >
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white/55">
              Yards
            </p>
            <p className="hud-num mt-0.5 text-[2.35rem] leading-none text-white">{hole.yards}</p>
            <p className="sr-only">Black {hole.yards}</p>
          </button>
          {contests.length > 0 && (
            <p className="mt-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-gold-light/85">
              {contests.map((c) => (c === "ld" ? "LD" : "CTP")).join(" · ")}
            </p>
          )}
        </div>
        {showDetail ? (
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
        ) : null}
      </div>

      <div className="absolute bottom-[7.75rem] left-3 z-20 sm:bottom-[8.25rem]">
        <div className="flex items-center gap-0.5 rounded-full border border-white/12 bg-black/40 p-1 backdrop-blur-md">
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
              <span className="mx-0.5 h-4 w-px bg-white/15" aria-hidden />
            </>
          )}
          <button
            type="button"
            onClick={() => setGpsOn((v) => !v)}
            className={toolBtn(gpsOn && gpsActive, gpsOn ? "text-sky-100" : "")}
            aria-pressed={gpsOn}
            aria-label={gpsOn ? "Exit play GPS" : "Play GPS mode"}
          >
            <LocateFixed className="size-3.5" />
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

      {mode === "sat" && geo ? (
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
            ref={satRef}
            geo={geo}
            className="size-full"
            gpsPoint={gpsOn ? (fix?.point ?? null) : null}
            gpsAccuracyM={gpsOn ? (fix?.accuracyM ?? null) : null}
            onError={() => setSatFailed(true)}
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
