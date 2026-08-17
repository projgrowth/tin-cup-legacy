import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Map } from "lucide-react";

import type { Match, Player, Round, SideBet, Team } from "@/hooks/useTournament";
import { LiveWireTicker } from "@/components/tin-cup/LiveWireTicker";
import { FieldChatLink } from "@/components/tin-cup/WhatsAppLinks";
import { PhotoVault } from "@/components/tin-cup/PhotoVault";
import { roundStatus } from "@/lib/scoring";
import { isCtp, isLongDrive } from "@/lib/side-bets";
import { formatPayout } from "@/lib/purse";
import { contestHoleLabel } from "@/lib/tin-cup";
import { COURSE_LABEL, ROUND_COURSE, defaultCourseId, type CourseId } from "@/lib/courses";
import { BetClaim } from "./MatchControls";
import { MyMatchCard } from "./MyMatchCard";
import { LiveHero, RoundStrip, StatusLine, StickyCupBar } from "./ScoreBoard";
import { RoundBlock } from "./RoundBlock";

function courseIdFromRound(round: Round): CourseId {
  if (ROUND_COURSE[round.slug]) return ROUND_COURSE[round.slug];
  const c = round.course.toLowerCase();
  if (c.includes("copperhead")) return "copperhead";
  if (c.includes("island")) return "island";
  if (c.includes("south")) return "south";
  return defaultCourseId();
}

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
  claimedName = null,
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
  claimedName?: string | null;
}) {
  const ctp = sideBets.filter((b) => isCtp(b.kind));
  const ld = sideBets.filter((b) => isLongDrive(b.kind));
  const claimedPots = sideBets.filter((b) => Boolean(b.player_name?.trim())).length;
  const decided = matches.some((m) => m.result !== "pending");
  const [needsResultOnly, setNeedsResultOnly] = useState(initialOpenOnly);
  // Open side cash when captains are scoring or any pot is claimed — outdoor glance.
  const [sideOpen, setSideOpen] = useState(canScore || claimedPots > 0);
  const orderedRounds = useMemo(() => {
    const weight: Record<string, number> = { live: 0, upcoming: 1, complete: 2 };
    return [...rounds].sort(
      (a, b) => (weight[roundStatus(a)] ?? 9) - (weight[roundStatus(b)] ?? 9),
    );
  }, [rounds]);

  const liveRound =
    orderedRounds.find((r) => roundStatus(r) === "live") ??
    orderedRounds.find((r) => roundStatus(r) === "upcoming") ??
    orderedRounds[0];
  const planCourse = liveRound ? courseIdFromRound(liveRound) : defaultCourseId();

  return (
    <div className="stack-page">
      <LiveHero rounds={rounds} matches={matches} teams={teams} />
      {/* Always show race sticky — remaining points matter before any result posts */}
      <StickyCupBar matches={matches} />
      {decided && <RoundStrip rounds={rounds} matches={matches} />}

      {/* Claimed player: who you play right now */}
      {claimedName && (
        <MyMatchCard
          claimedName={claimedName}
          rounds={rounds}
          matches={matches}
          players={players}
          teams={teams}
        />
      )}

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
          />
        ))}
      </section>

      <Link
        to="/scout"
        search={{ course: planCourse }}
        className="press t-micro flex min-h-11 items-center justify-between gap-3 px-1 font-semibold text-foreground"
      >
        <span className="inline-flex items-center gap-2">
          <Map className="size-3.5 opacity-70" />
          {COURSE_LABEL[planCourse]} game plan
        </span>
        <span className="text-muted-foreground">Open →</span>
      </Link>

      <LiveWireTicker
        matches={matches}
        sideBets={sideBets}
        players={players}
        teams={teams}
        variant="live"
        limit={3}
      />

      <FieldChatLink className="!min-h-11 w-full" />

      <StatusLine
        syncedAt={syncedAt}
        pendingWrites={pendingWrites}
        failedWrites={failedWrites}
        onRetryFailed={onRetryFailed}
        stale={stale}
      />

      <section className="panel overflow-hidden">
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

      {/* Photos after board — secondary during live play */}
      <PhotoVault canUpload={canUpload} variant="pulse" hideWhenEmpty />
    </div>
  );
}
