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

/** Three short format cards — one sentence, tee, points; expand for full copy. */
export function FormatCards() {
  return (
    <div className="surface divide-y divide-border overflow-hidden">
      {COURSE_ORDER.map((id) => {
        const d = COURSE_DETAILS[id];
        return (
          <details key={id} className="group">
            <summary className="press cursor-pointer list-none px-4 py-[var(--space-3)] [&::-webkit-details-marker]:hidden">
              <p className="t-title text-foreground">
                {d.dayLabel} · {d.format}
              </p>
              <p className="t-body mt-1 text-foreground/90">{d.formatTip}</p>
              <p className="t-micro mt-1">
                {d.firstTee} · {d.points} pts
              </p>
            </summary>
            <p className="t-body px-4 pb-[var(--space-3)] text-muted-foreground">
              {COURSE_LABEL[id]} · {d.description}
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

export function MoneySplit() {
  return (
    <div className="surface divide-y divide-border overflow-hidden">
      {FEE_BREAKDOWN.map((row) => (
        <article key={row.label} className="px-4 py-[var(--space-3)]">
          <p className="t-micro">{row.label}</p>
          <p className="t-title mt-1 tabular-nums text-foreground">{row.value}</p>
          <p className="t-micro mt-1.5">{row.note}</p>
        </article>
      ))}
    </div>
  );
}
