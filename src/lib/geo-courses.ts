import geoData from "@/data/geo/innisbrook-geo.json";
import type { CourseId } from "@/lib/courses";
import {
  bearingDegrees,
  greenApproachPoints,
  holeFrameBounds,
  pointAlongLine,
  ringCentroid,
  type BBox,
  type GreenTriple,
  type LngLat,
} from "@/lib/geo";

export type { GreenTriple };

export type GeoHole = {
  hole: number;
  par: number;
  blackYards: number;
  name: string | null;
  /** [west, south, east, north] */
  bounds: BBox;
  tee: LngLat;
  green: LngLat;
  playLine: LngLat[];
  fairways: LngLat[][];
  bunkers: LngLat[][];
  tees: LngLat[][];
  water: LngLat[][];
  /** OSM green polygons when present */
  greens?: LngLat[][];
};

export type GeoCourse = {
  id: CourseId;
  holes: GeoHole[];
  holeCount: number;
  bounds: BBox | null;
  source?: string;
};

type GeoPackage = Record<string, GeoCourse>;

const packageData = geoData as unknown as GeoPackage;

export function getGeoCourse(courseId: CourseId): GeoCourse | null {
  return packageData[courseId] ?? null;
}

/**
 * Hole geo with a normalized camera frame (comfortable padding + min span).
 * Raw JSON bounds are replaced so every hole frames smoothly on phone.
 */
export function getGeoHole(courseId: CourseId, hole: number): GeoHole | null {
  const course = getGeoCourse(courseId);
  if (!course) return null;
  const raw = course.holes.find((h) => h.hole === hole);
  if (!raw) return null;
  return normalizeGeoHole(raw);
}

/** Comfortable frame + play bearing (tee → green) for map camera. */
export function normalizeGeoHole(raw: GeoHole): GeoHole {
  const pts: LngLat[] = [...raw.playLine, raw.tee, raw.green];
  for (const ring of raw.fairways) pts.push(...ring);
  // Cap bunker influence so a distant mis-tagged bunker doesn’t blow the frame
  for (const ring of raw.bunkers.slice(0, 12)) {
    if (ring[0]) pts.push(ring[0]);
  }
  const bounds = holeFrameBounds(pts, {
    // Looser frame so tee→green reads as a full hole on phone
    padRatio: 0.32,
    minSpanM: raw.par === 3 ? 160 : 220,
  });
  return { ...raw, bounds };
}

/** Bearing so the hole plays toward the top of the screen. */
export function holePlayBearing(geo: GeoHole): number {
  return bearingDegrees(geo.tee, greenTarget(geo));
}

/** Prefer OSM green centroid as pin when available; else line endpoint. */
export function greenTarget(geo: GeoHole): LngLat {
  const ring = geo.greens?.[0];
  if (ring) {
    const c = ringCentroid(ring);
    if (c) return c;
  }
  return geo.green;
}

/** F/C/B approach points for distance widget + map markers. */
export function holeGreenTriple(geo: GeoHole): GreenTriple {
  return greenApproachPoints({
    playLine: geo.playLine,
    blackYards: geo.blackYards,
    green: geo.green,
    center: greenTarget(geo),
  });
}

export type OverlayFeature = {
  type: "Feature";
  properties: { kind: string; label?: string };
  geometry:
    | { type: "Polygon"; coordinates: LngLat[][] }
    | { type: "LineString"; coordinates: LngLat[] }
    | { type: "Point"; coordinates: LngLat };
};

export type OverlayCollection = {
  type: "FeatureCollection";
  features: OverlayFeature[];
};

