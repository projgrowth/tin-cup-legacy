import { useLiveCountdown } from "@/lib/use-live-countdown";

export function Countdown({
  compact = false,
  cover = false,
}: {
  compact?: boolean;
  cover?: boolean;
}) {
  const time = useLiveCountdown();
  const close = !time.done && time.remaining < 86_400_000;

  const cells = time.done
    ? []
    : close
      ? [
          { label: "Hours", value: time.hours + time.days * 24 },
          { label: "Minutes", value: time.minutes },
          { label: "Seconds", value: time.seconds },
        ]
      : [
          { label: "Days", value: time.days },
          { label: "Hours", value: time.hours },
          { label: "Minutes", value: time.minutes },
        ];

  if (compact) {
    if (time.done) {
      return <p className="t-micro text-gold-light">On the tee · Friday 12:19</p>;
    }
    const line = close
      ? `${String(time.hours + time.days * 24).padStart(2, "0")}:${String(time.minutes).padStart(2, "0")}:${String(time.seconds).padStart(2, "0")}`
      : `${time.days}d ${String(time.hours).padStart(2, "0")}h ${String(time.minutes).padStart(2, "0")}m`;
    return (
      <p className="t-micro tabular-nums text-muted-foreground">
        First tee · <span className="font-semibold text-foreground">{line}</span>
      </p>
    );
  }

  if (time.done) {
    return (
      <section className={cover ? "text-center" : "panel px-4 py-6 text-center"}>
        <p className={`t-eyebrow ${cover ? "text-white/70" : ""}`}>The cup is live</p>
        <p className={`t-display mt-2 ${cover ? "text-white" : "text-foreground"}`}>
          On the tee · South · 12:19
        </p>
      </section>
    );
  }

  if (cover) {
    return (
      <section className="text-center">
        <p className="t-eyebrow text-white/70">First tee · Friday 12:19 PM</p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {cells.map((cell) => (
            <div key={cell.label}>
              <div className="t-hero text-white">{String(cell.value).padStart(2, "0")}</div>
              <div className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/55">
                {cell.label}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="panel overflow-hidden">
      <p className="t-eyebrow border-b border-border px-4 py-2.5 text-center">
        First tee · Friday 12:19 PM
      </p>
      <div className="grid grid-cols-3 divide-x divide-border">
        {cells.map((cell) => (
          <div key={cell.label} className="py-5 text-center">
            <div className="t-hero tabular-nums text-foreground">
              {String(cell.value).padStart(2, "0")}
            </div>
            <div className="t-micro mt-2 uppercase tracking-[0.08em]">{cell.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
