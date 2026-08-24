import { describe, expect, it } from "vitest";

import { COURSE_ORDER, getCourse, getHole } from "@/lib/courses";
import {
  lineStations,
  orientedHole,
  paddedViewBox,
  polylineLength,
  portraitYardageFrame,
  PORTRAIT_MIN_ASPECT,
  smoothOpenPolyline,
  smoothPolygon,
} from "@/lib/hole-geometry";

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
    const mid = stations.find((s) => s.yardsFromTee === 150);
    expect(mid).toBeTruthy();
  });

  it("measures polyline length positive for Copperhead H1", () => {
    const hole = getHole("copperhead", 1);
    expect(hole).toBeTruthy();
    if (!hole) return;
    expect(polylineLength(hole.line)).toBeGreaterThan(0);
  });

  it("smoothPolygon densifies a coarse square without leaving the bbox much", () => {
    const sq: [number, number][] = [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ];
    const out = smoothPolygon(sq, 2);
    expect(out.length).toBeGreaterThan(sq.length);
    for (const [x, y] of out) {
      expect(x).toBeGreaterThanOrEqual(-1);
      expect(x).toBeLessThanOrEqual(101);
      expect(y).toBeGreaterThanOrEqual(-1);
      expect(y).toBeLessThanOrEqual(101);
    }
  });

  it("smoothOpenPolyline keeps endpoints fixed", () => {
    const line: [number, number][] = [
      [0, 0],
      [50, 40],
      [100, 0],
    ];
    const out = smoothOpenPolyline(line, 2);
    expect(out[0]).toEqual([0, 0]);
    expect(out[out.length - 1]).toEqual([100, 0]);
    expect(out.length).toBeGreaterThan(line.length);
  });

  it("paddedViewBox expands bounds for South H1", () => {
    const hole = getHole("south", 1);
    expect(hole).toBeTruthy();
    if (!hole) return;
    const vb = paddedViewBox(hole, 0.06);
    expect(vb.width).toBeGreaterThan(0);
    expect(vb.height).toBeGreaterThan(0);
    expect(vb.viewBox.split(" ").length).toBe(4);
  });

  it("orients every hole tee-at-bottom green-at-top in SVG space", () => {
    for (const id of COURSE_ORDER) {
      for (const hole of getCourse(id).holes) {
        const o = orientedHole(hole);
        const tee = o.line[0];
        const green = o.line[o.line.length - 1];
        expect(tee && green).toBeTruthy();
        if (!tee || !green) continue;
        expect(tee[1]).toBeGreaterThan(green[1]);
        const frame = portraitYardageFrame(hole);
        expect(frame.height / frame.width).toBeGreaterThanOrEqual(PORTRAIT_MIN_ASPECT - 0.001);
      }
    }
  });
});
