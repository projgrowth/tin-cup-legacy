import { describe, expect, it } from "vitest";

import {
  BANTER_PROMPTS,
  CUSTOM_PROMPT_MAX,
  chipForPlayer,
  chipFromBody,
  mergeWallPrompts,
  mineOnPrompt,
  normalizeCustomBody,
  upsertPrompt,
  upsertVote,
  winnerForPrompt,
} from "./banter";

describe("banter", () => {
  it("ships six canned prompts", () => {
    expect(BANTER_PROMPTS).toHaveLength(6);
    expect(BANTER_PROMPTS.map((row) => row.id)).toEqual([
      "three-putt",
      "sandbag",
      "breakfast",
      "parking",
      "nassau",
      "gimme",
    ]);
    expect(BANTER_PROMPTS.map((row) => row.prompt)).toEqual([
      "Most likely to three-putt the first hole",
      "Most likely to sandbag the first tee and then stripe one",
      "Most likely to take a breakfast ball and still find the trees",
      "Most likely to text on the way from the parking lot",
      "Most likely to lose a Nassau and blame the putter",
      "Most likely to ask for a gimme from 8 feet",
    ]);
    expect(BANTER_PROMPTS.map((row) => row.chip)).toEqual([
      "3-putt 1",
      "sandbag",
      "breakfast ball",
      "still in the lot",
      "Nassau victim",
      "that's good right?",
    ]);
  });

  it("picks the player with the most votes", () => {
    const votes = [
      { promptId: "sandbag", voterId: "u1", playerId: "dan", updatedAt: "2026-08-22T12:00:00Z" },
      { promptId: "sandbag", voterId: "u2", playerId: "dan", updatedAt: "2026-08-22T12:01:00Z" },
      { promptId: "sandbag", voterId: "u3", playerId: "zack", updatedAt: "2026-08-22T12:02:00Z" },
    ];
    expect(winnerForPrompt(votes, "sandbag")).toEqual({ playerId: "dan", count: 2 });
  });

  it("lets a voter change their tap", () => {
    const first = upsertVote([], {
      promptId: "nassau",
      voterId: "u1",
      playerId: "dan",
      updatedAt: "2026-08-22T12:00:00Z",
    });
    const next = upsertVote(first, {
      promptId: "nassau",
      voterId: "u1",
      playerId: "zack",
      updatedAt: "2026-08-22T12:01:00Z",
    });
    expect(mineOnPrompt(next, "nassau", "u1")?.playerId).toBe("zack");
    expect(winnerForPrompt(next, "nassau")?.playerId).toBe("zack");
  });

  it("writes the crowd line with the leader percent", () => {
    const votes = [
      { promptId: "three-putt", voterId: "u1", playerId: "p1", updatedAt: "2026-08-22T12:00:00Z" },
    ];
    expect(chipForPlayer(votes, "p1", "Kevin")).toEqual([
      "100% of people say Kevin is gonna be the one to 3-putt",
    ]);
    const split = [
      { promptId: "sandbag", voterId: "u1", playerId: "dan", updatedAt: "2026-08-22T12:00:00Z" },
      { promptId: "sandbag", voterId: "u2", playerId: "dan", updatedAt: "2026-08-22T12:01:00Z" },
      { promptId: "sandbag", voterId: "u3", playerId: "dan", updatedAt: "2026-08-22T12:02:00Z" },
      { promptId: "sandbag", voterId: "u4", playerId: "dan", updatedAt: "2026-08-22T12:03:00Z" },
      { promptId: "sandbag", voterId: "u5", playerId: "zack", updatedAt: "2026-08-22T12:04:00Z" },
    ];
    expect(chipForPlayer(split, "dan", "Dan")).toEqual([
      "80% of people say Dan is gonna be the one to sandbag the first tee and then stripe one",
    ]);
  });

  it("creates a custom most-likely and lists it after canned", () => {
    const custom = upsertPrompt([], {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      prompt: "Most likely to lose a Titleist in the fescue",
      chip: chipFromBody("Most likely to lose a Titleist in the fescue"),
      authorId: "u1",
      createdAt: "2026-08-23T18:00:00Z",
      custom: true,
    });
    expect(normalizeCustomBody("  Most likely to  trip  " + "x".repeat(100)).length).toBe(CUSTOM_PROMPT_MAX);
    const wall = mergeWallPrompts(custom);
    expect(wall.slice(0, BANTER_PROMPTS.length)).toEqual(BANTER_PROMPTS);
    expect(wall.at(-1)?.id).toBe(custom[0]?.id);
    expect(wall.at(-1)?.prompt).toContain("Titleist");
  });

  it("votes a custom prompt one-per-user and lets them change", () => {
    const promptId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const first = upsertVote([], {
      promptId,
      voterId: "u1",
      playerId: "dan",
      updatedAt: "2026-08-23T18:00:00Z",
    });
    expect(mineOnPrompt(first, promptId, "u1")?.playerId).toBe("dan");
    const next = upsertVote(first, {
      promptId,
      voterId: "u1",
      playerId: "zack",
      updatedAt: "2026-08-23T18:01:00Z",
    });
    expect(next.filter((vote) => vote.promptId === promptId && vote.voterId === "u1")).toHaveLength(1);
    expect(mineOnPrompt(next, promptId, "u1")?.playerId).toBe("zack");
    expect(winnerForPrompt(next, promptId)).toEqual({ playerId: "zack", count: 1 });
    expect(
      chipForPlayer(next, "zack", "Zack", [
        {
          id: promptId,
          prompt: "Most likely to lose a Titleist in the fescue",
          chip: "Titleist in the fescue",
        },
      ]),
    ).toEqual(["100% of people say Zack is gonna be the one to lose a Titleist in the fescue"]);
  });
});
