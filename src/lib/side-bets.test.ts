import { describe, expect, it } from "vitest";

import {
  isCtp,
  isLongDrive,
  normalizeSideBetKind,
  sideBetKindLabel,
  sideBetShortLabel,
} from "./side-bets";

describe("side bet kinds", () => {
  it("accepts the DB seed kind `ld` and the legacy UI kind `long-drive`", () => {
    expect(isLongDrive("ld")).toBe(true);
    expect(isLongDrive("long-drive")).toBe(true);
    expect(isLongDrive("ctp")).toBe(false);
  });

  it("labels kinds for the board and roster badges", () => {
    expect(sideBetKindLabel("ld")).toBe("Long Drive");
    expect(sideBetKindLabel("long-drive")).toBe("Long Drive");
    expect(sideBetKindLabel("ctp")).toBe("Closest to the Pin");
    expect(sideBetShortLabel("ld")).toBe("Long Drive");
    expect(sideBetShortLabel("ctp")).toBe("CTP");
  });

  it("normalizes to DB canonical kinds", () => {
    expect(normalizeSideBetKind("long-drive")).toBe("ld");
    expect(normalizeSideBetKind("ld")).toBe("ld");
    expect(normalizeSideBetKind("ctp")).toBe("ctp");
    expect(isCtp("ctp")).toBe(true);
  });
});
