import { formatCountdown } from "@/lib/countdown";
import { useLiveCountdown } from "@/lib/use-live-countdown";

export function Countdown({ compact = false }: { compact?: boolean }) {
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
      <p suppressHydrationWarning className="t-micro tabular-nums text-muted-foreground">
        First tee · <span className="font-semibold text-foreground">{line}</span>
      </p>
    );
  }

  if (time.done) {
    return (
      <section className="surface px-4 py-6 text-center">
        <p className="t-eyebrow">The cup is live</p>
        <p className="t-display mt-2 text-foreground">On the tee · South · 12:19</p>
      </section>
    );
  }

  return (
    <section aria-live="polite">
      <p className="event-kicker text-center">First tee · Friday 12:19 PM</p>
      <p suppressHydrationWarning className="sr-only">
        {formatCountdown(time.remaining)}
      </p>
      <div className="mt-3 grid grid-cols-3" aria-hidden>
        {cells.map((cell) => (
          <div key={cell.label} className="text-center">
            <div suppressHydrationWarning className="t-hero tabular-nums text-foreground">
              {String(cell.value).padStart(2, "0")}
            </div>
            <div className="t-micro mt-2">{cell.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
