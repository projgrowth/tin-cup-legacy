import { describe, expect, it } from "vitest";

import {
  buildPlanLines,
  countPlanned,
  formatRoundSheetText,
  hasPlanContent,
  nineSplit,
} from "@/lib/round-sheet";

describe("round sheet", () => {
  it("counts planned holes and formats share text", () => {
    const lines = buildPlanLines("south", (h) =>
      h === 1
        ? {
            tee_club: "Driver",
            target_line: "left edge",
            green_note: null,
            target_score: 4,
            notes: null,
          }
        : null,
    );
    expect(lines).toHaveLength(18);
    expect(countPlanned(lines)).toBe(1);
    expect(hasPlanContent(lines[0].draft)).toBe(true);
    const text = formatRoundSheetText("south", lines);
    expect(text).toContain("Tin Cup 2026 · South");
    expect(text).toContain("H1");
    expect(text).toContain("Driver");
    expect(text).toContain("tincupinv.com/scout?course=south");
  });

  it("splits front and back nine like a scorecard", () => {
    const lines = buildPlanLines("south", () => null);
    const split = nineSplit(lines);
    expect(split.front).toHaveLength(9);
    expect(split.back).toHaveLength(9);
    expect(split.out.par + split.inn.par).toBe(split.all.par);
    expect(split.out.yards + split.inn.yards).toBe(split.all.yards);
    expect(split.all.par).toBe(71);
    expect(split.all.yards).toBe(6620);
  });
});
