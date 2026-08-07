/**
 * Pure PGA-style wire event derivation from tournament snapshots.
 * No React — unit tested. UI/toasts live in useLiveWire + LiveWireTicker.
 */
import { formatPayout } from "@/lib/purse";
import { clinchSummary, tallyStandings, type ScoredMatch } from "@/lib/scoring";
import { isCtp, isLongDrive, sideBetShortLabel } from "@/lib/side-bets";
import { teamShortName } from "@/lib/team-styles";

export type WireKind =
  | "match-final"
  | "match-reopen"
  | "pairing"
  | "cup"
  | "side-bet"
  | "photo"
  | "claim";

export type WirePriority = "high" | "normal" | "low";

export type WireEvent = {
  id: string;
  kind: WireKind;
  priority: WirePriority;
  at: number;
  title: string;
  subtitle?: string;
  /** strong-mental | grass-roots | null for neutral */
  teamSlug?: string | null;
  matchId?: string;
  sideBetId?: string;
};

export type MatchSnap = {
  id: string;
  label: string;
  points: number | string;
  result: string;
  side_a: string | null;
  side_b: string | null;
  round_id?: string;
  updated_at?: string | null;
  revision?: number | null;
};

function asScored(matches: MatchSnap[]): ScoredMatch[] {
  return matches.map((m) => ({
    id: m.id,
    round_id: m.round_id ?? "",
    points: m.points,
    result: m.result,
  }));
}

export type SideBetSnap = {
  id: string;
  kind: string;
  label: string;
  amount: number | string;
  player_name: string | null;
  team_slug: string | null;
  hole?: number | null;
  updated_at?: string | null;
};

export type SocialSnap = {
  id: string;
  kind: "photo" | "claim";
  title: string;
  subtitle?: string;
  at: string;
  teamSlug?: string | null;
};

export type WireSnapshot = {
  matches: MatchSnap[];
  sideBets: SideBetSnap[];
  social?: SocialSnap[];
};

const RESULT_WIRE: Record<string, string> = {
  "strong-mental": "Strong Mental",
  "grass-roots": "Grass Roots",
  halved: "Halved",
};

function resultLabel(result: string): string {
  return RESULT_WIRE[result] ?? result;
}

function cupLine(matches: MatchSnap[]): string {
  const s = tallyStandings(asScored(matches));
  const sm = formatPts(s.strongMental);
  const gr = formatPts(s.grassRoots);
  return `Cup ${sm}–${gr}`;
}

