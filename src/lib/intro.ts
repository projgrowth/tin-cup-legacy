import { getEventPhase } from "@/lib/event-phase";

/** Legacy session-only flag (still written for one-release compatibility). */
export const INTRO_SESSION_KEY = "tc-intro-played";

/** Durable “seen this film version” flag. Bump INTRO_VERSION when the film changes. */
export const INTRO_STORAGE_KEY = "tc-intro-v1";
export const INTRO_VERSION = 1;

export type IntroSeenRecord = {
  seenAt: number;
  version: number;
};

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function readIntroSeen(): IntroSeenRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(INTRO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<IntroSeenRecord>;
    if (typeof parsed.seenAt !== "number" || typeof parsed.version !== "number") return null;
    return { seenAt: parsed.seenAt, version: parsed.version };
  } catch {
    return null;
  }
}

/** True when this browser has already finished (or skipped) the current intro film. */
export function hasSeenCurrentIntro(): boolean {
  const seen = readIntroSeen();
  if (seen?.version === INTRO_VERSION) return true;
  // Migrate legacy session flag so mid-release users aren't re-shown immediately.
  try {
    if (window.sessionStorage.getItem(INTRO_SESSION_KEY) === "1") return true;
  } catch {
    /* private mode */
  }
  return false;
}

/**
 * Whether the cinematic intro should auto-play on the home route.
 * - Never during tournament live phase (first tee → end of Sunday).
 * - Never when the user prefers reduced motion.
 * - Never after the current film version has been seen (localStorage).
 */
export function shouldPlayIntro(now: number = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  if (prefersReducedMotion()) return false;
  if (getEventPhase(now) === "live") return false;
  if (hasSeenCurrentIntro()) return false;
  return true;
}

/** @deprecated Prefer shouldPlayIntro / hasSeenCurrentIntro. Kept for call sites. */
export function introAlreadyPlayed(): boolean {
  return !shouldPlayIntro();
}

export function markIntroSeen(now: number = Date.now()): void {
  if (typeof window === "undefined") return;
  const record: IntroSeenRecord = { seenAt: now, version: INTRO_VERSION };
  try {
    window.localStorage.setItem(INTRO_STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* private mode / quota */
  }
  try {
    window.sessionStorage.setItem(INTRO_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Clears durable + legacy flags (profile “Replay intro” / tests). */
export function clearIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(INTRO_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    window.sessionStorage.removeItem(INTRO_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
