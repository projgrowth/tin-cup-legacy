import { ClubhousePolls } from "@/components/tin-cup/ClubhousePolls";
import { Countdown } from "@/components/tin-cup/Countdown";
import { TheCardSheet } from "@/components/tin-cup/TheCardSheet";
import { useAuth } from "@/hooks/useAuth";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { COURSE_DETAILS, COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";
import { yourGroupLine } from "@/lib/day1-pairings";
import { BUY_IN, venmoUrl } from "@/lib/tin-cup";
import type { WeekendContext } from "@/lib/weekend-context";

/** Pre-event Home — first tee, Faceoff, poll, board. Dinner lives on Weekend. */
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

  return (
    <section aria-label="This weekend" className="space-y-8">
      <header>
        <p className="t-eyebrow">
          {today.dayLabel} · {COURSE_LABEL[nextCourseId]}
        </p>
        <h1 className="t-hero mt-1 text-foreground">{today.firstTee}</h1>
        {groupLine ? (
          <p className="t-body mt-3 font-semibold text-foreground">{groupLine}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Countdown compact />
          <a
            href={venmoUrl}
            target="_blank"
            rel="noreferrer"
            className="press chip chip-on min-h-11"
          >
            Pay ${BUY_IN}
          </a>
        </div>
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
