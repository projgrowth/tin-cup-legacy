import { Link } from "@tanstack/react-router";

import { AvatarPair } from "@/components/tin-cup/Avatar";
import { Countdown } from "@/components/tin-cup/Countdown";
import { LiveWireTicker } from "@/components/tin-cup/LiveWireTicker";
import { PhotoVault } from "@/components/tin-cup/PhotoVault";

import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { BUY_IN, VENMO_IS_PLACEHOLDER, venmoUrl } from "@/lib/tin-cup";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { day1GroupForPlayer } from "@/lib/day1-pairings";
import { COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";

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

  const cta = !signedIn ? (
    <Link to="/profile" className="press btn-gold t-body flex w-full justify-center">
      Sign in · claim your spot
    </Link>
  ) : needsClaim ? (
    <Link to="/profile" className="press btn-gold t-body flex w-full justify-center">
      Claim your roster name
    </Link>
  ) : (
    <a
      href={venmoUrl}
      target="_blank"
      rel="noreferrer"
      className="press btn-gold t-body flex w-full items-center justify-center"
    >
      Pay ${BUY_IN}
    </a>
  );

  return (
    <div className="stack-page pb-2">
      {isClaimed && firstName ? (
        <p className="t-micro text-center text-muted-foreground">Hey {firstName}</p>
      ) : null}

      <section className="relative -mx-4 overflow-hidden sm:-mx-5">
        <img
          src="/tin-cup-intro-poster.jpg"
          alt=""
          className="absolute inset-0 size-full object-cover object-[50%_28%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[oklch(0.11_0.02_165)] via-[oklch(0.11_0.02_165/50%)] to-[oklch(0.08_0.02_165/15%)]"
        />
        <div className="relative flex h-[200px] flex-col justify-end px-5 pb-4 sm:h-[220px]">
          <Countdown cover />
          <p className="mt-2 text-center t-micro text-white/70">
            {COURSE_LABEL[nextCourseId]} · Innisbrook
          </p>
        </div>
      </section>

      <div className="stack-tight">
        {cta}
        <p className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          <Link to="/schedule" className="press t-micro font-semibold text-foreground">
            Weekend →
          </Link>
          <Link
            to="/scout"
            search={{ course: nextCourseId }}
            className="press t-micro text-muted-foreground"
          >
            Plan the round
          </Link>
        </p>
        {VENMO_IS_PLACEHOLDER && (
          <p className="t-micro text-center text-copper">Set VITE_VENMO_HANDLE before the weekend.</p>
        )}
      </div>

      {isClaimed && myDay1 && (
        <section className="relative overflow-hidden rounded-[1.25rem] border border-gold/20 bg-[oklch(0.16_0.02_165)] px-4 py-4">
          <p className="t-eyebrow text-gold-light">Your Friday</p>
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
