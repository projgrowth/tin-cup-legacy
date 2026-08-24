import { useQuery } from "@tanstack/react-query";

import { signedVaultUrl } from "@/integrations/supabase/storage";
import { graphqlRequest } from "@/integrations/supabase/graphql";
import type { Player, Team } from "@/hooks/useTournament";

export type AvatarEntry = {
  playerId: string;
  name: string;
  teamSlug: string | null;
  avatarPath: string | null;
  url: string | null;
};

export type AvatarIndex = {
  byPlayerId: Map<string, AvatarEntry>;
  byName: Map<string, AvatarEntry>;
  getByName: (name: string) => AvatarEntry | undefined;
  /** Resolve "Zack / Chris" style side labels to entries */
  forSide: (side: string | null | undefined) => AvatarEntry[];
};

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

/** Split pairing text into name parts. */
export function sideNameParts(side: string | null | undefined): string[] {
  if (!side) return [];
  return side
    .split(/[/,&+]|\band\b/i)
    .map((p) => p.trim())
    .filter(Boolean);
}

function matchPlayer(part: string, players: Player[]): Player | undefined {
  const target = part.toLowerCase();
  return (
    players.find((p) => normalizeName(p.name) === target) ??
    players.find((p) => normalizeName(p.name).startsWith(`${target} `)) ??
    players.find((p) => normalizeName(p.name).includes(target))
  );
}

async function loadAvatarIndex(
  players: Player[],
  teams: Team[],
): Promise<AvatarIndex> {
  const teamById = new Map(teams.map((t) => [t.id, t.slug] as const));

  let profiles: Array<{
    id: string;
    player_id: string | null;
    display_name: string;
    avatar_path: string | null;
  }> = [];

  try {
    const data = await graphqlRequest<{
      profiles: Array<{
        id: string;
        player_id: string | null;
        display_name: string;
        avatar_path: string | null;
      }>;
    }>(`query AvatarMap {
      profiles {
        id player_id display_name avatar_path
      }
    }`);
    profiles = data.profiles ?? [];
  } catch {
    /* column or permission not applied yet — monograms only */
    profiles = [];
  }

  const byPlayerId = new Map<string, AvatarEntry>();
  const paths: Array<{ playerId: string; path: string }> = [];

  for (const p of players) {
    const profile =
      profiles.find((pr) => pr.player_id === p.id) ??
      profiles.find(
        (pr) => pr.display_name && normalizeName(pr.display_name) === normalizeName(p.name),
      );
    const entry: AvatarEntry = {
      playerId: p.id,
      name: p.name,
      teamSlug: teamById.get(p.team_id) ?? null,
      avatarPath: profile?.avatar_path ?? null,
      url: null,
    };
    byPlayerId.set(p.id, entry);
    if (entry.avatarPath) paths.push({ playerId: p.id, path: entry.avatarPath });
  }

  await Promise.all(
    paths.map(async ({ playerId, path }) => {
      try {
        const url = await signedVaultUrl(path);
        const entry = byPlayerId.get(playerId);
        if (entry && url) entry.url = url;
      } catch {
        /* leave monogram */
      }
    }),
  );

  const byName = new Map<string, AvatarEntry>();
  for (const entry of byPlayerId.values()) {
    byName.set(normalizeName(entry.name), entry);
    const first = entry.name.split(/\s+/)[0];
    if (first && !byName.has(normalizeName(first))) {
      byName.set(normalizeName(first), entry);
    }
  }

  const getByName = (name: string) => {
    const n = normalizeName(name);
    return byName.get(n) ?? [...byName.values()].find((e) => normalizeName(e.name).includes(n));
  };

  const forSide = (side: string | null | undefined) => {
    const parts = sideNameParts(side);
    const out: AvatarEntry[] = [];
    for (const part of parts) {
      const player = matchPlayer(part, players);
      if (player) {
        const entry = byPlayerId.get(player.id);
        if (entry) out.push(entry);
        else
          out.push({
            playerId: player.id,
            name: player.name,
            teamSlug: teamById.get(player.team_id) ?? null,
            avatarPath: null,
            url: null,
          });
      } else {
        out.push({
          playerId: part,
          name: part,
          teamSlug: null,
          avatarPath: null,
          url: null,
        });
      }
    }
    return out;
  };

  return { byPlayerId, byName, getByName, forSide };
}

export function faceUrl(
  index: AvatarIndex | undefined,
  name: string,
  playerId?: string | null,
): string | null {
  if (!index) return null;
  if (playerId) {
    const fromId = index.byPlayerId.get(playerId)?.url;
    if (fromId) return fromId;
  }
  return index.getByName(name)?.url ?? null;
}

/** Cached face map for the whole field (guests + signed-in). */
export function usePlayerAvatars(players: Player[], teams: Team[]) {
  return useQuery({
    queryKey: [
      "player-avatars",
      players.map((p) => p.id).join(","),
      teams.map((t) => t.id).join(","),
    ],
    queryFn: () => loadAvatarIndex(players, teams),
    enabled: players.length > 0,
    staleTime: 60_000,
  });
}
