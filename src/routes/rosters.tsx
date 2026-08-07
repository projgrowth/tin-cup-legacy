import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

import { Monogram } from "@/components/tin-cup/Monogram";
import { ErrorState, LoadingRows, PageHeading, Shell } from "@/components/tin-cup/Shell";
import { WhatsAppGroupButton } from "@/components/tin-cup/WhatsAppLinks";
import { useAuth } from "@/hooks/useAuth";
import { graphqlRequest } from "@/integrations/nhost/graphql";
import { useTournament } from "@/hooks/useTournament";
import { day1GroupForPlayer } from "@/lib/day1-pairings";
import { formatRecord, playerRecord, tallyStandings } from "@/lib/scoring";
import { sideBetShortLabel } from "@/lib/side-bets";
import { teamRailClass } from "@/lib/team-styles";
import { formatPayout } from "@/lib/purse";

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
  const bets = data?.sideBets ?? [];
  const players = data?.players ?? [];
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
      <PageHeading eyebrow="Locker room" title="Teams" />

      <div className="stack-page">
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

        <div className="flex gap-1 rounded-xl border border-border bg-secondary/40 p-1">
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => setActiveSlug(team.slug)}
              className={`press t-body min-h-11 flex-1 rounded-lg px-2 py-2 font-semibold ${
                selected?.id === team.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {team.name.replace("Team ", "")}
            </button>
          ))}
        </div>

        <Link
          to="/profile"
          className="press flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
        >
          <span className="flex min-w-0 items-center gap-3">
            {myPlayer && myTeam ? (
              <Monogram name={myPlayer.name} teamSlug={myTeam.slug} size="sm" />
            ) : null}
            <span className="t-body font-medium text-foreground">
              {myPlayerId ? "Your hub" : "Claim your spot"}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
        </Link>

        <WhatsAppGroupButton className="w-full" />

        {isPending && !data && <LoadingRows rows={2} height={280} />}
        {isError && !data && <ErrorState onRetry={() => void refetch()} busy={isFetching} />}

        {selected && (
          <section className={`surface-raised overflow-hidden ${teamRailClass(selected.slug)}`}>
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
            <ul className="divide-y divide-border">
              {players
                .filter((p) => p.team_id === selected.id)
                .map((player) => {
                  const claims = bets.filter((b) => b.player_name === player.name);
                  const record = playerRecord(data?.matches ?? [], player.name, selected.slug);
                  const shorthand = formatRecord(record);
                  const d1 = day1GroupForPlayer(player.name);
                  const isYou = myPlayerId === player.id;
                  const sub = d1
                    ? `w/ ${d1.partner.split(" ")[0]} · vs ${d1.opponents}`
                    : claims.length > 0
                      ? `${claims.map((c) => sideBetShortLabel(c.kind)).join(" · ")} · ${formatPayout(claims.reduce((sum, c) => sum + Number(c.amount), 0))}`
                      : null;
                  return (
                    <li key={player.id} className={isYou ? "bg-secondary/40" : ""}>
                      <Link
                        to="/player/$playerId"
                        params={{ playerId: player.id }}
                        className="press flex items-center justify-between gap-3 px-4 py-3.5"
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-3">
                          <Monogram
                            name={player.name}
                            teamSlug={selected.slug}
                            size="sm"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="t-body flex items-center gap-2 truncate font-medium text-foreground">
                              <span className="truncate">{player.name}</span>
                              {player.is_captain && (
                                <span className="t-micro text-muted-foreground">C</span>
                              )}
                              {isYou && (
                                <span className="t-micro shrink-0 text-muted-foreground">You</span>
                              )}
                            </span>
                            {sub && (
                              <span className="t-micro mt-0.5 block truncate text-muted-foreground">
                                {sub}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="t-numeral text-right text-foreground/90">
                            {shorthand ?? "—"}
                          </span>
                          <ChevronRight className="size-4 text-muted-foreground" strokeWidth={1.7} />
                        </span>
                      </Link>
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
