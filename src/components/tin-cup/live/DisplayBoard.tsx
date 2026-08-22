import { Link } from "@tanstack/react-router";

import type { Match, Round, SideBet, Team } from "@/hooks/useTournament";
import { clinchSummary, roundStatus, roundTally, tallyStandings } from "@/lib/scoring";
import { isCtp, isLongDrive, sideBetShortLabel } from "@/lib/side-bets";
import { formatPayout } from "@/lib/purse";
import { contestHoleLabel } from "@/lib/tin-cup";
import { teamShortName } from "@/lib/team-styles";

/**
 * Large-type clubhouse / TV mode. Open via `/?board=1`.
 * Read-only — no captain controls, no nav chrome needed beyond Exit.
 */
export function DisplayBoard({
  rounds,
  matches,
  teams,
  sideBets,
  syncedAt,
}: {
  rounds: Round[];
  matches: Match[];
  teams: Team[];
  sideBets: SideBet[];
  syncedAt?: number;
}) {
  const standings = tallyStandings(matches);
  const clinch = clinchSummary(standings);
  const sm = teams.find((t) => t.slug === "strong-mental");
  const gr = teams.find((t) => t.slug === "grass-roots");
  const liveRound =
    rounds.find((r) => roundStatus(r) === "live") ??
    rounds.find((r) => roundStatus(r) === "upcoming");
  const liveMatches = liveRound
    ? matches.filter((m) => m.round_id === liveRound.id)
    : [];
  const claimed = sideBets.filter((b) => b.player_name?.trim());
  const when = syncedAt
    ? new Date(syncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div className="min-h-screen bg-background px-6 py-6 text-foreground sm:px-10 sm:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="t-micro text-muted-foreground">Tin Cup 2026 · Live</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {liveRound ? `${liveRound.day_label} · ${liveRound.course}` : "Cup standings"}
            </h1>
            {when && (
              <p className="mt-2 text-base text-muted-foreground">Updated {when}</p>
            )}
          </div>
          <Link to="/" className="press btn-quiet t-body min-h-11 shrink-0 px-4">
            Exit display
          </Link>
        </header>

        {/* Cup score — huge */}
        <section className="surface px-6 py-8 text-center sm:px-10 sm:py-12">
          <div className="flex items-center justify-center gap-6 sm:gap-12">
            <div className="min-w-0">
              <p className="text-lg font-semibold text-hunter sm:text-xl">
                {sm ? teamShortName(sm.slug as "strong-mental" | "grass-roots") : "Strong Mental"}
              </p>
              <p className="mt-2 text-6xl font-bold tabular-nums tracking-tighter text-hunter sm:text-8xl">
                {Number.isInteger(standings.strongMental)
                  ? standings.strongMental
                  : standings.strongMental.toFixed(1)}
              </p>
            </div>
            <span className="text-4xl text-muted-foreground sm:text-5xl">–</span>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-stone sm:text-xl">
                {gr ? teamShortName(gr.slug as "strong-mental" | "grass-roots") : "Grass Roots"}
              </p>
              <p className="mt-2 text-6xl font-bold tabular-nums tracking-tighter text-stone sm:text-8xl">
                {Number.isInteger(standings.grassRoots)
                  ? standings.grassRoots
                  : standings.grassRoots.toFixed(1)}
              </p>
            </div>
          </div>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            {clinch.clinchedBy === "strong-mental"
              ? "Strong Mental clinches the Cup"
              : clinch.clinchedBy === "grass-roots"
                ? "Grass Roots clinches the Cup"
                : clinch.retained
                  ? "Cup retained / playoff — check rules"
                  : `${standings.played} decided · 13.5 to win`}
          </p>
        </section>

        {/* Current round matches */}
        {liveRound && liveMatches.length > 0 && (
          <section>
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-xl font-semibold sm:text-2xl">
                {liveRound.day_label} matches
              </h2>
              <p className="text-lg tabular-nums text-muted-foreground">
                {roundTally(matches, liveRound.id).strongMental}–
                {roundTally(matches, liveRound.id).grassRoots}
              </p>
            </div>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {liveMatches.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-lg font-medium sm:text-xl">
                      {m.side_a || "TBD"}{" "}
                      <span className="text-muted-foreground">vs</span> {m.side_b || "TBD"}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {m.label} · {m.points} pt{m.points === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ResultBadge result={m.result} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Side cash claimed */}
        {claimed.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-semibold sm:text-2xl">Side cash</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {claimed.map((bet) => (
                <li
                  key={bet.id}
                  className="rounded-xl border border-border bg-card px-4 py-3 sm:px-5 sm:py-4"
                >
                  <p className="text-sm text-muted-foreground">
                    {sideBetShortLabel(bet.kind)} · {contestHoleLabel(bet.hole)}
                  </p>
                  <p className="mt-1 text-lg font-semibold sm:text-xl">{bet.player_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {bet.label} · {formatPayout(bet.amount)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {claimed.length === 0 && sideBets.length > 0 && (
          <p className="text-center text-base text-muted-foreground">
            {sideBets.filter((b) => isCtp(b.kind)).length} CTP ·{" "}
            {sideBets.filter((b) => isLongDrive(b.kind)).length} LD · open
          </p>
        )}
      </div>
    </div>
  );
}

function ResultBadge({ result }: { result: string }) {
  if (result === "pending") {
    return (
      <span className="shrink-0 rounded-full border border-border px-3 py-1.5 text-base text-muted-foreground">
        Live
      </span>
    );
  }
  if (result === "halved") {
    return (
      <span className="shrink-0 rounded-full border border-border px-3 py-1.5 text-base font-semibold">
        ½–½
      </span>
    );
  }
  // Canonical results are team slugs; keep legacy a/b for any old rows.
  if (result === "strong-mental" || result === "a") {
    return (
      <span className="shrink-0 rounded-full border border-hunter/40 bg-hunter/10 px-3 py-1.5 text-base font-semibold text-hunter">
        Mental
      </span>
    );
  }
  if (result === "grass-roots" || result === "b") {
    return (
      <span className="shrink-0 rounded-full border border-stone/40 bg-stone/10 px-3 py-1.5 text-base font-semibold text-stone">
        Roots
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full border border-border px-3 py-1.5 text-base">
      {result}
    </span>
  );
}
