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
import { buildCupStoryPayload, formatCupPoints } from "@/lib/share-moment";

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
  const cupStory = buildCupStoryPayload({
    matches,
    rounds,
    teams,
    trophies,
    sideBets,
    canonicalUrl,
  });
  const storyPayload = { ...cupStory, includePhoto: withPhoto };

  return (
    <section className="recap-shell space-y-5" aria-labelledby="weekend-recap-title">
      <header className="recap-hero overflow-hidden rounded-2xl border border-border">
        <Link
          to="/photos"
          className="press recap-hero-photo relative block overflow-hidden"
          aria-label="The 2026 field at Innisbrook"
        >
          <img
            src="/tin-cup-field-2026.jpg"
            alt=""
            className="block h-auto w-full"
          />
          <span className="t-micro absolute left-3 top-3 text-white drop-shadow-[0_1px_8px_rgba(0,0,0,.8)]">
            4th Annual · Innisbrook 2026
          </span>
        </Link>
        <div className="recap-score-plate relative px-4 pb-5 pt-11 text-center sm:px-6">
          <img
            src="/tin-cup-medal.png"
            alt=""
            className="recap-hero-medal pointer-events-none absolute left-1/2 top-0 w-[4.75rem] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_8px_18px_rgba(0,0,0,.45)] sm:w-24"
          />
          <p className="event-kicker text-hunter">The complete story</p>
          <h1
            id="weekend-recap-title"
            className={`${winner || decided.length ? "event-title" : "t-display"} mt-3 text-foreground`}
          >
            {winner
              ? `${winner.name} wins the Cup`
              : decided.length
                ? "The Cup finishes all square"
                : "The weekend is still being written"}
          </h1>
          <p className="t-hero mt-4">
            <span className="text-hunter">{formatCupPoints(standings.strongMental)}</span>
            <span className="mx-3 text-muted-foreground/40">–</span>
            <span className="text-stone">{formatCupPoints(standings.grassRoots)}</span>
          </p>
          <p className="t-micro mt-1">
            <span className="text-hunter">Strong Mental</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="text-stone">Grass Roots</span>
          </p>
          {cupStory.days.length > 0 ? (
            <ol className="mt-4 grid grid-cols-3 gap-2">
              {cupStory.days.map((day) => (
                <li key={day.label} className="rounded-xl bg-hunter/5 px-2 py-2.5">
                  <p className="t-micro text-muted-foreground">{day.label.slice(0, 3)}</p>
                  <p className="mt-1 font-semibold tabular-nums text-foreground">
                    {formatCupPoints(day.strongMental)}–{formatCupPoints(day.grassRoots)}
                  </p>
                </li>
              ))}
            </ol>
          ) : null}
          <p className="t-body mt-3 text-muted-foreground">
            {decided.length} official results · {photos.length} photos · {story.comments.length}{" "}
            comments
          </p>
          <ShareMomentButton className="btn-primary mt-5 min-w-48" payload={storyPayload}>
            Share Stories card
          </ShareMomentButton>
          <label className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={withPhoto}
              onChange={(event) => setWithPhoto(event.target.checked)}
              className="size-4 accent-[var(--gold)]"
            />
            <span className="t-micro">Include group photo</span>
          </label>
          <p className="t-micro mt-1 text-muted-foreground/80">1080×1920 · Instagram Stories</p>
        </div>
      </header>
      {photos.length > 0 ? (
        <section aria-label="Weekend photographs" className="stack-tight">
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
        </section>
      ) : null}

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


