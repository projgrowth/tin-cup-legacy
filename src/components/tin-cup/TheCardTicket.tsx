import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Avatar, AvatarPair } from "@/components/tin-cup/Avatar";
import type { useMatchSocial } from "@/hooks/useMatchSocial";
import type { Match } from "@/hooks/useTournament";
import { claimedPlayerIdFor } from "@/lib/profile-identity";
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

const TICKET_GRID =
  "grid w-full grid-cols-[4.75rem_minmax(0,1fr)_2rem_4.75rem_minmax(0,1fr)] items-center gap-x-2";

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
  const isClaimed = Boolean(claimed || claimedPlayerIdFor(userId));
  const canPick = Boolean(userId && isClaimed && !yours && !locked && openIds.length > 0);
  const [line, setLine] = useState(mine?.note ?? "");
  const [composing, setComposing] = useState(false);
  const crowd = faceoffCrowd(social.predictions, market.matchIds);
  const busy = social.predict.isPending || social.clear.isPending;
  const labelA = pairingFirstNames(market.sideA);
  const labelB = pairingFirstNames(market.sideB);
  const claimToRide = !yours && !locked && (!userId || !isClaimed);
  const roastLine = mine?.note?.trim()
    ? { note: mine.note.trim(), name: null as string | null }
    : (() => {
        const other = roasts.find((roast) => roast.userId !== userId);
        return other ? { note: other.note, name: other.name } : null;
      })();

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

  if (yours) {
    return (
      <article>
        <Link
          to="/scout"
          search={{ course: "south", card: true }}
          className="press block px-3 py-2"
          aria-label="Open Friday book"
        >
          <p className="t-micro text-hunter">Yours · already set</p>
          <div className={`${TICKET_GRID} mt-1.5`}>
            <span className="flex justify-center">
              <AvatarPair people={peopleA} size="sm" />
            </span>
            <p className="t-body min-w-0 font-semibold leading-snug text-hunter">{labelA}</p>
            <p className="t-micro text-center text-muted-foreground">vs</p>
            <span className="flex justify-center">
              <AvatarPair people={peopleB} size="sm" />
            </span>
            <p className="t-body min-w-0 font-semibold leading-snug text-stone">{labelB}</p>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="px-3 py-2">
      <div className={TICKET_GRID}>
        <SidePick
          people={peopleA}
          label={labelA}
          tone="hunter"
          selected={mine?.choice === "side-a"}
          disabled={!canPick || busy}
          to={claimToRide ? "/profile" : undefined}
          onClick={() => pick("side-a")}
        />
        <p className="t-micro self-center text-center text-muted-foreground">vs</p>
        <SidePick
          people={peopleB}
          label={labelB}
          tone="stone"
          selected={mine?.choice === "side-b"}
          disabled={!canPick || busy}
          to={claimToRide ? "/profile" : undefined}
          onClick={() => pick("side-b")}
        />
      </div>
      <SplitBar sideA={crowd.sideA} sideB={crowd.sideB} />
      <CrowdUnderBar left={crowdA} right={crowdB} />
      {roastLine && !composing ? (
        <p className="t-micro mt-1.5 truncate italic text-foreground/80">
          “{roastLine.note}”
          {roastLine.name ? (
            <span className="not-italic text-muted-foreground"> · {roastLine.name}</span>
          ) : null}
        </p>
      ) : null}
      {canPick && mine && (composing || !mine.note) ? (
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
      ) : null}
    </article>
  );
}

function SplitBar({ sideA, sideB }: { sideA: number; sideB: number }) {
  const total = sideA + sideB;
  if (total <= 0) return null;
  const left = Math.round((sideA / total) * 100);
  return (
    <div
      className="mt-2 flex h-1 overflow-hidden rounded-full bg-border"
      aria-hidden
      title={`${sideA}–${sideB}`}
    >
      <span className="h-full bg-hunter" style={{ width: `${left}%` }} />
      <span className="h-full flex-1 bg-stone/70" />
    </div>
  );
}

function CrowdUnderBar({ left, right }: { left: CardFace[]; right: CardFace[] }) {
  if (left.length + right.length === 0) return null;
  return (
    <div className="mt-1.5 flex items-center justify-between gap-3">
      <FaceStack people={left} />
      <FaceStack people={right} align="end" />
    </div>
  );
}

function FaceStack({ people, align = "start" }: { people: CardFace[]; align?: "start" | "end" }) {
  if (people.length === 0) return <span />;
  const extra = people.length - 3;
  return (
    <span className={`inline-flex items-center gap-0.5 ${align === "end" ? "justify-end" : ""}`}>
      {people.slice(0, 3).map((rider, index) => (
        <Avatar
          key={`${rider.name}-${index}`}
          name={rider.name}
          teamSlug={rider.teamSlug}
          src={rider.src}
          size="sm"
        />
      ))}
      {extra > 0 ? <span className="t-micro pl-0.5 text-muted-foreground">+{extra}</span> : null}
    </span>
  );
}

function SidePick({
  people,
  label,
  tone,
  selected,
  disabled,
  to,
  onClick,
}: {
  people: CardFace[];
  label: string;
  tone: "hunter" | "stone";
  selected: boolean;
  disabled: boolean;
  to?: string;
  onClick: () => void;
}) {
  const color = selected ? "text-hunter" : tone === "hunter" ? "text-hunter" : "text-stone";
  const fill = selected ? "bg-hunter/15 ring-1 ring-hunter/30" : "";
  const className = `contents`;
  const inner = (
    <>
      <span className={`flex min-h-12 items-center justify-center rounded-xl transition-colors duration-[120ms] ${fill}`}>
        <AvatarPair people={people} size="sm" />
      </span>
      <span className={`min-w-0 rounded-xl px-1 py-1 text-left transition-colors duration-[120ms] ${fill}`}>
        <span className={`t-body block font-semibold leading-snug break-words ${color}`}>{label}</span>
      </span>
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
      className={`${className} ${disabled && !to ? "cursor-default" : "press"}`}
    >
      {inner}
    </button>
  );
}
