import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Printer, Share2, Target } from "lucide-react";
import { toast } from "sonner";

import { Shell } from "@/components/tin-cup/Shell";
import { HoleStage } from "@/components/tin-cup/scout/HoleStage";
import { PlanSheet, useScoutPlanEditor } from "@/components/tin-cup/scout/PlanSheet";
import { Segmented } from "@/components/tin-cup/ui/primitives";
import { useAuth } from "@/hooks/useAuth";
import { useHoleNotes, useRoundPlan, type HoleNoteDraft } from "@/hooks/useJournal";
import { useTournament } from "@/hooks/useTournament";
import { SNAKE_PIT as SNAKE_PIT_TIPS } from "@/lib/tin-cup";
import { isCtp, isLongDrive } from "@/lib/side-bets";
import {
  COURSE_LABEL,
  COURSE_DETAILS,
  COURSE_ORDER,
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
    <Shell variant="immersive">
      {/* Single column always — map first, one plan sheet, no desktop dupe */}
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <Segmented
          ariaLabel="Course"
          value={courseId}
          onChange={(id) => setSelection({ course: id, hole: 1 })}
          options={COURSE_ORDER.map((id) => ({
            value: id,
            label: COURSE_LABEL[id],
            hint: id === todayCourse ? "today" : undefined,
          }))}
        />

        <div className="flex items-center justify-between gap-2 px-0.5">
          <p className="t-micro text-muted-foreground">
            {details.dayLabel}
            {plannedCount > 0 ? (
              <span className="ml-2 font-semibold text-foreground/80">
                {plannedCount}/18 planned
              </span>
            ) : null}
          </p>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => void onSharePlan()}
              aria-label="Share plan"
              className="press flex size-9 items-center justify-center rounded-lg text-muted-foreground"
            >
              <Share2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={onPrintPlan}
              aria-label="Print plan"
              className="press flex size-9 items-center justify-center rounded-lg text-muted-foreground"
            >
              <Printer className="size-4" />
            </button>
          </div>
        </div>

        {currentContests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {currentContests.map((c) => (
              <span
                key={c}
                className={`chip ${
                  c === "ld" ? "border-copper/35 text-copper" : "chip-on"
                }`}
              >
                <Target className="mr-1.5 size-3.5" />
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
        />

        {tip && (
          <section className="panel border border-copper/25 px-4 py-3">
            <p className="t-eyebrow text-copper">Snake Pit · {tip.name}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{tip.tip}</p>
          </section>
        )}

        {!authLoading && (
          <PlanSheet
            courseId={courseId}
            hole={current.h}
            par={current.par}
            holes={course.holes}
            mode={planMode}
            loading={journal.loading}
            editor={planEditor}
            hasNote={hasNote}
            contestByHole={contestByHole}
            onSelectHole={(h) => setSelection({ hole: h })}
          />
        )}

        <details className="panel group">
          <summary className="press cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            {details.dayLabel} · more
            <span className="ml-2 font-normal text-muted-foreground">
              strategy · course
            </span>
          </summary>
          <div className="space-y-3 border-t border-border/60 px-4 py-3">
            <div>
              <p className="t-micro mb-2 text-muted-foreground">{details.formatTip}</p>
              {!user ? (
                <p className="text-sm text-muted-foreground">Sign in to save day strategy.</p>
              ) : (
                <div className="space-y-2">
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
                </div>
              )}
            </div>
            <div className="hairline pt-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{course.name}</p>
              <p className="mt-1">
                Par {coursePar(courseId)} · {details.blackTotal.toLocaleString()} yds Black
              </p>
              <p className="mt-2">{details.description}</p>
              <div className="mt-3 flex flex-wrap gap-4">
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
          </div>
        </details>
      </div>
    </Shell>
  );
}
