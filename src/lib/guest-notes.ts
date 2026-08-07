import type { HoleNoteDraft } from "@/hooks/useJournal";
import type { CourseId } from "@/lib/courses";
import { COURSE_ORDER } from "@/lib/courses";

const STORAGE_KEY = "tc-guest-hole-notes-v1";

export type GuestNoteMap = Partial<Record<CourseId, Partial<Record<number, HoleNoteDraft>>>>;

function readAll(): GuestNoteMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as GuestNoteMap;
  } catch {
    return {};
  }
}

function writeAll(map: GuestNoteMap) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* private mode / quota */
  }
}

export function getGuestNote(courseId: CourseId, hole: number): HoleNoteDraft | null {
  return readAll()[courseId]?.[hole] ?? null;
}

export function setGuestNote(courseId: CourseId, hole: number, draft: HoleNoteDraft) {
  const all = readAll();
  const course = { ...(all[courseId] ?? {}) };
  const empty =
    !draft.tee_club &&
    !draft.target_line &&
    !draft.green_note &&
    draft.target_score == null &&
    !draft.notes;
  if (empty) {
    delete course[hole];
  } else {
    course[hole] = draft;
  }
  all[courseId] = course;
  writeAll(all);
}

export function guestNoteHoles(courseId: CourseId): number[] {
  const course = readAll()[courseId] ?? {};
  return Object.keys(course)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

export function countGuestNotes(): number {
  let n = 0;
  const all = readAll();
  for (const course of COURSE_ORDER) {
    n += Object.keys(all[course] ?? {}).length;
  }
  return n;
}

export function listGuestNotes(): Array<{ courseId: CourseId; hole: number; draft: HoleNoteDraft }> {
  const out: Array<{ courseId: CourseId; hole: number; draft: HoleNoteDraft }> = [];
  const all = readAll();
  for (const courseId of COURSE_ORDER) {
    const holes = all[courseId] ?? {};
    for (const [holeKey, draft] of Object.entries(holes)) {
      if (draft) out.push({ courseId, hole: Number(holeKey), draft });
    }
  }
  return out;
}

export function clearGuestNotes(courseId?: CourseId) {
  if (!courseId) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  const all = readAll();
  delete all[courseId];
  writeAll(all);
}
