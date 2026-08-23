import { describe, expect, it } from "vitest";

import {
  QA_SCORE_PLAYER_NAME,
  canScoreFromRolesAndClaimed,
  claimedPlayerGrantsScore,
  isOfficialCupResult,
  isUnofficialLive,
} from "@/lib/score-access";

const players = [
  { id: "adf688dc-6e21-426d-b3c5-23c690eaaa3a", name: "Dan Rodriguez" },
  { id: "other", name: "Josef Yehia" },
];

describe("official vs unofficial", () => {
  it("treats cup results as official and everything else as unofficial", () => {
    expect(isOfficialCupResult("strong-mental")).toBe(true);
    expect(isOfficialCupResult("grass-roots")).toBe(true);
    expect(isOfficialCupResult("halved")).toBe(true);
    expect(isOfficialCupResult("pending")).toBe(false);
    expect(isOfficialCupResult("2 up")).toBe(false);
    expect(isUnofficialLive("AS")).toBe(true);
    expect(isUnofficialLive("halved")).toBe(false);
  });
});

describe("Dan name => canScore UI", () => {
  it("looks up Dan Rodriguez on the roster and grants UI score access", () => {
    expect(claimedPlayerGrantsScore(players, { name: QA_SCORE_PLAYER_NAME })).toBe(true);
    expect(
      claimedPlayerGrantsScore(players, { id: "adf688dc-6e21-426d-b3c5-23c690eaaa3a" }),
    ).toBe(true);
    expect(claimedPlayerGrantsScore(players, { name: "Josef Yehia" })).toBe(false);
    expect(claimedPlayerGrantsScore(players, { name: "Dan" })).toBe(false);
    expect(
      canScoreFromRolesAndClaimed({
        roles: [],
        players,
        claimed: { name: "Dan Rodriguez" },
      }),
    ).toBe(true);
    expect(
      canScoreFromRolesAndClaimed({
        roles: ["captain"],
        players,
        claimed: { name: "Josef Yehia" },
      }),
    ).toBe(true);
    expect(
      canScoreFromRolesAndClaimed({
        roles: [],
        players,
        claimed: { name: "Josef Yehia" },
      }),
    ).toBe(false);
  });
});