/** GeoJSON FeatureCollection for MapLibre vector overlays on one hole. */
export function holeOverlayCollection(geo: GeoHole): OverlayCollection {
  const features: OverlayFeature[] = [];

  for (const ring of geo.fairways) {
    features.push({
      type: "Feature",
      properties: { kind: "fairway" },
      geometry: { type: "Polygon", coordinates: [ring] },
    });
  }
  for (const ring of geo.tees) {
    features.push({
      type: "Feature",
      properties: { kind: "tee" },
      geometry: { type: "Polygon", coordinates: [ring] },
    });
  }
  for (const ring of geo.greens ?? []) {
    features.push({
      type: "Feature",
      properties: { kind: "green" },
      geometry: { type: "Polygon", coordinates: [ring] },
    });
  }
  for (const ring of geo.water) {
    features.push({
      type: "Feature",
      properties: { kind: "water" },
      geometry: { type: "Polygon", coordinates: [ring] },
    });
  }
  for (const ring of geo.bunkers) {
    features.push({
      type: "Feature",
      properties: { kind: "bunker" },
      geometry: { type: "Polygon", coordinates: [ring] },
    });
  }
  const spotlight = spotlightMask(geo);
  if (spotlight) {
    features.push({
      type: "Feature",
      properties: { kind: "spotlight" },
      geometry: { type: "Polygon", coordinates: spotlight },
    });
  }

  if (geo.playLine.length >= 2) {
    features.push({
      type: "Feature",
      properties: { kind: "playLine" },
      geometry: { type: "LineString", coordinates: geo.playLine },
    });

    // Layup markers (Grint-style) — Black-proportional
    if (geo.blackYards >= 220) {
      for (const yards of [100, 150, 200, 250]) {
        if (yards >= geo.blackYards - 45) continue;
        const pt = pointAlongLine(geo.playLine, yards / geo.blackYards);
        if (!pt) continue;
        features.push({
          type: "Feature",
          properties: { kind: "station", label: String(yards) },
          geometry: { type: "Point", coordinates: pt },
        });
      }
    }
  }

  // Hazard dots at centroids (readable on aerial without muddy fills)
  for (const ring of geo.bunkers.slice(0, 10)) {
    const c = ringCentroid(ring);
    if (!c) continue;
    features.push({
      type: "Feature",
      properties: { kind: "hazard", label: "S" },
      geometry: { type: "Point", coordinates: c },
    });
  }
  for (const ring of geo.water.slice(0, 6)) {
    const c = ringCentroid(ring);
    if (!c) continue;
    features.push({
      type: "Feature",
      properties: { kind: "hazardWater", label: "W" },
      geometry: { type: "Point", coordinates: c },
    });
  }

  const triple = holeGreenTriple(geo);
  features.push({
    type: "Feature",
    properties: { kind: "greenFront", label: "F" },
    geometry: { type: "Point", coordinates: triple.front },
  });
  features.push({
    type: "Feature",
    properties: { kind: "greenBack", label: "B" },
    geometry: { type: "Point", coordinates: triple.back },
  });

  features.push({
    type: "Feature",
    properties: { kind: "teePoint", label: "TEE" },
    geometry: { type: "Point", coordinates: geo.tee },
  });
  features.push({
    type: "Feature",
    properties: { kind: "greenPoint", label: "PIN" },
    geometry: { type: "Point", coordinates: triple.center },
  });

  return { type: "FeatureCollection", features };
}

/**
 * Hole theater — play line + 2 remaining-yard pills. No GIS fills.
 */
export function theaterOverlayCollection(geo: GeoHole): OverlayCollection {
  const line = geo.playLine.length >= 2 ? geo.playLine : [geo.tee, geo.green];
  const features: OverlayFeature[] = [
    {
      type: "Feature",
      properties: { kind: "playLine" },
      geometry: { type: "LineString", coordinates: line },
    },
  ];
  const yards = Math.max(1, geo.blackYards);
  const fromTee: number[] = [];
  if (yards >= 330) fromTee.push(Math.round(yards * 0.4));
  if (yards >= 220) fromTee.push(Math.round(yards * 0.68));
  else fromTee.push(Math.round(yards * 0.55));
  for (const carry of fromTee) {
    const pt = pointAlongLine(line, carry / yards);
    if (!pt) continue;
    features.push({
      type: "Feature",
      properties: { kind: "pill", label: String(Math.max(1, yards - carry)) },
      geometry: { type: "Point", coordinates: pt },
    });
  }
  return { type: "FeatureCollection", features };
}

function closeRing(ring: LngLat[]): LngLat[] {
  if (ring.length < 3) return ring;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

/** Positive = counter-clockwise in lon/lat. */
function ringArea(ring: LngLat[]): number {
  const pts = closeRing(ring);
  let area = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[i + 1]!;
    area += x0 * y1 - x1 * y0;
  }
  return area / 2;
}

function windRing(ring: LngLat[], clockwise: boolean): LngLat[] {
  const closed = closeRing(ring);
  if (closed.length < 4) return closed;
  const isCw = ringArea(closed) < 0;
  return isCw === clockwise ? closed : [...closed].reverse();
}

/**
 * Outer frame minus mapped fairway / green / tee — spotlight the real turf.
 * Never invents a corridor; holes with no polygons get no mask.
 */
export function spotlightMask(geo: GeoHole): LngLat[][] | null {
  const cuts = [...geo.fairways, ...(geo.greens ?? []), ...geo.tees].filter(
    (ring) => ring.length >= 3,
  );
  if (cuts.length === 0) return null;
  const [w, s, e, n] = geo.bounds;
  const padLon = (e - w) * 0.18;
  const padLat = (n - s) * 0.18;
  const outer = windRing(
    [
      [w - padLon, s - padLat],
      [e + padLon, s - padLat],
      [e + padLon, n + padLat],
      [w - padLon, n + padLat],
    ],
    false,
  );
  return [outer, ...cuts.map((ring) => windRing(ring, true))];
}
