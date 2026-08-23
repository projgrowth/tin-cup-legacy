import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useJournal";
import { useMatchLiveReports } from "@/hooks/useMatchLiveReports";
import type { Match, Player } from "@/hooks/useTournament";
import { formatPeerLine, isStablefordLabel, pairingKeyFor, summarizeMatchPlay, summarizeStableford, type HoleMark } from "@/lib/live-report";
import { pairingIncludesLoose } from "@/lib/scoring";

type Props = {
  claimedName: string | null;
  players: Player[];
  match?: Match | null;
  day1Index?: number;
  sideA: string;
  sideB: string;
  formatLabel?: string;
  canScore?: boolean;
};

export function MatchLiveCard({
  claimedName,
  players,
  match,
  day1Index,
  sideA,
  sideB,
  formatLabel,
  canScore = false,
}: Props) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const pairingKey = pairingKeyFor(match?.id, day1Index);
  const { reports, save, remoteReady } = useMatchLiveReports(pairingKey, players);
  const player = players.find((row) => row.id === profile?.player_id);
  const mine = Boolean(claimedName) && (
    pairingIncludesLoose(sideA, claimedName!) || pairingIncludesLoose(sideB, claimedName!)
  );
  const onA = claimedName ? pairingIncludesLoose(sideA, claimedName) : false;
  const stableford = isStablefordLabel(formatLabel ?? match?.label);
  const mineReport = reports.find((row) => row.reporterId === user?.id);
  const others = reports.filter((row) => row.reporterId !== user?.id);
  const [pointsA, setPointsA] = useState(mineReport?.holes?.pointsA ?? 0);
  const [pointsB, setPointsB] = useState(mineReport?.holes?.pointsB ?? 0);
  const marks = (mineReport?.holes?.marks ?? []) as HoleMark[];
  const live = useMemo(() => {
    if (stableford) return summarizeStableford(pointsA, pointsB);
    return summarizeMatchPlay(marks);
  }, [marks, pointsA, pointsB, stableford]);

  if (!claimedName && reports.length === 0) return null;

  async function persist(nextMarks: HoleMark[], nextA = pointsA, nextB = pointsB) {
    if (!user || !player) {
      toast.error("Claim your roster seat to post live status.");
      return;
    }
    const summary = stableford
      ? summarizeStableford(nextA, nextB)
      : summarizeMatchPlay(nextMarks);
    try {
      const result = await save({
        pairingKey,
        matchId: match?.id ?? null,
        playerId: player.id,
        status: summary.headline,
        holes: stableford
          ? { kind: "stableford", pointsA: nextA, pointsB: nextB }
          : { kind: "match-play", marks: nextMarks },
      });
      if (result.source === "local") {
        toast.success("Live status saved unofficially on this device");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save live status");
    }
  }

  return (
    <section className="surface mt-2 space-y-3 px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="t-eyebrow">Live · unofficial</p>
          <p className="t-title mt-1 text-hunter">{live.headline}</p>
          <p className="t-micro text-muted-foreground">{live.detail}</p>
        </div>
        {!remoteReady ? (
          <span className="t-micro text-muted-foreground">Device only</span>
        ) : null}
      </div>

      {others.length > 0 ? (
        <ul className="space-y-1">
          {others.map((row) => (
            <li key={row.reporterId} className="t-micro text-muted-foreground">
              {formatPeerLine(row.playerName, row.status)}
            </li>
          ))}
        </ul>
      ) : null}

      {user && mine && player ? (
        stableford ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="t-micro">
              SM
              <input
                type="number"
                inputMode="numeric"
                className="ml-1 w-14 rounded border border-border bg-background px-2 py-1 t-body"
                value={pointsA}
                onChange={(event) => setPointsA(Number(event.target.value) || 0)}
              />
            </label>
            <label className="t-micro">
              GR
              <input
                type="number"
                inputMode="numeric"
                className="ml-1 w-14 rounded border border-border bg-background px-2 py-1 t-body"
                value={pointsB}
                onChange={(event) => setPointsB(Number(event.target.value) || 0)}
              />
            </label>
            <button
              type="button"
              className="press chip t-micro chip-on"
              onClick={() => void persist(marks, pointsA, pointsB)}
            >
              Post live
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["won", "Hole won"],
                ["halved", "Halved"],
                ["lost", "Hole lost"],
              ] as const
            ).map(([mark, label]) => (
              <button
                key={mark}
                type="button"
                className="press chip t-micro"
                onClick={() => void persist([...marks, mark])}
              >
                {label}
              </button>
            ))}
            {marks.length > 0 ? (
              <button
                type="button"
                className="press chip t-micro"
                onClick={() => void persist(marks.slice(0, -1))}
              >
                Undo hole
              </button>
            ) : null}
          </div>
        )
      ) : null}

      {canScore && match ? (
        <Link
          to="/"
          search={{ score: true, match: match.id }}
          className="press t-micro inline-flex min-h-11 items-center font-semibold text-hunter"
        >
          Lock official
        </Link>
      ) : canScore && !match ? (
        <p className="t-micro text-muted-foreground">
          Lock official waits for a match row — unofficial QA only on this pairing.
        </p>
      ) : null}

      {!user ? (
        <p className="t-micro text-muted-foreground">Guests can watch live status, not post it.</p>
      ) : null}
    </section>
  );
}
