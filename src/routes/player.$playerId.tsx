import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "@/components/tin-cup/Avatar";
import { ShareMomentButton } from "@/components/tin-cup/ShareMomentButton";
import { ErrorState, LoadingRows, Shell } from "@/components/tin-cup/Shell";
import { useAuth } from "@/hooks/useAuth";
import { useMatchSocial } from "@/hooks/useMatchSocial";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { usePublicProfiles } from "@/hooks/usePublicProfiles";
import { graphqlRequest } from "@/integrations/supabase/graphql";
import { useTournament } from "@/hooks/useTournament";
import { day1GroupForPlayer, fridayPartnerLine, groupLine } from "@/lib/day1-pairings";
import { cardLine, fridayCardMarkets, pickOnMarket } from "@/lib/the-card";
import { formatRecord, pairingIncludes, playerRecord, roundStatus } from "@/lib/scoring";

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
  const matchSocial = useMatchSocial();
  const faceoffLines = fridayCardMarkets(matches, rounds)
    .map((market) => {
      if (!socialProfile) return null;
      const pick = pickOnMarket(matchSocial.predictions, socialProfile.id, market.matchIds);
      if (!pick) return null;
      return {
        id: market.id,
        ...cardLine({
          author: player?.name.trim().split(/\s+/)[0] ?? "Player",
          choice: pick.choice,
          sideA: market.sideA,
          sideB: market.sideB,
          note: pick.note,
        }),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

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
          Teams
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
  const matchLine = groupLine(player.name, isYou);
  const firstName = player.name.trim().split(/\s+/)[0] ?? player.name;
  const teamChip = team.name.replace("Team ", "");
  const hasPairing = Boolean(day1GroupForPlayer(player.name) || mine.length > 0);
  const fridayLine = fridayPartnerLine(player.name) ?? matchLine;

  return (
    <Shell>
      <Link
        to="/rosters"
        className="press t-micro mb-4 inline-flex min-h-11 items-center text-muted-foreground"
      >
        Teams
      </Link>

      <article className="surface px-4 py-[var(--space-5)]">
        <div className="flex items-center gap-4">
          <Link
            to={isYou ? "/profile" : "/photos"}
            className="press shrink-0 rounded-full"
            aria-label={isYou ? "Your face — open account" : `${firstName} in the vault`}
          >
            <Avatar name={player.name} teamSlug={team.slug} src={face?.url} size="xl" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="t-title text-foreground">{firstName}</h1>
              {isYou ? <span className="t-micro">You</span> : null}
            </div>
            <p className="mt-1.5">
              <span className="player-flair">{teamChip}</span>
              {player.is_captain ? <span className="player-flair ml-1">Captain</span> : null}
            </p>
            {fridayLine ? <p className="t-micro mt-2">{fridayLine}</p> : null}
            {shorthand && record.played > 0 ? (
              <p className="t-micro mt-0.5">{shorthand}</p>
            ) : null}
          </div>
        </div>
      </article>

      {hasPairing ? (
      <ShareMomentButton
        className="mt-3 w-full"
        payload={{
          kind: "player",
          eyebrow: team.name,
          title: player.name,
          primary: record.played > 0 ? `${record.points} pts` : fridayLine ?? teamChip,
          secondary: shorthand
            ? `${shorthand} record${cash > 0 ? ` · ${formatPayout(cash)} side cash` : ""}${socialProfile?.flair ? ` · ${socialProfile.flair.replace("vibes", "vibes captain")}` : ""}`
            : "Tin Cup Invitational 2026",
          canonicalUrl:
            typeof window === "undefined" ? "https://www.tincupinv.com/" : window.location.href,
        }}
      >
        Share card
      </ShareMomentButton>
      ) : null}

      {record.played > 0 ? (
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
      ) : null}

      {(record.points > 0 || claims.length > 0 || player.is_captain) && (
        <section className="mt-6" aria-labelledby="player-achievements">
          <h2 id="player-achievements" className="t-eyebrow">
            Weekend
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

      {faceoffLines.length > 0 ? (
        <section className="mt-6">
          <h2 className="t-eyebrow">Faceoff</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {faceoffLines.map((row) => (
              <li key={row.id} className="player-flair max-w-full">
                {row.title}
                {row.detail ? <span className="ml-1 font-medium italic">{row.detail}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="t-eyebrow">Matches</h2>
        <ol className="surface mt-2 divide-y divide-border overflow-hidden">
          {mine.map((match) => {
            const round = rounds.find((r) => r.id === match.round_id);
            const onA = pairingIncludes(match.side_a, player.name);
            const partnerSide = onA ? match.side_a : match.side_b;
            const opponents = onA ? match.side_b : match.side_a;
            const live = round && roundStatus(round) === "live";
            return (
              <li key={match.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="t-body min-w-0 truncate font-medium text-foreground">
                    {match.label}
                  </span>
                  <span
                    className={`t-micro shrink-0 ${
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
                  {" · "}
                  {partnerSide ?? player.name} vs {opponents ?? "TBD"}
                </p>
              </li>
            );
          })}
          {mine.length === 0 && (
            <li className="px-4 py-3">
              {day1GroupForPlayer(player.name) ? (
                <>
                  <p className="t-body font-medium text-foreground">Friday · South</p>
                  <p className="t-micro mt-0.5">
                    {fridayPartnerLine(player.name) ?? groupLine(player.name, isYou)}
                  </p>
                </>
              ) : (
                <p className="t-micro">Pairings post once the captains set the lineups.</p>
              )}
            </li>
          )}
        </ol>
      </section>

      {claims.length > 0 ? (
      <section className="mt-6">
        <h2 className="t-eyebrow">Side cash</h2>
            <ul className="surface mt-2 divide-y divide-border overflow-hidden">
              {claims.map((claim) => (
                <li key={claim.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
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
      </section>
      ) : null}
    </Shell>
  );
}
