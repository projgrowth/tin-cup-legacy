/**
 * Offline-tolerant write queue.
 *
 * Innisbrook has real dead spots, so captain writes are applied optimistically,
 * persisted to localStorage, and replayed until the server accepts them.
 *
 * Trust rules:
 * - A write is only ever removed from the queue when the server accepted it, or
 *   when the server definitively rejected it (permissions, constraints, bad data).
 * - Retryable failures back off exponentially and NEVER silently disappear: after
 *   the retry budget they move to a persisted `failed` list that the UI surfaces
 *   with a manual retry, so a lost result is always visible to the captain.
 */
import { graphqlRequest } from "@/integrations/supabase/graphql";

export type QueueTable = "matches" | "side_bets" | "trophies";

export type QueuedWrite = {
  id: string;
  table: QueueTable;
  rowId: string;
  patch: Record<string, unknown>;
  queuedAt: number;
  attempts: number;
  /** Epoch ms before which no replay should be attempted (backoff). */
  nextAttemptAt?: number;
  /** Last error message, kept so a failed write can explain itself. */
  lastError?: string;
  /** Server timestamp observed when this edit was made. Used for optimistic concurrency. */
  expectedUpdatedAt?: string;
  /** Monotonic server revision observed when this edit was made. */
  expectedRevision?: number;
};

export type QueueConflict = QueuedWrite & {
  conflictAt: number;
};

const STORAGE_KEY = "tin-cup-write-queue-v3";
const FAILED_KEY = "tin-cup-write-failed-v1";
const CONFLICT_KEY = "tin-cup-write-conflicts-v1";
const MAX_ATTEMPTS = 12;

let queue: QueuedWrite[] = [];
let failed: QueuedWrite[] = [];
let conflicts: QueueConflict[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    window.localStorage.setItem(FAILED_KEY, JSON.stringify(failed));
    window.localStorage.setItem(CONFLICT_KEY, JSON.stringify(conflicts));
  } catch {
    /* best effort */
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function read<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function hydrateQueue() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  queue = read<QueuedWrite>(STORAGE_KEY);
  // Adopt anything left behind by older queues so an upgrade mid-round
  // never drops a captain's pending result.
  const legacy = [
    ...read<QueuedWrite>("tin-cup-write-queue-v2"),
    ...read<QueuedWrite>("tin-cup-write-queue-v1"),
  ];
  if (legacy.length > 0) {
    queue = [...queue, ...legacy];
    try {
      window.localStorage.removeItem("tin-cup-write-queue-v1");
      window.localStorage.removeItem("tin-cup-write-queue-v2");
    } catch {
      /* best effort */
    }
  }
  // Older builds could leave multiple edits for the same row. Collapse them
  // before replay so one device never conflicts with its own earlier edit.
  queue = coalesceWrites(queue);
  failed = read<QueuedWrite>(FAILED_KEY);
  conflicts = read<QueueConflict>(CONFLICT_KEY);
  persist();
  emit();
}

