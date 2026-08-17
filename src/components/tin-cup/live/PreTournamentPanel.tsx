import { Link } from "@tanstack/react-router";

import { AvatarPair } from "@/components/tin-cup/Avatar";
import { Countdown } from "@/components/tin-cup/Countdown";
import { LiveWireTicker } from "@/components/tin-cup/LiveWireTicker";
import { WhatsAppGroupButton } from "@/components/tin-cup/WhatsAppLinks";

import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { BUY_IN, VENMO_IS_PLACEHOLDER, WEEKEND_SOCIAL, venmoUrl } from "@/lib/tin-cup";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { day1GroupForPlayer } from "@/lib/day1-pairings";
import { COURSE_DETAILS, COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";

export function PreTournamentPanel({
  rounds: _rounds = [],
  matches = [],
  players = [],
  teams = [],
  canUpload: _canUpload = false,
  signedIn = false,
  claimedName = null,
  needsClaim = false,
}: {
  rounds?: Round[];
  matches?: Match[];
  players?: Player[];
  teams?: Team[];
  canUpload?: boolean;
  signedIn?: boolean;
  claimedName?: string | null;
  needsClaim?: boolean;
}) {
  const isClaimed = signedIn && Boolean(claimedName) && !needsClaim;
  const myDay1 = claimedName ? day1GroupForPlayer(claimedName) : null;
  const avatars = usePlayerAvatars(players, teams);
  const nextCourseId = defaultCourseId() as CourseId;
  const today = COURSE_DETAILS[nextCourseId];
  const tonight = WEEKEND_SOCIAL.find((row) => row.day === today.dayLabel);

  const cta = !signedIn ? (
    <Link to="/profile" className="press btn-gold t-body flex min-h-11 w-full justify-center">
      Sign in · claim your spot
    </Link>
  ) : needsClaim ? (
    <Link to="/profile" className="press btn-gold t-body flex min-h-11 w-full justify-center">
      Claim your roster name
    </Link>
  ) : (
    <a
      href={venmoUrl}
      target="_blank"
      rel="noreferrer"
      className="press btn-gold t-body flex min-h-11 w-full items-center justify-center"
    >
      Pay ${BUY_IN}
    </a>
  );

  return (
    <div className="stack-page pb-2">
      <h1 className="t-title text-center text-foreground">Tin Cup · {today.dayLabel}</h1>
      <Countdown />

      <div className="stack-tight">
        {cta}
        {!isClaimed && (
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <Link
              to="/schedule"
              className="press t-micro inline-flex min-h-11 items-center font-semibold text-foreground"
            >
              Weekend →
            </Link>
            <Link
              to="/scout"
              search={{ course: nextCourseId }}
              className="press t-micro inline-flex min-h-11 items-center text-muted-foreground"
            >
              Plan the round
            </Link>
          </p>
        )}
        {VENMO_IS_PLACEHOLDER && (
          <p className="t-micro text-center text-copper">Set VITE_VENMO_HANDLE before the weekend.</p>
        )}
      </div>

      {isClaimed && (
        <section className="panel space-y-4 p-4">
          <p className="t-eyebrow text-gold-light">Your weekend</p>
          {myDay1 ? (
            <div className="flex items-center gap-3">
              <AvatarPair
                people={[
                  {
                    name: claimedName!,
                    teamSlug: avatars.data?.getByName(claimedName!)?.teamSlug,
                    src: avatars.data?.getByName(claimedName!)?.url,
                  },
                  {
                    name: myDay1.partner,
                    teamSlug: avatars.data?.getByName(myDay1.partner)?.teamSlug,
                    src: avatars.data?.getByName(myDay1.partner)?.url,
                  },
                ]}
                size="md"
              />
              <div className="min-w-0">
                <p className="t-title text-foreground">Friday · Match {myDay1.pairing.matchIndex}</p>
                <p className="t-micro mt-1 text-muted-foreground">
                  w/ {myDay1.partner.split(" ")[0]} · vs {myDay1.opponents}
                </p>
              </div>
            </div>
          ) : null}
          <p className="t-micro text-muted-foreground">
            {today.dayLabel} · {COURSE_LABEL[nextCourseId]} · first tee {today.firstTee}
          </p>
          {tonight && (
            <p className="t-micro text-muted-foreground">
              Tonight · {tonight.title}
            </p>
          )}
          <Link
            to="/scout"
            search={{ course: nextCourseId }}
            className="press btn-quiet t-body flex min-h-11 w-full justify-center"
          >
            Open {COURSE_LABEL[nextCourseId]} plan
          </Link>
        </section>
      )}

      {!isClaimed && tonight && (
        <p className="t-micro text-center text-muted-foreground">Tonight · {tonight.title}</p>
      )}

      <LiveWireTicker
        matches={matches}
        sideBets={[]}
        players={players}
        teams={teams}
        variant="pre"
        limit={3}
        toastEnabled={false}
      />

      <WhatsAppGroupButton className="!min-h-11 w-full" />
    </div>
  );
}
