import { Link } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { useMemo } from "react";

import { AvatarPair } from "@/components/tin-cup/Avatar";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { day1GroupForPlayer } from "@/lib/day1-pairings";
import {
  COURSE_LABEL,
  ROUND_COURSE,
  defaultCourseId,
  type CourseId,
} from "@/lib/courses";
import {
  matchFormatChip,
  playerInMatch,
  pairingIncludesLoose,
  roundStatus,
} from "@/lib/scoring";

function courseIdFromRound(round: Round): CourseId {
  if (ROUND_COURSE[round.slug]) return ROUND_COURSE[round.slug];
  const c = round.course.toLowerCase();
  if (c.includes("copperhead")) return "copperhead";
  if (c.includes("island")) return "island";
  if (c.includes("south")) return "south";
  return defaultCourseId();
}

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

function resultLabel(result: string, points: number): string {
  if (result === "pending") return `${points} pt`;
  if (result === "halved") return "½";
  if (result === "strong-mental") return "SM";
  if (result === "grass-roots") return "GR";
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
}: {
  claimedName: string;
  rounds: Round[];
  matches: Match[];
  players: Player[];
  teams: Team[];
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
    featured.kind === "match" ? courseIdFromRound(featured.round) : "south";
  const status =
    featured.kind === "match" ? roundStatus(featured.round) : "upcoming";
  const formatChip =
    featured.kind === "match"
      ? matchFormatChip(featured.match.label)
      : "Day 1";
  const pointsChip =
    featured.kind === "match" ? `${featured.match.points}pt` : "1pt";
  const dayLine =
    featured.kind === "match"
      ? `${featured.round.day_label} · ${featured.round.course}`
      : "Friday · South Course";
  const partnerHint =
    featured.kind === "day1"
      ? `w/ ${featured.partner.split(" ")[0]} · Match ${featured.matchIndex}`
      : null;
  const result =
    featured.kind === "match"
      ? resultLabel(featured.match.result, featured.match.points)
      : "Open";
  const live = status === "live";
  const decided =
    featured.kind === "match" && featured.match.result !== "pending";

  return (
    <section className="hud-pod border-gold/25 px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="hud-label text-gold-light/80">
            {live ? "My match · Live" : decided ? "My match · Final" : "My match"}
          </p>
          <p className="t-title mt-1.5 truncate text-foreground">{dayLine}</p>
          {partnerHint && (
            <p className="t-micro mt-0.5 text-muted-foreground">{partnerHint}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded-full border border-[var(--hud-border)] bg-black/25 px-2.5 py-1 t-micro font-semibold text-[var(--hud-muted)]">
              {formatChip}
            </span>
            <span className="rounded-full border border-gold/35 bg-gold/15 px-2.5 py-1 t-micro font-semibold text-gold-light">
              {pointsChip}
            </span>
          </span>
          <span
            className={`hud-num text-lg ${
              decided
                ? featured.kind === "match" && featured.match.result === "strong-mental"
                  ? "text-gold-light"
                  : featured.kind === "match" && featured.match.result === "grass-roots"
                    ? "text-copper"
                    : "text-foreground"
                : live
                  ? "text-copper"
                  : "text-muted-foreground"
            }`}
          >
            {result}
            {live && !decided ? (
              <span className="ml-1.5 text-[0.65rem] font-bold tracking-wider text-copper">
                LIVE
              </span>
            ) : null}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <AvatarPair
          people={(avatars.data?.forSide(sideA) ?? []).map((e) => ({
            name: e.name,
            teamSlug: e.teamSlug,
            src: e.url,
          }))}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="t-body truncate font-medium leading-snug">
            <span className={featured.onA ? "text-gold-light" : "text-foreground/90"}>
              {sideA}
            </span>
            <span className="mx-1.5 text-muted-foreground">vs</span>
            <span className={!featured.onA ? "text-copper" : "text-foreground/90"}>
              {sideB}
            </span>
          </p>
          <p className="t-micro mt-0.5 text-muted-foreground">
            You on {featured.onA ? "Strong Mental" : "Grass Roots"}
          </p>
        </div>
        <AvatarPair
          people={(avatars.data?.forSide(sideB) ?? []).map((e) => ({
            name: e.name,
            teamSlug: e.teamSlug,
            src: e.url,
          }))}
          size="md"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--hud-border)] pt-3">
        <Link
          to="/scout"
          search={{ course: planCourse, hole: 1 }}
          className="press t-micro inline-flex items-center gap-1.5 font-semibold text-foreground underline-offset-2 hover:underline"
        >
          <Map className="size-3.5 opacity-70" />
          Plan {COURSE_LABEL[planCourse]} →
        </Link>
        <Link
          to="/profile"
          className="press t-micro text-muted-foreground underline-offset-2 hover:underline"
        >
          My hub
        </Link>
      </div>
    </section>
  );
}
