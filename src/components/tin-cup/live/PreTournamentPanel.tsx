import { Link } from "@tanstack/react-router";

import { Countdown } from "@/components/tin-cup/Countdown";
import { PageMasthead } from "@/components/tin-cup/PageMasthead";
import { FieldChatLink } from "@/components/tin-cup/WhatsAppLinks";
import { WeekendCommandCenter } from "@/components/tin-cup/WeekendCommandCenter";

import {
  BUY_IN,
  EVENT,
  VENMO_IS_PLACEHOLDER,
  WEEKEND_SOCIAL,
  WHATSAPP_GROUP_CONFIGURED,
  venmoUrl,
} from "@/lib/tin-cup";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { COURSE_DETAILS, COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";
import type { WeekendContext } from "@/lib/weekend-context";

export function PreTournamentPanel({
  rounds: _rounds = [],
  matches: _matches = [],
  players: _players = [],
  teams: _teams = [],
  canUpload: _canUpload = false,
  signedIn = false,
  claimedName = null,
  needsClaim = false,
  context,
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
  const isClaimed = signedIn && Boolean(claimedName) && !needsClaim;
  const nextCourseId = defaultCourseId() as CourseId;
  const today = COURSE_DETAILS[nextCourseId];
  const tonight = WEEKEND_SOCIAL.find((row) => row.day === today.dayLabel);

  return (
    <section className="stack-page pb-4" aria-label="This weekend">
      <PageMasthead title={EVENT.title} meta={`${EVENT.dates} · ${EVENT.location}`}>
        <div className="mt-2">
          <Countdown />
        </div>
        <p className="t-micro mt-1">
          {COURSE_LABEL[nextCourseId]} · {today.points} pts
          {tonight ? ` · Tonight · ${tonight.title}` : ""}
        </p>
        <p className="t-micro mt-2">{EVENT.subtitle}</p>
        {!isClaimed ? (
          <a
            href={venmoUrl}
            target="_blank"
            rel="noreferrer"
            className="press btn-primary t-body mt-4 flex min-h-11 w-full max-w-sm justify-center"
          >
            Pay ${BUY_IN}
          </a>
        ) : null}
        {needsClaim ? (
          <Link
            to="/profile"
            className="press t-micro mt-1 inline-flex min-h-11 items-center text-muted-foreground"
          >
            Claim your name
          </Link>
        ) : null}
      </PageMasthead>

      {VENMO_IS_PLACEHOLDER && (
        <p className="t-micro text-copper">Set VITE_VENMO_HANDLE before the weekend.</p>
      )}

      {isClaimed && context ? <WeekendCommandCenter context={context} /> : null}

      {WHATSAPP_GROUP_CONFIGURED && <FieldChatLink className="!min-h-11 w-full" />}
    </section>
  );
}
