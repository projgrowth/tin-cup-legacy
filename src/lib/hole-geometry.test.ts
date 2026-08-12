import { describe, expect, it } from "vitest";

import { getHole } from "@/lib/courses";
import { lineStations, polylineLength } from "@/lib/hole-geometry";

describe("hole-geometry", () => {
  it("places stations along the play line scaled to Black yardage", () => {
    const hole = getHole("south", 1);
    expect(hole).toBeTruthy();
    if (!hole) return;
    expect(hole.yards).toBe(335);
    const stations = lineStations(hole, 50);
    expect(stations.length).toBeGreaterThan(3);
    expect(stations[0].yardsFromTee).toBe(0);
    expect(stations[stations.length - 1].yardsFromTee).toBe(335);
    expect(stations[stations.length - 1].yardsToGreen).toBe(0);
    // Mid station roughly half
    const mid = stations.find((s) => s.yardsFromTee === 150);
    expect(mid).toBeTruthy();
  });

  it("measures polyline length positive for Copperhead H1", () => {
    const hole = getHole("copperhead", 1);
    expect(hole).toBeTruthy();
    if (!hole) return;
    expect(polylineLength(hole.line)).toBeGreaterThan(0);
  });
});
