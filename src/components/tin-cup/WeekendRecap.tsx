import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Camera, CheckCircle2, Flag, Medal, MessageCircle, Trophy, Users } from "lucide-react";

import { Avatar } from "@/components/tin-cup/Avatar";
import { ShareMomentButton } from "@/components/tin-cup/ShareMomentButton";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useAuth } from "@/hooks/useAuth";
import { useEngagementPlatform } from "@/hooks/useEngagementPlatform";
import { useMatchSocial } from "@/hooks/useMatchSocial";
import { useProfile } from "@/hooks/useJournal";
import { usePlanningProgress } from "@/hooks/usePlanningProgress";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { usePublicProfiles } from "@/hooks/usePublicProfiles";
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
import { deriveAchievements, type MatchPredictionChoice } from "@/lib/social-platform";
import { formatRecord, playerRecord, tallyStandings } from "@/lib/scoring";
import { buildCupStoryPayload } from "@/lib/share-moment";

function resultChoice(result: string): MatchPredictionChoice | null {
  return result === "strong-mental"
    ? "side-a"
    : result === "grass-roots"
      ? "side-b"
      : result === "halved"
        ? "halved"
        : null;
}

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
  const { user } = useAuth();
  const { profile } = useProfile();
  const activity = useActivityFeed(players, teams);
  const story = useWeekendStory(user?.id);
  const social = useMatchSocial(user?.id);
  const engagement = useEngagementPlatform(user?.id);
  const planning = usePlanningProgress();
  const avatars = usePlayerAvatars(players, teams);
  const publicProfiles = usePublicProfiles();
  const standings = tallyStandings(matches);
  const winner =
    standings.strongMental > standings.grassRoots
      ? teams.find((team) => team.slug === "strong-mental")
      : standings.grassRoots > standings.strongMental
        ? teams.find((team) => team.slug === "grass-roots")
        : null;
  const decided = matches.filter((match) => match.result !== "pending");
  const photos = (activity.data ?? []).filter((item) => item.kind === "photo");
  const mostDiscussed = [
    ...story.comments
      .reduce(
        (map, comment) => map.set(comment.moment_key, (map.get(comment.moment_key) ?? 0) + 1),
        new Map<string, number>(),
      )
      .entries(),
  ].sort((a, b) => b[1] - a[1])[0];
  const topPlayers = players
    .map((player) => {
      const team = teams.find((candidate) => candidate.id === player.team_id);
      const record = playerRecord(matches, player.name, team?.slug ?? "");
      return { player, team, record };
    })
    .sort((a, b) => b.record.points - a.record.points || b.record.won - a.record.won);
  const predictionByUser = new Map<string, { correct: number; total: number }>();
  for (const prediction of social.predictions) {
    const match = matches.find((candidate) => candidate.id === prediction.matchId);
    const expected = match ? resultChoice(match.result) : null;
    if (!expected) continue;
    const current = predictionByUser.get(prediction.userId) ?? { correct: 0, total: 0 };
    current.total += 1;
    if (prediction.choice === expected) current.correct += 1;
    predictionByUser.set(prediction.userId, current);
  }
  const predictionStandings = [...predictionByUser.entries()]
    .map(([userId, record]) => {
      const publicProfile = (publicProfiles.data ?? []).find((row) => row.id === userId);
      const player = players.find((row) => row.id === publicProfile?.player_id);
      return {
        userId,
        name: player?.name ?? "Clubhouse player",
        ...record,
      };
    })
    .sort(
      (a, b) =>
        b.correct - a.correct ||
        b.correct / Math.max(1, b.total) - a.correct / Math.max(1, a.total) ||
        a.name.localeCompare(b.name),
    );
  const myPredictions = user ? predictionByUser.get(user.id) : undefined;
  const myPosts = user
    ? story.clubhousePosts.filter((post) => post.author_id === user.id).length
    : 0;
  const myReactions = user
    ? story.reactions.filter((reaction) => reaction.user_id === user.id).length
    : 0;
  const myConfirmations = user
    ? social.confirmations.filter((row) => row.userId === user.id && row.state === "confirmed")
        .length
    : 0;
  const myPlayer = players.find((player) => player.id === profile?.player_id);
  const myTeam = teams.find((team) => team.id === myPlayer?.team_id);
  const myRecord = myPlayer ? playerRecord(matches, myPlayer.name, myTeam?.slug ?? "") : null;
  const achievements = deriveAchievements({
    plannedHoles: planning.best,
    posts: myPosts,
    reactionCount: myReactions,
    correctPredictions: myPredictions?.correct ?? 0,
    confirmations: myConfirmations,
    points: myRecord?.points ?? 0,
  });
  const canonicalUrl =
    typeof window === "undefined"
      ? "https://www.tincupinv.com/?story=recap"
      : `${window.location.origin}/?story=recap`;

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
          <ShareMomentButton
            className="btn-primary mt-5 min-w-48"
            payload={buildCupStoryPayload({
              matches,
              rounds,
              teams,
              trophies,
              sideBets,
              canonicalUrl,
            })}
          >
            Share Stories card
          </ShareMomentButton>
          <p className="t-micro mt-2 text-white/60">1080×1920 · Instagram Stories</p>
        </div>
      </header>
      {photos.length > 0 && (
        <section aria-label="Weekend photographs" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {photos.slice(0, 4).map((item) => (
            <Link
              key={item.id}
              to="/photos"
              className="press recap-photo relative aspect-[4/3] overflow-hidden rounded-2xl border border-border"
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
        </section>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <RecapStat
          icon={Flag}
          label="Official matches"
          value={`${decided.length}/${matches.length}`}
          detail={`${social.confirmations.filter((row) => row.state === "confirmed").length} player confirmations`}
        />
        <RecapStat
          icon={Camera}
          label="Weekend photos"
          value={String(photos.length)}
          detail="Gallery-ready moments"
        />
        <RecapStat
          icon={MessageCircle}
          label="Clubhouse"
          value={String(story.clubhousePosts.length)}
          detail={
            mostDiscussed
              ? `${mostDiscussed[1]} comments on the busiest moment`
              : "The conversation is ready"
          }
        />
      </div>

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
        </section>
      )}

      {(decided.length > 0 ||
        sideBets.some((bet) => bet.player_name) ||
        trophies.some((trophy) => trophy.winner_name) ||
        predictionStandings.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {decided.length > 0 && (
            <section className="surface p-4 md:col-span-2">
              <p className="t-micro text-hunter">Turning points</p>
              <h2 className="t-title mt-1">Matches that shaped the Cup</h2>
              <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                {decided
                  .slice(-4)
                  .reverse()
                  .map((match) => {
                    const winningTeam =
                      match.result === "strong-mental"
                        ? teams.find((team) => team.slug === "strong-mental")?.name
                        : match.result === "grass-roots"
                          ? teams.find((team) => team.slug === "grass-roots")?.name
                          : "Match halved";
                    return (
                      <li key={match.id} className="surface-inset p-3">
                        <strong className="block text-sm text-foreground">{match.label}</strong>
                        <span className="t-micro mt-1 block">
                          {winningTeam} · {match.points} Cup point{match.points === 1 ? "" : "s"}
                        </span>
                      </li>
                    );
                  })}
              </ol>
            </section>
          )}
          {(sideBets.some((bet) => bet.player_name) ||
            trophies.some((trophy) => trophy.winner_name)) && (
            <section className="surface p-4">
              <p className="t-micro text-hunter">Side board</p>
              <h2 className="t-title mt-1">Cash and trophies</h2>
              <ul className="mt-3 space-y-2">
                {sideBets
                  .filter((bet) => bet.player_name)
                  .map((bet) => (
                    <li
                      key={bet.id}
                      className="surface-inset flex justify-between gap-3 p-3 text-sm"
                    >
                      <span>{bet.label}</span>
                      <strong>{bet.player_name}</strong>
                    </li>
                  ))}
                {trophies
                  .filter((trophy) => trophy.winner_name)
                  .map((trophy) => (
                    <li
                      key={trophy.id}
                      className="surface-inset flex justify-between gap-3 p-3 text-sm"
                    >
                      <span>{trophy.name}</span>
                      <strong>{trophy.winner_name}</strong>
                    </li>
                  ))}
              </ul>
            </section>
          )}
          {predictionStandings.length > 0 && (
            <section className="surface p-4">
              <p className="t-micro text-hunter">Social calls</p>
              <h2 className="t-title mt-1">Prediction standings</h2>
              <ol className="mt-3 space-y-2">
                {predictionStandings.slice(0, 5).map((row, index) => (
                  <li
                    key={row.userId}
                    className="surface-inset flex items-center gap-3 p-3 text-sm"
                  >
                    <span className="t-numeral text-muted-foreground">{index + 1}</span>
                    <strong className="min-w-0 flex-1 truncate text-foreground">{row.name}</strong>
                    <span>
                      {row.correct}/{row.total}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="t-micro mt-2">Social only · no Cup points or payouts</p>
              {myPredictions && (
                <p className="surface-inset mt-3 p-3 text-sm">
                  Your calls ·{" "}
                  <strong>
                    {myPredictions.correct}/{myPredictions.total} correct
                  </strong>
                </p>
              )}
            </section>
          )}
        </div>
      )}

      <section className="surface p-4">
        <p className="t-micro text-hunter">Team cards</p>
        <h2 className="t-title mt-1">Share each side’s weekend</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {teams.map((team) => {
            const points =
              team.slug === "strong-mental" ? standings.strongMental : standings.grassRoots;
            const teamPlayers = topPlayers.filter((row) => row.team?.id === team.id);
            return (
              <ShareMomentButton
                key={team.id}
                className="w-full"
                payload={{
                  kind: "team",
                  eyebrow: team.name,
                  title: `${points} Cup points`,
                  primary: teamPlayers[0]
                    ? `${teamPlayers[0].player.name} · ${teamPlayers[0].record.points} pts`
                    : "Tin Cup 2026",
                  secondary: `${teamPlayers.length} players · Innisbrook`,
                  canonicalUrl,
                }}
              >
                Download {team.name.replace("Team ", "")}
              </ShareMomentButton>
            );
          })}
        </div>
      </section>

      {achievements.length > 0 && (
        <section className="surface p-4">
          <p className="t-micro text-hunter">Your weekend</p>
          <h2 className="t-title mt-1">Achievements</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {achievements.map((achievement) => (
              <li key={achievement.id} className="surface-inset flex items-start gap-3 p-3">
                <Medal className="mt-0.5 size-5 shrink-0 text-hunter" />
                <span>
                  <strong className="block text-sm text-foreground">{achievement.label}</strong>
                  <span className="t-micro block">{achievement.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/photos"
          className="press surface flex min-h-12 items-center justify-between px-4 py-3"
        >
          <span className="t-body font-medium text-foreground">Photos</span>
          <span className="t-micro">Gallery</span>
        </Link>
        <Link to="/" className="press surface flex min-h-12 items-center justify-between px-4 py-3">
          <span className="t-body font-medium text-foreground">Home</span>
          <span className="t-micro">Field</span>
        </Link>
        <div className="surface-inset flex min-h-20 items-center gap-3 p-4 sm:col-span-2">
          <CheckCircle2 className="size-5 text-[var(--status-live)]" />
          <span>
            <strong className="block text-foreground">Official score protected</strong>
            <span className="t-micro">Social signals never change the board</span>
          </span>
        </div>
      </div>
      {engagement.prompts.length > 0 && decided.length > 0 && (
        <p className="t-micro">
          {engagement.prompts.length} live-prompt chapter
          {engagement.prompts.length === 1 ? "" : "s"} shaped the weekend.
        </p>
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

function RecapStat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="surface p-4">
      <Icon className="size-5 text-hunter" />
      <p className="t-micro mt-3">{label}</p>
      <p className="t-hero mt-1 text-foreground">{value}</p>
      <p className="t-micro mt-1">{detail}</p>
    </article>
  );
}
