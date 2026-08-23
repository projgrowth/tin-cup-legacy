import { Link } from "@tanstack/react-router";

import { AvatarPair } from "@/components/tin-cup/Avatar";
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

/** Four groups as one 2×2 spread — faces, names, vs. */
export function PairingSpread({
  groups,
  getFace,
  claimedName = null,
  playerIdByName,
}: {
  groups: PairingGroup[];
  getFace?: (name: string) => Face | undefined;
  claimedName?: string | null;
  playerIdByName?: (name: string) => string | undefined;
}) {
  return (
    <ol className="grid grid-cols-2 gap-x-[var(--space-4)] gap-y-[var(--space-6)]">
      {groups.map((p) => {
        const peopleA = p.playersA.map((name) => ({
          name,
          teamSlug: "strong-mental" as const,
          src: getFace?.(name)?.url,
        }));
        const peopleB = p.playersB.map((name) => ({
          name,
          teamSlug: "grass-roots" as const,
          src: getFace?.(name)?.url,
        }));
        const yours = Boolean(
          claimedName &&
            [...p.playersA, ...p.playersB].some((name) => sameName(name, claimedName)),
        );
        const caption = yours && claimedName ? yourGroupLine(claimedName) : `Group ${p.matchIndex}`;
        return (
          <li key={p.matchIndex} className="flex min-w-0 flex-col">
            <p className="t-micro">{caption}</p>
            <div className="mt-[var(--space-3)] flex min-w-0 items-center gap-2">
              <AvatarPair people={peopleA} size="md" />
              <p className="t-title min-w-0 text-foreground">
                <SideNames names={p.playersA} playerIdByName={playerIdByName} claimedName={claimedName} />
              </p>
            </div>
            <p className="t-micro my-[var(--space-2)]">vs</p>
            <div className="flex min-w-0 items-center gap-2">
              <AvatarPair people={peopleB} size="md" />
              <p className="t-title min-w-0 text-foreground">
                <SideNames names={p.playersB} playerIdByName={playerIdByName} claimedName={claimedName} />
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Friday groups as one spread. Format copy stays off Home. */
export function FridayPairings({
  getFace,
  claimedName = null,
  playerIdByName,
  matches: _matches = [],
  rounds: _rounds = [],
  hideIntro = false,
}: {
  getFace?: (name: string) => Face | undefined;
  claimedName?: string | null;
  playerIdByName?: (name: string) => string | undefined;
  matches?: Match[];
  rounds?: Round[];
  hideIntro?: boolean;
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
      />
    </div>
  );
}

function SideNames({
  names,
  playerIdByName,
  claimedName,
}: {
  names: string[];
  playerIdByName?: (name: string) => string | undefined;
  claimedName?: string | null;
}) {
  return (
    <>
      {names.map((name, index) => {
        const id = playerIdByName?.(name);
        const you = claimedName && sameName(name, claimedName);
        const label = you ? "You" : firstName(name);
        const sep = index === 0 ? null : " · ";
        if (id) {
          return (
            <span key={name}>
              {sep}
              <Link to="/player/$playerId" params={{ playerId: id }} className="press">
                {label}
              </Link>
            </span>
          );
        }
        return (
          <span key={name}>
            {sep}
            {label}
          </span>
        );
      })}
    </>
  );
}
