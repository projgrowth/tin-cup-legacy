import { Link } from "@tanstack/react-router";

import { AvatarPair } from "@/components/tin-cup/Avatar";
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
}: {
  getFace?: (name: string) => Face | undefined;
  claimedName?: string | null;
  playerIdByName?: (name: string) => string | undefined;
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
          <li
            key={p.matchIndex}
            className={`grid grid-cols-[1.25rem_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-3 ${
              yours ? "bg-hunter/5" : ""
            }`}
          >
            <span className="t-micro tabular-nums">{p.matchIndex}</span>
            <div className="min-w-0">
              <AvatarPair people={peopleA} size="sm" />
              <p className="t-body mt-1 font-semibold leading-snug">
                <SideNames names={p.playersA} tone="hunter" playerIdByName={playerIdByName} />
              </p>
            </div>
            <span className="t-micro font-medium text-muted-foreground">vs</span>
            <div className="min-w-0 text-right">
              <span className="inline-flex justify-end">
                <AvatarPair people={peopleB} size="sm" />
              </span>
              <p className="t-body mt-1 font-semibold leading-snug">
                <SideNames names={p.playersB} tone="stone" playerIdByName={playerIdByName} />
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SideNames({
  names,
  tone,
  playerIdByName,
}: {
  names: string[];
  tone: "hunter" | "stone";
  playerIdByName?: (name: string) => string | undefined;
}) {
  const color = tone === "hunter" ? "text-hunter" : "text-stone";
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
