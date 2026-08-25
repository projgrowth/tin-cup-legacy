import { Link } from "@tanstack/react-router";

import { ClubhousePolls } from "@/components/tin-cup/ClubhousePolls";
import { Countdown } from "@/components/tin-cup/Countdown";
import { TheCardSheet } from "@/components/tin-cup/TheCardSheet";
import { useAuth } from "@/hooks/useAuth";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { COURSE_DETAILS, COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";
import { yourGroupLine } from "@/lib/day1-pairings";
import { BUY_IN, EVENT, WEEKEND_SOCIAL, venmoUrl } from "@/lib/tin-cup";
import type { WeekendContext } from "@/lib/weekend-context";

/** Pre-event Home — next tee, your match, Faceoff, poll. Not a pairings dump. */
export function PreTournamentPanel({
  rounds = [],
  matches = [],
  players = [],
  teams = [],
  claimedName = null,
  canModerate = false,
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
  canModerate?: boolean;
}) {
  const { user } = useAuth();
  const nextCourseId = defaultCourseId() as CourseId;
  const today = COURSE_DETAILS[nextCourseId];
  const groupLine = claimedName ? yourGroupLine(claimedName) : null;
  const tonight = WEEKEND_SOCIAL.find((row) => row.day === today.dayLabel);
  const tonightChip = tonight?.title.includes("Salamander")
    ? "Tonight · Salamander"
    : tonight
      ? `Tonight · ${tonight.title}`
      : null;

  return (
    <section aria-label="This weekend" className="space-y-8">
      <header className="space-y-3 px-1">
        <h1 className="t-title text-foreground">
          {today.dayLabel} · {COURSE_LABEL[nextCourseId]} · {today.firstTee}
        </h1>
        {groupLine ? <p className="t-body font-semibold text-foreground">{groupLine}</p> : null}
        <div className="flex flex-wrap gap-2">
          <a
            href={venmoUrl}
            target="_blank"
            rel="noreferrer"
            className="press chip chip-on min-h-11"
          >
            Pay ${BUY_IN}
          </a>
          {tonightChip ? (
            <Link to="/schedule" className="press chip min-h-11">
              {tonightChip}
            </Link>
          ) : null}
          <span className="chip min-h-11">
            Fri 8 + Sat 6 + Sun 12 = {EVENT.totalPoints}. {EVENT.pointsToWin} to win.
          </span>
        </div>
        <Countdown compact />
      </header>

      <TheCardSheet matches={matches} rounds={rounds} players={players} teams={teams} />

      <ClubhousePolls players={players} teams={teams} canCreate={canModerate && Boolean(user)} />
    </section>
  );
}

/** Install / WhatsApp stay off Home. Kept so live mode callers compile. */
export function HomeWeekendDoors(_props: {
  signedIn?: boolean;
  claimedName?: string | null;
  players?: Player[];
  teams?: Team[];
}) {
  return null;
}