function formatPts(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function winnerSlug(result: string): string | null {
  if (result === "strong-mental" || result === "grass-roots") return result;
  return null;
}

function sidesChanged(prev: MatchSnap, next: MatchSnap): boolean {
  return (prev.side_a ?? "") !== (next.side_a ?? "") || (prev.side_b ?? "") !== (next.side_b ?? "");
}

function shortSide(text: string | null): string {
  if (!text?.trim()) return "TBD";
  const parts = text.split(/[,/&]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return "TBD";
  if (parts.length === 1) return parts[0]!.split(/\s+/)[0] ?? parts[0]!;
  return parts.map((p) => p.split(/\s+/)[0] ?? p).join("/");
}

/**
 * Diff two snapshots into ordered wire events (newest first after sort by caller).
 * First snapshot (prev null) produces no events — avoids toast spam on load.
 */
export function diffWireEvents(
  prev: WireSnapshot | null,
  next: WireSnapshot,
  now = Date.now(),
): WireEvent[] {
  if (!prev) return [];

  const events: WireEvent[] = [];
  const prevMatch = new Map(prev.matches.map((m) => [m.id, m]));
  const prevBet = new Map(prev.sideBets.map((b) => [b.id, b]));
  const prevSocial = new Set((prev.social ?? []).map((s) => s.id));

  let anyMatchFinal = false;

  for (const m of next.matches) {
    const p = prevMatch.get(m.id);
    if (!p) continue;

    if (p.result !== m.result) {
      if (m.result !== "pending" && p.result === "pending") {
        anyMatchFinal = true;
        events.push({
          id: `match-final-${m.id}-${m.revision ?? m.updated_at ?? now}`,
          kind: "match-final",
          priority: "high",
          at: now,
          title: `${m.label} final · ${resultLabel(m.result)}`,
          subtitle: `${Number(m.points)} pt${Number(m.points) === 1 ? "" : "s"} · ${cupLine(next.matches)}`,
          teamSlug: winnerSlug(m.result),
          matchId: m.id,
        });
      } else if (m.result === "pending" && p.result !== "pending") {
        events.push({
          id: `match-reopen-${m.id}-${now}`,
          kind: "match-reopen",
          priority: "normal",
          at: now,
          title: `${m.label} reopened`,
          subtitle: "Result cleared",
          matchId: m.id,
        });
      } else if (m.result !== "pending") {
        anyMatchFinal = true;
        events.push({
          id: `match-final-${m.id}-${m.revision ?? m.updated_at ?? now}`,
          kind: "match-final",
          priority: "high",
          at: now,
          title: `${m.label} · ${resultLabel(m.result)}`,
          subtitle: cupLine(next.matches),
          teamSlug: winnerSlug(m.result),
          matchId: m.id,
        });
      }
    } else if (sidesChanged(p, m) && (m.side_a || m.side_b)) {
      events.push({
        id: `pairing-${m.id}-${m.revision ?? now}`,
        kind: "pairing",
        priority: "normal",
        at: now,
        title: `${m.label} sides locked`,
        subtitle: `${shortSide(m.side_a)} vs ${shortSide(m.side_b)}`,
        matchId: m.id,
      });
    }
  }

  if (anyMatchFinal) {
    const before = tallyStandings(asScored(prev.matches));
    const after = tallyStandings(asScored(next.matches));
    if (
      before.strongMental !== after.strongMental ||
      before.grassRoots !== after.grassRoots
    ) {
      const clinch = clinchSummary(after);
      let sub = `${formatPts(after.remaining)} pts left`;
      if (clinch.clinchedBy) {
        sub = `${teamShortName(clinch.clinchedBy)} clinches the Cup`;
      } else if (clinch.leader) {
        sub = `${teamShortName(clinch.leader)} needs ${clinch.leaderNeeds}`;
      } else {
        sub = `All square · ${sub}`;
      }
      events.push({
        id: `cup-${after.strongMental}-${after.grassRoots}-${now}`,
        kind: "cup",
        priority: "high",
        at: now,
        title: `Cup moves · ${formatPts(after.strongMental)}–${formatPts(after.grassRoots)}`,
        subtitle: sub,
        teamSlug: clinch.clinchedBy ?? clinch.leader,
      });
    }
  }

  for (const b of next.sideBets) {
    const p = prevBet.get(b.id);
    if (!p) continue;
    const wasOpen = !p.player_name?.trim();
    const nowNamed = Boolean(b.player_name?.trim());
    if (wasOpen && nowNamed) {
      const kind = isCtp(b.kind) || isLongDrive(b.kind) ? sideBetShortLabel(b.kind) : b.label;
      events.push({
        id: `side-${b.id}-${b.player_name}-${b.updated_at ?? now}`,
        kind: "side-bet",
        priority: "high",
        at: now,
        title: `${kind} claimed · ${b.player_name!.trim().split(/\s+/)[0]}`,
        subtitle: `${b.label} · ${formatPayout(b.amount)}`,
        teamSlug: b.team_slug,
        sideBetId: b.id,
      });
    } else if (
      p.player_name?.trim() &&
      b.player_name?.trim() &&
      p.player_name.trim() !== b.player_name.trim()
    ) {
      events.push({
        id: `side-chg-${b.id}-${b.player_name}-${now}`,
        kind: "side-bet",
        priority: "normal",
        at: now,
        title: `${b.label} → ${b.player_name!.trim().split(/\s+/)[0]}`,
        subtitle: formatPayout(b.amount),
        teamSlug: b.team_slug,
        sideBetId: b.id,
      });
    }
  }

  for (const s of next.social ?? []) {
    if (prevSocial.has(s.id)) continue;
    events.push({
      id: s.id,
      kind: s.kind,
      priority: "low",
      at: Date.parse(s.at) || now,
      title: s.title,
      subtitle: s.subtitle,
      teamSlug: s.teamSlug,
    });
  }

  return events;
}

/** Coalesce high-priority batch for a single toast. */
export function coalesceWireToast(events: WireEvent[]): { title: string; subtitle?: string } | null {
  const high = events.filter((e) => e.priority === "high");
  if (high.length === 0) return null;
  const finals = high.filter((e) => e.kind === "match-final");
  const cup = high.find((e) => e.kind === "cup");
  if (finals.length >= 2) {
    return {
      title: `${finals.length} matches decided`,
      subtitle: cup?.title ?? finals[0]?.subtitle,
    };
  }
  const top = high[0]!;
  return { title: top.title, subtitle: top.subtitle ?? cup?.title };
}

export function priorityRank(p: WirePriority): number {
  if (p === "high") return 0;
  if (p === "normal") return 1;
  return 2;
}

export function sortWireEvents(events: WireEvent[]): WireEvent[] {
  return [...events].sort((a, b) => {
    if (a.at !== b.at) return b.at - a.at;
    return priorityRank(a.priority) - priorityRank(b.priority);
  });
}
