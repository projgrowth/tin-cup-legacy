import { useState } from "react";
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
    <article className={`px-4 py-3 ${yours ? "bg-hunter/5" : ""}`}>
      <p className="t-micro text-muted-foreground">
        Faceoff {market.index}
        {yours ? <span className="text-hunter"> · You</span> : null}
        {locked ? " · Locked" : null}
      </p>
      <div className="mt-1.5">
        <SideRow
          people={peopleA}
          label={labelA}
          tone="hunter"
          selected={mine?.choice === "side-a"}
          crowd={crowd.sideA}
          riders={crowdA}
          disabled={!canPick || busy}
          onClick={() => pick("side-a")}
        />
        <p className="t-micro py-0.5 text-center text-muted-foreground">vs</p>
        <SideRow
          people={peopleB}
          label={labelB}
          tone="stone"
          selected={mine?.choice === "side-b"}
          crowd={crowd.sideB}
          riders={crowdB}
          disabled={!canPick || busy}
          onClick={() => pick("side-b")}
        />
      </div>
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
      ) : canPick ? (
        <p className="t-micro mt-1.5 text-muted-foreground">Tap a side. Tap again to undo.</p>
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
  onClick,
}: {
  people: CardFace[];
  label: string;
  tone: "hunter" | "stone";
  selected: boolean;
  crowd: number;
  riders: CardFace[];
  disabled: boolean;
  onClick: () => void;
}) {
  const color = tone === "hunter" ? "text-hunter" : "text-stone";
  const fill =
    tone === "hunter"
      ? "bg-hunter/10 ring-1 ring-hunter/30"
      : "bg-stone/15 ring-1 ring-stone/30";
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      aria-label={selected ? `Undo ${label}` : `Ride with ${label}`}
      onClick={onClick}
      className={`flex min-h-12 w-full items-center gap-2 rounded-xl px-2 text-left transition-colors duration-150 disabled:opacity-100 ${
        disabled ? "cursor-default" : "press"
      } ${selected ? fill : ""}`}
    >
      <AvatarPair people={people} size="sm" />
      <span className={`t-body min-w-0 flex-1 truncate font-semibold ${color}`}>{label}</span>
      {riders.length > 0 ? (
        <span className="inline-flex shrink-0 items-center gap-0.5">
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
    </button>
  );
}
