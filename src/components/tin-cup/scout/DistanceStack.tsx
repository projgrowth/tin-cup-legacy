/**
 * Grint-style Front · Center · Back distance widget.
 * Scorecard mode uses Black-proportional green depth.
 * GPS mode uses live haversine to F/C/B points.
 */
export function DistanceStack({
  front,
  center,
  back,
  blackYards,
  gpsEnabled = false,
  gpsActive = false,
  gpsError = null,
  gpsNearHole = null,
}: {
  front: number;
  center: number;
  back: number;
  blackYards: number;
  gpsEnabled?: boolean;
  gpsActive?: boolean;
  gpsError?: string | null;
  gpsNearHole?: boolean | null;
}) {
  const live = gpsEnabled && gpsActive;
  const locating = gpsEnabled && !gpsActive && !gpsError;
  const blocked = gpsEnabled && Boolean(gpsError);

  return (
    <div
      className={`glass-panel px-2.5 py-2 backdrop-blur-xl ${
        live ? "ring-1 ring-sky-400/30" : ""
      }`}
    >
      {blocked ? (
        <div className="min-w-[6.5rem] px-1 text-right">
          <p className="hud-label text-copper/90">GPS</p>
          <p className="mt-1 text-sm font-bold text-white/85">Blocked</p>
          <p className="mt-1 text-[0.58rem] font-semibold text-gold-light/75">
            Black {blackYards}
          </p>
        </div>
      ) : locating ? (
        <div className="min-w-[6.5rem] px-1 text-right">
          <p className="hud-label text-sky-300/80">GPS</p>
          <p className="mt-1 text-sm font-bold text-white/85">Locating…</p>
          <p className="mt-1 text-[0.58rem] font-semibold text-gold-light/75">
            Black {blackYards}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-2.5 sm:gap-3">
            <YardCol label="F" value={front} tone="muted" live={live} />
            <YardCol label="C" value={center} tone={live ? "sky" : "gold"} live={live} hero />
            <YardCol label="B" value={back} tone="muted" live={live} />
          </div>
          <p className="mt-1.5 text-center text-[0.58rem] font-semibold tracking-wide text-white/40">
            {live
              ? gpsNearHole === false
                ? "approx · not on hole"
                : "approx · GPS · not laser"
              : `scorecard · Black ${blackYards}`}
          </p>
        </>
      )}
    </div>
  );
}

function YardCol({
  label,
  value,
  tone,
  hero,
  live,
}: {
  label: string;
  value: number;
  tone: "gold" | "sky" | "muted";
  hero?: boolean;
  live?: boolean;
}) {
  const color =
    tone === "gold"
      ? "text-gold-light"
      : tone === "sky"
        ? "text-sky-100"
        : "text-white/80";
  const size = hero ? "text-[1.65rem] sm:text-[1.85rem]" : "text-[1.15rem] sm:text-[1.35rem]";
  return (
    <div className="min-w-[2.75rem] text-center">
      <p
        className={`hud-label ${
          tone === "gold"
            ? "text-gold-light/75"
            : tone === "sky"
              ? "text-sky-300/80"
              : "text-white/45"
        }`}
      >
        {label}
      </p>
      <p className={`hud-num mt-0.5 ${size} ${color}`}>
        {live ? `~${value}` : value}
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
