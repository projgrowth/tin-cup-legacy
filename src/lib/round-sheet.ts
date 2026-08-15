import type { HoleNoteDraft } from "@/hooks/useJournal";
import { COURSE_LABEL, formatScorecardYards, getCourse, type CourseId } from "@/lib/courses";

export type PlanLine = {
  hole: number;
  par: number;
  yards: number;
  name: string | null;
  draft: HoleNoteDraft | null;
};

export function buildPlanLines(
  courseId: CourseId,
  noteFor: (hole: number) => HoleNoteDraft | null,
): PlanLine[] {
  return getCourse(courseId).holes.map((h) => ({
    hole: h.h,
    par: h.par,
    yards: h.yards,
    name: h.name,
    draft: noteFor(h.h),
  }));
}

export function countPlanned(lines: PlanLine[]): number {
  return lines.filter((l) => hasPlanContent(l.draft)).length;
}

export function tallyLines(lines: PlanLine[]) {
  return {
    par: lines.reduce((sum, l) => sum + l.par, 0),
    yards: lines.reduce((sum, l) => sum + l.yards, 0),
    planned: countPlanned(lines),
  };
}

/** Front / back nine split for a scorecard-style planner. */
export function nineSplit(lines: PlanLine[]) {
  const front = lines.filter((l) => l.hole <= 9);
  const back = lines.filter((l) => l.hole > 9);
  return {
    front,
    back,
    out: tallyLines(front),
    inn: tallyLines(back),
    all: tallyLines(lines),
  };
}

export function hasPlanContent(draft: HoleNoteDraft | null | undefined): boolean {
  if (!draft) return false;
  return Boolean(
    draft.tee_club ||
    draft.target_line ||
    draft.green_note ||
    draft.target_score != null ||
    draft.notes,
  );
}

export function formatRoundSheetText(courseId: CourseId, lines: PlanLine[]): string {
  const label = COURSE_LABEL[courseId];
  const planned = countPlanned(lines);
  const header = `Tin Cup 2026 · ${label} game plan (${planned}/${lines.length})`;
  const body = lines
    .map((l) => {
      const d = l.draft;
      if (!hasPlanContent(d)) {
        return `H${l.hole}  Par ${l.par}  ${formatScorecardYards(l.yards)}  —`;
      }
      const bits = [
        d?.tee_club,
        d?.target_line,
        d?.green_note,
        d?.target_score != null ? `target ${d.target_score}` : null,
        d?.notes,
      ].filter(Boolean);
      return `H${l.hole}  Par ${l.par}  ${formatScorecardYards(l.yards)}  ${bits.join(" · ")}`;
    })
    .join("\n");
  return `${header}\n${body}\n\ntincupinv.com/scout?course=${courseId}`;
}

export async function shareRoundSheet(
  courseId: CourseId,
  lines: PlanLine[],
): Promise<"shared" | "copied" | "failed"> {
  const text = formatRoundSheetText(courseId, lines);
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({
        title: `Tin Cup · ${COURSE_LABEL[courseId]} plan`,
        text,
      });
      return "shared";
    }
  } catch (err) {
    // User cancel is not failure
    if (err instanceof DOMException && err.name === "AbortError") return "failed";
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

export function printRoundSheet(courseId: CourseId, lines: PlanLine[]) {
  const text = formatRoundSheetText(courseId, lines);
  const w = window.open("", "_blank", "noopener,noreferrer,width=480,height=720");
  if (!w) return false;
  const title = `Tin Cup · ${COURSE_LABEL[courseId]} game plan`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:24px;color:#111;line-height:1.45}
  h1{font-size:18px;margin:0 0 12px}
  pre{white-space:pre-wrap;font-size:13px;margin:0}
  @media print{body{padding:12px}}
</style></head><body><h1>${title}</h1><pre>${text.replace(/</g, "&lt;")}</pre>
<script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
  return true;
}
