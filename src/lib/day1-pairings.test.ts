import { describe, expect, it } from "vitest";

import { DAY1_PAIRINGS, day1GroupForPlayer } from "@/lib/day1-pairings";

describe("day1 pairings", () => {
  it("has four locked matches", () => {
    expect(DAY1_PAIRINGS).toHaveLength(4);
    expect(DAY1_PAIRINGS[0]).toMatchObject({
      sideA: "Zack / Chris",
      sideB: "Charles / Blake",
    });
  });

  it("resolves partner for a roster name", () => {
    const g = day1GroupForPlayer("Zack Smith");
    expect(g?.partner).toBe("Chris Maher");
    expect(g?.opponents).toContain("Charles");
  });
});
