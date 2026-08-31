import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { WeekendRecap } from "@/components/tin-cup/WeekendRecap";
import { SocialClubhouseFeed } from "@/components/tin-cup/SocialClubhouseFeed";
import { ScoreModal } from "@/components/tin-cup/ScoreModal";
import { Shell, SkeletonBlock } from "@/components/tin-cup/Shell";
import { DisplayBoard } from "@/components/tin-cup/live/DisplayBoard";
import { LivePanel, PreTournamentPanel } from "@/components/tin-cup/panels";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useJournal";
import { useTournament } from "@/hooks/useTournament";
import { useExperiencePreferences } from "@/hooks/useExperiencePreferences";
import { boardMode, getEventPhase } from "@/lib/event-phase";
import { tallyStandings } from "@/lib/scoring";

import { hasAuthCallbackParams, parseAuthCallbackParams } from "@/lib/auth-recovery";
import { resolveIdentity } from "@/lib/profile-identity";
import { type FeedFilter } from "@/lib/social-platform";

type HomeSearch = {
  /** Clubhouse / TV large-type board */
  board?: boolean;
  /** Auth callback — must survive canonicalization or reset/magic codes die. */
  code?: string;
  token_hash?: string;
  type?: string;
  feed?: FeedFilter;
  post?: string;
  comment?: string;
  story?: "recap";
  score?: boolean;
  match?: string;
};

