import { useEffect, useState } from "react";

import { applyTheme, readTheme, writeTheme, type PaperTheme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<PaperTheme>("paper");

  useEffect(() => {
    const next = readTheme();
    setTheme(next);
    applyTheme(next);
  }, []);

  function choose(next: PaperTheme) {
    setTheme(next);
    writeTheme(next);
  }

  return (
    <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-3">
      <p className="t-body font-medium text-foreground">Look</p>
      <div className="flex gap-1" role="group" aria-label="Look">
        {(
          [
            ["paper", "Paper"],
            ["night", "Night"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={theme === value}
            onClick={() => choose(value)}
            className={`press chip min-h-11 ${theme === value ? "chip-on" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
