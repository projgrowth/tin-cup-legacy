import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Avatar } from "@/components/tin-cup/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { useBanterVotes } from "@/hooks/useBanterVotes";
import { faceUrl, usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { useProfile } from "@/hooks/useJournal";
import { useWeekendStory } from "@/hooks/useWeekendStory";
import type { Player, Team } from "@/hooks/useTournament";
import {
  CUSTOM_PROMPT_MAX,
  activeWallPrompt,
  crowdSays,
  mineOnPrompt,
  pollFaces,
  resultForPrompt,
} from "@/lib/banter";
import { fridayRosterNames } from "@/lib/day1-pairings";
import { claimedPlayerIdFor } from "@/lib/profile-identity";
import { CLUBHOUSE_MOMENT_KEY } from "@/lib/social-platform";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function LockerWall({
  players,
  teams,
}: {
  players: Player[];
  teams: Team[];
}) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const claimed = Boolean(claimedPlayerIdFor(user?.id, profile?.player_id));
  const canTalk = Boolean(user && claimed);
  const { votes, vote, createPrompt, prompts } = useBanterVotes();
  const story = useWeekendStory(user?.id);
  const avatars = usePlayerAvatars(players, teams);
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState("");
  const roster = fridayRosterNames()
    .map((name) => players.find((player) => player.name.trim().toLowerCase() === name.toLowerCase()))
    .filter((player): player is Player => Boolean(player));
  const latestRoast = [...story.clubhousePosts]
    .filter((post) => post.body.trim() && !post.pinned_at)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  const prompt = activeWallPrompt(prompts);
  const faces = prompt ? pollFaces(roster, votes, prompt.id) : roster;

  async function postRoast() {
    const body = draft.trim();
    if (!body) return;
    story.addComment.mutate(
      {
        momentKey: CLUBHOUSE_MOMENT_KEY,
        body,
      },
      {
        onSuccess: () => setDraft(""),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  async function pick(promptId: string, playerId: string) {
    if (!canTalk) return;
    try {
      await vote(promptId, playerId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that");
    }
  }

  async function postQuestion() {
    const body = question.trim();
    if (!body || !canTalk) return;
    try {
      await createPrompt(body);
      setQuestion("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that");
    }
  }

  return (
    <section aria-label="The wall" className="stack">
      <div>
        {latestRoast ? (
          <p className="t-body italic text-foreground">“{latestRoast.body.trim()}”</p>
        ) : (
          <p className="t-micro">The wall</p>
        )}
        {canTalk ? (
          <>
            <label className="sr-only" htmlFor="wall-roast">
              Talk your shit
            </label>
            <textarea
              id="wall-roast"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Talk your shit"
              className="control mt-[var(--space-3)] w-full resize-none text-base"
            />
            <button
              type="button"
              disabled={!draft.trim() || story.addComment.isPending}
              onClick={() => void postRoast()}
              className="press btn-primary mt-[var(--space-3)] min-h-11 px-4 text-sm font-semibold"
            >
              Post
            </button>
          </>
        ) : (
          <Link to="/profile" className="press mt-[var(--space-3)] block min-h-11">
            <p className="t-micro">Talk your shit</p>
          </Link>
        )}
      </div>

      <div>
        {prompt ? (
          <>
            <p className="t-body text-foreground">{prompt.prompt}</p>
            {(() => {
              const result = resultForPrompt(votes, prompt.id);
              const winnerPlayer = result
                ? players.find((player) => player.id === result.playerId)
                : null;
              const mine = mineOnPrompt(votes, prompt.id, user?.id);
              return (
                <>
                  {winnerPlayer && result ? (
                    <p className="t-micro mt-[var(--space-2)] text-foreground">
                      {crowdSays(firstName(winnerPlayer.name), prompt, result.percent)}
                    </p>
                  ) : null}
                  <div className="mt-[var(--space-3)] grid grid-cols-8 gap-x-1 gap-y-2">
                    {faces.map((player) => {
                      const selected = mine?.playerId === player.id;
                      const src = faceUrl(avatars.data, player.name, player.id);
                      const face = (
                        <>
                          <Avatar
                            name={player.name}
                            src={src}
                            size="sm"
                            className={selected ? "ring-2 ring-hunter" : ""}
                          />
                          <span className={`t-micro mt-1 block truncate ${selected ? "text-hunter" : ""}`}>
                            {firstName(player.name)}
                          </span>
                        </>
                      );
                      if (!canTalk) {
                        return (
                          <Link
                            key={player.id}
                            to="/profile"
                            className="press flex min-w-0 flex-col items-center text-center"
                          >
                            {face}
                          </Link>
                        );
                      }
                      return (
                        <button
                          key={player.id}
                          type="button"
                          aria-pressed={selected}
                          aria-label={firstName(player.name)}
                          onClick={() => void pick(prompt.id, player.id)}
                          className="press flex min-w-0 flex-col items-center text-center"
                        >
                          {face}
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </>
        ) : (
          <p className="t-micro">No dares yet.</p>
        )}

        <div className="mt-[var(--space-4)]">
          {canTalk ? (
            <>
              <label className="sr-only" htmlFor="wall-most-likely">
                Most likely to…
              </label>
              <input
                id="wall-most-likely"
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
            </>
          ) : (
            <Link to="/profile" className="press flex min-h-11 items-center">
              <p className="t-micro">Most likely to…</p>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
