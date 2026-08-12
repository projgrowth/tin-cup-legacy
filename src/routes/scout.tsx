import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Target } from "lucide-react";
import { toast } from "sonner";

import { HoleMap } from "@/components/tin-cup/HoleMap";
import { Shell } from "@/components/tin-cup/Shell";
import { HolePlanDock } from "@/components/tin-cup/scout/HolePlanDock";
import { ScoutChrome } from "@/components/tin-cup/scout/ScoutChrome";
import { useAuth } from "@/hooks/useAuth";
import { useHoleNotes, useRoundPlan } from "@/hooks/useJournal";
import { useTournament } from "@/hooks/useTournament";
import { SNAKE_PIT as SNAKE_PIT_TIPS } from "@/lib/tin-cup";
import { isCtp, isLongDrive } from "@/lib/side-bets";
import {
  COURSE_LABEL,
  COURSE_DETAILS,
  SNAKE_PIT,
  clampHole,
  coursePar,
  defaultCourseId,
  formatTeeYardChip,
  getCourse,
  isCourseId,
  roundSlugForCourse,
  type CourseId,
} from "@/lib/courses";
import { getGuestNote, guestNoteHoles } from "@/lib/guest-notes";
import {
  buildPlanLines,
  countPlanned,
  hasPlanContent,
  printRoundSheet,
  shareRoundSheet,
  type PlanLine,
} from "@/lib/round-sheet";
import type { HoleNoteDraft } from "@/hooks/useJournal";

