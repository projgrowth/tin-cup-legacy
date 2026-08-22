import { Link } from "@tanstack/react-router";

import { MatchCard } from "@/components/tin-cup/MatchCard";
import { PageMasthead } from "@/components/tin-cup/PageMasthead";
import { FieldChatLink } from "@/components/tin-cup/WhatsAppLinks";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { Countdown } from "@/components/tin-cup/Countdown";
import { COURSE_DETAILS, COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";
import { day1GroupForPlayer } from "@/lib/day1-pairings";
import {
  BUY_IN,
  VENMO_IS_PLACEHOLDER,
  WEEKEND_SOCIAL,
  WHATSAPP_GROUP_CONFIGURED,
  venmoUrl,
} from "@/lib/tin-cup";
import type { WeekendContext } from "@/lib/weekend-context";

/** Pre-event Home — next session, your match, Pay. Same kit as Weekend. */
export function PreTournamentPanel({
  rounds: _rounds = [],
  matches: _matches = [],
  players = [],
  teams = [],
  canUpload: _canUpload = false,
  signedIn = false,
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
  const nextCourseId = defaultCourseId() as CourseId;
  const today = COURSE_DETAILS[nextCourseId];
  const tonight = WEEKEND_SOCIAL.find((row) => row.day === today.dayLabel);
  const avatars = usePlayerAvatars(players, teams);
  const group = claimedName ? day1GroupForPlayer(claimedName) : null;
  const face = (name: string) => avatars.data?.getByName(name);

  return (
    <section aria-label="This weekend" className="stack-tight">
      <PageMasthead
        title={
          <>
            {today.dayLabel} · {COURSE_LABEL[nextCourseId]}
          </>
        }
        meta={
          <>
            {today.firstTee} · {today.format}
            {` · ${today.points} pts`}
          </>
        }
      />
      <Countdown />

      {group ? (
        <div>
          <p className="t-micro px-1 pb-1.5 font-semibold text-foreground">Your match</p>
          <div className="surface overflow-hidden">
            <MatchCard
              size="row"
              index={group.pairing.matchIndex}
              sideA={group.pairing.sideA}
              sideB={group.pairing.sideB}
              peopleA={group.pairing.playersA.map((name) => ({
                name,
                teamSlug: "strong-mental",
                src: face(name)?.url,
              }))}
              peopleB={group.pairing.playersB.map((name) => ({
                name,
                teamSlug: "grass-roots",
                src: face(name)?.url,
              }))}
              yours
              yoursOnA={group.side === "a"}
            />
          </div>
        </div>
      ) : null}

      <a
        href={venmoUrl}
        target="_blank"
        rel="noreferrer"
        className="press btn-primary t-body flex min-h-11 w-full justify-center"
      >
        Pay ${BUY_IN}
      </a>

      {tonight ? (
        <Link
          to="/schedule"
          className="press t-micro flex min-h-11 items-center px-1 font-semibold text-foreground"
        >
          Tonight · {tonight.title}
        </Link>
      ) : null}

      {VENMO_IS_PLACEHOLDER && (
        <p className="t-micro px-1 text-copper">Set VITE_VENMO_HANDLE before the weekend.</p>
      )}
      {WHATSAPP_GROUP_CONFIGURED && (
        <FieldChatLink className="!min-h-11 w-full" />
      )}
    </section>
  );
}
