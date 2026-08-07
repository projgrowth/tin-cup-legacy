import { describe, expect, it } from "vitest";

import { evaluateReadiness, isEventReady, readinessScore } from "./ops-checks";

const fullBoard = {
  teams: 2,
  players: 16,
  rounds: 3,
  matches: 23,
  sideBets: 8,
};

describe("evaluateReadiness", () => {
  it("is red when everything is empty", () => {
    const flags = evaluateReadiness({
      board: null,
      canScore: false,
      pendingWrites: 0,
      failedWrites: 0,
      conflicts: 0,
      online: false,
      venmoPlaceholder: true,
    });
    expect(flags.venmoReady).toBe(false);
    expect(flags.boardSeeded).toBe(false);
    expect(flags.canScore).toBe(false);
    expect(flags.online).toBe(false);
    expect(isEventReady(flags)).toBe(false);
    expect(readinessScore(flags).ready).toBe(1); // queueClean only
  });

  it("is green when all weekend gates pass", () => {
    const flags = evaluateReadiness({
      board: fullBoard,
      canScore: true,
      pendingWrites: 0,
      failedWrites: 0,
      conflicts: 0,
      online: true,
      venmoPlaceholder: false,
    });
    expect(flags).toEqual({
      venmoReady: true,
      boardSeeded: true,
      sidePotsSeeded: true,
      canScore: true,
      queueClean: true,
      online: true,
    });
    expect(isEventReady(flags)).toBe(true);
    expect(readinessScore(flags)).toEqual({ ready: 6, total: 6 });
  });

  it("flags a dirty queue", () => {
    const flags = evaluateReadiness({
      board: fullBoard,
      canScore: true,
      pendingWrites: 2,
      failedWrites: 0,
      conflicts: 0,
      online: true,
      venmoPlaceholder: false,
    });
    expect(flags.queueClean).toBe(false);
    expect(isEventReady(flags)).toBe(false);
  });

  it("flags unresolved conflicts even when the pending and failed queues are empty", () => {
    const flags = evaluateReadiness({
      board: fullBoard,
      canScore: true,
      pendingWrites: 0,
      failedWrites: 0,
      conflicts: 1,
      online: true,
      venmoPlaceholder: false,
    });
    expect(flags.queueClean).toBe(false);
    expect(isEventReady(flags)).toBe(false);
  });
});
