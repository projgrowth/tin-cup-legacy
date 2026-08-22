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

function Side({
  people,
  label,
  tone,
  dim,
  feature,
}: {
  people: MatchPerson[];
  label: string;
  tone: "gold" | "copper";
  dim?: boolean;
  feature: boolean;
}) {
  const color = dim
    ? tone === "gold"
      ? "text-hunter/70"
      : "text-stone/70"
    : tone === "gold"
      ? "text-hunter"
      : "text-stone";
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <AvatarPair people={people} size={feature ? "md" : "sm"} />
      <p className={`mt-1.5 font-semibold leading-snug ${feature ? "t-title" : "t-body"} ${color}`}>
        {label}
      </p>
    </div>
  );
}

/**
 * One match tile — Weekend pairings, live “my match”, Home, and round rows.
 * Faces sit over names; vs is the center mark, not a cramped inline slash.
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
  const eyebrow = [
    index == null ? null : typeof index === "number" ? `Match ${index}` : index,
    live ? "Live" : null,
    yours ? "You" : null,
  ].filter(Boolean);

  return (
    <article
      aria-label={`${labelA} vs ${labelB}${meta ? ` · ${meta}` : ""}${result ? ` · ${result}` : ""}`}
      className={`surface overflow-hidden px-4 py-3.5 ${
        yours ? "ring-1 ring-hunter/35" : ""
      } ${feature ? "py-4" : ""}`}
    >
      {eyebrow.length > 0 ? (
        <p className="t-micro text-center text-muted-foreground">
          {eyebrow.map((bit, i) => (
            <span key={bit}>
              {i > 0 ? <span className="text-muted-foreground"> · </span> : null}
              <span
                className={
                  bit === "Live" ? "text-[var(--status-live)]" : bit === "You" ? "text-hunter" : undefined
                }
              >
                {bit}
              </span>
            </span>
          ))}
        </p>
      ) : null}

      <div
        className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 ${
          eyebrow.length > 0 ? "mt-2.5" : ""
        }`}
      >
        <Side
          people={peopleA}
          label={labelA}
          tone="gold"
          dim={yours && yoursOnA === false}
          feature={feature}
        />
        <span className="t-micro px-0.5 font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          vs
        </span>
        <Side
          people={peopleB}
          label={labelB}
          tone="copper"
          dim={yours && yoursOnA === true}
          feature={feature}
        />
      </div>

      {meta ? <p className="t-micro mt-2.5 text-center text-muted-foreground">{meta}</p> : null}
      {result ? <p className="t-numeral mt-1 text-center text-foreground">{result}</p> : null}
      {action ? <div className="mt-3 border-t border-border pt-2">{action}</div> : null}
    </article>
  );
}
