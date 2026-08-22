import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";

import { Avatar } from "@/components/tin-cup/Avatar";
import { ClaimQrButton } from "@/components/tin-cup/ClaimQr";
import { PageMasthead } from "@/components/tin-cup/PageMasthead";
import { ErrorState, Shell } from "@/components/tin-cup/Shell";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { usePublicProfiles } from "@/hooks/usePublicProfiles";
import { graphqlRequest } from "@/integrations/supabase/graphql";
import { useTournament } from "@/hooks/useTournament";
import { tallyStandings } from "@/lib/scoring";
import { EXPECTED_PLAYER_COUNT } from "@/lib/tin-cup";
import { FIELD_SIDES } from "@/lib/day1-pairings";

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
  const { data, isError, refetch, isFetching } = useTournament();
  const { user } = useAuth();
  const standings = tallyStandings(data?.matches ?? []);
  const teams = data?.teams ?? [];
  const players = data?.players ?? [];
  const avatars = usePlayerAvatars(players, teams);
  const publicProfiles = usePublicProfiles();

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

  const playersByName = useMemo(() => {
    const map = new Map<string, (typeof players)[number]>();
    for (const player of players) map.set(player.name.trim().toLowerCase(), player);
    return map;
  }, [players]);

  return (
    <Shell variant="content">
      <div className="stack-page">
        <PageMasthead
          title="Teams"
          meta={`${EXPECTED_PLAYER_COUNT} players · 13.5 to win`}
        />
        {standings.played > 0 && (
          <p className="t-body px-1 text-foreground">
            <span className="text-hunter">Strong Mental {standings.strongMental}</span>
            <span className="mx-2 text-muted-foreground">vs</span>
            <span className="text-stone">Grass Roots {standings.grassRoots}</span>
          </p>
        )}

        {!myPlayerId && (
          <Link
            to="/profile"
            className="press t-micro inline-flex min-h-11 items-center text-muted-foreground"
          >
            Claim your spot
          </Link>
        )}

        {isError && !data && <ErrorState onRetry={() => void refetch()} busy={isFetching} />}

        <div className="stack-tight lg:grid lg:grid-cols-2 lg:gap-8">
          {FIELD_SIDES.map((side) => {
            const liveTeam = teams.find((team) => team.slug === side.slug);
            return (
              <section key={side.slug} className="surface overflow-hidden">
                <div className="px-4 pb-1 pt-3">
                <h2
                  className={`t-micro font-semibold ${
                    side.slug === "strong-mental" ? "text-hunter" : "text-stone"
                  }`}
                >
                  {side.name.replace("Team ", "")}
                </h2>
                <p className="t-micro mt-0.5">
                  Capt. {liveTeam?.captain_name ?? side.captain}
                  {myTeam?.slug === side.slug ? " · Your side" : ""}
                </p>
                </div>
                <ul className="divide-y divide-border">
                  {side.players.map((name) => {
                    const player = playersByName.get(name.trim().toLowerCase());
                    const isYou = Boolean(player && myPlayerId === player.id);
                    const isCaptain = name === side.captain || Boolean(player?.is_captain);
                    const social = player
                      ? publicProfiles.data?.find((candidate) => candidate.player_id === player.id)
                      : undefined;
                    const body = (
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <Avatar
                          name={name}
                          teamSlug={side.slug}
                          src={player ? avatars.data?.byPlayerId.get(player.id)?.url : undefined}
                          size="md"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="t-body flex items-center gap-2 truncate font-medium text-foreground">
                            <span className="truncate">{name}</span>
                            {isCaptain ? (
                              <span className="t-micro text-muted-foreground">C</span>
                            ) : null}
                            {isYou ? (
                              <span className="t-micro shrink-0 text-muted-foreground">You</span>
                            ) : null}
                          </span>
                          {social?.status_text ? (
                            <span className="t-micro mt-0.5 block truncate">{social.status_text}</span>
                          ) : null}
                        </span>
                      </span>
                    );
                    return (
                      <li key={name} className={isYou ? "bg-secondary/40" : ""}>
                        <div className="flex items-center pr-1">
                          {player ? (
                            <Link
                              to="/player/$playerId"
                              params={{ playerId: player.id }}
                              className="press flex min-h-14 min-w-0 flex-1 items-center justify-between gap-3 px-1 py-3.5"
                            >
                              {body}
                              <ChevronRight
                                className="size-4 shrink-0 text-muted-foreground"
                                strokeWidth={1.7}
                              />
                            </Link>
                          ) : (
                            <div className="flex min-h-14 min-w-0 flex-1 items-center px-1 py-3.5">
                              {body}
                            </div>
                          )}
                          {player && isYou ? (
                            <ClaimQrButton
                              player={{
                                id: player.id,
                                name: player.name,
                                teamName: liveTeam?.name ?? side.name,
                              }}
                            />
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
