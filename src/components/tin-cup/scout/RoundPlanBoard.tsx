import { Link } from "@tanstack/react-router";

import { PageMasthead } from "@/components/tin-cup/PageMasthead";
import {
  COURSE_DETAILS,
  COURSE_LABEL,
  SNAKE_PIT,
  coursePar,
  formatScorecardYards,
  type CourseId,
  type Hole,
} from "@/lib/courses";
import { formatPlanPeek, hasPlanContent, nineSplit, type PlanLine } from "@/lib/round-sheet";

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

function HoleOrb({
  line,
  courseId,
  contests,
  onStage,
}: {
  line: PlanLine;
  holeMeta?: Hole;
  courseId: CourseId;
  contests: Array<"ctp" | "ld">;
  onStage?: boolean;
}) {
  const snake = courseId === "copperhead" && SNAKE_PIT.includes(line.hole);
  const planned = hasPlanContent(line.draft);
  const mark = `flex size-11 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
    onStage
      ? "bg-hunter text-primary-foreground"
      : snake
        ? "ring-1 ring-copper text-copper"
        : contests.length
          ? "ring-1 ring-hunter text-hunter"
          : planned
            ? "ring-1 ring-hunter/45 text-hunter"
            : "ring-1 ring-foreground/20 text-foreground"
  }`;
  const word = contests.includes("ctp") ? "CTP" : contests.includes("ld") ? "LD" : snake ? "Pit" : formatScorecardYards(line.yards);
  const peek = planned ? formatPlanPeek(line.draft) : null;

  return (
    <Link
      to="/scout"
      search={{ course: courseId, hole: line.hole, map: true }}
      replace
      aria-label={`Open hole ${line.hole} map`}
      aria-current={onStage ? "true" : undefined}
      className="press flex min-h-11 flex-col items-center px-1 py-2 text-center"
    >
      <span className={mark}>{line.hole}</span>
      <span className="t-micro mt-1.5 tabular-nums">{word}</span>
      {peek ? <span className="t-micro mt-0.5 line-clamp-1 w-full">{peek}</span> : null}
    </Link>
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
  const holeByN = new Map(holes.map((h) => [h.h, h]));
  const frontLines = split.front;
  const pit = courseId === "copperhead";
  const backLines = pit ? split.back.filter((line) => line.hole < 16) : split.back;
  const pitLines = pit ? split.back.filter((line) => line.hole >= 16) : [];
  const backStats = {
    par: backLines.reduce((sum, line) => sum + line.par, 0),
    yards: backLines.reduce((sum, line) => sum + line.yards, 0),
  };
  const pitStats = {
    par: pitLines.reduce((sum, line) => sum + line.par, 0),
    yards: pitLines.reduce((sum, line) => sum + line.yards, 0),
  };

  const renderHole = (line: PlanLine) => (
    <HoleOrb
      key={line.hole}
      line={line}
      holeMeta={holeByN.get(line.hole) ?? holes[0]!}
      courseId={courseId}
      contests={contestByHole.get(line.hole) ?? []}
      onStage={hole != null && line.hole === hole}
    />
  );

  const frontBlock = (
    <div className="px-[var(--space-4)] pb-[var(--space-4)]">
      <NineRule label={details.frontNine} par={split.out.par} yards={split.out.yards} />
      <div className="grid grid-cols-3 gap-x-1 gap-y-1">{frontLines.map(renderHole)}</div>
    </div>
  );
  const backBlock = (
    <div className="px-[var(--space-4)] pb-[var(--space-4)]">
      <NineRule
        label={details.backNine}
        par={backStats.par || split.inn.par}
        yards={backStats.yards || split.inn.yards}
      />
      <div className="grid grid-cols-3 gap-x-1 gap-y-1">{backLines.map(renderHole)}</div>
      {pitLines.length > 0 ? (
        <>
          <NineRule label="Snake Pit" par={pitStats.par} yards={pitStats.yards} />
          <div className="grid grid-cols-3 gap-x-1 gap-y-1">{pitLines.map(renderHole)}</div>
        </>
      ) : null}
    </div>
  );

  return (
    <div className={hero ? "stack-tight pb-[calc(var(--nav-height)+0.75rem)]" : "stack-tight"}>
      {hero ? (
        <header className="px-0.5">
          <h1 className="t-hero text-foreground">{COURSE_LABEL[courseId]}</h1>
          <p className="t-micro mt-[var(--space-3)]">
            Par {coursePar(courseId)} · {details.blackTotal.toLocaleString()} yds
          </p>
          <p className="t-micro mt-1">
            {details.dayLabel} · {details.firstTee} · {details.format}
          </p>
          {pairingLine ? <p className="t-body mt-[var(--space-3)]">{pairingLine}</p> : null}
        </header>
      ) : (
        <header className="px-0.5">
          <h1 className="t-title text-foreground">{COURSE_LABEL[courseId]}</h1>
          <p className="t-micro mt-1.5">
            Par {coursePar(courseId)} · {details.blackTotal.toLocaleString()} yds
          </p>
          {pairingLine ? <p className="t-micro mt-1.5 text-foreground">{pairingLine}</p> : null}
          <p className="t-micro mt-1.5">
            {details.dayLabel} · {details.format}
          </p>
        </header>
      )}
      <p className="t-micro px-1">{details.formatTip}</p>

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
        <div className="space-y-2 px-1 pb-1">
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
            className="press t-micro min-h-11 px-1 font-semibold text-hunter disabled:opacity-40"
          >
            {savingDay ? "Saving…" : "Save day plan"}
          </button>
        </div>
      ) : (
        <p className="t-micro px-1">
          <Link to="/profile" className="font-semibold text-foreground">
            Sign in to keep notes
          </Link>
        </p>
      )}
    </div>
  );
}
