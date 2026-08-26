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
    <section aria-labelledby="the-card-title" className="stack-tight">
      <h2 id="the-card-title" className="t-eyebrow">
        Faceoff
      </h2>
      <ul className="stack-tight">
        {rows.map((pairing) => {
          const you = pairing.matchIndex === yours?.matchIndex;
          const faceA = faceFor(pairing.playersA);
          const faceB = faceFor(pairing.playersB);
          return (
            <li
              key={pairing.matchIndex}
              className={`surface overflow-hidden ${you ? "ring-1 ring-hunter/35" : ""}`}
            >
              {you ? (
                <p className="card-row t-micro bg-hunter/10 py-1.5 text-hunter">You</p>
              ) : null}
              <div className="flex flex-col items-center gap-1 px-4 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  {faceA ? (
                    <Avatar
                      name={faceA.name}
                      src={faceA.url}
                      teamSlug={faceA.teamSlug}
                      size="md"
                      fallback="none"
                    />
                  ) : null}
                  <p className="t-body font-semibold leading-snug text-hunter [&_a]:text-hunter">
                    <SideNames names={pairing.playersA} playerIdByName={playerIdByName} />
                  </p>
                </div>
                <span className="t-micro">vs</span>
                <div className="flex items-center justify-center gap-2">
                  <p className="t-body font-semibold leading-snug text-stone [&_a]:text-stone">
                    <SideNames names={pairing.playersB} playerIdByName={playerIdByName} />
                  </p>
                  {faceB ? (
                    <Avatar
                      name={faceB.name}
                      src={faceB.url}
                      teamSlug={faceB.teamSlug}
                      size="md"
                      fallback="none"
                    />
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
