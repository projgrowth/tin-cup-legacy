/**
 * Front · Center · Back to the green. GPS-only extra panel on theater.
 */
export function DistanceStack({
  front,
  center,
  back,
  gpsEnabled = false,
  gpsActive = false,
  gpsError = null,
}: {
  front: number;
  center: number;
  back: number;
  gpsEnabled?: boolean;
  gpsActive?: boolean;
  gpsError?: string | null;
}) {
  const live = gpsEnabled && gpsActive;
  const blocked = gpsEnabled && Boolean(gpsError);

  return (
    <div className="px-1">
      {blocked ? (
        <p className="text-sm font-semibold text-copper">GPS blocked</p>
      ) : (
        <div className="flex items-end gap-3">
          <YardCol label="F" value={front} tone="muted" live={live} />
          <YardCol label="C" value={center} tone={live ? "sky" : "gold"} live={live} hero />
          <YardCol label="B" value={back} tone="muted" live={live} />
        </div>
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
      ? "text-white"
      : tone === "sky"
        ? "text-sky-100"
        : "text-white";
  const size = hero ? "text-[1.85rem] sm:text-[2.05rem]" : "text-[1.35rem] sm:text-[1.5rem]";
  return (
    <div className="min-w-[2.75rem] text-center">
      <p
        className={`hud-label ${
          tone === "gold"
            ? "text-white/70"
            : tone === "sky"
              ? "text-sky-300/80"
              : "text-white/75"
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
