import { describe, expect, it } from "vitest";

import {
  COURSE_ORDER,
  clampHole,
  coursePar,
  defaultCourseId,
  easternDateKey,
  formatBlackYardChip,
  formatScorecardYards,
  getCourse,
  isCourseId,
} from "@/lib/courses";

describe("courses helpers", () => {
  it("formats scorecard yards for outdoor glanceability", () => {
    expect(formatScorecardYards(433)).toBe("433 yds");
    expect(formatScorecardYards(0)).toBe("—");
    expect(formatScorecardYards(null)).toBe("—");
    expect(formatBlackYardChip(335)).toBe("Black · 335");
  });

  it("matches official Innisbrook Black scorecard metadata", () => {
    // South H1 was previously OSM-junk (258); Black is 335.
    expect(getCourse("south").holes[0]).toMatchObject({ par: 4, yards: 335 });
    expect(coursePar("south")).toBe(71);
    expect(getCourse("south").holes.reduce((s, h) => s + h.yards, 0)).toBe(6620);
    // Official South scorecard and OSM have no hole names — do not invent them.
    expect(getCourse("south").holes.every((h) => h.name == null)).toBe(true);

    // Copperhead H12 Black 373; names filled.
    const c12 = getCourse("copperhead").holes.find((h) => h.h === 12)!;
    expect(c12).toMatchObject({ par: 4, yards: 373, name: "Bridge Hole" });
    expect(getCourse("copperhead").holes[5].name).toBe("Sidewinder");
    expect(coursePar("copperhead")).toBe(71);
    expect(getCourse("copperhead").holes.reduce((s, h) => s + h.yards, 0)).toBe(7209);

    const island = getCourse("island");
    expect(island.holes[0].name).toBe("Right Turn");
    expect(island.holes[17]).toMatchObject({ name: "The Island", yards: 373, par: 4 });
    expect(coursePar("island")).toBe(72);
    expect(island.holes.reduce((s, h) => s + h.yards, 0)).toBe(7194);

    for (const id of COURSE_ORDER) {
      expect(getCourse(id).holes).toHaveLength(18);
    }
  });

  it("defaults Scout to the day's tournament course", () => {
    // Friday first tee window (Eastern)
    expect(defaultCourseId(new Date("2026-08-28T14:00:00-04:00").getTime())).toBe("south");
    expect(defaultCourseId(new Date("2026-08-29T10:00:00-04:00").getTime())).toBe("copperhead");
    expect(defaultCourseId(new Date("2026-08-30T10:00:00-04:00").getTime())).toBe("island");
  });

  it("defaults pre-event visitors to South", () => {
    expect(defaultCourseId(new Date("2026-08-01T12:00:00-04:00").getTime())).toBe("south");
  });

  it("clamps hole numbers and validates course ids", () => {
    expect(clampHole(0)).toBe(1);
    expect(clampHole(99)).toBe(18);
    expect(clampHole("7")).toBe(7);
    expect(isCourseId("copperhead")).toBe(true);
    expect(isCourseId("north")).toBe(false);
  });

  it("formats Eastern calendar keys consistently", () => {
    expect(easternDateKey(new Date("2026-08-28T23:30:00-04:00").getTime())).toBe("2026-08-28");
  });
});
