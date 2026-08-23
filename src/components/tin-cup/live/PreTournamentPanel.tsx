import { Link } from "@tanstack/react-router";

import { PageMasthead } from "@/components/tin-cup/PageMasthead";
import { TheCardSheet } from "@/components/tin-cup/TheCardSheet";
import { FieldChatLink, InstallHint } from "@/components/tin-cup/WhatsAppLinks";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { Countdown } from "@/components/tin-cup/Countdown";
import { COURSE_DETAILS, COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";

import {
  BUY_IN,
  VENMO_IS_PLACEHOLDER,
  WEEKEND_SOCIAL,
  WHATSAPP_GROUP_CONFIGURED,
  venmoUrl,
} from "@/lib/tin-cup";
import type { WeekendContext } from "@/lib/weekend-context";

/** Pre-event Home — clock, Faceoff, Field. Same kit as Weekend. */
export function PreTournamentPanel({
  rounds = [],
  matches = [],
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

      <TheCardSheet matches={matches} rounds={rounds} players={players} teams={teams} />

      <div className="surface divide-y divide-border overflow-hidden empty:hidden">
        <a
          href={venmoUrl}
          target="_blank"
          rel="noreferrer"
          className={`press flex min-h-12 items-center justify-between px-4 py-3 ${
            claimedName ? "" : "bg-hunter/10"
          }`}
        >
          <span className={`t-body font-medium ${claimedName ? "text-foreground" : "text-hunter"}`}>
            Pay ${BUY_IN}
          </span>
          <span className="t-micro">{claimedName ? "Venmo" : "Due"}</span>
        </a>
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
    </section>
  );
}
