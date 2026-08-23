import { Link } from "@tanstack/react-router";

import { FridayFoursome } from "@/components/tin-cup/FridayFoursome";
import { LockerWall } from "@/components/tin-cup/LockerWall";
import { FieldChatLink, InstallHint } from "@/components/tin-cup/WhatsAppLinks";
import { useBanterVotes } from "@/hooks/useBanterVotes";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { Countdown } from "@/components/tin-cup/Countdown";
import { COURSE_DETAILS, COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";

import {
  VENMO_IS_PLACEHOLDER,
  WEEKEND_SOCIAL,
  WHATSAPP_GROUP_CONFIGURED,
} from "@/lib/tin-cup";
import type { WeekendContext } from "@/lib/weekend-context";

/** Pre-event Home — clock, foursome, one door, then the wall. */
export function PreTournamentPanel({
  rounds: _rounds = [],
  matches: _matches = [],
  players = [],
  teams = [],
  canUpload: _canUpload = false,
  signedIn: _signedIn = false,
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
  const { votes, prompts } = useBanterVotes();

  return (
    <section aria-label="This weekend" className="stack">
      <div>
        <Countdown />
        <p className="t-micro mt-0.5 px-1 text-center">
          {today.dayLabel} · {COURSE_LABEL[nextCourseId]} · {today.firstTee}
        </p>
      </div>

      {claimedName ? (
        <FridayFoursome
          claimedName={claimedName}
          players={players}
          teams={teams}
          votes={votes}
          prompts={prompts}
        />
      ) : null}

      {claimedName ? (
        <div className="surface divide-y divide-border overflow-hidden">
          {tonight ? (
            <Link
              to="/schedule"
              search={{}}
              className="press flex h-11 items-center justify-between px-3"
            >
              <span className="t-body font-medium text-foreground">Tonight · {tonight.title}</span>
              <span className="t-micro">Weekend</span>
            </Link>
          ) : (
            <Link
              to="/scout"
              search={{ course: "south", hole: 1, map: true }}
              className="press flex h-11 items-center justify-between px-3"
            >
              <span className="t-body font-medium text-foreground">Friday book</span>
              <span className="t-micro">South 1</span>
            </Link>
          )}
        </div>
      ) : null}

      <LockerWall players={players} teams={teams} />
    </section>
  );
}

/** Guest doors after Field. No Pay. Claimed Tonight lives in the spine. */
export function HomeWeekendDoors({
  signedIn = false,
  claimedName = null,
  players = [],
  teams = [],
}: {
  signedIn?: boolean;
  claimedName?: string | null;
  players?: Player[];
  teams?: Team[];
}) {
  const nextCourseId = defaultCourseId() as CourseId;
  const today = COURSE_DETAILS[nextCourseId];
  const tonight = WEEKEND_SOCIAL.find((row) => row.day === today.dayLabel);
  const avatars = usePlayerAvatars(players, teams);
  const face = (name: string) => avatars.data?.getByName(name);
  const guest = !claimedName;

  return (
    <div className="stack-tight">
      <div className="surface divide-y divide-border overflow-hidden empty:hidden">
        {signedIn && claimedName && !face(claimedName)?.url ? (
          <Link
            to="/profile"
            className="press flex h-11 items-center justify-between px-3"
          >
            <span className="t-body font-medium text-foreground">Add your face</span>
            <span className="t-micro">Account</span>
          </Link>
        ) : null}
        {guest && tonight ? (
          <Link
            to="/schedule"
            search={{}}
            className="press flex h-11 items-center justify-between px-3"
          >
            <span className="t-body font-medium text-foreground">Tonight · {tonight.title}</span>
            <span className="t-micro">Weekend</span>
          </Link>
        ) : null}
        {guest ? <InstallHint embedded /> : null}
      </div>
      {VENMO_IS_PLACEHOLDER && (
        <p className="t-micro px-1 text-copper">Set VITE_VENMO_HANDLE before the weekend.</p>
      )}
      {WHATSAPP_GROUP_CONFIGURED && <FieldChatLink className="!min-h-11 w-full" />}
    </div>
  );
}
