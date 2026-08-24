/**
 * Front · pin · back of the GREEN (not tee colors).
 * Center/pin yards match the Black scorecard. GPS-only extra panel on theater.
 */
export function DistanceStack({
  front,
  center,
  back,
  gpsEnabled = false,
  gpsActive = false,
  gpsError = null,
  origin,
}: {
  front: number;
  center: number;
  back: number;
  gpsEnabled?: boolean;
  gpsActive?: boolean;
  gpsError?: string | null;
  origin?: "tee" | "green";
}) {
  const live = gpsEnabled && gpsActive;
  const blocked = gpsEnabled && Boolean(gpsError);
  const caption = origin === "tee" ? "from tee" : origin === "green" ? "to green" : null;

  return (
    <div className="px-1" role="group" aria-label="Yards to front, pin, and back of green">
      {blocked ? (
        <p className="text-sm font-semibold text-copper">GPS blocked</p>
      ) : (
        <div className="flex items-end gap-3">
          <YardCol label="F grn" value={front} tone="muted" live={live} title="Front of green" />
          <YardCol
            label="Pin"
            value={center}
            tone={live ? "sky" : "muted"}
            live={live}
            hero
            caption={caption}
            title="Pin / center of green · Black scorecard"
          />
          <YardCol label="B grn" value={back} tone="muted" live={live} title="Back of green" />
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
  caption,
  title,
}: {
  label: string;
  value: number;
  tone: "gold" | "sky" | "muted";
  hero?: boolean;
  live?: boolean;
  caption?: string | null;
  title?: string;
}) {
  const color =
    tone === "gold"
      ? "text-white"
      : tone === "sky"
        ? "text-sky-100"
        : "text-white";
  const size = hero ? "text-[1.85rem] sm:text-[2.05rem]" : "text-[1.35rem] sm:text-[1.5rem]";
  return (
    <div className="min-w-[2.9rem] text-center" title={title}>
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
      {caption ? (
        <p className="mt-0.5 text-[0.58rem] font-semibold tracking-wide text-white/50">{caption}</p>
      ) : null}
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
