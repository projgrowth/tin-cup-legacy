import { FridayPairings } from "@/components/tin-cup/FridayPairings";
import { HomeWallDoor } from "@/components/tin-cup/LockerWall";
import { InstallHint } from "@/components/tin-cup/WhatsAppLinks";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { Countdown } from "@/components/tin-cup/Countdown";
import { COURSE_DETAILS, COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";
import type { WeekendContext } from "@/lib/weekend-context";

/** Pre-event Home — one Friday poster. Wall and Field live behind a door. */
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
  liveLine = null,
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
  liveLine?: string | null;
}) {
  const nextCourseId = defaultCourseId() as CourseId;
  const today = COURSE_DETAILS[nextCourseId];
  const avatars = usePlayerAvatars(players, teams);
  const playerIdByName = (name: string) =>
    players.find((player) => player.name.trim().toLowerCase() === name.trim().toLowerCase())?.id;

  return (
    <section aria-label="This weekend" className="stack">
      <header>
        <h1 className="t-title text-foreground">Friday</h1>
        {liveLine ? (
          <p className="t-micro mt-1">{liveLine}</p>
        ) : (
          <Countdown caption={`${today.dayLabel} · ${COURSE_LABEL[nextCourseId]}`} />
        )}
      </header>
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
      <HomeWallDoor players={players} teams={teams} />
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
