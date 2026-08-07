import { useEffect, useState } from "react";
import { AlertTriangle, CloudOff } from "lucide-react";

import type { Match, Round, Team } from "@/hooks/useTournament";
import { clinchSummary, roundStatus, tallyStandings } from "@/lib/scoring";
import { EVENT } from "@/lib/tin-cup";
import { teamShortName } from "@/lib/team-styles";

export function StatusLine({
  syncedAt,
  pendingWrites,
  failedWrites = 0,
  onRetryFailed,
  stale,
}: {
  syncedAt?: number;
  pendingWrites: number;
  failedWrites?: number;
  onRetryFailed?: () => void;
  stale: boolean;
}) {
  if (failedWrites > 0) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-2 rounded-[var(--radius)] border border-copper/40 bg-copper/10 px-4 py-3"
      >
        <p className="t-micro flex items-center gap-1.5 text-copper">
          <AlertTriangle className="size-3" strokeWidth={1.8} />
          {failedWrites} update{failedWrites === 1 ? "" : "s"} didn&apos;t save — the board below
          shows the server score
        </p>
        {onRetryFailed && (
          <button
            type="button"
            onClick={onRetryFailed}
            className="press btn-quiet t-micro rounded-full px-4 py-1.5"
          >
            Retry now
          </button>
        )}
      </div>
    );
  }
  if (pendingWrites > 0) {
    return (
      <p className="t-micro flex items-center justify-center gap-1.5 text-copper">
        <CloudOff className="size-3" strokeWidth={1.8} />
        {pendingWrites} update{pendingWrites === 1 ? "" : "s"} saved offline — will sync
      </p>
    );
  }
  if (!syncedAt) return null;
  return (
    <p className="t-micro text-center">
      {stale ? "Showing cached board · " : "Updated "}
      {new Date(syncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
    </p>
  );
}

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  return now;
}

function currentRound(rounds: Round[], now: number): Round | undefined {
  return (
    rounds.find((r) => roundStatus(r, now) === "live") ??
    rounds.find((r) => roundStatus(r, now) === "upcoming")
  );
}

export function LiveHero({
  rounds,
  matches,
  teams,
}: {
  rounds: Round[];
  matches: Match[];
  teams: Team[];
}) {
  const now = useNow();
  if (now === null) return <section className="surface h-[168px] animate-pulse" />;
  const decided = matches.some((m) => m.result !== "pending");
  if (decided) return <ScoreBar matches={matches} teams={teams} />;
  const firstTee = new Date(EVENT.firstTee).getTime();
  if (now < firstTee) {
    return (
      <section className="py-4 text-center">
        <p className="t-title text-foreground">First tee Friday · 12:19 PM ET</p>
        <p className="t-micro mt-1.5 text-muted-foreground">Results post when captains score.</p>
      </section>
    );
  }
  const round = currentRound(rounds, now);
  return (
    <section className="py-4 text-center">
      <p className="t-title text-foreground">
        {round ? `${round.day_label} · ${round.course}` : "First results soon"}
      </p>
      {round && (
        <p className="t-micro mt-1.5 text-muted-foreground">{round.tee_window}</p>
      )}
    </section>
  );
}

/** Sticky cup score for mobile spectators scrolling the match board. */
export function StickyCupBar({ matches }: { matches: Match[] }) {
  const standings = tallyStandings(matches);
  const clinch = clinchSummary(standings);
  return (
    <div className="sticky top-[3.15rem] z-20 -mx-4 border-y border-border bg-background/90 px-4 py-2.5 backdrop-blur-md sm:-mx-5 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="t-micro text-gold-light">SM</span>
          <span className="t-numeral text-xl text-gold-light">{standings.strongMental}</span>
          <span className="t-micro text-muted-foreground">–</span>
          <span className="t-numeral text-xl text-copper">{standings.grassRoots}</span>
          <span className="t-micro text-copper">GR</span>
        </div>
        <p className="t-micro shrink-0 text-right text-muted-foreground">
          {clinch.clinchedBy
            ? "Cup clinched"
            : clinch.leader
              ? `${teamShortName(clinch.leader)} needs ${clinch.leaderNeeds}`
              : "All square"}
        </p>
      </div>
      <p className="t-micro mt-0.5 text-muted-foreground">
        {standings.remaining} of {EVENT.totalPoints} pts left
      </p>
    </div>
  );
}

export function MatchBoardHeader({ matches }: { matches: Match[] }) {
  return <StickyCupBar matches={matches} />;
}

/** Compact Fri / Sat / Sun strip under the hero score. */
export function RoundStrip({ rounds, matches }: { rounds: Round[]; matches: Match[] }) {
  if (rounds.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {rounds.map((round) => {
        const status = roundStatus(round);
        const ofRound = matches.filter((m) => m.round_id === round.id);
        const earned = ofRound
          .filter((m) => m.result !== "pending")
          .reduce((sum, m) => sum + Number(m.points), 0);
        return (
          <div
            key={round.id}
            className={`surface px-2.5 py-2 text-center ${
              status === "live" ? "ring-1 ring-border" : ""
            }`}
          >
            <p className="t-micro truncate text-muted-foreground">
              {round.day_label.slice(0, 3)}
              {status === "live" ? " · Live" : ""}
            </p>
            <p className="t-numeral mt-1 text-foreground">
              {earned}
              <span className="t-micro font-normal text-muted-foreground">/{round.points}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function ScoreBar({ matches, teams }: { matches: Match[]; teams: Team[] }) {
  const standings = tallyStandings(matches);
  const clinch = clinchSummary(standings);
  const total = Math.max(standings.strongMental + standings.grassRoots, 1);
  const left = (standings.strongMental / total) * 100;
  const nameFor = (slug: string) => teams.find((t) => t.slug === slug)?.name ?? slug;
  const leadName = clinch.leader ? nameFor(clinch.leader) : null;

  return (
    <section className="surface-raised p-4 sm:p-5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div className="min-w-0">
          <p className="t-micro truncate text-gold-light">{nameFor("strong-mental")}</p>
          <p className="t-hero tabular-nums mt-1 text-gold-light">{standings.strongMental}</p>
        </div>
        <p className="t-micro pb-1.5 text-muted-foreground">{EVENT.pointsToWin} wins</p>
        <div className="min-w-0 text-right">
          <p className="t-micro truncate text-copper">{nameFor("grass-roots")}</p>
          <p className="t-hero tabular-nums mt-1 text-copper">{standings.grassRoots}</p>
        </div>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--track)]">
        <div
          className="h-full rounded-full bg-gold transition-all duration-500"
          style={{ width: `${left}%` }}
        />
      </div>
      <p className="t-micro mt-2 text-center text-foreground/85">
        {clinch.clinchedBy
          ? `${nameFor(clinch.clinchedBy)} has clinched`
          : leadName
            ? `${leadName} needs ${clinch.leaderNeeds}`
            : "All square"}
        <span className="text-muted-foreground">
          {" "}
          · {standings.remaining}/{EVENT.totalPoints} left
        </span>
      </p>
    </section>
  );
}
