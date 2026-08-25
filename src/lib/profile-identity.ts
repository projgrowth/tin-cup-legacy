/** Local claim cache + identity resolution. Server remains authoritative on save. */

export const CLAIM_CACHE_KEY = "tin-cup-claim-v1";
export const profileQueryKey = (userId?: string) => ["profile", userId] as const;

type ClaimCache = {
  userId: string;
  playerId: string;
};

export function isMissingColumnError(
  error: { code?: string; message?: string } | null | undefined,
) {
  if (!error) return false;
  const code = String(error.code ?? "");
  const message = String(error.message ?? "").toLowerCase();
  return (
    code === "PGRST204" ||
    code === "42703" ||
    /column .+ does not exist|schema cache|could not find/i.test(message)
  );
}

function readRaw(): ClaimCache | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(CLAIM_CACHE_KEY) ?? "null",
    ) as ClaimCache | null;
    if (!parsed?.userId || !parsed.playerId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readClaimedPlayerId(userId?: string | null): string | null {
  if (!userId) return null;
  const cached = readRaw();
  return cached?.userId === userId ? cached.playerId : null;
}

export function writeClaimedPlayerId(userId: string, playerId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!playerId) {
      const cached = readRaw();
      if (cached?.userId === userId) window.localStorage.removeItem(CLAIM_CACHE_KEY);
      return;
    }
    window.localStorage.setItem(
      CLAIM_CACHE_KEY,
      JSON.stringify({ userId, playerId } satisfies ClaimCache),
    );
  } catch {
    /* private mode */
  }
}

export function clearClaimedPlayerId() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CLAIM_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export type IdentityKind = "loading" | "error" | "claim" | "hub";

export type IdentityState = {
  kind: IdentityKind;
  playerId: string | null;
  playerMissing: boolean;
};

/** Roster `players.name` only — never profiles.display_name handles. */
export function rosterName(input: {
  userId: string;
  players: Array<{ id: string; name: string }>;
  profiles: Array<{ id: string; player_id: string | null }>;
}): string {
  const row = input.profiles.find((profile) => profile.id === input.userId);
  const player = row?.player_id
    ? input.players.find((candidate) => candidate.id === row.player_id)
    : undefined;
  const name = player?.name.trim();
  if (!name) return "Player";
  return name.split(/\s+/)[0] ?? name;
}

export function resolveIdentity(input: {
  signedIn: boolean;
  profilePending: boolean;
  profileError: boolean;
  playerId: string | null;
  tournamentPending: boolean;
  playerOnRoster: boolean;
}): IdentityState {
  if (!input.signedIn) {
    return { kind: "claim", playerId: null, playerMissing: false };
  }
  if (!input.playerId && input.profilePending) {
    return { kind: "loading", playerId: null, playerMissing: false };
  }
  if (!input.playerId && input.profileError) {
    return { kind: "error", playerId: null, playerMissing: false };
  }
  if (!input.playerId) {
    return { kind: "claim", playerId: null, playerMissing: false };
  }
  if (input.tournamentPending && !input.playerOnRoster) {
    return { kind: "loading", playerId: input.playerId, playerMissing: false };
  }
  if (!input.playerOnRoster) {
    return { kind: "hub", playerId: input.playerId, playerMissing: true };
  }
  return { kind: "hub", playerId: input.playerId, playerMissing: false };
}
