import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CloudOff } from "lucide-react";

import { BottomNav } from "./BottomNav";
import { SeatWelcome } from "./SeatWelcome";
import { Avatar } from "./Avatar";
import { useAuth } from "@/hooks/useAuth";
import {
  usePendingWrites,
  useFailedWrites,
  useWriteConflicts,
  useTournament,
} from "@/hooks/useTournament";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { graphqlRequest } from "@/integrations/supabase/graphql";
import { tallyStandings } from "@/lib/scoring";
import { retryFailed } from "@/lib/write-queue";
import { playerInitials } from "@/lib/team-styles";
import { getEventPhase } from "@/lib/event-phase";
import { isPreviewMode } from "@/lib/runtime-mode";

type ShellVariant = "compact" | "content" | "dashboard" | "immersive" | "theater";

export function Shell({
  children,
  variant = "content",
}: {
  children: ReactNode;
  variant?: ShellVariant;
}) {
  const { user, canScore, isAdmin } = useAuth();
  const { data: tournament, isError: tournamentError, isFetching } = useTournament();
  const pending = usePendingWrites();
  const failed = useFailedWrites();
  const conflicts = useWriteConflicts();
  const [online, setOnline] = useState(true);
  const [preview, setPreview] = useState(() => isPreviewMode());
  const staleBoard = tournamentError && Boolean(tournament);

  const { data: myPlayerId } = useQuery({
    queryKey: ["my-player", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const res = await graphqlRequest<
        { profiles_by_pk: { player_id: string | null } | null },
        { id: string }
      >(`query MyRosterSpot($id: uuid!) { profiles_by_pk(id: $id) { player_id } }`, {
        id: user!.id,
      });
      return res.profiles_by_pk?.player_id ?? null;
    },
  });

  const claimed = tournament?.players.find((p) => p.id === myPlayerId);
  const claimedTeam = claimed ? tournament?.teams.find((t) => t.id === claimed.team_id) : undefined;
  const avatars = usePlayerAvatars(tournament?.players ?? [], tournament?.teams ?? []);
  const face = claimed ? avatars.data?.byPlayerId.get(claimed.id) : undefined;
  const standings = tallyStandings(tournament?.matches ?? []);
  const cupLive = standings.played > 0 || getEventPhase() === "live";
  const fmtPts = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

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
      <div className="relative min-h-svh bg-black">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-gold focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <main id="main-content" className="relative min-h-svh">
          {children}
        </main>
        <SeatWelcome />
      </div>
    );
  }
  return (
    <div
      className={`min-h-screen ${
        immersive
          ? "pb-[calc(var(--nav-height)+var(--space-4)+env(safe-area-inset-bottom))] md:pb-10"
          : "pb-[calc(var(--nav-height)+var(--space-5)+env(safe-area-inset-bottom))] lg:pb-24"
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-gold focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header
        className={`sticky top-0 z-30 ${
          immersive ? "bg-background/55 backdrop-blur-xl" : "bg-background/80 backdrop-blur-md"
        }`}
      >
        <div
          className={`mx-auto grid w-full ${width} min-h-[var(--header-height)] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 ${
            immersive ? "py-1.5" : "py-2"
          } sm:px-5`}
        >
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img
              src="/tin-cup-logo.png"
              alt="The Tin Cup Invitational"
              width={34}
              height={34}
              className="size-8.5 shrink-0 object-contain"
            />
            {cupLive ? (
              <span className="flex items-center gap-2">
                <span
                  className="size-1.5 animate-pulse rounded-full bg-[var(--status-live)]"
                  aria-label="Cup live"
                />
                <span className="t-numeral text-[0.95rem] tracking-tight">
                  <span className="text-gold-light">{fmtPts(standings.strongMental)}</span>
                  <span className="mx-0.5 text-muted-foreground">–</span>
                  <span className="text-copper">{fmtPts(standings.grassRoots)}</span>
                </span>
              </span>
            ) : null}
          </Link>
          <Link
            to="/profile"
            aria-label={user ? (claimed ? "Your hub" : "Claim your roster name") : "Sign in"}
            className="press relative shrink-0"
          >
            {claimed ? (
              <Avatar name={claimed.name} teamSlug={claimedTeam?.slug} src={face?.url} size="md" />
            ) : (
              <span
                className={`flex size-11 items-center justify-center rounded-full border text-sm font-semibold uppercase ${
                  user
                    ? "border-border bg-secondary text-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {user ? playerInitials(user.email?.split("@")[0] || "P") : "?"}
              </span>
            )}
            {user && !claimed && (
              <span
                aria-label="Claim your name"
                className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border border-background bg-gold"
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
        <div className={`mx-auto h-px w-full ${width} bg-border`} />
      </header>
      {preview && (
        <div
          role="status"
          className="bg-gold/10 px-4 py-2 text-center text-xs font-semibold text-gold-light"
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
      <main
        id="main-content"
        className={`mx-auto w-full ${width} px-4 pt-3 sm:px-5 sm:pt-4`}
      >
        {children}
      </main>
      <BottomNav live={cupLive} />
      <SeatWelcome />
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
    "sticky top-[var(--header-height)] z-20 mx-auto mt-0 flex w-full max-w-6xl items-center gap-2 border-b px-4 py-2.5 sm:px-5";

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
        className={`${banner} border-border bg-secondary/95 text-muted-foreground backdrop-blur-md`}
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
        className={`${banner} border-border bg-secondary/95 backdrop-blur-md`}
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
      <div role="status" className={`${banner} border-border bg-secondary/90 backdrop-blur-md`}>
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
    <header className="mb-5 sm:mb-6">
      <p className="t-eyebrow">{eyebrow}</p>
      <h1 className="t-display mt-2 text-foreground">{title}</h1>
      {meta ? <div className="t-body mt-2 max-w-2xl text-muted-foreground">{meta}</div> : null}
    </header>
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
