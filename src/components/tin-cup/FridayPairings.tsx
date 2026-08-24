import { Link } from "@tanstack/react-router";

import { Avatar } from "@/components/tin-cup/Avatar";
import type { AvatarIndex } from "@/hooks/usePlayerAvatars";
import { faceUrl } from "@/hooks/usePlayerAvatars";
import type { Match, Round } from "@/hooks/useTournament";
import { DAY1_PAIRINGS, yourGroupLine } from "@/lib/day1-pairings";

type Face = { name: string; url?: string | null; src?: string | null };

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export const FRIDAY_HOW = "8 v 8. Four groups. You and a partner vs two of them.";
export const FRIDAY_FORMAT_LINE = "Scramble then alt shot · 8 pts";

export type PairingGroup = {
  matchIndex: number;
  playersA: string[];
  playersB: string[];
};

export type PairingVariant = "home" | "grid";

function resolvedSrc(
  name: string,
  getFace?: (name: string) => Face | undefined,
  avatars?: AvatarIndex,
  playerIdByName?: (name: string) => string | undefined,
) {
  const id = playerIdByName?.(name);
  const fromIndex = faceUrl(avatars, name, id);
  if (fromIndex) return fromIndex;
  const face = getFace?.(name);
  const raw = face?.url ?? face?.src;
  return raw?.trim() ? raw : null;
}

function FaceCell({
  name,
  src,
  href,
  label,
  you,
  compact = false,
}: {
  name: string;
  src?: string | null;
  href?: string;
  label: string;
  you?: boolean;
  compact?: boolean;
}) {
  const inner = (
    <>
      <span
        className={`lockup-photo relative block aspect-square overflow-hidden bg-secondary ${
          compact ? "mx-auto w-full max-w-[3.35rem]" : "w-full"
        }`}
      >
        <span className="absolute inset-0">
          <Avatar name={name} src={src} size="tile" crop="bleed" />
        </span>
      </span>
      <span
        className={`lockup-name mt-1 block truncate text-center t-micro ${you ? "font-semibold" : ""}`}
      >
        {label}
      </span>
    </>
  );
  if (href) {
    return (
      <Link to="/player/$playerId" params={{ playerId: href }} className="press min-w-0">
        {inner}
      </Link>
    );
  }
  return <span className="min-w-0">{inner}</span>;
}

function SideLockup({
  names,
  getFace,
  avatars,
  playerIdByName,
  claimedName,
  compact = false,
}: {
  names: string[];
  getFace?: (name: string) => Face | undefined;
  avatars?: AvatarIndex;
  playerIdByName?: (name: string) => string | undefined;
  claimedName?: string | null;
  compact?: boolean;
}) {
  return (
    <div className={`grid grid-cols-2 ${compact ? "gap-1.5" : "gap-px"}`}>
      {names.map((name) => {
        const you = Boolean(claimedName && sameName(name, claimedName));
        return (
          <FaceCell
            key={name}
            name={name}
            src={resolvedSrc(name, getFace, avatars, playerIdByName)}
            href={playerIdByName?.(name)}
            label={you ? "You" : firstName(name)}
            you={you}
            compact={compact}
          />
        );
      })}
    </div>
  );
}

