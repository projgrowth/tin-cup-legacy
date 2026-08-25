import { describe, expect, it } from "vitest";

import {
  DAY1_PAIRINGS,
  day1GroupForPlayer,
  fridayRosterNames,
  groupLine,
  yourGroupLine,
} from "@/lib/day1-pairings";

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

  it("prints the Home match line from the claimed seat", () => {
    expect(yourGroupLine("Zack Smith")).toBe("You · Chris vs Charles · Blake");
    expect(groupLine("Zack Smith")).toBe("Zack · Chris vs Charles · Blake");
    expect(yourGroupLine("Josef Yehia")).toBe("You · Dan vs Kevin · Max");
    expect(yourGroupLine("Nobody")).toBeNull();
  });

  it("lists the 16 Friday names for superlatives", () => {
    expect(fridayRosterNames()).toHaveLength(16);
    expect(fridayRosterNames()[0]).toBe("Zack Smith");
  });
});
