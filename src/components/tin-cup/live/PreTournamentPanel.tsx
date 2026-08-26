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
      <div className="stack-tight">
        <header>
          <p className="t-eyebrow">
            {today.dayLabel} · {COURSE_LABEL[nextCourseId]}
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <h1 className="t-hero min-w-0 text-foreground">{today.firstTee}</h1>
            <p className="flex shrink-0 items-baseline gap-x-1.5 whitespace-nowrap">
              <Countdown compact />
              <span className="t-micro" aria-hidden="true">
                ·
              </span>
              <a
                href={venmoUrl}
                target="_blank"
                rel="noreferrer"
                className="press t-micro-strong py-2 no-underline"
              >
                Pay ${BUY_IN}
              </a>
            </p>
          </div>
        </header>

        <TheCardSheet
          claimedName={claimedName}
          playerIdByName={playerIdByName}
          players={players}
          teams={teams}
        />
      </div>

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
