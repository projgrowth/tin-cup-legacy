import { Link } from "@tanstack/react-router";

import { Avatar } from "@/components/tin-cup/Avatar";
import type { AvatarIndex } from "@/hooks/usePlayerAvatars";
import { faceUrl } from "@/hooks/usePlayerAvatars";
import type { Match, Round } from "@/hooks/useTournament";
import { DAY1_PAIRINGS, foursomeSentence } from "@/lib/day1-pairings";

type Face = { name: string; url?: string | null; src?: string | null };

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export const FRIDAY_HOW = "8 v 8. Four groups. You and a partner vs two of them.";
export const FRIDAY_FORMAT_LINE = "Scramble then alt shot · 8 pts";
export const FRIDAY_TEE_CAPTION = "Friday · South · 7:30a";

export type PairingGroup = {
  matchIndex: number;
  playersA: string[];
  playersB: string[];
};

export type PairingVariant = "home" | "strips";

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

function orderedSides(group: PairingGroup, claimedName?: string | null, yours = false) {
  const onA = Boolean(claimedName && group.playersA.some((name) => sameName(name, claimedName)));
  const swapped = Boolean(yours && claimedName && !onA);
  const left = swapped ? group.playersB : group.playersA;
  const right = swapped ? group.playersA : group.playersB;
  if (claimedName && yours) {
    const you = left.find((name) => sameName(name, claimedName)) ?? left[0]!;
    const partner = left.find((name) => name !== you) ?? left[1]!;
    return { left: [you, partner], right };
  }
  return { left, right };
}

function BleedFace({
  name,
  src,
  href,
}: {
  name: string;
  src?: string | null;
  href?: string;
}) {
  const inner = (
    <span className="lockup-photo relative block aspect-square overflow-hidden bg-secondary">
      <span className="absolute inset-0">
        <Avatar name={name} src={src} size="tile" crop="bleed" />
      </span>
    </span>
  );
  if (href) {
    return (
      <Link to="/player/$playerId" params={{ playerId: href }} className="press min-w-0" aria-label={name}>
        {inner}
      </Link>
    );
  }
  return <span className="min-w-0" aria-label={name}>{inner}</span>;
}

/** Home-only: one 2×2 bleed quad. No names on photos. No vs in the gutter. */
export function PosterQuad({
  group,
  getFace,
  avatars,
  claimedName = null,
  playerIdByName,
  yours = false,
}: {
  group: PairingGroup;
  getFace?: (name: string) => Face | undefined;
  avatars?: AvatarIndex;
  claimedName?: string | null;
  playerIdByName?: (name: string) => string | undefined;
  yours?: boolean;
}) {
  const { left, right } = orderedSides(group, claimedName, yours);
  const cells = [left[0]!, right[0]!, left[1]!, right[1]!];
  return (
    <div
      className="poster-quad -mx-4 grid w-[calc(100%+2rem)] grid-cols-2 gap-px bg-background sm:-mx-5 sm:w-[calc(100%+2.5rem)]"
      aria-hidden
    >
      {cells.map((name, index) => (
        <BleedFace
          key={`${name}-${index}`}
          name={name}
          src={resolvedSrc(name, getFace, avatars, playerIdByName)}
          href={playerIdByName?.(name)}
        />
      ))}
    </div>
  );
}

/** Weekend: four small faces in a row, A A | B B, names once beside. */
export function PairingStrip({
  group,
  getFace,
  avatars,
  claimedName = null,
  playerIdByName,
}: {
  group: PairingGroup;
  getFace?: (name: string) => Face | undefined;
  avatars?: AvatarIndex;
  claimedName?: string | null;
  playerIdByName?: (name: string) => string | undefined;
}) {
  const yours = Boolean(
    claimedName && [...group.playersA, ...group.playersB].some((name) => sameName(name, claimedName)),
  );
  const { left, right } = orderedSides(group, claimedName, yours);
  const line = foursomeSentence(group.playersA, group.playersB, claimedName && yours ? claimedName : null);
  const faces = [...left, ...right];
  return (
    <article className="flex min-w-0 items-center gap-3" aria-label={line}>
      <div className="grid w-[9.5rem] shrink-0 grid-cols-4 gap-px bg-background">
        {faces.map((name, index) => (
          <span
            key={`${name}-${index}`}
            className={`lockup-photo relative block aspect-square overflow-hidden bg-secondary ${index === 1 ? "border-r border-border" : ""}`}
          >
            <span className="absolute inset-0">
              <Avatar
                name={name}
                src={resolvedSrc(name, getFace, avatars, playerIdByName)}
                size="tile"
                crop="bleed"
              />
            </span>
          </span>
        ))}
      </div>
      <p className="t-micro min-w-0 flex-1">{line}</p>
    </article>
  );
}

export function PairingSpread({
  groups,
  getFace,
  avatars,
  claimedName = null,
  playerIdByName,
  variant = "strips",
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
    const sentence = foursomeSentence(
      featured.playersA,
      featured.playersB,
      yours && claimedName ? claimedName : null,
    );
    return (
      <div className="stack">
        <PosterQuad
          group={featured}
          getFace={getFace}
          avatars={avatars}
          claimedName={claimedName}
          playerIdByName={playerIdByName}
          yours={Boolean(yours)}
        />
        <p className="t-body text-foreground">{sentence}</p>
        <p className="t-micro">{FRIDAY_TEE_CAPTION}</p>
        {rest.length ? (
          <ul className="stack">
            {rest.map((p) => (
              <li key={p.matchIndex} className="t-micro">
                {foursomeSentence(p.playersA, p.playersB)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <ol className="stack">
      {groups.map((p) => (
        <li key={p.matchIndex}>
          <PairingStrip
            group={p}
            getFace={getFace}
            avatars={avatars}
            claimedName={claimedName}
            playerIdByName={playerIdByName}
          />
        </li>
      ))}
    </ol>
  );
}

/** Friday groups. Format copy stays off Home. */
export function FridayPairings({
  getFace,
  avatars,
  claimedName = null,
  playerIdByName,
  matches: _matches = [],
  rounds: _rounds = [],
  hideIntro = false,
  variant = "strips",
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
