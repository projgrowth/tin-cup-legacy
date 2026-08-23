import { Link } from "@tanstack/react-router";

import { AvatarPair } from "@/components/tin-cup/Avatar";
import type { Match, Round } from "@/hooks/useTournament";
import { DAY1_PAIRINGS } from "@/lib/day1-pairings";

type Face = { name: string; url?: string | null };

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export const FRIDAY_HOW = "8 v 8. Four groups. You and a partner vs two of them.";
export const FRIDAY_FORMAT_LINE = "Scramble then alt shot · 8 pts";

/** Four equal Friday group cards. Format line lives once above. */
export function FridayPairings({
  getFace,
  claimedName = null,
  playerIdByName,
  matches: _matches = [],
  rounds: _rounds = [],
}: {
  getFace?: (name: string) => Face | undefined;
  claimedName?: string | null;
  playerIdByName?: (name: string) => string | undefined;
  matches?: Match[];
  rounds?: Round[];
}) {
  return (
    <div className="stack">
      <div>
        <p className="t-body text-foreground">{FRIDAY_HOW}</p>
        <p className="t-micro mt-[var(--space-3)]">{FRIDAY_FORMAT_LINE}</p>
      </div>
      <ol className="grid grid-cols-1 gap-[var(--space-5)] min-[420px]:grid-cols-2">
        {DAY1_PAIRINGS.map((p) => {
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
          return (
            <li key={p.matchIndex} className="flex h-full min-h-[12rem] flex-col py-[var(--space-2)]">
              <p className="t-micro">{yours ? "Your group" : `Group ${p.matchIndex}`}</p>
              <div className="mt-[var(--space-3)] flex items-center gap-2">
                <AvatarPair people={peopleA} size="md" />
                <p className="t-title min-w-0 text-foreground">
                  <SideNames names={p.playersA} playerIdByName={playerIdByName} />
                </p>
              </div>
              <p className="t-micro my-[var(--space-3)]">vs</p>
              <div className="flex items-center gap-2">
                <AvatarPair people={peopleB} size="md" />
                <p className="t-title min-w-0 text-foreground">
                  <SideNames names={p.playersB} playerIdByName={playerIdByName} />
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SideNames({
  names,
  playerIdByName,
}: {
  names: string[];
  playerIdByName?: (name: string) => string | undefined;
}) {
  return (
    <>
      {names.map((name, index) => {
        const id = playerIdByName?.(name);
        const label = firstName(name);
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
