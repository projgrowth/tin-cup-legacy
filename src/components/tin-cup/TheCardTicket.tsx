import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Avatar, AvatarPair } from "@/components/tin-cup/Avatar";
import type { useMatchSocial } from "@/hooks/useMatchSocial";
import type { Match } from "@/hooks/useTournament";
import { type MatchPredictionChoice } from "@/lib/social-platform";
import {
  CARD_NOTE_MAX,
  faceoffCrowd,
  pairingFirstNames,
  pendingMatchIds,
  pickOnMarket,
  type CardMarket,
} from "@/lib/the-card";

export type CardFace = { name: string; teamSlug?: string | null; src?: string | null };
export type CardRoast = { userId: string; name: string; note: string };

export function TheCardTicket({
  market,
  matches,
  userId,
  claimed,
  social,
  peopleA = [],
  peopleB = [],
  crowdA = [],
  crowdB = [],
  roasts = [],
  yours = false,
}: {
  market: CardMarket;
  matches: Match[];
  userId?: string;
  claimed?: boolean;
  social: ReturnType<typeof useMatchSocial>;
  peopleA?: CardFace[];
  peopleB?: CardFace[];
  crowdA?: CardFace[];
  crowdB?: CardFace[];
  roasts?: CardRoast[];
  yours?: boolean;
}) {
  const mine = pickOnMarket(social.predictions, userId, market.matchIds);
  const openIds = pendingMatchIds(market, matches);
  const locked = market.locked || (market.matchIds.length > 0 && openIds.length === 0);
  const canPick = Boolean(userId && claimed && !yours && !locked && openIds.length > 0);
  const [line, setLine] = useState(mine?.note ?? "");
  const [composing, setComposing] = useState(false);
  const crowd = faceoffCrowd(social.predictions, market.matchIds);
  const busy = social.predict.isPending || social.clear.isPending;
  const labelA = pairingFirstNames(market.sideA);
  const labelB = pairingFirstNames(market.sideB);
  const claimToRide = !yours && !locked && (!userId || !claimed);
  const otherRoasts = roasts.filter((roast) => roast.userId !== userId).slice(0, 2);

  function pick(choice: MatchPredictionChoice) {
    if (!canPick) return;
    if (mine?.choice === choice) {
      social.clear.mutate({ matchIds: openIds }, { onError: (error) => toast.error(error.message) });
      setComposing(false);
      return;
    }
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
    if (!mine || !canPick) return;
    social.predict.mutate(
      { matchIds: openIds.length ? openIds : market.matchIds, choice: mine.choice, note: line },
      {
        onSuccess: () => {
          setComposing(false);
          toast.success("Line’s up");
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <article className={`px-3 py-3 ${yours ? "bg-hunter/5" : ""}`}>
      {yours || locked ? (
        <p className="t-micro mb-1.5 text-muted-foreground">
          {yours ? <span className="text-hunter">You</span> : null}
          {yours && locked ? " · " : null}
          {locked ? "Locked" : null}
        </p>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1">
        <SideRow
          people={peopleA}
          label={labelA}
          tone="hunter"
          selected={mine?.choice === "side-a"}
          crowd={crowd.sideA}
          riders={crowdA}
          disabled={!canPick || busy}
          to={claimToRide ? "/profile" : undefined}
          onClick={() => pick("side-a")}
        />
        <p className="t-micro self-center px-0.5 text-muted-foreground">vs</p>
        <SideRow
          people={peopleB}
          label={labelB}
          tone="stone"
          selected={mine?.choice === "side-b"}
          crowd={crowd.sideB}
          riders={crowdB}
          disabled={!canPick || busy}
          to={claimToRide ? "/profile" : undefined}
          onClick={() => pick("side-b")}
        />
      </div>
      {otherRoasts.map((roast) => (
        <p key={roast.userId} className="t-micro mt-1.5 italic text-foreground/80">
          “{roast.note}”
          <span className="not-italic text-muted-foreground"> · {roast.name}</span>
        </p>
      ))}
      {yours ? (
        <p className="t-micro mt-1.5 text-hunter">You're in it.</p>
      ) : canPick && mine && (composing || !mine.note) ? (
        <div className="mt-2 flex gap-2">
          <label className="sr-only" htmlFor={`card-line-${market.id}`}>
            Talk your shit
          </label>
          <input
            id={`card-line-${market.id}`}
            value={line}
            maxLength={CARD_NOTE_MAX}
            placeholder="Talk your shit…"
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
        <p className="t-micro mt-2 italic text-foreground/80">“{mine.note}”</p>
      ) : null}
    </article>
  );
}

function SideRow({
  people,
  label,
  tone,
  selected,
  crowd,
  riders,
  disabled,
  to,
  onClick,
}: {
  people: CardFace[];
  label: string;
  tone: "hunter" | "stone";
  selected: boolean;
  crowd: number;
  riders: CardFace[];
  disabled: boolean;
  to?: string;
  onClick: () => void;
}) {
  const color = tone === "hunter" ? "text-hunter" : "text-stone";
  const fill =
    tone === "hunter"
      ? "bg-hunter/10 ring-1 ring-hunter/30"
      : "bg-stone/15 ring-1 ring-stone/30";
  const className = `flex min-h-16 min-w-0 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center transition-colors duration-150 disabled:opacity-100 ${
    disabled && !to ? "cursor-default" : "press"
  } ${selected ? fill : ""}`;
  const inner = (
    <>
      <AvatarPair people={people} size="sm" />
      <span className={`t-body max-w-full font-semibold leading-snug break-words ${color}`}>{label}</span>
      {riders.length > 0 ? (
        <span className="inline-flex items-center justify-center gap-0.5">
          {riders.slice(0, 2).map((rider, index) => (
            <Avatar
              key={`${rider.name}-${index}`}
              name={rider.name}
              teamSlug={rider.teamSlug}
              src={rider.src}
              size="sm"
            />
          ))}
          {crowd > 2 ? (
            <span className="t-micro pl-0.5 tabular-nums text-muted-foreground">+{crowd - 2}</span>
          ) : null}
        </span>
      ) : crowd > 0 ? (
        <span className="t-micro tabular-nums text-muted-foreground">{crowd}</span>
      ) : null}
    </>
  );
  if (to) {
    return (
      <Link to={to} aria-label={`Ride with ${label}`} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      aria-label={selected ? `Undo ${label}` : `Ride with ${label}`}
      onClick={onClick}
      className={className}
    >
      {inner}
    </button>
  );
}
