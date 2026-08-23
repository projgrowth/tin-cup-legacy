import { Link } from "@tanstack/react-router";

import { AvatarPair } from "@/components/tin-cup/Avatar";
import type { Match, Round } from "@/hooks/useTournament";
import { DAY1_PAIRINGS } from "@/lib/day1-pairings";

type Face = { name: string; url?: string | null };

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

const ROW_GRID =
  "grid grid-cols-[1.25rem_4.75rem_minmax(0,1fr)_1.5rem_4.75rem_minmax(0,1fr)] items-center gap-x-2";

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
          claimedName &&
            [...p.playersA, ...p.playersB].some((name) => sameName(name, claimedName)),
        );
        return (
          <li key={p.matchIndex} className={`${ROW_GRID} h-14 px-3 sm:px-4 ${yours ? "ring-1 ring-inset ring-hunter" : ""}`}>
            <span className={`t-numeral text-[0.7rem] ${yours ? "text-hunter" : "text-muted-foreground/70"}`}>{p.matchIndex}</span>
            <span className="flex h-9 items-center justify-center">
              <AvatarPair people={peopleA} size="md" />
            </span>
            <p className="t-body min-w-0 truncate whitespace-nowrap leading-none font-medium">
              <SideNames names={p.playersA} tone="hunter" quiet={!yours} playerIdByName={playerIdByName} />
            </p>
            <p className="t-micro text-center text-muted-foreground">vs</p>
            <span className="flex h-9 items-center justify-center">
              <AvatarPair people={peopleB} size="md" />
            </span>
            <p className="t-body min-w-0 truncate whitespace-nowrap leading-none font-medium">
              <SideNames names={p.playersB} tone="stone" quiet={!yours} playerIdByName={playerIdByName} />
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function SideNames({
  names,
  tone,
  quiet = false,
  playerIdByName,
}: {
  names: string[];
  tone: "hunter" | "stone";
  quiet?: boolean;
  playerIdByName?: (name: string) => string | undefined;
}) {
  const color = quiet
    ? "text-muted-foreground"
    : tone === "hunter"
      ? "text-hunter"
      : "text-stone";
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
              <Link to="/player/$playerId" params={{ playerId: id }} className={`press ${color}`}>
                {label}
              </Link>
            </span>
          );
        }
        return (
          <span key={name} className={color}>
            {sep}
            {label}
          </span>
        );
      })}
    </>
  );
}
