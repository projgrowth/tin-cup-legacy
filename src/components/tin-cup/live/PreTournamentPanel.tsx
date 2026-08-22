import { Link } from "@tanstack/react-router";

import { BrandMark } from "@/components/tin-cup/BrandMark";
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
import { useLiveCountdown } from "@/lib/use-live-countdown";
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
  const time = useLiveCountdown();
  const remain = time.done
    ? null
    : time.remaining < 86_400_000
      ? `${String(time.hours + time.days * 24).padStart(2, "0")}:${String(time.minutes).padStart(2, "0")}:${String(time.seconds).padStart(2, "0")}`
      : `${time.days}d ${String(time.hours).padStart(2, "0")}h ${String(time.minutes).padStart(2, "0")}m`;

  return (
    <section aria-label="This weekend">
      <article className="mx-auto max-w-sm px-1 py-8 text-center sm:py-12">
        <BrandMark size="lg" decorative className="mx-auto" />
        <h1 className="t-display mt-5 text-foreground">{EVENT.title}</h1>
        <p className="t-micro mt-4">
          {EVENT.dates}
          <span className="mt-1 block">{EVENT.location}</span>
        </p>
        <p suppressHydrationWarning className="t-micro mt-3">
          Friday 12:19 · {COURSE_LABEL[nextCourseId]} · {today.points} pts
          {remain ? ` · ${remain}` : ""}
        </p>
        {tonight ? <p className="t-micro mt-1">Tonight · {tonight.title}</p> : null}
        <p className="t-micro mt-3">{EVENT.subtitle}</p>
        {!isClaimed ? (
          <a
            href={venmoUrl}
            target="_blank"
            rel="noreferrer"
            className="press btn-primary t-body mt-6 flex min-h-11 w-full justify-center"
          >
            Pay ${BUY_IN}
          </a>
        ) : null}
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
      </article>

      {isClaimed && context ? (
        <div className="mx-auto max-w-sm px-1">
          <WeekendCommandCenter context={context} />
        </div>
      ) : null}

      {WHATSAPP_GROUP_CONFIGURED && (
        <div className="mx-auto max-w-sm px-1">
          <FieldChatLink className="!min-h-11 w-full" />
        </div>
      )}
    </section>
  );
}
