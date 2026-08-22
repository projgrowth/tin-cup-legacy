import { Check, Flag, Sparkles } from "lucide-react";
import { toast } from "sonner";

import type { Match, Player } from "@/hooks/useTournament";
import type { useMatchSocial } from "@/hooks/useMatchSocial";
import {
  confirmationStatus,
  playerParticipates,
  predictionLocked,
  predictionTotals,
  type MatchPredictionChoice,
} from "@/lib/social-platform";

const choices: Array<{ value: MatchPredictionChoice; label: string }> = [
  { value: "side-a", label: "Side A" },
  { value: "halved", label: "Halved" },
  { value: "side-b", label: "Side B" },
];

export function MatchSocialActions({
  match,
  userId,
  player,
  social,
}: {
  match: Match;
  userId?: string;
  player?: Player | null;
  social: ReturnType<typeof useMatchSocial>;
}) {
  const mine = social.predictions.find(
    (prediction) => prediction.matchId === match.id && prediction.userId === userId,
  );
  const totals = predictionTotals(social.predictions, match.id);
  const locked = predictionLocked(match);
  const participant = Boolean(player && playerParticipates(match, player));
  const myConfirmation = social.confirmations.find(
    (row) => row.matchId === match.id && row.playerId === player?.id,
  );
  const review = confirmationStatus(match, social.confirmations);
  const showTotals = Boolean(mine || locked);

  if (!social.predictionsEnabled && !social.confirmationsEnabled) return null;
  return (
    <div className="space-y-3">
      {social.predictionsEnabled && (
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="t-eyebrow flex items-center gap-1.5 text-foreground/75">
              <Sparkles className="size-3.5 text-gold-light" /> Who wins?
            </p>
            <span className="t-micro">Social · no Cup points</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {choices.map((choice) => {
              const count =
                choice.value === "side-a"
                  ? totals.sideA
                  : choice.value === "side-b"
                    ? totals.sideB
                    : totals.halved;
              const selected = mine?.choice === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  disabled={!userId || !player || locked || social.predict.isPending}
                  aria-pressed={selected}
                  onClick={() =>
                    social.predict.mutate(
                      { matchId: match.id, choice: choice.value },
                      { onError: (error) => toast.error(error.message) },
                    )
                  }
                  className={`press min-h-11 rounded-xl border px-2 text-xs font-semibold ${
                    selected
                      ? "border-gold/45 bg-gold/15 text-gold-light"
                      : "border-border bg-black/10 text-muted-foreground"
                  }`}
                >
                  {choice.label}
                  {showTotals && <span className="ml-1 opacity-70">{count}</span>}
                </button>
              );
            })}
          </div>
          {!userId || !player ? (
            <p className="t-micro mt-1.5">Claim your player to make a prediction.</p>
          ) : locked ? (
            <p className="t-micro mt-1.5">Voting closed when the official result posted.</p>
          ) : null}
        </div>
      )}

      {social.confirmationsEnabled && locked && (
        <div className="rounded-xl border border-border/70 bg-black/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="t-eyebrow text-foreground/75">Player confirmation</p>
            <span
              className={`t-micro ${review === "under-review" ? "text-copper" : "text-muted-foreground"}`}
            >
              {review === "under-review"
                ? "Under review"
                : review === "confirmed"
                  ? "Confirmed"
                  : "Awaiting confirmation"}
            </span>
          </div>
          {participant ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={myConfirmation?.state === "confirmed"}
                disabled={social.confirm.isPending}
                onClick={() =>
                  social.confirm.mutate(
                    { matchId: match.id, state: "confirmed" },
                    { onError: (error) => toast.error(error.message) },
                  )
                }
                className={`press min-h-11 rounded-xl border text-sm font-semibold ${
                  myConfirmation?.state === "confirmed"
                    ? "border-[var(--status-live)]/45 bg-[var(--status-live)]/10 text-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                <Check className="mr-1 inline size-4" /> Confirmed
              </button>
              <button
                type="button"
                aria-pressed={myConfirmation?.state === "needs-review"}
                disabled={social.confirm.isPending}
                onClick={() =>
                  social.confirm.mutate(
                    { matchId: match.id, state: "needs-review" },
                    { onError: (error) => toast.error(error.message) },
                  )
                }
                className={`press min-h-11 rounded-xl border text-sm font-semibold ${
                  myConfirmation?.state === "needs-review"
                    ? "border-copper/50 bg-copper/12 text-copper"
                    : "border-border text-muted-foreground"
                }`}
              >
                <Flag className="mr-1 inline size-4" /> Needs review
              </button>
            </div>
          ) : (
            <p className="t-micro mt-1.5">Only players in this match can confirm its result.</p>
          )}
        </div>
      )}
    </div>
  );
}
