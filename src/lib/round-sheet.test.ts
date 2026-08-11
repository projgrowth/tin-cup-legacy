import { describe, expect, it } from "vitest";

import {
  buildPlanLines,
  countPlanned,
  formatRoundSheetText,
  hasPlanContent,
} from "@/lib/round-sheet";

describe("round sheet", () => {
  it("counts planned holes and formats share text", () => {
    const lines = buildPlanLines("south", (h) =>
      h === 1
        ? { tee_club: "Driver", target_line: "left edge", green_note: null, target_score: 4, notes: null }
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
});
