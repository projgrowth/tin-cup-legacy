import { useState } from "react";
import { toast } from "sonner";

import { AvatarPair } from "@/components/tin-cup/Avatar";
import type { useMatchSocial } from "@/hooks/useMatchSocial";
import type { Match } from "@/hooks/useTournament";
import { type MatchPredictionChoice } from "@/lib/social-platform";
import {
  CARD_NOTE_MAX,
  pairingFirstNames,
  pendingMatchIds,
  pickOnMarket,
  type CardMarket,
} from "@/lib/the-card";

export type CardFace = { name: string; teamSlug?: string | null; src?: string | null };

export function TheCardTicket({
  market,
  matches,
  userId,
  claimed,
  social,
  peopleA = [],
  peopleB = [],
  variant = "slip",
}: {
  market: CardMarket;
  matches: Match[];
  userId?: string;
  claimed?: boolean;
  social: ReturnType<typeof useMatchSocial>;
  peopleA?: CardFace[];
  peopleB?: CardFace[];
  variant?: "slip" | "controls";
}) {
  const mine = pickOnMarket(social.predictions, userId, market.matchIds);
  const openIds = pendingMatchIds(market, matches);
  const locked = market.locked || (market.matchIds.length > 0 && openIds.length === 0);
  const canTake = Boolean(userId && claimed && !locked && openIds.length > 0);
  const [line, setLine] = useState(mine?.note ?? "");
  const [composing, setComposing] = useState(false);

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
  const busy = social.predict.isPending;

  if (variant === "controls") {
    return (
      <div className="mt-1.5">
        <div className="flex gap-1.5">
          <TakeChip
            label="Take"
            ariaLabel={`Take ${labelA}`}
            selected={mine?.choice === "side-a"}
            tone="hunter"
            disabled={!canTake || busy}
            onClick={() => take("side-a")}
          />
          <TakeChip
            label="Half"
            ariaLabel={`Half ${labelA} vs ${labelB}`}
            selected={mine?.choice === "halved"}
            disabled={!canTake || busy}
            onClick={() => take("halved")}
          />
          <TakeChip
            label="Take"
            ariaLabel={`Take ${labelB}`}
            selected={mine?.choice === "side-b"}
            tone="stone"
            disabled={!canTake || busy}
            onClick={() => take("side-b")}
          />
        </div>
        {mine?.note ? <p className="t-micro mt-1.5 italic text-foreground/80">“{mine.note}”</p> : null}
      </div>
    );
  }

  return (
    <article className="flex gap-3 px-4 py-2.5">
      <span className="t-micro w-4 shrink-0 pt-3 tabular-nums text-muted-foreground">
        {market.index}
      </span>
      <div className="min-w-0 flex-1">
        <SideRow
          people={peopleA}
          label={labelA}
          tone="hunter"
          selected={mine?.choice === "side-a"}
          disabled={!canTake || busy}
          onClick={() => take("side-a")}
        />
        <SideRow
          people={peopleB}
          label={labelB}
          tone="stone"
          selected={mine?.choice === "side-b"}
          disabled={!canTake || busy}
          onClick={() => take("side-b")}
        />
        <button
          type="button"
          disabled={!canTake || busy}
          aria-pressed={mine?.choice === "halved"}
          aria-label={`Half ${labelA} vs ${labelB}`}
          onClick={() => take("halved")}
          className={`press t-micro mt-0.5 flex min-h-9 w-full items-center justify-end px-0.5 ${
            mine?.choice === "halved" ? "font-semibold text-foreground" : "text-muted-foreground"
          }`}
        >
          {mine?.choice === "halved" ? "Halved" : "Half"}
        </button>
        {canTake && mine && (composing || !mine.note) ? (
          <div className="mt-1.5 flex gap-2">
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
              className="control min-h-10 flex-1 text-sm"
            />
            <button
              type="button"
              onClick={saveLine}
              disabled={busy}
              className="press btn-quiet min-h-10 px-3 text-sm font-semibold"
            >
              Post
            </button>
          </div>
        ) : mine?.note ? (
          <p className="t-micro mt-1 italic text-foreground/80">“{mine.note}”</p>
        ) : null}
      </div>
    </article>
  );
}

function SideRow({
  people,
  label,
  tone,
  selected,
  disabled,
  onClick,
}: {
  people: CardFace[];
  label: string;
  tone: "hunter" | "stone";
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const color = tone === "hunter" ? "text-hunter" : "text-stone";
  const chipOn =
    tone === "hunter"
      ? "border-hunter/40 bg-hunter/10 text-hunter"
      : "border-stone/40 bg-stone/15 text-stone";
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`Take ${label}`}
      onClick={onClick}
      className="press flex min-h-11 w-full items-center gap-2 rounded-lg text-left"
    >
      <AvatarPair people={people} size="sm" />
      <span className={`t-body min-w-0 flex-1 truncate font-semibold ${color}`}>{label}</span>
      <span
        className={`t-micro shrink-0 rounded-full border px-2.5 py-1 font-semibold ${
          selected ? chipOn : "border-border text-muted-foreground"
        }`}
      >
        {selected ? "Yours" : "Take"}
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
      ? "border-stone/40 bg-stone/15 text-stone"
      : "bg-hunter/10 text-hunter border-hunter/40";
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={selected}
      onClick={onClick}
      className={`press min-h-10 flex-1 rounded-full border px-2 text-xs font-semibold ${
        selected ? on : "border-border text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}
