import { useEffect, useRef, useState } from "react";
import { Map as MapIcon, Target } from "lucide-react";

import { PageMasthead } from "@/components/tin-cup/PageMasthead";
import { HolePlanFields } from "@/components/tin-cup/scout/HolePlanFields";
import { CourseDownloadButton } from "@/components/tin-cup/scout/CourseDownloadButton";
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
import { hasPlanContent, nineSplit, type PlanLine } from "@/lib/round-sheet";

function planSummary(draft: PlanLine["draft"]): string {
  if (!hasPlanContent(draft)) return "Add club · miss · line";
  return [draft?.tee_club, draft?.green_note, draft?.notes || draft?.target_line]
    .filter(Boolean)
    .join(" · ");
}

function NineRule({
  label,
  par,
  yards,
  planned,
}: {
  label: string;
  par: number;
  yards: number;
  planned: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 bg-white/[0.03] px-4 py-2">
      <p className="t-eyebrow text-muted-foreground">{label}</p>
      <p className="t-micro tabular-nums">
        Par {par}
        <span className="mx-1.5 text-white/20">·</span>
        {yards.toLocaleString()} yds
        <span className="mx-1.5 text-white/20">·</span>
        {planned}/9
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
  onOpenMap,
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
  onOpenMap: () => void;
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
    <div ref={rowRef} className={`border-t border-white/6 ${selected ? "bg-white/[0.035]" : ""}`}>
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
                ? "bg-gold/20 text-gold-light ring-1 ring-gold/40"
                : snake
                  ? "bg-white/5 text-copper"
                  : planned
                    ? "bg-white/8 text-white"
                    : "bg-white/5 text-white/60"
            }`}
          >
            {line.hole}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="text-sm font-bold tabular-nums text-foreground">Par {line.par}</span>
              <span className="t-micro tabular-nums">{formatScorecardYards(line.yards)}</span>
              {snake ? <span className="t-eyebrow text-copper">Pit</span> : null}
              {contests.map((c) => (
                <span
                  key={c}
                  className={`t-eyebrow ${c === "ld" ? "text-copper" : "text-gold-light"}`}
                >
                  {c === "ld" ? "LD" : "CTP"}
                </span>
              ))}
            </span>
            <span
              className={`mt-0.5 block truncate text-sm ${
                planned ? "text-foreground/85" : "text-muted-foreground"
              }`}
            >
              {selected && editor.filled
                ? editor.summary || planSummary(line.draft)
                : planSummary(line.draft)}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenMap}
          aria-label={`Open hole ${line.hole} map`}
          className="press flex w-12 shrink-0 items-center justify-center text-muted-foreground"
        >
          <MapIcon className="size-4" />
        </button>
      </div>

      {selected && (
        <div className="space-y-3 px-4 pb-4">
          <div className="flex items-center justify-between">
            <p className="t-micro">
              {holeMeta.name ?? `Hole ${line.hole}`}
              {snake ? " · Snake Pit" : ""}
            </p>
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
 * Satellite / Play lives one tap away on each row.
 */
export function RoundPlanBoard({
  courseId,
  hole,
  holes,
  lines,
  mode,
  loading,
  editor,
  contestByHole,
  onSelectHole,
  onOpenMap,
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
  onOpenMap: (h: number) => void;
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
  const contestCount = [...contestByHole.values()].reduce((n, list) => n + list.length, 0);
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const frontLines = incompleteOnly
    ? split.front.filter((line) => !hasPlanContent(line.draft))
    : split.front;
  const backLines = incompleteOnly
    ? split.back.filter((line) => !hasPlanContent(line.draft))
    : split.back;
  const nextIncomplete = lines.find((line) => !hasPlanContent(line.draft));

  return (
    <div className="space-y-3">
      {hero ? (
        <PageMasthead
          kicker={`${details.dayLabel} · first tee ${details.firstTee}`}
          title={`${COURSE_LABEL[courseId]} game plan`}
          meta={
            <>
              {details.format}
              <span className="mx-1.5 text-muted-foreground">·</span>
              Black {details.blackTotal.toLocaleString()}
              <span className="mx-1.5 text-muted-foreground">·</span>
              {split.all.planned}/18 planned
              {pairingLine ? <span className="mt-2 block text-foreground">{pairingLine}</span> : null}
            </>
          }
        >
          <p className="t-body mt-3 max-w-xl text-muted-foreground">{details.formatTip}</p>
          <div className="mt-4">
            <CourseDownloadButton courseId={courseId} />
          </div>
        </PageMasthead>
      ) : (
      <header className="px-0.5">
        <p className="t-eyebrow">
          {details.dayLabel} · first tee {details.firstTee}
        </p>
        <h1 className="t-title mt-1.5 text-foreground">{COURSE_LABEL[courseId]} game plan</h1>
        {pairingLine ? <p className="t-micro mt-1.5 text-foreground">{pairingLine}</p> : null}
        <p className="t-micro mt-1.5">
          {details.format}
          <span className="mx-1.5 text-white/20">·</span>
          Black {details.blackTotal.toLocaleString()}
          <span className="mx-1.5 text-white/20">·</span>
          {split.all.planned}/18 planned
        </p>
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">{details.formatTip}</p>
        <div className="mt-3">
          <CourseDownloadButton courseId={courseId} />
        </div>
      </header>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          aria-pressed={incompleteOnly}
          onClick={() => setIncompleteOnly((value) => !value)}
          className={`press chip min-h-11 ${incompleteOnly ? "chip-on" : ""}`}
        >
          {incompleteOnly ? "Showing incomplete" : "Incomplete holes"}
        </button>
        {nextIncomplete && (
          <button
            type="button"
            onClick={() => onSelectHole(nextIncomplete.hole)}
            className="press chip min-h-11 flex-1"
          >
            Continue · hole {nextIncomplete.hole}
          </button>
        )}
      </div>

      {contestCount > 0 && (
        <p className="flex items-center gap-1.5 px-0.5 t-micro">
          <Target className="size-3.5 text-gold-light" />
          CTP / long drive holes marked on the card
        </p>
      )}

      <section className="surface overflow-hidden" aria-label="18-hole game plan">
        <NineRule
          label="Out"
          par={split.out.par}
          yards={split.out.yards}
          planned={split.out.planned}
        />
        {frontLines.map((line) => (
          <HoleRow
            key={line.hole}
            line={line}
            holeMeta={holeByN.get(line.hole) ?? holes[0]!}
            courseId={courseId}
            selected={line.hole === hole}
            contests={contestByHole.get(line.hole) ?? []}
            editor={editor}
            mode={mode}
            loading={loading}
            onSelect={() => onSelectHole(line.hole)}
            onOpenMap={() => onOpenMap(line.hole)}
          />
        ))}
        <NineRule
          label="In"
          par={split.inn.par}
          yards={split.inn.yards}
          planned={split.inn.planned}
        />
        {backLines.map((line) => (
          <HoleRow
            key={line.hole}
            line={line}
            holeMeta={holeByN.get(line.hole) ?? holes[0]!}
            courseId={courseId}
            selected={line.hole === hole}
            contests={contestByHole.get(line.hole) ?? []}
            editor={editor}
            mode={mode}
            loading={loading}
            onSelect={() => onSelectHole(line.hole)}
            onOpenMap={() => onOpenMap(line.hole)}
          />
        ))}
        <div className="flex items-baseline justify-between border-t border-white/8 px-4 py-3">
          <p className="text-sm font-bold text-foreground">Par {coursePar(courseId)}</p>
          <p className="t-micro tabular-nums">
            {split.all.yards.toLocaleString()} yds Black
            <span className="mx-1.5 text-white/20">·</span>
            {split.all.planned}/18
          </p>
        </div>
      </section>

      <details className="surface group">
        <summary className="press cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          Day notes
          <span className="ml-2 font-normal text-muted-foreground">pairing · attack holes</span>
        </summary>
        <div className="space-y-2 border-t border-border/60 px-4 py-3">
          {!signedIn ? (
            <p className="text-sm text-muted-foreground">Sign in to save a day strategy.</p>
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
                className="press btn-gold w-full !min-h-11 text-sm font-semibold disabled:opacity-40"
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
