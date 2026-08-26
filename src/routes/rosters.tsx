import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Avatar } from "@/components/tin-cup/Avatar";
import { ErrorState, Shell } from "@/components/tin-cup/Shell";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { graphqlRequest } from "@/integrations/supabase/graphql";
import { useTournament } from "@/hooks/useTournament";
import { FIELD_SIDES, fridayPartnerName } from "@/lib/day1-pairings";

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
  const teams = data?.teams ?? [];
  const players = data?.players ?? [];
  const avatars = usePlayerAvatars(players, teams);

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
  const myPartner = myPlayer ? fridayPartnerName(myPlayer.name) : null;

  const playersByName = useMemo(() => {
    const map = new Map<string, (typeof players)[number]>();
    for (const player of players) map.set(player.name.trim().toLowerCase(), player);
    return map;
  }, [players]);
  const pickedSide = search.side ?? myTeam?.slug ?? "strong-mental";

  return (
    <Shell variant="content">
      <div className="stack-page">
        {isError && !data && <ErrorState onRetry={() => void refetch()} busy={isFetching} />}

        <div className="grid grid-cols-2 gap-2 md:hidden" role="tablist" aria-label="Side">
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
                {myTeam?.slug === side.slug ? " · You" : ""}
              </Link>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {FIELD_SIDES.map((side) => {
            const hiddenOnMobile = side.slug !== pickedSide;
            const rail = side.slug === "strong-mental" ? "border-hunter" : "border-stone";
            return (
              <section
                key={side.slug}
                className={`surface overflow-hidden border-t-2 ${rail} ${hiddenOnMobile ? "hidden md:block" : ""}`}
              >
                <p className="t-micro hidden px-4 pb-1 pt-3 text-muted-foreground md:block">
                  {side.name.replace("Team ", "")}
                  {myTeam?.slug === side.slug ? " · Your side" : ""}
                </p>
                <ul className="divide-y divide-border">
                  {side.players.map((name) => {
                    const player = playersByName.get(name.trim().toLowerCase());
                    const isYou = Boolean(player && myPlayerId === player.id);
                    const isPartner = Boolean(myPartner && name.split(/\s+/)[0] === myPartner);
                    const isCaptain = name === side.captain || Boolean(player?.is_captain);
                    const friday = fridayPartnerName(name);
                    const face = player ? avatars.data?.byPlayerId.get(player.id)?.url : undefined;
                    const body = (
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <Avatar
                          name={name}
                          teamSlug={side.slug}
                          src={face}
                          size="sm"
                          fallback="ink"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="t-body flex items-center gap-2 truncate font-medium text-foreground">
                            <span className="truncate">{name.split(" ")[0]}</span>
                            {isCaptain ? (
                              <span className="t-micro text-muted-foreground">C</span>
                            ) : null}
                            {isYou ? (
                              <span className="t-micro shrink-0 text-hunter">You</span>
                            ) : isPartner ? (
                              <span className="t-micro shrink-0">Friday</span>
                            ) : null}
                          </span>
                          {friday ? (
                            <span className="t-micro mt-0.5 block truncate">w/ {friday}</span>
                          ) : null}
                        </span>
                      </span>
                    );
                    return (
                      <li key={name} className={isYou || isPartner ? "bg-secondary/40" : ""}>
                        {player ? (
                          <Link
                            to="/player/$playerId"
                            params={{ playerId: player.id }}
                            className="press flex min-h-14 min-w-0 items-center gap-3 px-4 py-3.5"
                          >
                            {body}
                          </Link>
                        ) : (
                          <div className="flex min-h-14 min-w-0 items-center px-4 py-3.5">
                            {body}
                          </div>
                        )}
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
