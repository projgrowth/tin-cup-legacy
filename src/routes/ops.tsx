import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Smartphone,
  ExternalLink,
  Map,
  Radio,
} from "lucide-react";
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

const DRY_RUN_KEY = "tc-ops-dry-run-v1";

const DRY_RUN_STEPS = [
  {
    id: "spectator",
    label: "Spectator opens Live",
    detail: "Board loads (0–0 or last score) — no blank crash",
  },
  {
    id: "post",
    label: "Captain posts one test result",
    detail: "Toast success · both phones update within a few seconds",
  },
  {
    id: "clear",
    label: "Captain clears the test match",
    detail: "Returns to Not played on both phones",
  },
  {
    id: "pairing",
    label: "Captain sets a pairing",
    detail: "Names appear under the match for the spectator",
  },
  {
    id: "ctp",
    label: "Captain claims a CTP",
    detail: "Name under Side cash · Purse claimed total moves",
  },
  {
    id: "offline",
    label: "Airplane mode → post → reconnect",
    detail: "Pending banner, then auto-sync · spectator updates",
  },
  {
    id: "pwa",
    label: "Both captains install PWA",
    detail: "Add to Home Screen on iPhone/Android",
  },
] as const;

type DryRunId = (typeof DRY_RUN_STEPS)[number]["id"];

