import { Link } from "@tanstack/react-router";

import { AvatarPair } from "@/components/tin-cup/Avatar";
import type { Match, Round } from "@/hooks/useTournament";
import { DAY1_PAIRINGS } from "@/lib/day1-pairings";

type Face = { name: string; url?: string | null };

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** One Friday sheet — format lives in the Weekend masthead, not on every row. */
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
    <ol className="surface divide-y divide-border overflow-hidden">
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
          claimedName && [...p.playersA, ...p.playersB].some((name) => sameName(name, claimedName)),
        );
        return (
          <li key={p.matchIndex} className={`flex gap-3 px-4 py-3 ${yours ? "bg-hunter/5" : ""}`}>
            <span className="t-micro w-4 shrink-0 pt-1.5 tabular-nums">{p.matchIndex}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <AvatarPair people={peopleA} size="sm" />
                <p className="t-body min-w-0 font-semibold leading-snug">
                  <SideNames names={p.playersA} playerIdByName={playerIdByName} />
                </p>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <AvatarPair people={peopleB} size="sm" />
                <p className="t-body min-w-0 font-semibold leading-snug">
                  <SideNames names={p.playersB} playerIdByName={playerIdByName} />
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
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
        const label = name.trim().split(/\s+/)[0] ?? name;
        const sep = index === 0 ? null : " · ";
        if (id) {
          return (
            <span key={name}>
              {sep}
              <Link
                to="/player/$playerId"
                params={{ playerId: id }}
                className="press text-foreground"
              >
                {label}
              </Link>
            </span>
          );
        }
        return (
          <span key={name} className="text-foreground">
            {sep}
            {label}
          </span>
        );
      })}
    </>
  );
}
