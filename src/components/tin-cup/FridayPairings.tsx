import { MatchCard } from "@/components/tin-cup/MatchCard";
import { DAY1_PAIRINGS } from "@/lib/day1-pairings";

type Face = { name: string; url?: string | null };

/** Friday draw — one dense sheet. Weekend owns this; Home does not reprint it. */
export function FridayPairings({
  getFace,
}: {
  getFace?: (name: string) => Face | undefined;
}) {
  return (
    <div className="surface overflow-hidden divide-y divide-border">
      {DAY1_PAIRINGS.map((p) => (
        <MatchCard
          key={p.matchIndex}
          index={p.matchIndex}
          sideA={p.sideA}
          sideB={p.sideB}
          peopleA={p.playersA.map((name) => ({
            name,
            teamSlug: "strong-mental",
            src: getFace?.(name)?.url,
          }))}
          peopleB={p.playersB.map((name) => ({
            name,
            teamSlug: "grass-roots",
            src: getFace?.(name)?.url,
          }))}
          format="Scramble · Alt shot"
          points={2}
        />
      ))}
    </div>
  );
}
