import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { CinematicIntro } from "@/components/tin-cup/CinematicIntro";
import { ScoreModal } from "@/components/tin-cup/ScoreModal";
import { Shell, SkeletonBlock } from "@/components/tin-cup/Shell";
import { ShareBoardButton } from "@/components/tin-cup/WhatsAppLinks";
import { HallOfFamePanel, LivePanel, PreTournamentPanel } from "@/components/tin-cup/panels";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useJournal";
import { useTournament, type Match, type Round } from "@/hooks/useTournament";
import { getEventPhase, phaseMode } from "@/lib/event-phase";
import { defaultCourseId, COURSE_LABEL } from "@/lib/courses";
import { EVENT, EXPECTED_PLAYER_COUNT, type BoardMode } from "@/lib/tin-cup";
import { roundStatus, tallyStandings } from "@/lib/scoring";
import { shouldPlayIntro } from "@/lib/intro";

const MODES: Array<{ key: BoardMode; label: string }> = [
  { key: "pre", label: "Weekend" },
  { key: "live", label: "Live" },
  { key: "post", label: "Legacy" },
] as const;

const PHASE_OVERRIDE_KEY = "tin-cup-phase-override-v1";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [{ rel: "preload", as: "image", href: "/tin-cup-intro-poster.jpg" }],
    meta: [
      { title: "Tin Cup Invitational 2026 — Live Cup Standings" },
      {
        name: "description",
        content:
          "The 4th Annual Tin Cup Invitational at Innisbrook Golf Resort, August 28–30, 2026. Live 26-point scoreboard, side cash, rosters and the Snake Pit guide.",
      },
      { property: "og:title", content: "Tin Cup Invitational 2026 — Live Cup Standings" },
      {
        property: "og:description",
        content:
          "The 4th Annual Tin Cup Invitational at Innisbrook Golf Resort, August 28–30, 2026. Live 26-point scoreboard, side cash, rosters and the Snake Pit guide.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [autoMode, setAutoMode] = useState<BoardMode>("pre");
  const [override, setOverride] = useState<BoardMode | null>(null);
  const [introDone, setIntroDone] = useState(true);

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

  const mode = override ?? autoMode;

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
    retryFailedWrites,
  } = useTournament();
  const { canScore, user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const stale = isError && Boolean(data);
  const needsClaim = Boolean(user && !profileLoading && !profile?.player_id);

  return (
    <>
      {!introDone && <CinematicIntro onDone={() => setIntroDone(true)} />}
      <Shell variant="dashboard">
        {needsClaim && (
          <Link
            to="/profile"
            className="press mb-4 flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
          >
            <span className="min-w-0">
              <span className="t-body block font-medium text-foreground">Claim your roster name</span>
              <span className="t-micro block text-muted-foreground">
                So photos and the field know who you are
              </span>
            </span>
            <span className="t-micro shrink-0 text-muted-foreground">Account →</span>
          </Link>
        )}
        {mode === "live" && (
          <TodayAtTinCup
            rounds={data?.rounds ?? []}
            matches={data?.matches ?? []}
            playerCount={data?.players.length || EXPECTED_PLAYER_COUNT}
          />
        )}
        <PhaseControl mode={mode} automatic={!override} onChange={selectMode} />

        <div className="mt-4">
          {mode === "pre" && (
            <PreTournamentPanel
              rounds={data?.rounds ?? []}
              matches={data?.matches ?? []}
              canUpload={Boolean(user)}
            />
          )}
          {mode === "live" &&
            (isPending && !data ? (
              <BoardSkeleton />
            ) : isError && !data ? (
              <BoardError onRetry={() => void refetch()} busy={isFetching} />
            ) : (
              <LivePanel
                rounds={data?.rounds ?? []}
                matches={data?.matches ?? []}
                teams={data?.teams ?? []}
                players={data?.players ?? []}
                sideBets={data?.sideBets ?? []}
                syncedAt={data?.syncedAt}
                pendingWrites={pendingWrites}
                failedWrites={failedWrites}
                onRetryFailed={() => void retryFailedWrites()}
                stale={stale}
                canScore={canScore}
                canUpload={Boolean(user)}
                initialOpenOnly={canScore}
              />
            ))}
          {mode === "post" && (
            <>
              <LegacySummary matches={data?.matches ?? []} />
              <HallOfFamePanel
                canUpload={Boolean(user)}
                canScore={canScore}
                trophies={data?.trophies ?? []}
              />
            </>
          )}
        </div>

        {canScore && mode === "live" && (
          <ScoreModal
            matches={data?.matches ?? []}
            rounds={data?.rounds ?? []}
            players={data?.players ?? []}
            sideBets={data?.sideBets ?? []}
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
        className="control t-micro min-h-10 w-auto py-1.5 pl-3 pr-8"
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

function LegacySummary({ matches }: { matches: Match[] }) {
  const standings = tallyStandings(matches);
  const winner =
    standings.strongMental > standings.grassRoots
      ? "Strong Mental"
      : standings.grassRoots > standings.strongMental
        ? "Grass Roots"
        : "All square";
  return (
    <section className="mb-8 p-2 text-center">
      <h1 className="t-display text-foreground">{winner}</h1>
      <p className="t-hero mt-3 text-foreground">
        <span className="text-gold-light">{standings.strongMental}</span>
        <span className="text-muted-foreground">–</span>
        <span className="text-copper">{standings.grassRoots}</span>
      </p>
    </section>
  );
}

function TodayAtTinCup({
  rounds,
  matches,
  playerCount,
}: {
  rounds: Round[];
  matches: Match[];
  playerCount: number;
}) {
  const now = Date.now();
  const current = rounds.find((round) => roundStatus(round, now) === "live");
  const next = rounds.find((round) => roundStatus(round, now) === "upcoming");
  const focus = current ?? next;
  const standings = tallyStandings(matches);
  const status = current ? "Live now" : next ? "Up next" : "Tournament recap";
  const todayCourse = defaultCourseId(now);
  return (
    <section className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="t-display text-foreground">{status}</h1>
        <p className="t-micro mt-1.5 truncate text-muted-foreground">
          {focus ? `${focus.day_label} · ${focus.course}` : EVENT.dates}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/scout"
            search={{ course: todayCourse, hole: 1 }}
            className="press btn-quiet t-micro min-h-10 px-3 py-2"
          >
            {COURSE_LABEL[todayCourse]}
          </Link>
          <ShareBoardButton
            scoreLine={`${standings.strongMental}–${standings.grassRoots}`}
          />
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="t-micro text-muted-foreground">Cup</p>
        <p className="t-hero mt-0.5">
          <span className="text-gold-light">{standings.strongMental}</span>
          <span className="text-muted-foreground">–</span>
          <span className="text-copper">{standings.grassRoots}</span>
        </p>
        <p className="t-micro mt-1 text-muted-foreground">{playerCount} players</p>
      </div>
    </section>
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
