/** Pure cup-scoring helpers. Kept free of React so they can be unit tested. */
import { EVENT } from "@/lib/tin-cup";

export type ScoredMatch = {
  id: string;
  round_id: string;
  points: number | string;
  result: string;
};

export type Standings = {
  strongMental: number;
  grassRoots: number;
  played: number;
  remaining: number;
};

export function tallyStandings(matches: ScoredMatch[]): Standings {
  let strongMental = 0;
  let grassRoots = 0;
  let played = 0;
  let remaining = 0;

  for (const match of matches) {
    const points = Number(match.points);
    if (match.result === "strong-mental") {
      strongMental += points;
      played += 1;
    } else if (match.result === "grass-roots") {
      grassRoots += points;
      played += 1;
    } else if (match.result === "halved") {
      strongMental += points / 2;
      grassRoots += points / 2;
      played += 1;
    } else {
      remaining += points;
    }
  }

  return { strongMental, grassRoots, played, remaining };
}

export type Clinch = {
  leader: "strong-mental" | "grass-roots" | null;
  /** Points the leader still needs to reach the winning threshold. */
  leaderNeeds: number;
  trailerNeeds: number;
  clinchedBy: "strong-mental" | "grass-roots" | null;
  /** True when neither side can reach the threshold any more. */
  retained: boolean;
};

export function clinchSummary(standings: Standings, target = EVENT.pointsToWin): Clinch {
  const { strongMental, grassRoots, remaining } = standings;
  const leader =
    strongMental === grassRoots
      ? null
      : strongMental > grassRoots
        ? "strong-mental"
        : "grass-roots";

  const clinchedBy =
    strongMental >= target ? "strong-mental" : grassRoots >= target ? "grass-roots" : null;

  return {
    leader,
    leaderNeeds: Math.max(0, target - Math.max(strongMental, grassRoots)),
    trailerNeeds: Math.max(0, target - Math.min(strongMental, grassRoots)),
    clinchedBy,
    retained: !clinchedBy && strongMental + remaining < target && grassRoots + remaining < target,
  };
}

/** Points won by each side within a single round. */
export function roundTally(matches: ScoredMatch[], roundId: string): Standings {
  return tallyStandings(matches.filter((m) => m.round_id === roundId));
}

export type PairedMatch = ScoredMatch & {
  side_a: string | null;
  side_b: string | null;
};

export type PlayerRecord = {
  won: number;
  lost: number;
  halved: number;
  points: number;
  played: number;
  /** Matches the player is listed in that have no result yet. */
  upcoming: number;
};

const EMPTY_RECORD: PlayerRecord = {
  won: 0,
  lost: 0,
  halved: 0,
  points: 0,
  played: 0,
  upcoming: 0,
};

/** Does a pairing string name this player? Sides hold names split by / , & or +. */
export function pairingIncludes(side: string | null, name: string): boolean {
  if (!side) return false;
  const target = name.trim().toLowerCase();
  if (!target) return false;
  return side
    .split(/[/,&+]|\band\b/i)
    .map((part) => part.trim().toLowerCase())
    .some((part) => part === target);
}

/**
 * A player's win/loss/halve record from the pairings written on each match.
 * Points credited are the match's full points on a win, half on a halve.
 */
export function playerRecord(matches: PairedMatch[], name: string, teamSlug: string): PlayerRecord {
  const record = { ...EMPTY_RECORD };
  for (const match of matches) {
    const onA = pairingIncludes(match.side_a, name);
    const onB = pairingIncludes(match.side_b, name);
    if (!onA && !onB) continue;
    const side = onA ? "strong-mental" : "grass-roots";
    if (side !== teamSlug) continue; // pairing lists them on the other side; trust the roster
    const points = Number(match.points);
    if (match.result === "halved") {
      record.halved += 1;
      record.played += 1;
      record.points += points / 2;
    } else if (match.result === side) {
      record.won += 1;
      record.played += 1;
      record.points += points;
    } else if (match.result === "strong-mental" || match.result === "grass-roots") {
      record.lost += 1;
      record.played += 1;
    } else {
      record.upcoming += 1;
    }
  }
  return record;
}

/** "2-1-1" style shorthand, or null when the player isn't in any pairing yet. */
export function formatRecord(record: PlayerRecord): string | null {
  if (record.played === 0) return null;
  return `${record.won}-${record.lost}-${record.halved}`;
}

export type TimedRound = { play_date: string; tee_window: string };

/**
 * Best-effort start time for a round, from its play date and tee window
 * (e.g. "12:19–12:44 PM"). Times are Eastern, which is UTC-4 in August.
 */
export function roundStart(round: TimedRound): number | null {
  const match = round.tee_window.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const meridiem = /pm/i.test(round.tee_window) ? "pm" : "am";
  let hour = Number(match[1]);
  if (meridiem === "pm" && hour !== 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  const stamp = `${round.play_date}T${String(hour).padStart(2, "0")}:${match[2]}:00-04:00`;
  const time = new Date(stamp).getTime();
  return Number.isNaN(time) ? null : time;
}

export type RoundStatus = "upcoming" | "live" | "complete";

/** A round is treated as live from its first tee until ~5.5 hours later. */
export function roundStatus(round: TimedRound, now: number = Date.now()): RoundStatus {
  const start = roundStart(round);
  if (start === null) return "upcoming";
  if (now < start) return "upcoming";
  return now < start + 5.5 * 3_600_000 ? "live" : "complete";
}
