import { EVENT, type BoardMode } from "@/lib/tin-cup";

export type EventPhase = "before" | "live" | "after";

export function getEventPhase(now: number = Date.now()): EventPhase {
  if (now < new Date(EVENT.firstTee).getTime()) return "before";
  if (now <= new Date(EVENT.endsAt).getTime()) return "live";
  return "after";
}

export function phaseMode(phase: EventPhase): BoardMode {
  if (phase === "before") return "pre";
  if (phase === "after") return "post";
  return "live";
}

/** Recap stays off until every Cup point is posted — clock does not close scoring. */
export function boardMode(
  remaining: number,
  now: number = Date.now(),
  recap = false,
): BoardMode {
  const phase = getEventPhase(now);
  if (phase === "before") return "pre";
  if (remaining > 0) return "live";
  if (recap || phase === "after") return "post";
  return "live";
}
