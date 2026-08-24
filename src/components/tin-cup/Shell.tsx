import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AlertTriangle, CloudOff } from "lucide-react";

import { BottomNav } from "./BottomNav";
import { BrandMark } from "./BrandMark";
import { PageMasthead } from "./PageMasthead";
import { Avatar } from "./Avatar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useJournal";
import {
  usePendingWrites,
  useFailedWrites,
  useWriteConflicts,
  useTournament,
} from "@/hooks/useTournament";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { tallyStandings } from "@/lib/scoring";
import { retryFailed } from "@/lib/write-queue";
import { playerInitials } from "@/lib/team-styles";
import { getEventPhase } from "@/lib/event-phase";
import { isPreviewMode } from "@/lib/runtime-mode";
import { claimedPlayerIdFor } from "@/lib/profile-identity";

type ShellVariant = "compact" | "content" | "dashboard" | "immersive" | "theater";

export function Shell({
  children,
  variant = "content",
}: {
  children: ReactNode;
  variant?: ShellVariant;
}) {
  const { user, canScore, isAdmin } = useAuth();
  const { profile } = useProfile();
  const { data: tournament, isError: tournamentError, isFetching } = useTournament();
  const pending = usePendingWrites();
  const failed = useFailedWrites();
  const conflicts = useWriteConflicts();
  const [online, setOnline] = useState(true);
  const [preview, setPreview] = useState(() => isPreviewMode());
  const [compact, setCompact] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const staleBoard = tournamentError && Boolean(tournament);
  const playerId = claimedPlayerIdFor(user?.id, profile?.player_id);
  const claimed = tournament?.players.find((p) => p.id === playerId);
  const claimedTeam = claimed ? tournament?.teams.find((t) => t.id === claimed.team_id) : undefined;
  const avatars = usePlayerAvatars(tournament?.players ?? [], tournament?.teams ?? []);
  const face = claimed ? avatars.data?.byPlayerId.get(claimed.id) : undefined;
  const standings = tallyStandings(tournament?.matches ?? []);
  const cupLive = standings.played > 0 || getEventPhase() === "live";
  const fmtPts = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (variant === "theater") return;
    window.scrollTo(0, 0);
  }, [pathname, variant]);

  useEffect(() => {
    if (variant !== "theater") return;
    const root = document.documentElement;
    root.classList.add("theater-open");
    return () => root.classList.remove("theater-open");
  }, [variant]);

  useEffect(() => {
    setPreview(isPreviewMode());
    setOnline(navigator.onLine);
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    return () => {
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
    };
  }, []);
  const immersive = variant === "immersive";
  const theater = variant === "theater";
  const width =
    variant === "compact"
      ? "max-w-xl"
      : variant === "dashboard" || immersive
        ? "max-w-6xl"
        : "max-w-4xl";
  if (theater) {
    return (
      <div className="theater relative min-h-svh overflow-hidden bg-black" data-theater="open" style={{ overscrollBehavior: "contain" }}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-hunter focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <main id="main-content" className="relative min-h-svh">
          {children}
        </main>
      </div>
    );
  }
  return (
    <div
      className="min-h-screen overscroll-contain pb-[calc(var(--nav-height)+env(safe-area-inset-bottom)+1rem)]"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-hunter focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header
        className={`sticky top-0 z-30 ${immersive ? "bg-background" : "bg-background"}`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div
          className={`mx-auto grid w-full ${width} grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-5 ${
            compact ? "min-h-12 py-1.5" : "min-h-14 py-2"
          }`}
        >
          <Link to="/" className="flex min-w-0 items-center gap-2.5 no-underline">
            <BrandMark size="xs" decorative />
            {cupLive ? (
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span
                    className="size-1.5 animate-pulse rounded-full bg-[var(--status-live)]"
                    aria-label="Cup live"
                  />
                  <span className="t-numeral text-[1.05rem] tracking-tight">
                    <span className="text-hunter">{fmtPts(standings.strongMental)}</span>
                    <span className="mx-0.5 text-muted-foreground">–</span>
                    <span className="text-stone">{fmtPts(standings.grassRoots)}</span>
                  </span>
                </span>
                <span className="t-micro mt-0.5 block truncate">Tin Cup</span>
              </span>
            ) : (
              <span className="min-w-0">
                <span className="t-title block truncate text-foreground">
                  Tin Cup
                </span>
                <span className={`t-micro mt-1 block truncate leading-none ${compact ? "hidden" : ""}`}>
                  Invitational
                </span>
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            aria-label={
              user
                ? claimed || playerId
                  ? "Your hub"
                  : "Your account"
                : "Sign in"
            }
            className={
              claimed || user
                ? "press relative flex min-h-11 min-w-11 shrink-0 items-center justify-center no-underline"
                : "press btn-quiet relative min-h-11 shrink-0 px-4 no-underline"
            }
          >
            {claimed ? (
              <Avatar name={claimed.name} teamSlug={claimedTeam?.slug} src={face?.url} size="md" />
            ) : user ? (
              <span className="flex size-10 items-center justify-center rounded-full border border-border bg-secondary text-sm font-semibold uppercase text-foreground">
                {playerInitials(user.email?.split("@")[0] || "P")}
              </span>
            ) : (
              <span className="text-sm font-semibold leading-none text-foreground">Sign in</span>
            )}
            {user && !playerId && (
              <span
                aria-label="Open account"
                className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border border-background bg-foreground"
              />
            )}
            {user && canScore && (
              <span
                aria-label={isAdmin ? "Admin account" : "Captain account"}
                className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border border-background bg-secondary text-[8px] font-bold text-foreground"
              >
                {isAdmin ? "A" : "C"}
              </span>
            )}
          </Link>
        </div>
        <div className="h-px w-full bg-border" />
      </header>
      {preview && (
        <div
          role="status"
          className="bg-hunter/10 px-4 py-2 text-center text-xs font-semibold text-hunter"
        >
          Protected preview · writes are simulated and tournament data stays read-only
        </div>
      )}
      <GlobalSyncStatus
        pending={pending.length}
        failed={failed.length}
        conflicts={conflicts.length}
        online={online}
        stale={staleBoard}
        syncing={isFetching && !tournamentError}
        syncedAt={tournament?.syncedAt}
      />
      <main id="main-content" className={`mx-auto w-full ${width} px-4 pt-2 sm:px-5 sm:pt-3`}>
        {children}
      </main>
      <BottomNav live={cupLive} />
    </div>
  );
}

function formatSyncTime(syncedAt?: number) {
  if (!syncedAt) return null;
  return new Date(syncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function GlobalSyncStatus({
  pending,
  failed,
  conflicts,
  online,
  stale,
  syncing,
  syncedAt,
}: {
  pending: number;
  failed: number;
  conflicts: number;
  online: boolean;
  stale?: boolean;
  syncing?: boolean;
  syncedAt?: number;
}) {
  const when = formatSyncTime(syncedAt);
  const banner =
    "sticky top-[calc(var(--header-height)+env(safe-area-inset-top))] z-20 mx-auto mt-0 flex w-full max-w-6xl items-center gap-2 border-b px-4 py-2.5 sm:px-5";

  if (conflicts > 0) {
    return (
      <div role="alert" className={`${banner} border-copper/40 bg-copper/15 text-copper`}>
        <AlertTriangle className="size-4 shrink-0" />
        <span className="t-micro-strong flex-1 text-copper">
          {conflicts} scoring conflict{conflicts === 1 ? "" : "s"} — open Live and resolve before
          posting more results.
        </span>
        <Link
          to="/"
          className="press min-h-11 shrink-0 rounded-lg border border-copper/40 px-3 py-2 t-micro text-copper"
        >
          Review
        </Link>
      </div>
    );
  }
  if (failed > 0) {
    return (
      <div role="alert" className={`${banner} border-copper/40 bg-copper/15 text-copper`}>
        <AlertTriangle className="size-4 shrink-0" />
        <span className="t-micro-strong flex-1 text-copper">
          {failed} update{failed === 1 ? "" : "s"} failed to save
          {when ? ` · last good ${when}` : ""}.
        </span>
        <button
          type="button"
          onClick={() => void retryFailed()}
          className="press min-h-11 shrink-0 rounded-lg border border-copper/40 px-3 py-2 t-micro text-copper"
        >
          Retry
        </button>
      </div>
    );
  }
  if (pending > 0) {
    return (
      <div
        aria-live="polite"
        className={`${banner} border-border bg-secondary text-muted-foreground`}
      >
        <CloudOff className="size-4 shrink-0" />
        <span className="t-micro-strong flex-1">
          {pending} offline update{pending === 1 ? "" : "s"} waiting to sync
          {!online ? " · still offline" : online && syncing ? " · reconnecting…" : ""}.
        </span>
      </div>
    );
  }
  if (!online) {
    return (
      <div
        aria-live="polite"
        className={`${banner} border-border bg-secondary`}
      >
        <CloudOff className="size-4 shrink-0 text-muted-foreground" />
        <span className="t-micro-strong flex-1 text-foreground">
          Offline — showing saved data{when ? ` · synced ${when}` : ""}.
        </span>
      </div>
    );
  }
  if (stale) {
    return (
      <div role="status" className={`${banner} border-border bg-secondary`}>
        <AlertTriangle className="size-4 shrink-0 text-muted-foreground" />
        <span className="t-micro-strong flex-1 text-muted-foreground">
          Showing cached board{when ? ` · last synced ${when}` : ""}. Pull to refresh when online.
        </span>
      </div>
    );
  }
  return null;
}

export function PageHeading({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-5 sm:mb-6">
      <PageMasthead kicker={eyebrow} title={title} meta={meta} />
    </div>
  );
}

/** A single shimmering placeholder block. */
export function SkeletonBlock({
  height = 96,
  className = "",
}: {
  height?: number | string;
  className?: string;
}) {
  return <div aria-hidden className={`skeleton ${className}`} style={{ height }} />;
}

/** Placeholder rows shown while tournament data loads. */
export function LoadingRows({ rows = 3, height = 96 }: { rows?: number; height?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} height={height} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Skeleton for a form/card page: heading bar plus stacked field rows. */
export function LoadingForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <SkeletonBlock height={20} className="w-1/3" />
      <div className="surface space-y-3 p-4">
        {Array.from({ length: fields }).map((_, i) => (
          <SkeletonBlock key={i} height={42} />
        ))}
        <SkeletonBlock height={46} />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Shared failure state with a retry affordance. */
export function ErrorState({
  title = "Couldn't load that",
  detail = "No connection to the tournament board right now.",
  onRetry,
  busy = false,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="surface fade-up px-5 py-8 text-center" role="alert">
      <p className="t-title text-foreground">{title}</p>
      <p className="t-micro mt-1.5 max-w-sm mx-auto text-muted-foreground">{detail}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={busy}
          className="press btn-quiet t-body mt-4 min-h-11 px-5"
        >
          {busy ? "Retrying…" : "Try again"}
        </button>
      )}
    </div>
  );
}
