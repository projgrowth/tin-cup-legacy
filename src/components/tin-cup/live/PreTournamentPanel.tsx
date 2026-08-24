import { FridayPairings } from "@/components/tin-cup/FridayPairings";
import { LockerWall } from "@/components/tin-cup/LockerWall";
import { InstallHint } from "@/components/tin-cup/WhatsAppLinks";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import type { WeekendContext } from "@/lib/weekend-context";

/** Pre-event Home — bleed quad, sentence, other groups as lines. */
export function PreTournamentPanel({
  rounds: _rounds = [],
  matches: _matches = [],
  players = [],
  teams = [],
  canUpload: _canUpload = false,
  signedIn: _signedIn = false,
  claimedName = null,
  needsClaim: _needsClaim = false,
  context: _context,
}: {
  rounds?: Round[];
  matches?: Match[];
  players?: Player[];
  teams?: Team[];
  canUpload?: boolean;
  signedIn?: boolean;
  claimedName?: string | null;
  needsClaim?: boolean;
  context?: WeekendContext;
}) {
  const avatars = usePlayerAvatars(players, teams);
  const playerIdByName = (name: string) =>
    players.find((player) => player.name.trim().toLowerCase() === name.trim().toLowerCase())?.id;

  return (
    <section aria-label="This weekend" className="stack">
      <FridayPairings
        avatars={avatars.data}
        getFace={(name) => {
          const id = playerIdByName(name);
          const entry = (id ? avatars.data?.byPlayerId.get(id) : undefined) ?? avatars.data?.getByName(name);
          return entry ? { name: entry.name, url: entry.url, src: entry.url } : undefined;
        }}
        claimedName={claimedName}
        playerIdByName={playerIdByName}
        hideIntro
        variant="home"
      />
      <LockerWall players={players} teams={teams} />
      <InstallHint embedded />
    </section>
  );
}

/** Quiet A2HS only. No Pay. No homework. */
export function HomeWeekendDoors({
  signedIn: _signedIn = false,
  claimedName = null,
}: {
  signedIn?: boolean;
  claimedName?: string | null;
  players?: Player[];
  teams?: Team[];
}) {
  if (claimedName) return null;
  return <InstallHint embedded />;
}
