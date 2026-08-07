import { useMemo, useState } from "react";
import type { Match, Player, Round, SideBet, Team } from "@/hooks/useTournament";
import { PhotoVault } from "@/components/tin-cup/PhotoVault";
import { roundStatus } from "@/lib/scoring";
import { isCtp, isLongDrive } from "@/lib/side-bets";
import { formatPayout } from "@/lib/purse";
import { BetClaim } from "./MatchControls";
import { LiveHero, RoundStrip, StatusLine, StickyCupBar } from "./ScoreBoard";
import { RoundBlock } from "./RoundBlock";

export function LivePanel({
  rounds,
  matches,
  teams,
  players,
  sideBets,
  syncedAt,
  pendingWrites = 0,
  failedWrites = 0,
  onRetryFailed,
  stale = false,
  canScore = false,
  canUpload = false,
  initialOpenOnly = false,
}: {
  rounds: Round[];
  matches: Match[];
  teams: Team[];
  players: Player[];
  sideBets: SideBet[];
  syncedAt?: number;
  pendingWrites?: number;
  failedWrites?: number;
  onRetryFailed?: () => void;
  stale?: boolean;
  canScore?: boolean;
  canUpload?: boolean;
  initialOpenOnly?: boolean;
}) {
  const ctp = sideBets.filter((b) => isCtp(b.kind));
  const ld = sideBets.filter((b) => isLongDrive(b.kind));
  const decided = matches.some((m) => m.result !== "pending");
  const [needsResultOnly, setNeedsResultOnly] = useState(initialOpenOnly);
  const [sideOpen, setSideOpen] = useState(false);
  const orderedRounds = useMemo(() => {
    const weight: Record<string, number> = { live: 0, upcoming: 1, complete: 2 };
    return [...rounds].sort(
      (a, b) => (weight[roundStatus(a)] ?? 9) - (weight[roundStatus(b)] ?? 9),
    );
  }, [rounds]);

  return (
    <div className="space-y-6">
      <LiveHero rounds={rounds} matches={matches} teams={teams} />
      {decided && <StickyCupBar matches={matches} />}
      {decided && <RoundStrip rounds={rounds} matches={matches} />}
      <StatusLine
        syncedAt={syncedAt}
        pendingWrites={pendingWrites}
        failedWrites={failedWrites}
        onRetryFailed={onRetryFailed}
        stale={stale}
      />

      <PhotoVault canUpload={canUpload} variant="pulse" />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="t-section text-foreground">Matches</h2>
            {!canScore && (
              <p className="t-micro mt-0.5 text-muted-foreground">
                Live cup · scores posted by captains
              </p>
            )}
          </div>
          {canScore && (
            <button
              type="button"
              aria-pressed={needsResultOnly}
              onClick={() => setNeedsResultOnly((value) => !value)}
              className={`press min-h-10 rounded-full border px-3 t-micro font-semibold ${
                needsResultOnly
                  ? "border-foreground/25 bg-secondary text-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {needsResultOnly ? "Open only" : "All"}
            </button>
          )}
        </div>
        {orderedRounds.map((round) => (
          <RoundBlock
            key={round.id}
            round={round}
            matches={matches}
            teams={teams}
            players={players}
            canScore={canScore}
            pendingOnly={needsResultOnly}
          />
        ))}
      </section>

      <section className="surface overflow-hidden">
        <button
          type="button"
          onClick={() => setSideOpen((v) => !v)}
          className="press flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
          aria-expanded={sideOpen}
        >
          <span className="t-body font-medium text-foreground">
            Side cash
            <span className="t-micro ml-2 font-normal text-muted-foreground">
              {ctp.length} CTP · {ld.length} LD
            </span>
          </span>
          <span className="t-micro text-muted-foreground">{sideOpen ? "Hide" : "Show"}</span>
        </button>
        {sideOpen && (
          <div className="space-y-5 border-t border-border px-4 pb-4 pt-3">
            {[
              { title: "Closest to the Pin", rows: ctp },
              { title: "Long Drive", rows: ld },
            ].map((group) => (
              <div key={group.title}>
                <h3 className="t-micro text-muted-foreground">{group.title}</h3>
                {group.rows.length === 0 ? (
                  <p className="t-micro mt-1 text-muted-foreground">No pots yet.</p>
                ) : (
                  <ul className="mt-1 divide-y divide-border">
                    {group.rows.map((bet) => (
                      <li key={bet.id} className="py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="t-body min-w-0 truncate text-foreground">
                            {bet.label}
                          </span>
                          <span className="t-body shrink-0 text-right text-foreground">
                            {bet.player_name ?? "Open"}
                            <span className="t-micro ml-1.5 text-muted-foreground">
                              {formatPayout(bet.amount)}
                            </span>
                          </span>
                        </div>
                        {canScore && <BetClaim bet={bet} players={players} />}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
