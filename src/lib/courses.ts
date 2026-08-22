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

/** No course stills — trophy poster is intro/recap only, not wallpaper. */
export const COURSE_STILL: Record<CourseId, string | undefined> = {
  south: undefined,
  copperhead: undefined,
  island: undefined,
};

/** Scorecard tee colors we surface. Hole-by-hole yards are confirmed for Black only. */
export const TEE_ORDER = ["black"] as const;
export type TeeColor = (typeof TEE_ORDER)[number];

export const TEE_LABEL: Record<TeeColor, string> = {
  black: "Black",
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
    /** Course totals from published scorecards (not hole-by-hole except Black). */
    teeTotals: Partial<Record<"black" | "green" | "white", number>>;
    format: string;
    formatTip: string;
    firstTee: string;
    roundSlug: string;
    frontNine: string;
    backNine: string;
    points: number;
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
    teeTotals: { black: 6620, green: 6340, white: 5900 },
    format: "Scramble + Modified Alt Shot",
    formatTip: "Scramble first nine mindset · pick the smart miss, not hero ball. Alt shot: talk every club.",
    firstTee: "12:19 PM",
    roundSlug: "friday",
    frontNine: "Scramble",
    backNine: "Alt shot",
    points: 8,
  },
  copperhead: {
    character: "Championship · Saturday",
    dayLabel: "Saturday",
    description:
      "Pine-lined corridors, elevation changes and the closing Snake Pit define Innisbrook's signature course.",
    officialUrl: "https://www.innisbrookgolfresort.com/golf/courses/copperhead-course",
    scorecardUrl: "https://www.innisbrookgolfresort.com/pdf/copperheadscorecard_remediated.pdf",
    blackTotal: 7209,
    teeTotals: { black: 7209 },
    format: "Modified Stableford Match",
    formatTip: "Stableford rewards aggression on birdie holes — protect the big numbers on Snake Pit.",
    firstTee: "9:54 AM",
    roundSlug: "saturday",
    frontNine: "Out",
    backNine: "In",
    points: 6,
  },
  island: {
    character: "Water & elevation · Sunday",
    dayLabel: "Sunday",
    description:
      "Tight fairways, water, bunkering and uncommon Florida elevation make Island a demanding finale.",
    officialUrl: "https://www.innisbrookgolfresort.com/golf/courses/island-course",
    scorecardUrl: "https://www.innisbrookgolfresort.com/pdf/islandscorecard_remediated.pdf",
    blackTotal: 7194,
    teeTotals: { black: 7194 },
    format: "Shamble + Singles",
    formatTip: "Shamble: get one in play. Singles: play your game — points are on the board all day.",
    firstTee: "9:54 AM",
    roundSlug: "sunday",
    frontNine: "Out",
    backNine: "In",
    points: 12,
  },
};

const TEE_PREF_KEY = "tc-scout-tee-v1";

export function getStoredTee(_courseId: CourseId): TeeColor {
  // Only Black has verified hole-by-hole yards today.
  return "black";
}

export function setStoredTee(_courseId: CourseId, _tee: TeeColor) {
  try {
    window.localStorage.setItem(TEE_PREF_KEY, "black");
  } catch {
    /* ignore */
  }
}

/** Hole yardage for the selected tee. Black uses official scorecard yards in hole data. */
export function holeYardsForTee(hole: Hole, _tee: TeeColor = "black"): number {
  return hole.yards;
}

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

export function formatTeeYardChip(
  yards: number | null | undefined,
  tee: TeeColor = "black",
): string {
  if (yards == null || !Number.isFinite(yards) || yards <= 0) return `${TEE_LABEL[tee]} · —`;
  return `${TEE_LABEL[tee]} · ${Math.round(yards)}`;
}

/** Course id → calendar round slug used by round_plans. */
export function roundSlugForCourse(courseId: CourseId): string {
  return COURSE_DETAILS[courseId].roundSlug;
}

export function courseIdForRoundSlug(slug: string): CourseId | null {
  for (const id of COURSE_ORDER) {
    if (COURSE_DETAILS[id].roundSlug === slug) return id;
  }
  return null;
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
