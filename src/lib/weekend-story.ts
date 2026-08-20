import type { ActivityItem } from "@/hooks/useActivityFeed";
import type { Match, SideBet, Trophy } from "@/hooks/useTournament";

export type StoryMomentKind =
  "photo" | "roster" | "match" | "prediction" | "side-bet" | "trophy" | "lead-change";
export type ReactionKind = "applause" | "fire" | "trophy";
export type StoryMoment = {
  key: string;
  kind: StoryMomentKind;
  title: string;
  detail?: string;
  at: number;
  shareable: boolean;
  authorId?: string | null;
  playerId?: string | null;
  playerName?: string;
  teamSlug?: string | null;
  avatarPath?: string | null;
  mediaPath?: string | null;
};
export type StoryComment = {
  id: string;
  moment_key: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  moderated_by: string | null;
  pinned_at: string | null;
  pinned_by: string | null;
  announcement_expires_at?: string | null;
};
export type StoryReaction = {
  moment_key: string;
  user_id: string;
  kind: ReactionKind;
  created_at: string;
};

export function buildStoryMoments(input: {
  matches: Match[];
  sideBets: SideBet[];
  trophies: Trophy[];
  activity?: ActivityItem[];
}): StoryMoment[] {
  const moments: StoryMoment[] = [];
  for (const item of input.activity ?? [])
    moments.push({
      key: `activity:${item.id}`,
      kind: item.kind === "claim" ? "roster" : "photo",
      title: item.title,
      detail: item.subtitle,
      at: Date.parse(item.at) || 0,
      shareable: item.kind !== "claim",
      authorId: item.authorId,
      playerId: item.playerId,
      playerName: item.playerName,
      teamSlug: item.teamSlug,
      avatarPath: item.avatarPath,
      mediaPath: item.mediaPath,
    });
  for (const match of input.matches.filter((row) => row.result !== "pending"))
    moments.push({
      key: `match:${match.id}:r${match.revision}`,
      kind: "match",
      title: `${match.label} · ${match.result === "halved" ? "Halved" : match.result === "strong-mental" ? "Strong Mental" : "Grass Roots"}`,
      detail: `${match.side_a ?? "TBD"} vs ${match.side_b ?? "TBD"} · ${match.points} pt`,
      at: Date.parse(match.updated_at) || 0,
      shareable: true,
    });
  for (const bet of input.sideBets.filter((row) => row.player_name))
    moments.push({
      key: `side-bet:${bet.id}:r${bet.revision}`,
      kind: "side-bet",
      title: `${bet.label} · ${bet.player_name}`,
      detail: bet.distance || undefined,
      at: Date.parse(bet.updated_at) || 0,
      shareable: true,
    });
  for (const trophy of input.trophies.filter((row) => row.winner_name))
    moments.push({
      key: `trophy:${trophy.id}:r${trophy.revision}`,
      kind: "trophy",
      title: `${trophy.name} · ${trophy.winner_name}`,
      detail: trophy.winner_note || trophy.description,
      at: Date.parse(trophy.updated_at) || 0,
      shareable: true,
    });
  return moments.sort((a, b) => b.at - a.at || a.key.localeCompare(b.key));
}
