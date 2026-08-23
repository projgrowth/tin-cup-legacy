import { useEffect, useState } from "react";

import { FridayPairings } from "@/components/tin-cup/FridayPairings";
import { LockerWall } from "@/components/tin-cup/LockerWall";
import { InstallHint } from "@/components/tin-cup/WhatsAppLinks";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { Countdown } from "@/components/tin-cup/Countdown";
import { COURSE_DETAILS, COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";
import { signedVaultUrl } from "@/integrations/supabase/storage";
import type { WeekendContext } from "@/lib/weekend-context";

/** Pre-event Home — one locker-room poster you scroll. */
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
  const nextCourseId = defaultCourseId() as CourseId;
  const today = COURSE_DETAILS[nextCourseId];
  const avatars = usePlayerAvatars(players, teams);
  const playerIdByName = (name: string) =>
    players.find((player) => player.name.trim().toLowerCase() === name.trim().toLowerCase())?.id;

  return (
    <section aria-label="This weekend" className="stack">
      <FridayPairings
        getFace={(name) => avatars.data?.getByName(name)}
        claimedName={claimedName}
        playerIdByName={playerIdByName}
        hideIntro
      />
      <Countdown caption={`${today.dayLabel} · ${COURSE_LABEL[nextCourseId]}`} />
      <LockerWall players={players} teams={teams} />
      <HomeFieldPhoto players={players} teams={teams} />
      <InstallHint embedded />
    </section>
  );
}

function HomeFieldPhoto({ players, teams }: { players: Player[]; teams: Team[] }) {
  const activity = useActivityFeed(players, teams);
  const photo = (activity.data ?? [])
    .filter((item) => item.kind === "photo" && item.mediaPath)
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return Date.parse(b.at) - Date.parse(a.at);
    })[0];
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const path = photo?.mediaPath;
    if (!path) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    void signedVaultUrl(path).then((next) => {
      if (!cancelled) setUrl(next);
    });
    return () => {
      cancelled = true;
    };
  }, [photo?.mediaPath]);

  if (!photo) return null;

  return (
    <figure className="feed-photo feed-photo-cover -mx-4 w-[calc(100%+2rem)] overflow-hidden sm:-mx-5 sm:w-[calc(100%+2.5rem)]">
      {url ? (
        <img
          src={url}
          alt={photo.altText || photo.subtitle || photo.playerName || "Field"}
          className="h-auto max-h-[28rem] w-full object-cover"
        />
      ) : (
        <div className="skeleton h-48 w-full" />
      )}
    </figure>
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
