import { isCtp, isLongDrive } from "@/lib/side-bets";

/** Captains 2026-08-25: Friday / South LD moved to 7. CTP 3 & 18 stay. Other days TBD. */
export const DAY1_CONTESTS = {
  courseId: "south",
  roundSlug: "friday",
  ctpFront: 3,
  ctpBack: 18,
  longDrive: 7,
} as const;

type BetLike = {
  kind: string;
  label: string;
  hole: number | null;
  round_id: string | null;
};

type RoundLike = { id: string; slug: string };

export function contestHoleLabel(hole: number | null): string {
  return hole ? `Hole ${hole}` : "Hole TBD";
}

/** Canonical 8 pots. Used when the side-bet table has not hydrated yet. */
export const KNOWN_SIDE_POTS = [
  { key: "fri-ctp-3", kind: "ctp", label: "CTP - Friday front", hole: 3 },
  { key: "fri-ld-7", kind: "ld", label: "Long Drive - Friday", hole: 7 },
  { key: "fri-ctp-18", kind: "ctp", label: "CTP - Friday back", hole: 18 },
  { key: "sat-ctp-front", kind: "ctp", label: "CTP - Saturday front", hole: null },
  { key: "sat-ctp-back", kind: "ctp", label: "CTP - Saturday back", hole: null },
  { key: "sat-ld", kind: "ld", label: "Long Drive - Saturday", hole: null },
  { key: "sun-ctp-front", kind: "ctp", label: "CTP - Sunday front", hole: null },
  { key: "sun-ctp-back", kind: "ctp", label: "CTP - Sunday back", hole: null },
] as const;

export function potStatus(hole: number | null) {
  if (
    hole === DAY1_CONTESTS.ctpFront ||
    hole === DAY1_CONTESTS.ctpBack ||
    hole === DAY1_CONTESTS.longDrive
  ) {
    return `Open · ${contestHoleLabel(hole)}`;
  }
  if (hole != null) return contestHoleLabel(hole);
  return "Named Friday night";
}

export function displayBetLabel(label: string) {
  return label.replace(/\bstavs\b/gi, "staves");
}

export type DisplayPot = {
  id: string;
  kind: string;
  label: string;
  hole: number | null;
  amount: number;
  player_name: string | null;
};

export function displaySidePots(
  bets: Array<{
    id?: string;
    kind: string;
    label: string;
    hole: number | null;
    amount?: number | string;
    player_name?: string | null;
  }>,
): DisplayPot[] {
  if (bets.length > 0) {
    return bets.map((bet, index) => ({
      id: bet.id ?? `live-${index}`,
      kind: bet.kind,
      label: displayBetLabel(bet.label),
      hole: bet.hole,
      amount: Number(bet.amount) || 100,
      player_name: bet.player_name ?? null,
    }));
  }
  return KNOWN_SIDE_POTS.map((pot) => ({
    id: pot.key,
    kind: pot.kind,
    label: pot.label,
    hole: pot.hole,
    amount: 100,
    player_name: null,
  }));
}

/** Friday contests are canonical even before the side-bet table hydrates. */
export function knownContestsForHole(courseId: string, hole: number): Array<"ctp" | "ld"> {
  if (courseId !== DAY1_CONTESTS.courseId) return [];
  if (hole === DAY1_CONTESTS.ctpFront || hole === DAY1_CONTESTS.ctpBack) return ["ctp"];
  if (hole === DAY1_CONTESTS.longDrive) return ["ld"];
  return [];
}

function isFridayBet(bet: BetLike, fridayId?: string) {
  return (
    Boolean(fridayId && bet.round_id === fridayId) || bet.label.toLowerCase().includes("friday")
  );
}

export function applyDay1ContestHoles<T extends BetLike>(bets: T[], rounds: RoundLike[]): T[] {
  const fridayId = rounds.find((round) => round.slug === DAY1_CONTESTS.roundSlug)?.id;
  return bets.map((bet) => {
    const onFriday = isFridayBet(bet, fridayId);
    const label = bet.label.toLowerCase();
    if (isLongDrive(bet.kind) && onFriday) {
      return { ...bet, hole: DAY1_CONTESTS.longDrive };
    }
    if (bet.hole != null) return bet;
    if (isCtp(bet.kind) && onFriday) {
      if (label.includes("back")) return { ...bet, hole: DAY1_CONTESTS.ctpBack };
      if (label.includes("front")) return { ...bet, hole: DAY1_CONTESTS.ctpFront };
    }
    return bet;
  });
}

export type ContestHoleStatus = {
  fridayPosted: boolean;
  remainingOpen: number;
  allPosted: boolean;
};

export function contestHoleStatus(bets: BetLike[], rounds: RoundLike[] = []): ContestHoleStatus {
  const resolved = applyDay1ContestHoles(bets, rounds);
  const fridayId = rounds.find((round) => round.slug === DAY1_CONTESTS.roundSlug)?.id;
  const fridayBets = resolved.filter((bet) => isFridayBet(bet, fridayId));
  const otherBets = resolved.filter((bet) => !isFridayBet(bet, fridayId));
  return {
    fridayPosted: fridayBets.length > 0 && fridayBets.every((bet) => bet.hole != null),
    remainingOpen: otherBets.filter((bet) => bet.hole == null).length,
    allPosted: resolved.length > 0 && resolved.every((bet) => bet.hole != null),
  };
}

export function contestHoleOpsDetail(status: ContestHoleStatus): string {
  if (status.allPosted) return "CTP/LD holes numbered — Scout badges them";
  if (status.fridayPosted) {
    return `Friday posted: CTP ${DAY1_CONTESTS.ctpFront} & ${DAY1_CONTESTS.ctpBack}, long drive ${DAY1_CONTESTS.longDrive}. Saturday/Sunday TBD.`;
  }
  return "Still TBD — do not invent; post when known";
}
