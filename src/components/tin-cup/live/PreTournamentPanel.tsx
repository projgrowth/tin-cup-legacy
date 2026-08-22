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
    <section className="stack-page pb-2" aria-label="This weekend">
      <div className="fade-up">
        <PageMasthead
          size="display"
          title={EVENT.title}
          meta={`${EVENT.dates} · ${EVENT.location}`}
        />
        <p className="t-body mt-2 px-0.5 text-foreground">{EVENT.subtitle}</p>
      </div>

      <div className="fade-up" style={{ animationDelay: "80ms" }}>
        <Countdown />
      </div>

      {isClaimed && context ? (
        <WeekendCommandCenter context={context} />
      ) : (
        <div className="fade-up stack-tight" style={{ animationDelay: "160ms" }}>
          <a
            href={venmoUrl}
            target="_blank"
            rel="noreferrer"
            className="press btn-gold t-body flex min-h-11 w-full items-center justify-center"
          >
            Pay ${BUY_IN}
          </a>
          {needsClaim ? (
            <p className="flex flex-wrap items-center justify-center">
              <Link
                to="/profile"
                className="press t-micro inline-flex min-h-11 items-center text-muted-foreground"
              >
                Claim your name
              </Link>
            </p>
          ) : null}
        </div>
      )}

      {VENMO_IS_PLACEHOLDER && (
        <p className="t-micro text-center text-copper">Set VITE_VENMO_HANDLE before the weekend.</p>
      )}

      {isClaimed && (
        <section className="space-y-3">
          {myDay1 ? (
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
          ) : null}
          <p className="t-micro px-1 text-muted-foreground">
            {today.dayLabel} · {COURSE_LABEL[nextCourseId]} · first tee {today.firstTee}
          </p>
          {tonight && <p className="t-micro px-1 text-muted-foreground">Tonight · {tonight.title}</p>}
          <a
            href={venmoUrl}
            target="_blank"
            rel="noreferrer"
            className="press btn-quiet t-body flex min-h-11 w-full items-center justify-center"
          >
            Pay ${BUY_IN}
          </a>
        </section>
      )}

      {!isClaimed && tonight && (
        <p className="t-micro mt-2 text-center text-muted-foreground">Tonight · {tonight.title}</p>
      )}

      {WHATSAPP_GROUP_CONFIGURED && <FieldChatLink className="!min-h-11 w-full" />}
    </section>
  );
}
