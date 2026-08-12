import geoData from "@/data/geo/innisbrook-geo.json";
import type { CourseId } from "@/lib/courses";
import type { BBox, LngLat } from "@/lib/geo";

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

export function getGeoHole(courseId: CourseId, hole: number): GeoHole | null {
  const course = getGeoCourse(courseId);
  if (!course) return null;
  return course.holes.find((h) => h.hole === hole) ?? null;
}

export type OverlayFeature = {
  type: "Feature";
  properties: { kind: string };
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
  }
  features.push({
    type: "Feature",
    properties: { kind: "teePoint" },
    geometry: { type: "Point", coordinates: geo.tee },
  });
  features.push({
    type: "Feature",
    properties: { kind: "greenPoint" },
    geometry: { type: "Point", coordinates: geo.green },
  });

  return { type: "FeatureCollection", features };
}
