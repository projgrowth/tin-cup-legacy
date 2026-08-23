import type { Match, Round } from "@/hooks/useTournament";
import { DAY1_PAIRINGS } from "@/lib/day1-pairings";
import { pairingIncludesLoose } from "@/lib/scoring";
import {
  predictionLocked,
  type MatchPrediction,
  type MatchPredictionChoice,
} from "@/lib/social-platform";
import type { StoryMoment } from "@/lib/weekend-story";

export const CARD_NOTE_MAX = 140;
export const CARD_DISCLAIMER = "Ride the other groups. Yours is already set.";

export function pairingFirstNames(side: string | null | undefined): string {
  if (!side?.trim()) return "TBD";
  const names = side
    .split(/[/,&+]|\band\b/i)
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
  return names.join(" · ") || side.trim();
}

export function normalizeCardNote(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, CARD_NOTE_MAX);
}

export function pairingKey(sideA: string | null | undefined, sideB: string | null | undefined): string {
  return `${(sideA ?? "").trim().toLowerCase()}||${(sideB ?? "").trim().toLowerCase()}`;
}

export type CardMarket = {
  id: string;
  matchIds: string[];
  roundLabel: string;
  index: number;
  sideA: string;
  sideB: string;
  locked: boolean;
};

function marketFromGroup(group: Match[], roundLabel: string, index: number): CardMarket {
  const sorted = [...group].sort((a, b) => a.sort_order - b.sort_order);
  const first = sorted[0]!;
  return {
    id: sorted.map((match) => match.id).join(":"),
    matchIds: sorted.map((match) => match.id),
    roundLabel,
    index,
    sideA: first.side_a ?? "TBD",
    sideB: first.side_b ?? "TBD",
    locked: sorted.every((match) => predictionLocked(match)),
  };
}

