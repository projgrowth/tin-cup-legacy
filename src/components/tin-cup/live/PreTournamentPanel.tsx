import { ClubhousePolls } from "@/components/tin-cup/ClubhousePolls";
import { Countdown } from "@/components/tin-cup/Countdown";
import { HomeAnnouncement } from "@/components/tin-cup/HomeAnnouncement";
import { TheCardSheet } from "@/components/tin-cup/TheCardSheet";
import { useAuth } from "@/hooks/useAuth";
import type { Player, Team } from "@/hooks/useTournament";
import { COURSE_DETAILS, COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";
import { BUY_IN, venmoUrl } from "@/lib/tin-cup";

/** Pre-event Home — first tee, Faceoff, poll, board. Dinner lives on Weekend. */
export function PreTournamentPanel({
  players = [],
  teams = [],
  claimedName = null,
  canModerate = false,
}: {
  players?: Player[];
  teams?: Team[];
  claimedName?: string | null;
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
      <div className="surface overflow-hidden">
        <header className="card-row py-4">
          <p className="t-eyebrow">
            {today.dayLabel} · {COURSE_LABEL[nextCourseId]}
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <h1 className="t-hero min-w-0 text-foreground">{today.firstTee}</h1>
            <Countdown compact />
          </div>
          <a
            href={venmoUrl}
            target="_blank"
            rel="noreferrer"
            className="press btn-primary t-body mt-4 flex min-h-12 w-full items-center justify-center no-underline"
          >
            Pay ${BUY_IN}
          </a>
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
