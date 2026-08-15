import { Link } from "@tanstack/react-router";

import { AvatarPair } from "@/components/tin-cup/Avatar";
import { Countdown } from "@/components/tin-cup/Countdown";
import { LiveWireTicker } from "@/components/tin-cup/LiveWireTicker";
import { PairingRow } from "@/components/tin-cup/PairingRow";
import { PhotoVault } from "@/components/tin-cup/PhotoVault";
import { InstallHint } from "@/components/tin-cup/WhatsAppLinks";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import {
  BUY_IN,
  EVENT,
  TOURNAMENT_BANK,
  VENMO_HANDLE,
  VENMO_IS_PLACEHOLDER,
  venmoUrl,
} from "@/lib/tin-cup";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { DAY1_META, DAY1_PAIRINGS, day1GroupForPlayer } from "@/lib/day1-pairings";
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

  const featuredPairings =
    isClaimed && myDay1
      ? DAY1_PAIRINGS.filter((p) => p.matchIndex === myDay1.pairing.matchIndex)
      : DAY1_PAIRINGS.slice(0, 1);

  return (
    <div className="stack-page pb-2">
      <section className="text-center">
        <img
          src="/tin-cup-logo.png"
          alt=""
          width={56}
          height={56}
          className="mx-auto h-12 w-auto object-contain opacity-95"
        />
        <h1 className="t-display mt-4 text-foreground">
          {isClaimed && firstName ? `Hey ${firstName}` : "Tin Cup 2026"}
        </h1>
        <p className="t-micro mt-1 text-muted-foreground">{EVENT.dates} · Innisbrook</p>
      </section>

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

      <section>
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="t-section text-foreground">Day 1</h2>
            <p className="t-micro mt-0.5 text-muted-foreground">
              {DAY1_META.course} · {DAY1_META.tee}
            </p>
          </div>
          <Link to="/schedule" className="t-micro shrink-0 text-muted-foreground">
            All 4 →
          </Link>
        </div>
        <ul className="surface-inset divide-y divide-border overflow-hidden">
          {featuredPairings.map((p) => (
            <PairingRow
              key={p.matchIndex}
              index={p.matchIndex}
              sideALabel={p.sideA}
              sideBLabel={p.sideB}
              sideAPeople={p.playersA.map((name) => ({
                name,
                teamSlug: "strong-mental",
                src: avatars.data?.getByName(name)?.url,
              }))}
              sideBPeople={p.playersB.map((name) => ({
                name,
                teamSlug: "grass-roots",
                src: avatars.data?.getByName(name)?.url,
              }))}
              highlight={myDay1?.pairing.matchIndex === p.matchIndex}
              meta={DAY1_META.formats}
            />
          ))}
        </ul>
      </section>

      <LiveWireTicker
        matches={matches}
        sideBets={[]}
        players={players}
        teams={teams}
        variant="pre"
        limit={3}
        toastEnabled={false}
      />

      <PhotoVault canUpload={canUpload} variant="pulse" hideWhenEmpty={!canUpload} />
    </div>
  );
}
