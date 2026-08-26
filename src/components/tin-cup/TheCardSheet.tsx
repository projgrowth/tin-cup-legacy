import { SideNames } from "@/components/tin-cup/FridayPairings";
import { DAY1_PAIRINGS } from "@/lib/day1-pairings";

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Friday groups as tiles. You first when claimed. No ride, no quotes. */
export function TheCardSheet({
  claimedName = null,
  playerIdByName,
}: {
  claimedName?: string | null;
  playerIdByName?: (name: string) => string | undefined;
}) {
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
            return (
              <li
                key={pairing.matchIndex}
                className={`px-4 py-3 ${you ? "rail-a bg-hunter/5" : ""}`}
              >
                {you ? <p className="t-micro mb-1 text-hunter">You</p> : null}
                <div className="tc-matchup">
                  <p className="t-body min-w-0 text-left font-semibold leading-snug text-foreground">
                    <SideNames names={pairing.playersA} playerIdByName={playerIdByName} />
                  </p>
                  <span className="t-micro px-1">vs</span>
                  <p className="t-body min-w-0 text-right font-semibold leading-snug text-foreground">
                    <SideNames names={pairing.playersB} playerIdByName={playerIdByName} />
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
