import { describe, expect, it } from "vitest";

import {
  BANTER_PROMPTS,
  chipForPlayer,
  mineOnPrompt,
  upsertVote,
  winnerForPrompt,
} from "./banter";

describe("banter", () => {
  it("ships five canned prompts", () => {
    expect(BANTER_PROMPTS).toHaveLength(5);
    expect(BANTER_PROMPTS.map((row) => row.prompt)).toEqual([
      "Most likely to three-putt the first hole",
      "Most likely to lose one in the pond",
      "Most likely to blame the putter",
      "Most likely to ask for a gimme on 18",
      "Most likely to buy the first round",
    ]);
  });

  it("picks the player with the most votes", () => {
    const votes = [
      { promptId: "pond", voterId: "u1", playerId: "dan", updatedAt: "2026-08-22T12:00:00Z" },
      { promptId: "pond", voterId: "u2", playerId: "dan", updatedAt: "2026-08-22T12:01:00Z" },
      { promptId: "pond", voterId: "u3", playerId: "zack", updatedAt: "2026-08-22T12:02:00Z" },
    ];
    expect(winnerForPrompt(votes, "pond")).toEqual({ playerId: "dan", count: 2 });
  });

  it("lets a voter change their tap", () => {
    const first = upsertVote([], {
      promptId: "putter",
      voterId: "u1",
      playerId: "dan",
      updatedAt: "2026-08-22T12:00:00Z",
    });
    const next = upsertVote(first, {
      promptId: "putter",
      voterId: "u1",
      playerId: "zack",
      updatedAt: "2026-08-22T12:01:00Z",
    });
    expect(mineOnPrompt(next, "putter", "u1")?.playerId).toBe("zack");
    expect(winnerForPrompt(next, "putter")?.playerId).toBe("zack");
  });

  it("prints a chip without poll numbers", () => {
    const votes = [
      { promptId: "three-putt", voterId: "u1", playerId: "p1", updatedAt: "2026-08-22T12:00:00Z" },
    ];
    expect(chipForPlayer(votes, "p1", "Dan")).toEqual(["Dan · most likely to three-putt"]);
  });
});
