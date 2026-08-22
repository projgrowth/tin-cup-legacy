import type { ReactNode } from "react";

import { AvatarPair } from "@/components/tin-cup/Avatar";

export type MatchPerson = {
  name: string;
  teamSlug?: string | null;
  src?: string | null;
};

function givenNames(people: MatchPerson[], fallback: string) {
  if (people.length === 0) return fallback;
  return people.map((p) => p.name.trim().split(/\s+/)[0] ?? p.name).join(" · ");
}

/**
 * One match tile — Weekend pairings, live “my match”, and round rows.
 */
export function MatchCard({
  index,
  sideA,
  sideB,
  peopleA,
  peopleB,
  format,
  points,
  yours = false,
  yoursOnA,
  live = false,
  result,
  action,
  size = "row",
}: {
  index?: number | string;
  sideA: string;
  sideB: string;
  peopleA: MatchPerson[];
  peopleB: MatchPerson[];
  format?: string;
  points?: string | number;
  yours?: boolean;
  yoursOnA?: boolean;
  live?: boolean;
  result?: string | null;
  action?: ReactNode;
  size?: "row" | "feature";
}) {
  const feature = size === "feature";
  const labelA = givenNames(peopleA, sideA);
  const labelB = givenNames(peopleB, sideB);
  const meta = [format, points != null ? `${points} pts` : null].filter(Boolean).join(" · ");

  return (
    <article
      className={`surface overflow-hidden px-4 py-3.5 ${
        yours ? "ring-1 ring-gold/35" : ""
      } ${feature ? "py-4" : ""}`}
    >
      <div className="flex items-center gap-3">
        <AvatarPair people={peopleA} size={feature ? "md" : "sm"} />
        <div className="min-w-0 flex-1 text-center">
          {index != null ? (
            <p className="t-micro text-muted-foreground">
              {typeof index === "number" ? `Match ${index}` : index}
              {live ? <span className="ml-1.5 text-copper">Live</span> : null}
              {yours ? <span className="ml-1.5 text-gold-light">You</span> : null}
            </p>
          ) : yours || live ? (
            <p className="t-micro">
              {live ? <span className="text-copper">Live</span> : null}
              {live && yours ? <span className="text-muted-foreground"> · </span> : null}
              {yours ? <span className="text-gold-light">You</span> : null}
            </p>
          ) : null}
          <p className={`mt-0.5 font-semibold leading-snug ${feature ? "t-title" : "t-body"}`}>
            <span className={yours && yoursOnA === false ? "text-gold-light/70" : "text-gold-light"}>
              {labelA}
            </span>
            <span className="mx-1.5 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
              vs
            </span>
            <span className={yours && yoursOnA ? "text-copper/70" : "text-copper"}>{labelB}</span>
          </p>
          {meta ? <p className="t-micro mt-1 text-muted-foreground">{meta}</p> : null}
          {result ? (
            <p className="t-numeral mt-1 text-foreground">{result}</p>
          ) : null}
        </div>
        <AvatarPair people={peopleB} size={feature ? "md" : "sm"} />
      </div>
      {action ? <div className="mt-3 border-t border-border pt-2">{action}</div> : null}
    </article>
  );
}