function authCallbackSearch(
  raw: Record<string, unknown>,
): Pick<HomeSearch, "code" | "token_hash" | "type"> {
  const text = (key: "code" | "token_hash" | "type") => {
    const value = raw[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };
  return {
    ...(text("code") ? { code: text("code") } : {}),
    ...(text("token_hash") ? { token_hash: text("token_hash") } : {}),
    ...(text("type") ? { type: text("type") } : {}),
  };
}

export const Route = createFileRoute("/")({
  validateSearch: (raw: Record<string, unknown>): HomeSearch => {
    const board = raw.board === true || raw.board === "1" || raw.board === 1;
    const feed = ["all", "clubhouse", "scores", "photos"].includes(String(raw.feed))
      ? (String(raw.feed) as FeedFilter)
      : undefined;
    const post = typeof raw.post === "string" && raw.post.trim() ? raw.post.trim() : undefined;
    const comment =
      typeof raw.comment === "string" && raw.comment.trim() ? raw.comment.trim() : undefined;
    const story = raw.story === "recap" ? "recap" : undefined;
    const score = raw.score === true || raw.score === "1" || raw.score === 1;
    const match = typeof raw.match === "string" && raw.match.trim() ? raw.match.trim() : undefined;
    // Omit `board: false` — a canonical redirect would drop auth `code` / hash.
    return {
      ...(board ? { board: true } : {}),
      ...(feed && feed !== "all" ? { feed } : {}),
      ...(post ? { post } : {}),
      ...(comment ? { comment } : {}),
      ...(story ? { story } : {}),
      ...(score ? { score: true } : {}),
      ...(match ? { match } : {}),
      ...authCallbackSearch(raw),
    };
  },
  head: () => {
    const pre = getEventPhase() === "before";
    const title = pre
      ? "Tin Cup Invitational 2026 — August 28–30, Innisbrook"
      : "Tin Cup Invitational 2026 — Live Cup Standings";
    const description = pre
      ? "The 4th Annual Tin Cup Invitational at Innisbrook Golf Resort, August 28–30, 2026. Pairings, course plans, purse and the Snake Pit."
      : "The 4th Annual Tin Cup Invitational at Innisbrook Golf Resort, August 28–30, 2026. Live 26-point scoreboard, side cash, rosters and the Snake Pit guide.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: Index,
});

function Index() {
  const search = Route.useSearch();
  const { board: displayMode } = search;
  const navigate = useNavigate();
  const { user, loading: authLoading, passwordRecovery, canScore, isAdmin } = useAuth();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const params = parseAuthCallbackParams(window.location.href);
    if (!hasAuthCallbackParams(params)) return;
    // Search callbacks can move immediately. Hash tokens (implicit reset) must be
    // consumed on this URL first — a replace would drop #access_token.
    if (params.code || params.tokenHash) {
      void navigate({
        to: "/profile",
        search: {
          ...(params.code ? { code: params.code } : {}),
          ...(params.tokenHash ? { token_hash: params.tokenHash } : {}),
          ...(params.type ? { type: params.type } : {}),
        },
        replace: true,
      });
      return;
    }
    if (params.type === "recovery" && !authLoading && (user || passwordRecovery)) {
      void navigate({ to: "/profile", replace: true });
    }
  }, [navigate, search.code, search.token_hash, search.type, authLoading, user, passwordRecovery]);

  useEffect(() => {
    const sync = () => setNow(Date.now());
    sync();
    const id = window.setInterval(sync, 60_000);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const {
    data,
    isPending,
    isError,
    refetch,
    isFetching,
    pendingWrites,
    failedWrites,
    retryFailedWrites,
    flashedMatchIds,
    realtimeStatus,
  } = useTournament();
  const remaining = tallyStandings(data?.matches ?? []).remaining;
  const mode = boardMode(remaining, now, search.story === "recap");
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const experience = useExperiencePreferences(user?.id);
  const stale = isError && Boolean(data);
  const claimedPlayer = profile?.player_id
    ? (data?.players ?? []).find((p) => p.id === profile.player_id)
    : undefined;
  const identity = resolveIdentity({
    signedIn: Boolean(user),
    profilePending: profileLoading,
    profileError: Boolean(profileError),
    playerId: profile?.player_id ?? null,
    tournamentPending: Boolean(profile?.player_id && isPending && !data),
    playerOnRoster: Boolean(claimedPlayer),
  });
  const needsClaim = Boolean(user) && identity.kind === "claim";
  useEffect(() => {
    if (!claimedPlayer) return;
    const team = (data?.teams ?? []).find((candidate) => candidate.id === claimedPlayer.team_id);
    if (team) document.documentElement.dataset.team = team.slug;
    return () => {
      delete document.documentElement.dataset.team;
    };
  }, [claimedPlayer, data?.teams]);

  useEffect(() => {
    if (!search.post) return;
    const id = window.setTimeout(() => {
      const target = search.comment
        ? (document.getElementById(`comment-${search.comment}`) ??
          document.getElementById(`post-${search.post}`))
        : document.getElementById(`post-${search.post}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.classList.add("deep-link-target");
      window.setTimeout(() => target?.classList.remove("deep-link-target"), 2400);
    }, 250);
    return () => window.clearTimeout(id);
  }, [search.comment, search.post]);

  // Clubhouse / TV large-type mode — no shell chrome
  if (displayMode) {
    if (isPending && !data) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="t-body text-muted-foreground">Loading board…</p>
        </div>
      );
    }
    if (isError && !data) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <BoardError onRetry={() => void refetch()} busy={isFetching} />
        </div>
      );
    }
    return (
      <DisplayBoard
        rounds={data?.rounds ?? []}
        matches={data?.matches ?? []}
        teams={data?.teams ?? []}
        sideBets={data?.sideBets ?? []}
        syncedAt={data?.syncedAt}
      />
    );
  }

  return (
    <>
      <Shell variant={mode === "pre" ? "content" : "dashboard"}>
        {/* Claim nudge on live; pre mode uses the raised card in PreTournamentPanel */}
        {needsClaim && mode === "live" && (
          <Link
            to="/profile"
            className="press surface mb-3 flex items-center justify-between gap-3 px-4 py-3"
          >
            <span className="min-w-0">
              <span className="t-body block font-medium text-foreground">
                Claim your roster name
              </span>
              <span className="t-micro block text-muted-foreground">
                Unlocks your player card, private notes, and photo credits
              </span>
            </span>
            <span className="t-micro shrink-0">Account</span>
          </Link>
        )}
        {mode === "post" ? (
          <div className="mt-3 stack-page">
            {isPending && !data ? (
              <BoardSkeleton />
            ) : isError && !data ? (
              <BoardError onRetry={() => void refetch()} busy={isFetching} />
            ) : data ? (
              <>
                <WeekendRecap
                  matches={data.matches}
                  rounds={data.rounds}
                  players={data.players}
                  teams={data.teams}
                  sideBets={data.sideBets}
                  trophies={data.trophies}
                />
                <SocialClubhouseFeed
                  matches={data.matches}
                  sideBets={data.sideBets}
                  trophies={data.trophies}
                  players={data.players}
                  teams={data.teams}
                  rounds={data.rounds}
                  filter={search.feed ?? "all"}
                  onFilter={(feed) =>
                    void navigate({
                      to: "/",
                      search: { ...search, feed: feed === "all" ? undefined : feed },
                      replace: true,
                    })
                  }
                  canModerate={canScore || isAdmin}
                  canUpload={Boolean(user)}
                  compact={experience.preferences.compactFeed}
                />
                {canScore ? (
                  <details className="surface overflow-hidden">
                    <summary className="press flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 t-body font-medium text-foreground [&::-webkit-details-marker]:hidden">
                      Board
                      <span className="t-micro font-normal text-muted-foreground">
                        Scores & pots
                      </span>
                    </summary>
                    <div className="border-t border-border px-3 py-3">
                      <LivePanel
                        variant="board"
                        rounds={data.rounds}
                        matches={data.matches}
                        teams={data.teams}
                        players={data.players}
                        sideBets={data.sideBets}
                        trophies={data.trophies}
                        syncedAt={data.syncedAt}
                        pendingWrites={pendingWrites}
                        failedWrites={failedWrites}
                        onRetryFailed={() => void retryFailedWrites()}
                        stale={stale || realtimeStatus === "stale"}
                        canScore
                        claimedName={claimedPlayer?.name ?? null}
                        flashedMatchIds={flashedMatchIds}
                      />
                    </div>
                  </details>
                ) : null}
              </>
            ) : null}
          </div>
        ) : (
          <div className={mode === "pre" ? "stack-page" : "home-dashboard mt-1"}>
            {mode === "pre" && (
              <div className="home-action">
                <PreTournamentPanel
                  players={data?.players ?? []}
                  teams={data?.teams ?? []}
                  claimedName={claimedPlayer?.name ?? null}
                  canModerate={canScore || isAdmin}
                />
              </div>
            )}
            {mode === "live" && (
              <div className="home-board min-w-0">
                {isPending && !data ? (
                  <BoardSkeleton />
                ) : isError && !data ? (
                  <BoardError onRetry={() => void refetch()} busy={isFetching} />
                ) : (
                  <LivePanel
                    variant={canScore ? "full" : "hero"}
                    rounds={data?.rounds ?? []}
                    matches={data?.matches ?? []}
                    teams={data?.teams ?? []}
                    players={data?.players ?? []}
                    sideBets={data?.sideBets ?? []}
                    trophies={data?.trophies ?? []}
                    syncedAt={data?.syncedAt}
                    pendingWrites={pendingWrites}
                    failedWrites={failedWrites}
                    onRetryFailed={() => void retryFailedWrites()}
                    stale={stale || realtimeStatus === "stale"}
                    canScore={canScore}
                    initialOpenOnly={canScore}
                    claimedName={claimedPlayer?.name ?? null}
                    flashedMatchIds={flashedMatchIds}
                  />
                )}
              </div>
            )}
            <>
              <div className="home-feed min-w-0">
                <SocialClubhouseFeed
                  matches={data?.matches ?? []}
                  sideBets={data?.sideBets ?? []}
                  trophies={data?.trophies ?? []}
                  players={data?.players ?? []}
                  teams={data?.teams ?? []}
                  rounds={data?.rounds ?? []}
                  filter={search.feed ?? "all"}
                  onFilter={(feed) =>
                    void navigate({
                      to: "/",
                      search: { ...search, feed: feed === "all" ? undefined : feed },
                      replace: true,
                    })
                  }
                  canModerate={canScore || isAdmin}
                  canUpload={Boolean(user)}
                  compact={experience.preferences.compactFeed}
                />
              </div>
              {mode === "live" && isError && !data && (
                <BoardError onRetry={() => void refetch()} busy={isFetching} />
              )}
            </>
          </div>
        )}

        {canScore && (
          <ScoreModal
            matches={data?.matches ?? []}
            rounds={data?.rounds ?? []}
            players={data?.players ?? []}
            teams={data?.teams ?? []}
            sideBets={data?.sideBets ?? []}
            startOpen={Boolean(search.score)}
            initialMatchId={search.match}
            onCloseSearch={() =>
              void navigate({
                to: "/",
                search: { ...search, score: undefined, match: undefined },
                replace: true,
              })
            }
          />
        )}
      </Shell>
    </>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <SkeletonBlock height={168} className="rounded-[calc(var(--radius)+4px)]" />
      <SkeletonBlock height={96} />
      <SkeletonBlock height={96} />
      <span className="sr-only">Loading the scoreboard…</span>
    </div>
  );
}

function BoardError({ onRetry, busy }: { onRetry: () => void; busy: boolean }) {
  return (
    <div className="surface p-6 text-center">
      <p className="t-title text-foreground">The board didn't load</p>
      <p className="t-micro mt-1.5">No connection to the scoreboard right now.</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={busy}
        className="press btn-quiet t-body mt-4"
      >
        {busy ? "Retrying…" : "Try again"}
      </button>
    </div>
  );
}
