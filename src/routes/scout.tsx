import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { Shell } from "@/components/tin-cup/Shell";
import type { MapMode } from "@/components/tin-cup/scout/HoleStage";
import { PlanSheet, useScoutPlanEditor } from "@/components/tin-cup/scout/PlanSheet";
import { RoundPlanBoard } from "@/components/tin-cup/scout/RoundPlanBoard";
import { useAuth } from "@/hooks/useAuth";
import { useHoleNotes, useProfile, useRoundPlan, type HoleNoteDraft } from "@/hooks/useJournal";
import { useTournament } from "@/hooks/useTournament";
import { isCtp, isLongDrive } from "@/lib/side-bets";
import { knownContestsForHole } from "@/lib/contest-holes";
import {
  COURSE_LABEL,
  COURSE_DETAILS,
  COURSE_ORDER,
  SNAKE_PIT,
  clampHole,
  defaultCourseId,
  getCourse,
  isCourseId,
  roundSlugForCourse,
  type CourseId,
} from "@/lib/courses";
import { getGuestNote } from "@/lib/guest-notes";
import { readLastHole, writeLastHole } from "@/lib/scout-memory";
import { buildPlanLines, hasPlanContent, type PlanLine } from "@/lib/round-sheet";

const HoleStage = lazy(() =>
  import("@/components/tin-cup/scout/HoleStage").then((module) => ({
    default: module.HoleStage,
  })),
);

type ScoutSearch = {
  course?: CourseId;
  hole?: number;
  /** 18-hole yardage book. Plan tab default. */
  card?: boolean;
  /** Full-bleed hole theater. Opened from the hole number on the book. */
  map?: boolean;
};

