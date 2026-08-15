import { useCallback, useRef, useSyncExternalStore } from "react";

import { countdownParts, type CountdownParts } from "@/lib/countdown";
import { EVENT } from "@/lib/tin-cup";

const FIRST_TEE = new Date(EVENT.firstTee).getTime();

export function firstTeeMs() {
  return FIRST_TEE;
}

export function partsUntilFirstTee(now = Date.now()): CountdownParts {
  return countdownParts(FIRST_TEE - now);
}

function intervalFor(remaining: number) {
  return remaining > 86_400_000 ? 30_000 : 1_000;
}

/** Live first-tee clock. Same numbers on SSR and the first client paint. */
export function useLiveCountdown(): CountdownParts {
  const cache = useRef<CountdownParts>(partsUntilFirstTee());

  const subscribe = useCallback((onStoreChange: () => void) => {
    let timer = 0;
    const tick = () => {
      cache.current = partsUntilFirstTee();
      onStoreChange();
      timer = window.setTimeout(tick, intervalFor(cache.current.remaining));
    };
    timer = window.setTimeout(tick, intervalFor(cache.current.remaining));
    return () => window.clearTimeout(timer);
  }, []);

  const getSnapshot = useCallback(() => {
    const next = partsUntilFirstTee();
    const prev = cache.current;
    if (
      prev.days === next.days &&
      prev.hours === next.hours &&
      prev.minutes === next.minutes &&
      prev.seconds === next.seconds &&
      prev.done === next.done
    ) {
      return prev;
    }
    cache.current = next;
    return next;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