export function subscribeQueue(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getQueue(): QueuedWrite[] {
  return queue;
}

export function getFailed(): QueuedWrite[] {
  return failed;
}

export function getConflicts(): QueueConflict[] {
  return conflicts;
}

const EMPTY: QueuedWrite[] = [];

export function getServerQueue(): QueuedWrite[] {
  return EMPTY;
}

/**
 * Merge every pending patch for a table onto rows already loaded from the server.
 * Failed writes are intentionally NOT merged — the board must show server truth
 * once a write has given up, otherwise the captain sees a result that isn't real.
 */
export function applyPending<T extends { id: string }>(table: QueueTable, rows: T[]): T[] {
  const pending = queue.filter((w) => w.table === table);
  if (pending.length === 0) return rows;
  return rows.map((row) => {
    const patches = pending.filter((w) => w.rowId === row.id);
    if (patches.length === 0) return row;
    return { ...row, ...mergePatches(patches.map((p) => p.patch)) } as T;
  });
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function remove(id: string) {
  queue = queue.filter((w) => w.id !== id);
  persist();
  emit();
}

function moveToFailed(write: QueuedWrite, reason: string) {
  queue = queue.filter((w) => w.id !== write.id);
  failed = [...failed.filter((w) => w.id !== write.id), { ...write, lastError: reason }];
  persist();
  emit();
}

export type WriteError = { code?: string; message: string };

/**
 * A definitive server rejection: replaying it will never succeed, so it must be
 * dropped and reported instead of retried forever.
 * Exported for unit tests — keep this logic free of side effects.
 */
export function isTerminalError(error: WriteError): boolean {
  const code = error.code ?? "";
  if (!code) return false; // no code == transport failure, keep retrying
  // Transient Postgres classes: connection, serialization, resources, intervention.
  if (/^(08|40|53|57|58)/.test(code)) return false;
  // PostgREST: expired/invalid JWT clears after a token refresh, so retry it.
  if (code === "PGRST301" || code === "PGRST302") return false;
  if (code === "invalid-jwt") return false;
  return true;
}

async function send(write: QueuedWrite): Promise<WriteError | null> {
  const table = write.table;
  const whereType = `${table}_bool_exp`;
  const setType = `${table}_set_input`;
  const guard =
    write.expectedRevision != null
      ? { id: { _eq: write.rowId }, revision: { _eq: write.expectedRevision } }
      : write.expectedUpdatedAt
        ? { id: { _eq: write.rowId }, updated_at: { _eq: write.expectedUpdatedAt } }
        : { id: { _eq: write.rowId } };
  try {
    const data = await graphqlRequest<
      Record<string, { affected_rows: number }>,
      { where: Record<string, unknown>; patch: Record<string, unknown> }
    >(
      `mutation QueueWrite($where: ${whereType}!, $patch: ${setType}!) {
        update_${table}(where: $where, _set: $patch) { affected_rows }
      }`,
      { where: guard, patch: write.patch },
    );
    if (data[`update_${table}`]?.affected_rows === 0) {
      return { code: "TC_CONFLICT", message: "This row changed on another device." };
    }
    return null;
  } catch (error) {
    return {
      code: error && typeof error === "object" && "code" in error ? String(error.code) : undefined,
      message: error instanceof Error ? error.message : "Write failed",
    };
  }
}

async function trySend(write: QueuedWrite): Promise<WriteError | null> {
  try {
    return await send(write);
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Network unavailable" };
  }
}

/** 2s, 4s, 8s … capped at 2 minutes. Exported for unit tests. */
export function backoffMs(attempts: number) {
  return Math.min(2_000 * 2 ** (attempts - 1), 120_000);
}

/**
 * Collapse pending patches for one row in queue order (later wins).
 * Pure helper used by applyPending and unit tests.
 */
export function mergePatches(patches: Array<Record<string, unknown>>): Record<string, unknown> {
  return Object.assign({}, ...patches);
}

/**
 * Keep one pending write per database row. The first write owns the concurrency
 * guard while later patches merge over it, so multiple offline edits from the
 * same phone are sent as one atomic update.
 */
export function coalesceWrites(writes: QueuedWrite[]): QueuedWrite[] {
  const merged: QueuedWrite[] = [];
  const indexByRow = new Map<string, number>();
  for (const write of writes) {
    const key = `${write.table}:${write.rowId}`;
    const index = indexByRow.get(key);
    if (index == null) {
      indexByRow.set(key, merged.length);
      merged.push({ ...write, patch: { ...write.patch } });
      continue;
    }
    const first = merged[index];
    const retryTimes = [first.nextAttemptAt, write.nextAttemptAt].filter(
      (value): value is number => typeof value === "number",
    );
    merged[index] = {
      ...first,
      patch: { ...first.patch, ...write.patch },
      queuedAt: Math.min(first.queuedAt, write.queuedAt),
      attempts: Math.max(first.attempts, write.attempts),
      nextAttemptAt: retryTimes.length ? Math.min(...retryTimes) : undefined,
      lastError: write.lastError ?? first.lastError,
    };
  }
  return merged;
}

/** Revision the server should hold immediately after a successful guarded write. */
export function expectedVersionAfterWrite(
  version: number | string | null | undefined,
  status: "saved" | "queued",
): number | string | undefined {
  if (typeof version === "number") return status === "saved" ? version + 1 : version;
  return version ?? undefined;
}

/** Test-only: wipe module state so suites don't leak across files. */
export function __resetQueueForTests() {
  queue = [];
  failed = [];
  conflicts = [];
  hydrated = true;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(FAILED_KEY);
      window.localStorage.removeItem(CONFLICT_KEY);
      window.localStorage.removeItem("tin-cup-write-queue-v1");
      window.localStorage.removeItem("tin-cup-write-queue-v2");
    } catch {
      /* best effort */
    }
  }
  emit();
}

