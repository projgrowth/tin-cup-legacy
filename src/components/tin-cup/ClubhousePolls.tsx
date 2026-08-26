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
import {
  orderClubhousePolls,
  pollClosed,
  pollDare,
  type ClubhousePoll,
} from "@/lib/social-platform";
import { EVENT } from "@/lib/tin-cup";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function optionFor(poll: ClubhousePoll, player: Player) {
  const n = player.name.trim().toLowerCase();
  return (
    poll.options.find((row) => row.label.trim().toLowerCase() === n) ??
    poll.options.find((row) => firstName(row.label) === firstName(player.name))
  );
}

export function ClubhousePolls({
  players,
  teams = [],
  canCreate = false,
}: {
  players: Player[];
  teams?: Team[];
  canCreate?: boolean;
}) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const claimed = Boolean(profile?.player_id);
  const canVote = Boolean(user && claimed);
  const engagement = useEngagementPlatform(user?.id, profile?.player_id);
  const avatars = usePlayerAvatars(players, teams);
  const [question, setQuestion] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);
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
  const poll = polls.find((row) => row.id === pickedId) ?? polls[0];
  if (!engagement.pollsEnabled) return null;
  if (polls.length === 0 && !canCreate) return null;

  const votes = poll ? engagement.votes.filter((vote) => vote.pollId === poll.id) : [];
  const mine = votes.find((vote) => vote.userId === user?.id);
  const youVoted = mine ? poll?.options.find((option) => option.id === mine.optionId)?.label : null;
  const closed = poll ? pollClosed(poll) : true;
  const countFor = (label: string) =>
    votes.filter((vote) => {
      const option = poll?.options.find((row) => row.id === vote.optionId);
      return option?.label.trim().toLowerCase() === label.trim().toLowerCase();
    }).length;
  const leading = roster
    .filter((player) => countFor(player.name) > 0)
    .sort((a, b) => countFor(b.name) - countFor(a.name));
  const rest = roster.filter((player) => countFor(player.name) === 0);

  const hint = !poll
    ? "No dare yet."
    : closed
      ? "Locked after the weekend."
      : !user
        ? "Sign in to vote."
        : !claimed
          ? "Claim your roster name to vote."
          : youVoted
            ? `You picked ${firstName(youVoted)}.`
            : polls.length > 1
              ? "Pick a dare, then a name."
              : "Tap a name.";

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
        closesAt: EVENT.endsAt,
      });
      setQuestion("");
      toast.success("Poll is live");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add that poll");
    }
  }

  return (
    <section aria-label="Most likely" className="stack-tight">
      {poll ? (
        <div className="surface overflow-hidden">
          <header className="section-cap">
            <h2 className="t-eyebrow">Most likely</h2>
            <p className="t-micro mt-1">{hint}</p>
            {user && !claimed && !closed ? (
              <Link to="/profile" className="press t-micro mt-1 inline-flex min-h-11 items-center">
                Claim your name
              </Link>
            ) : null}
          </header>

          {polls.length > 1 ? (
            <ul role="tablist" aria-label="Dares" className="divide-y divide-border">
              {polls.map((row) => {
                const on = row.id === poll.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setPickedId(row.id)}
                      className={`press card-row flex min-h-12 w-full items-start py-3 text-left ${
                        on ? "rail-a bg-hunter/5" : ""
                      }`}
                    >
                      <span
                        className={`t-body line-clamp-2 ${
                          on ? "font-semibold text-foreground" : "text-foreground"
                        }`}
                      >
                        {pollDare(row.question)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <h3 className="card-row t-body py-3 font-semibold text-foreground">
              {pollDare(poll.question)}
            </h3>
          )}

          {leading.length > 0 ? (
            <ul className="grid grid-cols-2 border-t border-border">
              {leading.map((player, index) => {
                const option = optionFor(poll, player);
                const selected = Boolean(option && mine?.optionId === option.id);
                const count = countFor(player.name);
                const face = avatars.data?.byPlayerId.get(player.id)?.url;
                const tile = (
                  <>
                    <span className="t-numeral text-[1.15rem] text-foreground">{count}</span>
                    {face ? (
                      <Avatar name={player.name} src={face} size="md" fallback="none" />
                    ) : null}
                    <span
                      className={`t-body mt-1 font-semibold ${
                        selected ? "text-hunter" : "text-foreground"
                      }`}
                    >
                      {firstName(player.name)}
                    </span>
                  </>
                );
                const box =
                  "press flex min-h-24 w-full flex-col items-center justify-center gap-1 px-2 py-4 text-center";
                return (
                  <li
                    key={player.id}
                    className={`${index >= 2 ? "border-t border-border" : ""} ${
                      index % 2 === 1 ? "border-l border-border" : ""
                    }`}
                  >
                    {canVote && !closed ? (
                      <button
                        type="button"
                        disabled={!option}
                        aria-pressed={selected}
                        aria-label={`Vote ${firstName(player.name)}`}
                        onClick={() => option && void pick(option.id)}
                        className={box}
                      >
                        {tile}
                      </button>
                    ) : !user && !closed ? (
                      <Link
                        to="/profile"
                        aria-label={`Vote ${firstName(player.name)}`}
                        className={box}
                      >
                        {tile}
                      </Link>
                    ) : (
                      <div className={box}>{tile}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {rest.length > 0 ? (
            <div className="border-t border-border">
              <p className="card-row t-micro pt-2.5">
                {leading.length > 0 ? "Everyone else" : "The field"}
              </p>
              <div className="card-row flex flex-wrap gap-x-1 gap-y-0.5 pb-2 pt-1">
                {rest.map((player) => {
                  const option = optionFor(poll, player);
                  const selected = Boolean(option && mine?.optionId === option.id);
                  const label = firstName(player.name);
                  const className = `press t-micro min-h-11 px-1.5 ${
                    selected ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`;
                  if (canVote && !closed) {
                    return (
                      <button
                        key={player.id}
                        type="button"
                        disabled={!option}
                        aria-pressed={selected}
                        aria-label={`Vote ${label}`}
                        onClick={() => option && void pick(option.id)}
                        className={className}
                      >
                        {label}
                      </button>
                    );
                  }
                  if (!user && !closed) {
                    return (
                      <Link
                        key={player.id}
                        to="/profile"
                        aria-label={`Vote ${label}`}
                        className={className}
                      >
                        {label}
                      </Link>
                    );
                  }
                  return (
                    <span key={player.id} className="t-micro px-1.5 py-2.5 text-muted-foreground">
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="t-micro">No dare yet.</p>
      )}
      {canCreate ? (
        <div>
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
