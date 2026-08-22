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
    <article className="surface px-4 py-3.5">
      {kicker ? <p className="t-micro text-muted-foreground">{kicker}</p> : null}
      <h3 className={`t-body font-semibold text-foreground ${kicker ? "mt-1" : ""}`}>{title}</h3>
      {meta ? <p className="t-micro mt-1 font-medium text-foreground/80">{meta}</p> : null}
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
    <div className="grid grid-cols-2 gap-2.5">
      {FEE_BREAKDOWN.map((row) => (
        <article key={row.label} className="surface px-4 py-3.5">
          <p className="t-micro text-muted-foreground">{row.label}</p>
          <p className="t-title mt-1 tabular-nums text-foreground">{row.value}</p>
          <p className="t-micro mt-1.5 text-muted-foreground">{row.note}</p>
        </article>
      ))}
    </div>
  );
}
