import type { Hole, HoleFeature, HoleFeatureKind } from "@/lib/courses";

/** Stylized extrusion heights — schematic only, not survey elevation. */
export const EXTRUDE_H: Record<HoleFeatureKind, number> = {
  fw: 1.2,
  tee: 2.0,
  gr: 2.4,
  bk: 0.35,
  wa: 0.15,
};

export type LineStation = {
  /** 0..1 along polyline */
  t: number;
  /** Yards from tee using official Black hole yardage (proportional along target line) */
  yardsFromTee: number;
  /** Yards remaining to green along the same line */
  yardsToGreen: number;
  x: number;
  y: number;
};

/** Cumulative length of a polyline in data units. */
export function polylineLength(points: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    len += Math.hypot(x1 - x0, y1 - y0);
  }
  return len;
}

/**
 * Stations along the hole target line, spaced by yard interval.
 * Distances are proportional to official Black `hole.yards` along the schematic line —
 * not a laser measurement off-line.
 */
export function lineStations(
  hole: Hole,
  yardStep = 50,
): LineStation[] {
  const pts = hole.line;
  if (pts.length < 2 || hole.yards <= 0) return [];
  const total = polylineLength(pts);
  if (total <= 0) return [];

  const stations: LineStation[] = [];
  const steps = Math.max(1, Math.floor(hole.yards / yardStep));

  for (let s = 0; s <= steps; s++) {
    const yardsFromTee = Math.min(hole.yards, s * yardStep);
    const t = yardsFromTee / hole.yards;
    const dist = t * total;
    const { x, y } = pointAtDistance(pts, dist);
    stations.push({
      t,
      yardsFromTee,
      yardsToGreen: Math.max(0, hole.yards - yardsFromTee),
      x,
      y,
    });
  }

  // Ensure green end is included
  const last = pts[pts.length - 1];
  const end = stations[stations.length - 1];
  if (!end || end.yardsFromTee < hole.yards - 1) {
    stations.push({
      t: 1,
      yardsFromTee: hole.yards,
      yardsToGreen: 0,
      x: last[0],
      y: last[1],
    });
  }

  return stations;
}

function pointAtDistance(
  pts: [number, number][],
  dist: number,
): { x: number; y: number } {
  let left = dist;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (left <= seg || i === pts.length - 1) {
      const u = seg === 0 ? 0 : Math.min(1, left / seg);
      return { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u };
    }
    left -= seg;
  }
  const last = pts[pts.length - 1];
  return { x: last[0], y: last[1] };
}

/** Center of a polygon (average of vertices) for labels. */
export function polygonCentroid(points: [number, number][]): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const [px, py] of points) {
    x += px;
    y += py;
  }
  return { x: x / points.length, y: y / points.length };
}

/** Paint / extrude order: fairway base → tees → green → water → bunkers on top. */
export const FEATURE_PAINT_ORDER: HoleFeatureKind[] = ["fw", "tee", "gr", "wa", "bk"];

/** Features sorted paint / extrude order (water under green accents). */
export function featuresFor3D(hole: Hole): HoleFeature[] {
  const order: HoleFeatureKind[] = ["fw", "tee", "wa", "bk", "gr"];
  return order.flatMap((k) => hole.f.filter((f) => f.k === k));
}

/**
 * Chaikin corner-cutting for closed rings — display only.
 * Softens coarse OSM silhouettes without inventing new hazards.
 */
export function smoothPolygon(
  points: [number, number][],
  iterations = 2,
): [number, number][] {
  if (points.length < 3) return points.map((p) => [p[0], p[1]] as [number, number]);
  // Drop duplicate closing vertex if present
  let ring = points.slice();
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1] && ring.length > 3) {
    ring = ring.slice(0, -1);
  }
  let pts = ring;
  for (let iter = 0; iter < iterations; iter++) {
    const next: [number, number][] = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % n];
      next.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1]);
      next.push([0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
    }
    pts = next;
  }
  return pts;
}

/** Soften open target-line corners (display only). */
export function smoothOpenPolyline(
  points: [number, number][],
  iterations = 2,
): [number, number][] {
  if (points.length < 3) return points.map((p) => [p[0], p[1]] as [number, number]);
  let pts = points.slice();
  for (let iter = 0; iter < iterations; iter++) {
    if (pts.length < 3) break;
    const next: [number, number][] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      next.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1]);
      next.push([0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

/** Closed SVG path from points (optionally smoothed). */
export function polygonPath(
  points: [number, number][],
  smooth = true,
  iterations = 2,
): string {
  const pts = smooth ? smoothPolygon(points, iterations) : points;
  if (pts.length === 0) return "";
  return `${pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ")} Z`;
}

/**
 * Padded viewBox so features have breathing room.
 * Returns { minX, minY, width, height } for SVG viewBox string.
 */
export function paddedViewBox(
  hole: Hole,
  padRatio = 0.06,
): { minX: number; minY: number; width: number; height: number; viewBox: string } {
  const b = holeBounds(hole);
  const pad = b.span * padRatio;
  const minX = b.minX - pad;
  const minY = b.minY - pad;
  const width = Math.max(1, b.maxX - b.minX + pad * 2);
  const height = Math.max(1, b.maxY - b.minY + pad * 2);
  return {
    minX,
    minY,
    width,
    height,
    viewBox: `${minX.toFixed(2)} ${minY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`,
  };
}

/** Unit tangent at a station along the (raw) target line — for tick orientation. */
export function lineTangentAt(
  points: [number, number][],
  dist: number,
): { tx: number; ty: number; nx: number; ny: number } {
  const total = polylineLength(points);
  if (total <= 0 || points.length < 2) return { tx: 1, ty: 0, nx: 0, ny: -1 };
  let left = Math.min(Math.max(0, dist), total);
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (left <= seg || i === points.length - 1) {
      const len = seg || 1;
      const tx = (x1 - x0) / len;
      const ty = (y1 - y0) / len;
      return { tx, ty, nx: -ty, ny: tx };
    }
    left -= seg;
  }
  return { tx: 1, ty: 0, nx: 0, ny: -1 };
}

/** Normalize hole coordinates so tee is near origin-friendly for camera. */
export function holeBounds(hole: Hole): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  cx: number;
  cy: number;
  span: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const consider = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const f of hole.f) {
    for (const [x, y] of f.p) consider(x, y);
  }
  for (const [x, y] of hole.line) consider(x, y);
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = hole.w;
    maxY = hole.ht;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const span = Math.max(maxX - minX, maxY - minY, 1);
  return { minX, minY, maxX, maxY, cx, cy, span };
}
