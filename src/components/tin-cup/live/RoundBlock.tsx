import { useState } from "react";

import { AvatarPair } from "@/components/tin-cup/Avatar";
import { MatchSocialActions } from "@/components/tin-cup/MatchSocialActions";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useJournal";
import { useMatchSocial } from "@/hooks/useMatchSocial";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { matchFormatChip, playerInMatch, roundStatus, roundTally } from "@/lib/scoring";
import { MatchPairingEditor, MatchResultButtons } from "./MatchControls";

function resultTone(result: string): string {
  if (result === "pending") return "text-muted-foreground";
  if (result === "strong-mental") return "text-gold-light";
  if (result === "grass-roots") return "text-copper";
  return "text-foreground";
}

function resultText(result: string, points: number): string {
  if (result === "pending") return `${points}pt`;
  if (result === "halved") return "½";
  if (result === "strong-mental") return "SM";
  if (result === "grass-roots") return "GR";
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

  if (rows.length === 0 && pendingOnly) return null;

  return (
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
              <span className="t-micro ml-2 font-normal text-copper">Live</span>
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

      {open && (
        <div className="border-t border-border px-3 pb-3 pt-1 sm:px-4">
          {rows.length > 0 ? (
            <ul className="space-y-2 pt-2">
              {rows.map((match) => {
                const mine =
                  Boolean(claimedName) && playerInMatch(match, claimedName!);
                const format = matchFormatChip(match.label);
                const liveOpen = status === "live" && match.result === "pending";
                const justUpdated = flashedMatchIds.includes(match.id);
                return (
                  <li
                    key={match.id}
                    className={`rounded-xl border px-3 py-3 ${
                      justUpdated
                        ? "match-just-updated border-gold/50 bg-gold/12"
                        : mine
                          ? "border-gold/35 bg-gold/8"
                          : liveOpen
                            ? "border-[var(--hud-border)] bg-[var(--hud-bg)]"
                            : "border-border/70 bg-background/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex min-w-0 flex-1 items-center gap-2.5">
                        {(match.side_a || match.side_b) && (
                          <span className="flex shrink-0 items-center gap-1">
                            <AvatarPair
                              people={(avatars.data?.forSide(match.side_a) ?? []).map(
                                (e) => ({
                                  name: e.name,
                                  teamSlug: e.teamSlug,
                                  src: e.url,
                                }),
                              )}
                            />
                            <span className="t-micro text-muted-foreground">vs</span>
                            <AvatarPair
                              people={(avatars.data?.forSide(match.side_b) ?? []).map(
                                (e) => ({
                                  name: e.name,
                                  teamSlug: e.teamSlug,
                                  src: e.url,
                                }),
                              )}
                            />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="t-body block truncate font-medium text-foreground">
                            {match.side_a || match.side_b
                              ? `${match.side_a ?? "TBD"} vs ${match.side_b ?? "TBD"}`
                              : match.label}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-full border px-2 py-0.5 t-micro font-semibold ${
                                mine
                                  ? "border-gold/40 bg-gold/15 text-gold-light"
                                  : "border-[var(--hud-border)] bg-black/20 text-[var(--hud-muted)]"
                              }`}
                            >
                              {format}
                            </span>
                            <span className="rounded-full border border-border/80 px-2 py-0.5 t-micro font-semibold tabular-nums text-muted-foreground">
                              {match.points}pt
                            </span>
                            {mine && (
                              <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 t-micro font-semibold text-gold-light">
                                You
                              </span>
                            )}
                            {liveOpen && (
                              <span className="rounded-full border border-copper/35 bg-copper/10 px-2 py-0.5 t-micro font-semibold text-copper">
                                Live
                              </span>
                            )}
                          </span>
                        </span>
                      </span>
                      <span
                        className={`hud-num shrink-0 pt-0.5 text-base ${resultTone(match.result)}`}
                      >
                        {resultText(match.result, match.points)}
                      </span>
                    </div>
                    {canScore && (
                      <>
                        <MatchResultButtons match={match} teams={teams} />
                        <MatchPairingEditor
                          match={match}
                          teams={teams}
                          players={players}
                        />
                      </>
                    )}
                    <MatchSocialActions
                      match={match}
                      userId={user?.id}
                      player={player}
                      social={social}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="t-micro mt-2 text-muted-foreground">
              No open matches in this filter.
            </p>
          )}
        </div>
      )}
    </article>
  );
}
