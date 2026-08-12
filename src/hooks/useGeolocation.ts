import { useCallback, useEffect, useRef, useState } from "react";

import type { LngLat } from "@/lib/geo";

export type GeoFix = {
  point: LngLat;
  accuracyM: number;
  at: number;
};

/**
 * Opt-in device GPS for on-course Scout.
 * Pauses when the document is hidden to save battery.
 */
export function useGeolocation(enabled: boolean) {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const watchId = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchId.current != null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setActive(false);
  }, []);

  const start = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location not available on this device");
      return;
    }
    setError(null);
    stop();
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setFix({
          point: [pos.coords.longitude, pos.coords.latitude],
          accuracyM: pos.coords.accuracy ?? 30,
          at: pos.timestamp,
        });
        setActive(true);
      },
      (err) => {
        setError(err.message || "Location permission denied");
        setActive(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 4_000,
        timeout: 20_000,
      },
    );
  }, [stop]);

  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }
    start();
    const onVis = () => {
      if (document.hidden) stop();
      else if (enabled) start();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [enabled, start, stop]);

  return { fix, error, active, start, stop };
}
