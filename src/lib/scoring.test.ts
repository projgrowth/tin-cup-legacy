import { describe, expect, it } from "vitest";

import {
  clinchSummary,
  formatRecord,
  matchFormatChip,
  pairingIncludes,
  pairingIncludesLoose,
  playerInMatch,
  playerRecord,
  raceLine,
  roundStatus,
  roundTally,
  tallyStandings,
} from "./scoring";
import { EVENT } from "./tin-cup";

const match = (
  round_id: string,
  points: number,
  result: string,
  id = `${round_id}-${points}-${result}-${Math.random()}`,
) => ({ id, round_id, points, result });

describe("tallyStandings", () => {
  it("gives nothing away before a ball is struck", () => {
    const standings = tallyStandings([match("fri", 8, "pending")]);
    expect(standings).toEqual({ strongMental: 0, grassRoots: 0, played: 0, remaining: 8 });
  });

  it("splits halved matches evenly, including odd point values", () => {
    const standings = tallyStandings([match("sat", 1, "halved"), match("sat", 3, "halved")]);
    expect(standings.strongMental).toBe(2);
    expect(standings.grassRoots).toBe(2);
    expect(standings.played).toBe(2);
    expect(standings.remaining).toBe(0);
  });

  it("accepts numeric strings from the database", () => {
    const standings = tallyStandings([
      { id: "a", round_id: "fri", points: "2", result: "strong-mental" },
    ]);
    expect(standings.strongMental).toBe(2);
  });

  it("counts a partially played event correctly", () => {
    const standings = tallyStandings([
      match("fri", 2, "strong-mental"),
      match("fri", 2, "grass-roots"),
      match("fri", 2, "halved"),
      match("sun", 4, "pending"),
    ]);
    expect(standings).toEqual({ strongMental: 3, grassRoots: 3, played: 3, remaining: 4 });
  });

  it("adds the full 26 points across a completed event", () => {
    const played = [
      match("fri", 8, "strong-mental"),
      match("sat", 6, "grass-roots"),
      match("sun", 12, "halved"),
    ];
    const standings = tallyStandings(played);
    expect(standings.strongMental + standings.grassRoots).toBe(26);
  });
});

describe("roundTally", () => {
  it("only counts the round asked for", () => {
    const matches = [match("fri", 4, "strong-mental"), match("sun", 4, "grass-roots")];
    expect(roundTally(matches, "fri")).toMatchObject({ strongMental: 4, grassRoots: 0 });
    expect(roundTally(matches, "sun")).toMatchObject({ strongMental: 0, grassRoots: 4 });
  });
});

describe("clinchSummary", () => {
  it("reports all square with no leader", () => {
    const clinch = clinchSummary(tallyStandings([match("fri", 2, "halved")]));
    expect(clinch.leader).toBeNull();
    expect(clinch.clinchedBy).toBeNull();
    expect(clinch.leaderNeeds).toBe(12.5);
  });

  it("names the leader and what they still need", () => {
    const clinch = clinchSummary({
      strongMental: 10,
      grassRoots: 6,
      played: 16,
      remaining: 10,
    });
    expect(clinch.leader).toBe("strong-mental");
    expect(clinch.leaderNeeds).toBe(3.5);
    expect(clinch.trailerNeeds).toBe(7.5);
  });

  it("clinches at exactly the winning line, half point included", () => {
    expect(
      clinchSummary({ strongMental: 13.5, grassRoots: 12.5, played: 26, remaining: 0 }).clinchedBy,
    ).toBe("strong-mental");
    expect(
      clinchSummary({ strongMental: 13, grassRoots: 13, played: 26, remaining: 0 }).clinchedBy,
    ).toBeNull();
  });

  it("flags retained math when neither side can reach the line", () => {
    const clinch = clinchSummary({ strongMental: 13, grassRoots: 13, played: 26, remaining: 0 });
    expect(clinch.retained).toBe(true);
  });

  it("is not retained while enough points are still on the course", () => {
    const clinch = clinchSummary({ strongMental: 7, grassRoots: 7, played: 14, remaining: 12 });
    expect(clinch.retained).toBe(false);
    expect(clinch.clinchedBy).toBeNull();
  });
});

describe("raceLine", () => {
  it("calls a 13–13 dead heat a playoff, not retained cup copy", () => {
    const standings = { strongMental: 13, grassRoots: 13, played: 26, remaining: 0 };
    const line = raceLine(standings);
    expect(line.headline.toLowerCase()).toContain("playoff");
  });

  it("surfaces points left when all square mid-event", () => {
    const line = raceLine({ strongMental: 0, grassRoots: 0, played: 0, remaining: 26 });
    expect(line.headline).toBe("All square");
    expect(line.detail).toContain("26");
    expect(line.detail).toContain(String(EVENT.pointsToWin));
  });
});