/** One foursome as a single match lockup: four faces, vs in the gutter, names under photos. */
export function MatchLockup({
  group,
  getFace,
  avatars,
  claimedName = null,
  playerIdByName,
  size = "compact",
  caption = null,
  yours = false,
}: {
  group: PairingGroup;
  getFace?: (name: string) => Face | undefined;
  avatars?: AvatarIndex;
  claimedName?: string | null;
  playerIdByName?: (name: string) => string | undefined;
  size?: "hero" | "compact";
  caption?: string | null;
  yours?: boolean;
}) {
  const onA = Boolean(claimedName && group.playersA.some((name) => sameName(name, claimedName)));
  const swapped = Boolean(yours && claimedName && !onA);
  const leftNames = swapped ? group.playersB : group.playersA;
  const rightNames = swapped ? group.playersA : group.playersB;
  const names = [...group.playersA, ...group.playersB].map(firstName).join(" · ");

  return (
    <article aria-label={caption ?? names} className="min-w-0">
      {caption ? (
        <p className="t-micro mb-[var(--space-3)] text-muted-foreground">
          {caption}
        </p>
      ) : null}
      <div
        className={
          size === "hero"
            ? "grid grid-cols-[1fr_auto_1fr] items-start gap-3 sm:gap-4"
            : "grid grid-cols-[1fr_auto_1fr] items-start gap-2"
        }
      >
        <SideLockup
          names={leftNames}
          getFace={getFace}
          avatars={avatars}
          playerIdByName={playerIdByName}
          claimedName={claimedName}
          compact={size === "compact"}
        />
        <span className="lockup-vs t-micro self-center px-0.5 font-medium" aria-hidden>
          vs
        </span>
        <SideLockup
          names={rightNames}
          getFace={getFace}
          avatars={avatars}
          playerIdByName={playerIdByName}
          claimedName={claimedName}
          compact={size === "compact"}
        />
      </div>
    </article>
  );
}

function pairingLine(group: PairingGroup) {
  const a = group.playersA.map(firstName).join(" · ");
  const b = group.playersB.map(firstName).join(" · ");
  return `${a} vs ${b}`;
}

/** Home: one lockup + three text lines. Weekend: even 2×2 of lockups. */
export function PairingSpread({
  groups,
  getFace,
  avatars,
  claimedName = null,
  playerIdByName,
  variant = "grid",
}: {
  groups: PairingGroup[];
  getFace?: (name: string) => Face | undefined;
  avatars?: AvatarIndex;
  claimedName?: string | null;
  playerIdByName?: (name: string) => string | undefined;
  variant?: PairingVariant;
}) {
  const yours = claimedName
    ? groups.find((p) => [...p.playersA, ...p.playersB].some((name) => sameName(name, claimedName)))
    : undefined;
  const featured = yours ?? groups[0];
  const rest = featured ? groups.filter((p) => p.matchIndex !== featured.matchIndex) : groups;

  if (variant === "home" && featured) {
    return (
      <div className="hangout mx-auto w-full max-w-[48rem] stack">
        <MatchLockup
          group={featured}
          getFace={getFace}
          avatars={avatars}
          claimedName={claimedName}
          playerIdByName={playerIdByName}
          size="hero"
          yours={Boolean(yours)}
          caption={claimedName ? yourGroupLine(claimedName) : null}
        />
        {rest.length ? (
          <ul className="stack">
            {rest.map((p) => (
              <li key={p.matchIndex} className="t-micro">
                {pairingLine(p)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div className="hangout mx-auto w-full max-w-[22.5rem] stack">
      <ol className="grid grid-cols-2 gap-x-[var(--space-5)] gap-y-[var(--space-8)]">
        {groups.map((p) => (
          <li key={p.matchIndex} className="min-w-0">
            <MatchLockup
              group={p}
              getFace={getFace}
              avatars={avatars}
              claimedName={claimedName}
              playerIdByName={playerIdByName}
              size="compact"
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Friday groups as lockups. Format copy stays off Home. */
export function FridayPairings({
  getFace,
  avatars,
  claimedName = null,
  playerIdByName,
  matches: _matches = [],
  rounds: _rounds = [],
  hideIntro = false,
  variant = "grid",
}: {
  getFace?: (name: string) => Face | undefined;
  avatars?: AvatarIndex;
  claimedName?: string | null;
  playerIdByName?: (name: string) => string | undefined;
  matches?: Match[];
  rounds?: Round[];
  hideIntro?: boolean;
  variant?: PairingVariant;
}) {
  return (
    <div className="stack">
      {hideIntro ? null : (
        <p className="t-micro">
          {FRIDAY_HOW} · {FRIDAY_FORMAT_LINE}
        </p>
      )}
      <PairingSpread
        groups={DAY1_PAIRINGS}
        getFace={getFace}
        avatars={avatars}
        claimedName={claimedName}
        playerIdByName={playerIdByName}
        variant={variant}
      />
    </div>
  );
}
