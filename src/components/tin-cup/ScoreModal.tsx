import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MatchPairingEditor } from "@/components/tin-cup/live/MatchControls";
import {
  tournamentQueryKey,
  type Match,
  type Player,
  type Round,
  type SideBet,
  type Team,
} from "@/hooks/useTournament";
import {
  clinchSummary,
  defaultScoreRoundId,
  roundTally,
  tallyStandings,
} from "@/lib/scoring";
import { formatPayout } from "@/lib/purse";
import { contestHoleLabel } from "@/lib/tin-cup";
import { enqueueWrite, expectedVersionAfterWrite } from "@/lib/write-queue";

type Props = {
  matches: Match[];
  rounds: Round[];
  players: Player[];
  teams?: Team[];
  sideBets: SideBet[];
  startOpen?: boolean;
  initialMatchId?: string;
  onCloseSearch?: () => void;
};

const RESULTS = [
  { value: "strong-mental", label: "Strong Mental" },
  { value: "grass-roots", label: "Grass Roots" },
  { value: "halved", label: "Halved" },
  { value: "pending", label: "Clear" },
] as const;

const RESULT_LABEL: Record<string, string> = {
  "strong-mental": "Strong Mental",
  "grass-roots": "Grass Roots",
  halved: "Halved",
  pending: "Not played",
};

