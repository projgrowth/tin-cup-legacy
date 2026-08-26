/** Static tournament content for the 4th Annual Tin Cup Invitational. */

/**
 * Venmo handle without @.
 * Override at deploy time with `VITE_VENMO_HANDLE` (see EVENT_OPS.md).
 */
export const VENMO_HANDLE =
  (typeof import.meta !== "undefined" &&
    typeof import.meta.env?.VITE_VENMO_HANDLE === "string" &&
    import.meta.env.VITE_VENMO_HANDLE.trim()) ||
  "Kmaher";

export const BUY_IN = 150;
export const TOURNAMENT_BANK = "Kevin Maher";

/**
 * Launch gates for side-cash display.
 * Buy-in / formats: Desktop deck `4th Annual Tin Cup Invitational 2026.pdf`.
 * Contest pots: Kevin (admin) 2026-08 — $100 CTP × 6, $100 LD × 2 (fairway required).
 * Day 1 (Friday / South): CTP 3 & 18, long drive 7. Other contest holes TBD.
 */
export const SIDE_BET_PAYOUTS_CONFIRMED = true;
export { contestHoleLabel, DAY1_CONTESTS } from "@/lib/contest-holes";

/** Confirmed 2026 field is 16 (8 v 8). Override only if the roster actually changes. */
export const EXPECTED_PLAYER_COUNT = Number(import.meta.env?.VITE_EXPECTED_PLAYER_COUNT ?? 16);

/** True when the handle is still the shipping placeholder. */
export const VENMO_IS_PLACEHOLDER =
  VENMO_HANDLE === "TinCup-Invitational" || VENMO_HANDLE.toLowerCase() === "placeholder";

export const venmoUrl = `https://venmo.com/${VENMO_HANDLE}?txn=pay&amount=${BUY_IN}&note=${encodeURIComponent(
  "Tin Cup Invitational 2026 Buy-In",
)}`;

/**
 * WhatsApp group for the field — paste a permanent invite from WhatsApp:
 * Group info → Invite to group via link → copy.
 * Set at deploy: VITE_WHATSAPP_GROUP_URL=https://chat.whatsapp.com/...
 * Leave empty to hide the button (no Business API needed).
 */
export const WHATSAPP_GROUP_URL = (
  (typeof import.meta !== "undefined" &&
    typeof import.meta.env?.VITE_WHATSAPP_GROUP_URL === "string" &&
    import.meta.env.VITE_WHATSAPP_GROUP_URL.trim()) ||
  ""
).replace(/\s+/g, "");

export const WHATSAPP_GROUP_CONFIGURED = /^https:\/\/chat\.whatsapp\.com\//i.test(
  WHATSAPP_GROUP_URL,
);

/** Share the live board into WhatsApp (or any app) as plain text + link. */
export function boardShareText(scoreLine?: string): string {
  const site =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://tincupinv.com";
  const score = scoreLine ? `\nCup: ${scoreLine}` : "";
  return `Tin Cup Invitational 2026${score}\nLive board: ${site}`;
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export const EVENT = {
  title: "4th Annual Tin Cup Invitational",
  subtitle: "Where the vibes are high and the divots are deep",
  location: "Innisbrook Golf Resort • Palm Harbor, FL",
  dates: "August 28–30, 2026",
  /** Friday 12:19 PM tee time, Eastern (UTC-4 in August). */
  firstTee: "2026-08-28T12:19:00-04:00",
  /** End of the final round, Sunday night Eastern. */
  endsAt: "2026-08-30T23:59:59-04:00",
  totalPoints: 26,
  pointsToWin: 13.5,
};

/** 13–13: each captain plus the player he picks, 2v2 scramble — not singles. */
export const PLAYOFF_RULE = "captain and his pick, 2v2 scramble";

export type BoardMode = "pre" | "live" | "post";

/** Which board the app should open on, based on the current date. */
export function defaultMode(now: number = Date.now()): BoardMode {
  if (now < new Date(EVENT.firstTee).getTime()) return "pre";
  if (now <= new Date(EVENT.endsAt).getTime()) return "live";
  return "post";
}

export const TEAM_STYLES: Record<string, { short: string; accent: string }> = {
  "strong-mental": { short: "Strong Mental", accent: "text-hunter" },
  "grass-roots": { short: "Grass Roots", accent: "text-stone" },
};

export const FEE_BREAKDOWN = [
  {
    label: "Team match stake",
    value: "$100",
    note: "Returned to each winner, plus $100 from the opposing side",
  },
  { label: "Side cash pool", value: "$50", note: "Funds six CTPs and two Long Drives" },
];

/** Social copy aligned to Desktop deck: `4th Annual Tin Cup Invitational 2026.pdf`. */
export const WEEKEND_SOCIAL = [
  {
    day: "Friday",
    title: "Pool & Salamander Grille",
    beats: [
      { when: "After golf", what: "Pool if the weather holds" },
      { when: "Dinner", what: "Salamander Grille, main clubhouse" },
    ],
  },
  {
    day: "Saturday",
    title: "Breakfast, free time & Steakhouse",
    beats: [
      { when: "Breakfast", what: "Main clubhouse, included" },
      { when: "After golf", what: "Another round, bikes, or the pool — ask Andrew" },
      { when: "7:00 PM", what: "Steakhouse" },
    ],
  },
  {
    day: "Sunday",
    title: "Breakfast, lunch & awards",
    beats: [
      { when: "Breakfast", what: "Main clubhouse" },
      { when: "After golf", what: "Lunch, then awards — stick around for presentations" },
    ],
  },
];

export const PURSE = [
  {
    title: "Winning Team",
    amount: "$200 / player",
    detail: "$100 buy-in returned plus $100 of opponent money.",
  },
  {
    title: "Closest to the Pin",
    amount: "$100",
    detail: "Six opportunities (one per nine). Friday: holes 3 and 18. Other days TBD.",
  },
  {
    title: "Long Drive",
    amount: "$100",
    detail:
      "Two opportunities (Friday & Saturday). Friday: hole 7. Saturday TBD. Ball must finish in the fairway.",
  },
  {
    title: "Side Skins",
    amount: "Optional",
    detail: "Separate buy-in on the Stableford and Singles rounds — not included in the $150.",
  },
];

export const TROPHIES = [
  {
    name: "The Championship Trophy",
    detail: "Awarded to the winning side. Engraved with every year's victors.",
  },
  {
    name: "Chubbs Peterson MVP",
    detail: "Most points earned across the three days, regardless of side.",
  },
  {
    name: "Steve Stinson Vibes Award",
    detail: "For the man who kept the weekend loose and the cooler full.",
  },
  {
    name: "Snake Pit Trophy",
    detail: "Best combined score through Copperhead 16, 17 and 18.",
  },
];

/** Copperhead Snake Pit — names/pars match official scorecard; day tees still TBD. */
export const SNAKE_PIT = [
  {
    hole: 16,
    name: "Moccasin",
    yards: "Par 4 · Black 458 · tournament tees TBD",
    tip: "One of the toughest scoring holes on Tour — controlled fade into a tight fairway. Bailouts miss the angle into an elevated green.",
  },
  {
    hole: 17,
    name: "The Rattler",
    yards: "Par 3 · Black 206 · tournament tees TBD",
    tip: "Long par three with plenty of bite if you miss the green. Middle of the putting surface is a win.",
  },
  {
    hole: 18,
    name: "The Copperhead",
    yards: "Par 4 · Black 443 · tournament tees TBD",
    tip: "All-uphill approach into the finishing green. Commit to enough club — short leaves a brutal up-and-down.",
  },
];
