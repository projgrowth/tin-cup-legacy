import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { graphqlRequest } = vi.hoisted(() => ({ graphqlRequest: vi.fn() }));

vi.mock("@/integrations/nhost/graphql", () => ({ graphqlRequest }));

import {
  __resetQueueForTests,
  __seedQueueForTests,
  enqueueWrite,
  dismissConflicts,
  flushQueue,
  getConflicts,
  getFailed,
  getQueue,
  retryFailed,
} from "./write-queue";

describe("write-queue network path", () => {
  beforeEach(() => {
    __resetQueueForTests();
    graphqlRequest.mockReset();
  });
  afterEach(() => {
    __resetQueueForTests();
  });

  it("returns saved and clears the queue when the server accepts", async () => {
    graphqlRequest.mockResolvedValue({ update_matches: { affected_rows: 1 } });
    const status = await enqueueWrite("matches", "m1", { result: "halved" });
    expect(status).toBe("saved");
    expect(getQueue()).toHaveLength(0);
    expect(graphqlRequest).toHaveBeenCalledOnce();
  });

  it("persists a conflict when the expected server version is stale", async () => {
    graphqlRequest.mockResolvedValue({ update_matches: { affected_rows: 0 } });
    const status = await enqueueWrite("matches", "m1", { result: "halved" }, 4);
    expect(status).toBe("conflict");
    expect(getQueue()).toHaveLength(0);
    expect(getConflicts()).toHaveLength(1);
    dismissConflicts();
    expect(getConflicts()).toHaveLength(0);
  });

  it("queues retryable transport failures", async () => {
    graphqlRequest.mockRejectedValue(new Error("Network unavailable"));
    const status = await enqueueWrite("matches", "m1", { result: "strong-mental" });
    expect(status).toBe("queued");
    expect(getQueue()).toHaveLength(1);
    expect(getQueue()[0].attempts).toBe(1);
    expect(getQueue()[0].nextAttemptAt).toBeGreaterThan(Date.now());
  });

  it("rejects permission failures without leaving a silent drop", async () => {
    graphqlRequest.mockRejectedValue(Object.assign(new Error("permission denied"), { code: "permission-error" }));
    const status = await enqueueWrite("matches", "m1", { result: "grass-roots" });
    expect(status).toBe("rejected");
    expect(getQueue()).toHaveLength(0);
    expect(getFailed()).toHaveLength(0);
  });

  it("flushQueue drains ready writes and moves exhausted ones to failed", async () => {
    graphqlRequest.mockRejectedValue(new Error("offline"));
    __seedQueueForTests([
      {
        id: "w1",
        table: "matches",
        rowId: "m1",
        patch: { result: "halved" },
        queuedAt: 1,
        attempts: 11,
        nextAttemptAt: Date.now() - 1,
      },
    ]);
    const left = await flushQueue();
    expect(left).toBe(0);
    expect(getFailed()).toHaveLength(1);
    expect(getFailed()[0].id).toBe("w1");
  });

  it("retryFailed re-queues and flushes again", async () => {
    graphqlRequest.mockResolvedValue({ update_side_bets: { affected_rows: 1 } });
    __seedQueueForTests(
      [],
      [
        {
          id: "f1",
          table: "side_bets",
          rowId: "b1",
          patch: { player_name: "Zack" },
          queuedAt: 1,
          attempts: 12,
          lastError: "timeout",
        },
      ],
    );
    const left = await retryFailed();
    expect(left).toBe(0);
    expect(getFailed()).toHaveLength(0);
    expect(graphqlRequest).toHaveBeenCalledOnce();
  });
});
