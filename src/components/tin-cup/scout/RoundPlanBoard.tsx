import { Link } from "@tanstack/react-router";

import {
  COURSE_DETAILS,
  COURSE_LABEL,
  SNAKE_PIT,
  coursePar,
  formatScorecardYards,
  type CourseId,
  type Hole,
} from "@/lib/courses";
import { nineSplit, type PlanLine } from "@/lib/round-sheet";

function NineRule({
  label,
  par,
  yards,
}: {
  label: string;
  par: number;
  yards: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-0 py-2">
      <p className="t-eyebrow">{label}</p>
      <p className="t-micro tabular-nums">
        Par {par}
        <span className="mx-1.5 text-muted-foreground">·</span>
        {yards.toLocaleString()} yds
      </p>
    </div>
  );
}

function ScoreRow({
  lines,
  courseId,
  onStageHole,
  contestByHole,
}: {
  lines: PlanLine[];
  courseId: CourseId;
  onStageHole?: number;
  contestByHole: Map<number, Array<"ctp" | "ld">>;
}) {
  return (
    <div className="grid grid-cols-9 gap-px">
      {lines.map((line) => {
        const snake = courseId === "copperhead" && SNAKE_PIT.includes(line.hole);
        const contests = contestByHole.get(line.hole) ?? [];
        const on = onStageHole != null && line.hole === onStageHole;
        void contests;
        return (
          <Link
            key={line.hole}
            to="/scout"
            search={{ course: courseId, hole: line.hole, map: true }}
            replace
            aria-label={`Open hole ${line.hole} map`}
            aria-current={on ? "true" : undefined}
            className="press flex min-h-11 flex-col items-center justify-center px-0.5 py-1.5 text-center"
          >
            <span
              className={`t-title font-semibold tabular-nums ${on ? "text-hunter" : snake ? "text-copper" : "text-foreground"}`}
            >
              {line.hole}
            </span>
            <span className="t-micro tabular-nums text-muted-foreground">{line.par}</span>
            <span className="t-micro tabular-nums">
              {formatScorecardYards(line.yards)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Default Plan surface — an 18-hole scorecard. Tap a hole for theater.
 * Club / miss / line live in the hole dock, not on this page.
 */
export function RoundPlanBoard({
  courseId,
  hole,
  holes,
  lines,
  contestByHole,
  dayDraft,
  onDayDraft,
  onSaveDay,
  canSaveDay,
  savingDay,
  signedIn,
  pairingLine = null,
  hero = false,
}: {
  courseId: CourseId;
  hole?: number;
  holes: Hole[];
  lines: PlanLine[];
  contestByHole: Map<number, Array<"ctp" | "ld">>;
  dayDraft: string;
  onDayDraft: (v: string) => void;
  onSaveDay: () => void;
  canSaveDay: boolean;
  savingDay: boolean;
  signedIn: boolean;
  pairingLine?: string | null;
  hero?: boolean;
}) {
  const details = COURSE_DETAILS[courseId];
  const split = nineSplit(lines);
  void holes;

  const nine = (rows: PlanLine[]) => (
    <ScoreRow
      lines={rows}
      courseId={courseId}
      onStageHole={hole}
      contestByHole={contestByHole}
    />
  );

  const frontBlock = (
    <div className="px-[var(--space-4)] pb-[var(--space-3)]">
      <NineRule label={details.frontNine} par={split.out.par} yards={split.out.yards} />
      {nine(split.front)}
    </div>
  );
  const backBlock = (
    <div className="px-[var(--space-4)] pb-[var(--space-4)]">
      <NineRule label={details.backNine} par={split.inn.par} yards={split.inn.yards} />
      {nine(split.back)}
      {courseId === "copperhead" ? (
        <p className="t-micro mt-2 text-copper">Snake Pit · 16–18</p>
      ) : null}
    </div>
  );

  return (
    <div className={hero ? "stack-tight pb-[calc(var(--nav-height)+0.75rem)]" : "stack-tight"}>
      {hero ? (
        <header className="px-0.5">
          <h1 className="t-title text-foreground">{COURSE_LABEL[courseId]}</h1>
          <p className="t-micro mt-[var(--space-3)]">
            Par {coursePar(courseId)} · {details.blackTotal.toLocaleString()} yds
            <span className="mx-1.5 text-muted-foreground">·</span>
            {details.format}
          </p>
          {pairingLine ? <p className="t-body mt-[var(--space-3)]">{pairingLine}</p> : null}
        </header>
      ) : (
        <header className="px-0.5">
          <h1 className="t-title text-foreground">{COURSE_LABEL[courseId]}</h1>
          <p className="t-micro mt-1.5">
            Par {coursePar(courseId)} · {details.blackTotal.toLocaleString()} yds
            <span className="mx-1.5 text-muted-foreground">·</span>
            {details.format}
          </p>
          {pairingLine ? <p className="t-micro mt-1.5 text-foreground">{pairingLine}</p> : null}
        </header>
      )}

      <section className="surface overflow-hidden" aria-label="18-hole game plan">
        {hero ? (
          <div className="md:grid md:grid-cols-2 md:items-start">
            {frontBlock}
            <div className="md:border-l md:border-border">{backBlock}</div>
          </div>
        ) : (
          <>
            {frontBlock}
            {backBlock}
          </>
        )}
        <div className="flex items-baseline justify-between border-t border-border px-4 py-3">
          <p className="text-sm font-bold text-foreground">Par {coursePar(courseId)}</p>
          <p className="t-micro tabular-nums">{split.all.yards.toLocaleString()} yds Black</p>
        </div>
      </section>

      {signedIn ? (
        <details className="px-1 pb-1">
          <summary className="t-micro cursor-pointer py-2 font-semibold text-muted-foreground">
            Day plan
          </summary>
          <div className="space-y-2 pt-1">
            <textarea
              value={dayDraft}
              onChange={(e) => onDayDraft(e.target.value)}
              rows={3}
              maxLength={800}
              className="control w-full resize-none text-base"
              placeholder="Pairing thoughts, attack holes…"
              aria-label="Day notes"
            />
            <button
              type="button"
              disabled={!canSaveDay || savingDay}
              onClick={onSaveDay}
              className="press btn-quiet t-micro min-h-11 px-3 font-semibold disabled:opacity-40"
            >
              {savingDay ? "Saving…" : "Save day plan"}
            </button>
          </div>
        </details>
      ) : null}
    </div>
  );
}
