import { useEffect, useState } from "react";

import { EVENT } from "@/lib/tin-cup";
import { countdownParts } from "@/lib/countdown";

export function Countdown() {
  const target = new Date(EVENT.firstTee).getTime();
  const [time, setTime] = useState<ReturnType<typeof countdownParts> | null>(null);

  useEffect(() => {
    const update = () => setTime(countdownParts(target - Date.now()));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [target]);

  const cells = [
    { label: "Days", value: time?.days },
    { label: "Hours", value: time?.hours },
    { label: "Minutes", value: time?.minutes },
  ];

  return (
    <section className="panel overflow-hidden">
      <p className="t-eyebrow border-b border-border px-4 py-2.5 text-center">
        {time?.done ? "The cup is live" : "First tee · Friday 12:19 PM"}
      </p>
      <div className="grid grid-cols-3 divide-x divide-border">
        {cells.map((cell) => (
          <div key={cell.label} className="py-5 text-center">
            <div className="t-hero tabular-nums text-foreground">
              {cell.value === undefined ? "—" : String(cell.value).padStart(2, "0")}
            </div>
            <div className="t-micro mt-2 uppercase tracking-[0.08em]">{cell.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
