/** Pure readiness helpers for /ops and unit tests. */

import { EXPECTED_PLAYER_COUNT, VENMO_IS_PLACEHOLDER } from "@/lib/tin-cup";

export type BoardSnapshot = {
  teams: number;
  players: number;
  rounds: number;
  matches: number;
  sideBets: number;
};

export type ReadinessFlags = {
  venmoReady: boolean;
  boardSeeded: boolean;
  sidePotsSeeded: boolean;
  canScore: boolean;
  queueClean: boolean;
  online: boolean;
};

export function evaluateReadiness(input: {
  board?: BoardSnapshot | null;
  canScore: boolean;
  pendingWrites: number;
  failedWrites: number;
  conflicts: number;
  online: boolean;
  venmoPlaceholder?: boolean;
}): ReadinessFlags {
  const board = input.board;
  const venmoReady = !(input.venmoPlaceholder ?? VENMO_IS_PLACEHOLDER);
  return {
    venmoReady,
    boardSeeded: Boolean(
      board &&
      board.teams === 2 &&
      board.players === EXPECTED_PLAYER_COUNT &&
      board.rounds === 3 &&
      board.matches >= 23,
    ),
    sidePotsSeeded: Boolean(board && board.sideBets >= 8),
    canScore: input.canScore,
    queueClean: input.pendingWrites === 0 && input.failedWrites === 0 && input.conflicts === 0,
    online: input.online,
  };
}

/** Count how many readiness gates are green (of 6). */
export function readinessScore(flags: ReadinessFlags): { ready: number; total: number } {
  const values = Object.values(flags);
  return { ready: values.filter(Boolean).length, total: values.length };
}

export function isEventReady(flags: ReadinessFlags): boolean {
  return Object.values(flags).every(Boolean);
}
