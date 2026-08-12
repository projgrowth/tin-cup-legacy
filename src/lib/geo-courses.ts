import geoData from "@/data/geo/innisbrook-geo.json";
import type { CourseId } from "@/lib/courses";
import {
  bearingDegrees,
  holeFrameBounds,
  pointAlongLine,
  type BBox,
  type LngLat,
} from "@/lib/geo";

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
    padRatio: 0.2,
    minSpanM: raw.par === 3 ? 120 : 160,
  });
  return { ...raw, bounds };
}

/** Bearing so the hole plays toward the top of the screen. */
export function holePlayBearing(geo: GeoHole): number {
  return bearingDegrees(geo.tee, geo.green);
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
  if (geo.playLine.length >= 2) {
    features.push({
      type: "Feature",
      properties: { kind: "playLine" },
      geometry: { type: "LineString", coordinates: geo.playLine },
    });

    // Mid-line guide ticks (proportional to Black yards — not laser)
    if (geo.blackYards >= 200) {
      for (const yards of [100, 150, 200, 250, 300]) {
        if (yards >= geo.blackYards - 40) continue;
        const t = yards / geo.blackYards;
        const pt = pointAlongLine(geo.playLine, t);
        if (!pt) continue;
        features.push({
          type: "Feature",
          properties: { kind: "station", label: String(yards) },
          geometry: { type: "Point", coordinates: pt },
        });
      }
    }
  }
  features.push({
    type: "Feature",
    properties: { kind: "teePoint", label: "TEE" },
    geometry: { type: "Point", coordinates: geo.tee },
  });
  features.push({
    type: "Feature",
    properties: { kind: "greenPoint", label: "PIN" },
    geometry: { type: "Point", coordinates: geo.green },
  });

  return { type: "FeatureCollection", features };
}
