import { describe, expect, it } from "vitest";

import { bboxContains, haversineYards } from "@/lib/geo";
import { getGeoHole, holeOverlayCollection } from "@/lib/geo-courses";

describe("haversineYards", () => {
  it("returns ~0 for the same point", () => {
    expect(haversineYards([-82.75, 28.11], [-82.75, 28.11])).toBeLessThan(0.5);
  });

  it("measures a short known segment in yards", () => {
    // ~100m north ≈ 109 yards
    const a: [number, number] = [-82.75, 28.11];
    const b: [number, number] = [-82.75, 28.1109];
    const y = haversineYards(a, b);
    expect(y).toBeGreaterThan(90);
    expect(y).toBeLessThan(130);
  });
});

describe("geo package", () => {
  it("loads Copperhead H16 with bounds and play line", () => {
    const h = getGeoHole("copperhead", 16);
    expect(h).toBeTruthy();
    if (!h) return;
    expect(h.blackYards).toBeGreaterThan(300);
    expect(h.playLine.length).toBeGreaterThanOrEqual(2);
    expect(h.bounds).toHaveLength(4);
    expect(h.bounds[2]).toBeGreaterThan(h.bounds[0]);
  });

  it("loads South and Island hole 1", () => {
    expect(getGeoHole("south", 1)?.tee).toHaveLength(2);
    expect(getGeoHole("island", 1)?.green).toHaveLength(2);
  });

  it("builds overlay FeatureCollection", () => {
    const h = getGeoHole("copperhead", 1);
    expect(h).toBeTruthy();
    if (!h) return;
    const fc = holeOverlayCollection(h);
    expect(fc.features.length).toBeGreaterThan(2);
    expect(fc.features.some((f) => f.properties.kind === "playLine")).toBe(true);
  });

  it("bboxContains works", () => {
    const h = getGeoHole("copperhead", 1);
    expect(h).toBeTruthy();
    if (!h) return;
    expect(bboxContains(h.bounds, h.green)).toBe(true);
    expect(bboxContains(h.bounds, [-80, 28])).toBe(false);
  });
});
