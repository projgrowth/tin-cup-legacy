import { ClubhousePolls } from "@/components/tin-cup/ClubhousePolls";
import { Countdown } from "@/components/tin-cup/Countdown";
import { HomeAnnouncement } from "@/components/tin-cup/HomeAnnouncement";
import { TheCardSheet } from "@/components/tin-cup/TheCardSheet";
import { useAuth } from "@/hooks/useAuth";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { COURSE_DETAILS, COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";
import { BUY_IN, venmoUrl } from "@/lib/tin-cup";
import type { WeekendContext } from "@/lib/weekend-context";

/** Pre-event Home — first tee, Faceoff, poll, board. Dinner lives on Weekend. */
export function PreTournamentPanel({
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
  const playerIdByName = (name: string) =>
    players.find((player) => player.name.trim().toLowerCase() === name.trim().toLowerCase())?.id;

  return (
    <section aria-label="This weekend" className="stack-page">
      <HomeAnnouncement canModerate={canModerate} />
      <header className="px-4">
        <p className="t-eyebrow">
          {today.dayLabel} · {COURSE_LABEL[nextCourseId]}
        </p>
        <h1 className="t-hero mt-1 text-foreground">{today.firstTee}</h1>
        <div className="mt-3 flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1">
          <Countdown compact />
          <a
            href={venmoUrl}
            target="_blank"
            rel="noreferrer"
            className="press t-micro-strong no-underline"
          >
            Pay ${BUY_IN}
          </a>
        </div>
      </header>

      <TheCardSheet
        claimedName={claimedName}
        playerIdByName={playerIdByName}
        players={players}
        teams={teams}
      />

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
