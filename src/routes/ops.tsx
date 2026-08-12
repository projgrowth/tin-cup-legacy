import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Circle, Loader2, Wifi } from "lucide-react";
import { toast } from "sonner";

import { AuthCard } from "@/components/tin-cup/AuthCard";
import { PageHeading, Shell } from "@/components/tin-cup/Shell";
import { useAuth } from "@/hooks/useAuth";
import { useTournament } from "@/hooks/useTournament";
import { evaluateReadiness, isEventReady, readinessScore } from "@/lib/ops-checks";
import { getServiceWorkerStatus, type ServiceWorkerStatus } from "@/lib/register-sw";
import { syncMyCaptainAccess } from "@/lib/roles.functions";
import {
  EXPECTED_PLAYER_COUNT,
  VENMO_HANDLE,
  VENMO_IS_PLACEHOLDER,
  WHATSAPP_GROUP_CONFIGURED,
  venmoUrl,
} from "@/lib/tin-cup";

export const Route = createFileRoute("/ops")({
  head: () => ({
    meta: [
      { title: "Event Ops — Tin Cup Invitational 2026" },
      {
        name: "description",
        content: "Weekend readiness checklist and tournament safety tools for captains.",
      },
    ],
  }),
  component: OpsPage,
});

function Row({ done, label, detail }: { done: boolean; label: string; detail?: string }) {
  return (
    <li className="flex items-start gap-3 border-b border-border py-3 last:border-0">
      {done ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
      ) : (
        <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
      )}
      <span className="min-w-0">
        <span className={`t-body block ${done ? "text-foreground" : "text-muted-foreground"}`}>
          {label}
        </span>
        {detail && <span className="t-micro mt-0.5 block">{detail}</span>}
      </span>
    </li>
  );
}

