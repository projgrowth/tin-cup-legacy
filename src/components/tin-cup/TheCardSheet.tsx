import { Avatar } from "@/components/tin-cup/Avatar";
import { SideNames } from "@/components/tin-cup/FridayPairings";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import type { Player, Team } from "@/hooks/useTournament";
import { DAY1_PAIRINGS } from "@/lib/day1-pairings";

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Friday groups as tiles. You first when claimed. No ride, no quotes. */
export function TheCardSheet({
  claimedName = null,
  playerIdByName,
  players = [],
  teams = [],
}: {
  claimedName?: string | null;
  playerIdByName?: (name: string) => string | undefined;
  players?: Player[];
  teams?: Team[];
}) {
  const avatars = usePlayerAvatars(players, teams);
  const faceFor = (names: string[]) => {
    for (const name of names) {
      const entry = avatars.data?.getByName(name);
      if (entry?.url) return { name, url: entry.url, teamSlug: entry.teamSlug };
    }
    return null;
  };
  const yours = claimedName
    ? DAY1_PAIRINGS.find((pairing) =>
        [...pairing.playersA, ...pairing.playersB].some((name) => sameName(name, claimedName)),
      )
    : undefined;
  const rows = yours
    ? [yours, ...DAY1_PAIRINGS.filter((pairing) => pairing.matchIndex !== yours.matchIndex)]
    : DAY1_PAIRINGS;

  return (
    <section aria-labelledby="the-card-title">
      <div className="surface overflow-hidden">
        <div className="section-cap">
          <h2 id="the-card-title" className="t-eyebrow">
            Faceoff
          </h2>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((pairing) => {
            const you = pairing.matchIndex === yours?.matchIndex;
            const faceA = faceFor(pairing.playersA);
            const faceB = faceFor(pairing.playersB);
            return (
              <li
                key={pairing.matchIndex}
                className={`px-4 py-3 ${you ? "rail-a bg-hunter/5" : ""}`}
              >
                {you ? <p className="t-micro mb-1 text-hunter">You</p> : null}
                <div className="tc-matchup">
                  <div className="flex min-w-0 items-center gap-2">
                    {faceA ? (
                      <Avatar
                        name={faceA.name}
                        src={faceA.url}
                        teamSlug={faceA.teamSlug}
                        size="sm"
                        fallback="none"
                      />
                    ) : null}
                    <p className="t-body min-w-0 truncate text-left font-semibold leading-snug text-foreground">
                      <SideNames names={pairing.playersA} playerIdByName={playerIdByName} />
                    </p>
                  </div>
                  <span className="t-micro px-1">vs</span>
                  <div className="flex min-w-0 items-center justify-end gap-2">
                    <p className="t-body min-w-0 truncate text-right font-semibold leading-snug text-foreground">
                      <SideNames names={pairing.playersB} playerIdByName={playerIdByName} />
                    </p>
                    {faceB ? (
                      <Avatar
                        name={faceB.name}
                        src={faceB.url}
                        teamSlug={faceB.teamSlug}
                        size="sm"
                        fallback="none"
                      />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
