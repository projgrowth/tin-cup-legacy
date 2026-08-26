import { useState } from "react";

import { TheCardTicket } from "@/components/tin-cup/TheCardTicket";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useJournal";
import { useMatchSocial } from "@/hooks/useMatchSocial";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { usePublicProfiles } from "@/hooks/usePublicProfiles";
import { useWeekendStory } from "@/hooks/useWeekendStory";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { rosterName } from "@/lib/profile-identity";
import {
  cardRecords,
  faceoffCrowd,
  faceoffRoasts,
  fridayCardMarkets,
  isYourMarket,
  peopleForMarket,
  predictionMomentKey,
} from "@/lib/the-card";
import type { ReactionKind } from "@/lib/weekend-story";

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
  const story = useWeekendStory(user?.id);
  const profiles = usePublicProfiles();
  const avatars = usePlayerAvatars(players, teams);
  const face = (name: string) => avatars.data?.getByName(name);
  const claimed = Boolean(profile?.player_id);
  const claimedName = claimed
    ? (players.find((player) => player.id === profile?.player_id)?.name ?? null)
    : null;
  const allMarkets = fridayCardMarkets(matches, rounds);
  const yours = claimedName
    ? allMarkets.find((market) => isYourMarket(market, claimedName))
    : undefined;
  const markets = claimedName
    ? allMarkets.filter((market) => !isYourMarket(market, claimedName))
    : allMarkets;
  const graded = matches.some((match) => match.result !== "pending");
  const records = graded ? cardRecords(social.predictions, matches).slice(0, 4) : [];
  const [moreCard, setMoreCard] = useState(false);
  const nameOf = (userId: string) => rosterName({ userId, players, profiles: profiles.data ?? [] });
  const rankedMarkets = [...markets].sort((a, b) => {
    const heat = (market: (typeof markets)[number]) => {
      const crowd = faceoffCrowd(social.predictions, market.matchIds);
      return crowd.sideA + crowd.sideB + faceoffRoasts(social.predictions, market.matchIds).length;
    };
    return heat(b) - heat(a);
  });
  const shownMarkets = moreCard ? rankedMarkets : rankedMarkets.slice(0, 2);
  const hiddenMarkets = Math.max(0, rankedMarkets.length - shownMarkets.length);

  function react(momentKey: string, kind: ReactionKind) {
    if (!user || !claimed) return;
    story.toggleReaction.mutate({ momentKey, kind });
  }

  if (!social.predictionsEnabled) return null;

  return (
    <section aria-labelledby="the-card-title">
      <div className="surface overflow-hidden">
        <div className="px-4 py-2.5">
          <h2 id="the-card-title" className="t-eyebrow">
            Faceoff
          </h2>
        </div>
        <div className="divide-y divide-border">
          {yours ? (
            <TheCardTicket
              market={yours}
              matches={matches}
              userId={user?.id}
              claimed={claimed}
              social={social}
              peopleA={peopleForMarket(yours, face).peopleA}
              peopleB={peopleForMarket(yours, face).peopleB}
              yours
              signedIn={Boolean(user)}
            />
          ) : null}
          {shownMarkets.map((market) => {
              const people = peopleForMarket(market, face);
              const roasts = faceoffRoasts(social.predictions, market.matchIds).map((pick) => ({
                userId: pick.userId,
                name: nameOf(pick.userId),
                note: pick.note!.trim(),
                matchIds: market.matchIds,
              }));
              const reactionCounts: Record<string, number> = {};
              for (const roast of roasts) {
                const key = predictionMomentKey(market.matchIds, roast.userId);
                reactionCounts[roast.userId] = story.reactions.filter(
                  (row) => row.moment_key === key,
                ).length;
              }
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
                  roasts={roasts}
                  yours={false}
                  signedIn={Boolean(user)}
                  reactionCounts={reactionCounts}
                  onReact={claimed ? react : undefined}
                />
              );
            })}
          {hiddenMarkets > 0 ? (
            <button
              type="button"
              onClick={() => setMoreCard(true)}
              className="press t-micro flex min-h-11 w-full items-center px-4 text-muted-foreground"
            >
              {hiddenMarkets} more
            </button>
          ) : null}
        </div>
      </div>
      {records.length > 0 ? (
        <ul className="mt-2">
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
