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
  crowdSays,
  mineOnPrompt,
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
  const profiles = usePublicProfiles();
  const [draft, setDraft] = useState("");
  const [tagId, setTagId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [question, setQuestion] = useState("");
  const roster = fridayRosterNames()
    .map((name) => players.find((player) => player.name.trim().toLowerCase() === name.toLowerCase()))
    .filter((player): player is Player => Boolean(player));
  const tagged = tagId ? players.find((player) => player.id === tagId) : null;
  const latestRoast = [...story.clubhousePosts]
    .filter((post) => post.body.trim() && !post.pinned_at)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  const prompt = prompts[page] ?? prompts[0];

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
      setPage(prompts.length);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that");
    }
  }

  return (
    <section aria-labelledby="wall-title" className="stack">
      <div>
        <h2 id="wall-title" className="t-title text-foreground">
          {BANTER_HEADER}
        </h2>
        <p className="t-micro mt-[var(--space-3)]">{BANTER_SUBLINE}</p>
      </div>

      <div>
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
              rows={3}
              placeholder="Talk your shit"
              className="control w-full resize-none text-base"
            />
            <div className="mt-[var(--space-4)] flex flex-wrap items-center gap-2">
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
              className="press btn-primary mt-[var(--space-4)] min-h-11 px-4 text-sm font-semibold"
            >
              Post
            </button>
          </>
        ) : (
          <Link to="/profile" className="press block min-h-11">
            <p className="t-body text-muted-foreground">Talk your shit</p>
          </Link>
        )}
        {latestRoast ? (
          <p className="t-body mt-[var(--space-5)] italic text-foreground">
            “{latestRoast.body.trim()}”
          </p>
        ) : null}
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <p className="t-title text-foreground">Most likely to…</p>
          {prompts.length > 1 ? (
            <p className="t-micro tabular-nums">
              {Math.min(page, prompts.length - 1) + 1}/{prompts.length}
            </p>
          ) : null}
        </div>

        {prompt ? (
          <div className="py-[var(--space-5)]">
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
                    <p className="t-body mt-[var(--space-4)] text-foreground">
                      {crowdSays(firstName(winnerPlayer.name), prompt, result.percent)}
                    </p>
                  ) : null}
                  <div className="mt-[var(--space-5)] grid grid-cols-4 gap-[var(--space-4)]">
                    {roster.map((player) => {
                      const selected = mine?.playerId === player.id;
                      const face = (
                        <>
                          <Avatar
                            name={player.name}
                            teamSlug={teams.find((team) => team.id === player.team_id)?.slug}
                            src={avatars.data?.byPlayerId.get(player.id)?.url}
                            size="lg"
                            className={`size-[3.25rem] text-[0.7rem] ${selected ? "ring-2 ring-hunter" : ""}`}
                          />
                          <span className={`t-micro mt-1.5 block ${selected ? "text-hunter" : ""}`}>
                            {firstName(player.name)}
                          </span>
                        </>
                      );
                      if (!canTalk) {
                        return (
                          <Link
                            key={player.id}
                            to="/profile"
                            className="press flex min-h-11 flex-col items-center text-center"
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
                          className="press flex min-h-11 flex-col items-center text-center"
                        >
                          {face}
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()}
            {prompts.length > 1 ? (
              <div className="mt-[var(--space-5)] flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage((n) => Math.max(0, n - 1))}
                  className="press btn-quiet min-h-11 px-4 text-sm"
                >
                  Prev
                </button>
                <div className="flex gap-1.5">
                  {prompts.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`Dare ${index + 1}`}
                      onClick={() => setPage(index)}
                      className={`size-2 rounded-full ${
                        index === page ? "bg-hunter" : "bg-foreground/15"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={page >= prompts.length - 1}
                  onClick={() => setPage((n) => Math.min(prompts.length - 1, n + 1))}
                  className="press btn-quiet min-h-11 px-4 text-sm"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="t-micro py-[var(--space-5)]">No dares yet.</p>
        )}

        <div className="py-[var(--space-4)]">
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
              <p className="t-body text-muted-foreground">Most likely to…</p>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
