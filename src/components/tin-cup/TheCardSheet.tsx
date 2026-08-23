import { MedalMark } from "@/components/tin-cup/BrandMark";
import { TheCardTicket, type CardFace } from "@/components/tin-cup/TheCardTicket";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useJournal";
import { useMatchSocial } from "@/hooks/useMatchSocial";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { usePublicProfiles } from "@/hooks/usePublicProfiles";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import {
  CARD_DISCLAIMER,
  cardRecords,
  faceoffRiders,
  fridayCardMarkets,
  isYourMarket,
  peopleForMarket,
  takenCount,
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
  const social = useMatchSocial(user?.id, profile?.player_id);
  const profiles = usePublicProfiles();
  const avatars = usePlayerAvatars(players, teams);
  const markets = fridayCardMarkets(matches, rounds);
  const face = (name: string) => avatars.data?.getByName(name);
  const claimed = Boolean(profile?.player_id);
  const claimedName = claimed
    ? (players.find((player) => player.id === profile?.player_id)?.name ?? null)
    : null;
  const progress = takenCount(social.predictions, user?.id, markets, claimedName);
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
      <div className="mb-1.5 flex items-end justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <MedalMark size="xs" />
          <div>
            <h2 id="the-card-title" className="t-eyebrow">
              Faceoff
            </h2>
            <p className="t-micro">{CARD_DISCLAIMER}</p>
          </div>
        </div>
        {progress.total > 0 ? (
          <p className="t-micro tabular-nums text-muted-foreground">
            {progress.taken}/{progress.total} lined up
          </p>
        ) : null}
      </div>
      <div className="surface divide-y divide-border overflow-hidden">
        {markets.map((market) => {
          const people = peopleForMarket(market, face);
          const riders = faceoffRiders(social.predictions, market.matchIds);
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
