import { isCtp, isLongDrive } from "@/lib/side-bets";

/** Kevin 2026-08-20: Day 1 (Friday / South) contest holes. Other days stay TBD. */
export const DAY1_CONTESTS = {
  courseId: "south",
  roundSlug: "friday",
  ctpFront: 3,
  ctpBack: 18,
  longDrive: 13,
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

function isFridayBet(bet: BetLike, fridayId?: string) {
  return Boolean(fridayId && bet.round_id === fridayId) || bet.label.toLowerCase().includes("friday");
}

export function applyDay1ContestHoles<T extends BetLike>(bets: T[], rounds: RoundLike[]): T[] {
  const fridayId = rounds.find((round) => round.slug === DAY1_CONTESTS.roundSlug)?.id;
  return bets.map((bet) => {
    if (bet.hole != null) return bet;
    const onFriday = isFridayBet(bet, fridayId);
    const label = bet.label.toLowerCase();
    if (isCtp(bet.kind) && onFriday) {
      if (label.includes("back")) return { ...bet, hole: DAY1_CONTESTS.ctpBack };
      if (label.includes("front")) return { ...bet, hole: DAY1_CONTESTS.ctpFront };
    }
    if (isLongDrive(bet.kind) && onFriday) {
      return { ...bet, hole: DAY1_CONTESTS.longDrive };
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
