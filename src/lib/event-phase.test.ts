import { describe, expect, it } from "vitest";

import { getEventPhase, phaseMode } from "./event-phase";

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