/** Friday pairings collapse scramble + alt shot into one ticket; later rounds stay 1:1. */
export function cardMarkets(matches: Match[], rounds: Round[]): CardMarket[] {
  const markets: CardMarket[] = [];
  const friday = rounds.find((round) => round.slug === "friday");
  const fridayMatches = friday ? matches.filter((match) => match.round_id === friday.id) : [];
  const groups = new Map<string, Match[]>();
  for (const match of fridayMatches) {
    const key = pairingKey(match.side_a, match.side_b);
    const list = groups.get(key) ?? [];
    list.push(match);
    groups.set(key, list);
  }

  for (const pairing of DAY1_PAIRINGS) {
    const key = pairingKey(pairing.sideA, pairing.sideB);
    const group = groups.get(key);
    if (group?.length) {
      groups.delete(key);
      markets.push(marketFromGroup(group, "Friday", pairing.matchIndex));
    } else {
      markets.push({
        id: `day1:${pairing.matchIndex}`,
        matchIds: [],
        roundLabel: "Friday",
        index: pairing.matchIndex,
        sideA: pairing.sideA,
        sideB: pairing.sideB,
        locked: false,
      });
    }
  }
  for (const group of groups.values()) {
    markets.push(marketFromGroup(group, "Friday", markets.length + 1));
  }

  const later = rounds
    .filter((round) => round.slug !== "friday")
    .sort((a, b) => a.sort_order - b.sort_order);
  for (const round of later) {
    const rows = matches
      .filter((match) => match.round_id === round.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    rows.forEach((match, index) => {
      markets.push({
        id: match.id,
        matchIds: [match.id],
        roundLabel: round.day_label || round.slug,
        index: index + 1,
        sideA: match.side_a ?? "TBD",
        sideB: match.side_b ?? "TBD",
        locked: predictionLocked(match),
      });
    });
  }
  return markets;
}

export function fridayCardMarkets(matches: Match[], rounds: Round[]): CardMarket[] {
  return cardMarkets(matches, rounds).filter((market) => market.roundLabel === "Friday");
}

export type CardPerson = { name: string; teamSlug: "strong-mental" | "grass-roots"; src?: string | null };

export function peopleForMarket(
  market: CardMarket,
  getFace?: (name: string) => { url?: string | null } | undefined,
): { peopleA: CardPerson[]; peopleB: CardPerson[] } {
  const pairing = DAY1_PAIRINGS.find(
    (row) => pairingKey(row.sideA, row.sideB) === pairingKey(market.sideA, market.sideB),
  );
  const namesA = pairing?.playersA ?? splitPairingNames(market.sideA);
  const namesB = pairing?.playersB ?? splitPairingNames(market.sideB);
  return {
    peopleA: namesA.map((name) => ({
      name,
      teamSlug: "strong-mental",
      src: getFace?.(name)?.url,
    })),
    peopleB: namesB.map((name) => ({
      name,
      teamSlug: "grass-roots",
      src: getFace?.(name)?.url,
    })),
  };
}

function splitPairingNames(side: string): string[] {
  return side
    .split(/[/,&+]|\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function pendingMatchIds(market: CardMarket, matches: Match[]): string[] {
  if (market.matchIds.length === 0) return [];
  const byId = new Map(matches.map((match) => [match.id, match]));
  return market.matchIds.filter((id) => {
    const match = byId.get(id);
    return match ? match.result === "pending" : true;
  });
}

export function pickOnMarket(
  predictions: MatchPrediction[],
  userId: string | undefined,
  matchIds: string[],
): MatchPrediction | undefined {
  if (!userId || matchIds.length === 0) return undefined;
  return predictions
    .filter((pick) => pick.userId === userId && matchIds.includes(pick.matchId))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
}

export function choiceHitsResult(choice: MatchPredictionChoice, result: string): boolean | null {
  if (result === "pending") return null;
  if (choice === "halved") return result === "halved";
  if (choice === "side-a") return result === "strong-mental";
  if (choice === "side-b") return result === "grass-roots";
  return null;
}

export type CardRecord = {
  userId: string;
  taken: number;
  cashed: number;
  pending: number;
};

export function cardRecords(predictions: MatchPrediction[], matches: Match[]): CardRecord[] {
  const matchById = new Map(matches.map((match) => [match.id, match]));
  const byUser = new Map<string, CardRecord>();
  const seen = new Set<string>();
  const picks = [...predictions].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
  for (const pick of picks) {
    const match = matchById.get(pick.matchId);
    const pairing = match
      ? `${pick.userId}:${match.round_id}:${pairingKey(match.side_a, match.side_b)}`
      : `${pick.userId}:${pick.matchId}`;
    if (seen.has(pairing)) continue;
    seen.add(pairing);
    const row = byUser.get(pick.userId) ?? {
      userId: pick.userId,
      taken: 0,
      cashed: 0,
      pending: 0,
    };
    row.taken += 1;
    if (!match || match.result === "pending") row.pending += 1;
    else if (choiceHitsResult(pick.choice, match.result)) row.cashed += 1;
    byUser.set(pick.userId, row);
  }
  return [...byUser.values()].sort((a, b) => b.cashed - a.cashed || b.taken - a.taken);
}

export function takeLabel(choice: MatchPredictionChoice, sideA: string, sideB: string): string {
  if (choice === "halved") return "a push";
  if (choice === "side-a") return pairingFirstNames(sideA);
  return pairingFirstNames(sideB);
}

export function faceoffRiders(predictions: MatchPrediction[], matchIds: string[]) {
  const latest = new Map<string, MatchPredictionChoice>();
  const rows = predictions
    .filter((pick) => matchIds.includes(pick.matchId))
    .sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt));
  for (const pick of rows) latest.set(pick.userId, pick.choice);
  const sideA: string[] = [];
  const sideB: string[] = [];
  for (const [userId, choice] of latest) {
    if (choice === "side-a") sideA.push(userId);
    if (choice === "side-b") sideB.push(userId);
  }
  return { sideA, sideB };
}

export function faceoffCrowd(predictions: MatchPrediction[], matchIds: string[]) {
  const riders = faceoffRiders(predictions, matchIds);
  return { sideA: riders.sideA.length, sideB: riders.sideB.length };
}

export function cardLine(input: {
  author: string;
  choice: MatchPredictionChoice;
  sideA: string;
  sideB: string;
  note?: string | null;
  result?: string | null;
}): { title: string; detail?: string } {
  const side = takeLabel(input.choice, input.sideA, input.sideB);
  const title =
    input.choice === "halved" ? `${input.author} called a push` : `${input.author} is with ${side}`;
  const hit =
    input.result && input.result !== "pending"
      ? choiceHitsResult(input.choice, input.result)
      : null;
  const grade = hit === true ? "Called it." : hit === false ? "Ate it." : null;
  const parts = [input.note?.trim() || null, grade].filter(Boolean);
  return { title, detail: parts.length ? parts.join(" · ") : undefined };
}

export function isYourMarket(
  market: CardMarket,
  claimedName: string | null | undefined,
): boolean {
  if (!claimedName?.trim()) return false;
  return (
    pairingIncludesLoose(market.sideA, claimedName) ||
    pairingIncludesLoose(market.sideB, claimedName)
  );
}

/** Rides on the other groups. Your own pairing is already set. */
export function takenCount(
  predictions: MatchPrediction[],
  userId: string | undefined,
  markets: CardMarket[],
  claimedName?: string | null,
): { taken: number; total: number } {
  const rideable = claimedName
    ? markets.filter((market) => !isYourMarket(market, claimedName))
    : markets;
  const taken = rideable.filter((market) =>
    pickOnMarket(predictions, userId, market.matchIds),
  ).length;
  return { taken, total: rideable.length };
}

export function buildCardMoments(input: {
  matches: Match[];
  predictions: MatchPrediction[];
  authorName: (userId: string) => string;
  authorPlayer?: (userId: string) => { id?: string | null; teamSlug?: string | null } | undefined;
}): StoryMoment[] {
  const matchById = new Map(input.matches.map((match) => [match.id, match]));
  const moments: StoryMoment[] = [];
  const seenPairing = new Set<string>();
  const picks = [...input.predictions].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
  for (const pick of picks) {
    const match = matchById.get(pick.matchId);
    if (!match) continue;
    const pairing = `${pick.userId}:${match.round_id}:${pairingKey(match.side_a, match.side_b)}`;
    if (seenPairing.has(pairing)) continue;
    seenPairing.add(pairing);
    const author = input.authorName(pick.userId);
    const line = cardLine({
      author,
      choice: pick.choice,
      sideA: match.side_a ?? "TBD",
      sideB: match.side_b ?? "TBD",
      note: pick.note,
      result: match.result,
    });
    const player = input.authorPlayer?.(pick.userId);
    moments.push({
      key: `prediction:${pick.matchId}:${pick.userId}`,
      kind: "prediction",
      title: line.title,
      detail: line.detail,
      at: Date.parse(pick.updatedAt) || Date.parse(pick.createdAt) || 0,
      shareable: false,
      authorId: pick.userId,
      playerId: player?.id ?? null,
      playerName: author,
      teamSlug: player?.teamSlug ?? null,
    });
  }
  return moments;
}
