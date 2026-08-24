import { describe, expect, it } from "vitest";

import { getEventPhase, liveScorecardOpen, phaseMode } from "./event-phase";

describe("event phase", () => {
  it("selects the preparation experience before the first tee", () => {
    expect(getEventPhase(new Date("2026-08-28T12:18:59-04:00").getTime())).toBe("before");
  });

  it("keeps the live experience active through Sunday night", () => {
    expect(getEventPhase(new Date("2026-08-28T12:19:00-04:00").getTime())).toBe("live");
    expect(getEventPhase(new Date("2026-08-30T23:59:59-04:00").getTime())).toBe("live");
  });

  it("selects the legacy experience after the tournament", () => {
    expect(getEventPhase(new Date("2026-08-31T00:00:00-04:00").getTime())).toBe("after");
    expect(phaseMode("after")).toBe("post");
  });
});

describe("live scorecard gate", () => {
  const beforeTee = new Date("2026-08-28T12:18:59-04:00").getTime();
  const afterTee = new Date("2026-08-28T12:19:00-04:00").getTime();

  it("stays closed before Friday first tee", () => {
    expect(liveScorecardOpen({ now: beforeTee })).toBe(false);
  });

  it("opens at first tee or when a match is already live", () => {
    expect(liveScorecardOpen({ now: afterTee })).toBe(true);
    expect(liveScorecardOpen({ now: beforeTee, sessionLive: true })).toBe(true);
  });

  it("opens when unofficial reports or an official result exist", () => {
    expect(liveScorecardOpen({ now: beforeTee, hasReports: true })).toBe(true);
    expect(liveScorecardOpen({ now: beforeTee, result: "strong-mental" })).toBe(true);
    expect(liveScorecardOpen({ now: beforeTee, result: "pending" })).toBe(false);
  });
});
