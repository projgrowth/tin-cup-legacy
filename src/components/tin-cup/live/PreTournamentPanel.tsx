import { Link } from "@tanstack/react-router";
import { CalendarDays, Users } from "lucide-react";

import { Countdown } from "@/components/tin-cup/Countdown";
import { PhotoVault } from "@/components/tin-cup/PhotoVault";
import {
  InstallHint,
  ShareBoardButton,
  WhatsAppGroupButton,
} from "@/components/tin-cup/WhatsAppLinks";
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
import type { Match, Round } from "@/hooks/useTournament";
import { DAY1_META, DAY1_PAIRINGS } from "@/lib/day1-pairings";
import { tallyStandings } from "@/lib/scoring";

export function PreTournamentPanel({
  rounds = [],
  matches = [],
  canUpload = false,
}: {
  rounds?: Round[];
  matches?: Match[];
  canUpload?: boolean;
}) {
  const nextRound = [...rounds].sort(
    (a, b) => new Date(a.play_date).getTime() - new Date(b.play_date).getTime(),
  )[0];
  const standings = tallyStandings(matches);
  return (
    <div className="space-y-8 pb-2">
      {/* Brand + clock */}
      <section className="text-center">
        <img
          src="/tin-cup-logo.png"
          alt="The Tin Cup Invitational"
          width={96}
          height={96}
          className="mx-auto h-16 w-auto object-contain sm:h-20"
        />
        <h1 className="t-display mt-4 text-foreground">Tin Cup 2026</h1>
        <p className="t-micro mt-1.5 text-muted-foreground">
          {EVENT.dates} · {EVENT.location}
        </p>
        <p className="t-micro mx-auto mt-2 max-w-sm text-muted-foreground">
          No account needed to browse. Sign in only to claim your name, notes, or photos.
        </p>
        <div className="mt-5">
          <Countdown />
        </div>
      </section>

      {/* Primary CTA */}
      <section className="space-y-2">
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

      {/* First up + board pulse */}
      <section className="grid gap-3">
        {nextRound && (
          <Link to="/schedule" className="press surface flex items-center justify-between gap-3 p-4">
            <span className="min-w-0">
              <span className="t-title block text-foreground">{nextRound.day_label}</span>
              <span className="t-micro mt-0.5 block truncate text-muted-foreground">
                {nextRound.course} · {nextRound.tee_window}
              </span>
            </span>
            <span className="t-numeral shrink-0 text-foreground">{nextRound.points}</span>
          </Link>
        )}
        <div className="surface flex items-center justify-between gap-3 px-4 py-3">
          <span className="t-micro text-muted-foreground">Cup</span>
          <span className="t-numeral text-foreground">
            {standings.strongMental}–{standings.grassRoots}
          </span>
        </div>
      </section>

      {/* Day 1 pairings — lean list */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="t-section text-foreground">Day 1 pairings</h2>
          <Link to="/schedule" className="t-micro text-muted-foreground">
            Full weekend →
          </Link>
        </div>
        <ul className="surface divide-y divide-border overflow-hidden">
          {DAY1_PAIRINGS.map((p) => (
            <li
              key={p.matchIndex}
              className="flex items-center gap-2 px-3.5 py-3 t-body text-foreground"
            >
              <span className="t-micro w-4 shrink-0 text-muted-foreground">{p.matchIndex}</span>
              <span className="min-w-0 flex-1 truncate">{p.sideA}</span>
              <span className="t-micro shrink-0 text-muted-foreground">vs</span>
              <span className="min-w-0 flex-1 truncate text-right">{p.sideB}</span>
            </li>
          ))}
        </ul>
        <p className="t-micro mt-2 text-muted-foreground">
          {DAY1_META.course} · {DAY1_META.tee}
        </p>
      </section>

      <PhotoVault canUpload={canUpload} variant="pulse" />

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2">
        <Link to="/schedule" className="press surface flex min-h-12 items-center gap-2.5 px-3.5 py-3">
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
          <span className="t-body font-medium text-foreground">Schedule</span>
        </Link>
        <Link to="/rosters" className="press surface flex min-h-12 items-center gap-2.5 px-3.5 py-3">
          <Users className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
          <span className="t-body font-medium text-foreground">Teams</span>
        </Link>
      </div>

      <div className={`grid gap-2 ${WHATSAPP_GROUP_CONFIGURED ? "grid-cols-2" : "grid-cols-1"}`}>
        <WhatsAppGroupButton className="w-full" />
        <ShareBoardButton className="w-full" />
      </div>
      <InstallHint />

      {/* Fee breakdown — collapsed */}
      <details className="surface group">
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
        Live scoring goes live the weekend · captains post results. Issues? Message Kevin in the
        group.
      </p>
    </div>
  );
}
