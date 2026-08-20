import { describe, expect, it } from "vitest";
import { buildStoryMoments } from "./weekend-story";

describe("weekend story", () => {
  it("normalizes only published tournament moments with stable revision keys", () => {
    const moments = buildStoryMoments({
      matches: [
        {
          id: "m1",
          result: "strong-mental",
          revision: 2,
          updated_at: "2026-08-28T18:00:00Z",
          label: "Match 1",
          points: 1,
          round_id: "r1",
          side_a: "A",
          side_b: "B",
          sort_order: 1,
        },
      ],
      sideBets: [],
      trophies: [],
    });
    expect(moments[0]).toMatchObject({ key: "match:m1:r2", kind: "match", shareable: true });
  });
});