function OpsPage() {
  const { user, loading, canScore, isAdmin, rolesError, refreshRoles } = useAuth();
  const { data, isError, pendingWrites, failedWrites, conflicts } = useTournament();
  const syncCaptain = useServerFn(syncMyCaptainAccess);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sw, setSw] = useState<ServiceWorkerStatus | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    void getServiceWorkerStatus().then(setSw);
  }, []);

  const board = useMemo(
    () =>
      data
        ? {
            teams: data.teams.length,
            players: data.players.length,
            rounds: data.rounds.length,
            matches: data.matches.length,
            sideBets: data.sideBets.length,
          }
        : null,
    [data],
  );

  const flags = evaluateReadiness({
    board,
    canScore,
    pendingWrites,
    failedWrites,
    conflicts,
    online,
    venmoPlaceholder: VENMO_IS_PLACEHOLDER,
  });
  const score = readinessScore(flags);
  const ready = isEventReady(flags);
  const revisionGuardReady =
    Boolean(data?.matches.length) &&
    data!.matches.every((match) => Number.isInteger(match.revision));
  const contestHolesSet = useMemo(() => {
    const bets = data?.sideBets ?? [];
    if (bets.length === 0) return false;
    return bets.filter((b) => b.hole != null).length >= 4;
  }, [data?.sideBets]);
  const decidedMatches = useMemo(
    () => (data?.matches ?? []).filter((m) => m.result !== "pending").length,
    [data?.matches],
  );

  async function trySyncCaptain() {
    setSyncing(true);
    try {
      const result = await syncCaptain({});
      await refreshRoles();
      if (result.granted) {
        toast.success("Captain access granted from email allowlist");
      } else {
        toast.message("No captain grant — ask an admin or configure CAPTAIN_EMAILS");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Shell variant="compact">
      <PageHeading eyebrow="Weekend setup" title="Event Ops" />
      <p className="t-micro -mt-4 mb-6">
        Interactive readiness tools. Written checklist:{" "}
        <code className="text-foreground">EVENT_OPS.md</code>
      </p>

      {loading ? (
        <p className="t-body text-muted-foreground">Checking session…</p>
      ) : !user ? (
        <AuthCard
          redirectPath="/ops"
          blurb="Sign in to verify tournament readiness and scoring access."
        />
      ) : (
        <div className="space-y-6">
          <section className="panel p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="t-eyebrow">Readiness score</h2>
              <p className="t-numeral text-foreground">
                {score.ready}
                <span className="t-micro font-normal text-muted-foreground">/{score.total}</span>
              </p>
            </div>
            <p className="t-body mt-2 text-foreground">
              {ready
                ? "Green across the board — dual-phone smoke is the last manual step."
                : "Finish the red items below before tee time."}
            </p>
          </section>

          <section className="panel p-4">
            <h2 className="t-eyebrow">Live readiness</h2>
            <ul className="mt-1">
              <Row
                done
                label="App build"
                detail={String(import.meta.env.VITE_APP_VERSION ?? "2026.08.03")}
              />
              <Row
                done={flags.venmoReady}
                label="Venmo buy-in handle"
                detail={
                  flags.venmoReady
                    ? `Using @${VENMO_HANDLE}`
                    : `Still placeholder (${VENMO_HANDLE}) — set VITE_VENMO_HANDLE`
                }
              />
              <Row
                done={flags.online}
                label="Network online"
                detail={online ? "Connected" : "Offline"}
              />
              <Row
                done={Boolean(board) && !isError}
                label="Tournament board loads"
                detail={
                  board
                    ? `${board.matches} matches · ${board.sideBets} side pots`
                    : "Board missing — check Nhost"
                }
              />
              <Row
                done={revisionGuardReady}
                label="Cross-device scoring guard"
                detail={
                  revisionGuardReady
                    ? "Revision-based conflict detection is active"
                    : "Apply the unified Nhost migration before tournament play"
                }
              />
              <Row
                done={flags.boardSeeded}
                label="Seed data present"
                detail={`2 teams · ${EXPECTED_PLAYER_COUNT} players · 3 rounds · 23+ matches`}
              />
              <Row
                done={flags.sidePotsSeeded}
                label="Side pots seeded"
                detail="Expect 6 CTP + 2 LD"
              />
              <Row
                done={flags.canScore}
                label="This account can score"
                detail={
                  isAdmin
                    ? "Admin"
                    : canScore
                      ? "Captain"
                      : rolesError
                        ? `Access check failed — retry (${rolesError})`
                        : "No role yet — ask an admin or use the email allowlist"
                }
              />
              <Row
                done={flags.queueClean}
                label="Write queue clean"
                detail={
                  conflicts > 0
                    ? `${conflicts} scoring conflicts need review`
                    : failedWrites > 0
                      ? `${failedWrites} failed writes need retry`
                      : pendingWrites > 0
                        ? `${pendingWrites} pending offline`
                        : "No pending or failed writes"
                }
              />
              <Row
                done={Boolean(data?.syncedAt)}
                label="Last tournament sync"
                detail={
                  data?.syncedAt
                    ? new Date(data.syncedAt).toLocaleString([], {
                        hour: "numeric",
                        minute: "2-digit",
                        month: "short",
                        day: "numeric",
                      })
                    : "No successful sync on this device"
                }
              />
              <Row
                done={Boolean(sw?.registered || (sw && !sw.shouldRegister))}
                label="Service worker"
                detail={
                  sw
                    ? sw.shouldRegister
                      ? sw.registered
                        ? sw.controlling
                          ? "Registered and controlling"
                          : "Registered — reload once to activate"
                        : (sw.reason ?? "Not registered")
                      : (sw.reason ?? "Not required in this environment")
                    : "Checking…"
                }
              />
              <Row
                done={WHATSAPP_GROUP_CONFIGURED}
                label="WhatsApp group link"
                detail={
                  WHATSAPP_GROUP_CONFIGURED
                    ? "VITE_WHATSAPP_GROUP_URL is set"
                    : "Optional — set VITE_WHATSAPP_GROUP_URL for Group chat button"
                }
              />
              <Row
                done={Boolean(data && data.players.length === EXPECTED_PLAYER_COUNT)}
                label="Field roster"
                detail={
                  data
                    ? `${data.players.length}/${EXPECTED_PLAYER_COUNT} player slots seeded`
                    : "Board not loaded"
                }
              />
              <Row
                done={contestHolesSet}
                label="Contest holes posted"
                detail={
                  contestHolesSet
                    ? "CTP/LD holes have numbers — Scout will badge them"
                    : "Still TBD — captains do not pick holes; post when known"
                }
              />
              <Row
                done={decidedMatches > 0}
                label="Scoring dry run complete"
                detail={
                  decidedMatches > 0
                    ? `${decidedMatches} match result(s) on the board (clear test scores after smoke)`
                    : "No results yet — run two-phone test before Friday"
                }
              />
            </ul>
          </section>

          <section className="panel space-y-3 p-4">
            <h2 className="t-eyebrow">Captain access</h2>
            <p className="t-micro">
              Captain roles are granted by an admin. A server-only email allowlist can also be
              configured with:{" "}
              <code className="text-foreground">CAPTAIN_EMAILS=a@x.com,b@y.com</code>
            </p>
            <button
              type="button"
              disabled={syncing}
              onClick={() => void trySyncCaptain()}
              className="press btn-gold t-body w-full"
            >
              {syncing ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Syncing…
                </>
              ) : (
                "Sync my captain access now"
              )}
            </button>
            <div className="flex gap-2">
              <Link to="/profile" className="press btn-quiet t-body flex-1 text-center">
                Profile
              </Link>
              <Link to="/admin" className="press btn-quiet t-body flex-1 text-center">
                Admin
              </Link>
            </div>
          </section>

          <section className="panel space-y-3 p-4">
            <h2 className="t-eyebrow">Two-phone scoring test</h2>
            <p className="t-micro">
              Use a captain phone and a spectator phone before the event. On a clearly identified
              test match, post a result, verify it appears on both phones, then immediately tap
              Clear. Repeat once in airplane mode and confirm it syncs after reconnecting.
            </p>
            <p className="t-micro rounded-[var(--radius)] border border-border bg-secondary/20 p-3">
              This page intentionally never creates or flushes a fake score. Every production write
              must be tied to a match a captain explicitly selects.
            </p>
          </section>

          <section className="panel space-y-3 p-4">
            <h2 className="t-eyebrow">Quick links</h2>
            <a
              href={venmoUrl}
              target="_blank"
              rel="noreferrer"
              className="press btn-quiet t-body flex w-full items-center justify-center gap-2"
            >
              <Wifi className="size-4" /> Test Venmo $150 link
            </a>
            <Link to="/" className="press btn-quiet t-body flex w-full items-center justify-center">
              Open live board
            </Link>
            <Link
              to="/"
              search={{ board: true }}
              className="press btn-quiet t-body flex w-full items-center justify-center"
            >
              Clubhouse display board
            </Link>
            <Link
              to="/scout"
              search={{ course: "south", hole: 1 }}
              className="press btn-quiet t-body flex w-full items-center justify-center"
            >
              South course planner
            </Link>
          </section>

          <section className="panel space-y-3 p-4">
            <h2 className="t-eyebrow">Pre-Friday freeze</h2>
            <ol className="t-micro list-decimal space-y-2 pl-4 text-muted-foreground">
              <li>Deploy planner branch and smoke /, /scout, claim, captain score.</li>
              <li>Run two-phone scoring test above on a throwaway result then Clear.</li>
              <li>Install app on both captain phones (Add to Home Screen).</li>
              <li>Post CTP/LD holes when set — do not invent.</li>
              <li>Content-only updates after freeze; no schema thrash.</li>
            </ol>
          </section>
        </div>
      )}
    </Shell>
  );
}
