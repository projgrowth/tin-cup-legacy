import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

import { Avatar } from "@/components/tin-cup/Avatar";
import { ClaimQrButton } from "@/components/tin-cup/ClaimQr";
import { PageMasthead } from "@/components/tin-cup/PageMasthead";
import { ErrorState, LoadingRows, Shell } from "@/components/tin-cup/Shell";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { usePublicProfiles } from "@/hooks/usePublicProfiles";
import { graphqlRequest } from "@/integrations/supabase/graphql";
import { useTournament } from "@/hooks/useTournament";
import { tallyStandings } from "@/lib/scoring";
import { teamRailClass } from "@/lib/team-styles";
import { EXPECTED_PLAYER_COUNT } from "@/lib/tin-cup";

export const Route = createFileRoute("/rosters")({
  head: () => ({
    meta: [
      { title: "Rosters — Team Strong Mental vs Team Grass Roots" },
      {
        name: "description",
        content:
          "The full 2026 Tin Cup Invitational rosters for Team Strong Mental and Team Grass Roots.",
      },
      { property: "og:title", content: "Rosters — Team Strong Mental vs Team Grass Roots" },
      {
        property: "og:description",
        content: "The 2026 Tin Cup Invitational sides, captains, and player profiles.",
      },
    ],
  }),
  component: RostersPage,
});

function RostersPage() {
  const { data, isPending, isError, refetch, isFetching } = useTournament();
  const { user } = useAuth();
  const standings = tallyStandings(data?.matches ?? []);
  const teams = data?.teams ?? [];
  const players = data?.players ?? [];
  const avatars = usePlayerAvatars(players, teams);
  const publicProfiles = usePublicProfiles();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const { data: myPlayerId } = useQuery({
    queryKey: ["my-player", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const data = await graphqlRequest<
        { profiles_by_pk: { player_id: string | null } | null },
        { id: string }
      >(`query MyRosterSpot($id: uuid!) { profiles_by_pk(id: $id) { player_id } }`, {
        id: user!.id,
      });
      return data.profiles_by_pk?.player_id ?? null;
    },
  });

  const myPlayer = useMemo(
    () => players.find((p) => p.id === myPlayerId) ?? null,
    [players, myPlayerId],
  );
  const myTeam = useMemo(
    () => (myPlayer ? teams.find((t) => t.id === myPlayer.team_id) : null),
    [myPlayer, teams],
  );

  // Default tab to your team when claimed
  useEffect(() => {
    if (myTeam && !activeSlug) setActiveSlug(myTeam.slug);
  }, [myTeam, activeSlug]);

  const selected = useMemo(() => {
    if (!teams.length) return null;
    const slug = activeSlug ?? teams[0]?.slug ?? null;
    return teams.find((t) => t.slug === slug) ?? teams[0];
  }, [teams, activeSlug]);

  return (
    <Shell variant="dashboard">
      <div className="stack-page">
        <PageMasthead
          kicker="The field"
          title="Two teams. One Cup."
          meta={`Meet the ${EXPECTED_PLAYER_COUNT} players chasing 13.5 points.`}
        />
        {teams.length === 2 && (
          <section className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
            {teams.map((team, index) => {
              const points =
                team.slug === "strong-mental" ? standings.strongMental : standings.grassRoots;
              const active = selected?.id === team.id;
              const isMine = myTeam?.id === team.id;
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setActiveSlug(team.slug)}
                  className={`press rounded-lg px-2 py-2 transition-colors ${
                    index === 1 ? "col-start-3" : ""
                  } ${active ? "bg-secondary/80" : ""}`}
                >
                  <p
                    className={`t-micro ${
                      team.slug === "strong-mental" ? "text-gold-light" : "text-copper"
                    }`}
                  >
                    {team.name.replace("Team ", "")}
                    {isMine ? " · You" : ""}
                  </p>
                  <p className="t-hero mt-1 text-foreground">{points}</p>
                </button>
              );
            })}
            <div className="col-start-2 row-start-1">
              <p className="t-micro text-muted-foreground">vs</p>
            </div>
          </section>
        )}

        {!myPlayerId && (
          <Link
            to="/profile"
            className="press surface flex items-center justify-between gap-3 px-4 py-3"
          >
            <span className="t-body font-medium text-foreground">Claim your spot</span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
          </Link>
        )}

        {isPending && !data && <LoadingRows rows={2} height={280} />}
        {isError && !data && <ErrorState onRetry={() => void refetch()} busy={isFetching} />}

        {selected && (
          <section className={`surface overflow-hidden ${teamRailClass(selected.slug)}`}>
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="t-title text-foreground">{selected.name}</h2>
                  <p className="t-micro mt-0.5 text-muted-foreground">
                    Capt. {selected.captain_name}
                    {myTeam?.id === selected.id ? " · Your side" : ""}
                  </p>
                </div>
                <span
                  className={`t-numeral ${
                    selected.slug === "strong-mental" ? "text-gold-light" : "text-copper"
                  }`}
                >
                  {selected.slug === "strong-mental"
                    ? standings.strongMental
                    : standings.grassRoots}
                </span>
              </div>
            </div>
            <ul className="divide-y divide-border lg:grid lg:grid-cols-2 lg:divide-y-0">
              {players
                .filter((p) => p.team_id === selected.id)
                .map((player) => {
                  const isYou = myPlayerId === player.id;
                  const social = publicProfiles.data?.find(
                    (candidate) => candidate.player_id === player.id,
                  );
                  return (
                    <li
                      key={player.id}
                      className={`border-b border-border lg:[&:nth-child(odd)]:border-r ${isYou ? "bg-secondary/40" : ""}`}
                    >
                      <div className="flex items-center pr-1">
                        <Link
                          to="/player/$playerId"
                          params={{ playerId: player.id }}
                          className="press flex min-h-14 min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3.5"
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-3">
                            <Avatar
                              name={player.name}
                              teamSlug={selected.slug}
                              src={avatars.data?.byPlayerId.get(player.id)?.url}
                              size="md"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="t-body flex items-center gap-2 truncate font-medium text-foreground">
                                <span className="truncate">{player.name}</span>
                                {player.is_captain && (
                                  <span className="t-micro text-muted-foreground">C</span>
                                )}
                                {isYou && (
                                  <span className="t-micro shrink-0 text-muted-foreground">
                                    You
                                  </span>
                                )}
                              </span>
                              {(social?.flair || social?.status_text) && (
                                <span className="t-micro mt-0.5 block truncate">
                                  {social.flair
                                    ? social.flair.replace("vibes", "vibes captain")
                                    : ""}
                                  {social.flair && social.status_text ? " · " : ""}
                                  {social.status_text ?? ""}
                                </span>
                              )}
                            </span>
                          </span>
                          <ChevronRight
                            className="size-4 shrink-0 text-muted-foreground"
                            strokeWidth={1.7}
                          />
                        </Link>
                        <ClaimQrButton
                          player={{ id: player.id, name: player.name, teamName: selected.name }}
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}
      </div>
    </Shell>
  );
}
