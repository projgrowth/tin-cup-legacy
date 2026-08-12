/**
 * Yardage instrument — Black total is official scorecard.
 * GPS yards-to-green are approximate from the device when enabled.
 */
export function DistanceStack({
  hole,
  compact = false,
  gpsYardsToGreen = null,
  gpsNearHole = null,
}: {
  hole: { yards: number };
  compact?: boolean;
  gpsYardsToGreen?: number | null;
  gpsNearHole?: boolean | null;
}) {
  const showGps =
    gpsYardsToGreen != null && gpsYardsToGreen >= 0 && gpsYardsToGreen < 900;

  return (
    <div
      className={`hud-pod backdrop-blur-xl ${compact ? "px-3 py-2" : "px-3 py-2.5"}`}
    >
      <div className="flex items-end gap-3">
        <div className="text-right">
          <p className="hud-label text-gold-light/70">Black</p>
          <p className="hud-num mt-0.5 text-3xl text-gold-light">{hole.yards}</p>
        </div>
        {showGps && (
          <div className="border-l border-white/10 pl-3 text-right">
            <p className="hud-label text-sky-300/75">To pin</p>
            <p className="hud-num mt-0.5 text-2xl text-sky-100">
              ~{gpsYardsToGreen}
            </p>
          </div>
        )}
      </div>
      <p className="mt-1 text-right text-[0.58rem] font-semibold tracking-wide text-white/40">
        {showGps
          ? gpsNearHole === false
            ? "GPS · leave map open on hole"
            : "yd · GPS approx"
          : "yd · scorecard"}
      </p>
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
