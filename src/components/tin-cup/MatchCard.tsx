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
      <p className={`mt-1.5 font-semibold leading-snug t-title ${color}`}>{label}</p>
    </div>
  );
}

/**
 * Feature = one “your match” poster. Row = draw-sheet line (Weekend list).
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
  const matchLabel = index == null ? null : typeof index === "number" ? `Match ${index}` : index;
  const aria = `${labelA} vs ${labelB}${meta ? ` · ${meta}` : ""}${result ? ` · ${result}` : ""}`;

  if (!feature) {
    const youOnB = yours && yoursOnA === false;
    const top = youOnB
      ? { people: peopleB, label: labelB, tone: "text-stone" }
      : { people: peopleA, label: labelA, tone: "text-hunter" };
    const bot = youOnB
      ? { people: peopleA, label: labelA, tone: "text-hunter" }
      : { people: peopleB, label: labelB, tone: "text-stone" };
    return (
      <article aria-label={aria} className={yours ? "bg-hunter/5" : undefined}>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <AvatarPair people={top.people} size="sm" />
          <p className={`t-body min-w-0 flex-1 font-semibold leading-snug ${top.tone}`}>{top.label}</p>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <AvatarPair people={bot.people} size="sm" />
          <p className={`t-body min-w-0 flex-1 font-semibold leading-snug ${bot.tone}`}>{bot.label}</p>
        </div>
        <p className="t-micro mt-1.5 truncate">
          {matchLabel}
          {live ? <span className="text-[var(--status-live)]"> · Live</span> : null}
          {yours ? <span className="text-hunter"> · You</span> : null}
          {meta ? ` · ${meta}` : ""}
          {result ? ` · ${result}` : ""}
        </p>
      </div>
      {action ? <div className="border-t border-border px-4 py-2">{action}</div> : null}
    </article>
    );
  }

  return (
    <article
      aria-label={aria}
      className={`surface overflow-hidden px-4 py-4 ${yours ? "ring-1 ring-hunter/35" : ""}`}
    >
      <p className="t-micro text-center text-muted-foreground">
        {matchLabel}
        {live ? (
          <>
            {matchLabel ? " · " : null}
            <span className="text-[var(--status-live)]">Live</span>
          </>
        ) : null}
        {yours ? (
          <>
            {matchLabel || live ? " · " : null}
            <span className="text-hunter">You</span>
          </>
        ) : null}
      </p>
      <div className="mt-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Side
          people={peopleA}
          label={labelA}
          tone="gold"
          dim={yours && yoursOnA === false}
          feature
        />
        <span className="t-micro px-0.5 font-semibold text-muted-foreground">vs</span>
        <Side
          people={peopleB}
          label={labelB}
          tone="copper"
          dim={yours && yoursOnA === true}
          feature
        />
      </div>
      {meta ? <p className="t-micro mt-2.5 text-center">{meta}</p> : null}
      {result ? <p className="t-numeral mt-1 text-center text-foreground">{result}</p> : null}
      {action ? <div className="mt-3 border-t border-border pt-2">{action}</div> : null}
    </article>
  );
}
