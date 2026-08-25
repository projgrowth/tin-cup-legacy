import { Link } from "@tanstack/react-router";

import type { Match, Round } from "@/hooks/useTournament";
import { DAY1_PAIRINGS } from "@/lib/day1-pairings";

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Type-first Friday sheet — faces live on Home Faceoff. */
export function FridayPairings({
  claimedName = null,
  playerIdByName,
}: {
  getFace?: (name: string) => { name: string; url?: string | null } | undefined;
  claimedName?: string | null;
  playerIdByName?: (name: string) => string | undefined;
  matches?: Match[];
  rounds?: Round[];
}) {
  return (
    <ol className="surface divide-y divide-border overflow-hidden">
      {DAY1_PAIRINGS.map((p) => {
        const yours = Boolean(
          claimedName && [...p.playersA, ...p.playersB].some((name) => sameName(name, claimedName)),
        );
        return (
          <li key={p.matchIndex} className={`flex gap-3 px-4 py-2.5 ${yours ? "bg-hunter/5" : ""}`}>
            <span className="t-micro w-4 shrink-0 pt-0.5 tabular-nums">{p.matchIndex}</span>
            <p className="t-body min-w-0 font-medium leading-snug text-foreground">
              <SideNames names={p.playersA} playerIdByName={playerIdByName} />
              <span className="t-micro font-medium text-muted-foreground"> vs </span>
              <SideNames names={p.playersB} playerIdByName={playerIdByName} />
            </p>
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
