import { Link } from "@tanstack/react-router";

import { MatchLiveCard } from "@/components/tin-cup/MatchLiveCard";
import { TheCardSheet } from "@/components/tin-cup/TheCardSheet";
import { FieldChatLink, InstallHint } from "@/components/tin-cup/WhatsAppLinks";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { Countdown } from "@/components/tin-cup/Countdown";
import { CupDigest } from "@/components/tin-cup/live/ScoreBoard";
import { COURSE_DETAILS, COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";

import { day1GroupForPlayer, yourGroupLine } from "@/lib/day1-pairings";
import { useAuth } from "@/hooks/useAuth";
import {
  VENMO_IS_PLACEHOLDER,
  WEEKEND_SOCIAL,
  WHATSAPP_GROUP_CONFIGURED,
} from "@/lib/tin-cup";
import type { WeekendContext } from "@/lib/weekend-context";

/** Pre-event Home — clock, Faceoff, Field. Same kit as Weekend. */
export function PreTournamentPanel({
  rounds = [],
  matches = [],
  players = [],
  teams = [],
  canUpload: _canUpload = false,
  signedIn: _signedIn = false,
  claimedName = null,
  needsClaim: _needsClaim = false,
  context: _context,
}: {
  rounds?: Round[];
  matches?: Match[];
  players?: Player[];
  teams?: Team[];
  canUpload?: boolean;
  signedIn?: boolean;
  claimedName?: string | null;
  needsClaim?: boolean;
  context?: WeekendContext;
}) {
  const { canScore } = useAuth();
  const nextCourseId = defaultCourseId() as CourseId;
  const d1 = claimedName ? day1GroupForPlayer(claimedName) : null;
  const today = COURSE_DETAILS[nextCourseId];
  const groupLine = claimedName ? yourGroupLine(claimedName) : null;

  return (
    <section aria-label="This weekend" className="space-y-5">
      <div>
        <Countdown />
        <header className="px-1 text-center">
          <h1 className="t-title text-foreground">
            {today.dayLabel} · {COURSE_LABEL[nextCourseId]}
          </h1>
          <p className="t-micro mt-1">{today.firstTee}</p>
        </header>
        {claimedName ? <div className="mt-3"><CupDigest matches={matches} quiet /></div> : null}
        {groupLine ? (
          <div className="mt-2 space-y-1 px-1 text-center">
            <p className="text-sm font-semibold text-foreground">{groupLine}</p>
            <Link
              to="/scout"
              search={{ course: "south" }}
              className="t-micro text-muted-foreground underline-offset-2 hover:underline"
            >
              Friday book · South
            </Link>
          </div>
        ) : null}
      </div>

      {d1 ? (
        <MatchLiveCard
          claimedName={claimedName}
          players={players}
          match={matches.find((row) => playerSides(row, d1.pairing.sideA, d1.pairing.sideB)) ?? null}
          day1Index={d1.pairing.matchIndex}
          sideA={d1.pairing.sideA}
          sideB={d1.pairing.sideB}
          formatLabel="Scramble · Alt shot"
          canScore={canScore}
        />
      ) : null}
      <TheCardSheet matches={matches} rounds={rounds} players={players} teams={teams} />
    </section>
  );
}

/** Pay / tonight / install — after Field, not in the hangout spine. */
export function HomeWeekendDoors({
  signedIn = false,
  claimedName = null,
  players = [],
  teams = [],
}: {
  signedIn?: boolean;
  claimedName?: string | null;
  players?: Player[];
  teams?: Team[];
}) {
  const nextCourseId = defaultCourseId() as CourseId;
  const today = COURSE_DETAILS[nextCourseId];
  const tonight = WEEKEND_SOCIAL.find((row) => row.day === today.dayLabel);
  const avatars = usePlayerAvatars(players, teams);
  const face = (name: string) => avatars.data?.getByName(name);

  return (
    <div className="stack-tight">
      <div className="surface divide-y divide-border overflow-hidden empty:hidden">
        {signedIn && claimedName && !face(claimedName)?.url ? (
          <Link
            to="/profile"
            className="press flex min-h-11 items-center justify-between px-4 py-3"
          >
            <span className="t-body font-medium text-foreground">Add your face</span>
            <span className="t-micro">Account</span>
          </Link>
        ) : null}
        {tonight ? (
          <Link
            to="/schedule"
            className="press flex min-h-11 items-center justify-between px-4 py-3"
          >
            <span className="t-body font-medium text-foreground">Tonight · {tonight.title}</span>
            <span className="t-micro">Weekend</span>
          </Link>
        ) : null}
        <InstallHint embedded />
      </div>
      {VENMO_IS_PLACEHOLDER && (
        <p className="t-micro px-1 text-copper">Set VITE_VENMO_HANDLE before the weekend.</p>
      )}
      {WHATSAPP_GROUP_CONFIGURED && <FieldChatLink className="!min-h-11 w-full" />}
    </div>
  );
}

function playerSides(
  match: Match,
  sideA: string,
  sideB: string,
): boolean {
  return (match.side_a ?? "") === sideA && (match.side_b ?? "") === sideB;
}
