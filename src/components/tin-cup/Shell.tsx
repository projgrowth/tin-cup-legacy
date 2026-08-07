import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CloudOff } from "lucide-react";

import { BottomNav } from "./BottomNav";
import { Avatar } from "./Avatar";
import { useAuth } from "@/hooks/useAuth";
import {
  usePendingWrites,
  useFailedWrites,
  useWriteConflicts,
  useTournament,
} from "@/hooks/useTournament";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { graphqlRequest } from "@/integrations/nhost/graphql";
import { tallyStandings } from "@/lib/scoring";
import { retryFailed } from "@/lib/write-queue";
import { playerInitials } from "@/lib/team-styles";

type ShellVariant = "compact" | "content" | "dashboard";

export function Shell({
  children,
  variant = "content",
}: {
  children: ReactNode;
  variant?: ShellVariant;
}) {
  const { user, canScore, isAdmin } = useAuth();
  const { data: tournament } = useTournament();
  const pending = usePendingWrites();
  const failed = useFailedWrites();
  const conflicts = useWriteConflicts();
  const [online, setOnline] = useState(true);

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
  const claimedTeam = claimed
    ? tournament?.teams.find((t) => t.id === claimed.team_id)
    : undefined;
  const avatars = usePlayerAvatars(tournament?.players ?? [], tournament?.teams ?? []);
  const face = claimed ? avatars.data?.byPlayerId.get(claimed.id) : undefined;
  const standings = tallyStandings(tournament?.matches ?? []);
  const cupLive = standings.played > 0;
  const fmtPts = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  useEffect(() => {
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
  const width =
    variant === "compact" ? "max-w-xl" : variant === "dashboard" ? "max-w-6xl" : "max-w-4xl";
  return (
    <div className="min-h-screen pb-[calc(6.75rem+env(safe-area-inset-bottom))]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-gold focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md">
        <div
          className={`mx-auto grid w-full ${width} grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 sm:px-5`}
        >
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img
              src="/tin-cup-logo.png"
              alt="The Tin Cup Invitational"
              width={28}
              height={28}
              className="size-7 shrink-0 object-contain"
            />
            <span className="min-w-0 leading-none">
              <span className="t-section block truncate text-foreground">Tin Cup</span>
              <span className="mt-0.5 hidden truncate text-[0.6875rem] leading-tight tracking-[0.04em] text-muted-foreground min-[370px]:block">
                {cupLive ? (
                  <>
                    <span className="text-gold-light">{fmtPts(standings.strongMental)}</span>
                    <span className="mx-0.5">–</span>
                    <span className="text-copper">{fmtPts(standings.grassRoots)}</span>
                    <span className="ml-1.5">Cup</span>
                  </>
                ) : (
                  "Innisbrook · 2026"
                )}
              </span>
            </span>
          </Link>
          <Link
            to="/profile"
            aria-label={
              user
                ? claimed
                  ? "Your hub"
                  : "Claim your roster name"
                : "Sign in"
            }
            className="press relative shrink-0"
          >
            {claimed ? (
              <Avatar
                name={claimed.name}
                teamSlug={claimedTeam?.slug}
                src={face?.url}
                size="md"
              />
            ) : (
              <span
                className={`flex size-10 items-center justify-center rounded-full border text-sm font-semibold uppercase ${
                  user
                    ? "border-border bg-secondary text-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {user
                  ? playerInitials(user.email?.split("@")[0] || "P")
                  : "?"}
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
      <GlobalSyncStatus
        pending={pending.length}
        failed={failed.length}
        conflicts={conflicts.length}
        online={online}
      />
      <main id="main-content" className={`mx-auto w-full ${width} px-4 pt-3.5 sm:px-5 sm:pt-5`}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

function GlobalSyncStatus({
  pending,
  failed,
  conflicts,
  online,
}: {
  pending: number;
  failed: number;
  conflicts: number;
  online: boolean;
}) {
  if (conflicts > 0) {
    return (
      <div
        role="alert"
        className="mx-auto mt-2 flex w-[calc(100%-2.5rem)] max-w-6xl items-center gap-2 rounded-xl border border-copper/40 bg-copper/10 px-3 py-2 text-copper"
      >
        <AlertTriangle className="size-4 shrink-0" />
        <span className="t-micro flex-1 text-copper">
          {conflicts} update{conflicts === 1 ? "" : "s"} conflicted. Refresh before retrying.
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
      <div
        role="alert"
        className="mx-auto mt-2 flex w-[calc(100%-2.5rem)] max-w-6xl items-center gap-2 rounded-xl border border-copper/40 bg-copper/10 px-3 py-2 text-copper"
      >
        <AlertTriangle className="size-4 shrink-0" />
        <span className="t-micro flex-1 text-copper">
          {failed} update{failed === 1 ? "" : "s"} failed to save. Open Live to retry.
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
        className="mx-auto mt-2 flex w-[calc(100%-2.5rem)] max-w-6xl items-center gap-2 rounded-xl border border-border bg-secondary/80 px-3 py-2 text-muted-foreground"
      >
        <CloudOff className="size-4 shrink-0" />
        <span className="t-micro text-muted-foreground">
          {pending} update{pending === 1 ? "" : "s"} saved offline and waiting to sync.
        </span>
      </div>
    );
  }
  if (!online) {
    return (
      <div
        aria-live="polite"
        className="mx-auto mt-2 flex w-[calc(100%-2.5rem)] max-w-6xl items-center gap-2 rounded-xl border border-border bg-secondary/70 px-3 py-2"
      >
        <CloudOff className="size-4 shrink-0 text-muted-foreground" />
        <span className="t-micro">Offline — showing saved tournament data.</span>
      </div>
    );
  }
  return null;
}

export function PageHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="mb-8 sm:mb-10">
      <p className="t-eyebrow">{eyebrow}</p>
      <h1 className="t-display mt-2 text-foreground">{title}</h1>
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
    <div className="surface p-6 text-center" role="alert">
      <p className="t-title text-foreground">{title}</p>
      <p className="t-micro mt-1.5">{detail}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={busy}
          className="press btn-quiet t-body mt-4"
        >
          {busy ? "Retrying…" : "Try again"}
        </button>
      )}
    </div>
  );
}
