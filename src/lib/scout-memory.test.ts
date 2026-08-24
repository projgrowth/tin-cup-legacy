import { describe, expect, it } from "vitest";

import { parseRememberedHole } from "./scout-memory";

describe("scout last hole", () => {
  it("restores a course and hole from this device", () => {
    expect(parseRememberedHole(JSON.stringify({ course: "copperhead", hole: 16 }))).toEqual({
      course: "copperhead",
      hole: 16,
    });
  });

  it("rejects junk and clamps the hole", () => {
    expect(parseRememberedHole("nope")).toBeNull();
    expect(parseRememberedHole(JSON.stringify({ course: "south", hole: 99 }))).toEqual({
      course: "south",
      hole: 18,
    });
  });
});
