import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  __resetQueueForTests,
  __seedQueueForTests,
  applyPending,
  backoffMs,
  coalesceWrites,
  expectedVersionAfterWrite,
  isTerminalError,
  mergePatches,
  type QueuedWrite,
} from "./write-queue";

const write = (
  partial: Partial<QueuedWrite> & Pick<QueuedWrite, "table" | "rowId" | "patch">,
): QueuedWrite => ({
  id: partial.id ?? `w-${partial.rowId}`,
  table: partial.table,
  rowId: partial.rowId,
  patch: partial.patch,
  queuedAt: partial.queuedAt ?? 1,
  attempts: partial.attempts ?? 0,
  nextAttemptAt: partial.nextAttemptAt,
  lastError: partial.lastError,
});

describe("isTerminalError", () => {
  it("retries transport failures with no code", () => {
    expect(isTerminalError({ message: "Network unavailable" })).toBe(false);
  });

  it("retries transient Postgres classes", () => {
    expect(isTerminalError({ code: "08006", message: "connection" })).toBe(false);
    expect(isTerminalError({ code: "40001", message: "serialization" })).toBe(false);
    expect(isTerminalError({ code: "57014", message: "cancel" })).toBe(false);
  });

  it("retries expired JWT so a refresh can recover", () => {
    expect(isTerminalError({ code: "PGRST301", message: "jwt expired" })).toBe(false);
    expect(isTerminalError({ code: "PGRST302", message: "jwt invalid" })).toBe(false);
  });

  it("rejects permission and constraint failures", () => {
    expect(isTerminalError({ code: "42501", message: "permission denied" })).toBe(true);
    expect(isTerminalError({ code: "23514", message: "check violation" })).toBe(true);
    expect(isTerminalError({ code: "PGRST116", message: "not found" })).toBe(true);
  });
});

describe("backoffMs", () => {
  it("starts at 2s and doubles, capped at 2 minutes", () => {
    expect(backoffMs(1)).toBe(2_000);
    expect(backoffMs(2)).toBe(4_000);
    expect(backoffMs(3)).toBe(8_000);
    expect(backoffMs(10)).toBe(120_000);
    expect(backoffMs(20)).toBe(120_000);
  });
});

describe("mergePatches", () => {
  it("later patches win on the same key", () => {
    expect(
      mergePatches([{ result: "pending" }, { result: "halved" }, { result: "strong-mental" }]),
    ).toEqual({
      result: "strong-mental",
    });
  });

  it("merges distinct keys", () => {
    expect(mergePatches([{ side_a: "A" }, { side_b: "B" }])).toEqual({
      side_a: "A",
      side_b: "B",
    });
  });
});

describe("coalesceWrites", () => {
  it("merges same-row patches while preserving the original concurrency guard", () => {
    const rows = coalesceWrites([
      {
        ...write({ table: "matches", rowId: "m1", patch: { result: "halved" } }),
        id: "first",
        expectedRevision: 4,
      },
      {
        ...write({ table: "matches", rowId: "m1", patch: { side_a: "Zack / Dan" } }),
        id: "second",
        expectedRevision: 5,
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "first",
      expectedRevision: 4,
      patch: { result: "halved", side_a: "Zack / Dan" },
    });
  });

  it("does not combine different rows or tables", () => {
    const rows = coalesceWrites([
      write({ table: "matches", rowId: "m1", patch: { result: "halved" } }),
      write({ table: "matches", rowId: "m2", patch: { result: "grass-roots" } }),
      write({ table: "side_bets", rowId: "m1", patch: { player_name: "Zack" } }),
    ]);
    expect(rows).toHaveLength(3);
  });
});

describe("expectedVersionAfterWrite", () => {
  it("advances a revision only after the server saved the write", () => {
    expect(expectedVersionAfterWrite(7, "saved")).toBe(8);
    expect(expectedVersionAfterWrite(7, "queued")).toBe(7);
  });

  it("keeps timestamp guards conservative", () => {
    expect(expectedVersionAfterWrite("2026-08-04T12:00:00Z", "saved")).toBe("2026-08-04T12:00:00Z");
  });
});

describe("applyPending", () => {
  beforeEach(() => {
    __resetQueueForTests();
  });
  afterEach(() => {
    __resetQueueForTests();
  });

  it("returns rows unchanged when the queue is empty", () => {
    const rows = [{ id: "m1", result: "pending" }];
    expect(applyPending("matches", rows)).toEqual(rows);
  });

  it("overlays pending patches onto matching rows only", () => {
    __seedQueueForTests([
      write({ table: "matches", rowId: "m1", patch: { result: "strong-mental" } }),
      write({ table: "matches", rowId: "m1", patch: { result: "halved" } }),
      write({ table: "side_bets", rowId: "b1", patch: { player_name: "Zack" } }),
    ]);

    const matches = applyPending("matches", [
      { id: "m1", result: "pending", label: "Scramble 1" },
      { id: "m2", result: "pending", label: "Scramble 2" },
    ]);

    expect(matches[0]).toMatchObject({ id: "m1", result: "halved", label: "Scramble 1" });
    expect(matches[1]).toMatchObject({ id: "m2", result: "pending" });

    const bets = applyPending("side_bets", [{ id: "b1", player_name: null as string | null }]);
    expect(bets[0].player_name).toBe("Zack");
  });

  it("never merges failed writes (server truth wins after give-up)", () => {
    __seedQueueForTests(
      [],
      [write({ table: "matches", rowId: "m1", patch: { result: "grass-roots" } })],
    );
    const rows = applyPending("matches", [{ id: "m1", result: "pending" }]);
    expect(rows[0].result).toBe("pending");
  });
});
