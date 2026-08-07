/** Pure purse math: derives every dollar figure from live rows, not prose. */
import { BUY_IN, SIDE_BET_PAYOUTS_CONFIRMED } from "@/lib/tin-cup";
import { clinchSummary, tallyStandings, type ScoredMatch } from "@/lib/scoring";
import { normalizeSideBetKind, sideBetKindLabel } from "@/lib/side-bets";

/** Of the $150 buy-in: $100 team money, $50 into the side-cash board. */
export const SIDE_CASH_PER_PLAYER = 50;
export const TEAM_MONEY_PER_PLAYER = BUY_IN - SIDE_CASH_PER_PLAYER;

export type PurseBet = {
  kind: string;
  label: string;
  amount: number | string;
  player_name: string | null;
};

export type BetGroup = {
  kind: string;
  label: string;
  count: number;
  amount: number;
  total: number;
  claimed: number;
  configured: boolean;
};

/** One line per bet kind — the six CTP contests collapse into a single summary row. */
export function groupBets(bets: PurseBet[]): BetGroup[] {
  const groups = new Map<string, BetGroup>();
  for (const bet of bets) {
    const kind = normalizeSideBetKind(bet.kind);
    const amount = Number(bet.amount);
    const configured = Number.isFinite(amount) && amount > 0;
    const existing = groups.get(kind);
    if (existing) {
      existing.count += 1;
      existing.total += amount;
      if (bet.player_name) existing.claimed += 1;
      if (amount !== existing.amount) existing.amount = 0; // mixed pot sizes
      existing.configured = existing.configured && configured;
    } else {
      groups.set(kind, {
        kind,
        label: sideBetKindLabel(kind),
        count: 1,
        amount,
        total: amount,
        claimed: bet.player_name ? 1 : 0,
        configured,
      });
    }
  }
  return [...groups.values()];
}

export type SideCash = {
  pool: number;
  posted: number;
  /** Pool minus what the bet rows actually pay out. Should be 0. */
  slack: number;
  claimedTotal: number;
  openTotal: number;
  unconfigured: number;
  groups: BetGroup[];
};

export function sideCash(bets: PurseBet[], playerCount: number): SideCash {
  const groups = groupBets(bets);
  const posted = bets.reduce((sum, b) => sum + Number(b.amount), 0);
  const claimedTotal = bets
    .filter((b) => b.player_name)
    .reduce((sum, b) => sum + Number(b.amount), 0);
  const pool = playerCount * SIDE_CASH_PER_PLAYER;
  return {
    pool,
    posted,
    slack: pool - posted,
    claimedTotal,
    openTotal: posted - claimedTotal,
    unconfigured: bets.filter((bet) => Number(bet.amount) <= 0).length,
    groups,
  };
}

/** Zero is the persisted sentinel for an organizer-confirmed-later payout. */
export function formatPayout(amount: number | string): string {
  const value = Number(amount);
  return SIDE_BET_PAYOUTS_CONFIRMED && Number.isFinite(value) && value > 0 ? `$${value}` : "TBD";
}

export type Settlement = {
  /** null while the Cup is still genuinely in play. */
  winner: "strong-mental" | "grass-roots" | null;
  decided: boolean;
  /** Per player on the winning side: team money back plus opponent money. */
  winnerPayout: number;
  /** Per player on the losing side. Negative. */
  loserPayout: number;
};

/** Winning side gets their $100 back plus $100 from each opponent. */
export function settlement(matches: ScoredMatch[]): Settlement {
  const standings = tallyStandings(matches);
  const clinch = clinchSummary(standings);
  const decided = Boolean(clinch.clinchedBy);
  return {
    winner: clinch.clinchedBy,
    decided,
    winnerPayout: TEAM_MONEY_PER_PLAYER * 2,
    loserPayout: -TEAM_MONEY_PER_PLAYER,
  };
}

/** Side cash won per player name, biggest first. */
export function sideCashByPlayer(bets: PurseBet[]): { name: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const bet of bets) {
    if (!bet.player_name) continue;
    const name = bet.player_name.trim();
    totals.set(name, (totals.get(name) ?? 0) + Number(bet.amount));
  }
  return [...totals.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}
