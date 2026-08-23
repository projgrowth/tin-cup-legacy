import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Avatar } from "@/components/tin-cup/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { useBanterVotes } from "@/hooks/useBanterVotes";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { useProfile } from "@/hooks/useJournal";
import type { Player, Team } from "@/hooks/useTournament";
import {
  BANTER_HEADER,
  BANTER_PROMPTS,
  BANTER_SUBLINE,
  mineOnPrompt,
  winnerForPrompt,
} from "@/lib/banter";
import { fridayRosterNames } from "@/lib/day1-pairings";
import { claimedPlayerIdFor } from "@/lib/profile-identity";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

const FACE = "size-[44px] text-[0.65rem]";

export function MostLikelySheet({
  players,
  teams,
}: {
  players: Player[];
  teams: Team[];
}) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const claimed = Boolean(claimedPlayerIdFor(user?.id, profile?.player_id));
  const canVote = Boolean(user && claimed);
  const { votes, vote } = useBanterVotes();
  const avatars = usePlayerAvatars(players, teams);
  const [index, setIndex] = useState(0);
  const prompt = BANTER_PROMPTS[index]!;
  const roster = fridayRosterNames()
    .map((name) => players.find((player) => player.name.trim().toLowerCase() === name.toLowerCase()))
    .filter((player): player is Player => Boolean(player));
  const winner = winnerForPrompt(votes, prompt.id);
  const winnerPlayer = winner ? players.find((player) => player.id === winner.playerId) : null;
  const mine = mineOnPrompt(votes, prompt.id, user?.id);

  async function pick(playerId: string) {
    if (!canVote) return;
    try {
      await vote(prompt.id, playerId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that");
    }
  }

  return (
    <section aria-labelledby="banter-title">
      <h2 id="banter-title" className="t-title px-1 text-foreground">
        {BANTER_HEADER}
      </h2>
      <p className="t-micro mb-1 px-1">{BANTER_SUBLINE}</p>
      <div className="surface px-[var(--space-5)] py-[var(--space-5)]">
        <p className="t-micro uppercase tracking-wide text-muted-foreground">Dare</p>
        <p className="t-title mt-1 text-foreground">{prompt.prompt}</p>
        {winnerPlayer ? (
          <div className="mt-[var(--space-3)] inline-flex items-center gap-2 rounded-full border border-hunter/40 bg-hunter/10 px-2 py-1">
            <Avatar
              name={winnerPlayer.name}
              teamSlug={teams.find((team) => team.id === winnerPlayer.team_id)?.slug}
              src={avatars.data?.byPlayerId.get(winnerPlayer.id)?.url}
              size="sm"
              className={FACE}
            />
            <p className="t-micro font-semibold text-foreground">
              {firstName(winnerPlayer.name)} · {prompt.chip}
            </p>
          </div>
        ) : (
          <p className="t-micro mt-[var(--space-3)] text-muted-foreground">Tap a face. No odds. Just the room.</p>
        )}
        <div className="mt-[var(--space-5)] grid grid-cols-4 gap-3">
          {roster.map((player) => {
            const selected = mine?.playerId === player.id;
            const face = (
              <>
                <Avatar
                  name={player.name}
                  teamSlug={teams.find((team) => team.id === player.team_id)?.slug}
                  src={avatars.data?.byPlayerId.get(player.id)?.url}
                  size="md"
                  className={`${FACE} ${selected ? "ring-2 ring-hunter" : ""}`}
                />
                <span className={`t-micro mt-1 block ${selected ? "text-hunter" : ""}`}>
                  {firstName(player.name)}
                </span>
              </>
            );
            if (!canVote) {
              return (
                <Link
                  key={player.id}
                  to="/profile"
                  className="press flex flex-col items-center text-center"
                  aria-label={firstName(player.name)}
                >
                  {face}
                </Link>
              );
            }
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => void pick(player.id)}
                aria-pressed={selected}
                aria-label={firstName(player.name)}
                className="press flex flex-col items-center text-center"
              >
                {face}
              </button>
            );
          })}
        </div>
        <div className="mt-[var(--space-5)] flex items-center justify-center gap-2">
          {BANTER_PROMPTS.map((row, i) => (
            <button
              key={row.id}
              type="button"
              aria-label={row.prompt}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`size-2 rounded-full ${i === index ? "bg-hunter" : "bg-border"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
