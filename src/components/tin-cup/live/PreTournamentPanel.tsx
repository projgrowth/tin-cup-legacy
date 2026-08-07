import { Link } from "@tanstack/react-router";

import { ActivityFeed } from "@/components/tin-cup/ActivityFeed";
import { AvatarPair } from "@/components/tin-cup/Avatar";
import { Countdown } from "@/components/tin-cup/Countdown";
import { FormatSheet } from "@/components/tin-cup/FormatSheet";
import { PairingRow } from "@/components/tin-cup/PairingRow";
import { PhotoVault } from "@/components/tin-cup/PhotoVault";
import {
  InstallHint,
  ShareBoardButton,
  WhatsAppGroupButton,
} from "@/components/tin-cup/WhatsAppLinks";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import {
  BUY_IN,
  EVENT,
  TOURNAMENT_BANK,
  VENMO_HANDLE,
  VENMO_IS_PLACEHOLDER,
  WHATSAPP_GROUP_CONFIGURED,
  venmoUrl,
} from "@/lib/tin-cup";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { DAY1_META, DAY1_PAIRINGS, day1GroupForPlayer } from "@/lib/day1-pairings";
import { tallyStandings } from "@/lib/scoring";

export function PreTournamentPanel({
  rounds = [],
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

  return (
    <div className="stack-page pb-2">
      {/* Compact brand */}
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
        <p className="t-micro mt-1 text-muted-foreground">
          {EVENT.dates} · Innisbrook
        </p>
      </section>

      {/* Sole raised hero: countdown embeds cup line */}
      <div className="stack-tight">
        <Countdown />
        <div className="flex items-center justify-center gap-3 px-1">
          <p className="t-numeral text-lg">
            <span className="text-gold-light">{standings.strongMental}</span>
            <span className="mx-1 text-muted-foreground">–</span>
            <span className="text-copper">{standings.grassRoots}</span>
          </p>
          <span className="t-micro text-muted-foreground">Cup · 13.5 wins</span>
        </div>
      </div>

      {/* For you — claimed only */}
      {isClaimed && myDay1 && (
        <section className="surface-raised p-4">
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
              <p className="t-micro mt-0.5 text-muted-foreground">
                {DAY1_META.tee} · {DAY1_META.course}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/profile" className="press t-micro text-muted-foreground underline-offset-2 hover:underline">
              My hub
            </Link>
            <Link to="/rosters" className="press t-micro text-muted-foreground underline-offset-2 hover:underline">
              Team
            </Link>
            <Link to="/schedule" className="press t-micro text-muted-foreground underline-offset-2 hover:underline">
              Weekend
            </Link>
          </div>
        </section>
      )}

      {/* Primary CTA stack */}
      <section className="stack-tight">
        {!signedIn && (
          <Link to="/profile" className="press t-micro text-center font-medium text-foreground underline-offset-4 hover:underline">
            Sign in · claim your spot
          </Link>
        )}
        {signedIn && needsClaim && (
          <Link
            to="/profile"
            className="press btn-quiet t-body flex w-full justify-center"
          >
            Claim your roster name
          </Link>
        )}
        <a
          href={venmoUrl}
          target="_blank"
          rel="noreferrer"
          className="press btn-gold t-body flex w-full items-center justify-center px-6 py-3.5"
        >
          Pay ${BUY_IN}
        </a>
        <p className="t-micro text-center text-muted-foreground">
          @{VENMO_HANDLE} · {TOURNAMENT_BANK}
        </p>
        {VENMO_IS_PLACEHOLDER && (
          <p className="t-micro text-center text-copper">Set VITE_VENMO_HANDLE before the weekend.</p>
        )}
      </section>

      {/* Day 1 compact */}
      <section>
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="t-section text-foreground">Day 1</h2>
            <p className="t-micro mt-0.5 text-muted-foreground">
              {DAY1_META.course} · {DAY1_META.tee} · Scramble + Alt Shot
            </p>
          </div>
          <Link to="/schedule" className="t-micro shrink-0 text-muted-foreground">
            All days →
          </Link>
        </div>
        <ul className="surface-inset divide-y divide-border overflow-hidden">
          {DAY1_PAIRINGS.map((p) => (
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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FormatSheet />
          <Link to="/purse" className="press t-micro text-muted-foreground underline-offset-2 hover:underline">
            Money details
          </Link>
        </div>
      </section>

      <ActivityFeed players={players} teams={teams} limit={6} />

      {/* Pulse only when there is something to show or user can add */}
      <PhotoVault canUpload={canUpload} variant="pulse" hideWhenEmpty={!canUpload} />

      {/* Quiet footer actions */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link to="/schedule" className="press t-micro text-muted-foreground">
          Schedule
        </Link>
        <Link to="/rosters" className="press t-micro text-muted-foreground">
          Teams
        </Link>
        <Link to="/scout" className="press t-micro text-muted-foreground">
          Map
        </Link>
        <WhatsAppGroupButton className="!min-h-0 !border-0 !bg-transparent !px-0 !py-0 t-micro text-muted-foreground" />
        <ShareBoardButton className="!min-h-0 !border-0 !bg-transparent !px-0 !py-0 t-micro text-muted-foreground" />
      </div>
      {WHATSAPP_GROUP_CONFIGURED && (
        <p className="-mt-4 t-micro text-center text-muted-foreground">
          Chat on WhatsApp · scores here
        </p>
      )}
      <InstallHint />
    </div>
  );
}
