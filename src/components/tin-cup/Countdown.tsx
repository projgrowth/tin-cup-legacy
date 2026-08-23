import { formatCountdown } from "@/lib/countdown";
import { useLiveCountdown } from "@/lib/use-live-countdown";

/** Full-width first-tee clock. Compact is a single caption for tight slots. */
export function Countdown({ compact = false }: { compact?: boolean }) {
  const time = useLiveCountdown();
  const close = !time.done && time.remaining < 86_400_000;

  if (compact) {
    if (time.done) {
      return <p className="t-micro text-hunter">On the tee · Friday 12:19</p>;
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
      <section aria-live="polite">
        <p className="t-micro text-hunter">On the tee · Friday 12:19</p>
      </section>
    );
  }

  const cells = close
    ? [
        { n: time.hours + time.days * 24, label: "Hours" },
        { n: time.minutes, label: "Minutes" },
        { n: time.seconds, label: "Seconds" },
      ]
    : [
        { n: time.days, label: "Days" },
        { n: time.hours, label: "Hours" },
        { n: time.minutes, label: "Minutes" },
      ];

  return (
    <section aria-live="polite">
      <p suppressHydrationWarning className="sr-only">
        {formatCountdown(time.remaining)}
      </p>
      <div className="grid grid-cols-3">
        {cells.map((cell) => (
          <div key={cell.label} className="px-1 py-2.5 text-center">
            <p
              suppressHydrationWarning
              className="t-hero text-foreground"
            >
              {String(cell.n).padStart(2, "0")}
            </p>
            <p className="t-eyebrow mt-1">{cell.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
