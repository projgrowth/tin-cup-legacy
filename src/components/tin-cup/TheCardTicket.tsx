import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { AvatarPair } from "@/components/tin-cup/Avatar";
import type { useMatchSocial } from "@/hooks/useMatchSocial";
import type { Match } from "@/hooks/useTournament";
import { maskGuestProfanity } from "@/lib/locker-copy";
import { type MatchPredictionChoice } from "@/lib/social-platform";
import {
  CARD_NOTE_MAX,
  faceoffCrowd,
  pairingFirstNames,
  pendingMatchIds,
  pickOnMarket,
  predictionMomentKey,
  rideCountLine,
  type CardMarket,
} from "@/lib/the-card";
import { LOCKER_REACTIONS, type ReactionKind } from "@/lib/weekend-story";

export type CardFace = { name: string; teamSlug?: string | null; src?: string | null };
export type CardRoast = { userId: string; name: string; note: string; matchIds?: string[] };

export function TheCardTicket({
  market,
  matches,
  userId,
  claimed,
  social,
  peopleA = [],
  peopleB = [],
  roasts = [],
  yours = false,
  signedIn = false,
  reactionCounts = {},
  onReact,
}: {
  market: CardMarket;
  matches: Match[];
  userId?: string;
  claimed?: boolean;
  social: ReturnType<typeof useMatchSocial>;
  peopleA?: CardFace[];
  peopleB?: CardFace[];
  roasts?: CardRoast[];
  yours?: boolean;
  signedIn?: boolean;
  reactionCounts?: Record<string, number>;
  onReact?: (momentKey: string, kind: ReactionKind) => void;
}) {
  const mine = pickOnMarket(social.predictions, userId, market.matchIds);
  const openIds = pendingMatchIds(market, matches);
  const locked = market.locked || (market.matchIds.length > 0 && openIds.length === 0);
  const canPick = Boolean(userId && claimed && !yours && !locked && openIds.length > 0);
  const [line, setLine] = useState(mine?.note ?? "");
  const [composing, setComposing] = useState(false);
  const [moreTalk, setMoreTalk] = useState(false);
  const crowd = faceoffCrowd(social.predictions, market.matchIds);
  const busy = social.predict.isPending || social.clear.isPending;
  const labelA = pairingFirstNames(market.sideA);
  const labelB = pairingFirstNames(market.sideB);
  const ranked = [...roasts].sort(
    (a, b) => (reactionCounts[b.userId] ?? 0) - (reactionCounts[a.userId] ?? 0),
  );
  const visible = moreTalk ? ranked : ranked.slice(0, 1);
  const hidden = Math.max(0, ranked.length - visible.length);
  const rideA = rideCountLine(crowd.sideA, labelA);
  const rideB = rideCountLine(crowd.sideB, labelB);

  function pick(choice: MatchPredictionChoice) {
    if (!canPick) return;
    if (mine?.choice === choice) {
      social.clear.mutate(
        { matchIds: openIds },
        { onError: (error) => toast.error(error.message) },
      );
      setComposing(false);
      return;
    }
    social.predict.mutate(
      { matchIds: openIds, choice, note: composing ? line : undefined },
      { onError: (error) => toast.error(error.message) },
    );
  }

  function saveLine() {
    if (!canPick) return;
    const choice = mine?.choice;
    if (!choice) {
      toast.error("Pick a side first");
      return;
    }
    social.predict.mutate(
      { matchIds: openIds.length ? openIds : market.matchIds, choice, note: line },
      {
        onSuccess: () => {
          setComposing(false);
          toast.success("Posted");
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  if (yours) {
    return (
      <article className="border-l-2 border-hunter px-4 py-3">
        <Link
          to="/scout"
          search={{ course: "south", card: true }}
          className="press block"
          aria-label="Open Friday book"
        >
          <p className="t-micro text-hunter">You</p>
          <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <AvatarPair people={peopleA} size="sm" />
              <span className="t-body min-w-0 font-semibold leading-snug text-foreground">
                {labelA}
              </span>
            </span>
            <p className="t-micro text-muted-foreground">vs</p>
            <span className="flex min-w-0 items-center justify-end gap-2">
              <span className="t-body min-w-0 text-right font-semibold leading-snug text-foreground">
                {labelB}
              </span>
              <AvatarPair people={peopleB} size="sm" />
            </span>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="px-4 py-2.5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1">
        <SideRow
          people={peopleA}
          label={labelA}
          align="start"
          selected={mine?.choice === "side-a"}
          disabled={!canPick || busy}
          onClick={() => pick("side-a")}
        />
        <p className="t-micro self-center px-1 text-muted-foreground">vs</p>
        <SideRow
          people={peopleB}
          label={labelB}
          align="end"
          selected={mine?.choice === "side-b"}
          disabled={!canPick || busy}
          onClick={() => pick("side-b")}
        />
      </div>
      {rideA || rideB ? (
        <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-1">
          <p className="t-micro">{rideA}</p>
          <span />
          <p className="t-micro text-right">{rideB}</p>
        </div>
      ) : null}
      {visible.map((roast) => {
        const key = predictionMomentKey(roast.matchIds ?? market.matchIds, roast.userId);
        const note = maskGuestProfanity(roast.note, signedIn);
        return (
          <div key={roast.userId} className="mt-1.5">
            <p className="t-micro italic text-foreground/80">
              “{note}”<span className="not-italic text-muted-foreground"> · {roast.name}</span>
            </p>
            {onReact ? (
              <div className="mt-0.5 flex gap-1">
                {LOCKER_REACTIONS.map((reaction) => (
                  <button
                    key={reaction.kind}
                    type="button"
                    aria-label={reaction.label}
                    onClick={() => onReact(key, reaction.kind)}
                    className="press t-micro min-h-9 px-1.5"
                  >
                    {reaction.glyph}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setMoreTalk(true)}
          className="press t-micro mt-1 min-h-11"
        >
          more talk
        </button>
      ) : null}
      {canPick ? (
        composing || mine?.note ? (
          <div className="mt-2 flex gap-2">
            <label className="sr-only" htmlFor={`card-line-${market.id}`}>
              Add a line
            </label>
            <input
              id={`card-line-${market.id}`}
              value={line}
              autoFocus={composing && !mine?.note}
              maxLength={CARD_NOTE_MAX}
              placeholder="Add a line"
              onChange={(event) => {
                setLine(event.target.value);
                setComposing(true);
              }}
              className="control min-h-10 flex-1 text-sm"
            />
            <button
              type="button"
              onClick={saveLine}
              disabled={busy || !line.trim()}
              className="press btn-quiet min-h-10 px-3 text-sm font-semibold"
            >
              Post
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="press t-micro mt-1.5 min-h-11 text-muted-foreground"
          >
            Add a line
          </button>
        )
      ) : null}
    </article>
  );
}

function SideRow({
  people,
  label,
  align,
  selected,
  disabled,
  onClick,
}: {
  people: CardFace[];
  label: string;
  align: "start" | "end";
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      aria-label={selected ? `Undo ${label}` : `Ride with ${label}`}
      onClick={onClick}
      className={`flex min-h-12 min-w-0 w-full items-center gap-2 rounded-xl px-1 py-1.5 transition-colors duration-150 disabled:opacity-100 ${
        align === "end" ? "flex-row-reverse text-right" : "text-left"
      } ${disabled ? "cursor-default" : "press"} ${
        selected ? "bg-hunter/10 ring-1 ring-hunter/30" : ""
      }`}
    >
      <AvatarPair people={people} size="sm" />
      <span className="t-body min-w-0 flex-1 font-semibold leading-snug break-words text-foreground">
        {label}
      </span>
    </button>
  );
}
