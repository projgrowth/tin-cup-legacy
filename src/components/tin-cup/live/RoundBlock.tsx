import { useState } from "react";

import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { roundStatus, roundTally } from "@/lib/scoring";
import { MatchPairingEditor, MatchResultButtons } from "./MatchControls";

export function RoundBlock({
  round,
  matches,
  teams = [],
  players = [],
  canScore = false,
  pendingOnly = false,
}: {
  round: Round;
  matches: Match[];
  teams?: Team[];
  players?: Player[];
  canScore?: boolean;
  pendingOnly?: boolean;
}) {
  const status = roundStatus(round);
  const rows = matches.filter(
    (m) => m.round_id === round.id && (!pendingOnly || m.result === "pending"),
  );
  const tally = roundTally(matches, round.id);
  const allDone =
    status === "complete" ||
    (rows.length > 0 && rows.every((m) => m.result !== "pending") && !pendingOnly);
  const [open, setOpen] = useState(status === "live" || !allDone);

  if (rows.length === 0 && pendingOnly) return null;

  return (
    <article className="surface-inset overflow-hidden">
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
              <span className="t-micro ml-2 font-normal text-muted-foreground">Live</span>
            )}
            {allDone && status !== "live" && (
              <span className="t-micro ml-2 font-normal text-muted-foreground">Final</span>
            )}
          </h3>
          <p className="t-micro mt-0.5 truncate text-muted-foreground">{round.course}</p>
        </div>
        <span className="t-numeral shrink-0 text-foreground">
          {tally.strongMental}–{tally.grassRoots}
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-3.5 pt-1">
          {rows.length > 0 ? (
            <ul className="divide-y divide-border">
              {rows.map((match) => (
                <li key={match.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="t-body block truncate font-medium text-foreground">
                        {match.side_a || match.side_b
                          ? `${match.side_a ?? "TBD"} vs ${match.side_b ?? "TBD"}`
                          : match.label}
                      </span>
                      {(match.side_a || match.side_b) && (
                        <span className="t-micro block truncate text-muted-foreground">
                          {match.label} · {match.points}pt
                        </span>
                      )}
                    </span>
                    <span
                      className={`t-body shrink-0 pt-0.5 tabular-nums ${
                        match.result === "pending"
                          ? "text-muted-foreground"
                          : match.result === "strong-mental"
                            ? "text-gold-light"
                            : match.result === "grass-roots"
                              ? "text-copper"
                              : "text-foreground"
                      }`}
                    >
                      {match.result === "pending"
                        ? `${match.points}pt`
                        : match.result === "halved"
                          ? "½"
                          : match.result === "strong-mental"
                            ? "SM"
                            : "GR"}
                    </span>
                  </div>
                  {canScore && (
                    <>
                      <MatchResultButtons match={match} teams={teams} />
                      <MatchPairingEditor match={match} teams={teams} players={players} />
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-micro mt-2 text-muted-foreground">No open matches in this filter.</p>
          )}
        </div>
      )}
    </article>
  );
}
