import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Match, Player, Round, SideBet, Team, Trophy } from "@/hooks/useTournament";
import { FieldChatLink } from "@/components/tin-cup/WhatsAppLinks";
import { roundStatus } from "@/lib/scoring";
import { isCtp, isLongDrive } from "@/lib/side-bets";
import { formatPayout } from "@/lib/purse";
import { contestHoleLabel } from "@/lib/tin-cup";
import { COURSE_LABEL, courseIdFromRound, defaultCourseId } from "@/lib/courses";
import { BetClaim, TrophyAward } from "./MatchControls";
import { MyMatchCard } from "./MyMatchCard";
import { LiveHero, RoundStrip, StatusLine } from "./ScoreBoard";
import { RoundBlock } from "./RoundBlock";

export function LivePanel({
  rounds,
  matches,
  teams,
  players,
  sideBets,
  trophies = [],
  syncedAt,
  pendingWrites = 0,
  failedWrites = 0,
  onRetryFailed,
  stale = false,
  canScore = false,
  canUpload: _canUpload = false,
  initialOpenOnly = false,
  claimedName = null,
  variant = "full",
  flashedMatchIds = [],
}: {
  rounds: Round[];
  matches: Match[];
  teams: Team[];
  players: Player[];
  sideBets: SideBet[];
  trophies?: Trophy[];
  syncedAt?: number;
  pendingWrites?: number;
  failedWrites?: number;
  onRetryFailed?: () => void;
  stale?: boolean;
  canScore?: boolean;
  canUpload?: boolean;
  initialOpenOnly?: boolean;
  claimedName?: string | null;
  variant?: "full" | "hero" | "board";
  flashedMatchIds?: string[];
}) {
  const ctp = sideBets.filter((b) => isCtp(b.kind));
  const ld = sideBets.filter((b) => isLongDrive(b.kind));
  const claimedPots = sideBets.filter((b) => Boolean(b.player_name?.trim())).length;
  const decided = matches.some((m) => m.result !== "pending");
  const [needsResultOnly, setNeedsResultOnly] = useState(initialOpenOnly);
  const awarded = trophies.filter((trophy) => Boolean(trophy.winner_name?.trim())).length;
  const [awardsOpen, setAwardsOpen] = useState(canScore || awarded > 0);
  // Open side cash when captains are scoring or any pot is claimed — outdoor glance.
  const [sideOpen, setSideOpen] = useState(canScore || claimedPots > 0);
  const orderedRounds = useMemo(() => {
    const open = (roundId: string) =>
      matches.some((match) => match.round_id === roundId && match.result === "pending");
    const weight = (round: Round) => {
      if (open(round.id)) return 0;
      return { live: 1, upcoming: 2, complete: 3 }[roundStatus(round)] ?? 9;
    };
    return [...rounds].sort((a, b) => weight(a) - weight(b));
  }, [rounds, matches]);

  const liveRound =
    orderedRounds.find((r) => roundStatus(r) === "live") ??
    orderedRounds.find((r) => roundStatus(r) === "upcoming") ??
    orderedRounds[0];
  const planCourse = courseIdFromRound(liveRound) ?? defaultCourseId();

  const hero = (
    <>
      <LiveHero rounds={rounds} matches={matches} teams={teams} />
      {decided && variant !== "hero" && <RoundStrip rounds={rounds} matches={matches} />}
      {claimedName && (
        <MyMatchCard
          claimedName={claimedName}
          rounds={rounds}
          matches={matches}
          players={players}
          teams={teams}
          canScore={canScore}
        />
      )}
      {variant === "hero" && (
        <StatusLine
          syncedAt={syncedAt}
          pendingWrites={pendingWrites}
          failedWrites={failedWrites}
          onRetryFailed={onRetryFailed}
          stale={stale}
        />
      )}
    </>
  );
  if (variant === "hero") return <div className="stack-tight">{hero}</div>;

  return (
    <div className="stack-page">
      {variant === "full" && hero}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="t-eyebrow">Matches</h2>
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
              className={`press chip t-micro ${needsResultOnly ? "chip-on" : ""}`}
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
            claimedName={claimedName}
            flashedMatchIds={flashedMatchIds}
          />
        ))}
      </section>

      <div className="surface overflow-hidden">
        <Link
          to="/scout"
          search={{ course: planCourse, card: true }}
          className="press flex min-h-12 items-center justify-between px-4 py-3"
        >
          <span className="t-body font-medium text-foreground">
            {COURSE_LABEL[planCourse]} game plan
          </span>
          <span className="t-micro">Plan</span>
        </Link>
      </div>

      <FieldChatLink className="!min-h-11 w-full" />

      <StatusLine
        syncedAt={syncedAt}
        pendingWrites={pendingWrites}
        failedWrites={failedWrites}
        onRetryFailed={onRetryFailed}
        stale={stale}
      />

      {trophies.length > 0 && (
        <section className="surface overflow-hidden">
          <button
            type="button"
            onClick={() => setAwardsOpen((value) => !value)}
            className="press flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
            aria-expanded={awardsOpen}
          >
            <span className="t-body font-medium text-foreground">
              Awards
              <span className="t-micro ml-2 font-normal text-muted-foreground">
                {awarded}/{trophies.length} assigned · MVP & Vibes
              </span>
            </span>
            <span className="t-micro text-muted-foreground">{awardsOpen ? "Hide" : "Show"}</span>
          </button>
          {awardsOpen && (
            <ul className="divide-y divide-border border-t border-border px-4 pb-2">
              {trophies.map((trophy) => (
                <li key={trophy.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="t-body min-w-0 truncate text-foreground">{trophy.name}</span>
                    <span className="t-body shrink-0 text-right text-foreground">
                      {trophy.winner_name ?? "Open"}
                    </span>
                  </div>
                  {canScore ? (
                    <TrophyAward trophy={trophy} players={players} teams={teams} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

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
              {claimedPots}/{sideBets.length} claimed · {ctp.length} CTP · {ld.length} LD
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
                          <span className="min-w-0">
                            <span className="t-body block truncate text-foreground">
                              {bet.label}
                            </span>
                            <span className="t-micro text-muted-foreground">
                              {contestHoleLabel(bet.hole)}
                              {bet.distance != null ? ` · ${bet.distance}` : ""}
                            </span>
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
