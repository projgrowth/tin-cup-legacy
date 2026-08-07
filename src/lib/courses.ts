import data from "@/data/innisbrook-holes.json";
import { getEventPhase } from "@/lib/event-phase";

export type HoleFeatureKind = "tee" | "fw" | "gr" | "bk" | "wa";

export type HoleFeature = { k: HoleFeatureKind; p: [number, number][] };

export type Hole = {
  h: number;
  name: string | null;
  par: number;
  yards: number;
  w: number;
  ht: number;
  line: [number, number][];
  f: HoleFeature[];
};

export type Course = { id: string; name: string; holes: Hole[] };

const courses = data as unknown as Record<string, Course>;

/** Tournament rounds in play order, mapped to their OSM course data. */
export const COURSE_ORDER = ["south", "copperhead", "island"] as const;
export type CourseId = (typeof COURSE_ORDER)[number];

export const ROUND_COURSE: Record<string, CourseId> = {
  friday: "south",
  saturday: "copperhead",
  sunday: "island",
};

/** Calendar day (Eastern) → course for “today at Tin Cup”. */
export const DAY_COURSE: Record<string, CourseId> = {
  "2026-08-28": "south",
  "2026-08-29": "copperhead",
  "2026-08-30": "island",
};

export const COURSE_LABEL: Record<CourseId, string> = {
  south: "South",
  copperhead: "Copperhead",
  island: "Island",
};

export const COURSE_DETAILS: Record<
  CourseId,
  {
    description: string;
    officialUrl: string;
    scorecardUrl: string;
    character: string;
    dayLabel: string;
    blackTotal: number;
  }
> = {
  south: {
    character: "Links-inspired · Friday",
    dayLabel: "Friday",
    description:
      "Rolling terrain, abundant fairway bunkering, water and a Gulf breeze make South the opening-round test.",
    officialUrl: "https://www.innisbrookgolfresort.com/golf/courses/south-course",
    scorecardUrl: "https://www.innisbrookgolfresort.com/pdf/southscorecard_remediated.pdf",
    blackTotal: 6620,
  },
  copperhead: {
    character: "Championship · Saturday",
    dayLabel: "Saturday",
    description:
      "Pine-lined corridors, elevation changes and the closing Snake Pit define Innisbrook's signature course.",
    officialUrl: "https://www.innisbrookgolfresort.com/golf/courses/copperhead-course",
    scorecardUrl: "https://www.innisbrookgolfresort.com/pdf/copperheadscorecard_remediated.pdf",
    blackTotal: 7209,
  },
  island: {
    character: "Water & elevation · Sunday",
    dayLabel: "Sunday",
    description:
      "Tight fairways, water, bunkering and uncommon Florida elevation make Island a demanding finale.",
    officialUrl: "https://www.innisbrookgolfresort.com/golf/courses/island-course",
    scorecardUrl: "https://www.innisbrookgolfresort.com/pdf/islandscorecard_remediated.pdf",
    blackTotal: 7194,
  },
};

export function isCourseId(value: unknown): value is CourseId {
  return typeof value === "string" && (COURSE_ORDER as readonly string[]).includes(value);
}

export function getCourse(id: CourseId): Course {
  return courses[id];
}

export function getHole(id: CourseId, hole: number): Hole | undefined {
  return courses[id]?.holes.find((h) => h.h === hole);
}

export function coursePar(id: CourseId): number {
  return getCourse(id).holes.reduce((sum, h) => sum + h.par, 0);
}

/** Copperhead's closing stretch. */
export const SNAKE_PIT = [16, 17, 18];

/** Official scorecard Black (tips) yardage — not confirmed tournament tees. */
export function formatScorecardYards(yards: number | null | undefined): string {
  if (yards == null || !Number.isFinite(yards) || yards <= 0) return "—";
  return `${Math.round(yards)} yds`;
}

export function formatBlackYardChip(yards: number | null | undefined): string {
  if (yards == null || !Number.isFinite(yards) || yards <= 0) return "Black · —";
  return `Black · ${Math.round(yards)}`;
}

/** Eastern calendar date YYYY-MM-DD for tournament scheduling. */
export function easternDateKey(now: number = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}

/**
 * Best default course for Scout:
 * - On a tournament calendar day → that day's course
 * - Otherwise during live weekend → Island if past Sun start else Copperhead fallback via day map
 * - Pre-event → South (Friday opener)
 */
export function defaultCourseId(now: number = Date.now()): CourseId {
  const key = easternDateKey(now);
  if (DAY_COURSE[key]) return DAY_COURSE[key];
  const phase = getEventPhase(now);
  if (phase === "live") return "copperhead";
  if (phase === "after") return "island";
  return "south";
}

export function clampHole(hole: unknown, max = 18): number {
  const n = typeof hole === "number" ? hole : Number(hole);
  if (!Number.isFinite(n)) return 1;
  return Math.min(max, Math.max(1, Math.round(n)));
}
