import { describe, expect, it } from "vitest";
import { buildWeekendContext } from "./weekend-context";

const round = {
  id: "r1",
  slug: "friday",
  day_label: "Friday",
  course: "South",
  format: "Four-ball",
  format_detail: null,
  meal: null,
  play_date: "2026-08-28",
  points: 4,
  sort_order: 1,
  tee_window: "12:19 PM",
};
const player = { id: "p1", name: "Kevin Maher", team_id: "t1", is_captain: false, sort_order: 1 };
const match = {
  id: "m1",
  label: "Match 1",
  points: 1,
  revision: 0,
  result: "pending",
  round_id: "r1",
  side_a: "Kevin Maher / Zack",
  side_b: "Chris / Blake",
  sort_order: 1,
  updated_at: "2026-08-01T00:00:00Z",
};

describe("buildWeekendContext", () => {
  it("does not ask a claimed player to claim while identity is loading", () => {
    expect(
      buildWeekendContext({
        phase: "pre",
        signedIn: true,
        identityPending: true,
        rounds: [],
        matches: [],
        canScore: false,
      }).nextAction.kind,
    ).toBe("loading-identity");
  });

  it("sends guests and unclaimed accounts through onboarding", () => {
    expect(
      buildWeekendContext({
        phase: "pre",
        signedIn: false,
        rounds: [],
        matches: [],
        canScore: false,
      }).nextAction.kind,
    ).toBe("sign-in");
    expect(
      buildWeekendContext({
        phase: "pre",
        signedIn: true,
        rounds: [],
        matches: [],
        canScore: false,
      }).nextAction.kind,
    ).toBe("claim-player");
  });

  it("prioritizes planning before the event and a live match during play", () => {
    expect(
      buildWeekendContext({
        phase: "pre",
        signedIn: true,
        player,
        rounds: [round],
        matches: [match],
        canScore: false,
        plannedHoles: 6,
      }).nextAction.kind,
    ).toBe("finish-plan");
    expect(
      buildWeekendContext({
        phase: "live",
        signedIn: true,
        player,
        rounds: [round],
        matches: [match],
        canScore: true,
      }).nextAction.kind,
    ).toBe("score-match");
  });

  it("reports the most severe sync condition", () => {
    expect(
      buildWeekendContext({
        phase: "live",
        signedIn: true,
        player,
        rounds: [round],
        matches: [match],
        canScore: false,
        pendingWrites: 1,
        failedWrites: 1,
        conflicts: 1,
      }).syncHealth,
    ).toBe("conflict");
  });
});
