import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { Avatar } from "@/components/tin-cup/Avatar";
import { ShareMomentButton } from "@/components/tin-cup/ShareMomentButton";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { useWeekendStory } from "@/hooks/useWeekendStory";
import type {
  Match,
  Player,
  Round,
  SideBet,
  Team,
  Trophy as TrophyRow,
} from "@/hooks/useTournament";
import { signedVaultUrl } from "@/integrations/supabase/storage";
import { TrophyAward } from "@/components/tin-cup/live/MatchControls";
import { formatPayout } from "@/lib/purse";
import { formatRecord, playerRecord, tallyStandings } from "@/lib/scoring";
import { buildCupStoryPayload } from "@/lib/share-moment";

export function WeekendRecap({
  matches,
  rounds = [],
  players,
  teams,
  sideBets,
  trophies,
}: {
  matches: Match[];
  rounds?: Round[];
  players: Player[];
  teams: Team[];
  sideBets: SideBet[];
  trophies: TrophyRow[];
}) {
  const { user, canScore } = useAuth();
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const activity = useActivityFeed(players, teams);
  const story = useWeekendStory(user?.id);
  const avatars = usePlayerAvatars(players, teams);
  const standings = tallyStandings(matches);
  const winner =
    standings.strongMental > standings.grassRoots
      ? teams.find((team) => team.slug === "strong-mental")
      : standings.grassRoots > standings.strongMental
        ? teams.find((team) => team.slug === "grass-roots")
        : null;
  const decided = matches.filter((match) => match.result !== "pending");
  const photos = (activity.data ?? []).filter((item) => item.kind === "photo");
  const topPlayers = players
    .map((player) => {
      const team = teams.find((candidate) => candidate.id === player.team_id);
      const record = playerRecord(matches, player.name, team?.slug ?? "");
      return { player, team, record };
    })
    .sort((a, b) => b.record.points - a.record.points || b.record.won - a.record.won);
  const [withPhoto, setWithPhoto] = useState(true);
  const canonicalUrl =
    typeof window === "undefined"
      ? "https://www.tincupinv.com/?story=recap"
      : `${window.location.origin}/?story=recap`;
  const storyPayload = {
    ...buildCupStoryPayload({
      matches,
      rounds,
      teams,
      trophies,
      sideBets,
      canonicalUrl,
    }),
    includePhoto: withPhoto,
  };

  return (
    <section className="recap-shell space-y-5" aria-labelledby="weekend-recap-title">
      <header className="recap-hero relative overflow-hidden rounded-xl border border-border p-6 text-center sm:p-8">
        <img
          src="/tin-cup-intro-poster.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_42%] opacity-[0.78]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06120f] via-[#06120f]/70 to-transparent" />
        <div className="relative">
          <p className="event-kicker text-hunter">The complete story</p>
          <h1
            id="weekend-recap-title"
            className={`${winner || decided.length ? "event-title" : "t-display"} mt-3 text-white`}
          >
            {winner
              ? `${winner.name} wins the Cup`
              : decided.length
                ? "The Cup finishes all square"
                : "The weekend is still being written"}
          </h1>
          <p className="t-hero mt-4">
            <span className="text-hunter">{standings.strongMental}</span>
            <span className="mx-3 text-white/30">–</span>
            <span className="text-stone">{standings.grassRoots}</span>
          </p>
          <p className="t-body mt-2 text-white/75">
            {decided.length} official results · {photos.length} photos · {story.comments.length}{" "}
            comments
          </p>
          <ShareMomentButton className="btn-primary mt-5 min-w-48" payload={storyPayload}>
            Share Stories card
          </ShareMomentButton>
          <label className="mt-3 inline-flex min-h-11 items-center gap-2 text-white/75">
            <input
              type="checkbox"
              checked={withPhoto}
              onChange={(event) => setWithPhoto(event.target.checked)}
              className="size-4 accent-[var(--gold)]"
            />
            <span className="t-micro">Include group photo</span>
          </label>
          <p className="t-micro mt-1 text-white/60">1080×1920 · Instagram Stories</p>
        </div>
      </header>
      <section aria-label="Weekend photographs" className="stack-tight">
        <Link
          to="/photos"
          className="press recap-photo relative aspect-[16/7] overflow-hidden rounded-2xl border border-border"
        >
          <img
            src="/tin-cup-field-2026.jpg"
            alt="The 2026 field at Innisbrook"
            className="h-full w-full object-cover object-[center_40%]"
          />
        </Link>
        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {photos.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                to="/photos"
                className="press recap-photo relative aspect-[4/3] overflow-hidden rounded-xl border border-border"
              >
                {item.mediaPath ? (
                  <RecapPhoto
                    path={item.mediaPath}
                    alt={item.altText || item.subtitle || item.title}
                  />
                ) : (
                  <span className="block h-full bg-secondary" />
                )}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {trophies.length > 0 && (
        <section className="surface overflow-hidden">
          <div className="px-4 pt-4">
            <p className="t-micro text-hunter">Awards</p>
            <h2 className="t-title mt-1">MVP & Vibes</h2>
          </div>
          <ul className="mt-2 divide-y divide-border">
            {trophies.map((trophy) => (
              <li key={trophy.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="t-body min-w-0 truncate font-medium text-foreground">
                    {trophy.name}
                  </span>
                  <span className="t-body shrink-0 text-foreground">
                    {trophy.winner_name ?? "Open"}
                  </span>
                </div>
                {canScore ? (
                  <TrophyAward trophy={trophy} players={players} teams={teams} />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {topPlayers.some((row) => row.record.played > 0) && (
        <section className="surface p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="t-micro text-hunter">Leaderboard</p>
              <h2 className="t-title mt-1">Player records</h2>
            </div>
            <Users className="size-5 text-muted-foreground" />
          </div>
          <ol className="mt-3 divide-y divide-border">
            {topPlayers
              .filter((row) => row.record.played > 0)
              .slice(0, showAllPlayers ? undefined : 5)
              .map(({ player, team, record }, index) => (
                <li key={player.id} className="flex min-h-14 items-center gap-3 py-2.5">
                  <span className="t-numeral w-5 text-center text-muted-foreground">
                    {index + 1}
                  </span>
                  <Avatar
                    name={player.name}
                    teamSlug={team?.slug}
                    src={avatars.data?.byPlayerId.get(player.id)?.url}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <Link
                      to="/player/$playerId"
                      params={{ playerId: player.id }}
                      className="press flex min-h-11 items-center font-semibold text-foreground"
                    >
                      {player.name}
                    </Link>
                    <span className="t-micro block">
                      {formatRecord(record) || "No posted matches"}
                    </span>
                  </span>
                  <span className="t-numeral text-[1.25rem] text-foreground">{record.points}</span>
                </li>
              ))}
          </ol>
          {topPlayers.filter((row) => row.record.played > 0).length > 5 ? (
            <button
              type="button"
              onClick={() => setShowAllPlayers((value) => !value)}
              className="press t-micro mt-2 min-h-11 text-muted-foreground"
            >
              {showAllPlayers ? "Show top 5" : "Show all"}
            </button>
          ) : null}
        </section>
      )}

      {sideBets.some((bet) => bet.player_name) && (
        <section className="surface overflow-hidden">
          <div className="px-4 pt-4">
            <p className="t-micro text-hunter">Side cash</p>
            <h2 className="t-title mt-1">Claimed pots</h2>
          </div>
          <ul className="mt-2 divide-y divide-border">
            {sideBets
              .filter((bet) => bet.player_name)
              .map((bet) => (
                <li
                  key={bet.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="min-w-0 truncate text-muted-foreground">{bet.label}</span>
                  <span className="shrink-0 font-semibold text-foreground">
                    {bet.player_name}
                    <span className="t-micro ml-2 font-normal">
                      {formatPayout(bet.amount)}
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

    </section>
  );
}

function RecapPhoto({ path, alt }: { path: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void signedVaultUrl(path).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);
  if (!src) return <span className="block h-full bg-secondary" />;
  return <img src={src} alt={alt} className="h-full w-full object-cover" />;
}


