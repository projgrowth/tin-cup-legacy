import type { ReactNode } from "react";

import { COURSE_DETAILS, COURSE_LABEL, COURSE_ORDER, type CourseId } from "@/lib/courses";
import { FEE_BREAKDOWN } from "@/lib/tin-cup";

/** Editorial day / dinner tile — not a bullet list. */
export function DayStory({
  kicker,
  title,
  meta,
  body,
  children,
}: {
  kicker?: string;
  title: string;
  meta?: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <article className="hairline pt-3 first:border-t-0 first:pt-0">
      {kicker ? <p className="t-micro">{kicker}</p> : null}
      <h3 className={`t-body font-semibold text-foreground ${kicker ? "mt-1" : ""}`}>{title}</h3>
      {meta ? <p className="t-micro mt-1">{meta}</p> : null}
      {body ? <p className="t-body mt-2 text-muted-foreground">{body}</p> : null}
      {children}
    </article>
  );
}

export function CourseDayStory({
  courseId,
  extraMeta,
  action,
}: {
  courseId: CourseId;
  extraMeta?: string | null;
  action?: ReactNode;
}) {
  const details = COURSE_DETAILS[courseId];
  return (
    <DayStory
      kicker={`${details.dayLabel} · ${COURSE_LABEL[courseId]}`}
      title={details.format}
      meta={[details.firstTee, `${details.points} pts`, extraMeta].filter(Boolean).join(" · ")}
      body={details.formatTip}
    >
      {action ? <div className="mt-1">{action}</div> : null}
    </DayStory>
  );
}

/** Editorial program notes — day, format, one sentence, quiet tee·pts. */
export function FormatCards() {
  return (
    <div className="grid gap-[var(--space-6)]">
      {COURSE_ORDER.map((id) => {
        const d = COURSE_DETAILS[id];
        return (
          <details key={id} className="group">
            <summary className="press cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <p className="t-micro">{d.dayLabel}</p>
              <p className="t-title mt-1 text-foreground">{d.format}</p>
              <p className="t-body mt-[var(--space-3)] text-muted-foreground">{d.formatTip}</p>
              <p className="t-micro mt-[var(--space-3)]">
                {d.firstTee} · {d.points} pts
              </p>
            </summary>
            <p className="t-body mt-[var(--space-3)] text-muted-foreground">
              {COURSE_LABEL[id]}. {d.description}
            </p>
          </details>
        );
      })}
    </div>
  );
}

export function WeekendDayStories({
  skip,
  actionFor,
}: {
  skip?: CourseId;
  actionFor?: (id: CourseId) => ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      {COURSE_ORDER.filter((id) => id !== skip).map((id) => (
        <CourseDayStory key={id} courseId={id} action={actionFor?.(id)} />
      ))}
    </div>
  );
}

export function MoneySplit({ bare = false }: { bare?: boolean }) {
  return (
    <div className="space-y-[var(--space-2)]">
      {FEE_BREAKDOWN.map((row) => (
        <p key={row.label} className="flex items-baseline justify-between gap-4">
          <span className="t-title tabular-nums text-foreground">{row.value}</span>
          <span className="t-micro">{bare ? row.label : [row.label, row.note].filter(Boolean).join(" · ")}</span>
        </p>
      ))}
    </div>
  );
}
