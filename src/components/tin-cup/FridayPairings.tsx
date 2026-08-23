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

/** Four Friday groups as one spread. Format copy stays off Home. */
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
          const caption = yours && claimedName ? yourGroupLine(claimedName) : `Group ${p.matchIndex}`;
          return (
            <li key={p.matchIndex} className="flex h-full min-h-[12rem] flex-col py-[var(--space-2)]">
              <p className="t-micro">{caption}</p>
              <div className="mt-[var(--space-3)] flex items-center gap-2">
                <AvatarPair people={peopleA} size="md" />
                <p className="t-title min-w-0 text-foreground">
                  <SideNames names={p.playersA} playerIdByName={playerIdByName} claimedName={claimedName} />
                </p>
              </div>
              <p className="t-micro my-[var(--space-3)]">vs</p>
              <div className="flex items-center gap-2">
                <AvatarPair people={peopleB} size="md" />
                <p className="t-title min-w-0 text-foreground">
                  <SideNames names={p.playersB} playerIdByName={playerIdByName} claimedName={claimedName} />
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
