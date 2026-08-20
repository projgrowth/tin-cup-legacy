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
 * Day 1 (Friday / South): CTP 3 & 18, long drive 13. Other contest holes TBD.
 */
export const SIDE_BET_PAYOUTS_CONFIRMED = true;
export { contestHoleLabel, DAY1_CONTESTS } from "@/lib/contest-holes";

/** Launch gate: override for a different field size without editing UI copy. */
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

export type BoardMode = "pre" | "live" | "post";

/** Which board the app should open on, based on the current date. */
export function defaultMode(now: number = Date.now()): BoardMode {
  if (now < new Date(EVENT.firstTee).getTime()) return "pre";
  if (now <= new Date(EVENT.endsAt).getTime()) return "live";
  return "post";
}

export const TEAM_STYLES: Record<string, { short: string; accent: string }> = {
  "strong-mental": { short: "Strong Mental", accent: "text-gold" },
  "grass-roots": { short: "Grass Roots", accent: "text-copper" },
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
    detail:
      "If weather is good, hit the pool after golf, then head to Salamander Grille in the main clubhouse for dinner.",
  },
  {
    day: "Saturday",
    title: "Breakfast, free time & Steakhouse",
    detail:
      "Breakfast is included in the main clubhouse. After the round: ask Andrew or the hosts about another round on property, rent bikes, or hit the pool. Dinner reservation is 7:00 PM at the Steakhouse.",
  },
  {
    day: "Sunday",
    title: "Breakfast, lunch & awards",
    detail:
      "Breakfast is available at the main clubhouse. Please stick around for a quick lunch and a brief awards ceremony — feel free to hang afterward, but we’d love everyone there for the presentations.",
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
    detail: "Two opportunities (Friday & Saturday). Friday: hole 13. Saturday TBD. Ball must finish in the fairway.",
  },
  {
    title: "Side Skins",
    amount: "Optional",
    detail: "Separate buy-in on the Stableford and Singles rounds — not included in the $150.",
  },
];

/** Rules aligned to Desktop deck: `4th Annual Tin Cup Invitational 2026.pdf`. */
export const RULES = [
  "26 total points are available across the three days. 13.5 points wins the Cup.",
  "A halved match awards 0.5 points to each side.",
  "Friday: 8 points — Scramble and Modified Alternate Shot on the South Course (4 / 4).",
  "Saturday: 6 points — Modified Stableford full-team match play on Copperhead (2 / 2 / 2).",
  "Sunday: 12 points — Shamble (4) and Singles (8) on the Island Course.",
  "Team captains set match pairings before each session — not contest holes.",
  "If tied, each captain picks one player as their scramble partner for a one-hole playoff until a winner is decided. Playoff hole TBD.",
  "Long Drive claims only count if the ball finishes in the fairway.",
];

/** Format / scoring rules for the purse page (scannable card). */
export const FORMAT_RULES = [
  "26 total points across three days. 13.5 points wins the Cup.",
  "A halved match awards 0.5 points to each side.",
  "Friday: 8 pts — Scramble + Modified Alternate Shot (South, 4 / 4).",
  "Saturday: 6 pts — Modified Stableford full team (Copperhead, 2 / 2 / 2).",
  "Sunday: 12 pts — Shamble (4) + Singles (8) on Island.",
  "Captains set match pairings (not CTP/LD holes).",
  "Tie → captains each pick a scramble partner for a one-hole playoff. Hole TBD.",
];

/** Money rules for the purse page. */
export const MONEY_RULES = [
  `$${BUY_IN} buy-in includes auto entry into CTP and long-drive pots ($100 team money + $50 side cash).`,
  "Winning side: $200 per player ($100 returned + $100 opponent money).",
  "Six CTPs pay $100 each; two Long Drives pay $100 each (Friday & Saturday).",
  "Friday contest holes: CTP 3 and 18, long drive 13. Saturday and Sunday holes TBD — captains do not pick them.",
  "Long Drive only counts if the ball finishes in the fairway.",
  "Side skins are optional separate buy-ins on Stableford and Singles — not part of the $150.",
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
