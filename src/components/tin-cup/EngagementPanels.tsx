import { useMemo, useState } from "react";
import {
  BarChart3,
  Camera,
  Check,
  ChevronDown,
  Clock3,
  MapPin,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useEngagementPlatform } from "@/hooks/useEngagementPlatform";
import type { Player, Round } from "@/hooks/useTournament";
import {
  activeCheckIns,
  pollClosed,
  type CheckInStatus,
  type EngagementPromptKind,
} from "@/lib/social-platform";
import { trackProductEvent } from "@/lib/product-analytics";

const checkInChoices: Array<{ value: CheckInStatus; label: string }> = [
  { value: "on-course", label: "On the course" },
  { value: "clubhouse", label: "At the clubhouse" },
  { value: "heading-dinner", label: "Heading to dinner" },
  { value: "done-today", label: "Done for today" },
];

export function ClubhouseEngagement({
  userId,
  playerId,
  players,
  canModerate,
}: {
  userId?: string;
  playerId?: string | null;
  players: Player[];
  canModerate: boolean;
}) {
  const engagement = useEngagementPlatform(userId, playerId);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [showPoll, setShowPoll] = useState(false);
  const playerById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const visibleCheckIns = activeCheckIns(engagement.checkIns);
  const activePrompts = engagement.prompts.filter(
    (prompt) => Date.parse(prompt.startsAt) <= Date.now() && Date.parse(prompt.endsAt) > Date.now(),
  );

  if (!engagement.pollsEnabled && !engagement.checkinsEnabled && !engagement.promptsEnabled)
    return null;
  return (
    <div className="space-y-3">
      {engagement.checkinsEnabled && playerId && (
        <section className="surface-inset p-3.5" aria-labelledby="checkin-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p
                id="checkin-title"
                className="t-micro flex items-center gap-1.5 text-foreground/75"
              >
                <MapPin className="size-3.5 text-hunter" /> Around the resort
              </p>
              <p className="t-micro mt-1">Visible only to claimed players · expires in six hours</p>
            </div>
            <span className="t-micro shrink-0">{visibleCheckIns.length} active</span>
          </div>
          <label className="sr-only" htmlFor="player-checkin">
            Update your event check-in
          </label>
          <select
            id="player-checkin"
            value={visibleCheckIns.find((row) => row.userId === userId)?.status ?? ""}
            disabled={engagement.checkIn.isPending}
            onChange={(event) => {
              const value = event.target.value as CheckInStatus | "";
              engagement.checkIn.mutate(value || null, {
                onSuccess: () => {
                  void trackProductEvent("checkin_changed", { kind: value || "cleared" });
                  toast.success(value ? "Check-in updated" : "Check-in cleared");
                },
                onError: (error) => toast.error(error.message),
              });
            }}
            className="control mt-2 min-h-11 w-full text-base"
          >
            <option value="">No active check-in</option>
            {checkInChoices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
          {visibleCheckIns.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Active player check-ins">
              {visibleCheckIns.map((row) => (
                <li key={row.userId} className="chip min-h-9 text-xs">
                  {playerById.get(row.playerId)?.name.split(" ")[0] ?? "Player"} ·{" "}
                  {checkInChoices.find((item) => item.value === row.status)?.label}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {engagement.promptsEnabled &&
        activePrompts.map((prompt) => (
          <article key={prompt.id} className="engagement-prompt surface-raised p-4">
            <p className="t-micro flex items-center gap-1.5 text-hunter">
              {prompt.kind === "photo" ? (
                <Camera className="size-3.5" />
              ) : (
                <Users className="size-3.5" />
              )}
              Live prompt
            </p>
            <h3 className="t-title mt-1 text-foreground">{prompt.title}</h3>
            {prompt.detail && <p className="t-micro mt-1">{prompt.detail}</p>}
            <p className="t-micro mt-2 flex items-center gap-1">
              <Clock3 className="size-3.5" /> Open until{" "}
              {new Date(prompt.endsAt).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </article>
        ))}

      {engagement.pollsEnabled && (
        <section className="space-y-3" aria-labelledby="polls-title">
          {playerId && (
          <button
            type="button"
            aria-expanded={showPoll}
            onClick={() => setShowPoll((current) => !current)}
            className="press surface-inset flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left"
          >
            <span className="t-body flex items-center gap-2 font-semibold text-foreground">
              <BarChart3 className="size-4 text-hunter" /> Create a Clubhouse poll
            </span>
            <ChevronDown
              className={`size-4 transition-transform ${showPoll ? "rotate-180" : ""}`}
            />
          </button>
          )}
          {playerId && showPoll && (
            <form
              className="surface-raised space-y-3 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                engagement.createPoll.mutate(
                  { question, options },
                  {
                    onSuccess: () => {
                      setQuestion("");
                      setOptions(["", ""]);
                      setShowPoll(false);
                      void trackProductEvent("poll_created");
                      toast.success("Poll posted");
                    },
                    onError: (error) => toast.error(error.message),
                  },
                );
              }}
            >
              <label className="t-micro text-foreground/75" htmlFor="poll-question">
                Question
              </label>
              <input
                id="poll-question"
                value={question}
                maxLength={140}
                onChange={(event) => setQuestion(event.target.value)}
                className="control min-h-11 w-full text-base"
                placeholder="Best finishing hole this weekend?"
              />
              {options.map((option, index) => (
                <label key={index} className="block">
                  <span className="sr-only">Poll option {index + 1}</span>
                  <input
                    value={option}
                    maxLength={60}
                    onChange={(event) =>
                      setOptions((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? event.target.value : item,
                        ),
                      )
                    }
                    className="control min-h-11 w-full text-base"
                    placeholder={`Option ${index + 1}`}
                  />
                </label>
              ))}
              <div className="flex gap-2">
                {options.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setOptions((current) => [...current, ""])}
                    className="press btn-quiet flex min-h-11 items-center gap-2 px-3 text-sm"
                  >
                    <Plus className="size-4" /> Option
                  </button>
                )}
                <button
                  type="submit"
                  disabled={
                    engagement.createPoll.isPending ||
                    !question.trim() ||
                    options.filter((option) => option.trim()).length < 2
                  }
                  className="press btn-primary ml-auto flex min-h-11 items-center gap-2 px-4 text-sm font-semibold"
                >
                  <Send className="size-4" /> Post poll
                </button>
              </div>
            </form>
          )}
          {engagement.polls.map((poll) => {
            const mine = engagement.votes.find(
              (vote) => vote.pollId === poll.id && vote.userId === userId,
            );
            const closed = pollClosed(poll);
            const showResults = Boolean(mine || closed);
            const votes = engagement.votes.filter((vote) => vote.pollId === poll.id);
            return (
              <article key={poll.id} id={`post-poll:${poll.id}`} className="feed-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="t-micro text-hunter">Clubhouse poll</p>
                    <h3 className="t-title mt-1 text-foreground">{poll.question}</h3>
                  </div>
                  {closed && (
                    <span className="pill border-border text-muted-foreground">Closed</span>
                  )}
                </div>
                <div className="mt-3 space-y-2" role="group" aria-label={poll.question}>
                  {poll.options.map((option) => {
                    const count = votes.filter((vote) => vote.optionId === option.id).length;
                    const percent = votes.length ? Math.round((count / votes.length) * 100) : 0;
                    const selected = mine?.optionId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={closed || !playerId || engagement.vote.isPending}
                        aria-pressed={selected}
                        onClick={() =>
                          engagement.vote.mutate(
                            { pollId: poll.id, optionId: option.id },
                            {
                              onSuccess: () => void trackProductEvent("poll_voted"),
                              onError: (error) => toast.error(error.message),
                            },
                          )
                        }
                        className={`press relative min-h-12 w-full overflow-hidden rounded-xl border px-3 text-left text-sm font-semibold ${selected ? "border-gold/45 text-foreground" : "border-border text-muted-foreground"}`}
                      >
                        {showResults && (
                          <span
                            aria-hidden
                            className="absolute inset-y-0 left-0 bg-hunter/10"
                            style={{ width: `${percent}%` }}
                          />
                        )}
                        <span className="relative flex items-center justify-between gap-3">
                          <span>
                            {selected && <Check className="mr-1 inline size-4" />}
                            {option.label}
                          </span>
                          {showResults && <span>{percent}%</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="t-micro">
                    {showResults
                      ? `${votes.length} vote${votes.length === 1 ? "" : "s"}`
                      : "Vote to reveal the room"}
                  </p>
                  {(poll.authorId === userId || canModerate) && !closed && (
                    <button
                      type="button"
                      onClick={() =>
                        engagement.closePoll.mutate(
                          { pollId: poll.id },
                          {
                            onSuccess: () => toast.success("Poll closed"),
                            onError: (error) => toast.error(error.message),
                          },
                        )
                      }
                      className="press t-micro min-h-11 font-semibold text-muted-foreground"
                    >
                      Close poll
                    </button>
                  )}
                </div>
                {(poll.authorId === userId || canModerate) && (
                  <button
                    type="button"
                    onClick={() =>
                      engagement.closePoll.mutate(
                        { pollId: poll.id, moderate: true },
                        {
                          onSuccess: () =>
                            toast.success(
                              poll.authorId === userId ? "Poll deleted" : "Poll hidden",
                            ),
                          onError: (error) => toast.error(error.message),
                        },
                      )
                    }
                    className="press t-micro mt-1 min-h-11 text-copper"
                  >
                    {poll.authorId === userId ? "Delete poll" : "Hide poll"}
                  </button>
                )}
              </article>
            );
          })}
        </section>
      )}
      {engagement.unavailable && (
        <p role="status" className="t-micro">
          Engagement tools are temporarily read-only.
        </p>
      )}
    </div>
  );
}

export function PromptManager({
  userId,
  playerId,
  rounds,
}: {
  userId: string;
  playerId?: string | null;
  rounds: Round[];
}) {
  const engagement = useEngagementPlatform(userId, playerId);
  const [kind, setKind] = useState<EngagementPromptKind>("photo");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [roundId, setRoundId] = useState("");
  if (!engagement.promptsEnabled) return null;
  return (
    <section className="surface space-y-3 p-4" aria-labelledby="prompt-manager-title">
      <div>
        <p className="t-micro text-hunter">Engagement</p>
        <h2 id="prompt-manager-title" className="t-section mt-1">
          Schedule a live prompt
        </h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          aria-label="Prompt kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as EngagementPromptKind)}
          className="control min-h-11 text-base"
        >
          <option value="photo">Photo prompt</option>
          <option value="conversation">Conversation prompt</option>
        </select>
        <select
          aria-label="Related round"
          value={roundId}
          onChange={(event) => setRoundId(event.target.value)}
          className="control min-h-11 text-base"
        >
          <option value="">Whole weekend</option>
          {rounds.map((round) => (
            <option key={round.id} value={round.id}>
              {round.day_label}
            </option>
          ))}
        </select>
      </div>
      <input
        aria-label="Prompt title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={100}
        className="control min-h-11 w-full text-base"
        placeholder="First-tee faces"
      />
      <textarea
        aria-label="Prompt details"
        value={detail}
        onChange={(event) => setDetail(event.target.value)}
        maxLength={300}
        rows={2}
        className="control w-full resize-none text-base"
        placeholder="What should players post?"
      />
      <button
        type="button"
        disabled={!title.trim() || engagement.createPrompt.isPending}
        onClick={() => {
          const now = Date.now();
          engagement.createPrompt.mutate(
            {
              kind,
              title,
              detail,
              roundId: roundId || null,
              startsAt: new Date(now).toISOString(),
              endsAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              onSuccess: () => {
                setTitle("");
                setDetail("");
                toast.success("Prompt scheduled for 24 hours");
              },
              onError: (error) => toast.error(error.message),
            },
          );
        }}
        className="press btn-primary min-h-11 w-full text-sm font-semibold"
      >
        Schedule for 24 hours
      </button>
    </section>
  );
}
