import { Link } from "@tanstack/react-router";

import { AvatarPair } from "@/components/tin-cup/Avatar";
import { Countdown } from "@/components/tin-cup/Countdown";
import { LiveWireTicker } from "@/components/tin-cup/LiveWireTicker";
import { PhotoVault } from "@/components/tin-cup/PhotoVault";
import { InstallHint } from "@/components/tin-cup/WhatsAppLinks";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import {
  BUY_IN,
  TOURNAMENT_BANK,
  VENMO_HANDLE,
  VENMO_IS_PLACEHOLDER,
  venmoUrl,
} from "@/lib/tin-cup";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { day1GroupForPlayer } from "@/lib/day1-pairings";
import { COURSE_DETAILS, COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";
import { tallyStandings } from "@/lib/scoring";

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
  const standings = tallyStandings(matches);
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

      <div className="stack-tight">
        <Countdown />
        <p className="text-center t-micro">
          <span className="t-numeral text-base">
            <span className="text-gold-light">{standings.strongMental}</span>
            <span className="mx-1 text-muted-foreground">–</span>
            <span className="text-copper">{standings.grassRoots}</span>
          </span>
          <span className="ml-2 text-muted-foreground">Cup · 13.5 to win</span>
        </p>
      </div>

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
        <p className="t-micro text-center text-muted-foreground">
          @{VENMO_HANDLE} · {TOURNAMENT_BANK}
          {!signedIn ? (
            <>
              {" · "}
              <a
                href={venmoUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-foreground"
              >
                Pay ${BUY_IN}
              </a>
            </>
          ) : null}
        </p>
        {VENMO_IS_PLACEHOLDER && (
          <p className="t-micro text-center text-copper">
            Set VITE_VENMO_HANDLE before the weekend.
          </p>
        )}
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <p className="t-eyebrow">Next up</p>
            <p className="t-title mt-1.5 text-foreground">
              {nextDetails.dayLabel} · {COURSE_LABEL[nextCourseId]}
            </p>
            <p className="t-micro mt-1 text-muted-foreground">
              First tee {nextDetails.firstTee} · {nextDetails.format}
            </p>
          </div>
          <Link to="/schedule" className="press t-micro shrink-0 font-semibold text-foreground">
            Weekend →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
          <Link
            to="/scout"
            search={{ course: nextCourseId }}
            className="press btn-quiet t-micro min-h-11 px-3 font-semibold"
          >
            {COURSE_LABEL[nextCourseId]} plan
          </Link>
          {isClaimed && myDay1 ? (
            <p className="t-micro self-center text-muted-foreground">
              Match {myDay1.pairing.matchIndex} · w/ {myDay1.partner.split(" ")[0]}
            </p>
          ) : null}
        </div>
      </section>

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

      {signedIn && <InstallHint />}

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
