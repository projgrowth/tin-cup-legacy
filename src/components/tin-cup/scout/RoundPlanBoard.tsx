import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Map as MapIcon } from "lucide-react";

import { PageMasthead } from "@/components/tin-cup/PageMasthead";
import { HolePlanFields } from "@/components/tin-cup/scout/HolePlanFields";
import { StatusLED } from "@/components/tin-cup/scout/DistanceStack";
import type { useHolePlanEditor } from "@/hooks/useHolePlanEditor";
import {
  COURSE_DETAILS,
  COURSE_LABEL,
  SNAKE_PIT,
  coursePar,
  formatScorecardYards,
  type CourseId,
  type Hole,
} from "@/lib/courses";
import { countPlanned, hasPlanContent, nineSplit, type PlanLine } from "@/lib/round-sheet";

function planSummary(draft: PlanLine["draft"]): string {
  if (!hasPlanContent(draft)) return "";
  return [draft?.tee_club, draft?.green_note, draft?.notes || draft?.target_line]
    .filter(Boolean)
    .join(" · ");
}

function NineRule({
  label,
  par,
  yards,
}: {
  label: string;
  par: number;
  yards: number;
  planned?: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2">
      <p className="t-micro font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
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
  selected,
  contests,
  editor,
  mode,
  loading,
  onSelect,
}: {
  line: PlanLine;
  holeMeta: Hole;
  courseId: CourseId;
  selected: boolean;
  contests: Array<"ctp" | "ld">;
  editor: ReturnType<typeof useHolePlanEditor>;
  mode: "cloud" | "guest";
  loading: boolean;
  onSelect: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const snake = courseId === "copperhead" && SNAKE_PIT.includes(line.hole);
  const planned = hasPlanContent(line.draft);

  useEffect(() => {
    if (!selected) return;
    const id = window.setTimeout(() => {
      rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 40);
    return () => window.clearTimeout(id);
  }, [selected]);

  return (
    <div ref={rowRef} className={`border-t border-border ${selected ? "bg-hunter/[0.04]" : ""}`}>
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onSelect}
          aria-expanded={selected}
          aria-label={`Hole ${line.hole}, par ${line.par}, ${line.yards} yards${planned ? `, ${planSummary(line.draft)}` : ""}`}
          className="press flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
        >
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
              selected
                ? "bg-hunter text-primary-foreground"
                : snake
                  ? "ring-1 ring-copper text-copper"
                  : contests.length
                    ? "bg-hunter/15 text-hunter"
                    : planned
                      ? "ring-1 ring-hunter/40 text-hunter"
                      : "ring-1 ring-border text-foreground"
            }`}
          >
            {line.hole}
          </span>
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
                {selected && editor.filled
                  ? editor.summary || planSummary(line.draft)
                  : planSummary(line.draft)}
              </span>
            ) : null}
          </span>
        </button>
        <Link
          to="/scout"
          search={{ course: courseId, hole: line.hole, map: true }}
          replace
          aria-label={`Open hole ${line.hole} map`}
          className="press flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 text-muted-foreground"
        >
          <MapIcon className="size-4" />
          <span className="t-micro">Map</span>
        </Link>
      </div>

      {selected && (
        <div className="space-y-3 px-4 pb-4">
          <div className="flex items-center justify-between">
            {holeMeta.name || snake ? (
              <p className="t-micro">{holeMeta.name ?? "Snake Pit"}</p>
            ) : (
              <span />
            )}
            <StatusLED state={editor.led} />
          </div>
          <HolePlanFields par={line.par} mode={mode} loading={loading} editor={editor} />
        </div>
      )}
    </div>
  );
}

/**
 * Default Plan surface — an 18-hole scorecard you fill like a yardage book.
 * Hole theater is one tap away on each row.
 */
export function RoundPlanBoard({
  courseId,
  hole: _hole,
  holes,
  lines,
  mode,
  loading,
  editor,
  contestByHole,
  onSelectHole: _onSelectHole,
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
  hole: number;
  holes: Hole[];
  lines: PlanLine[];
  mode: "cloud" | "guest";
  loading: boolean;
  editor: ReturnType<typeof useHolePlanEditor>;
  contestByHole: Map<number, Array<"ctp" | "ld">>;
  onSelectHole: (h: number) => void;
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
  const planned = countPlanned(lines);
  const split = nineSplit(lines);
  const holeByN = new Map(holes.map((h) => [h.h, h]));
  const [openHole, setOpenHole] = useState<number | null>(null);
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
              {` · ${planned}/18 planned`}
              {pairingLine ? <span className="mt-1 block text-foreground">{pairingLine}</span> : null}
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
      <p className="t-body px-1 text-foreground/80">{details.formatTip}</p>

      <section className="surface overflow-hidden" aria-label="18-hole game plan">
        <div className="flex items-center gap-3 border-b border-border px-4 py-2">
          <div className="h-1.5 min-w-0 flex-1 rounded-full bg-[var(--track)]">
            <div
              className="h-1.5 rounded-full bg-hunter"
              style={{ width: `${Math.min(100, (planned / 18) * 100)}%` }}
            />
          </div>
          <p className="t-micro shrink-0 tabular-nums">{planned}/18</p>
        </div>
        <NineRule
          label={details.frontNine}
          par={split.out.par}
          yards={split.out.yards}
        />
        {frontLines.map((line) => (
          <HoleRow
            key={line.hole}
            line={line}
            holeMeta={holeByN.get(line.hole) ?? holes[0]!}
            courseId={courseId}
            selected={openHole === line.hole}
            contests={contestByHole.get(line.hole) ?? []}
            editor={editor}
            mode={mode}
            loading={loading}
            onSelect={() => setOpenHole((h) => (h === line.hole ? null : line.hole))}
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
            selected={openHole === line.hole}
            contests={contestByHole.get(line.hole) ?? []}
            editor={editor}
            mode={mode}
            loading={loading}
            onSelect={() => setOpenHole((h) => (h === line.hole ? null : line.hole))}
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
                selected={openHole === line.hole}
                contests={contestByHole.get(line.hole) ?? []}
                editor={editor}
                mode={mode}
                loading={loading}
                onSelect={() => setOpenHole((h) => (h === line.hole ? null : line.hole))}
              />
            ))}
          </>
        ) : null}
        <div className="flex items-baseline justify-between border-t border-border px-4 py-3">
          <p className="text-sm font-bold text-foreground">Par {coursePar(courseId)}</p>
          <p className="t-micro tabular-nums">{split.all.yards.toLocaleString()} yds Black</p>
        </div>
      </section>

      <details className="group">
        <summary className="press cursor-pointer list-none px-1 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          Day notes
        </summary>
        <div className="space-y-2 px-1 pb-3">
          {!signedIn ? (
            <p className="t-micro">On this device until you sign in.</p>
          ) : (
            <>
              <textarea
                value={dayDraft}
                onChange={(e) => onDayDraft(e.target.value)}
                rows={3}
                maxLength={800}
                className="control w-full resize-none text-base"
                placeholder="Pairing thoughts, attack holes…"
              />
              <button
                type="button"
                disabled={!canSaveDay || savingDay}
                onClick={onSaveDay}
                className="press btn-quiet t-body min-h-11 text-sm disabled:opacity-40"
              >
                {savingDay ? "Saving…" : "Save day plan"}
              </button>
            </>
          )}
        </div>
      </details>
    </div>
  );
}
