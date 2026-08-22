import { useState } from "react";

import { MatchCard } from "@/components/tin-cup/MatchCard";
import { MatchSocialActions } from "@/components/tin-cup/MatchSocialActions";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useJournal";
import { useMatchSocial } from "@/hooks/useMatchSocial";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { matchFormatChip, pairingIncludesLoose, playerInMatch, roundStatus, roundTally } from "@/lib/scoring";
import { MatchPairingEditor, MatchResultButtons } from "./MatchControls";

function resultText(result: string): string | null {
  if (result === "pending") return null;
  if (result === "halved") return "Halved";
  if (result === "strong-mental") return "Strong Mental";
  if (result === "grass-roots") return "Grass Roots";
  return result;
}

export function RoundBlock({
  round,
  matches,
  teams = [],
  players = [],
  canScore = false,
  pendingOnly = false,
  claimedName = null,
  flashedMatchIds = [],
}: {
  round: Round;
  matches: Match[];
  teams?: Team[];
  players?: Player[];
  canScore?: boolean;
  pendingOnly?: boolean;
  claimedName?: string | null;
  flashedMatchIds?: string[];
}) {
  const status = roundStatus(round);
  const rows = matches.filter(
    (m) => m.round_id === round.id && (!pendingOnly || m.result === "pending"),
  );
  const tally = roundTally(matches, round.id);
  const allDone =
    status === "complete" ||
    (rows.length > 0 && rows.every((m) => m.result !== "pending") && !pendingOnly);
  // Default open only for the live round; completed / upcoming stay collapsed.
  const [open, setOpen] = useState(status === "live");
  const avatars = usePlayerAvatars(players, teams);
  const { user } = useAuth();
  const { profile } = useProfile();
  const player = players.find((candidate) => candidate.id === profile?.player_id) ?? null;
  const social = useMatchSocial(user?.id, player?.id);
  const showSocial = social.predictionsEnabled || social.confirmationsEnabled;

  if (rows.length === 0 && pendingOnly) return null;

  return (
    <div>
      <article className="surface overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="press flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
          aria-expanded={open}
        >
          <div className="min-w-0">
            <h3 className="t-title truncate text-foreground">
              {round.day_label}
              {status === "live" && (
                <span className="t-micro ml-2 font-normal text-[var(--status-live)]">Live</span>
              )}
              {allDone && status !== "live" && (
                <span className="t-micro ml-2 font-normal text-muted-foreground">Final</span>
              )}
            </h3>
            <p className="t-micro mt-0.5 truncate text-muted-foreground">
              {round.course}
              {round.format ? ` · ${round.format}` : ""}
            </p>
          </div>
          <span className="t-numeral shrink-0 text-foreground">
            {tally.strongMental}–{tally.grassRoots}
          </span>
        </button>
      </article>

      {open && (
        <div className="mt-2.5">
          {rows.length > 0 ? (
            <ul className="space-y-2.5">
              {rows.map((match) => {
                const mine =
                  Boolean(claimedName) && playerInMatch(match, claimedName!);
                const format = matchFormatChip(match.label);
                const liveOpen = status === "live" && match.result === "pending";
                const justUpdated = flashedMatchIds.includes(match.id);
                return (
                  <li
                    key={match.id}
                    className={justUpdated ? "match-just-updated rounded-xl" : undefined}
                  >
                    <MatchCard
                      sideA={match.side_a ?? "TBD"}
                      sideB={match.side_b ?? "TBD"}
                      peopleA={(avatars.data?.forSide(match.side_a) ?? []).map((e) => ({
                        name: e.name,
                        teamSlug: e.teamSlug,
                        src: e.url,
                      }))}
                      peopleB={(avatars.data?.forSide(match.side_b) ?? []).map((e) => ({
                        name: e.name,
                        teamSlug: e.teamSlug,
                        src: e.url,
                      }))}
                      format={format}
                      points={match.points}
                      yours={mine}
                      yoursOnA={mine ? pairingIncludesLoose(match.side_a, claimedName!) : undefined}
                      live={liveOpen}
                      result={resultText(match.result)}
                      action={
                        canScore || showSocial ? (
                          <>
                            {canScore ? (
                              <>
                                <MatchResultButtons match={match} teams={teams} />
                                <MatchPairingEditor
                                  match={match}
                                  teams={teams}
                                  players={players}
                                />
                              </>
                            ) : null}
                            {showSocial ? (
                              <MatchSocialActions
                                match={match}
                                userId={user?.id}
                                player={player}
                                social={social}
                              />
                            ) : null}
                          </>
                        ) : undefined
                      }
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="t-micro px-1 text-muted-foreground">No open matches in this filter.</p>
          )}
        </div>
      )}
    </div>
  );
}
