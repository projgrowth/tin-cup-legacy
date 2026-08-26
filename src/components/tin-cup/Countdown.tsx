import { formatCountdown } from "@/lib/countdown";
import { COURSE_DETAILS } from "@/lib/courses";
import { useLiveCountdown } from "@/lib/use-live-countdown";

function onTeeLine() {
  const south = COURSE_DETAILS.south;
  return `On the tee · ${south.dayLabel} ${south.firstTee}`;
}

/** Full-width first-tee clock. Compact is a single caption for tight slots. */
export function Countdown({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const time = useLiveCountdown();
  const close = !time.done && time.remaining < 86_400_000;

  if (compact) {
    if (time.done) {
      return <span className={`t-micro ${className || "text-hunter"}`.trim()}>{onTeeLine()}</span>;
    }
    const line = close
      ? `${String(time.hours + time.days * 24).padStart(2, "0")}:${String(time.minutes).padStart(2, "0")}:${String(time.seconds).padStart(2, "0")}`
      : `${time.days}d ${time.hours}h ${time.minutes}m`;
    return (
      <span
        suppressHydrationWarning
        className={`t-micro tabular-nums ${className || "text-muted-foreground"}`.trim()}
      >
        <span className="font-semibold">{line}</span>
      </span>
    );
  }

  if (time.done) {
    return (
      <section aria-live="polite">
        <p className="t-micro text-hunter">{onTeeLine()}</p>
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
          <div key={cell.label} className="px-1 py-4 text-center">
            <p
              suppressHydrationWarning
              className="font-bold tabular-nums leading-none tracking-tight text-foreground text-[clamp(2.4rem,11vw,3.35rem)]"
            >
              {String(cell.n).padStart(2, "0")}
            </p>
            <p className="t-eyebrow mt-2">{cell.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
