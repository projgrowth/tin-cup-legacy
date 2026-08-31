import { describe, expect, it } from "vitest";

import {
  buildCupStoryPayload,
  cupStoryCaption,
  firstName,
  formatCupPoints,
  groupSideCashByPlayer,
  layoutCupStory,
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

describe("layoutCupStory", () => {
  it("keeps bands stacked without overlap and inside the Stories safe area", () => {
    const payload = buildCupStoryPayload({
      matches: [{ round_id: "sun", points: 13.5, result: "grass-roots" }],
      rounds: [friday, saturday, sunday],
      teams: [
        { slug: "strong-mental", name: "Team Strong Mental" },
        { slug: "grass-roots", name: "Team Grass Roots" },
      ],
      trophies: [
        { name: "Chubbs Peterson MVP", winner_name: "Zack Smith", sort_order: 1 },
        { name: "Steve Stinson Vibes Award", winner_name: "Kevin Maher", sort_order: 2 },
      ],
      sideBets: [
        { label: "CTP - Sunday 1", player_name: "Blake Weeks", sort_order: 1 },
        { label: "CTP - Sunday 2", player_name: "Blake Weeks", sort_order: 2 },
        { label: "CTP - Sunday 3", player_name: "Blake Weeks", sort_order: 3 },
        { label: "CTP - Sunday 4", player_name: "Andrew Kezsbom", sort_order: 4 },
        { label: "Long Drive - Friday", player_name: "Neil Candelora", sort_order: 5 },
      ],
      canonicalUrl: "https://tincupinv.com",
    });
    const bands = layoutCupStory(payload);
    expect(groupSideCashByPlayer(payload.sideCash)[0]).toMatchObject({ name: "Blake", count: 3 });
    for (let i = 1; i < bands.length; i += 1) {
      const prev = bands[i - 1]!;
      const next = bands[i]!;
      expect(prev.top + prev.height).toBeLessThanOrEqual(next.top);
    }
    const last = bands[bands.length - 1]!;
    expect(last.top + last.height).toBeLessThanOrEqual(1700);
    expect(bands[0]?.top).toBeGreaterThanOrEqual(250);
  });

  it("places the group photo in its own band when included", () => {
    const payload = buildCupStoryPayload({
      matches: [{ round_id: "sun", points: 13.5, result: "grass-roots" }],
      rounds: [sunday],
      teams: [{ slug: "grass-roots", name: "Team Grass Roots" }],
      trophies: [],
      sideBets: [],
      canonicalUrl: "https://tincupinv.com",
    });
    const bands = layoutCupStory({ ...payload, includePhoto: true });
    expect(bands[0]?.id).toBe("photo");
    expect(bands.some((row) => row.id === "medal")).toBe(false);
    for (let i = 1; i < bands.length; i += 1) {
      expect(bands[i - 1]!.top + bands[i - 1]!.height).toBeLessThanOrEqual(bands[i]!.top);
    }
  });
});
