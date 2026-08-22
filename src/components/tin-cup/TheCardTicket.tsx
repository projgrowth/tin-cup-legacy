import { useState } from "react";
import { toast } from "sonner";

import type { useMatchSocial } from "@/hooks/useMatchSocial";
import type { Match } from "@/hooks/useTournament";
import { predictionTotals, type MatchPredictionChoice } from "@/lib/social-platform";
import {
  CARD_NOTE_MAX,
  pairingFirstNames,
  pendingMatchIds,
  pickOnMarket,
  type CardMarket,
} from "@/lib/the-card";

export function TheCardTicket({
  market,
  matches,
  userId,
  claimed,
  social,
  compact = false,
}: {
  market: CardMarket;
  matches: Match[];
  userId?: string;
  claimed?: boolean;
  social: ReturnType<typeof useMatchSocial>;
  compact?: boolean;
}) {
  const mine = pickOnMarket(social.predictions, userId, market.matchIds);
  const openIds = pendingMatchIds(market, matches);
  const locked = market.locked || (market.matchIds.length > 0 && openIds.length === 0);
  const canTake = Boolean(userId && claimed && !locked && openIds.length > 0);
  const [line, setLine] = useState(mine?.note ?? "");
  const [composing, setComposing] = useState(false);
  const totals = predictionTotals(social.predictions, market.matchIds[0] ?? "");
  const showTotals = Boolean(mine || locked);

  function take(choice: MatchPredictionChoice) {
    if (!canTake) return;
    social.predict.mutate(
      { matchIds: openIds, choice, note: composing ? line : undefined },
      {
        onSuccess: () => {
          if (!mine) setComposing(true);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function saveLine() {
    if (!mine || !canTake) return;
    social.predict.mutate(
      { matchIds: openIds.length ? openIds : market.matchIds, choice: mine.choice, note: line },
      {
        onSuccess: () => {
          setComposing(false);
          toast.success("Line’s on the card");
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  const labelA = pairingFirstNames(market.sideA);
  const labelB = pairingFirstNames(market.sideB);

  if (compact) {
    return (
      <div className="mt-2">
        <div className="flex gap-1.5">
          <TakeChip
            label="Take"
            ariaLabel={`Take ${labelA}`}
            selected={mine?.choice === "side-a"}
            tone="hunter"
            disabled={!canTake || social.predict.isPending}
            onClick={() => take("side-a")}
          />
          <TakeChip
            label="Half"
            ariaLabel={`Half ${labelA} vs ${labelB}`}
            selected={mine?.choice === "halved"}
            disabled={!canTake || social.predict.isPending}
            onClick={() => take("halved")}
          />
          <TakeChip
            label="Take"
            ariaLabel={`Take ${labelB}`}
            selected={mine?.choice === "side-b"}
            tone="stone"
            disabled={!canTake || social.predict.isPending}
            onClick={() => take("side-b")}
          />
        </div>
        {mine?.note ? <p className="t-micro mt-1.5 italic text-foreground/80">“{mine.note}”</p> : null}
      </div>
    );
  }

  return (
    <article className="px-4 py-3">
      <p className="t-micro text-muted-foreground">Match {market.index}</p>
      <div className="mt-2 space-y-1.5">
        <SideTake
          label={labelA}
          tone="hunter"
          selected={mine?.choice === "side-a"}
          disabled={!canTake || social.predict.isPending}
          count={showTotals ? totals.sideA : null}
          onClick={() => take("side-a")}
        />
        <SideTake
          label={labelB}
          tone="stone"
          selected={mine?.choice === "side-b"}
          disabled={!canTake || social.predict.isPending}
          count={showTotals ? totals.sideB : null}
          onClick={() => take("side-b")}
        />
      </div>
      <button
        type="button"
        disabled={!canTake || social.predict.isPending}
        aria-pressed={mine?.choice === "halved"}
        onClick={() => take("halved")}
        className={`press t-micro mx-auto mt-2 flex min-h-11 items-center justify-center px-3 ${
          mine?.choice === "halved" ? "font-semibold text-foreground" : "text-muted-foreground"
        }`}
      >
        Half{showTotals ? ` · ${totals.halved}` : ""}
      </button>
      {canTake && mine && (composing || !mine.note) ? (
        <div className="mt-2 flex gap-2">
          <label className="sr-only" htmlFor={`card-line-${market.id}`}>
            Add a line
          </label>
          <input
            id={`card-line-${market.id}`}
            value={line}
            maxLength={CARD_NOTE_MAX}
            placeholder="Add a line…"
            onChange={(event) => {
              setLine(event.target.value);
              setComposing(true);
            }}
            className="control min-h-11 flex-1 text-sm"
          />
          <button
            type="button"
            onClick={saveLine}
            disabled={social.predict.isPending}
            className="press btn-quiet min-h-11 px-3 text-sm font-semibold"
          >
            Post
          </button>
        </div>
      ) : mine?.note ? (
        <p className="t-micro mt-2 italic text-foreground/80">“{mine.note}”</p>
      ) : null}
      {locked ? (
        <p className="t-micro mt-2 text-muted-foreground">Locked when captains post the result.</p>
      ) : market.matchIds.length === 0 ? (
        <p className="t-micro mt-2 text-muted-foreground">On the board when captains confirm the group.</p>
      ) : null}
    </article>
  );
}

function SideTake({
  label,
  tone,
  selected,
  disabled,
  count,
  onClick,
}: {
  label: string;
  tone: "hunter" | "stone";
  selected: boolean;
  disabled: boolean;
  count: number | null;
  onClick: () => void;
}) {
  const color = tone === "hunter" ? "text-hunter" : "text-stone";
  const on =
    tone === "hunter"
      ? "border-hunter/45 bg-hunter/10 text-hunter"
      : "border-stone/45 bg-stone/15 text-stone";
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={`press flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3 text-left text-sm font-semibold ${
        selected ? on : "border-border bg-background text-foreground"
      }`}
    >
      <span className={selected ? undefined : color}>
        {label}
      </span>
      <span className="t-micro shrink-0">
        {selected ? "Taken" : "Take"}
        {count != null ? ` · ${count}` : ""}
      </span>
    </button>
  );
}

function TakeChip({
  label,
  ariaLabel,
  selected,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  ariaLabel: string;
  selected: boolean;
  tone?: "hunter" | "stone";
  disabled: boolean;
  onClick: () => void;
}) {
  const on =
    tone === "stone"
      ? "border-stone/45 bg-stone/15 text-stone"
      : "border-hunter/45 bg-hunter/10 text-hunter";
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={selected}
      onClick={onClick}
      className={`press min-h-11 flex-1 rounded-xl border px-2 text-xs font-semibold ${
        selected ? on : "border-border text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}
