import { describe, expect, it } from "vitest";
import {
  advanceRehearsal,
  initialRehearsal,
  rehearsalPassed,
  type RehearsalStep,
} from "./scoring-rehearsal";

describe("scoring rehearsal", () => {
  it("detects a stale second-device revision and ends clean after resolve and undo", () => {
    const steps: RehearsalStep[] = [
      "baseline",
      "offline-a",
      "online-b",
      "conflict",
      "resolve",
      "undo",
    ];
    const final = steps.reduce(advanceRehearsal, initialRehearsal());
    expect(final.completed).toEqual(steps);
    expect(rehearsalPassed(final)).toBe(true);
  });
});
