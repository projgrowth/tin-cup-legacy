import { Link } from "@tanstack/react-router";

import { Avatar } from "@/components/tin-cup/Avatar";
import type { AvatarIndex } from "@/hooks/usePlayerAvatars";
import { faceUrl } from "@/hooks/usePlayerAvatars";
import type { Match, Round } from "@/hooks/useTournament";
import { DAY1_PAIRINGS } from "@/lib/day1-pairings";

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

function resolvedTeam(
  name: string,
  avatars?: AvatarIndex,
  playerIdByName?: (name: string) => string | undefined,
) {
  const id = playerIdByName?.(name);
  if (id) {
    const fromId = avatars?.byPlayerId.get(id)?.teamSlug;
    if (fromId) return fromId;
  }
  return avatars?.getByName(name)?.teamSlug ?? null;
}

function FaceCell({
  name,
  src,
  href,
  label,
  you,
  teamSlug,
}: {
  name: string;
  src?: string | null;
  href?: string;
  label: string;
  you?: boolean;
  teamSlug?: string | null;
}) {
  const inner = (
    <>
      <span className="relative block aspect-square w-full overflow-hidden bg-secondary">
        <span className="absolute inset-0">
          <Avatar name={name} src={src} teamSlug={teamSlug} size="tile" crop="bleed" />
        </span>
      </span>
      <span
        className={`lockup-name mt-1 block truncate text-center t-micro ${you ? "font-semibold text-hunter" : ""}`}
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
  sideSlug,
}: {
  names: string[];
  getFace?: (name: string) => Face | undefined;
  avatars?: AvatarIndex;
  playerIdByName?: (name: string) => string | undefined;
  claimedName?: string | null;
  sideSlug?: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-px">
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
            teamSlug={resolvedTeam(name, avatars, playerIdByName) ?? sideSlug}
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
  const leftSlug = swapped ? "grass-roots" : "strong-mental";
  const rightSlug = swapped ? "strong-mental" : "grass-roots";
  const names = [...group.playersA, ...group.playersB].map(firstName).join(" · ");

  return (
    <article aria-label={caption ?? names} className="min-w-0">
      {caption ? (
        <p className={`t-micro mb-[var(--space-3)] ${yours ? "text-hunter" : "text-foreground"}`}>
          {caption}
        </p>
      ) : null}
      <div
        className={
          size === "hero"
            ? "grid grid-cols-[1fr_auto_1fr] items-start gap-3 sm:gap-4"
            : "grid grid-cols-[1fr_auto_1fr] items-start gap-1"
        }
      >
        <SideLockup
          names={leftNames}
          getFace={getFace}
          avatars={avatars}
          playerIdByName={playerIdByName}
          claimedName={claimedName}
          sideSlug={leftSlug}
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
          sideSlug={rightSlug}
        />
      </div>
    </article>
  );
}

/** Four groups as lockups. Home raises the claimed match; Weekend and guests stay an even 2×2. */
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
  const rest = yours ? groups.filter((p) => p.matchIndex !== yours.matchIndex) : groups;
  const hero = variant === "home" && yours;

  return (
    <div
      className={
        hero
          ? "hangout mx-auto w-full max-w-[48rem] space-y-[var(--space-5)] md:grid md:max-w-none md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-start md:gap-x-[var(--space-6)] md:gap-y-[var(--space-5)] md:space-y-0"
          : "hangout mx-auto w-full max-w-[48rem] stack md:max-w-none"
      }
    >
      {hero ? (
        <MatchLockup
          group={yours}
          getFace={getFace}
          avatars={avatars}
          claimedName={claimedName}
          playerIdByName={playerIdByName}
          size="hero"
          yours
        />
      ) : null}
      <ol className="grid grid-cols-2 gap-x-[var(--space-3)] gap-y-[var(--space-5)]">
        {(hero ? rest : groups).map((p) => (
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
