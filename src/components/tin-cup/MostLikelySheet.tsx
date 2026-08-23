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
  BANTER_SUBLINE,
  CUSTOM_PROMPT_MAX,
  activeWallPrompt,
  crowdSays,
  mineOnPrompt,
  pollFaces,
  resultForPrompt,
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
  const { votes, vote, createPrompt, prompts } = useBanterVotes();
  const avatars = usePlayerAvatars(players, teams);
  const [question, setQuestion] = useState("");
  const prompt = activeWallPrompt(prompts);
  const roster = fridayRosterNames()
    .map((name) => players.find((player) => player.name.trim().toLowerCase() === name.toLowerCase()))
    .filter((player): player is Player => Boolean(player));
  const faces = prompt ? pollFaces(roster, votes, prompt.id) : [];
  if (!prompt) return null;
  const promptId = prompt.id;
  const result = resultForPrompt(votes, promptId);
  const winnerPlayer = result ? players.find((player) => player.id === result.playerId) : null;
  const mine = mineOnPrompt(votes, promptId, user?.id);

  async function pick(playerId: string) {
    if (!canVote) return;
    try {
      await vote(promptId, playerId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that");
    }
  }

  async function postQuestion() {
    const body = question.trim();
    if (!body || !canVote) return;
    try {
      await createPrompt(body);
      setQuestion("");
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
      <div className="py-[var(--space-2)]">
        <p className="t-micro uppercase tracking-wide text-muted-foreground">Most likely</p>
        <p className="t-title mt-1 text-foreground">{prompt.prompt}</p>
        {winnerPlayer && result ? (
          <p className="t-body mt-[var(--space-3)] text-foreground">
            {crowdSays(firstName(winnerPlayer.name), prompt, result.percent)}
          </p>
        ) : (
          <p className="t-micro mt-[var(--space-3)] text-muted-foreground">Tap a face. No odds. Just the room.</p>
        )}
        <div className="mt-[var(--space-5)] grid grid-cols-2 gap-3">
          {faces.map((player) => {
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
        {canVote ? (
          <div className="mt-[var(--space-5)]">
            <label className="sr-only" htmlFor="sheet-most-likely">
              Most likely to…
            </label>
            <input
              id="sheet-most-likely"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={CUSTOM_PROMPT_MAX}
              placeholder="Most likely to…"
              className="control w-full text-base"
            />
            <button
              type="button"
              disabled={!question.trim()}
              onClick={() => void postQuestion()}
              className="press btn-primary mt-[var(--space-3)] min-h-11 px-4 text-sm font-semibold"
            >
              Post
            </button>
          </div>
        ) : (
          <Link to="/profile" className="press mt-[var(--space-5)] block">
            <p className="t-body text-muted-foreground">Most likely to…</p>
          </Link>
        )}
      </div>
    </section>
  );
}
