import { describe, expect, it } from "vitest";

import { countdownParts, formatCountdown, formatCountdownShort } from "@/lib/countdown";

describe("countdown", () => {
  it("returns only days, hours and minutes", () => {
    expect(countdownParts(2 * 86_400_000 + 3 * 3_600_000 + 4 * 60_000 + 59_000)).toEqual({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 59,
      remaining: 2 * 86_400_000 + 3 * 3_600_000 + 4 * 60_000 + 59_000,
      done: false,
    });
  });

  it("formats a readable long countdown", () => {
    expect(formatCountdown(24 * 86_400_000 + 15 * 3_600_000 + 59 * 60_000)).toBe(
      "24 days · 15 hours · 59 minutes",
    );
  });

  it("handles singular units and kickoff", () => {
    expect(formatCountdown(3_660_000)).toBe("1 hour · 1 minute");
    expect(formatCountdown(0)).toBe("Teeing off now");
    expect(countdownParts(-1).done).toBe(true);
  });

  it("shortens day-story meta to a single unit", () => {
    expect(formatCountdownShort(7 * 86_400_000 + 11 * 3_600_000)).toBe("7d");
    expect(formatCountdownShort(3_600_000)).toBe("1h");
    expect(formatCountdownShort(90_000)).toBe("1m");
    expect(formatCountdownShort(0)).toBe("Now");
  });
});
