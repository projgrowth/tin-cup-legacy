import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { CinematicIntro } from "@/components/tin-cup/CinematicIntro";
import { ShareMomentButton } from "@/components/tin-cup/ShareMomentButton";
import { WeekendRecap } from "@/components/tin-cup/WeekendRecap";
import { SocialClubhouseFeed } from "@/components/tin-cup/SocialClubhouseFeed";
import { HomeSecondaryModules } from "@/components/tin-cup/HomeDashboard";
import { ScoreModal } from "@/components/tin-cup/ScoreModal";
import { Shell, SkeletonBlock } from "@/components/tin-cup/Shell";
import { DisplayBoard } from "@/components/tin-cup/live/DisplayBoard";
import { LivePanel, PreTournamentPanel } from "@/components/tin-cup/panels";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useJournal";
import { useTournament } from "@/hooks/useTournament";
import { usePlanningProgress } from "@/hooks/usePlanningProgress";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useExperiencePreferences } from "@/hooks/useExperiencePreferences";
import { getEventPhase, phaseMode } from "@/lib/event-phase";
import { type BoardMode } from "@/lib/tin-cup";
import { tallyStandings } from "@/lib/scoring";
import { shouldPlayIntro } from "@/lib/intro";
import { hasAuthCallbackParams, parseAuthCallbackParams } from "@/lib/auth-recovery";
import { resolveIdentity } from "@/lib/profile-identity";
import { buildWeekendContext } from "@/lib/weekend-context";
import { smartHomeModules, type FeedFilter } from "@/lib/social-platform";

const MODES: Array<{ key: BoardMode; label: string }> = [
  { key: "pre", label: "Weekend" },
  { key: "live", label: "Live" },
  { key: "post", label: "Legacy" },
] as const;

