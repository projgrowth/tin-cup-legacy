import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Target } from "lucide-react";
import { toast } from "sonner";

import { Shell } from "@/components/tin-cup/Shell";
import { HoleStage } from "@/components/tin-cup/scout/HoleStage";
import { MapQuickStrip } from "@/components/tin-cup/scout/MapQuickStrip";
import { PlanSheet, useScoutPlanEditor } from "@/components/tin-cup/scout/PlanSheet";
import { ScoutChrome } from "@/components/tin-cup/scout/ScoutChrome";
import { useAuth } from "@/hooks/useAuth";
import { useHoleNotes, useRoundPlan, type HoleNoteDraft } from "@/hooks/useJournal";
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
  getCourse,
  isCourseId,
  roundSlugForCourse,
  type CourseId,
} from "@/lib/courses";
import { getGuestNote } from "@/lib/guest-notes";
import {
  buildPlanLines,
  countPlanned,
  hasPlanContent,
  printRoundSheet,
  shareRoundSheet,
  type PlanLine,
} from "@/lib/round-sheet";

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
          "On-course hole maps and game plans for Innisbrook South, Copperhead, and Island — Tin Cup 2026.",
      },
      { property: "og:title", content: "Course Planner — Tin Cup Invitational" },
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
  const [dayOpen, setDayOpen] = useState(false);
  const [dayDraft, setDayDraft] = useState("");
  useEffect(() => setDayDraft(roundPlan.plan), [roundPlan.plan]);

  const planEditor = useScoutPlanEditor(
    courseId,
    current.h,
    user,
    journal,
    () => setGuestTick((t) => t + 1),
  );
  const planMode = user ? "cloud" : "guest";

  async function onSharePlan() {
    const result = await shareRoundSheet(courseId, planLines);
    if (result === "shared") toast.success("Plan shared");
    else if (result === "copied") toast.success("Plan copied");
    else toast.error("Could not share");
  }

  function onPrintPlan() {
    if (!printRoundSheet(courseId, planLines)) toast.error("Allow pop-ups to print");
  }

  const accent =
    courseId === "copperhead"
      ? "ring-copper/40"
      : courseId === "island"
        ? "ring-[oklch(0.5_0.1_235/35%)]"
        : "ring-white/10";

  return (
    <Shell variant="dashboard">
      {/* Compact instrument header — no wasted hero title stack */}
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div>
          <p className="hud-label text-muted-foreground">Scout</p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-foreground">
            {COURSE_LABEL[courseId]}
            <span className="font-medium text-muted-foreground"> · {details.dayLabel}</span>
          </h1>
        </div>
        <p className="text-right text-xs font-medium text-muted-foreground">
          {details.format}
        </p>
      </div>

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

      <div className="mx-auto max-w-lg space-y-3 lg:max-w-none lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.65fr)] lg:items-start lg:gap-6 lg:space-y-0">
        <div className="min-w-0 space-y-3">
          {currentContests.length > 0 && (
            <div className="flex flex-wrap gap-2">
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

          <HoleStage
            courseId={courseId}
            hole={current}
            accentClass={accent}
            isSnake={isSnake}
            index={index}
            total={course.holes.length}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            canPrev={index > 0}
            canNext={index < course.holes.length - 1}
            holeMeta={
              <div className="hud-pod px-3 py-2 text-right backdrop-blur-xl">
                <p className="hud-num text-4xl leading-none text-white">{current.h}</p>
                <p className="mt-1 max-w-[9.5rem] truncate text-xs font-semibold text-white/75">
                  {current.name ?? `Hole ${current.h}`}
                  {isSnake ? " · Pit" : ""}
                </p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-white/90">
                  Par {current.par}
                  <span className="ml-1.5 font-semibold text-gold-light/90">
                    · {current.yards}
                  </span>
                </p>
              </div>
            }
            mapTools={
              !authLoading ? (
                <MapQuickStrip
                  club={planEditor.club}
                  green={planEditor.green}
                  onClub={planEditor.setClub}
                  onGreen={planEditor.setGreen}
                />
              ) : null
            }
          />

          {tip && (
            <section className="hud-pod border-copper/30 px-4 py-3">
              <p className="hud-label text-copper">Snake Pit · {tip.name}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/85">{tip.tip}</p>
            </section>
          )}

          {/* Plan sheet — shared editor with map strip */}
          <div className="lg:hidden">
            {!authLoading && (
              <PlanSheet
                hole={current.h}
                par={current.par}
                mode={planMode}
                loading={journal.loading}
                editor={planEditor}
              />
            )}
          </div>

          <button
            type="button"
            onClick={() => setDayOpen((v) => !v)}
            className="press flex w-full items-center justify-between rounded-2xl border border-border/80 bg-card/80 px-4 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-foreground">
                {details.dayLabel} strategy
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-1">
                {details.formatTip}
              </span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {dayOpen ? "Hide" : "Edit"}
            </span>
          </button>
          {dayOpen && (
            <div className="space-y-2 rounded-2xl border border-border p-3">
              {!user ? (
                <p className="text-sm text-muted-foreground">Sign in to save day strategy.</p>
              ) : (
                <>
                  <textarea
                    value={dayDraft}
                    onChange={(e) => setDayDraft(e.target.value)}
                    rows={3}
                    maxLength={800}
                    className="control w-full resize-none text-base"
                    placeholder="Pairing thoughts, attack holes…"
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

          <details className="rounded-2xl border border-border/80">
            <summary className="press cursor-pointer list-none px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
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

        <aside className="hidden min-w-0 lg:sticky lg:top-28 lg:block">
          {!authLoading && (
            <PlanSheet
              hole={current.h}
              par={current.par}
              mode={planMode}
              loading={journal.loading}
              editor={planEditor}
            />
          )}
        </aside>
      </div>
    </Shell>
  );
}
