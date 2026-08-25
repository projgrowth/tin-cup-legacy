import { describe, expect, it } from "vitest";
import {
  buildStoryMoments,
  isBoardMoment,
  isHangoutMoment,
  isResultsMoment,
} from "./weekend-story";

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

  it("does not blow a profile face up as a feed photo", () => {
    const moments = buildStoryMoments({
      matches: [],
      sideBets: [],
      trophies: [],
      activity: [
        {
          id: "avatar-1",
          kind: "avatar",
          at: "2026-08-22T12:00:00Z",
          title: "Andrew added a photo",
          playerName: "Andrew Kezsbom",
          avatarPath: "avatars/andrew.jpg",
        },
        {
          id: "photo-1",
          kind: "photo",
          at: "2026-08-22T12:01:00Z",
          title: "Andrew posted a photo",
          mediaPath: "photos/south.jpg",
          avatarPath: "avatars/andrew.jpg",
        },
      ],
    });
    const face = moments.find((row) => row.key === "activity:avatar-1");
    const shot = moments.find((row) => row.key === "activity:photo-1");
    expect(face).toMatchObject({ kind: "roster", mediaPath: null, shareable: false });
    expect(shot).toMatchObject({ kind: "photo", mediaPath: "photos/south.jpg" });
  });

  it("keeps roster activity out of the Field hangout kinds", () => {
    const moments = buildStoryMoments({
      matches: [],
      sideBets: [],
      trophies: [],
      activity: [
        {
          id: "claim-1",
          kind: "claim",
          at: "2026-08-22T12:00:00Z",
          title: "Dan joined the field",
        },
      ],
    });
    expect(moments[0]?.kind).toBe("roster");
    expect(isHangoutMoment(moments[0]!)).toBe(false);
    expect(isHangoutMoment({ kind: "photo" })).toBe(true);
  });

  it("keeps the Home board to photos, not rides", () => {
    expect(isBoardMoment({ kind: "photo" })).toBe(true);
    expect(isBoardMoment({ kind: "prediction" })).toBe(false);
    expect(isResultsMoment({ kind: "match" })).toBe(true);
  });
});
