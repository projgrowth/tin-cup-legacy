import { describe, expect, it } from "vitest";

import {
  DAY1_PAIRINGS,
  day1GroupForPlayer,
  fridayFoursome,
  fridayPartnerLine,
  foursomeSentence,
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
    expect(fridayPartnerLine("Zack Smith")).toBe("Chris · vs Charles · Blake");
    expect(fridayPartnerLine("Nobody")).toBeNull();
  });

  it("orders Friday seats you, partner, then across", () => {
    const seats = fridayFoursome("Dan Rodriguez");
    expect(seats?.map((s) => s.name)).toEqual([
      "Dan Rodriguez",
      "Josef Yehia",
      "Kevin Maher",
      "Max Furth",
    ]);
    expect(seats?.[0]?.you).toBe(true);
  });

  it("speaks a foursome sentence from either side", () => {
    expect(foursomeSentence(["Zack Smith", "Chris Maher"], ["Charles Grass", "Blake Weeks"])).toBe(
      "Zack and Chris vs Charles and Blake",
    );
    expect(
      foursomeSentence(["Zack Smith", "Chris Maher"], ["Charles Grass", "Blake Weeks"], "Charles Grass"),
    ).toBe("You and Blake vs Zack and Chris");
  });
});
