import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Avatar } from "@/components/tin-cup/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { useBanterVotes } from "@/hooks/useBanterVotes";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { useProfile } from "@/hooks/useJournal";
import { usePublicProfiles } from "@/hooks/usePublicProfiles";
import { useWeekendStory } from "@/hooks/useWeekendStory";
import type { Player, Team } from "@/hooks/useTournament";
import {
  BANTER_HEADER,
  BANTER_SUBLINE,
  CUSTOM_PROMPT_MAX,
  mineOnPrompt,
  winnerForPrompt,
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
  const profiles = usePublicProfiles();
  const [draft, setDraft] = useState("");
  const [tagId, setTagId] = useState<string | null>(null);
  const [openPrompt, setOpenPrompt] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const roster = fridayRosterNames()
    .map((name) => players.find((player) => player.name.trim().toLowerCase() === name.toLowerCase()))
    .filter((player): player is Player => Boolean(player));
  const tagged = tagId ? players.find((player) => player.id === tagId) : null;
  const latestRoast = [...story.clubhousePosts]
    .filter((post) => post.body.trim() && !post.pinned_at)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];

  function userIdForPlayer(playerId: string) {
    return profiles.data?.find((row) => row.player_id === playerId)?.id;
  }

  function postRoast() {
    const body = draft.trim();
    if (!body) return;
    const taggedName = tagged ? firstName(tagged.name) : null;
    const text = taggedName && !body.includes(taggedName) ? `${body} · @${taggedName}` : body;
    story.addComment.mutate(
      {
        momentKey: CLUBHOUSE_MOMENT_KEY,
        body: text,
        mentionedUserId: tagged ? userIdForPlayer(tagged.id) : undefined,
      },
      {
        onSuccess: () => {
          setDraft("");
          setTagId(null);
        },
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
    <section aria-labelledby="wall-title">
      <h2 id="wall-title" className="t-title px-1 text-foreground">
        {BANTER_HEADER}
      </h2>
      <p className="t-micro mb-1 px-1">{BANTER_SUBLINE}</p>
      <div className="surface divide-y divide-border overflow-hidden">
        <div className="px-[var(--space-5)] py-[var(--space-5)]">
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
                className="control w-full resize-none text-base"
              />
              <div className="mt-[var(--space-3)] flex flex-wrap items-center gap-2">
                {roster.slice(0, 16).map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setTagId((cur) => (cur === player.id ? null : player.id))}
                    aria-pressed={tagId === player.id}
                    className={`press ${tagId === player.id ? "ring-2 ring-hunter rounded-full" : ""}`}
                    aria-label={`Tag ${firstName(player.name)}`}
                  >
                    <Avatar
                      name={player.name}
                      teamSlug={teams.find((team) => team.id === player.team_id)?.slug}
                      src={avatars.data?.byPlayerId.get(player.id)?.url}
                      size="sm"
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!draft.trim() || story.addComment.isPending}
                onClick={postRoast}
                className="press btn-primary mt-[var(--space-3)] min-h-11 px-4 text-sm font-semibold"
              >
                Post
              </button>
            </>
          ) : (
            <Link to="/profile" className="press block">
              <p className="t-body text-muted-foreground">Talk your shit</p>
            </Link>
          )}
          {latestRoast ? (
            <p className="t-body mt-[var(--space-5)] italic text-foreground/90">
              “{latestRoast.body.trim()}”
            </p>
          ) : null}
        </div>

        <div className="px-[var(--space-5)] py-[var(--space-5)]">
          <p className="t-micro mb-[var(--space-3)]">Most likely</p>
          <ul className="space-y-[var(--space-3)]">
            {prompts.map((prompt) => {
              const winner = winnerForPrompt(votes, prompt.id);
              const winnerPlayer = winner
                ? players.find((player) => player.id === winner.playerId)
                : null;
              const mine = mineOnPrompt(votes, prompt.id, user?.id);
              const open = openPrompt === prompt.id;
              return (
                <li key={prompt.id}>
                  <button
                    type="button"
                    onClick={() => setOpenPrompt((cur) => (cur === prompt.id ? null : prompt.id))}
                    className="press w-full text-left"
                  >
                    <p className="t-body font-medium text-foreground">{prompt.prompt}</p>
                    {winnerPlayer ? (
                      <span className="mt-1 flex items-center gap-2">
                        <Avatar
                          name={winnerPlayer.name}
                          teamSlug={teams.find((team) => team.id === winnerPlayer.team_id)?.slug}
                          src={avatars.data?.byPlayerId.get(winnerPlayer.id)?.url}
                          size="sm"
                        />
                        <span className="t-micro text-foreground/80">
                          {firstName(winnerPlayer.name)} · {prompt.chip}
                        </span>
                      </span>
                    ) : null}
                  </button>
                  {open ? (
                    <div className="mt-[var(--space-3)] grid grid-cols-4 gap-2">
                      {roster.map((player) => {
                        const selected = mine?.playerId === player.id;
                        const face = (
                          <>
                            <Avatar
                              name={player.name}
                              teamSlug={teams.find((team) => team.id === player.team_id)?.slug}
                              src={avatars.data?.byPlayerId.get(player.id)?.url}
                              size="md"
                              className={`size-[44px] text-[0.65rem] ${selected ? "ring-2 ring-hunter" : ""}`}
                            />
                            <span className={`t-micro mt-1 block ${selected ? "text-hunter" : ""}`}>
                              {firstName(player.name)}
                            </span>
                          </>
                        );
                        if (!canTalk) {
                          return (
                            <Link
                              key={player.id}
                              to="/profile"
                              className="press flex flex-col items-center text-center"
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
                            onClick={() => void pick(prompt.id, player.id)}
                            className="press flex flex-col items-center text-center"
                          >
                            {face}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {canTalk ? (
            <div className="mt-[var(--space-5)]">
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
            </div>
          ) : (
            <Link to="/profile" className="press mt-[var(--space-5)] block">
              <p className="t-body text-muted-foreground">Most likely to…</p>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
