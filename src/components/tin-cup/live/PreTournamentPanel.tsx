import { Link } from "@tanstack/react-router";

import { AvatarPair } from "@/components/tin-cup/Avatar";
import { Countdown } from "@/components/tin-cup/Countdown";
import { LiveWireTicker } from "@/components/tin-cup/LiveWireTicker";
import { PhotoVault } from "@/components/tin-cup/PhotoVault";

import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { BUY_IN, VENMO_IS_PLACEHOLDER, venmoUrl } from "@/lib/tin-cup";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { day1GroupForPlayer } from "@/lib/day1-pairings";
import { COURSE_DETAILS, COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";

export function PreTournamentPanel({
  rounds: _rounds = [],
  matches = [],
  players = [],
  teams = [],
  canUpload = false,
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
  const firstName = claimedName?.trim().split(/\s+/)[0] ?? null;
  const isClaimed = signedIn && Boolean(claimedName) && !needsClaim;
  const myDay1 = claimedName ? day1GroupForPlayer(claimedName) : null;
  const avatars = usePlayerAvatars(players, teams);
  const nextCourseId = defaultCourseId() as CourseId;
  const nextDetails = COURSE_DETAILS[nextCourseId];

  return (
    <div className="stack-page pb-2">
      {isClaimed && firstName ? (
        <p className="t-micro text-center text-muted-foreground">Hey {firstName}</p>
      ) : null}

      <Countdown />

      <section className="stack-tight">
        {!signedIn && (
          <Link to="/profile" className="press btn-gold t-body flex w-full justify-center">
            Sign in · claim your spot
          </Link>
        )}
        {signedIn && needsClaim && (
          <Link to="/profile" className="press btn-gold t-body flex w-full justify-center">
            Claim your roster name
          </Link>
        )}
        {isClaimed && (
          <a
            href={venmoUrl}
            target="_blank"
            rel="noreferrer"
            className="press btn-gold t-body flex w-full items-center justify-center px-6 py-3.5"
          >
            Pay ${BUY_IN}
          </a>
        )}
        {VENMO_IS_PLACEHOLDER && (
          <p className="t-micro text-center text-copper">
            Set VITE_VENMO_HANDLE before the weekend.
          </p>
        )}
      </section>

      <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 t-micro">
        <Link to="/schedule" className="press font-semibold text-foreground">
          {nextDetails.dayLabel} · {COURSE_LABEL[nextCourseId]} →
        </Link>
        <Link to="/scout" search={{ course: nextCourseId }} className="press text-muted-foreground">
          Plan
        </Link>
      </p>

      {isClaimed && myDay1 && (
        <section className="panel p-4">
          <p className="t-eyebrow">For you · Day 1</p>
          <div className="mt-3 flex items-center gap-3">
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
              <p className="t-title text-foreground">Match {myDay1.pairing.matchIndex}</p>
              <p className="t-micro mt-1 text-muted-foreground">
                w/ {myDay1.partner.split(" ")[0]} · vs {myDay1.opponents}
              </p>
            </div>
          </div>
        </section>
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

      <PhotoVault canUpload={canUpload} variant="pulse" hideWhenEmpty />
    </div>
  );
}
