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
import { hasPlanContent, nineSplit, type PlanLine } from "@/lib/round-sheet";

function NineRule({ label, par, yards }: { label: string; par: number; yards: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2">
      <p className="t-eyebrow">{label}</p>
      <p className="t-micro tabular-nums">
        Par {par}
        <span className="mx-1.5 text-muted-foreground">·</span>
        {yards.toLocaleString()} yds
      </p>
    </div>
  );
}

function HoleRow({
  line,
  holeMeta,
  courseId,
  contests,
}: {
  line: PlanLine;
  holeMeta: Hole;
  courseId: CourseId;
  contests: Array<"ctp" | "ld">;
}) {
  const snake = courseId === "copperhead" && SNAKE_PIT.includes(line.hole);
  const planned = hasPlanContent(line.draft);
  const holeMark = `flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
    snake
      ? "ring-1 ring-copper text-copper"
      : contests.length
        ? "bg-hunter/15 text-hunter"
        : planned
          ? "ring-1 ring-hunter/40 text-hunter"
          : "ring-1 ring-foreground/30 bg-card text-foreground"
  }`;

  return (
    <div className="border-t border-border">
      <Link
        to="/scout"
        search={{ course: courseId, hole: line.hole, map: true }}
        replace
        aria-label={`Open hole ${line.hole} map`}
        className="press flex items-center gap-3 px-4 py-3"
      >
        <span className={holeMark}>{line.hole}</span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-bold tabular-nums text-foreground">Par {line.par}</span>
            <span className="t-micro tabular-nums">{formatScorecardYards(line.yards)}</span>
            {holeMeta.name ? (
              <span className="t-micro truncate text-muted-foreground">{holeMeta.name}</span>
            ) : null}
            {snake ? <span className="t-micro font-semibold text-copper">Pit</span> : null}
            {contests.map((c) => (
              <span
                key={c}
                className="rounded-full bg-hunter/15 px-1.5 py-0.5 text-[0.65rem] font-semibold text-hunter"
              >
                {c === "ld" ? "LD" : "CTP"}
              </span>
            ))}
          </span>
          {planned ? (
            <span className="mt-0.5 block truncate text-sm text-foreground/85">
              {[
                line.draft?.tee_club,
                line.draft?.green_note,
                line.draft?.notes || line.draft?.target_line,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          ) : null}
        </span>
      </Link>
    </div>
  );
}

/**
 * Default Plan surface — an 18-hole scorecard. Tap a hole for theater.
 * Club / miss / line live in the hole dock, not on this page.
 */
export function RoundPlanBoard({
  courseId,
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

  return (
    <div className={hero ? "space-y-3 pb-[calc(var(--nav-height)+0.75rem)]" : "space-y-3"}>
      {hero ? (
        <PageMasthead
          title={COURSE_LABEL[courseId]}
          meta={
            <>
              {details.dayLabel} · {details.firstTee} · {details.format}
              {pairingLine ? (
                <span className="mt-1 block text-foreground">{pairingLine}</span>
              ) : null}
            </>
          }
        />
      ) : (
        <header className="px-0.5">
          <h1 className="t-display text-foreground">{COURSE_LABEL[courseId]}</h1>
          {pairingLine ? <p className="t-micro mt-1.5 text-foreground">{pairingLine}</p> : null}
          <p className="t-micro mt-1.5">
            {details.dayLabel} · {details.format}
          </p>
        </header>
      )}
      <p className="t-micro px-1">{details.formatTip}</p>

      <section className="surface overflow-hidden" aria-label="18-hole game plan">
        <NineRule label={details.frontNine} par={split.out.par} yards={split.out.yards} />
        {frontLines.map((line) => (
          <HoleRow
            key={line.hole}
            line={line}
            holeMeta={holeByN.get(line.hole) ?? holes[0]!}
            courseId={courseId}
            contests={contestByHole.get(line.hole) ?? []}
          />
        ))}
        <NineRule
          label={details.backNine}
          par={backStats.par || split.inn.par}
          yards={backStats.yards || split.inn.yards}
        />
        {backLines.map((line) => (
          <HoleRow
            key={line.hole}
            line={line}
            holeMeta={holeByN.get(line.hole) ?? holes[0]!}
            courseId={courseId}
            contests={contestByHole.get(line.hole) ?? []}
          />
        ))}
        {pitLines.length > 0 ? (
          <>
            <NineRule label="Snake Pit" par={pitStats.par} yards={pitStats.yards} />
            {pitLines.map((line) => (
              <HoleRow
                key={line.hole}
                line={line}
                holeMeta={holeByN.get(line.hole) ?? holes[0]!}
                courseId={courseId}
                contests={contestByHole.get(line.hole) ?? []}
              />
            ))}
          </>
        ) : null}
        <div className="flex items-baseline justify-between border-t border-border px-4 py-3">
          <p className="text-sm font-bold text-foreground">Par {coursePar(courseId)}</p>
          <p className="t-micro tabular-nums">{split.all.yards.toLocaleString()} yds Black</p>
        </div>
      </section>

      {signedIn && dayDraft.trim() ? (
        <details className="group" open>
          <summary className="press cursor-pointer list-none px-1 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            Day notes
          </summary>
          <div className="space-y-2 px-1 pb-3">
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
        </details>
      ) : signedIn ? (
        <details className="group">
          <summary className="press cursor-pointer list-none px-1 py-3 t-micro text-muted-foreground [&::-webkit-details-marker]:hidden">
            Add day notes
          </summary>
          <div className="space-y-2 px-1 pb-3">
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
        </details>
      ) : null}
    </div>
  );
}
