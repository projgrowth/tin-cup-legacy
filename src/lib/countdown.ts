export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  remaining: number;
  done: boolean;
};

export function countdownParts(milliseconds: number): CountdownParts {
  const ms = Math.max(0, Math.floor(milliseconds));
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    minutes: Math.floor((ms / 60_000) % 60),
    seconds: Math.floor((ms / 1_000) % 60),
    remaining: ms,
    done: ms === 0,
  };
}

/** Long-form event countdown shared by schedule cards. */
export function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) return "Teeing off now";
  const { days, hours, minutes } = countdownParts(milliseconds);
  const units = [
    days ? `${days} day${days === 1 ? "" : "s"}` : null,
    hours ? `${hours} hour${hours === 1 ? "" : "s"}` : null,
    `${minutes} minute${minutes === 1 ? "" : "s"}`,
  ];
  return units.filter(Boolean).join(" · ");
}