export function ScoreModal({
  matches,
  rounds,
  players,
  teams = [],
  sideBets,
  startOpen = false,
  initialMatchId,
  onCloseSearch,
}: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(startOpen);
  const [tab, setTab] = useState<"match" | "bet">("match");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [betId, setBetId] = useState<string | null>(null);
  const [player, setPlayer] = useState("");
  const [otherPlayer, setOtherPlayer] = useState(false);
  const [distance, setDistance] = useState("");
  const [saving, setSaving] = useState(false);

  const rosterNames = players.map((p) => p.name);
  const isRosterName = (n: string) => rosterNames.includes(n.trim());

  useEffect(() => {
    if (!startOpen && !initialMatchId) return;
    setOpen(true);
    if (initialMatchId) {
      const target = matches.find((match) => match.id === initialMatchId);
      if (target) {
        setRoundId(target.round_id);
        setMatchId(target.id);
        setTab("match");
      }
    }
  }, [startOpen, initialMatchId, matches]);

  // Default to the live round, or the one that still has results to log.
  useEffect(() => {
    if (roundId || rounds.length === 0) return;
    setRoundId(defaultScoreRoundId(rounds, matches));
  }, [rounds, matches, roundId]);

  const roundMatches = useMemo(
    () => matches.filter((m) => !roundId || m.round_id === roundId),
    [matches, roundId],
  );

  const reset = () => {
    setMatchId(null);
    setConfirm(null);
    setBetId(null);
    setPlayer("");
    setOtherPlayer(false);
    setDistance("");
  };

  async function saveResult(result: string) {
    const target = matches.find((m) => m.id === matchId);
    if (!target) return;
    const previous = target.result;
    setSaving(true);
    const status = await enqueueWrite(
      "matches",
      target.id,
      { result },
      target.revision ?? target.updated_at,
    );
    setSaving(false);

    if (status === "rejected") {
      toast.error("Could not save that result. Captains only.");
      return;
    }
    if (status === "conflict") {
      toast.error("That match changed on another device. Refresh before saving again.");
      return;
    }

    toast.success(
      status === "saved"
        ? `${target.label}: ${RESULT_LABEL[result]}`
        : "Saved offline — syncs when you get signal",
      {
        duration: 10_000,
        action: {
          label: "Undo",
          onClick: () => {
            void enqueueWrite(
              "matches",
              target.id,
              { result: previous },
              expectedVersionAfterWrite(target.revision ?? target.updated_at, status),
            ).then(() => queryClient.invalidateQueries({ queryKey: tournamentQueryKey }));
          },
        },
      },
    );
    void queryClient.invalidateQueries({ queryKey: tournamentQueryKey });
    reset();
    setOpen(false);
  }

  async function saveBet() {
    if (!betId || !player.trim()) {
      toast.error("Pick a bet and enter the player.");
      return;
    }
    const target = sideBets.find((b) => b.id === betId);
    if (!target) return;
    const previous = {
      player_name: target.player_name,
      distance: target.distance,
    };
    setSaving(true);
    const status = await enqueueWrite(
      "side_bets",
      betId,
      {
        player_name: player.trim(),
        distance: distance.trim() || null,
      },
      target.revision ?? target.updated_at,
    );
    setSaving(false);
    if (status === "rejected") {
      toast.error("Could not log that claim. Captains only.");
      return;
    }
    if (status === "conflict") {
      toast.error("That claim changed on another device. Refresh before saving again.");
      return;
    }
    toast.success(status === "saved" ? "Side bet logged" : "Saved offline — syncs later", {
      duration: 10_000,
      action: {
        label: "Undo",
        onClick: () => {
          void enqueueWrite(
            "side_bets",
            betId,
            previous,
            expectedVersionAfterWrite(target.revision ?? target.updated_at, status),
          ).then(() => queryClient.invalidateQueries({ queryKey: tournamentQueryKey }));
        },
      },
    });
    void queryClient.invalidateQueries({ queryKey: tournamentQueryKey });
    reset();
    setOpen(false);
  }

  const selectedMatch = matches.find((m) => m.id === matchId);
  const standings = tallyStandings(matches);
  const clinch = clinchSummary(standings);
  const selectedRound = rounds.find((r) => r.id === roundId);
  const roundScore = roundId ? roundTally(matches, roundId) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
          onCloseSearch?.();
        }
      }}
    >
      <DialogTrigger
        aria-label="Captain score input"
        className="press fixed bottom-24 right-4 z-40 inline-flex size-14 items-center justify-center rounded-full bg-hunter text-primary-foreground shadow-[0_4px_16px_-6px_oklch(0_0_0/55%)]"
      >
        <Plus className="size-6" />
        <span className="sr-only">Captain score input</span>
      </DialogTrigger>
      <DialogContent className="bottom-0 top-auto max-h-[88svh] max-w-none translate-y-0 overflow-y-auto rounded-t-3xl border-border bg-card/95 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:bottom-auto sm:top-[50%] sm:max-w-sm sm:translate-y-[-50%] sm:rounded-lg sm:p-6">
        <DialogHeader>
          <DialogTitle className="t-title text-foreground">Captain Input</DialogTitle>
        </DialogHeader>

        <p className="t-micro -mt-1">
          {clinch.clinchedBy
            ? "The Cup is already clinched"
            : clinch.leader
              ? `${clinch.leader === "strong-mental" ? "Strong Mental" : "Grass Roots"} needs ${clinch.leaderNeeds} more · ${standings.remaining} still out there`
              : `All square · ${standings.remaining} points still on the course`}
        </p>

        <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-secondary/40 p-1">
          {(["match", "bet"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`press t-body min-h-11 rounded-lg py-2 font-medium ${
                tab === key ? "bg-secondary text-foreground" : "text-muted-foreground"
              }`}
            >
              {key === "match" ? "Match result" : "CTP / Long drive"}
            </button>
          ))}
        </div>

        {tab === "match" ? (
          <div className="space-y-3">
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {rounds.map((round) => (
                <button
                  key={round.id}
                  type="button"
                  onClick={() => {
                    setRoundId(round.id);
                    setMatchId(null);
                    setConfirm(null);
                  }}
                  className={`press t-body min-h-11 shrink-0 rounded-full border px-3 py-1.5 ${
                    roundId === round.id
                      ? "border-foreground/30 bg-secondary text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {round.day_label}
                </button>
              ))}
            </div>
            <div className="no-scrollbar max-h-56 space-y-1.5 overflow-y-auto">
              {roundMatches.map((match) => (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => {
                    setMatchId(match.id);
                    setConfirm(null);
                  }}
                  className={`press t-body flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left ${
                    matchId === match.id
                      ? "border-foreground/25 bg-secondary text-foreground"
                      : "border-border bg-secondary/30 text-foreground/85"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{match.label}</span>
                    {(match.side_a || match.side_b) && (
                      <span className="t-micro block truncate">
                        {match.side_a ?? "TBD"} vs {match.side_b ?? "TBD"}
                      </span>
                    )}
                  </span>
                  <span className="t-micro text-muted-foreground">
                    {match.result === "pending"
                      ? `${match.points} pt`
                      : (RESULT_LABEL[match.result] ?? match.result)}
                  </span>
                </button>
              ))}
            </div>
            {selectedMatch && (
              <div className="space-y-2">
                {roundScore && selectedRound && (
                  <p className="t-micro">
                    {selectedRound.day_label}: {roundScore.strongMental} – {roundScore.grassRoots}{" "}
                    of {selectedRound.points}
                  </p>
                )}
                <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2.5">
                  <p className="t-micro">Pairing</p>
                  <p className="t-body mt-1 text-foreground">
                    {selectedMatch.side_a ?? "TBD"} vs {selectedMatch.side_b ?? "TBD"}
                  </p>
                  <MatchPairingEditor
                    match={selectedMatch}
                    teams={teams}
                    players={players}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {RESULTS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      disabled={saving}
                      onClick={() => setConfirm(r.value)}
                      className={`press t-body min-h-14 rounded-xl border px-2 py-4 font-medium disabled:opacity-50 ${
                        confirm === r.value
                          ? "border-foreground/35 bg-secondary text-foreground"
                          : "border-border text-foreground/85"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                {confirm && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveResult(confirm)}
                    className="press btn-primary t-body min-h-14 w-full"
                  >
                    {saving
                      ? "Saving…"
                      : `Confirm ${selectedMatch.label} — ${RESULT_LABEL[confirm]}`}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="no-scrollbar max-h-40 space-y-1.5 overflow-y-auto">
              {sideBets.map((bet) => (
                <button
                  key={bet.id}
                  type="button"
                  onClick={() => {
                    setBetId(bet.id);
                    const existing = bet.player_name ?? "";
                    setPlayer(existing);
                    setOtherPlayer(existing ? !isRosterName(existing) : false);
                    setDistance(bet.distance ?? "");
                  }}
                  className={`press t-body flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left ${
                    betId === bet.id
                      ? "border-foreground/25 bg-secondary text-foreground"
                      : "border-border bg-secondary/30 text-foreground/85"
                  }`}
                >
                  <span>{bet.label}</span>
                  <span className="t-micro text-copper">
                    {contestHoleLabel(bet.hole)} · {formatPayout(bet.amount)}
                  </span>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {otherPlayer || players.length === 0 ? (
                <input
                  value={player}
                  onChange={(e) => setPlayer(e.target.value)}
                  placeholder="Player name"
                  className="control t-body w-full"
                />
              ) : (
                <select
                  value={isRosterName(player) ? player : ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "__other__") {
                      setOtherPlayer(true);
                      setPlayer("");
                    } else {
                      setPlayer(value);
                    }
                  }}
                  className="control t-body w-full"
                >
                  <option value="">Pick player</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                  <option value="__other__">Other…</option>
                </select>
              )}
              {otherPlayer && players.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setOtherPlayer(false);
                    setPlayer("");
                  }}
                  className="t-micro text-left text-muted-foreground"
                >
                  ← Back to roster
                </button>
              )}
              <input
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="Winning distance (optional)"
                className="control t-body w-full"
              />
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveBet()}
              className="press btn-primary t-body w-full"
            >
              Log claim
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
