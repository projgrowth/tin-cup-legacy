import { describe, expect, it } from "vitest";

import {
  buildCupStoryPayload,
  cupStoryCaption,
  firstName,
  formatCupPoints,
} from "./share-moment";

const friday = {
  id: "fri",
  slug: "friday",
  day_label: "Friday",
  format: "Scramble / Alt Shot",
  sort_order: 1,
};
const saturday = {
  id: "sat",
  slug: "saturday",
  day_label: "Saturday",
  format: "Modified Stableford Match Play",
  sort_order: 2,
};
const sunday = {
  id: "sun",
  slug: "sunday",
  day_label: "Sunday",
  format: "Shamble / Singles",
  sort_order: 3,
};

describe("formatCupPoints", () => {
  it("keeps halves as a single decimal", () => {
    expect(formatCupPoints(9.5)).toBe("9.5");
    expect(formatCupPoints(4)).toBe("4");
    expect(formatCupPoints(0.5)).toBe("0.5");
  });
});

describe("buildCupStoryPayload", () => {
  it("keeps the cup live when singles are still out, and lists claimed cash", () => {
    const payload = buildCupStoryPayload({
      matches: [
        { round_id: "fri", points: 4.5, result: "strong-mental" },
        { round_id: "fri", points: 3.5, result: "grass-roots" },
        { round_id: "sat", points: 4, result: "strong-mental" },
        { round_id: "sat", points: 2, result: "grass-roots" },
        { round_id: "sun", points: 0.5, result: "strong-mental" },
        { round_id: "sun", points: 3.5, result: "grass-roots" },
        { round_id: "sun", points: 8, result: "pending" },
      ],
      rounds: [friday, saturday, sunday],
      teams: [
        { slug: "strong-mental", name: "Team Strong Mental" },
        { slug: "grass-roots", name: "Team Grass Roots" },
      ],
      trophies: [
        { name: "Championship Trophy", winner_name: null, sort_order: 0 },
        { name: "Chubbs Peterson MVP", winner_name: null, sort_order: 1 },
      ],
      sideBets: [
        { label: "CTP - Friday front", player_name: "Andrew Kezsbom", sort_order: 1 },
        { label: "CTP - Sunday front", player_name: null, sort_order: 5 },
      ],
      canonicalUrl: "https://tincupinv.com/?story=recap",
    });

    expect(payload.kind).toBe("cup-story");
    expect(payload.winnerName).toBeNull();
    expect(payload.strongMental).toBe(9);
    expect(payload.grassRoots).toBe(9);
    expect(payload.remaining).toBe(8);
    expect(payload.days.map((day) => day.label)).toEqual(["Friday", "Saturday", "Sunday"]);
    expect(payload.days[2]?.remaining).toBe(8);
    expect(payload.sideCash).toEqual([{ label: "CTP - Friday front", player: "Andrew Kezsbom" }]);
    expect(cupStoryCaption(payload)).toContain("8 pts still on the course");
  });

  it("names the winner only after the last point is in", () => {
    const payload = buildCupStoryPayload({
      matches: [{ round_id: "sun", points: 13.5, result: "grass-roots" }],
      rounds: [sunday],
      teams: [
        { slug: "strong-mental", name: "Team Strong Mental" },
        { slug: "grass-roots", name: "Team Grass Roots" },
      ],
      trophies: [{ name: "Championship Trophy", winner_name: "Grass Roots", sort_order: 0 }],
      sideBets: [],
      canonicalUrl: "https://tincupinv.com",
    });
    expect(payload.winnerName).toBe("Team Grass Roots");
    expect(payload.trophies[0]?.winner).toBe("Grass Roots");
    expect(firstName("Andrew Kezsbom")).toBe("Andrew");
  });
});
