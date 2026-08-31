import { describe, expect, it } from "vitest";

import { boardMode, getEventPhase, phaseMode } from "./event-phase";

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

  it("keeps the live board up while Cup points are still open", () => {
    const monday = new Date("2026-08-31T10:00:00-04:00").getTime();
    expect(boardMode(8, monday)).toBe("live");
    expect(boardMode(8, monday, true)).toBe("live");
    expect(boardMode(0, monday)).toBe("post");
  });

  it("does not jump to live before the first tee just because matches are pending", () => {
    expect(boardMode(26, new Date("2026-08-27T12:00:00-04:00").getTime())).toBe("pre");
  });
});
