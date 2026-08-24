/** Captain/admin score UI plus named QA roster access (Dan Rodriguez). */
export const QA_SCORE_PLAYER_NAME = "Dan Rodriguez";

function norm(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function rosterPlayerByName<T extends { name: string }>(
  players: T[],
  name: string | null | undefined,
): T | undefined {
  const target = norm(name);
  if (!target) return undefined;
  return players.find((player) => norm(player.name) === target);
}

/** True when the claimed roster seat is the QA player looked up by name. */
export function claimedPlayerGrantsScore(
  players: Array<{ id?: string; name: string }>,
  claimed: { id?: string | null; name?: string | null } | null | undefined,
): boolean {
  const dan = rosterPlayerByName(players, QA_SCORE_PLAYER_NAME);
  if (!dan || !claimed) return false;
  if (claimed.id && dan.id && claimed.id === dan.id) return true;
  return norm(claimed.name) === norm(dan.name);
}

export function canScoreFromRolesAndClaimed(input: {
  roles: string[];
  players: Array<{ id?: string; name: string }>;
  claimed: { id?: string | null; name?: string | null } | null | undefined;
}): boolean {
  if (input.roles.includes("admin") || input.roles.includes("captain")) return true;
  return claimedPlayerGrantsScore(input.players, input.claimed);
}

export function isOfficialCupResult(result: string | null | undefined): boolean {
  return result === "strong-mental" || result === "grass-roots" || result === "halved";
}

export function isUnofficialLive(result: string | null | undefined): boolean {
  return !isOfficialCupResult(result);
}
