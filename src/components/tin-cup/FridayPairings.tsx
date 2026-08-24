import { Link } from "@tanstack/react-router";

import { Avatar } from "@/components/tin-cup/Avatar";
import type { Match, Round } from "@/hooks/useTournament";
import { DAY1_PAIRINGS, yourGroupLine } from "@/lib/day1-pairings";

type Face = { name: string; url?: string | null };

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

function FaceCell({
  name,
  src,
  teamSlug,
  href,
  label,
  size,
}: {
  name: string;
  src?: string | null;
  teamSlug: "strong-mental" | "grass-roots";
  href?: string;
  label: string;
  size: "hero" | "compact";
}) {
  const type = size === "hero" ? "t-title mt-[var(--space-2)]" : "t-micro mt-1";
  const typeSize = size === "hero" ? "text-[clamp(1.25rem,5vw,2rem)]" : "text-[clamp(0.7rem,3.2vw,1rem)]";
  const inner = (
    <>
      <span className="block aspect-square overflow-hidden bg-secondary">
        <Avatar name={name} teamSlug={teamSlug} src={src} crop="bleed" className={typeSize} />
      </span>
      <span className={`block truncate text-center ${type} text-foreground`}>{label}</span>
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
  teamSlug,
  getFace,
  playerIdByName,
  claimedName,
  size,
}: {
  names: string[];
  teamSlug: "strong-mental" | "grass-roots";
  getFace?: (name: string) => Face | undefined;
  playerIdByName?: (name: string) => string | undefined;
  claimedName?: string | null;
  size: "hero" | "compact";
}) {
  return (
    <div className={size === "hero" ? "grid grid-cols-2 gap-px" : "grid grid-cols-2 gap-px"}>
      {names.map((name) => {
        const you = Boolean(claimedName && sameName(name, claimedName));
        return (
          <FaceCell
            key={name}
            name={name}
            src={getFace?.(name)?.url}
            teamSlug={teamSlug}
            href={playerIdByName?.(name)}
            label={you ? "You" : firstName(name)}
            size={size}
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
  claimedName = null,
  playerIdByName,
  size = "compact",
  caption = null,
  yours = false,
}: {
  group: PairingGroup;
  getFace?: (name: string) => Face | undefined;
  claimedName?: string | null;
  playerIdByName?: (name: string) => string | undefined;
  size?: "hero" | "compact";
  caption?: string | null;
  yours?: boolean;
}) {
  const onA = Boolean(claimedName && group.playersA.some((name) => sameName(name, claimedName)));
  const leftNames = yours && claimedName && !onA ? group.playersB : group.playersA;
  const rightNames = yours && claimedName && !onA ? group.playersA : group.playersB;
  const leftTeam = yours && claimedName && !onA ? ("grass-roots" as const) : ("strong-mental" as const);
  const rightTeam = yours && claimedName && !onA ? ("strong-mental" as const) : ("grass-roots" as const);
  const names = [...group.playersA, ...group.playersB].map(firstName).join(" · ");

  return (
    <article aria-label={caption ?? names} className="min-w-0">
      {caption ? <p className="t-micro mb-[var(--space-3)] text-foreground">{caption}</p> : null}
      <div
        className={
          size === "hero"
            ? "grid grid-cols-[1fr_auto_1fr] items-start gap-2"
            : "grid grid-cols-[1fr_auto_1fr] items-start gap-1"
        }
      >
        <SideLockup
          names={leftNames}
          teamSlug={leftTeam}
          getFace={getFace}
          playerIdByName={playerIdByName}
          claimedName={claimedName}
          size={size}
        />
        <span className="t-micro self-center px-0.5 font-medium text-muted-foreground" aria-hidden>
          vs
        </span>
        <SideLockup
          names={rightNames}
          teamSlug={rightTeam}
          getFace={getFace}
          playerIdByName={playerIdByName}
          claimedName={claimedName}
          size={size}
        />
      </div>
    </article>
  );
}

/** Four groups as lockups. Home raises the claimed match; Weekend stays an even 2×2. */
export function PairingSpread({
  groups,
  getFace,
  claimedName = null,
  playerIdByName,
  variant = "grid",
}: {
  groups: PairingGroup[];
  getFace?: (name: string) => Face | undefined;
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
    <div className="stack">
      {hero ? (
        <MatchLockup
          group={yours}
          getFace={getFace}
          claimedName={claimedName}
          playerIdByName={playerIdByName}
          size="hero"
          yours
          caption={claimedName ? yourGroupLine(claimedName) : null}
        />
      ) : null}
      <ol className="grid grid-cols-2 gap-x-[var(--space-3)] gap-y-[var(--space-5)]">
        {(hero ? rest : groups).map((p) => (
          <li key={p.matchIndex} className="min-w-0">
            <MatchLockup
              group={p}
              getFace={getFace}
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
  claimedName = null,
  playerIdByName,
  matches: _matches = [],
  rounds: _rounds = [],
  hideIntro = false,
  variant = "grid",
}: {
  getFace?: (name: string) => Face | undefined;
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
        claimedName={claimedName}
        playerIdByName={playerIdByName}
        variant={variant}
      />
    </div>
  );
}
