import { Link } from "@tanstack/react-router";

import { Countdown } from "@/components/tin-cup/Countdown";
import { MatchCard } from "@/components/tin-cup/MatchCard";
import { PageMasthead } from "@/components/tin-cup/PageMasthead";
import { FieldChatLink } from "@/components/tin-cup/WhatsAppLinks";
import { WeekendCommandCenter } from "@/components/tin-cup/WeekendCommandCenter";

import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import {
  BUY_IN,
  EVENT,
  VENMO_IS_PLACEHOLDER,
  WEEKEND_SOCIAL,
  WHATSAPP_GROUP_CONFIGURED,
  venmoUrl,
} from "@/lib/tin-cup";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { day1GroupForPlayer } from "@/lib/day1-pairings";
import { COURSE_DETAILS, COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";
import type { WeekendContext } from "@/lib/weekend-context";

export function PreTournamentPanel({
  rounds: _rounds = [],
  matches: _matches = [],
  players = [],
  teams = [],
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
  const myDay1 = claimedName ? day1GroupForPlayer(claimedName) : null;
  const avatars = usePlayerAvatars(players, teams);
  const nextCourseId = defaultCourseId() as CourseId;
  const today = COURSE_DETAILS[nextCourseId];
  const tonight = WEEKEND_SOCIAL.find((row) => row.day === today.dayLabel);

  return (
    <section className="stack-page pb-4" aria-label="This weekend">
      <PageMasthead title={EVENT.title} meta={`${EVENT.dates} · ${EVENT.location}`}>
        <p className="t-micro mt-2">{EVENT.subtitle}</p>
        <div className="mt-2">
          <Countdown />
        </div>
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

      {isClaimed && myDay1 ? (
        <MatchCard
          size="feature"
          index={`Friday · Match ${myDay1.pairing.matchIndex}`}
          sideA={myDay1.pairing.sideA}
          sideB={myDay1.pairing.sideB}
          peopleA={myDay1.pairing.playersA.map((name) => ({
            name,
            teamSlug: "strong-mental",
            src: avatars.data?.getByName(name)?.url,
          }))}
          peopleB={myDay1.pairing.playersB.map((name) => ({
            name,
            teamSlug: "grass-roots",
            src: avatars.data?.getByName(name)?.url,
          }))}
          format="Scramble · Alt shot"
          points={2}
          yours
          yoursOnA={myDay1.side === "a"}
        />
      ) : (
        <Link
          to="/schedule"
          className="press t-body inline-flex min-h-11 items-center font-semibold text-foreground"
        >
          Friday · four matches · {COURSE_LABEL[nextCourseId]}
        </Link>
      )}

      {tonight ? (
        <p className="t-micro">
          Tonight · {tonight.title}
        </p>
      ) : null}

      {WHATSAPP_GROUP_CONFIGURED && <FieldChatLink className="!min-h-11 w-full" />}
    </section>
  );
}
