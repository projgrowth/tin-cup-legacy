/** WGS84 helpers for satellite Scout — not survey instruments. */

export type LngLat = [number, number]; // [lon, lat]
export type BBox = [number, number, number, number]; // west, south, east, north

const EARTH_M = 6_371_000;
const YARDS_PER_M = 1.0936133;
/** Rough meters per degree of latitude. */
const M_PER_DEG_LAT = 111_320;

/** Great-circle distance in yards between two lon/lat points. */
export function haversineYards(a: LngLat, b: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const s =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const m = 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(s)));
  return m * YARDS_PER_M;
}

export function bboxContains(bbox: BBox, point: LngLat, pad = 0): boolean {
  const [w, s, e, n] = bbox;
  const [lon, lat] = point;
  return lon >= w - pad && lon <= e + pad && lat >= s - pad && lat <= n + pad;
}

export function bboxCenter(bbox: BBox): LngLat {
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
}

/**
 * Compass bearing (degrees clockwise from north) from A → B.
 * Used to rotate the satellite map so the hole plays “up” the screen.
 */
export function bearingDegrees(from: LngLat, to: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lon1, lat1] = from;
  const [lon2, lat2] = to;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * Comfortable camera frame for a hole: play line + tee/green, padded,
 * with a minimum span so short par-3s don’t zoom in uncomfortably.
 */
export function holeFrameBounds(
  points: LngLat[],
  opts?: { padRatio?: number; minSpanM?: number },
): BBox {
  const padRatio = opts?.padRatio ?? 0.22;
  const minSpanM = opts?.minSpanM ?? 140;
  if (points.length === 0) return [-82.76, 28.1, -82.74, 28.12];

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of points) {
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  }

  const midLat = (minLat + maxLat) / 2;
  const mPerDegLon = M_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180);
  let spanLonM = Math.max(1, (maxLon - minLon) * mPerDegLon);
  let spanLatM = Math.max(1, (maxLat - minLat) * M_PER_DEG_LAT);

  // Minimum readable frame on phone
  if (spanLonM < minSpanM) {
    const extra = ((minSpanM - spanLonM) / 2) / mPerDegLon;
    minLon -= extra;
    maxLon += extra;
    spanLonM = minSpanM;
  }
  if (spanLatM < minSpanM) {
    const extra = ((minSpanM - spanLatM) / 2) / M_PER_DEG_LAT;
    minLat -= extra;
    maxLat += extra;
    spanLatM = minSpanM;
  }

  const padLon = ((maxLon - minLon) * padRatio) / 2;
  const padLat = ((maxLat - minLat) * padRatio) / 2;
  return [minLon - padLon, minLat - padLat, maxLon + padLon, maxLat + padLat];
}

/** Points along a polyline at fractions of total length (0..1). */
export function pointAlongLine(line: LngLat[], t: number): LngLat | null {
  if (line.length < 2) return line[0] ?? null;
  // Approximate with haversine segments
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < line.length; i++) {
    const d = haversineYards(line[i - 1]!, line[i]!);
    segs.push(d);
    total += d;
  }
  if (total <= 0) return line[0]!;
  let left = Math.min(1, Math.max(0, t)) * total;
  for (let i = 1; i < line.length; i++) {
    const seg = segs[i - 1]!;
    if (left <= seg || i === line.length - 1) {
      const u = seg === 0 ? 0 : Math.min(1, left / seg);
      const [x0, y0] = line[i - 1]!;
      const [x1, y1] = line[i]!;
      return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u];
    }
    left -= seg;
  }
  return line[line.length - 1]!;
}

/** Push past a point along the last play-line segment (~yards at Black scale). */
export function extendAlongLine(
  line: LngLat[],
  from: LngLat,
  yards: number,
  blackYards: number,
): LngLat {
  if (line.length < 2 || blackYards <= 0) return from;
  const a = line[line.length - 2]!;
  const b = line[line.length - 1]!;
  const segYd = Math.max(1, haversineYards(a, b));
  const u = yards / segYd;
  return [from[0] + (b[0] - a[0]) * u, from[1] + (b[1] - a[1]) * u];
}

/**
 * Front / center / back of green for Grint-style approach stack.
 * Schematic: along play line scaled to Black yardage — not survey topo.
 */
export type GreenTriple = {
  front: LngLat;
  center: LngLat;
  back: LngLat;
  /** Official-style Black distances from tee (schematic depth of green ~26 yd). */
  yardsFromTee: { front: number; center: number; back: number };
};

export function greenApproachPoints(input: {
  playLine: LngLat[];
  blackYards: number;
  green: LngLat;
  /** Precomputed center (e.g. green poly centroid). */
  center?: LngLat;
}): GreenTriple {
  const black = Math.max(1, input.blackYards);
  const center = input.center ?? input.green;
  const depthFront = Math.min(18, Math.max(10, Math.round(black * 0.04)));
  const depthBack = Math.min(14, Math.max(8, Math.round(black * 0.03)));
  const frontYd = Math.max(1, black - depthFront);
  const backYd = black + depthBack;

  const front =
    pointAlongLine(input.playLine, frontYd / black) ??
    extendAlongLine(input.playLine, center, -depthFront, black);
  const back = extendAlongLine(input.playLine, center, depthBack, black);

  return {
    front,
    center,
    back,
    yardsFromTee: {
      front: frontYd,
      center: black,
      back: backYd,
    },
  };
}

/** Centroid of a ring (optional closing vertex ignored). */
export function ringCentroid(ring: LngLat[]): LngLat | null {
  if (ring.length < 3) return null;
  let x = 0;
  let y = 0;
  let n = 0;
  for (const [lon, lat] of ring) {
    if (n > 0 && lon === ring[0]![0] && lat === ring[0]![1]) continue;
    x += lon;
    y += lat;
    n += 1;
  }
  if (n === 0) return null;
  return [x / n, y / n];
}
