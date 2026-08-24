import { useEffect, useImperativeHandle, useRef, forwardRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  type StyleSpecification,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { GeoHole } from "@/lib/geo-courses";
import { greenTarget, theaterOverlayCollection } from "@/lib/geo-courses";
import type { LngLat } from "@/lib/geo";

/** Esri World Imagery — attribution required. */
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  name: "Esri World Imagery",
  // Free glyphs for TEE/PIN/yard labels (MapLibre demo fonts)
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    esri: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri — Esri, Maxar, Earthstar Geographics, GIS User Community",
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
      paint: {
        "raster-fade-duration": 160,
        "raster-saturation": 0.06,
        "raster-contrast": 0.12,
        "raster-brightness-min": 0.02,
      },
    },
  ],
};

const OVERLAY_SOURCE = "hole-overlay-v2";

export type SatelliteHoleMapHandle = {
  resetView: () => void;
  /** Zoom tight on the green / pin for approach. */
  focusGreen: () => void;
};

type Props = {
  geo: GeoHole;
  className?: string;
  gpsPoint?: LngLat | null;
  gpsAccuracyM?: number | null;
  onError?: () => void;
  onReady?: () => void;
};

/**
 * Mobile-first MapLibre satellite hole view.
 * Auto-orients tee→green up the screen; smooth hole transitions.
 */