/** Test-only: seed queue/failed without going through network. */
export function __seedQueueForTests(pending: QueuedWrite[], failedWrites: QueuedWrite[] = []) {
  hydrated = true;
  queue = pending;
  failed = failedWrites;
  persist();
  emit();
}

/**
 * Enqueue a write and try it immediately.
 * Returns "saved" when the server accepted it, "queued" when it will retry,
 * or "rejected" when the server refused it (permissions, bad data).
 */
export async function enqueueWrite(
  table: QueueTable,
  rowId: string,
  patch: Record<string, unknown>,
  expectedVersion?: number | string,
): Promise<"saved" | "queued" | "rejected" | "conflict"> {
  hydrateQueue();
  const incoming: QueuedWrite = {
    id: newId(),
    table,
    rowId,
    patch,
    queuedAt: Date.now(),
    attempts: 0,
    expectedRevision: typeof expectedVersion === "number" ? expectedVersion : undefined,
    expectedUpdatedAt: typeof expectedVersion === "string" ? expectedVersion : undefined,
  };
  const existing = queue.find((item) => item.table === table && item.rowId === rowId);
  const write = existing
    ? {
        ...coalesceWrites([existing, incoming])[0],
        // A fresh user action is worth trying immediately even if the older
        // attempt was waiting in backoff.
        nextAttemptAt: undefined,
        lastError: undefined,
      }
    : incoming;
  queue = existing
    ? queue.map((item) => (item.id === existing.id ? write : item))
    : [...queue, write];
  persist();
  emit();

  const error = await trySend(write);
  if (!error) {
    remove(write.id);
    return "saved";
  }
  if (error.code === "TC_CONFLICT") {
    moveToConflict(write, error.message);
    return "conflict";
  }
  if (isTerminalError(error)) {
    remove(write.id);
    return "rejected";
  }
  write.attempts += 1;
  write.nextAttemptAt = Date.now() + backoffMs(write.attempts);
  write.lastError = error.message;
  persist();
  emit();
  return "queued";
}

function moveToConflict(write: QueuedWrite, reason: string) {
  queue = queue.filter((w) => w.id !== write.id);
  conflicts = [
    ...conflicts.filter((w) => w.id !== write.id),
    { ...write, lastError: reason, conflictAt: Date.now() },
  ];
  persist();
  emit();
}

let flushing = false;

/** Replay everything still pending. Safe to call often. */
export async function flushQueue(): Promise<number> {
  hydrateQueue();
  if (flushing || queue.length === 0) return queue.length;
  flushing = true;
  try {
    const now = Date.now();
    for (const write of [...queue]) {
      if (write.nextAttemptAt && write.nextAttemptAt > now) continue;
      const error = await trySend(write);
      if (!error) {
        remove(write.id);
        continue;
      }
      if (error.code === "TC_CONFLICT") {
        moveToConflict(write, error.message);
        continue;
      }
      if (isTerminalError(error)) {
        moveToFailed(write, error.message);
        continue;
      }
      write.attempts += 1;
      write.lastError = error.message;
      write.nextAttemptAt = Date.now() + backoffMs(write.attempts);
      if (write.attempts >= MAX_ATTEMPTS) {
        moveToFailed(write, error.message);
        continue;
      }
      persist();
    }
  } finally {
    flushing = false;
    emit();
  }
  return queue.length;
}

/** Put every failed write back in line for another round of attempts. */
export async function retryFailed(): Promise<number> {
  hydrateQueue();
  if (failed.length === 0) return 0;
  queue = coalesceWrites([
    ...queue,
    ...failed.map((w) => ({ ...w, attempts: 0, nextAttemptAt: undefined, lastError: undefined })),
  ]);
  failed = [];
  persist();
  emit();
  return flushQueue();
}

/** Acknowledge failed writes so the warning clears. */
export function dismissFailed() {
  hydrateQueue();
  if (failed.length === 0) return;
  failed = [];
  persist();
  emit();
}

export function dismissConflicts() {
  hydrateQueue();
  if (conflicts.length === 0) return;
  conflicts = [];
  persist();
  emit();
}
