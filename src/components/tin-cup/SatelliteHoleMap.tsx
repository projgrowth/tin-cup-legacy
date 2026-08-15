import { useEffect, useImperativeHandle, useRef, forwardRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  type StyleSpecification,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { GeoHole } from "@/lib/geo-courses";
import { greenTarget, holeOverlayCollection, holePlayBearing } from "@/lib/geo-courses";
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

const OVERLAY_SOURCE = "hole-overlay";

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
  const teeMarkerRef = useRef<Marker | null>(null);
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
      bearing: holePlayBearing(geo),
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
      teeMarkerRef.current?.remove();
      teeMarkerRef.current = null;
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
      src?.setData(holeOverlayCollection(geo));
      ensurePinMarker(map, pinMarkerRef, greenTarget(geo));
      ensureTeeMarker(map, teeMarkerRef, geo.tee);
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
      {!ready && <div className="absolute inset-0 bg-[#0a100c]" aria-hidden />}
    </div>
  );
});

export default SatelliteHoleMap;

function flyToHole(map: MapLibreMap, geo: GeoHole, animate: boolean) {
  const [w, s, e, n] = geo.bounds;
  const bearing = holePlayBearing(geo);
  map.fitBounds(
    [
      [w, s],
      [e, n],
    ],
    {
      padding: { top: 88, bottom: 88, left: 48, right: 48 },
      maxZoom: 17.4,
      bearing,
      pitch: 0,
      duration: animate ? 450 : 0,
      essential: true,
    },
  );
}

/** Tight approach view on the putting surface / pin. */
function flyToGreen(map: MapLibreMap, geo: GeoHole, animate: boolean) {
  const center = greenTarget(geo);
  const bearing = holePlayBearing(geo);
  map.easeTo({
    center,
    zoom: 18.35,
    bearing,
    pitch: 0,
    duration: animate ? 520 : 0,
    essential: true,
  });
}

function ensureTeeMarker(map: MapLibreMap, teeRef: { current: Marker | null }, tee: LngLat) {
  if (!teeRef.current) {
    const node = document.createElement("div");
    node.className = "tc-tee-chip";
    node.setAttribute("aria-hidden", "true");
    node.textContent = "TEE";
    teeRef.current = new Marker({ element: node, anchor: "center" }).setLngLat(tee).addTo(map);
  } else {
    teeRef.current.setLngLat(tee);
  }
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

  // Dim everything outside mapped fairway / green / tee
  map.addLayer({
    id: "ov-spotlight",
    type: "fill",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "spotlight"],
    paint: {
      "fill-color": "#050806",
      "fill-opacity": 0.58,
    },
  });

  // Soft collar only — aerial stays the turf
  map.addLayer({
    id: "ov-fairway",
    type: "fill",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "fairway"],
    paint: {
      "fill-color": "#22c55e",
      "fill-opacity": 0.08,
    },
  });
  map.addLayer({
    id: "ov-fairway-line",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "fairway"],
    paint: {
      "line-color": "#dcfce7",
      "line-width": 2,
      "line-opacity": 0.75,
    },
  });
  map.addLayer({
    id: "ov-tee",
    type: "fill",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "tee"],
    paint: {
      "fill-color": "#86efac",
      "fill-opacity": 0.35,
    },
  });
  map.addLayer({
    id: "ov-green",
    type: "fill",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "green"],
    paint: {
      "fill-color": "#4ade80",
      "fill-opacity": 0.42,
    },
  });
  map.addLayer({
    id: "ov-green-line",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "green"],
    paint: {
      "line-color": "#bbf7d0",
      "line-width": 1.6,
      "line-opacity": 0.75,
    },
  });
  map.addLayer({
    id: "ov-water",
    type: "fill",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "water"],
    paint: {
      "fill-color": "#38bdf8",
      "fill-opacity": 0.38,
    },
  });
  map.addLayer({
    id: "ov-bunker",
    type: "fill",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "bunker"],
    paint: {
      "fill-color": "#fde68a",
      "fill-opacity": 0.28,
    },
  });
  map.addLayer({
    id: "ov-bunker-line",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "bunker"],
    paint: {
      "line-color": "#f5e6a8",
      "line-width": 1.2,
      "line-opacity": 0.55,
    },
  });
  // Play corridor glow + dashed gold — high contrast on light sand
  map.addLayer({
    id: "ov-play-glow",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "playLine"],
    paint: {
      "line-color": "#0a0a08",
      "line-width": 10,
      "line-opacity": 0.45,
      "line-blur": 1,
    },
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
  });
  map.addLayer({
    id: "ov-play",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "playLine"],
    paint: {
      "line-color": "#f5e6a8",
      "line-width": 3.2,
      "line-dasharray": [1.6, 1.2],
      "line-opacity": 1,
    },
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
  });
  // Soft polygon fills (don't fight aerial)
  // already added fairway/green/bunker above — dial bunker softer
  // Layup stations
  map.addLayer({
    id: "ov-station-dot",
    type: "circle",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "station"],
    paint: {
      "circle-radius": 5,
      "circle-color": "#0c0c0a",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#f5e6a8",
      "circle-opacity": 0.95,
    },
  });
  map.addLayer({
    id: "ov-station-label",
    type: "symbol",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "station"],
    layout: {
      "text-field": ["get", "label"],
      "text-size": 12,
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      "text-offset": [0, 1.15],
      "text-anchor": "top",
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#fff8e0",
      "text-halo-color": "rgba(0,0,0,0.9)",
      "text-halo-width": 1.6,
    },
  });
  // Hazard markers
  map.addLayer({
    id: "ov-hazard-sand",
    type: "circle",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "hazard"],
    paint: {
      "circle-radius": 4,
      "circle-color": "#e8d4a0",
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#1a1a12",
    },
  });
  map.addLayer({
    id: "ov-hazard-water",
    type: "circle",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "hazardWater"],
    paint: {
      "circle-radius": 4,
      "circle-color": "#38bdf8",
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#0c1a24",
    },
  });
  // F / B green ticks
  map.addLayer({
    id: "ov-green-fb",
    type: "circle",
    source: OVERLAY_SOURCE,
    filter: ["in", ["get", "kind"], ["literal", ["greenFront", "greenBack"]]],
    paint: {
      "circle-radius": 4,
      "circle-color": "#ffffff",
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#c9a227",
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
      "circle-stroke-width": 2.5,
      "circle-stroke-color": "#0a0a08",
    },
  });
  // Soft cup halo under the HTML pin flag
  map.addLayer({
    id: "ov-green-pt-ring",
    type: "circle",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "greenPoint"],
    paint: {
      "circle-radius": 10,
      "circle-color": "rgba(201,162,39,0.18)",
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "rgba(245,230,168,0.55)",
    },
  });
  map.addLayer({
    id: "ov-tee-label",
    type: "symbol",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "teePoint"],
    layout: {
      "text-field": "TEE",
      "text-size": 11,
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      "text-offset": [0, 1.4],
      "text-anchor": "top",
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#f5e6a8",
      "text-halo-color": "rgba(0,0,0,0.92)",
      "text-halo-width": 1.6,
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
