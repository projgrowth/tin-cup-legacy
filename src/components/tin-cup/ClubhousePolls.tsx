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
import { orderClubhousePolls, pollClosed, pollDare } from "@/lib/social-platform";

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
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team.slug])), [teams]);
  const roster = useMemo(
    () =>
      fridayRosterNames()
        .map((name) =>
          players.find((player) => player.name.trim().toLowerCase() === name.toLowerCase()),
        )
        .filter((player): player is Player => Boolean(player)),
    [players],
  );
  const polls = orderClubhousePolls(engagement.polls);
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
  const countFor = (label: string) =>
    tallies.find((row) => row.option.label.trim().toLowerCase() === label.trim().toLowerCase())
      ?.count ?? 0;

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
          <header className="px-1">
            <p className="t-micro">Most likely</p>
            <h2 className="t-title mt-0.5 text-foreground">{pollDare(poll.question)}</h2>
            <p className="t-micro mt-1">
              {closed
                ? "Locked after the weekend."
                : youVoted
                  ? `You picked ${firstName(youVoted)}. Tap someone else to change it.`
                  : canVote
                    ? "Tap a name. One vote — change it anytime."
                    : user
                      ? "Claim your roster name to vote."
                      : "The field is already voting."}
            </p>
            {!canVote && !closed ? (
              <Link to="/profile" className="press t-micro mt-1 inline-flex min-h-11 items-center">
                {user ? "Claim your name" : "Sign in to vote"}
              </Link>
            ) : null}
          </header>
          {polls.length > 1 ? (
            <div
              className="no-scrollbar flex gap-2 overflow-x-auto px-1"
              role="tablist"
              aria-label="Dares"
            >
              {polls.map((row, i) => (
                <button
                  key={row.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  onClick={() => setIndex(i)}
                  className={`press chip min-h-11 shrink-0 ${i === index ? "chip-on" : ""}`}
                >
                  {pollDare(row.question)}
                </button>
              ))}
            </div>
          ) : null}
          {top.length > 0 ? (
            <p className="t-micro px-1">
              Field:{" "}
              {top.map((row, place) => (
                <span key={row.option.id}>
                  {place > 0 ? " · " : null}
                  {firstName(row.option.label)} {row.count}
                </span>
              ))}
            </p>
          ) : null}
          <ul className="grid grid-cols-4 gap-2">
            {roster.map((player) => {
              const option =
                poll.options.find(
                  (row) => row.label.trim().toLowerCase() === player.name.trim().toLowerCase(),
                ) ?? poll.options.find((row) => firstName(row.label) === firstName(player.name));
              const selected = Boolean(option && mine?.optionId === option.id);
              const count = countFor(player.name);
              const teamSlug = teamById.get(player.team_id);
              const face = (
                <>
                  <Avatar
                    name={player.name}
                    teamSlug={teamSlug}
                    src={avatars.data?.byPlayerId.get(player.id)?.url}
                    size="md"
                    title={firstName(player.name)}
                    className={selected ? "ring-2 ring-hunter/50" : ""}
                  />
                  <span
                    className={`t-micro mt-1 block truncate ${
                      selected ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {firstName(player.name)}
                  </span>
                  <span
                    className={`t-micro tabular-nums ${count > 0 ? "text-muted-foreground" : "invisible"}`}
                  >
                    {count || 0}
                  </span>
                </>
              );
              return (
                <li key={player.id} className="min-w-0">
                  {canVote && !closed ? (
                    <button
                      type="button"
                      disabled={!option}
                      aria-pressed={selected}
                      aria-label={`Vote ${firstName(player.name)}`}
                      onClick={() => option && void pick(option.id)}
                      className="press flex min-h-11 w-full flex-col items-center text-center"
                    >
                      {face}
                    </button>
                  ) : (
                    <div className="flex w-full flex-col items-center text-center">{face}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="t-micro px-1">No dares yet.</p>
      )}
      {canCreate ? (
        <div className="px-1">
          <label className="sr-only" htmlFor="clubhouse-poll-q">
            Add a dare
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
            Add a dare
          </button>
        </div>
      ) : null}
    </section>
  );
}
