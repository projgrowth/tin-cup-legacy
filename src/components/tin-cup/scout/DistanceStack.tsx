/**
 * Yardage instrument.
 * - Default: Black scorecard yards (official)
 * - GPS mode: hero ~yd to pin, Black demoted to micro
 */
export function DistanceStack({
  hole,
  gpsYardsToGreen = null,
  gpsNearHole = null,
  gpsActive = false,
  gpsError = null,
  gpsEnabled = false,
}: {
  hole: { yards: number };
  gpsYardsToGreen?: number | null;
  gpsNearHole?: boolean | null;
  gpsActive?: boolean;
  gpsError?: string | null;
  gpsEnabled?: boolean;
}) {
  const showGpsNum =
    gpsEnabled &&
    gpsActive &&
    gpsYardsToGreen != null &&
    gpsYardsToGreen >= 0 &&
    gpsYardsToGreen < 900;

  if (gpsEnabled && showGpsNum) {
    return (
      <div className="glass-panel min-w-[5.5rem] px-3 py-2 text-right backdrop-blur-xl">
        <p className="hud-label text-sky-300/80">To pin</p>
        <p className="hud-num mt-0.5 text-4xl text-sky-100">~{gpsYardsToGreen}</p>
        <p className="mt-1 text-[0.58rem] font-semibold tracking-wide text-white/45">
          {gpsNearHole === false ? "not on this hole" : "approx · GPS"}
          <span className="text-white/30"> · </span>
          <span className="text-gold-light/70">B{hole.yards}</span>
        </p>
      </div>
    );
  }

  if (gpsEnabled && !gpsActive) {
    return (
      <div className="glass-panel min-w-[5.5rem] px-3 py-2 text-right backdrop-blur-xl">
        <p className="hud-label text-sky-300/70">GPS</p>
        <p className="mt-1 text-sm font-bold text-white/80">
          {gpsError ? "Blocked" : "Locating…"}
        </p>
        <p className="mt-1 text-[0.58rem] font-semibold tracking-wide text-gold-light/70">
          Black {hole.yards}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel min-w-[4.75rem] px-3 py-2 text-right backdrop-blur-xl">
      <p className="hud-label text-gold-light/70">Black</p>
      <p className="hud-num mt-0.5 text-3xl text-gold-light">{hole.yards}</p>
      <p className="mt-1 text-[0.58rem] font-semibold tracking-wide text-white/40">
        yd · scorecard
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
