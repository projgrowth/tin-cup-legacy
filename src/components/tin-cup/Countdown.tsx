import { formatCountdown } from "@/lib/countdown";
import { useLiveCountdown } from "@/lib/use-live-countdown";

export function Countdown({ compact = false }: { compact?: boolean }) {
  const time = useLiveCountdown();
  const close = !time.done && time.remaining < 86_400_000;

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
    return <p className="t-micro text-gold-light">On the tee · Friday 12:19</p>;
  }

  const line = close
    ? `${String(time.hours + time.days * 24).padStart(2, "0")}:${String(time.minutes).padStart(2, "0")}:${String(time.seconds).padStart(2, "0")}`
    : `${time.days}d ${String(time.hours).padStart(2, "0")}h ${String(time.minutes).padStart(2, "0")}m`;

  return (
    <section aria-live="polite">
      <p suppressHydrationWarning className="sr-only">
        {formatCountdown(time.remaining)}
      </p>
      <p suppressHydrationWarning className="t-micro tabular-nums text-muted-foreground">
        Friday 12:19 · <span className="font-semibold text-foreground">{line}</span>
      </p>
    </section>
  );
}
