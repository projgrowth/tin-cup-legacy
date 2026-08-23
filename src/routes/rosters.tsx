import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Avatar } from "@/components/tin-cup/Avatar";
import { PageMasthead } from "@/components/tin-cup/PageMasthead";
import { ErrorState, Shell } from "@/components/tin-cup/Shell";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { usePublicProfiles } from "@/hooks/usePublicProfiles";
import { graphqlRequest } from "@/integrations/supabase/graphql";
import { useTournament } from "@/hooks/useTournament";
import { tallyStandings } from "@/lib/scoring";
import { FIELD_SIDES, fridayPartnerLine } from "@/lib/day1-pairings";

type RosterSearch = { side?: "strong-mental" | "grass-roots" };

export const Route = createFileRoute("/rosters")({
  validateSearch: (raw: Record<string, unknown>): RosterSearch => {
    const side = String(raw.side ?? "");
    return side === "grass-roots" || side === "strong-mental"
      ? { side: side as RosterSearch["side"] }
      : {};
  },
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
  const search = Route.useSearch();
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
  const pickedSide = search.side ?? myTeam?.slug ?? "strong-mental";

  return (
    <Shell variant="content">
      <div className="stack-page">
        <PageMasthead
          title="Teams"
          meta={
            standings.played > 0
              ? `${standings.strongMental}–${standings.grassRoots} · 13.5 to win`
              : `8 v 8 · 13.5 to win`
          }
        />

        {isError && !data && <ErrorState onRetry={() => void refetch()} busy={isFetching} />}

        <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Side">
          {FIELD_SIDES.map((side) => {
            const on = side.slug === pickedSide;
            return (
              <Link
                key={side.slug}
                role="tab"
                aria-selected={on}
                to="/rosters"
                search={{ side: side.slug }}
                replace
                className={`press chip min-h-11 w-full ${on ? "chip-on" : ""}`}
              >
                {side.name.replace("Team ", "")}
              </Link>
            );
          })}
        </div>

        <div className="stack-tight">
          {FIELD_SIDES.filter((side) => side.slug === pickedSide).map((side) => {
            return (
              <section key={side.slug} className="surface overflow-hidden">
                {myTeam?.slug === side.slug ? (
                  <p className="t-micro px-4 pb-1 pt-3">Your side</p>
                ) : null}
                <ul className="divide-y divide-border">
                  {side.players.map((name) => {
                    const player = playersByName.get(name.trim().toLowerCase());
                    const isYou = Boolean(player && myPlayerId === player.id);
                    const isCaptain = name === side.captain || Boolean(player?.is_captain);
                    const social = player
                      ? publicProfiles.data?.find((candidate) => candidate.player_id === player.id)
                      : undefined;
                    const friday = fridayPartnerLine(name);
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
                          {friday ? (
                            <span className="t-micro mt-0.5 block">Friday {friday}</span>
                          ) : null}
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
                              className="press flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-3.5"
                            >
                              {body}
                            </Link>
                          ) : (
                            <div className="flex min-h-14 min-w-0 flex-1 items-center px-4 py-3.5">
                              {body}
                            </div>
                          )}
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
