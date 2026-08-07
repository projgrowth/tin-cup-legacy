import { Link } from "@tanstack/react-router";
import { CalendarDays, Users } from "lucide-react";

import { AvatarPair } from "@/components/tin-cup/Avatar";
import { Countdown } from "@/components/tin-cup/Countdown";
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
  FEE_BREAKDOWN,
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
  const nextRound = [...rounds].sort(
    (a, b) => new Date(a.play_date).getTime() - new Date(b.play_date).getTime(),
  )[0];
  const standings = tallyStandings(matches);
  const firstName = claimedName?.trim().split(/\s+/)[0] ?? null;
  const isClaimed = signedIn && Boolean(claimedName) && !needsClaim;
  const myDay1 = claimedName ? day1GroupForPlayer(claimedName) : null;
  const avatars = usePlayerAvatars(players, teams);

  return (
    <div className="stack-page pb-2">
      {/* Brand */}
      <section className="text-center">
        <img
          src="/tin-cup-logo.png"
          alt="The Tin Cup Invitational"
          width={80}
          height={80}
          className="mx-auto h-14 w-auto object-contain sm:h-16"
        />
        <h1 className="t-display mt-5 text-foreground">
          {isClaimed && firstName ? `Hey ${firstName}` : "Tin Cup 2026"}
        </h1>
        <p className="t-micro mt-1.5 text-muted-foreground">
          {EVENT.dates} · {EVENT.location}
        </p>
        {!signedIn && (
          <p className="t-micro mx-auto mt-2 max-w-xs text-muted-foreground">
            Sign in to join the field. Guests can follow the live cup.
          </p>
        )}
        {signedIn && needsClaim && (
          <p className="t-micro mx-auto mt-2 max-w-xs text-muted-foreground">
            Claim your roster name to unlock your hub.
          </p>
        )}
        {isClaimed && (
          <p className="t-micro mx-auto mt-2 max-w-xs text-muted-foreground">
            On the field as {claimedName}
          </p>
        )}
      </section>

      <Countdown />

      {/* Cup metric — team-colored numerals */}
      <section className="surface-raised px-4 py-5 text-center">
        <p className="t-eyebrow">Cup</p>
        <p className="t-hero mt-2">
          <span className="text-gold-light">{standings.strongMental}</span>
          <span className="mx-1 text-muted-foreground">–</span>
          <span className="text-copper">{standings.grassRoots}</span>
        </p>
        <p className="t-micro mt-2 text-muted-foreground">13.5 wins · {EVENT.totalPoints} total</p>
      </section>

      {/* Single primary path */}
      <section className="stack-tight">
        {!signedIn && (
          <Link to="/profile" className="press btn-quiet t-body flex w-full justify-center">
            Sign in · claim your spot
          </Link>
        )}
        {signedIn && needsClaim && (
          <Link to="/profile" className="press btn-quiet t-body flex w-full justify-center">
            Claim your roster name
          </Link>
        )}
        {isClaimed && (
          <div className="flex justify-center gap-4">
            <Link to="/profile" className="press t-micro font-medium text-foreground underline-offset-4 hover:underline">
              My hub
            </Link>
            <Link to="/rosters" className="press t-micro font-medium text-foreground underline-offset-4 hover:underline">
              Your team
            </Link>
          </div>
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
          <p className="t-micro text-center text-copper">
            Set <code className="text-foreground">VITE_VENMO_HANDLE</code> before the weekend.
          </p>
        )}
      </section>

      {isClaimed && myDay1 && (
        <section className="surface-raised p-4">
          <p className="t-eyebrow">Next up for you</p>
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
              <p className="t-title text-foreground">
                Day 1 · Match {myDay1.pairing.matchIndex}
              </p>
              <p className="t-body mt-1 font-medium text-foreground">
                w/ {myDay1.partner.split(" ")[0]}
                <span className="t-micro mx-1.5 font-normal text-muted-foreground">vs</span>
                {myDay1.opponents}
              </p>
            </div>
          </div>
          <p className="t-micro mt-2 text-muted-foreground">
            {DAY1_META.course} · {DAY1_META.tee} · {DAY1_META.formats}
          </p>
          <Link to="/schedule" className="press t-micro mt-3 inline-block text-muted-foreground">
            Full weekend →
          </Link>
        </section>
      )}

      {nextRound && !myDay1 && (
        <Link
          to="/schedule"
          className="press surface-inset flex items-center justify-between gap-3 px-4 py-3.5"
        >
          <span className="min-w-0">
            <span className="t-micro block text-muted-foreground">Up first</span>
            <span className="t-title mt-0.5 block text-foreground">{nextRound.day_label}</span>
            <span className="t-micro mt-0.5 block truncate text-muted-foreground">
              {nextRound.course} · {nextRound.tee_window}
            </span>
          </span>
          <span className="t-numeral shrink-0 text-xl text-foreground">{nextRound.points}</span>
        </Link>
      )}

      {/* Day 1 — inset list */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="t-section text-foreground">Day 1 pairings</h2>
          <Link to="/schedule" className="t-micro text-muted-foreground">
            Full weekend →
          </Link>
        </div>
        <ul className="surface-inset divide-y divide-border overflow-hidden">
          {DAY1_PAIRINGS.map((p) => {
            const mine = myDay1?.pairing.matchIndex === p.matchIndex;
            const sideA = p.playersA.map((name) => ({
              name,
              teamSlug: "strong-mental" as const,
              src: avatars.data?.getByName(name)?.url,
            }));
            const sideB = p.playersB.map((name) => ({
              name,
              teamSlug: "grass-roots" as const,
              src: avatars.data?.getByName(name)?.url,
            }));
            return (
              <li
                key={p.matchIndex}
                className={`flex items-center gap-2 px-3.5 py-3.5 t-body text-foreground ${
                  mine ? "bg-secondary/50" : ""
                }`}
              >
                <span className="t-micro w-4 shrink-0 text-muted-foreground">{p.matchIndex}</span>
                <AvatarPair people={sideA} />
                <span className="min-w-0 flex-1 truncate font-medium">{p.sideA}</span>
                <span className="t-micro shrink-0 text-muted-foreground">vs</span>
                <span className="min-w-0 flex-1 truncate text-right font-medium">{p.sideB}</span>
                <AvatarPair people={sideB} />
                {mine && (
                  <span className="t-micro shrink-0 text-muted-foreground">You</span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="t-micro mt-2 text-muted-foreground">
          {DAY1_META.course} · {DAY1_META.tee}
        </p>
      </section>

      <PhotoVault canUpload={canUpload} variant="pulse" />

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/schedule"
          className="press surface-inset flex min-h-12 items-center gap-2.5 px-3.5 py-3"
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
          <span className="t-body font-medium text-foreground">Schedule</span>
        </Link>
        <Link
          to="/rosters"
          className="press surface-inset flex min-h-12 items-center gap-2.5 px-3.5 py-3"
        >
          <Users className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
          <span className="t-body font-medium text-foreground">Teams</span>
        </Link>
      </div>

      <div className={`grid gap-2 ${WHATSAPP_GROUP_CONFIGURED ? "grid-cols-2" : "grid-cols-1"}`}>
        <WhatsAppGroupButton className="w-full" />
        <ShareBoardButton className="w-full" />
      </div>
      {WHATSAPP_GROUP_CONFIGURED && (
        <p className="-mt-4 t-micro text-center text-muted-foreground">
          Group chat is on WhatsApp · scores live here
        </p>
      )}
      <InstallHint />

      <details className="surface-inset group">
        <summary className="press cursor-pointer list-none px-4 py-3.5 t-body font-medium text-foreground [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-3">
            ${BUY_IN} entry breakdown
            <span className="t-micro text-muted-foreground group-open:hidden">Show</span>
            <span className="t-micro hidden text-muted-foreground group-open:inline">Hide</span>
          </span>
        </summary>
        <ul className="divide-y divide-border border-t border-border">
          {FEE_BREAKDOWN.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="t-body text-foreground">{row.label}</span>
              <span className="t-numeral shrink-0 text-foreground">{row.value}</span>
            </li>
          ))}
        </ul>
      </details>

      <p className="t-micro text-center text-muted-foreground">
        {signedIn
          ? "Captains post live scores. Issues? Message Kevin."
          : "Captains post live scores. Guests can watch the board anytime."}
      </p>
    </div>
  );
}
