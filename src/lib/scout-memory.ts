import { clampHole, isCourseId, type CourseId } from "@/lib/courses";

export const LAST_HOLE_KEY = "tc-last-hole-v1";

export type RememberedHole = { course: CourseId; hole: number };

export function parseRememberedHole(raw: string | null): RememberedHole | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { course?: unknown; hole?: unknown };
    if (!isCourseId(data.course)) return null;
    const hole = typeof data.hole === "number" ? data.hole : Number(data.hole);
    if (!Number.isFinite(hole)) return null;
    return { course: data.course, hole: clampHole(hole) };
  } catch {
    return null;
  }
}

export function readLastHole(): RememberedHole | null {
  if (typeof window === "undefined") return null;
  try {
    return parseRememberedHole(window.localStorage.getItem(LAST_HOLE_KEY));
  } catch {
    return null;
  }
}

export function writeLastHole(course: CourseId, hole: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LAST_HOLE_KEY,
      JSON.stringify({ course, hole: clampHole(hole) }),
    );
  } catch {
    /* private mode */
  }
}
