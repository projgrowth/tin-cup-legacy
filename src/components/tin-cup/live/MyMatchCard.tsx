import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { MatchCard } from "@/components/tin-cup/MatchCard";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { day1GroupForPlayer } from "@/lib/day1-pairings";
import { COURSE_LABEL, courseIdFromRound, defaultCourseId, type CourseId } from "@/lib/courses";
import { matchFormatChip, playerInMatch, pairingIncludesLoose, roundStatus } from "@/lib/scoring";

type Featured = {
  kind: "match";
  match: Match;
  round: Round;
  sideA: string;
  sideB: string;
  onA: boolean;
};

type Day1Fallback = {
  kind: "day1";
  sideA: string;
  sideB: string;
  onA: boolean;
  partner: string;
  matchIndex: number;
};

function pickFeatured(
  claimedName: string,
  rounds: Round[],
  matches: Match[],
): Featured | Day1Fallback | null {
  const mine = matches.filter((m) => playerInMatch(m, claimedName));
  const statusWeight = (slug: string) => {
    const r = rounds.find((x) => x.id === slug);
    if (!r) return 9;
    const s = roundStatus(r);
    if (s === "live") return 0;
    if (s === "upcoming") return 1;
    return 2;
  };

  const sorted = [...mine].sort((a, b) => {
    const wa = statusWeight(a.round_id);
    const wb = statusWeight(b.round_id);
    if (wa !== wb) return wa - wb;
    // Prefer open matches over decided when same round priority
    const pa = a.result === "pending" ? 0 : 1;
    const pb = b.result === "pending" ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return a.sort_order - b.sort_order;
  });

  const top = sorted[0];
  if (top) {
    const round = rounds.find((r) => r.id === top.round_id);
    if (round) {
      const onA = pairingIncludesLoose(top.side_a, claimedName);
      return {
        kind: "match",
        match: top,
        round,
        sideA: top.side_a ?? "TBD",
        sideB: top.side_b ?? "TBD",
        onA,
      };
    }
  }

  // No lineup yet — Day 1 static group for claimed player
  const d1 = day1GroupForPlayer(claimedName);
  if (!d1) return null;
  return {
    kind: "day1",
    sideA: d1.pairing.sideA,
    sideB: d1.pairing.sideB,
    onA: d1.side === "a",
    partner: d1.partner,
    matchIndex: d1.pairing.matchIndex,
  };
}

function resultLabel(result: string): string | null {
  if (result === "pending") return null;
  if (result === "halved") return "Halved";
  if (result === "strong-mental") return "Strong Mental";
  if (result === "grass-roots") return "Grass Roots";
  return result;
}

/**
 * Claimed-player spotlight on Live — who you play, format, course planner link.
 */
export function MyMatchCard({
  claimedName,
  rounds,
  matches,
  players,
  teams,
  canScore = false,
}: {
  claimedName: string;
  rounds: Round[];
  matches: Match[];
  players: Player[];
  teams: Team[];
  canScore?: boolean;
}) {
  const featured = useMemo(
    () => pickFeatured(claimedName, rounds, matches),
    [claimedName, rounds, matches],
  );
  const avatars = usePlayerAvatars(players, teams);

  if (!featured) return null;

  const sideA = featured.sideA;
  const sideB = featured.sideB;
  const planCourse: CourseId =
    featured.kind === "match" ? (courseIdFromRound(featured.round) ?? "south") : "south";
  const status = featured.kind === "match" ? roundStatus(featured.round) : "upcoming";
  const formatChip =
    featured.kind === "match" ? matchFormatChip(featured.match.label) : "Scramble · Alt shot";
  const pointsChip = featured.kind === "match" ? featured.match.points : 2;
  const dayLine =
    featured.kind === "match"
      ? `${featured.round.day_label} · ${featured.round.course}`
      : `Friday · Match ${featured.matchIndex}`;
  const result = featured.kind === "match" ? resultLabel(featured.match.result) : null;
  const live = status === "live";
  const decided = featured.kind === "match" && featured.match.result !== "pending";
  const peopleA = (avatars.data?.forSide(sideA) ?? []).map((e) => ({
    name: e.name,
    teamSlug: e.teamSlug,
    src: e.url,
  }));
  const peopleB = (avatars.data?.forSide(sideB) ?? []).map((e) => ({
    name: e.name,
    teamSlug: e.teamSlug,
    src: e.url,
  }));

  return (
    <MatchCard
      size="feature"
      index={dayLine}
      sideA={sideA}
      sideB={sideB}
      peopleA={peopleA}
      peopleB={peopleB}
      format={formatChip}
      points={pointsChip}
      yours
      yoursOnA={featured.onA}
      live={live && !decided}
      result={result}
      action={
        <div className="flex flex-wrap items-center gap-x-4">
          <Link
            to="/scout"
            search={{ course: planCourse, card: true }}
            className="press t-micro inline-flex min-h-11 items-center font-semibold text-foreground"
          >
            Plan {COURSE_LABEL[planCourse]}
          </Link>
          {canScore && featured.kind === "match" && !decided ? (
            <Link
              to="/"
              search={{ score: true, match: featured.match.id }}
              className="press t-micro inline-flex min-h-11 items-center font-semibold text-hunter"
            >
              Post result
            </Link>
          ) : null}
        </div>
      }
    />
  );
}
