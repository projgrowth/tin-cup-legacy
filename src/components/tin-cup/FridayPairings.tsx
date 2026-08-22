import { AvatarPair } from "@/components/tin-cup/Avatar";
import { DAY1_PAIRINGS } from "@/lib/day1-pairings";

type Face = { name: string; url?: string | null };

function given(names: string[]) {
  return names.map((n) => n.trim().split(/\s+/)[0] ?? n).join(" · ");
}

/** One Friday sheet — format lives in the Weekend masthead, not on every row. */
export function FridayPairings({
  getFace,
}: {
  getFace?: (name: string) => Face | undefined;
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
        return (
          <li key={p.matchIndex} className="flex items-center gap-3 px-4 py-3">
            <span className="t-micro w-4 shrink-0 tabular-nums">{p.matchIndex}</span>
            <AvatarPair people={peopleA} size="sm" />
            <p className="t-body min-w-0 flex-1 font-semibold leading-snug">
              <span className="text-hunter">{given(p.playersA)}</span>
              <span className="mx-1.5 font-medium text-muted-foreground">vs</span>
              <span className="text-stone">{given(p.playersB)}</span>
            </p>
            <AvatarPair people={peopleB} size="sm" />
          </li>
        );
      })}
    </ol>
  );
}
