import { useMemo } from "react";

import type { Hole } from "@/lib/courses";
import { lineStations } from "@/lib/hole-geometry";

/**
 * Yardage instrument — Black total is official; mid ticks are proportional
 * along the schematic target line (not GPS / laser).
 */
export function DistanceStack({
  hole,
  compact = false,
}: {
  hole: Hole;
  compact?: boolean;
}) {
  const stations = useMemo(() => lineStations(hole, 50), [hole]);
  const mid = stations.filter(
    (s) => s.yardsFromTee > 0 && s.yardsToGreen > 0 && s.yardsFromTee % 50 === 0,
  );
  // Show up to two intermediate + green
  const ticks = mid.slice(0, 2);

  if (compact) {
    return (
      <div className="hud-pod flex items-end gap-3 px-3 py-2">
        <div>
          <p className="hud-label">Black</p>
          <p className="hud-num mt-0.5 text-3xl text-gold-light">{hole.yards}</p>
        </div>
        <p className="pb-1 text-xs font-medium text-white/50">along line</p>
      </div>
    );
  }

  return (
    <div className="hud-pod px-3 py-2.5">
      <p className="hud-label mb-2">Along target line · Black</p>
      <div className="flex items-end gap-2">
        {ticks.map((s) => (
          <div key={s.yardsFromTee} className="min-w-[2.75rem] text-center">
            <p className="hud-num text-xl text-white/90">{s.yardsFromTee}</p>
            <p className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-white/40">
              yd
            </p>
          </div>
        ))}
        <div className="min-w-[3.25rem] text-center">
          <p className="hud-num text-3xl text-gold-light">{hole.yards}</p>
          <p className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-gold-light/70">
            Green
          </p>
        </div>
      </div>
    </div>
  );
}

export function StatusLED({
  state,
}: {
  state: "idle" | "saving" | "saved" | "error" | "guest";
}) {
  const map = {
    idle: { label: "READY", color: "bg-white/35" },
    saving: { label: "SAVING", color: "bg-[var(--hud-led-busy)] animate-pulse" },
    saved: { label: "SAVED", color: "bg-[var(--hud-led-ok)]" },
    error: { label: "ERROR", color: "bg-[var(--hud-led-err)]" },
    guest: { label: "DEVICE", color: "bg-white/40" },
  } as const;
  const m = map[state];
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white/75">
      <span className={`size-1.5 rounded-full ${m.color}`} aria-hidden />
      {m.label}
    </span>
  );
}
