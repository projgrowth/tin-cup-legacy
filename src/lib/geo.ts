/** WGS84 helpers for satellite Scout — not survey instruments. */

export type LngLat = [number, number]; // [lon, lat]
export type BBox = [number, number, number, number]; // west, south, east, north

const EARTH_M = 6_371_000;
const YARDS_PER_M = 1.0936133;

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
