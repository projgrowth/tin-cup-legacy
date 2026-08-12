import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  AttributionControl,
  type StyleSpecification,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { GeoHole } from "@/lib/geo-courses";
import { holeOverlayCollection } from "@/lib/geo-courses";
import type { LngLat } from "@/lib/geo";

/** Esri World Imagery — attribution required. */
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  name: "Esri World Imagery",
  sources: {
    esri: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "esri-satellite",
      type: "raster",
      source: "esri",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

const OVERLAY_SOURCE = "hole-overlay";

type Props = {
  geo: GeoHole;
  className?: string;
  /** Device position [lon, lat] when GPS is on */
  gpsPoint?: LngLat | null;
  gpsAccuracyM?: number | null;
  onError?: () => void;
};

/**
 * Mobile-first MapLibre satellite hole view with OSM vector overlays.
 * Black scorecard yards stay in the HUD — this map is layout + GPS context.
 */
export function SatelliteHoleMap({
  geo,
  className,
  gpsPoint = null,
  gpsAccuracyM = null,
  onError,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const gpsMarkerRef = useRef<Marker | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Create map once
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = new MapLibreMap({
      container: el,
      style: SATELLITE_STYLE,
      center: geo.green,
      zoom: 16,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      maxPitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      fadeDuration: 0,
    });

    map.addControl(new AttributionControl({ compact: true }), "bottom-left");
    map.addControl(
      new NavigationControl({
        showCompass: false,
        visualizePitch: false,
      }),
      "bottom-right",
    );

    map.on("error", () => {
      onErrorRef.current?.();
    });

    map.once("load", () => {
      ensureOverlayLayers(map);
      applyHole(map, geo);
    });

    mapRef.current = map;

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      gpsMarkerRef.current?.remove();
      gpsMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // Only mount once — hole updates handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hole change → overlays + camera
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const run = () => applyHole(map, geo);
    if (map.isStyleLoaded()) run();
    else map.once("load", run);
  }, [geo]);

  // GPS marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!gpsPoint) {
      gpsMarkerRef.current?.remove();
      gpsMarkerRef.current = null;
      return;
    }

    if (!gpsMarkerRef.current) {
      const node = document.createElement("div");
      node.className = "tc-gps-dot";
      node.innerHTML =
        '<span class="tc-gps-pulse"></span><span class="tc-gps-core"></span>';
      gpsMarkerRef.current = new Marker({ element: node, anchor: "center" })
        .setLngLat(gpsPoint)
        .addTo(map);
    } else {
      gpsMarkerRef.current.setLngLat(gpsPoint);
    }

    // Soft accuracy ring via circle layer source
    const acc = Math.max(8, gpsAccuracyM ?? 20);
    const circle = accuracyPolygon(gpsPoint, acc);
    if (map.getSource("gps-acc")) {
      (map.getSource("gps-acc") as GeoJSONSource).setData(circle);
    } else if (map.isStyleLoaded()) {
      map.addSource("gps-acc", { type: "geojson", data: circle });
      if (!map.getLayer("gps-acc-fill")) {
        map.addLayer({
          id: "gps-acc-fill",
          type: "fill",
          source: "gps-acc",
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.12,
          },
        });
        map.addLayer({
          id: "gps-acc-line",
          type: "line",
          source: "gps-acc",
          paint: {
            "line-color": "#60a5fa",
            "line-width": 1.5,
            "line-opacity": 0.55,
          },
        });
      }
    }
  }, [gpsPoint, gpsAccuracyM]);

  return (
    <div
      ref={containerRef}
      className={`relative size-full min-h-[280px] touch-manipulation ${className ?? ""}`}
      role="img"
      aria-label={`Satellite map of hole ${geo.hole}`}
    />
  );
}

function ensureOverlayLayers(map: MapLibreMap) {
  if (map.getSource(OVERLAY_SOURCE)) return;

  map.addSource(OVERLAY_SOURCE, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addLayer({
    id: "ov-fairway",
    type: "fill",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "fairway"],
    paint: {
      "fill-color": "#3d9a5c",
      "fill-opacity": 0.28,
    },
  });
  map.addLayer({
    id: "ov-fairway-line",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "fairway"],
    paint: {
      "line-color": "#8fd4a4",
      "line-width": 1.2,
      "line-opacity": 0.65,
    },
  });
  map.addLayer({
    id: "ov-tee",
    type: "fill",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "tee"],
    paint: {
      "fill-color": "#4a9b68",
      "fill-opacity": 0.4,
    },
  });
  map.addLayer({
    id: "ov-water",
    type: "fill",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "water"],
    paint: {
      "fill-color": "#2a6fad",
      "fill-opacity": 0.45,
    },
  });
  map.addLayer({
    id: "ov-bunker",
    type: "fill",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "bunker"],
    paint: {
      "fill-color": "#e8d4a0",
      "fill-opacity": 0.55,
    },
  });
  map.addLayer({
    id: "ov-play-glow",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "playLine"],
    paint: {
      "line-color": "#c9a227",
      "line-width": 6,
      "line-opacity": 0.35,
      "line-blur": 2,
    },
  });
  map.addLayer({
    id: "ov-play",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "playLine"],
    paint: {
      "line-color": "#e8c547",
      "line-width": 2.5,
      "line-dasharray": [2, 1.5],
      "line-opacity": 0.95,
    },
  });
  map.addLayer({
    id: "ov-tee-pt",
    type: "circle",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "teePoint"],
    paint: {
      "circle-radius": 7,
      "circle-color": "#f5e6a8",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#1a1a12",
    },
  });
  map.addLayer({
    id: "ov-green-pt",
    type: "circle",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "greenPoint"],
    paint: {
      "circle-radius": 8,
      "circle-color": "#f0e6c0",
      "circle-stroke-width": 2.5,
      "circle-stroke-color": "#c9a227",
    },
  });
}

function applyHole(map: MapLibreMap, geo: GeoHole) {
  ensureOverlayLayers(map);
  const src = map.getSource(OVERLAY_SOURCE) as GeoJSONSource | undefined;
  src?.setData(holeOverlayCollection(geo));

  const [w, s, e, n] = geo.bounds;
  map.fitBounds(
    [
      [w, s],
      [e, n],
    ],
    {
      padding: { top: 48, bottom: 72, left: 28, right: 28 },
      maxZoom: 18.5,
      duration: 450,
    },
  );
}

/** Rough circle polygon for GPS accuracy (meters → deg). */
function accuracyPolygon(
  center: LngLat,
  radiusM: number,
): {
  type: "Feature";
  properties: Record<string, never>;
  geometry: { type: "Polygon"; coordinates: LngLat[][] };
} {
  const [lon, lat] = center;
  const latRad = (lat * Math.PI) / 180;
  const dLat = radiusM / 111_320;
  const dLon = radiusM / (111_320 * Math.cos(latRad));
  const ring: LngLat[] = [];
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    ring.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [ring] },
  };
}

export default SatelliteHoleMap;