function loadDryRun(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(DRY_RUN_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function Row({
  done,
  label,
  detail,
  critical,
}: {
  done: boolean;
  label: string;
  detail?: string;
  critical?: boolean;
}) {
  return (
    <li className="flex items-start gap-3 border-b border-border/60 py-3 last:border-0">
      {done ? (
        <CheckCircle2
          className="mt-0.5 size-4 shrink-0 text-[oklch(0.72_0.12_155)]"
          strokeWidth={1.8}
        />
      ) : (
        <Circle
          className={`mt-0.5 size-4 shrink-0 ${
            critical ? "text-copper" : "text-muted-foreground"
          }`}
          strokeWidth={1.8}
        />
      )}
      <span className="min-w-0">
        <span
          className={`t-body block font-medium ${
            done ? "text-foreground" : critical ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {label}
        </span>
        {detail && (
          <span className="t-micro mt-0.5 block text-muted-foreground">{detail}</span>
        )}
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
  const [dryRun, setDryRun] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setDryRun(loadDryRun());
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    void getServiceWorkerStatus().then(setSw);
  }, []);

  function toggleDry(id: DryRunId) {
    setDryRun((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(DRY_RUN_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function resetDryRun() {
    setDryRun({});
    try {
      window.localStorage.removeItem(DRY_RUN_KEY);
    } catch {
      /* ignore */
    }
  }

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

  const dryDone = DRY_RUN_STEPS.filter((s) => dryRun[s.id]).length;
  const dryComplete = dryDone === DRY_RUN_STEPS.length;

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
      <PageHeading
        eyebrow="Weekend setup"
        title="Event Ops"
        meta="Readiness lights · dual-phone checklist · captain tools"
      />

      {loading ? (
        <p className="t-body text-muted-foreground">Checking session…</p>
      ) : !user ? (
        <AuthCard
          redirectPath="/ops"
          blurb="Sign in to verify tournament readiness and scoring access."
        />
      ) : (
        <div className="stack-page pb-4">
          {/* Score hero */}
          <section
            className={`panel p-5 ${
              ready && dryComplete
                ? "border border-[oklch(0.72_0.12_155/30%)]"
                : ""
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="t-eyebrow">System readiness</p>
                <p className="t-display mt-1 text-foreground">
                  {score.ready}
                  <span className="t-title font-normal text-muted-foreground">
                    /{score.total}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="t-eyebrow">Dry run</p>
                <p className="t-numeral mt-1 text-2xl text-foreground">
                  {dryDone}
                  <span className="t-micro font-normal text-muted-foreground">
                    /{DRY_RUN_STEPS.length}
                  </span>
                </p>
              </div>
            </div>
            <p className="t-body mt-3 text-muted-foreground">
              {ready && dryComplete
                ? "Systems green and dual-phone checklist complete. You’re weekend-ready."
                : ready
                  ? "Systems look good — finish the dual-phone checklist before Friday."
                  : "Clear the open items below before first tee."}
            </p>
            {canScore ? (
              <Link
                to="/"
                className="press btn-gold t-body mt-4 flex min-h-11 w-full items-center justify-center"
              >
                Open Live scoring board
              </Link>
            ) : (
              <Link
                to="/captain"
                className="press btn-quiet t-body mt-4 flex min-h-11 w-full items-center justify-center"
              >
                Captain access
              </Link>
            )}
          </section>

          {/* Dual-phone interactive checklist */}
          <section className="panel overflow-hidden">
            <div className="border-b border-border/60 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="size-4 text-muted-foreground" />
                  <h2 className="t-section text-foreground">Dual-phone dry run</h2>
                </div>
                {dryDone > 0 && (
                  <button
                    type="button"
                    onClick={resetDryRun}
                    className="press t-micro text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <p className="t-micro mt-1 text-muted-foreground">
                Captain phone + spectator phone. Tap each step when done. Saved on this device.
              </p>
            </div>
            <ul className="px-4">
              {DRY_RUN_STEPS.map((step) => {
                const done = Boolean(dryRun[step.id]);
                return (
                  <li key={step.id} className="border-b border-border/60 last:border-0">
                    <button
                      type="button"
                      onClick={() => toggleDry(step.id)}
                      className="press flex w-full items-start gap-3 py-3.5 text-left"
                      aria-pressed={done}
                    >
                      {done ? (
                        <CheckCircle2
                          className="mt-0.5 size-5 shrink-0 text-[oklch(0.72_0.12_155)]"
                          strokeWidth={1.8}
                        />
                      ) : (
                        <Circle
                          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                          strokeWidth={1.8}
                        />
                      )}
                      <span className="min-w-0">
                        <span
                          className={`t-body block font-medium ${
                            done ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="t-micro mt-0.5 block text-muted-foreground">
                          {step.detail}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-border/60 px-4 py-3 t-micro text-muted-foreground">
              Never leave a fake score up — always Clear after smoke. This page never posts scores
              for you.
            </p>
          </section>

          {/* Live readiness gates */}
          <section className="panel p-4">
            <h2 className="t-eyebrow">System gates</h2>
            <ul className="mt-1">
              <Row
                done
                label="App build"
                detail={String(import.meta.env.VITE_APP_VERSION ?? "2026.08")}
              />
              <Row
                done={flags.venmoReady}
                critical
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
                critical
                label="Tournament board loads"
                detail={
                  board
                    ? `${board.matches} matches · ${board.sideBets} side pots`
                    : "Board missing — check backend"
                }
              />
              <Row
                done={revisionGuardReady}
                critical
                label="Cross-device scoring guard"
                detail={
                  revisionGuardReady
                    ? "Revision conflict detection active"
                    : "Schema revisions missing — apply migrations"
                }
              />
              <Row
                done={flags.boardSeeded}
                critical
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
                critical
                label="This account can score"
                detail={
                  isAdmin
                    ? "Admin"
                    : canScore
                      ? "Captain"
                      : rolesError
                        ? `Access check failed — retry (${rolesError})`
                        : "No role yet — admin grants captain, or CAPTAIN_EMAILS sync"
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
                label="Service worker / PWA"
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
                    : "Optional — set VITE_WHATSAPP_GROUP_URL for Group chat"
                }
              />
              <Row
                done={Boolean(data && data.players.length === EXPECTED_PLAYER_COUNT)}
                label="Field roster"
                detail={
                  data
                    ? `${data.players.length}/${EXPECTED_PLAYER_COUNT} player slots`
                    : "Board not loaded"
                }
              />
              <Row
                done={contestHolesSet}
                label="Contest holes posted"
                detail={
                  contestHolesSet
                    ? "CTP/LD holes numbered — Scout badges them"
                    : "Still TBD — do not invent; post when known"
                }
              />
              <Row
                done={decidedMatches > 0 || dryComplete}
                label="Scoring smoke evidence"
                detail={
                  decidedMatches > 0
                    ? `${decidedMatches} result(s) on board (clear tests after smoke)`
                    : dryComplete
                      ? "Dry-run checklist complete on this device"
                      : "Run dual-phone test before Friday"
                }
              />
            </ul>
          </section>

          <section className="panel space-y-3 p-4">
            <h2 className="t-eyebrow">Captain access</h2>
            <p className="t-micro text-muted-foreground">
              Zack & Charles: sign in once → Kevin grants captain on{" "}
              <Link to="/admin" className="font-semibold text-foreground underline-offset-2 hover:underline">
                Admin
              </Link>
              . Or configure{" "}
              <code className="text-foreground">CAPTAIN_EMAILS</code> and sync below.
            </p>
            <button
              type="button"
              disabled={syncing}
              onClick={() => void trySyncCaptain()}
              className="press btn-gold t-body flex min-h-11 w-full items-center justify-center gap-2"
            >
              {syncing ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Syncing…
                </>
              ) : (
                "Sync my captain access"
              )}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/profile" className="press btn-quiet t-body min-h-11 text-center">
                Profile
              </Link>
              <Link to="/admin" className="press btn-quiet t-body min-h-11 text-center">
                Admin
              </Link>
            </div>
          </section>

          <section className="panel space-y-2 p-4">
            <h2 className="t-eyebrow mb-1">Field shortcuts</h2>
            <a
              href={venmoUrl}
              target="_blank"
              rel="noreferrer"
              className="press panel flex min-h-12 items-center justify-between gap-3 border border-border/60 px-4 py-3"
            >
              <span className="t-body font-medium text-foreground">
                Test Venmo $150
              </span>
              <ExternalLink className="size-4 text-muted-foreground" />
            </a>
            <Link
              to="/"
              className="press panel flex min-h-12 items-center justify-between gap-3 border border-border/60 px-4 py-3"
            >
              <span className="inline-flex items-center gap-2 t-body font-medium text-foreground">
                <Radio className="size-4 opacity-70" /> Live board
              </span>
              <span className="t-micro text-muted-foreground">Score →</span>
            </Link>
            <Link
              to="/"
              search={{ board: true }}
              className="press panel flex min-h-12 items-center justify-between gap-3 border border-border/60 px-4 py-3"
            >
              <span className="t-body font-medium text-foreground">Clubhouse display</span>
              <span className="t-micro text-muted-foreground">TV →</span>
            </Link>
            <Link
              to="/scout"
              search={{ course: "south", hole: 1 }}
              className="press panel flex min-h-12 items-center justify-between gap-3 border border-border/60 px-4 py-3"
            >
              <span className="inline-flex items-center gap-2 t-body font-medium text-foreground">
                <Map className="size-4 opacity-70" /> South planner
              </span>
              <span className="t-micro text-muted-foreground">Plan →</span>
            </Link>
          </section>

          <section className="panel space-y-3 p-4">
            <h2 className="t-eyebrow">Pre-Friday freeze</h2>
            <ol className="t-micro list-decimal space-y-2 pl-4 text-muted-foreground">
              <li>Smoke Live, Plan, claim, captain score on production.</li>
              <li>Complete dual-phone dry run above; Clear every test result.</li>
              <li>Install PWA on both captain phones.</li>
              <li>Post CTP/LD holes only when known — never invent.</li>
              <li>After freeze: content-only updates; no schema thrash.</li>
            </ol>
          </section>
        </div>
      )}
    </Shell>
  );
}
