import { TheCardTicket, type CardFace } from "@/components/tin-cup/TheCardTicket";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useJournal";
import { useMatchSocial } from "@/hooks/useMatchSocial";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { usePublicProfiles } from "@/hooks/usePublicProfiles";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { claimedPlayerIdFor } from "@/lib/profile-identity";
import {
  CARD_DISCLAIMER,
  cardRecords,
  faceoffRiders,
  faceoffRoasts,
  fridayCardMarkets,
  isYourMarket,
  peopleForMarket,
} from "@/lib/the-card";

export function TheCardSheet({
  matches,
  rounds,
  players = [],
  teams = [],
}: {
  matches: Match[];
  rounds: Round[];
  players?: Player[];
  teams?: Team[];
}) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const playerId = claimedPlayerIdFor(user?.id, profile?.player_id);
  const social = useMatchSocial(user?.id, playerId);
  const profiles = usePublicProfiles();
  const avatars = usePlayerAvatars(players, teams);
  const face = (name: string) => avatars.data?.getByName(name);
  const claimed = Boolean(playerId);
  const claimedName = claimed
    ? (players.find((player) => player.id === playerId)?.name ?? null)
    : null;
  const allMarkets = fridayCardMarkets(matches, rounds);
  const markets = allMarkets;
  const graded = matches.some((match) => match.result !== "pending");
  const records = graded ? cardRecords(social.predictions, matches).slice(0, 4) : [];
  const nameOf = (userId: string) => {
    const row = (profiles.data ?? []).find((item) => item.id === userId);
    if (row?.display_name) return row.display_name.trim().split(/\s+/)[0] ?? row.display_name;
    const player = players.find((item) => item.id === row?.player_id);
    return player?.name.trim().split(/\s+/)[0] ?? "Player";
  };
  const faceForUser = (userId: string): CardFace => {
    const row = (profiles.data ?? []).find((item) => item.id === userId);
    const player = players.find((item) => item.id === row?.player_id);
    const name = player?.name || row?.display_name || "Player";
    const team = player ? teams.find((item) => item.id === player.team_id) : null;
    return {
      name,
      teamSlug: team?.slug,
      src: player ? avatars.data?.byPlayerId.get(player.id)?.url : null,
    };
  };

  if (!social.predictionsEnabled) return null;

  return (
    <section aria-labelledby="the-card-title">
      <h2 id="the-card-title" className="t-eyebrow mb-1.5 px-1">
        {CARD_DISCLAIMER}
      </h2>
      <div className="surface divide-y divide-border overflow-hidden">
        {markets.map((market) => {
          const people = peopleForMarket(market, face);
          const riders = faceoffRiders(social.predictions, market.matchIds);
          const roasts = faceoffRoasts(social.predictions, market.matchIds).map((pick) => ({
            userId: pick.userId,
            name: nameOf(pick.userId),
            note: pick.note!.trim(),
          }));
          return (
            <TheCardTicket
              key={market.id}
              market={market}
              matches={matches}
              userId={user?.id}
              claimed={claimed}
              social={social}
              peopleA={people.peopleA}
              peopleB={people.peopleB}
              crowdA={riders.sideA.map(faceForUser)}
              crowdB={riders.sideB.map(faceForUser)}
              roasts={roasts}
              yours={isYourMarket(market, claimedName)}
            />
          );
        })}
      </div>
      {records.length > 0 ? (
        <ul className="mt-2 px-1">
          {records.map((row) => (
            <li key={row.userId} className="t-micro flex justify-between gap-3 py-1">
              <span className="text-foreground">{nameOf(row.userId)}</span>
              <span className="tabular-nums text-muted-foreground">
                {row.cashed} called · {row.pending} live
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
