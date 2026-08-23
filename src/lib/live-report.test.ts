import { describe, expect, it } from "vitest";

import { suggestedOfficialResult, summarizeMatchPlay } from "@/lib/live-report";
import { isOfficialCupResult, isUnofficialLive } from "@/lib/score-access";

describe("live report vs official cup", () => {
  it("keeps running status unofficial until a cup result is locked", () => {
    const live = summarizeMatchPlay(["won", "won", "halved"]);
    expect(live.headline).toBe("2 up");
    expect(isUnofficialLive(live.headline)).toBe(true);
    expect(isOfficialCupResult(live.headline)).toBe(false);
    expect(suggestedOfficialResult(live.up, true, live.closed)).toBeNull();
    const closed = summarizeMatchPlay(Array(16).fill("won") as Array<"won">);
    expect(closed.closed).toBe(true);
    expect(suggestedOfficialResult(closed.up, true, closed.closed)).toBe("strong-mental");
    expect(suggestedOfficialResult(closed.up, false, closed.closed)).toBe("grass-roots");
  });
});
