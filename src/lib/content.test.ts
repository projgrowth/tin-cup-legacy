import { describe, expect, it } from "vitest";

import { COURSE_DETAILS, COURSE_ORDER } from "@/lib/courses";
import { BUY_IN, EVENT, EXPECTED_PLAYER_COUNT, FEE_BREAKDOWN, SNAKE_PIT } from "@/lib/tin-cup";

/**
 * Invariants locked to the Desktop deck:
 * `/Users/projgrowth/Desktop/4th Annual Tin Cup Invitational 2026.pdf`
 * (repo copy: docs/4th-Annual-Tin-Cup-Invitational-2026.pdf)
 */
describe("2026 tournament content invariants", () => {
  it("keeps the confirmed field, buy-in and Cup totals reconciled", () => {
    const components = FEE_BREAKDOWN.reduce(
      (sum, item) => sum + Number(item.value.replace(/[^0-9.]/g, "")),
      0,
    );
    expect(EXPECTED_PLAYER_COUNT).toBe(16);
    expect(components).toBe(BUY_IN);
    expect(EVENT.totalPoints).toBe(26);
    expect(EVENT.pointsToWin).toBe(13.5);
    expect(COURSE_ORDER.reduce((sum, id) => sum + COURSE_DETAILS[id].points, 0)).toBe(26);
    expect(EVENT.title).toContain("4th Annual");
    expect(EVENT.dates).toBe("August 28–30, 2026");
  });

  it("keeps official course sources and tournament tees explicitly TBD", () => {
    for (const course of COURSE_ORDER) {
      expect(COURSE_DETAILS[course].officialUrl).toMatch(/^https:\/\//);
    }
    for (const hole of SNAKE_PIT) {
      expect(hole.yards.toLowerCase()).toContain("tbd");
    }
  });

  it("tells each day as a story, not a duplicate rules list", () => {
    expect(COURSE_DETAILS.south.format).toMatch(/Scramble/i);
    expect(COURSE_DETAILS.copperhead.format).toMatch(/Stableford/i);
    expect(COURSE_DETAILS.island.format).toMatch(/Shamble/i);
    for (const course of COURSE_ORDER) {
      expect(COURSE_DETAILS[course].formatTip.length).toBeGreaterThan(24);
      expect(COURSE_DETAILS[course].points).toBeGreaterThan(0);
    }
  });
});