export const Route = createFileRoute("/scout")({
  validateSearch: (raw: Record<string, unknown>): ScoutSearch => {
    const course = isCourseId(raw.course) ? raw.course : undefined;
    const holeRaw = raw.hole;
    const holeNum =
      typeof holeRaw === "number"
        ? holeRaw
        : typeof holeRaw === "string" && holeRaw.trim()
          ? Number(holeRaw)
          : undefined;
    const hole = holeNum != null && Number.isFinite(holeNum) ? clampHole(holeNum) : undefined;
    const card = raw.card === true || raw.card === "1" || raw.card === 1;
    const map = raw.map === true || raw.map === "1" || raw.map === 1;
    return {
      course,
      hole,
      card: card || undefined,
      map: map || undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Round plan — Tin Cup Invitational" },
      {
        name: "description",
        content:
          "18-hole game plans and on-course maps for Innisbrook South, Copperhead, and Island — Tin Cup 2026.",
      },
      { property: "og:title", content: "Round plan — Tin Cup Invitational" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScoutPage,
});

function ScoutPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const { data: tournament } = useTournament();
  const { profile } = useProfile();
  const [playGpsOn, setPlayGpsOn] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>("schematic");
  const [wideTheater, setWideTheater] = useState(false);

  useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem("tc-hole-map-mode-v7") ??
        window.localStorage.getItem("tc-hole-map-mode-v6");
      if (saved === "sat") setMapMode("sat");
      else setMapMode("schematic");
    } catch {
      /* first visit stays 2D aerial */
    }
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWideTheater(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  function persistMode(next: MapMode) {
    setMapMode(next);
    try {
      window.localStorage.setItem("tc-hole-map-mode-v7", next);
    } catch {
      /* ignore */
    }
  }

  const remembered = readLastHole();
  const courseId: CourseId = search.course ?? remembered?.course ?? defaultCourseId();
  const course = getCourse(courseId);
  const hole = clampHole(
    search.hole ??
      (search.course && search.course !== remembered?.course ? 1 : (remembered?.hole ?? 1)),
    course.holes.length,
  );
  const showMap = search.map === true;

  useEffect(() => {
    writeLastHole(courseId, hole);
  }, [courseId, hole]);

  const setSelection = (next: { course?: CourseId; hole?: number; map?: boolean }) => {
    const nextCourse = next.course ?? courseId;
    const nextHole = next.hole ?? (next.course && next.course !== courseId ? 1 : hole);
    const nextMap = next.map ?? showMap;
    void navigate({
      to: "/scout",
      search: {
        course: nextCourse,
        hole: clampHole(nextHole, getCourse(nextCourse).holes.length),
        ...(nextMap ? { map: true } : { card: true }),
      },
      replace: true,
      resetScroll: false,
    });
  };

  const details = COURSE_DETAILS[courseId];
  const current = useMemo(
    () => course.holes.find((h) => h.h === hole) ?? course.holes[0],
    [course, hole],
  );
  const journal = useHoleNotes(courseId);
  const roundPlan = useRoundPlan(roundSlugForCourse(courseId));
  const [guestTick, setGuestTick] = useState(0);

  const index = course.holes.findIndex((h) => h.h === current.h);
  const step = (delta: number) => {
    const next = course.holes[index + delta];
    if (next) setSelection({ hole: next.h, map: true });
  };
  const isSnake = courseId === "copperhead" && SNAKE_PIT.includes(current.h);
  const claimedName = profile?.player_id
    ? tournament?.players.find((p) => p.id === profile.player_id)?.name
    : null;
  const pairingLine = claimedName
    ? `You · ${details.dayLabel} · ${details.firstTee}`
    : null;

  const contestByHole = useMemo(() => {
    const map = new Map<number, Array<"ctp" | "ld">>();
    for (const holeRow of course.holes) {
      const known = knownContestsForHole(courseId, holeRow.h);
      if (known.length) map.set(holeRow.h, [...known]);
    }
    const roundId = tournament?.rounds.find((r) => r.slug === details.roundSlug)?.id;
    for (const bet of tournament?.sideBets ?? []) {
      if (bet.hole == null) continue;
      if (roundId && bet.round_id && bet.round_id !== roundId) continue;
      const kind = isLongDrive(bet.kind) ? "ld" : isCtp(bet.kind) ? "ctp" : null;
      if (!kind) continue;
      const list = map.get(bet.hole) ?? [];
      if (!list.includes(kind)) list.push(kind);
      map.set(bet.hole, list);
    }
    return map;
  }, [course.holes, courseId, tournament?.sideBets, tournament?.rounds, details.roundSlug]);

  const noteForDraft = (h: number): HoleNoteDraft | null => {
    if (user) {
      const n = journal.noteFor(h);
      if (!n) return null;
      return {
        tee_club: n.tee_club,
        target_line: n.target_line,
        green_note: n.green_note,
        target_score: n.target_score,
        notes: n.notes,
      };
    }
    return getGuestNote(courseId, h);
  };

  const planLines: PlanLine[] = useMemo(() => {
    void guestTick;
    void journal.notes;
    return buildPlanLines(courseId, noteForDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, guestTick, journal.notes, user]);

  const [dayDraft, setDayDraft] = useState("");
  useEffect(() => setDayDraft(roundPlan.plan), [roundPlan.plan]);

  const planEditor = useScoutPlanEditor(courseId, current.h, user, journal, () =>
    setGuestTick((t) => t + 1),
  );
  const planMode = user ? "cloud" : "guest";

  const orb =
    "press flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-[var(--shadow-card)] backdrop-blur-md";
  const mapChip = "press min-h-10 px-2.5 text-[0.65rem] font-semibold tracking-wide text-white/55";

  if (showMap) {
    return (
      <Shell variant="theater">
        <div className="relative h-svh w-full overflow-hidden bg-black [transform:none]">
          <div className={`absolute inset-0 ${wideTheater ? "lg:right-96" : ""}`}>
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center bg-[var(--turf-rough)] t-body text-white/70">
                  Preparing course map…
                </div>
              }
            >
              <HoleStage
                courseId={courseId}
                hole={current}
                isSnake={isSnake}
                onPrev={() => step(-1)}
                onNext={() => step(1)}
                canPrev={index > 0}
                canNext={index < course.holes.length - 1}
                gpsOn={playGpsOn}
                mapMode={mapMode}
                onMapMode={persistMode}
                onSatFailed={() => setPlayGpsOn(false)}
                holeCount={course.holes.length}
                courseLabel={COURSE_LABEL[courseId]}
              />
            </Suspense>
          </div>

          <div
            className="absolute left-3 z-40"
            style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <Link
              to="/scout"
              search={{ course: courseId, hole, card: true }}
              replace
              aria-label="Back to scorecard"
              className={orb}
            >
              <ChevronLeft className="size-4" />
            </Link>
          </div>

          <button
            type="button"
            aria-pressed={playGpsOn}
            onClick={() => {
              const next = !playGpsOn;
              setPlayGpsOn(next);
              if (next) {
                persistMode("sat");
                void import("@/lib/geo-courses");
                void import("@/components/tin-cup/SatelliteHoleMap");
              }
            }}
            className={`${mapChip} absolute right-3 z-40 ${playGpsOn ? "text-white" : "text-white/55"}`}
            style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            Aerial
          </button>

          {!wideTheater ? (
            <div
              className="absolute inset-x-0 bottom-0 z-40"
              style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
            >
              <PlanSheet
                overlay
                courseId={courseId}
                hole={current.h}
                par={current.par}
                holes={course.holes}
                mode={planMode}
                loading={authLoading || journal.loading}
                editor={planEditor}
                hasNote={(h) => hasPlanContent(noteForDraft(h))}
                contestByHole={contestByHole}
                onSelectHole={(h) => setSelection({ hole: h, map: true })}
                pitLabel={isSnake ? "Pit" : null}
              />
            </div>
          ) : (
            <aside className="absolute inset-y-0 right-0 z-30 w-96 overflow-y-auto border-l border-border bg-background/98 px-3 pb-8 pt-20">
              <RoundPlanBoard
                courseId={courseId}
                hole={hole}
                holes={course.holes}
                lines={planLines}
                contestByHole={contestByHole}
                dayDraft={dayDraft}
                onDayDraft={setDayDraft}
                onSaveDay={() =>
                  roundPlan.save.mutate(dayDraft, {
                    onSuccess: () => toast.success("Day plan saved"),
                    onError: () => toast.error("Could not save"),
                  })
                }
                canSaveDay={!roundPlan.save.isPending && dayDraft !== roundPlan.plan}
                savingDay={roundPlan.save.isPending}
                signedIn={Boolean(user)}
                pairingLine={pairingLine}
              />
            </aside>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <Shell variant="content">
      <div className="mx-auto w-full max-w-3xl space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-2" role="tablist" aria-label="Course">
            {COURSE_ORDER.map((id) => {
              const on = id === courseId;
              return (
                <Link
                  key={id}
                  role="tab"
                  aria-selected={on}
                  to="/scout"
                  replace
                  search={{
                    course: id,
                    hole: 1,
                    card: true,
                  }}
                  className={`press chip min-h-11 w-full ${on ? "chip-on" : "text-muted-foreground"}`}
                >
                  {id === "copperhead" ? (
                    <>
                      <span className="sm:hidden">Pit</span>
                      <span className="hidden sm:inline">{COURSE_LABEL[id]}</span>
                    </>
                  ) : (
                    COURSE_LABEL[id]
                  )}
                </Link>
              );
            })}
          </div>
        </div>
        <RoundPlanBoard
          hero
          courseId={courseId}
          holes={course.holes}
          lines={planLines}
          contestByHole={contestByHole}
          dayDraft={dayDraft}
          onDayDraft={setDayDraft}
          onSaveDay={() =>
            roundPlan.save.mutate(dayDraft, {
              onSuccess: () => toast.success("Day plan saved"),
              onError: () => toast.error("Could not save"),
            })
          }
          canSaveDay={!roundPlan.save.isPending && dayDraft !== roundPlan.plan}
          savingDay={roundPlan.save.isPending}
          signedIn={Boolean(user)}
          pairingLine={pairingLine}
        />
      </div>
    </Shell>
  );
}
