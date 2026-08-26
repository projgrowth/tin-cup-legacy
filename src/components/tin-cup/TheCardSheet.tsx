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
        <div className="px-4 py-2.5">
          <h2 id="the-card-title" className="t-eyebrow">
            Faceoff
          </h2>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((pairing) => {
            const you = pairing.matchIndex === yours?.matchIndex;
            return (
              <li key={pairing.matchIndex} className={you ? "bg-hunter/5" : ""}>
                {you ? (
                  <p className="t-micro px-4 pt-2.5 text-hunter">You</p>
                ) : null}
                <p
                  className={`t-body min-w-0 px-4 font-medium leading-snug text-foreground ${
                    you ? "pb-2.5 pt-1" : "py-2.5"
                  }`}
                >
                  <SideNames names={pairing.playersA} playerIdByName={playerIdByName} />
                  <span className="t-micro font-medium text-muted-foreground"> vs </span>
                  <SideNames names={pairing.playersB} playerIdByName={playerIdByName} />
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