export const SatelliteHoleMap = forwardRef<SatelliteHoleMapHandle, Props>(function SatelliteHoleMap(
  { geo, className, gpsPoint = null, gpsAccuracyM = null, onError, onReady },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const gpsMarkerRef = useRef<Marker | null>(null);
  const pinMarkerRef = useRef<Marker | null>(null);
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const [ready, setReady] = useState(false);
  const styleFailed = useRef(false);

  useImperativeHandle(ref, () => ({
    resetView: () => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;
      flyToHole(map, geoRef.current, true);
    },
    focusGreen: () => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;
      flyToGreen(map, geoRef.current, true);
    },
  }));

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
      attributionControl: {
        compact: true,
      },
      maxPitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      fadeDuration: 200,
      maxTileCacheSize: 80,
      pixelRatio: Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2),
      // Smoother pan on mobile
      cooperativeGestures: false,
    });

    // Soft fail only on hard style failures (not every missing tile)
    map.on("error", (e) => {
      const msg = String((e as { error?: { message?: string } }).error?.message ?? "");
      if (
        !styleFailed.current &&
        (msg.includes("style") || msg.includes("Failed to fetch") || msg.includes("AJAXError"))
      ) {
        // Only escalate after map never painted
        if (!map.isStyleLoaded()) {
          styleFailed.current = true;
          onErrorRef.current?.();
        }
      }
    });

    map.once("load", () => {
      ensureOverlayLayers(map);
      const src = map.getSource(OVERLAY_SOURCE) as GeoJSONSource | undefined;
      src?.setData(theaterOverlayCollection(geoRef.current));
      ensurePinMarker(map, pinMarkerRef, greenTarget(geoRef.current));
      flyToHole(map, geoRef.current, false);
      setReady(true);
      onReadyRef.current?.();
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
      pinMarkerRef.current?.remove();
      pinMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hole change → smooth camera + overlays + pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const run = () => {
      ensureOverlayLayers(map);
      const src = map.getSource(OVERLAY_SOURCE) as GeoJSONSource | undefined;
      src?.setData(theaterOverlayCollection(geo));
      ensurePinMarker(map, pinMarkerRef, greenTarget(geo));
      flyToHole(map, geo, true);
    };
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
      if (map.getSource("gps-acc")) {
        (map.getSource("gps-acc") as GeoJSONSource).setData({
          type: "FeatureCollection",
          features: [],
        });
      }
      return;
    }

    if (!gpsMarkerRef.current) {
      const node = document.createElement("div");
      node.className = "tc-gps-dot";
      node.innerHTML = '<span class="tc-gps-pulse"></span><span class="tc-gps-core"></span>';
      gpsMarkerRef.current = new Marker({ element: node, anchor: "center" })
        .setLngLat(gpsPoint)
        .addTo(map);
    } else {
      gpsMarkerRef.current.setLngLat(gpsPoint);
    }

    const acc = Math.max(8, Math.min(gpsAccuracyM ?? 20, 80));
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
            "fill-color": "#38bdf8",
            "fill-opacity": 0.14,
          },
        });
        map.addLayer({
          id: "gps-acc-line",
          type: "line",
          source: "gps-acc",
          paint: {
            "line-color": "#7dd3fc",
            "line-width": 1.5,
            "line-opacity": 0.6,
          },
        });
      }
    }
  }, [gpsPoint, gpsAccuracyM]);

  return (
    <div className={`relative size-full min-h-[280px] touch-manipulation ${className ?? ""}`}>
      <div
        ref={containerRef}
        className={`size-full transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
        role="img"
        aria-label={`Satellite map of hole ${geo.hole}`}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,oklch(0.05_0.02_160/58%)_78%,oklch(0.04_0.02_160/82%)_100%)]"
      />
      {!ready && <div className="absolute inset-0 bg-[#0a100c]" aria-hidden />}
    </div>
  );
});

export default SatelliteHoleMap;

function flyToHole(map: MapLibreMap, geo: GeoHole, animate: boolean) {
  const pts = [...geo.playLine, geo.tee, geo.green];
  for (const ring of geo.fairways) pts.push(...ring);
  for (const ring of geo.greens ?? []) pts.push(...ring);
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const [lon, lat] of pts) {
    if (lon < w) w = lon;
    if (lon > e) e = lon;
    if (lat < s) s = lat;
    if (lat > n) n = lat;
  }
  map.fitBounds(
    [
      [w, s],
      [e, n],
    ],
    {
      padding: { top: 72, bottom: 140, left: 36, right: 36 },
      maxZoom: 18.4,
      bearing: 0,
      pitch: 0,
      duration: animate ? 420 : 0,
      essential: true,
    },
  );
}

/** Tight approach view on the putting surface / pin. */
function flyToGreen(map: MapLibreMap, geo: GeoHole, animate: boolean) {
  const center = greenTarget(geo);
  map.easeTo({
    center,
    zoom: 18.35,
    bearing: 0,
    pitch: 0,
    duration: animate ? 520 : 0,
    essential: true,
  });
}

function ensurePinMarker(map: MapLibreMap, pinRef: { current: Marker | null }, pin: LngLat) {
  if (!pinRef.current) {
    const node = document.createElement("div");
    node.className = "tc-pin-flag";
    node.setAttribute("aria-hidden", "true");
    node.innerHTML =
      '<span class="tc-pin-pole"></span><span class="tc-pin-cloth"></span><span class="tc-pin-cup"></span>';
    pinRef.current = new Marker({ element: node, anchor: "bottom" }).setLngLat(pin).addTo(map);
  } else {
    pinRef.current.setLngLat(pin);
  }
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
    paint: { "fill-color": "#22c55e", "fill-opacity": 0.28 },
  });
  map.addLayer({
    id: "ov-fairway-line",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "fairway"],
    paint: { "line-color": "#bbf7d0", "line-width": 1.8, "line-opacity": 0.7 },
  });
  map.addLayer({
    id: "ov-tee",
    type: "fill",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "tee"],
    paint: { "fill-color": "#86efac", "fill-opacity": 0.4 },
  });
  map.addLayer({
    id: "ov-green",
    type: "fill",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "green"],
    paint: { "fill-color": "#4ade80", "fill-opacity": 0.38 },
  });
  map.addLayer({
    id: "ov-green-line",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "green"],
    paint: { "line-color": "#dcfce7", "line-width": 1.6, "line-opacity": 0.8 },
  });
  map.addLayer({
    id: "ov-water",
    type: "fill",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "water"],
    paint: { "fill-color": "#38bdf8", "fill-opacity": 0.28 },
  });
  map.addLayer({
    id: "ov-bunker",
    type: "fill",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "bunker"],
    paint: { "fill-color": "#fde68a", "fill-opacity": 0.32 },
  });

  map.addLayer({
    id: "ov-play-glow",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "playLine"],
    paint: {
      "line-color": "#0c4a6e",
      "line-width": 7,
      "line-opacity": 0.45,
      "line-blur": 1.2,
    },
    layout: { "line-cap": "round", "line-join": "round" },
  });
  map.addLayer({
    id: "ov-play",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "playLine"],
    paint: {
      "line-color": "#38bdf8",
      "line-width": 2.6,
      "line-opacity": 0.95,
    },
    layout: { "line-cap": "round", "line-join": "round" },
  });
  map.addLayer({
    id: "ov-pill",
    type: "circle",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "pill"],
    paint: {
      "circle-radius": 13,
      "circle-color": "#0b1220",
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#38bdf8",
      "circle-opacity": 0.92,
    },
  });
  map.addLayer({
    id: "ov-pill-label",
    type: "symbol",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "pill"],
    layout: {
      "text-field": ["get", "label"],
      "text-size": 11,
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#f8fafc",
      "text-halo-color": "rgba(11,18,32,0.85)",
      "text-halo-width": 0.6,
    },
  });
}

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
