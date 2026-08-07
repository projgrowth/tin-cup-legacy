import { useQuery } from "@tanstack/react-query";

import { graphqlRequest } from "@/integrations/nhost/graphql";
import type { Player, Team } from "@/hooks/useTournament";

export type ActivityItem = {
  id: string;
  kind: "claim" | "photo" | "avatar";
  at: string;
  title: string;
  subtitle?: string;
  playerName?: string;
  playerId?: string | null;
  teamSlug?: string | null;
  avatarPath?: string | null;
};

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const sec = Math.round((Date.now() - t) / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h`;
  const day = Math.round(hr / 24);
  return `${day}d`;
}

export function formatActivityTime(iso: string) {
  return relativeTime(iso);
}

async function loadActivity(
  players: Player[],
  teams: Team[],
): Promise<ActivityItem[]> {
  const playerById = new Map(players.map((p) => [p.id, p]));
  const teamById = new Map(teams.map((t) => [t.id, t.slug]));

  type ProfileRow = {
    id: string;
    display_name: string;
    player_id: string | null;
    avatar_path: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };

  let profiles: ProfileRow[] = [];
  let photos: Array<{
    id: string;
    caption: string | null;
    created_at: string;
    uploaded_by: string | null;
  }> = [];

  try {
    const data = await graphqlRequest<{
      profiles: ProfileRow[];
      photos: Array<{
        id: string;
        caption: string | null;
        created_at: string;
        uploaded_by: string | null;
      }>;
    }>(`query ActivityFeed {
      profiles(where: { player_id: { _is_null: false } }) {
        id display_name player_id avatar_path created_at updated_at
      }
      photos(order_by: { created_at: desc }, limit: 12) {
        id caption created_at uploaded_by
      }
    }`);
    profiles = data.profiles ?? [];
    photos = data.photos ?? [];
  } catch {
    // Fallback without timestamps if public columns not expanded yet
    try {
      const data = await graphqlRequest<{
        profiles: ProfileRow[];
        photos: Array<{
          id: string;
          caption: string | null;
          created_at: string;
          uploaded_by: string | null;
        }>;
      }>(`query ActivityFeedLite {
        profiles(where: { player_id: { _is_null: false } }) {
          id display_name player_id avatar_path
        }
        photos(order_by: { created_at: desc }, limit: 12) {
          id caption created_at uploaded_by
        }
      }`);
      profiles = data.profiles ?? [];
      photos = data.photos ?? [];
    } catch {
      return [];
    }
  }

  const profileByUser = new Map(profiles.map((p) => [p.id, p]));
  const items: ActivityItem[] = [];

  for (const p of profiles) {
    if (!p.player_id) continue;
    const player = playerById.get(p.player_id);
    const name = player?.name || p.display_name || "Someone";
    const teamSlug = player ? teamById.get(player.team_id) ?? null : null;
    const at = p.created_at || p.updated_at || new Date(0).toISOString();
    items.push({
      id: `claim-${p.id}`,
      kind: "claim",
      at,
      title: `${name.split(" ")[0]} joined the field`,
      subtitle: teamSlug === "grass-roots" ? "Grass Roots" : teamSlug === "strong-mental" ? "Strong Mental" : undefined,
      playerName: name,
      playerId: p.player_id,
      teamSlug,
      avatarPath: p.avatar_path,
    });
    if (p.avatar_path && p.updated_at && p.created_at && p.updated_at > p.created_at) {
      items.push({
        id: `avatar-${p.id}`,
        kind: "avatar",
        at: p.updated_at,
        title: `${name.split(" ")[0]} added a photo`,
        playerName: name,
        playerId: p.player_id,
        teamSlug,
        avatarPath: p.avatar_path,
      });
    }
  }

  for (const ph of photos) {
    const author = ph.uploaded_by ? profileByUser.get(ph.uploaded_by) : null;
    const player = author?.player_id ? playerById.get(author.player_id) : null;
    const name = player?.name || author?.display_name || "Someone";
    const teamSlug = player ? teamById.get(player.team_id) ?? null : null;
    items.push({
      id: `photo-${ph.id}`,
      kind: "photo",
      at: ph.created_at,
      title: `${name.split(" ")[0]} posted a photo`,
      subtitle: ph.caption?.trim() || undefined,
      playerName: name,
      playerId: author?.player_id,
      teamSlug,
      avatarPath: author?.avatar_path,
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items.slice(0, 12);
}

export function useActivityFeed(players: Player[], teams: Team[]) {
  return useQuery({
    queryKey: ["activity-feed", players.map((p) => p.id).join(",")],
    queryFn: () => loadActivity(players, teams),
    enabled: players.length > 0,
    staleTime: 45_000,
  });
}
