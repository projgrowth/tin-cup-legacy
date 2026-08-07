import { describe, expect, it } from "vitest";

import {
  coalesceWireToast,
  diffWireEvents,
  sortWireEvents,
  type MatchSnap,
  type SideBetSnap,
  type WireSnapshot,
} from "./live-wire";

const baseMatch = (over: Partial<MatchSnap> & { id: string }): MatchSnap => ({
  label: "Match 1",
  points: 1,
  result: "pending",
  side_a: null,
  side_b: null,
  ...over,
});

function snap(matches: MatchSnap[], sideBets: SideBetSnap[] = []): WireSnapshot {
  return { matches, sideBets };
}

describe("diffWireEvents", () => {
  it("emits nothing on first snapshot", () => {
    const next = snap([baseMatch({ id: "m1" })]);
    expect(diffWireEvents(null, next)).toEqual([]);
  });

  it("emits match-final and cup when result posts", () => {
    const prev = snap([
      baseMatch({ id: "m1", label: "Match 1", points: 1, result: "pending" }),
      baseMatch({ id: "m2", label: "Match 2", points: 1, result: "pending" }),
    ]);
    const next = snap([
      baseMatch({
        id: "m1",
        label: "Match 1",
        points: 1,
        result: "strong-mental",
        revision: 2,
      }),
      baseMatch({ id: "m2", label: "Match 2", points: 1, result: "pending" }),
    ]);
    const events = diffWireEvents(prev, next, 1_000);
    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain("match-final");
    expect(kinds).toContain("cup");
    const final = events.find((e) => e.kind === "match-final")!;
    expect(final.title).toMatch(/Match 1 final/);
    expect(final.priority).toBe("high");
    expect(final.teamSlug).toBe("strong-mental");
  });

  it("emits reopen when result cleared", () => {
    const prev = snap([
      baseMatch({ id: "m1", label: "G1", result: "grass-roots" }),
    ]);
    const next = snap([baseMatch({ id: "m1", label: "G1", result: "pending" })]);
    const events = diffWireEvents(prev, next, 2_000);
    expect(events.some((e) => e.kind === "match-reopen")).toBe(true);
  });

  it("emits pairing when sides lock", () => {
    const prev = snap([baseMatch({ id: "m1", label: "Fri G1" })]);
    const next = snap([
      baseMatch({
        id: "m1",
        label: "Fri G1",
        side_a: "Dan Smith, Ed Jones",
        side_b: "Kevin Lee",
        revision: 1,
      }),
    ]);
    const events = diffWireEvents(prev, next, 3_000);
    const pairing = events.find((e) => e.kind === "pairing");
    expect(pairing?.title).toMatch(/sides locked/);
    expect(pairing?.subtitle).toMatch(/Dan\/Ed vs Kevin/);
  });

  it("emits side-bet claim", () => {
    const prev = snap(
      [],
      [
        {
          id: "b1",
          kind: "ctp",
          label: "CTP 7",
          amount: 100,
          player_name: null,
          team_slug: null,
        },
      ],
    );
    const next = snap(
      [],
      [
        {
          id: "b1",
          kind: "ctp",
          label: "CTP 7",
          amount: 100,
          player_name: "Kevin Walsh",
          team_slug: "grass-roots",
        },
      ],
    );
    const events = diffWireEvents(prev, next, 4_000);
    const claim = events.find((e) => e.kind === "side-bet");
    expect(claim?.title).toMatch(/CTP claimed · Kevin/);
    expect(claim?.priority).toBe("high");
    expect(claim?.teamSlug).toBe("grass-roots");
  });

  it("emits new social items only", () => {
    const prev = snap([], []);
    prev.social = [
      {
        id: "claim-1",
        kind: "claim",
        title: "Alex joined the field",
        at: "2026-08-01T00:00:00Z",
      },
    ];
    const next = snap([], []);
    next.social = [
      ...prev.social!,
      {
        id: "photo-2",
        kind: "photo",
        title: "Maya posted a photo",
        at: "2026-08-02T00:00:00Z",
      },
    ];
    const events = diffWireEvents(prev, next, 5_000);
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe("photo");
  });
});

describe("coalesceWireToast", () => {
  it("returns null for empty", () => {
    expect(coalesceWireToast([])).toBeNull();
  });

  it("batches multiple finals", () => {
    const msg = coalesceWireToast([
      {
        id: "1",
        kind: "match-final",
        priority: "high",
        at: 1,
        title: "M1 final",
      },
      {
        id: "2",
        kind: "match-final",
        priority: "high",
        at: 2,
        title: "M2 final",
      },
      {
        id: "3",
        kind: "cup",
        priority: "high",
        at: 3,
        title: "Cup moves · 2–0",
      },
    ]);
    expect(msg?.title).toBe("2 matches decided");
    expect(msg?.subtitle).toMatch(/Cup moves/);
  });
});

describe("sortWireEvents", () => {
  it("sorts newest first then by priority", () => {
    const sorted = sortWireEvents([
      { id: "a", kind: "photo", priority: "low", at: 10, title: "a" },
      { id: "b", kind: "match-final", priority: "high", at: 10, title: "b" },
      { id: "c", kind: "pairing", priority: "normal", at: 20, title: "c" },
    ]);
    expect(sorted.map((e) => e.id)).toEqual(["c", "b", "a"]);
  });
});
