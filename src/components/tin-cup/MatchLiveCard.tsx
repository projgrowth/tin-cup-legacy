import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useJournal";
import { useMatchLiveReports } from "@/hooks/useMatchLiveReports";
import type { Match, Player } from "@/hooks/useTournament";
import { formatPeerLine, isStablefordLabel, pairingKeyFor, summarizeMatchPlay, summarizeStableford, type HoleMark } from "@/lib/live-report";
import { pairingIncludesLoose } from "@/lib/scoring";
import { liveScorecardOpen } from "@/lib/event-phase";

type Props = {
  claimedName: string | null;
  players: Player[];
  match?: Match | null;
  day1Index?: number;
  sideA: string;
  sideB: string;
  formatLabel?: string;
  canScore?: boolean;
  sessionLive?: boolean;
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

const MARK_CYCLE: HoleMark[] = ["won", "halved", "lost"];

function markGlyph(mark?: HoleMark) {
  if (mark === "won") return "W";
  if (mark === "halved") return "H";
  if (mark === "lost") return "L";
  return "·";
}

export function MatchLiveCard({
  claimedName,
  players,
  match,
  day1Index,
  sideA,
  sideB,
  formatLabel,
  canScore = false,
  sessionLive = false,
}: Props) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const pairingKey = pairingKeyFor(match?.id, day1Index);
  const { reports, save, remoteReady } = useMatchLiveReports(pairingKey, players);
  const player = players.find((row) => row.id === profile?.player_id);
  const mine = Boolean(claimedName) && (
    pairingIncludesLoose(sideA, claimedName!) || pairingIncludesLoose(sideB, claimedName!)
  );
  const stableford = isStablefordLabel(formatLabel ?? match?.label);
  const mineReport = reports.find((row) => row.reporterId === user?.id);
  const others = reports.filter((row) => row.reporterId !== user?.id);
  const locked = Boolean(match?.result && match.result !== "pending");
  const [pointsA, setPointsA] = useState(mineReport?.holes?.pointsA ?? 0);
  const [pointsB, setPointsB] = useState(mineReport?.holes?.pointsB ?? 0);
  const [marks, setMarks] = useState<HoleMark[]>((mineReport?.holes?.marks ?? []) as HoleMark[]);

  useEffect(() => {
    if (mineReport?.holes?.kind === "match-play" && mineReport.holes.marks) {
      setMarks(mineReport.holes.marks as HoleMark[]);
    }
    if (mineReport?.holes?.kind === "stableford") {
      setPointsA(mineReport.holes.pointsA ?? 0);
      setPointsB(mineReport.holes.pointsB ?? 0);
    }
  }, [mineReport]);

  const live = useMemo(() => {
    if (stableford) return summarizeStableford(pointsA, pointsB);
    return summarizeMatchPlay(marks);
  }, [marks, pointsA, pointsB, stableford]);

  const peer = others[0];

  if (!claimedName && reports.length === 0) return null;
  if (
    !liveScorecardOpen({
      result: match?.result,
      hasReports: reports.length > 0,
      sessionLive,
    })
  ) {
    return null;
  }

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

  function cycleHole(index: number) {
    if (index > marks.length) return;
    const next = [...marks];
    if (index === marks.length) {
      next.push("won");
    } else {
      const cur = next[index];
      const step = MARK_CYCLE.indexOf(cur);
      const nxt = MARK_CYCLE[(step + 1) % MARK_CYCLE.length];
      if (nxt === "won" && index === marks.length - 1) {
        next.pop();
      } else {
        next[index] = nxt;
      }
    }
    setMarks(next);
    void persist(next);
  }

  return (
    <section className="surface mt-2 space-y-3 px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="t-eyebrow">{locked ? "Live" : "Live · unofficial"}</p>
          <p className="t-title mt-1 flex flex-wrap items-baseline gap-x-1.5 text-foreground">
            {peer ? (
              <>
                <span>
                  {firstName(peer.playerName)} {peer.status}
                </span>
                <span className="text-muted-foreground">·</span>
              </>
            ) : null}
            <span className="text-hunter">You {live.headline}</span>
          </p>
          <p className="t-micro">{live.detail}</p>
        </div>
        {!remoteReady ? (
          <span className="t-micro shrink-0">Device only</span>
        ) : null}
      </div>

      {others.slice(1).map((row) => (
        <p key={row.reporterId} className="t-micro">
          {formatPeerLine(row.playerName, row.status)}
        </p>
      ))}

      {user && mine && player ? (
        stableford ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="t-micro">
              SM
              <input
                type="number"
                inputMode="numeric"
                className="ml-1 min-h-11 w-16 rounded border border-border bg-background px-2 py-1 t-body"
                value={pointsA}
                onChange={(event) => setPointsA(Number(event.target.value) || 0)}
              />
            </label>
            <label className="t-micro">
              GR
              <input
                type="number"
                inputMode="numeric"
                className="ml-1 min-h-11 w-16 rounded border border-border bg-background px-2 py-1 t-body"
                value={pointsB}
                onChange={(event) => setPointsB(Number(event.target.value) || 0)}
              />
            </label>
            <button
              type="button"
              className="press chip t-micro chip-on min-h-11"
              onClick={() => void persist(marks, pointsA, pointsB)}
            >
              Post live
            </button>
          </div>
        ) : (
          <div
            className="no-scrollbar -mx-1 flex flex-nowrap gap-1 overflow-x-auto"
            role="list"
            aria-label="Hole strip"
          >
            {Array.from({ length: 18 }, (_, index) => {
              const mark = marks[index];
              const open = index <= marks.length;
              return (
                <button
                  key={index}
                  type="button"
                  role="listitem"
                  disabled={!open}
                  aria-label={`Hole ${index + 1}${mark ? `, ${mark}` : ""}`}
                  onClick={() => cycleHole(index)}
                  className={`press flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border text-center ${
                    mark === "won"
                      ? "border-hunter/40 bg-hunter/10 text-hunter"
                      : mark === "lost"
                        ? "border-stone/40 bg-stone/10 text-stone"
                        : mark === "halved"
                          ? "border-border bg-secondary text-foreground"
                          : "border-border text-muted-foreground"
                  }`}
                >
                  <span className="t-micro leading-none">{index + 1}</span>
                  <span className="t-micro-strong leading-none">{markGlyph(mark)}</span>
                </button>
              );
            })}
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
        <p className="t-micro">
          Lock official waits for a match row — unofficial QA only on this pairing.
        </p>
      ) : null}

      {!user ? (
        <p className="t-micro">Guests can watch live status, not post it.</p>
      ) : null}
    </section>
  );
}
