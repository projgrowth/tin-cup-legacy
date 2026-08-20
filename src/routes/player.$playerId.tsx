import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";

import { Avatar } from "@/components/tin-cup/Avatar";
import { ShareMomentButton } from "@/components/tin-cup/ShareMomentButton";
import { ErrorState, LoadingRows, Shell } from "@/components/tin-cup/Shell";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { usePublicProfiles } from "@/hooks/usePublicProfiles";
import { graphqlRequest } from "@/integrations/supabase/graphql";
import { useTournament } from "@/hooks/useTournament";
import { day1GroupForPlayer } from "@/lib/day1-pairings";
import { formatRecord, pairingIncludes, playerRecord, roundStatus } from "@/lib/scoring";
import { teamRailClass } from "@/lib/team-styles";
import { formatPayout } from "@/lib/purse";
import { contestHoleLabel } from "@/lib/tin-cup";

export const Route = createFileRoute("/player/$playerId")({
  head: () => ({
    meta: [
      { title: "Player Card — Tin Cup Invitational 2026" },
      {
        name: "description",
        content:
          "Match record, pairings and side cash for a single Tin Cup Invitational 2026 player.",
      },
      { property: "og:title", content: "Player Card — Tin Cup Invitational 2026" },
      {
        property: "og:description",
        content:
          "Every match, result and dollar won by one player at the 2026 Tin Cup Invitational.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlayerPage,
});

const RESULT_LABEL: Record<string, string> = {
  "strong-mental": "Strong Mental",
  "grass-roots": "Grass Roots",
  halved: "Halved",
};

function PlayerPage() {
  const { playerId } = Route.useParams();
  const { data, isPending, isError, refetch, isFetching } = useTournament();
  const { user } = useAuth();

  const { data: myPlayerId } = useQuery({
    queryKey: ["my-player", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const res = await graphqlRequest<
        { profiles_by_pk: { player_id: string | null } | null },
        { id: string }
      >(`query MyRosterSpot($id: uuid!) { profiles_by_pk(id: $id) { player_id } }`, {
        id: user!.id,
      });
      return res.profiles_by_pk?.player_id ?? null;
    },
  });

  const player = (data?.players ?? []).find((p) => p.id === playerId);
  const team = (data?.teams ?? []).find((t) => t.id === player?.team_id);
  const matches = data?.matches ?? [];
  const rounds = data?.rounds ?? [];
  const isYou = Boolean(myPlayerId && myPlayerId === playerId);
  const avatars = usePlayerAvatars(data?.players ?? [], data?.teams ?? []);
  const face = avatars.data?.byPlayerId.get(playerId);
  const publicProfiles = usePublicProfiles();
  const socialProfile = publicProfiles.data?.find((candidate) => candidate.player_id === playerId);

  if (isPending && !data) {
    return (
      <Shell>
        <LoadingRows rows={3} height={120} />
      </Shell>
    );
  }
  if (isError && !data) {
    return (
      <Shell>
        <ErrorState onRetry={() => void refetch()} busy={isFetching} />
      </Shell>
    );
  }
  if (!player || !team) {
    return (
      <Shell>
        <p className="t-body text-foreground">That player isn&apos;t on the roster.</p>
        <Link to="/rosters" className="press t-body mt-3 inline-block text-muted-foreground">
          Back to rosters →
        </Link>
      </Shell>
    );
  }

  const record = playerRecord(matches, player.name, team.slug);
  const shorthand = formatRecord(record);
  const mine = matches.filter(
    (m) => pairingIncludes(m.side_a, player.name) || pairingIncludes(m.side_b, player.name),
  );
  const claims = (data?.sideBets ?? []).filter((b) => b.player_name === player.name);
  const cash = claims.reduce((sum, c) => sum + Number(c.amount), 0);
  const d1 = day1GroupForPlayer(player.name);

  return (
    <Shell>
      <Link
        to="/rosters"
        className="press t-micro mb-4 inline-flex min-h-11 items-center gap-1 text-muted-foreground"
      >
        <ChevronLeft className="size-4" strokeWidth={1.7} /> Team hub
      </Link>

      <header className={`rounded-xl border border-border p-5 ${teamRailClass(team.slug)}`}>
        <div className="flex items-start gap-3">
          <Avatar name={player.name} teamSlug={team.slug} src={face?.url} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="t-eyebrow">{team.name}</p>
            <h1 className="t-title mt-1 text-foreground">{player.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {player.is_captain && (
                <span className="pill border-border text-muted-foreground">Captain</span>
              )}
              {isYou && (
                <span className="pill border-border bg-secondary text-foreground">
                  It&apos;s you
                </span>
              )}
              {socialProfile?.flair && (
                <span className="player-flair">
                  {socialProfile.flair.replace("vibes", "vibes captain")}
                </span>
              )}
            </div>
            {socialProfile?.status_text && (
              <p className="t-body mt-2 text-muted-foreground">“{socialProfile.status_text}”</p>
            )}
            {d1 && (
              <p className="t-micro mt-2 text-muted-foreground">
                Day 1 · w/ {d1.partner.split(" ")[0]} · vs {d1.opponents}
              </p>
            )}
          </div>
        </div>
        <p className="t-hero mt-4 text-foreground">
          {record.points}
          <span className="t-micro ml-2 font-normal text-muted-foreground">pts won</span>
        </p>
        <p className="t-micro mt-1 text-muted-foreground">
          {shorthand ? `${shorthand} record` : "No results posted yet"}
        </p>
      </header>

      <ShareMomentButton
        className="mt-3 w-full"
        payload={{
          kind: "player",
          eyebrow: team.name,
          title: player.name,
          primary: `${record.points} pts`,
          secondary: shorthand
            ? `${shorthand} record · ${formatPayout(cash)} side cash${socialProfile?.flair ? ` · ${socialProfile.flair.replace("vibes", "vibes captain")}` : ""}`
            : "Tin Cup Invitational 2026",
          canonicalUrl:
            typeof window === "undefined" ? "https://www.tincupinv.com/" : window.location.href,
        }}
      >
        Share player card
      </ShareMomentButton>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: "Won", value: record.won },
          { label: "Halved", value: record.halved },
          { label: "Lost", value: record.lost },
        ].map((stat) => (
          <div key={stat.label} className="surface-inset p-4 text-center">
            <p className="t-numeral text-foreground">{stat.value}</p>
            <p className="t-micro mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {(record.points > 0 || claims.length > 0 || player.is_captain) && (
        <section className="mt-6" aria-labelledby="player-achievements">
          <h2 id="player-achievements" className="t-eyebrow">
            Weekend achievements
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {player.is_captain && <li className="player-flair">Team captain</li>}
            {record.points > 0 && (
              <li className="player-flair">On the board · {record.points} pts</li>
            )}
            {claims.length > 0 && (
              <li className="player-flair">Side-pot winner · {claims.length}</li>
            )}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="t-eyebrow">Match timeline</h2>
        <ol className="relative mt-4 space-y-0 border-l border-border pl-4">
          {mine.map((match) => {
            const round = rounds.find((r) => r.id === match.round_id);
            const onA = pairingIncludes(match.side_a, player.name);
            const partnerSide = onA ? match.side_a : match.side_b;
            const opponents = onA ? match.side_b : match.side_a;
            const live = round && roundStatus(round) === "live";
            const decided = match.result !== "pending";
            return (
              <li key={match.id} className="relative pb-5 last:pb-0">
                <span
                  aria-hidden
                  className={`absolute -left-[1.3rem] top-1.5 size-2.5 rounded-full border ${
                    decided
                      ? "border-foreground/30 bg-secondary"
                      : live
                        ? "border-copper/50 bg-copper/40"
                        : "border-border bg-background"
                  }`}
                />
                <div className="flex items-baseline justify-between gap-3">
                  <span className="t-body min-w-0 truncate text-foreground">{match.label}</span>
                  <span
                    className={`t-body shrink-0 ${
                      match.result === "pending" ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {match.result === "pending"
                      ? `${match.points} pt${live ? " · live" : ""}`
                      : (RESULT_LABEL[match.result] ?? match.result)}
                  </span>
                </div>
                <p className="t-micro mt-0.5 truncate">
                  {round ? `${round.day_label} · ${round.course}` : "Round TBD"}
                </p>
                <p className="t-micro mt-0.5 truncate">
                  {partnerSide ?? player.name} vs {opponents ?? "TBD"}
                </p>
              </li>
            );
          })}
          {mine.length === 0 && (
            <li className="t-micro pb-1">Pairings post once the captains set the lineups.</li>
          )}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="t-eyebrow">Side cash</h2>
        {claims.length === 0 ? (
          <p className="t-micro mt-3">No CTP or long drive claims yet.</p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-border border-t border-border">
              {claims.map((claim) => (
                <li key={claim.id} className="flex items-baseline justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="t-body block truncate text-foreground">{claim.label}</span>
                    <span className="t-micro block">
                      {contestHoleLabel(claim.hole)}
                      {claim.distance ? ` · ${claim.distance}` : ""}
                    </span>
                  </span>
                  <span className="t-numeral shrink-0 text-copper">
                    {formatPayout(claim.amount)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="t-micro mt-2 text-copper">{formatPayout(cash)} won on the side board</p>
          </>
        )}
      </section>
    </Shell>
  );
}
