import { Link } from "@tanstack/react-router";

import { FieldChatLink } from "@/components/tin-cup/WhatsAppLinks";

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
import { useLiveCountdown } from "@/lib/use-live-countdown";
import type { WeekendContext } from "@/lib/weekend-context";

/** Guest Home — invite only. No film, no HUD, no command center, no gold PNG. */
export function PreTournamentPanel({
  rounds: _rounds = [],
  matches: _matches = [],
  players: _players = [],
  teams: _teams = [],
  canUpload: _canUpload = false,
  signedIn: _signedIn = false,
  claimedName: _claimedName = null,
  needsClaim = false,
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
  const time = useLiveCountdown();
  const remain = time.done
    ? null
    : `${time.days}d ${String(time.hours).padStart(2, "0")}h`;

  return (
    <section aria-label="This weekend" className="mx-auto max-w-sm px-1 py-10 text-center">
      <p className="t-micro font-semibold tracking-[0.2em] text-hunter">TIN CUP</p>
      <h1 className="t-title mt-4 text-foreground">{EVENT.title}</h1>
      <p className="t-micro mt-4">{EVENT.dates}</p>
      <p className="t-micro mt-1">{EVENT.location}</p>
      <p suppressHydrationWarning className="t-micro mt-3">
        Friday 12:19 · {COURSE_LABEL[nextCourseId]} · {today.points} pts
        {remain ? ` · ${remain}` : ""}
      </p>
      {tonight ? <p className="t-micro mt-1">Tonight · {tonight.title}</p> : null}
      <p className="t-micro mt-3">{EVENT.subtitle}</p>
      <a
        href={venmoUrl}
        target="_blank"
        rel="noreferrer"
        className="press btn-primary t-body mt-8 flex min-h-11 w-full justify-center"
      >
        Pay ${BUY_IN}
      </a>
      {needsClaim ? (
        <Link
          to="/profile"
          className="press t-micro mt-2 inline-flex min-h-11 items-center text-muted-foreground"
        >
          Claim your name
        </Link>
      ) : null}
      {VENMO_IS_PLACEHOLDER && (
        <p className="t-micro mt-3 text-copper">Set VITE_VENMO_HANDLE before the weekend.</p>
      )}
      {WHATSAPP_GROUP_CONFIGURED && (
        <FieldChatLink className="mt-4 !min-h-11 w-full" />
      )}
    </section>
  );
}
