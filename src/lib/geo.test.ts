import { describe, expect, it } from "vitest";

import {
  bboxContains,
  bearingDegrees,
  greenApproachPoints,
  haversineYards,
  holeFrameBounds,
  pointAlongLine,
} from "@/lib/geo";
import {
  getGeoHole,
  greenTarget,
  holeGreenTriple,
  holeOverlayCollection,
  holePlayBearing,
  spotlightMask,
} from "@/lib/geo-courses";
import { COURSE_ORDER, getCourse } from "@/lib/courses";

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

describe("bearing + frame", () => {
  it("bearing north is ~0", () => {
    const b = bearingDegrees([-82.75, 28.11], [-82.75, 28.12]);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(5);
  });

  it("holeFrameBounds pads and enforces min span", () => {
    const bb = holeFrameBounds(
      [
        [-82.75, 28.11],
        [-82.7501, 28.1101],
      ],
      { minSpanM: 140, padRatio: 0.2 },
    );
    expect(bb[2] - bb[0]).toBeGreaterThan(0.0005);
    expect(bb[3] - bb[1]).toBeGreaterThan(0.0005);
  });

  it("pointAlongLine hits endpoints", () => {
    const line: [number, number][] = [
      [-82.75, 28.11],
      [-82.74, 28.12],
    ];
    expect(pointAlongLine(line, 0)).toEqual(line[0]);
    const end = pointAlongLine(line, 1);
    expect(end?.[0]).toBeCloseTo(line[1][0], 5);
  });
});

describe("geo package — all holes", () => {
  it("has 18 geo holes per tournament course with valid frames", () => {
    for (const cid of COURSE_ORDER) {
      const scorecard = getCourse(cid);
      for (const hole of scorecard.holes) {
        const g = getGeoHole(cid, hole.h);
        expect(g, `${cid} H${hole.h}`).toBeTruthy();
        if (!g) continue;
        expect(g.playLine.length).toBeGreaterThanOrEqual(2);
        expect(g.bounds[2]).toBeGreaterThan(g.bounds[0]);
        expect(g.bounds[3]).toBeGreaterThan(g.bounds[1]);
        expect(g.blackYards).toBe(hole.yards);
        expect(Number.isFinite(holePlayBearing(g))).toBe(true);
        expect(bboxContains(g.bounds, g.tee, 0.002)).toBe(true);
        expect(bboxContains(g.bounds, g.green, 0.002)).toBe(true);
      }
    }
  });

  it("builds overlay FeatureCollection with play line", () => {
    const h = getGeoHole("copperhead", 1);
    expect(h).toBeTruthy();
    if (!h) return;
    const fc = holeOverlayCollection(h);
    expect(fc.features.length).toBeGreaterThan(2);
    expect(fc.features.some((f) => f.properties.kind === "playLine")).toBe(true);
    expect(fc.features.some((f) => f.properties.kind === "spotlight")).toBe(true);
    const mask = spotlightMask(h);
    expect(mask).toBeTruthy();
    expect(mask!.length).toBeGreaterThan(1);
  });

  it("resolves greenTarget near OSM green when present", () => {
    const h = getGeoHole("copperhead", 16);
    expect(h).toBeTruthy();
    if (!h) return;
    const pin = greenTarget(h);
    expect(pin).toHaveLength(2);
    // pin should be close to stored green endpoint
    expect(Math.abs(pin[0] - h.green[0])).toBeLessThan(0.003);
    expect(Math.abs(pin[1] - h.green[1])).toBeLessThan(0.003);
  });

  it("has green polygons on most holes", () => {
    let withGreen = 0;
    for (const cid of COURSE_ORDER) {
      for (let n = 1; n <= 18; n++) {
        const g = getGeoHole(cid, n);
        if (g?.greens && g.greens.length > 0) withGreen += 1;
      }
    }
    expect(withGreen).toBeGreaterThanOrEqual(50);
  });

  it("builds F/C/B with center near Black yardage", () => {
    const g = getGeoHole("copperhead", 1);
    expect(g).toBeTruthy();
    if (!g) return;
    const t = holeGreenTriple(g);
    expect(t.yardsFromTee.center).toBe(g.blackYards);
    expect(t.yardsFromTee.front).toBeLessThan(t.yardsFromTee.center);
    expect(t.yardsFromTee.back).toBeGreaterThan(t.yardsFromTee.center);
    expect(t.front).toHaveLength(2);
    expect(t.back).toHaveLength(2);
  });
});

describe("greenApproachPoints", () => {
  it("keeps front before center along a simple line", () => {
    const line: [number, number][] = [
      [-82.75, 28.1],
      [-82.75, 28.11],
    ];
    const t = greenApproachPoints({
      playLine: line,
      blackYards: 400,
      green: [-82.75, 28.11],
      center: [-82.75, 28.11],
    });
    expect(t.yardsFromTee.front).toBeLessThan(400);
    expect(t.yardsFromTee.center).toBe(400);
  });
});