const PHASE_OVERRIDE_KEY = "tin-cup-phase-override-v1";

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
      links: [{ rel: "preload", as: "image", href: "/tin-cup-intro-poster.jpg" }],
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
  const [autoMode, setAutoMode] = useState<BoardMode>("pre");
  const [override, setOverride] = useState<BoardMode | null>(null);
  const [introDone, setIntroDone] = useState(true);

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
    setAutoMode(phaseMode(getEventPhase()));
    const saved = window.sessionStorage.getItem(PHASE_OVERRIDE_KEY);
    if (saved === "pre" || saved === "live" || saved === "post") setOverride(saved);
    // Show film only once per browser (localStorage) and never during live phase.
    setIntroDone(!shouldPlayIntro());
  }, []);

  // Keep the board honest if the app is left open across the first tee.
  useEffect(() => {
    const sync = () => setAutoMode(phaseMode(getEventPhase()));
    const id = window.setInterval(sync, 60_000);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const mode = search.story === "recap" ? "post" : (override ?? autoMode);

  function selectMode(value: string) {
    if (value === "auto") {
      setOverride(null);
      window.sessionStorage.removeItem(PHASE_OVERRIDE_KEY);
      return;
    }
    if (value === "pre" || value === "live" || value === "post") {
      setOverride(value);
      window.sessionStorage.setItem(PHASE_OVERRIDE_KEY, value);
    }
  }

  const {
    data,
    isPending,
    isError,
    refetch,
    isFetching,
    pendingWrites,
    failedWrites,
    conflicts,
    retryFailedWrites,
    flashedMatchIds,
    realtimeStatus,
  } = useTournament();
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const experience = useExperiencePreferences(user?.id);
  const planning = usePlanningProgress();
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
  const standings = tallyStandings(data?.matches ?? []);
  const canonicalUrl =
    typeof window === "undefined" ? "https://www.tincupinv.com/" : window.location.href;
  const weekendContext = buildWeekendContext({
    phase: mode,
    signedIn: Boolean(user),
    identityPending: Boolean(user) && identity.kind === "loading",
    player: claimedPlayer ?? null,
    rounds: data?.rounds ?? [],
    matches: data?.matches ?? [],
    canScore,
    plannedHoles: planning.best,
    pendingWrites,
    failedWrites,
    conflicts,
  });
  const activity = useActivityFeed(data?.players ?? [], data?.teams ?? []);
  const photoCount = (activity.data ?? []).filter(
    (item) => item.kind === "photo" || item.kind === "avatar",
  ).length;

  useEffect(() => {
    if (!claimedPlayer) return;
    const team = (data?.teams ?? []).find((candidate) => candidate.id === claimedPlayer.team_id);
    if (team) document.documentElement.dataset.team = team.slug;
    return () => {
      delete document.documentElement.dataset.team;
    };
  }, [claimedPlayer, data?.teams]);

  useEffect(() => {
    if (!introDone || !search.post) return;
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
  }, [introDone, search.comment, search.post]);

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
      {!introDone && <CinematicIntro onDone={() => setIntroDone(true)} />}
      <Shell variant={mode === "pre" ? "content" : "dashboard"}>
        {/* Claim nudge on live; pre mode uses the raised card in PreTournamentPanel */}
        {needsClaim && mode === "live" && (
          <Link
            to="/profile"
            className="press surface-raised mb-3 flex items-center justify-between gap-3 px-4 py-3"
          >
            <span className="min-w-0">
              <span className="t-body block font-medium text-foreground">
                Claim your roster name
              </span>
              <span className="t-micro block text-muted-foreground">
                Unlocks your player card, private notes, and photo credits
              </span>
            </span>
            <span className="t-micro shrink-0 font-semibold text-hunter">Account →</span>
          </Link>
        )}
        {(canScore || isAdmin) && (
          <PhaseControl mode={mode} automatic={!override} onChange={selectMode} />
        )}

        {mode === "post" ? (
          <div className="mt-3">
            {isPending && !data ? (
              <BoardSkeleton />
            ) : isError && !data ? (
              <BoardError onRetry={() => void refetch()} busy={isFetching} />
            ) : data ? (
              <WeekendRecap
                matches={data.matches}
                players={data.players}
                teams={data.teams}
                sideBets={data.sideBets}
                trophies={data.trophies}
              />
            ) : null}
          </div>
        ) : (
        <div className={mode === "pre" ? "" : "home-dashboard mt-1"}>
          {mode === "pre" && (
            <div className="home-action">
              <PreTournamentPanel
                rounds={data?.rounds ?? []}
                matches={data?.matches ?? []}
                players={data?.players ?? []}
                teams={data?.teams ?? []}
                canUpload={Boolean(user)}
                signedIn={Boolean(user)}
                claimedName={claimedPlayer?.name ?? null}
                needsClaim={needsClaim}
                context={weekendContext}
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
                variant="hero"
                rounds={data?.rounds ?? []}
                matches={data?.matches ?? []}
                teams={data?.teams ?? []}
                players={data?.players ?? []}
                sideBets={data?.sideBets ?? []}
                syncedAt={data?.syncedAt}
                pendingWrites={pendingWrites}
                failedWrites={failedWrites}
                onRetryFailed={() => void retryFailedWrites()}
                stale={stale || realtimeStatus === "stale"}
                canScore={canScore}
                claimedName={claimedPlayer?.name ?? null}
                flashedMatchIds={flashedMatchIds}
              />
            )}
          </div>
          )}
          {mode !== "pre" && (
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
          <aside className="home-secondary min-w-0 space-y-5 lg:sticky lg:top-28 lg:self-start">
            {mode === "live" && isError && !data && (
              <BoardError onRetry={() => void refetch()} busy={isFetching} />
            )}
            <HomeSecondaryModules
              order={smartHomeModules(
                mode,
                experience.preferences.homeModules,
                experience.preferences.layoutMode,
              )}
              context={weekendContext}
              sideBets={data?.sideBets ?? []}
              photoCount={photoCount}
            />
            <ShareMomentButton
              className="w-full"
              payload={{
                kind: "score",
                eyebrow: mode === "live" ? "Live Cup score" : "The fourth annual",
                title: "Tin Cup Invitational",
                primary: `${standings.strongMental} – ${standings.grassRoots}`,
                secondary: "Strong Mental · Grass Roots",
                canonicalUrl,
              }}
            >
              Share board
            </ShareMomentButton>
          </aside>
          </>
          )}
        </div>
        )}

        {canScore && mode === "live" && (
          <ScoreModal
            matches={data?.matches ?? []}
            rounds={data?.rounds ?? []}
            players={data?.players ?? []}
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

function PhaseControl({
  mode,
  automatic,
  onChange,
}: {
  mode: BoardMode;
  automatic: boolean;
  onChange: (value: string) => void;
}) {
  const label = MODES.find((item) => item.key === mode)?.label ?? "Weekend";
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
      <p className="t-micro min-w-0">
        <span className="mr-2 inline-block size-1.5 rounded-full bg-muted-foreground align-middle" />
        {automatic ? `Auto · ${label}` : `Viewing · ${label}`}
      </p>
      <label className="sr-only" htmlFor="phase-view">
        View tournament phase
      </label>
      <select
        id="phase-view"
        value={automatic ? "auto" : mode}
        onChange={(event) => onChange(event.target.value)}
        className="control t-micro min-h-11 w-auto py-1.5 pl-3 pr-8"
      >
        <option value="auto">Automatic</option>
        {MODES.map((item) => (
          <option key={item.key} value={item.key}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
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
