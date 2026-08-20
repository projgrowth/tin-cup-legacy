import type { Match, Player, Round } from "@/hooks/useTournament";
import { day1GroupForPlayer } from "@/lib/day1-pairings";
import type { BoardMode } from "@/lib/tin-cup";
import { playerInMatch, roundStatus } from "@/lib/scoring";

export type WeekendActionKind =
  | "sign-in"
  | "claim-player"
  | "loading-identity"
  | "finish-plan"
  | "view-pairing"
  | "follow-match"
  | "score-match"
  | "open-board"
  | "view-recap";

export type WeekendContext = {
  phase: BoardMode;
  player: Player | null;
  nextMatch: Match | null;
  nextRound: Round | null;
  partner: string | null;
  opponents: string | null;
  planProgress: { planned: number; total: number };
  syncHealth: "clean" | "pending" | "failed" | "conflict";
  nextAction: { kind: WeekendActionKind; label: string; href: string };
};

function teammateAndOpponents(match: Match, playerName: string) {
  const onA = match.side_a?.toLowerCase().includes(playerName.toLowerCase()) ?? false;
  const mine = (onA ? match.side_a : match.side_b) ?? "";
  const other = (onA ? match.side_b : match.side_a) ?? "";
  const partner = mine
    .split(/\s*[/&+]\s*/)
    .map((name) => name.trim())
    .find((name) => name && !name.toLowerCase().includes(playerName.toLowerCase()));
  return { partner: partner ?? null, opponents: other || null };
}

export function buildWeekendContext(input: {
  phase: BoardMode;
  signedIn: boolean;
  identityPending?: boolean;
  player?: Player | null;
  rounds: Round[];
  matches: Match[];
  canScore: boolean;
  plannedHoles?: number;
  pendingWrites?: number;
  failedWrites?: number;
  conflicts?: number;
}): WeekendContext {
  const player = input.player ?? null;
  const mine = player ? input.matches.filter((match) => playerInMatch(match, player.name)) : [];
  const roundWeight = (match: Match) => {
    const round = input.rounds.find((candidate) => candidate.id === match.round_id);
    if (!round) return 9;
    const status = roundStatus(round);
    return status === "live" ? 0 : status === "upcoming" ? 1 : 2;
  };
  const nextMatch =
    [...mine].sort((a, b) => roundWeight(a) - roundWeight(b) || a.sort_order - b.sort_order)[0] ??
    null;
  const nextRound = nextMatch
    ? (input.rounds.find((round) => round.id === nextMatch.round_id) ?? null)
    : null;
  const pairing = nextMatch && player ? teammateAndOpponents(nextMatch, player.name) : null;
  const day1 = player ? day1GroupForPlayer(player.name) : null;
  const syncHealth =
    (input.conflicts ?? 0)
      ? "conflict"
      : (input.failedWrites ?? 0)
        ? "failed"
        : (input.pendingWrites ?? 0)
          ? "pending"
          : "clean";

  let nextAction: WeekendContext["nextAction"];
  if (!input.signedIn) {
    nextAction = { kind: "sign-in", label: "Sign in · claim your spot", href: "/profile" };
  } else if (input.identityPending) {
    nextAction = { kind: "loading-identity", label: "Loading your weekend…", href: "/" };
  } else if (!player) {
    nextAction = { kind: "claim-player", label: "Claim your roster name", href: "/profile" };
  } else if (input.phase === "post") {
    nextAction = { kind: "view-recap", label: "View the weekend recap", href: "/?story=recap" };
  } else if (input.phase === "live" && nextMatch?.result === "pending") {
    nextAction = input.canScore
      ? { kind: "score-match", label: "Score the next open match", href: "/?score=true" }
      : { kind: "follow-match", label: "Follow my match", href: "/" };
  } else if (input.phase === "live") {
    nextAction = { kind: "open-board", label: "Open the live board", href: "/" };
  } else if ((input.plannedHoles ?? 0) < 18) {
    nextAction = {
      kind: "finish-plan",
      label: (input.plannedHoles ?? 0) ? "Continue my course plan" : "Plan my first round",
      href: "/scout",
    };
  } else {
    nextAction = { kind: "view-pairing", label: "View my Friday pairing", href: "/schedule" };
  }

  return {
    phase: input.phase,
    player,
    nextMatch,
    nextRound,
    partner: pairing?.partner ?? day1?.partner ?? null,
    opponents: pairing?.opponents ?? day1?.opponents ?? null,
    planProgress: { planned: Math.max(0, Math.min(18, input.plannedHoles ?? 0)), total: 18 },
    syncHealth,
    nextAction,
  };
}
