import { useEffect, useRef, useState } from "react";

export type FrameTier = "full" | "lite" | "still";

/**
 * Samples real frame pacing with a short rAF probe and reports a render tier.
 *
 * - `full`  — comfortably at/near 60fps: blur emerge + grain are affordable.
 * - `lite`  — frames are dropping: opacity/transform only, no blur, no blend layers.
 * - `still` — sustained jank: stop compositing video entirely, hold the poster.
 *
 * The probe itself is a single rAF loop with no React state writes per frame,
 * so measuring costs nothing measurable.
 */
export function useFrameBudget(enabled = true): FrameTier {
  const [tier, setTier] = useState<FrameTier>("full");
  const tierRef = useRef<FrameTier>("full");

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTier("still");
      return;
    }

    let raf = 0;
    let last = performance.now();
    let frames = 0;
    let slow = 0;
    let windowStart = last;
    let strikes = 0;

    const demote = (next: FrameTier) => {
      if (tierRef.current === next) return;
      tierRef.current = next;
      setTier(next);
    };

    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      frames += 1;
      // >22ms means we missed a 60fps frame; ignore the first tab-switch spikes.
      if (delta > 22 && delta < 500) slow += 1;

      if (now - windowStart >= 500) {
        const ratio = frames ? slow / frames : 0;
        if (ratio > 0.3) {
          strikes += 1;
          if (strikes === 1) demote("lite");
          else if (strikes >= 3) demote("still");
        } else if (strikes > 0) {
          strikes -= 1;
        }
        frames = 0;
        slow = 0;
        windowStart = now;
      }

      if (tierRef.current !== "still") raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  return tier;
}