/** 2026 schedule: Fri 8 + Sat 6 + Sun 12 = 26 — structural invariant for seeds/UI. */
describe("2026 point budget", () => {
  it("matches the published 8 / 6 / 12 / 26 schedule", () => {
    const friday = 8;
    const saturday = 6;
    const sunday = 12;
    expect(friday + saturday + sunday).toBe(EVENT.totalPoints);
    expect(EVENT.pointsToWin).toBe(13.5);
  });

  it("tally remaining equals total when nothing is decided", () => {
    const matches = [
      ...Array.from({ length: 4 }, (_, i) => match("fri", 2, "pending", `f${i}`)),
      ...Array.from({ length: 3 }, (_, i) => match("sat", 2, "pending", `s${i}`)),
      ...Array.from({ length: 4 }, (_, i) => match("sun-sham", 1, "pending", `sh${i}`)),
      ...Array.from({ length: 8 }, (_, i) => match("sun-sing", 1, "pending", `si${i}`)),
    ];
    // Fri 4×2=8, Sat 3×2=6, Sun sham 4 + sing 8 = 12 → 26
    const standings = tallyStandings(matches);
    expect(standings.remaining).toBe(26);
    expect(standings.played).toBe(0);
  });
});

describe("roundStatus", () => {
  const round = { play_date: "2026-08-28", tee_window: "12:19–12:44 PM" };

  it("is upcoming the morning of", () => {
    expect(roundStatus(round, Date.parse("2026-08-28T09:00:00-04:00"))).toBe("upcoming");
  });

  it("is live an hour after the first tee", () => {
    expect(roundStatus(round, Date.parse("2026-08-28T13:19:00-04:00"))).toBe("live");
  });

  it("is complete once the round window has passed", () => {
    expect(roundStatus(round, Date.parse("2026-08-28T19:00:00-04:00"))).toBe("complete");
  });

  it("handles a morning tee time without flipping to afternoon", () => {
    const morning = { play_date: "2026-08-29", tee_window: "9:54–10:20 AM" };
    expect(roundStatus(morning, Date.parse("2026-08-29T10:30:00-04:00"))).toBe("live");
    expect(roundStatus(morning, Date.parse("2026-08-29T08:00:00-04:00"))).toBe("upcoming");
  });

  it("falls back to upcoming when the tee window has no time", () => {
    expect(roundStatus({ play_date: "2026-08-30", tee_window: "TBD" })).toBe("upcoming");
  });
});
describe("playerRecord", () => {
  const matches = [
    {
      id: "1",
      round_id: "r1",
      points: 1,
      result: "strong-mental",
      side_a: "Zack Smith / Chris Maher",
      side_b: "Charles Grass / Neil Candelora",
    },
    {
      id: "2",
      round_id: "r1",
      points: 2,
      result: "halved",
      side_a: "Zack Smith & Max Furth",
      side_b: "Mike Maher and Barry Rigby",
    },
    {
      id: "3",
      round_id: "r2",
      points: 1,
      result: "grass-roots",
      side_a: "Zack Smith",
      side_b: "Charles Grass",
    },
    {
      id: "4",
      round_id: "r3",
      points: 1,
      result: "pending",
      side_a: "Zack Smith",
      side_b: "Barry Rigby",
    },
  ];

  it("tallies wins, losses, halves and points from pairings", () => {
    expect(playerRecord(matches, "Zack Smith", "strong-mental")).toEqual({
      won: 1,
      lost: 1,
      halved: 1,
      points: 2,
      played: 3,
      upcoming: 1,
    });
  });

  it("credits the losing side correctly", () => {
    expect(playerRecord(matches, "Charles Grass", "grass-roots")).toMatchObject({
      won: 1,
      lost: 1,
      points: 1,
    });
  });

  it("ignores players not in any pairing", () => {
    expect(playerRecord(matches, "Seth Beaver", "strong-mental")).toMatchObject({
      played: 0,
      upcoming: 0,
    });
  });

  it("matches whole names only", () => {
    expect(pairingIncludes("Mike Maher / Barry Rigby", "Maher")).toBe(false);
    expect(pairingIncludes("Mike Maher / Barry Rigby", "mike maher")).toBe(true);
  });

  it("formats shorthand and returns null before any match is played", () => {
    expect(formatRecord(playerRecord(matches, "Zack Smith", "strong-mental"))).toBe("1-1-1");
    expect(formatRecord(playerRecord(matches, "Seth Beaver", "strong-mental"))).toBeNull();
  });
});

describe("pairingIncludesLoose / playerInMatch", () => {
  it("matches short Day-1 labels via first name", () => {
    expect(pairingIncludesLoose("Zack / Chris", "Zack Smith")).toBe(true);
    expect(pairingIncludesLoose("Charles / Blake", "Blake Weeks")).toBe(true);
    expect(pairingIncludesLoose("Zack / Chris", "Mike Maher")).toBe(false);
  });

  it("still rejects last-name-only fragments", () => {
    expect(pairingIncludesLoose("Mike Maher / Barry Rigby", "Maher")).toBe(false);
  });

  it("detects a player on either side of a match", () => {
    expect(
      playerInMatch(
        { side_a: "Zack / Chris", side_b: "Charles / Blake" },
        "Chris Maher",
      ),
    ).toBe(true);
    expect(
      playerInMatch(
        { side_a: "Zack / Chris", side_b: "Charles / Blake" },
        "Seth Beaver",
      ),
    ).toBe(false);
  });
});

describe("matchFormatChip", () => {
  it("pulls format from numbered match labels", () => {
    expect(matchFormatChip("Scramble Match 1")).toBe("Scramble");
    expect(matchFormatChip("Alt Shot Match 4")).toBe("Alt Shot");
    expect(matchFormatChip("Singles Match 8")).toBe("Singles");
  });

  it("shortens Stableford session labels", () => {
    expect(matchFormatChip("Stableford Front 9")).toBe("Front 9");
    expect(matchFormatChip("Stableford Overall")).toBe("Overall");
  });
});
