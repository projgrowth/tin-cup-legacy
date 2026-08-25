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
import { orderClubhousePolls, pollClosed, pollDare, pollDareChip } from "@/lib/social-platform";

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
          <header>
            <p className="t-micro">Most likely</p>
            {polls.length > 1 ? (
              <div
                className="no-scrollbar mt-1.5 flex gap-2 overflow-x-auto"
                role="tablist"
                aria-label="Polls"
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
                    {pollDareChip(row.question)}
                  </button>
                ))}
              </div>
            ) : null}
            <h2 className="t-title mt-2 text-foreground">{pollDare(poll.question)}</h2>
            {closed || youVoted || canVote || user ? (
              <p className="t-micro mt-1">
                {closed
                  ? "Locked after the weekend."
                  : youVoted
                    ? `You picked ${firstName(youVoted)}. Tap someone else to change it.`
                    : canVote
                      ? "Tap a name. One vote — change it anytime."
                      : "Claim your roster name to vote."}
              </p>
            ) : null}
            {!canVote && !closed ? (
              <Link to="/profile" className="press t-micro mt-1 inline-flex min-h-11 items-center">
                {user ? "Claim your name" : "Sign in to vote"}
              </Link>
            ) : null}
          </header>
          <ul className="surface divide-y divide-border overflow-hidden">
            {[...roster]
              .sort((a, b) => countFor(b.name) - countFor(a.name))
              .map((player) => {
                const option =
                  poll.options.find(
                    (row) => row.label.trim().toLowerCase() === player.name.trim().toLowerCase(),
                  ) ?? poll.options.find((row) => firstName(row.label) === firstName(player.name));
                const selected = Boolean(option && mine?.optionId === option.id);
                const count = countFor(player.name);
                const teamSlug = teamById.get(player.team_id);
                const row = (
                  <>
                    <Avatar
                      name={player.name}
                      teamSlug={teamSlug}
                      src={avatars.data?.byPlayerId.get(player.id)?.url}
                      size="sm"
                      title={firstName(player.name)}
                      className={selected ? "ring-2 ring-hunter/50" : ""}
                    />
                    <span
                      className={`t-body min-w-0 flex-1 truncate ${
                        selected ? "font-semibold text-foreground" : "text-foreground"
                      }`}
                    >
                      {firstName(player.name)}
                    </span>
                    <span
                      className={`t-micro tabular-nums ${
                        count > 0 ? "text-muted-foreground" : "invisible"
                      }`}
                    >
                      {count || 0}
                    </span>
                  </>
                );
                return (
                  <li key={player.id}>
                    {canVote && !closed ? (
                      <button
                        type="button"
                        disabled={!option}
                        aria-pressed={selected}
                        aria-label={`Vote ${firstName(player.name)}`}
                        onClick={() => option && void pick(option.id)}
                        className="press flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left"
                      >
                        {row}
                      </button>
                    ) : (
                      <div className="flex min-h-12 w-full items-center gap-3 px-4 py-2.5">
                        {row}
                      </div>
                    )}
                  </li>
                );
              })}
          </ul>
        </>
      ) : (
        <p className="t-micro">No poll yet.</p>
      )}
      {canCreate ? (
        <div>
          <label className="sr-only" htmlFor="clubhouse-poll-q">
            Add a question
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
            Add a question
          </button>
        </div>
      ) : null}
    </section>
  );
}
