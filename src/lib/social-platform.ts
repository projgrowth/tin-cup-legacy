import type { Match, Player } from "@/hooks/useTournament";

export const CLUBHOUSE_MOMENT_KEY = "clubhouse:main";

export type FeedFilter = "all" | "clubhouse" | "scores" | "photos";
export type AppearancePreset = "heritage" | "night" | "team";
export type PlayerFlair = "competitor" | "vibes" | "strategist" | "rookie";
export type HomeModuleKey = "upcoming" | "plan" | "photos" | "purse";
export type LayoutMode = "auto" | "custom";
export type MatchPredictionChoice = "side-a" | "halved" | "side-b";
export type MatchConfirmationState = "confirmed" | "needs-review";
export type CheckInStatus = "on-course" | "clubhouse" | "heading-dinner" | "done-today";
export type EngagementPromptKind = "photo" | "conversation";

export const DEFAULT_HOME_MODULES: HomeModuleKey[] = ["upcoming", "plan", "photos", "purse"];

export type ExperiencePreferences = {
  appearance: AppearancePreset;
  homeModules: HomeModuleKey[];
  compactFeed: boolean;
  layoutMode: LayoutMode;
};

export const DEFAULT_EXPERIENCE_PREFERENCES: ExperiencePreferences = {
  appearance: "heritage",
  homeModules: DEFAULT_HOME_MODULES,
  compactFeed: false,
  layoutMode: "auto",
};

export type PollOption = { id: string; pollId: string; label: string; sortOrder: number };
export type PollVote = { pollId: string; optionId: string; userId: string; updatedAt: string };
export type ClubhousePoll = {
  id: string;
  authorId: string;
  question: string;
  createdAt: string;
  closesAt: string | null;
  closedAt: string | null;
  deletedAt: string | null;
  moderatedBy: string | null;
  options: PollOption[];
};
export type PlayerCheckIn = {
  userId: string;
  playerId: string;
  status: CheckInStatus;
  createdAt: string;
  expiresAt: string;
};
export type EngagementPrompt = {
  id: string;
  authorId: string;
  kind: EngagementPromptKind;
  title: string;
  detail: string | null;
  startsAt: string;
  endsAt: string;
  roundId: string | null;
};
export type PhotoFavorite = { photoId: string; userId: string; createdAt: string };
export type PlayerAchievement = {
  id: "planner" | "clubhouse" | "crowd-favorite" | "predictor" | "verified" | "points";
  label: string;
  detail: string;
};

export type SocialFeedItem = {
  id: string;
  kind: "post" | "announcement" | "poll" | "prompt" | "check-in" | "moment";
  authorId?: string | null;
  createdAt: string;
  updatedAt?: string;
  edited?: boolean;
  announcementExpiresAt?: string | null;
  promptId?: string | null;
  checkIn?: PlayerCheckIn;
  poll?: ClubhousePoll;
  commentAnchor?: string | null;
};

export type ClubhousePost = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  pinnedAt: string | null;
  pinnedBy: string | null;
};

export type MatchPrediction = {
  matchId: string;
  userId: string;
  choice: MatchPredictionChoice;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MatchConfirmation = {
  matchId: string;
  playerId: string;
  userId: string;
  state: MatchConfirmationState;
  createdAt: string;
  updatedAt: string;
};

export function normalizeHomeModules(value: unknown): HomeModuleKey[] {
  if (!Array.isArray(value)) return [...DEFAULT_HOME_MODULES];
  const allowed = new Set<HomeModuleKey>(DEFAULT_HOME_MODULES);
  const unique = value.filter(
    (item, index): item is HomeModuleKey =>
      allowed.has(item as HomeModuleKey) && value.indexOf(item) === index,
  );
  return [...unique, ...DEFAULT_HOME_MODULES.filter((item) => !unique.includes(item))];
}

export function smartHomeModules(
  mode: "pre" | "live" | "post",
  configured: HomeModuleKey[],
  layoutMode: LayoutMode,
): HomeModuleKey[] {
  if (layoutMode === "custom") return normalizeHomeModules(configured);
  return mode === "live"
    ? ["upcoming", "photos", "plan", "purse"]
    : mode === "post"
      ? ["photos", "purse", "upcoming", "plan"]
      : ["plan", "upcoming", "photos", "purse"];
}

export function pollClosed(poll: Pick<ClubhousePoll, "closedAt" | "closesAt">, now = Date.now()) {
  return Boolean(poll.closedAt || (poll.closesAt && Date.parse(poll.closesAt) <= now));
}

export function activeCheckIns(rows: PlayerCheckIn[], now = Date.now()) {
  return rows.filter((row) => Date.parse(row.expiresAt) > now);
}

export function deriveAchievements(input: {
  plannedHoles: number;
  posts: number;
  reactionCount: number;
  correctPredictions: number;
  confirmations: number;
  points: number;
}): PlayerAchievement[] {
  const rows: PlayerAchievement[] = [];
  if (input.plannedHoles >= 18)
    rows.push({ id: "planner", label: "Course architect", detail: "Planned all 18 holes" });
  if (input.posts > 0)
    rows.push({ id: "clubhouse", label: "Clubhouse voice", detail: "Joined the conversation" });
  if (input.reactionCount >= 3)
    rows.push({ id: "crowd-favorite", label: "Crowd favorite", detail: "Earned three reactions" });
  if (input.correctPredictions >= 2)
    rows.push({ id: "predictor", label: "Read the room", detail: "Called two match results" });
  if (input.confirmations >= 1)
    rows.push({ id: "verified", label: "Score verified", detail: "Confirmed an official result" });
  if (input.points > 0)
    rows.push({
      id: "points",
      label: "On the board",
      detail: `Contributed ${input.points} Cup points`,
    });
  return rows;
}

function sideNames(side: string | null): string[] {
  return (side ?? "")
    .split("/")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
}

export function playerParticipates(match: Match, player: Pick<Player, "name">): boolean {
  const needle = player.name.trim().toLowerCase();
  return [...sideNames(match.side_a), ...sideNames(match.side_b)].includes(needle);
}

export function predictionLocked(match: Match): boolean {
  return match.result !== "pending";
}

export function confirmationStatus(
  match: Match,
  confirmations: MatchConfirmation[],
): "not-applicable" | "awaiting" | "confirmed" | "under-review" {
  if (match.result === "pending") return "not-applicable";
  const rows = confirmations.filter((row) => row.matchId === match.id);
  if (rows.some((row) => row.state === "needs-review")) return "under-review";
  if (rows.length >= 2 && rows.every((row) => row.state === "confirmed")) return "confirmed";
  return "awaiting";
}

export function predictionTotals(predictions: MatchPrediction[], matchId: string) {
  const rows = predictions.filter((row) => row.matchId === matchId);
  return {
    sideA: rows.filter((row) => row.choice === "side-a").length,
    halved: rows.filter((row) => row.choice === "halved").length,
    sideB: rows.filter((row) => row.choice === "side-b").length,
    total: rows.length,
  };
}
