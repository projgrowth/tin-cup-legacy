import { Check, Flag } from "lucide-react";
import { toast } from "sonner";

import { TheCardTicket } from "@/components/tin-cup/TheCardTicket";
import type { Match, Player } from "@/hooks/useTournament";
import type { useMatchSocial } from "@/hooks/useMatchSocial";
import {
  confirmationStatus,
  playerParticipates,
  predictionLocked,
} from "@/lib/social-platform";
import { peopleForMarket, type CardMarket } from "@/lib/the-card";

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
  const locked = predictionLocked(match);
  const participant = Boolean(player && playerParticipates(match, player));
  const myConfirmation = social.confirmations.find(
    (row) => row.matchId === match.id && row.playerId === player?.id,
  );
  const review = confirmationStatus(match, social.confirmations);
  const market: CardMarket = {
    id: match.id,
    matchIds: [match.id],
    roundLabel: "",
    index: match.sort_order,
    sideA: match.side_a ?? "TBD",
    sideB: match.side_b ?? "TBD",
    locked,
  };

  if (!social.predictionsEnabled && !social.confirmationsEnabled) return null;
  return (
    <div className="space-y-3">
      {social.predictionsEnabled && (
        <TheCardTicket
          market={market}
          matches={[match]}
          userId={userId}
          claimed={Boolean(player)}
          social={social}
          peopleA={peopleForMarket(market).peopleA}
          peopleB={peopleForMarket(market).peopleB}
          variant="controls"
        />
      )}

      {social.confirmationsEnabled && locked && (
        <div className="rounded-xl border border-border/70 bg-black/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="t-micro text-foreground/75">Player confirmation</p>
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
