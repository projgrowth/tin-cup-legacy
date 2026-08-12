import { useEffect, useImperativeHandle, useRef, forwardRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  type StyleSpecification,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { GeoHole } from "@/lib/geo-courses";
import { holeOverlayCollection, holePlayBearing } from "@/lib/geo-courses";
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
      attribution:
        "Tiles © Esri — Esri, Maxar, Earthstar Geographics, GIS User Community",
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
        "raster-fade-duration": 180,
        "raster-saturation": -0.05,
        "raster-contrast": 0.08,
      },
    },
  ],
};

const OVERLAY_SOURCE = "hole-overlay";

export type SatelliteHoleMapHandle = {
  resetView: () => void;
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
export const SatelliteHoleMap = forwardRef<SatelliteHoleMapHandle, Props>(
  function SatelliteHoleMap(
    {
      geo,
      className,
      gpsPoint = null,
      gpsAccuracyM = null,
      onError,
      onReady,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const gpsMarkerRef = useRef<Marker | null>(null);
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
        map.remove();
        mapRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Hole change → smooth camera + overlays
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      const run = () => {
        ensureOverlayLayers(map);
        const src = map.getSource(OVERLAY_SOURCE) as GeoJSONSource | undefined;
        src?.setData(holeOverlayCollection(geo));
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
        node.innerHTML =
          '<span class="tc-gps-pulse"></span><span class="tc-gps-core"></span>';
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
      <div
        className={`relative size-full min-h-[280px] touch-manipulation ${className ?? ""}`}
      >
        <div
          ref={containerRef}
          className={`size-full transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
          role="img"
          aria-label={`Satellite map of hole ${geo.hole}`}
        />
        {!ready && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-[var(--turf-rough)]"
            aria-hidden
          >
            <div className="flex flex-col items-center gap-2">
              <div className="size-8 animate-pulse rounded-full border-2 border-gold/40 border-t-gold-light" />
              <p className="text-xs font-semibold tracking-wide text-white/55">
                Loading course…
              </p>
            </div>
          </div>
        )}
      </div>
    );
  },
);

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
      padding: { top: 56, bottom: 100, left: 36, right: 36 },
      maxZoom: 18.2,
      bearing,
      pitch: 0,
      duration: animate ? 520 : 0,
      essential: true,
    },
  );
}

function ensureOverlayLayers(map: MapLibreMap) {
  if (map.getSource(OVERLAY_SOURCE)) return;

  map.addSource(OVERLAY_SOURCE, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  // Soft fairway wash
  map.addLayer({
    id: "ov-fairway",
    type: "fill",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "fairway"],
    paint: {
      "fill-color": "#4ade80",
      "fill-opacity": 0.22,
    },
  });
  map.addLayer({
    id: "ov-fairway-line",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "fairway"],
    paint: {
      "line-color": "#bbf7d0",
      "line-width": 1.4,
      "line-opacity": 0.55,
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
      "fill-opacity": 0.5,
    },
  });
  map.addLayer({
    id: "ov-bunker-line",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "bunker"],
    paint: {
      "line-color": "#d6b56a",
      "line-width": 1,
      "line-opacity": 0.7,
    },
  });
  // Play corridor glow + dashed gold
  map.addLayer({
    id: "ov-play-glow",
    type: "line",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "playLine"],
    paint: {
      "line-color": "#e8c547",
      "line-width": 8,
      "line-opacity": 0.28,
      "line-blur": 3,
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
      "line-width": 2.4,
      "line-dasharray": [1.8, 1.4],
      "line-opacity": 0.95,
    },
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
  });
  // Yard stations
  map.addLayer({
    id: "ov-station-dot",
    type: "circle",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "station"],
    paint: {
      "circle-radius": 3.5,
      "circle-color": "#f5e6a8",
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#1a1a12",
      "circle-opacity": 0.9,
    },
  });
  map.addLayer({
    id: "ov-station-label",
    type: "symbol",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "station"],
    layout: {
      "text-field": ["get", "label"],
      "text-size": 11,
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      "text-offset": [0, 1.1],
      "text-anchor": "top",
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": "#f8f5e8",
      "text-halo-color": "rgba(10,16,12,0.85)",
      "text-halo-width": 1.4,
    },
  });
  map.addLayer({
    id: "ov-tee-pt",
    type: "circle",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "teePoint"],
    paint: {
      "circle-radius": 8,
      "circle-color": "#f5e6a8",
      "circle-stroke-width": 2.5,
      "circle-stroke-color": "#1a1a12",
    },
  });
  map.addLayer({
    id: "ov-green-pt",
    type: "circle",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "greenPoint"],
    paint: {
      "circle-radius": 9,
      "circle-color": "#f0e6c0",
      "circle-stroke-width": 3,
      "circle-stroke-color": "#c9a227",
    },
  });
  map.addLayer({
    id: "ov-pin-label",
    type: "symbol",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "greenPoint"],
    layout: {
      "text-field": "PIN",
      "text-size": 10,
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      "text-offset": [0, 1.35],
      "text-anchor": "top",
    },
    paint: {
      "text-color": "#f5e6a8",
      "text-halo-color": "rgba(10,16,12,0.9)",
      "text-halo-width": 1.5,
    },
  });
  map.addLayer({
    id: "ov-tee-label",
    type: "symbol",
    source: OVERLAY_SOURCE,
    filter: ["==", ["get", "kind"], "teePoint"],
    layout: {
      "text-field": "TEE",
      "text-size": 10,
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      "text-offset": [0, 1.35],
      "text-anchor": "top",
    },
    paint: {
      "text-color": "#f5e6a8",
      "text-halo-color": "rgba(10,16,12,0.9)",
      "text-halo-width": 1.5,
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
