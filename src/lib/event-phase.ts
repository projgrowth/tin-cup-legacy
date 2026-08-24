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

/** Live hole-by-hole UI waits for first tee, unless play already exists. */
export function liveScorecardOpen(opts: {
  now?: number;
  result?: string | null;
  hasReports?: boolean;
  sessionLive?: boolean;
} = {}): boolean {
  if (opts.hasReports) return true;
  if (opts.result && opts.result !== "pending") return true;
  if (opts.sessionLive) return true;
  return getEventPhase(opts.now) !== "before";
}
