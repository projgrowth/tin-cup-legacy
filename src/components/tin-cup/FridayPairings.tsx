import { Link } from "@tanstack/react-router";

import { AvatarPair } from "@/components/tin-cup/Avatar";
import { DAY1_PAIRINGS } from "@/lib/day1-pairings";

type Face = { name: string; url?: string | null };

function given(names: string[]) {
  return names.map((n) => n.trim().split(/\s+/)[0] ?? n).join(" · ");
}

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
            className={`flex items-center gap-3 px-4 py-3 ${yours ? "bg-hunter/5" : ""}`}
          >
            <span className="t-micro w-4 shrink-0 tabular-nums">{p.matchIndex}</span>
            <AvatarPair people={peopleA} size="sm" />
            <p className="t-body min-w-0 flex-1 font-semibold leading-snug">
              <SideNames names={p.playersA} tone="hunter" playerIdByName={playerIdByName} />
              <span className="mx-1.5 font-medium text-muted-foreground"> vs </span>
              <SideNames names={p.playersB} tone="stone" playerIdByName={playerIdByName} />
            </p>
            <AvatarPair people={peopleB} size="sm" />
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
