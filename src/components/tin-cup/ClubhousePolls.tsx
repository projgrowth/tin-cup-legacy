import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Avatar } from "@/components/tin-cup/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { useEngagementPlatform } from "@/hooks/useEngagementPlatform";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { useProfile } from "@/hooks/useJournal";
import type { Player, Team } from "@/hooks/useTournament";
import { fridayRosterNames } from "@/lib/day1-pairings";
import { pollClosed } from "@/lib/social-platform";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function ClubhousePolls({
  players,
  teams,
  canCreate = false,
}: {
  players: Player[];
  teams: Team[];
  canCreate?: boolean;
}) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const claimed = Boolean(profile?.player_id);
  const canVote = Boolean(user && claimed);
  const engagement = useEngagementPlatform(user?.id, profile?.player_id);
  const avatars = usePlayerAvatars(players, teams);
  const [question, setQuestion] = useState("");
  const [index, setIndex] = useState(0);
  const roster = useMemo(
    () =>
      fridayRosterNames()
        .map((name) =>
          players.find((player) => player.name.trim().toLowerCase() === name.toLowerCase()),
        )
        .filter((player): player is Player => Boolean(player)),
    [players],
  );
  const polls = engagement.polls.filter((poll) => !poll.deletedAt);
  if (!engagement.pollsEnabled) return null;
  if (polls.length === 0 && !canCreate) return null;
  const poll = polls[Math.min(index, Math.max(polls.length - 1, 0))];
  const votes = poll ? engagement.votes.filter((vote) => vote.pollId === poll.id) : [];
  const mine = votes.find((vote) => vote.userId === user?.id);
  const tallies = (poll?.options ?? [])
    .map((option) => ({
      option,
      count: votes.filter((vote) => vote.optionId === option.id).length,
    }))
    .sort((a, b) => b.count - a.count || a.option.sortOrder - b.option.sortOrder);
  const top = tallies.filter((row) => row.count > 0).slice(0, 3);
  const youVoted = mine ? poll?.options.find((option) => option.id === mine.optionId)?.label : null;
  const closed = poll ? pollClosed(poll) : true;
  const playerFor = (label: string) =>
    players.find((player) => player.name.trim().toLowerCase() === label.trim().toLowerCase());

  async function pick(optionId: string) {
    if (!poll || !canVote || closed) return;
    try {
      await engagement.vote.mutateAsync({ pollId: poll.id, optionId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that vote");
    }
  }

  async function addPoll() {
    const body = question.trim();
    if (!body || !canCreate) return;
    try {
      await engagement.createPoll.mutateAsync({
        question: body,
        options: fridayRosterNames(),
        closesAt: "2026-08-30T23:59:59-04:00",
      });
      setQuestion("");
      toast.success("Poll is live");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add that poll");
    }
  }

  return (
    <section aria-label="Most likely" className="space-y-3">
      {poll ? (
        <>
          <div className="flex items-end justify-between gap-3 px-1">
            <h2 className="t-title text-foreground">{poll.question}</h2>
            {polls.length > 1 ? (
              <button
                type="button"
                className="press t-micro min-h-11"
                onClick={() => setIndex((current) => (current + 1) % polls.length)}
              >
                Next
              </button>
            ) : null}
          </div>
          {top.length > 0 ? (
            <ol className="space-y-1 px-1">
              {top.map((row, place) => (
                <li key={row.option.id} className="t-micro flex justify-between gap-3">
                  <span className="text-foreground">
                    {place + 1}. {firstName(row.option.label)}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{row.count}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {youVoted ? (
            <p className="t-micro px-1">you voted {firstName(youVoted)}</p>
          ) : closed ? (
            <p className="t-micro px-1">Locked after the weekend.</p>
          ) : null}
          <div className="grid grid-cols-8 gap-x-1 gap-y-2">
            {(roster.length
              ? roster
              : poll.options.map((option) => playerFor(option.label)).filter(Boolean)
            ).map((player) => {
              const option =
                poll.options.find(
                  (row) => row.label.trim().toLowerCase() === player!.name.trim().toLowerCase(),
                ) ?? poll.options.find((row) => firstName(row.label) === firstName(player!.name));
              const selected = Boolean(option && mine?.optionId === option.id);
              const face = (
                <Avatar
                  name={player!.name}
                  src={avatars.data?.byPlayerId.get(player!.id)?.url}
                  size="sm"
                  title={firstName(player!.name)}
                  className={selected ? "ring-2 ring-hunter/40" : ""}
                />
              );
              if (!canVote) {
                return (
                  <Link
                    key={player!.id}
                    to="/profile"
                    className="press flex min-w-0 flex-col items-center text-center"
                  >
                    {face}
                  </Link>
                );
              }
              return (
                <button
                  key={player!.id}
                  type="button"
                  disabled={closed || !option}
                  aria-pressed={selected}
                  aria-label={firstName(player!.name)}
                  onClick={() => option && void pick(option.id)}
                  className="press flex min-w-0 flex-col items-center text-center"
                >
                  {face}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p className="t-micro px-1">No superlatives yet.</p>
      )}
      {canCreate ? (
        <div className="px-1">
          <label className="sr-only" htmlFor="clubhouse-poll-q">
            Add a poll
          </label>
          <input
            id="clubhouse-poll-q"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={140}
            placeholder="Most likely to…"
            className="control w-full text-base"
          />
          <button
            type="button"
            disabled={!question.trim() || engagement.createPoll.isPending}
            onClick={() => void addPoll()}
            className="press btn-quiet mt-2 min-h-11 px-4 text-sm font-semibold"
          >
            Add a poll
          </button>
        </div>
      ) : null}
    </section>
  );
}