type ScoutSearch = {
  course?: CourseId;
  hole?: number;
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
    const hole =
      holeNum != null && Number.isFinite(holeNum) ? clampHole(holeNum) : undefined;
    return { course, hole };
  },
  head: () => ({
    meta: [
      { title: "Course Planner — Tin Cup Invitational" },
      {
        name: "description",
        content:
          "Hole-by-hole game plans for Innisbrook's Copperhead, Island and South courses — maps, yardages, and private notes for Tin Cup 2026.",
      },
      { property: "og:title", content: "Course Planner — Tin Cup Invitational" },
      {
        property: "og:description",
        content:
          "Study all 54 tournament holes at Innisbrook and save your own game plan before the first tee.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScoutPage,
});

function ScoutPage() {
  const navigate = useNavigate({ from: "/scout" });
  const search = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const { data: tournament } = useTournament();

  const courseId: CourseId = search.course ?? defaultCourseId();
  const course = getCourse(courseId);
  const hole = clampHole(search.hole ?? 1, course.holes.length);

  const setSelection = (next: { course?: CourseId; hole?: number }) => {
    const nextCourse = next.course ?? courseId;
    const nextHole = next.hole ?? (next.course && next.course !== courseId ? 1 : hole);
    void navigate({
      search: {
        course: nextCourse,
        hole: clampHole(nextHole, getCourse(nextCourse).holes.length),
      },
      replace: true,
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
  const guestHoles = useMemo(() => {
    void guestTick;
    return new Set(guestNoteHoles(courseId));
  }, [courseId, guestTick]);

  const index = course.holes.findIndex((h) => h.h === current.h);
  const step = (delta: number) => {
    const next = course.holes[index + delta];
    if (next) setSelection({ hole: next.h });
  };
  const tip =
    courseId === "copperhead" ? SNAKE_PIT_TIPS.find((t) => t.hole === current.h) : undefined;
  const isSnake = courseId === "copperhead" && SNAKE_PIT.includes(current.h);
  const todayCourse = defaultCourseId();

  const contestByHole = useMemo(() => {
    const map = new Map<number, Array<"ctp" | "ld">>();
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
  }, [tournament?.sideBets, tournament?.rounds, details.roundSlug]);

  const currentContests = contestByHole.get(current.h) ?? [];

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

  const hasNote = (h: number) => hasPlanContent(noteForDraft(h));

  const planLines: PlanLine[] = useMemo(() => {
    void guestTick;
    void journal.notes;
    return buildPlanLines(courseId, noteForDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, guestTick, journal.notes, user]);

  const plannedCount = countPlanned(planLines);

  const [gridOpen, setGridOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);
  const [dayDraft, setDayDraft] = useState("");

  useEffect(() => setDayDraft(roundPlan.plan), [roundPlan.plan]);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  async function onSharePlan() {
    const result = await shareRoundSheet(courseId, planLines);
    if (result === "shared") toast.success("Plan shared");
    else if (result === "copied") toast.success("Plan copied");
    else toast.error("Could not share");
  }

  function onPrintPlan() {
    if (!printRoundSheet(courseId, planLines)) {
      toast.error("Allow pop-ups to print");
    }
  }

  const accent =
    courseId === "copperhead"
      ? "ring-copper/40"
      : courseId === "island"
        ? "ring-[oklch(0.5_0.1_235/35%)]"
        : "ring-emerald-500/20";

  return (
    <Shell variant="dashboard">
      {/* Minimal header — map is the product */}
      <header className="mb-3">
        <p className="t-eyebrow">On course</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {COURSE_LABEL[courseId]}
          <span className="font-medium text-muted-foreground"> · plan</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {details.dayLabel} · {details.format} · first tee {details.firstTee}
        </p>
      </header>

      <ScoutChrome
        courseId={courseId}
        todayCourse={todayCourse}
        hole={current.h}
        holes={course.holes}
        plannedCount={plannedCount}
        hasNote={hasNote}
        contestByHole={contestByHole}
        gridOpen={gridOpen}
        onSelectCourse={(id) => setSelection({ course: id, hole: 1 })}
        onSelectHole={(h) => setSelection({ hole: h })}
        onToggleGrid={() => setGridOpen((v) => !v)}
        onShare={() => void onSharePlan()}
        onPrint={onPrintPlan}
      />

      <div className="mx-auto max-w-lg lg:max-w-none lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.7fr)] lg:items-start lg:gap-8">
        <div className="min-w-0">
          {/* Hole identity */}
          <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
            <div className="min-w-0">
              <p className="text-[2.75rem] font-bold leading-none tracking-tighter tabular-nums text-foreground">
                {current.h}
              </p>
              <p className="mt-1 truncate text-base font-semibold text-foreground/90">
                {current.name ?? `Hole ${current.h}`}
                {isSnake ? (
                  <span className="ml-2 text-sm font-semibold text-copper">Snake Pit</span>
                ) : null}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                Par {current.par}
              </p>
              <p className="mt-1 rounded-full border border-border px-2.5 py-0.5 text-sm font-semibold tabular-nums text-muted-foreground">
                {formatTeeYardChip(current.yards, "black")}
              </p>
            </div>
          </div>

          {currentContests.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {currentContests.map((c) => (
                <span
                  key={c}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold ${
                    c === "ld"
                      ? "border-copper/40 bg-copper/10 text-copper"
                      : "border-gold/35 bg-gold/10 text-gold-light"
                  }`}
                >
                  <Target className="size-3.5" />
                  {c === "ld" ? "Long drive" : "CTP"}
                </span>
              ))}
            </div>
          )}

          {/* Hero map */}
          <section
            className={`relative overflow-hidden rounded-2xl ring-1 ${accent} ${
              isSnake ? "ring-copper/50" : ""
            } bg-[var(--turf-rough)] shadow-[0_20px_50px_-28px_oklch(0_0_0/80%)]`}
          >
            <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white/85 backdrop-blur-sm">
              Orientation
            </span>
            <HoleMap
              hole={current}
              className="block h-[min(58vh,440px)] w-full bg-transparent sm:h-[380px] lg:h-[460px]"
              fullscreen={fullscreen}
              onToggleFullscreen={() => setFullscreen((v) => !v)}
              onSwipeHole={(delta) => step(delta)}
            />
            <div className="flex items-stretch border-t border-white/10 bg-black/35">
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={index <= 0}
                className="press flex min-h-12 flex-1 items-center justify-center gap-1 text-sm font-semibold text-white/90 disabled:opacity-30"
              >
                <ChevronLeft className="size-5" /> Prev
              </button>
              <div className="flex min-h-12 items-center border-x border-white/10 px-4 text-sm tabular-nums text-white/70">
                {index + 1}/{course.holes.length}
              </div>
              <button
                type="button"
                onClick={() => step(1)}
                disabled={index >= course.holes.length - 1}
                className="press flex min-h-12 flex-1 items-center justify-center gap-1 text-sm font-semibold text-white/90 disabled:opacity-30"
              >
                Next <ChevronRight className="size-5" />
              </button>
            </div>
          </section>

          <p className="mt-2 px-1 text-xs text-muted-foreground">
            Black yardages · map OSM orientation only · day tees may differ
          </p>

          {tip && (
            <section className="mt-4 rounded-2xl border border-copper/30 bg-copper/10 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-copper">
                Snake Pit · {tip.name}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{tip.tip}</p>
            </section>
          )}

          {/* Plan dock — primary after map (phone); desktop uses sticky aside */}
          <div className="mt-4 lg:hidden">
            <HolePlanDock
              courseId={courseId}
              hole={current.h}
              par={current.par}
              user={user}
              authLoading={authLoading}
              journal={journal}
              onGuestChange={() => setGuestTick((t) => t + 1)}
            />
          </div>

          {/* Day strategy — collapsed */}
          <button
            type="button"
            onClick={() => setDayOpen((v) => !v)}
            className="press mt-4 flex w-full items-center justify-between rounded-2xl border border-border px-4 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-foreground">
                {details.dayLabel} strategy
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {details.formatTip}
              </span>
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {dayOpen ? "Hide" : "Edit"}
            </span>
          </button>
          {dayOpen && (
            <div className="mt-2 space-y-2 rounded-2xl border border-border p-3">
              {!user ? (
                <p className="text-sm text-muted-foreground">
                  Sign in to save a day strategy across devices.
                </p>
              ) : (
                <>
                  <textarea
                    value={dayDraft}
                    onChange={(e) => setDayDraft(e.target.value)}
                    rows={3}
                    maxLength={800}
                    className="control w-full resize-none text-base"
                    placeholder="Pairing thoughts, clubs, holes to attack…"
                  />
                  <button
                    type="button"
                    disabled={roundPlan.save.isPending || dayDraft === roundPlan.plan}
                    onClick={() =>
                      roundPlan.save.mutate(dayDraft, {
                        onSuccess: () => toast.success("Day plan saved"),
                        onError: () => toast.error("Could not save"),
                      })
                    }
                    className="press btn-gold w-full !min-h-11 text-sm font-semibold disabled:opacity-40"
                  >
                    {roundPlan.save.isPending ? "Saving…" : "Save day plan"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* About — footer density */}
          <details className="mt-4 rounded-2xl border border-border">
            <summary className="press cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              {course.name}
              <span className="ml-2 font-normal text-muted-foreground">
                Par {coursePar(courseId)} · {details.blackTotal.toLocaleString()} yds
              </span>
            </summary>
            <div className="space-y-2 border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <p>{details.description}</p>
              <div className="flex flex-wrap gap-4">
                <a
                  href={details.scorecardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="press inline-flex items-center gap-1 font-medium text-foreground"
                >
                  Scorecard <ExternalLink className="size-3.5" />
                </a>
                <a
                  href={details.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="press inline-flex items-center gap-1 font-medium text-foreground"
                >
                  Course page <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>
          </details>
        </div>

        {/* Desktop: plan dock sticky */}
        <aside className="mt-6 hidden min-w-0 lg:mt-0 lg:block lg:sticky lg:top-28">
          <HolePlanDock
            courseId={courseId}
            hole={current.h}
            par={current.par}
            user={user}
            authLoading={authLoading}
            journal={journal}
            onGuestChange={() => setGuestTick((t) => t + 1)}
          />
        </aside>
      </div>
    </Shell>
  );
}
