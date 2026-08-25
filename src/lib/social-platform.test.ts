import { describe, expect, it } from "vitest";

import {
  confirmationStatus,
  activeCheckIns,
  deriveAchievements,
  normalizeHomeModules,
  playerParticipates,
  predictionLocked,
  predictionTotals,
  orderClubhousePolls,
  pollClosed,
  pollDare,
  smartHomeModules,
  type ClubhousePoll,
  type MatchConfirmation,
  type MatchPrediction,
} from "./social-platform";

const match = {
  id: "m1",
  label: "Match 1",
  points: 1,
  revision: 0,
  result: "pending",
  round_id: "r1",
  side_a: "Andrew Smith / Zack Jones",
  side_b: "Kevin West / Dan Bell",
  sort_order: 1,
  updated_at: "2026-08-18T00:00:00Z",
};

describe("social platform rules", () => {
  it("normalizes module order without dropping required secondary modules", () => {
    expect(normalizeHomeModules(["photos", "photos", "plan"])).toEqual([
      "photos",
      "plan",
      "upcoming",
      "purse",
    ]);
  });

  it("matches participants using exact slash-delimited roster names", () => {
    expect(playerParticipates(match, { name: "Kevin West" })).toBe(true);
    expect(playerParticipates(match, { name: "Kevin" })).toBe(false);
  });

  it("locks predictions only after the official result posts", () => {
    expect(predictionLocked(match)).toBe(false);
    expect(predictionLocked({ ...match, result: "halved" })).toBe(true);
  });

  it("summarizes predictions and confirmation review status", () => {
    const predictions: MatchPrediction[] = [
      { matchId: "m1", userId: "u1", choice: "side-a", createdAt: "", updatedAt: "" },
      { matchId: "m1", userId: "u2", choice: "halved", createdAt: "", updatedAt: "" },
    ];
    expect(predictionTotals(predictions, "m1")).toEqual({
      sideA: 1,
      halved: 1,
      sideB: 0,
      total: 2,
    });
    const confirmations: MatchConfirmation[] = [
      {
        matchId: "m1",
        playerId: "p1",
        userId: "u1",
        state: "needs-review",
        createdAt: "",
        updatedAt: "",
      },
    ];
    expect(confirmationStatus({ ...match, result: "side-a" }, confirmations)).toBe("under-review");
  });

  it("uses event-aware Home ordering unless the player chooses custom", () => {
    expect(smartHomeModules("pre", ["purse", "photos", "plan", "upcoming"], "auto")).toEqual([
      "plan",
      "upcoming",
      "photos",
      "purse",
    ]);
    expect(smartHomeModules("live", ["purse", "photos", "plan", "upcoming"], "custom")).toEqual([
      "purse",
      "photos",
      "plan",
      "upcoming",
    ]);
  });

  it("expires check-ins and closes timed polls without location data", () => {
    const now = Date.parse("2026-08-28T18:00:00Z");
    expect(
      activeCheckIns(
        [
          {
            userId: "u1",
            playerId: "p1",
            status: "clubhouse",
            createdAt: "",
            expiresAt: "2026-08-28T19:00:00Z",
          },
          {
            userId: "u2",
            playerId: "p2",
            status: "on-course",
            createdAt: "",
            expiresAt: "2026-08-28T17:00:00Z",
          },
        ],
        now,
      ),
    ).toHaveLength(1);
    expect(pollClosed({ closedAt: null, closesAt: "2026-08-28T17:00:00Z" }, now)).toBe(true);
  });

  it("derives social achievements without changing official awards", () => {
    expect(
      deriveAchievements({
        plannedHoles: 18,
        posts: 1,
        reactionCount: 3,
        correctPredictions: 2,
        confirmations: 1,
        points: 2,
      }).map((row) => row.id),
    ).toEqual(["planner", "clubhouse", "crowd-favorite", "predictor", "verified", "points"]);
  });

  it("puts the first-hole 3-putt dare first and strips Most likely", () => {
    expect(pollDare("Most likely to 3-putt the first hole")).toBe("to 3-putt the first hole");
    const polls = orderClubhousePolls([
      {
        id: "b",
        authorId: "u",
        question: "Most likely to buy the steakhouse table a round",
        createdAt: "2026-08-25T00:00:02Z",
        closesAt: null,
        closedAt: null,
        deletedAt: null,
        moderatedBy: null,
        options: [],
      },
      {
        id: "a",
        authorId: "u",
        question: "Most likely to 3-putt the first hole",
        createdAt: "2026-08-25T00:00:00Z",
        closesAt: null,
        closedAt: null,
        deletedAt: null,
        moderatedBy: null,
        options: [],
      },
    ] satisfies ClubhousePoll[]);
    expect(polls.map((poll) => poll.id)).toEqual(["a", "b"]);
  });
});
