import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Printer, Share2, Target } from "lucide-react";
import { toast } from "sonner";

import { Shell } from "@/components/tin-cup/Shell";
import { HoleStage } from "@/components/tin-cup/scout/HoleStage";
import { PlanSheet, useScoutPlanEditor } from "@/components/tin-cup/scout/PlanSheet";
import { RoundPlanBoard } from "@/components/tin-cup/scout/RoundPlanBoard";
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
  /** 18-hole sheet. Default is hole satellite. */
  card?: boolean;
  /** @deprecated Prefer omitting `card`. Still accepted. */
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
  const navigate = useNavigate({ from: "/scout" });
  const search = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const { data: tournament } = useTournament();
  const [playGpsOn, setPlayGpsOn] = useState(false);
  const [cardMenu, setCardMenu] = useState(false);

  const courseId: CourseId = search.course ?? defaultCourseId();
  const course = getCourse(courseId);
  const hole = clampHole(search.hole ?? 1, course.holes.length);
  const showCard = Boolean(search.card) && search.map !== true;
  const showMap = !showCard;

  const setSelection = (next: { course?: CourseId; hole?: number; card?: boolean }) => {
    const nextCourse = next.course ?? courseId;
    const nextHole = next.hole ?? (next.course && next.course !== courseId ? 1 : hole);
    const nextCard = next.card ?? showCard;
    void navigate({
      to: "/scout",
      search: {
        course: nextCourse,
        hole: clampHole(nextHole, getCourse(nextCourse).holes.length),
        ...(nextCard ? { card: true } : {}),
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

  const planEditor = useScoutPlanEditor(courseId, current.h, user, journal, () =>
    setGuestTick((t) => t + 1),
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
    <Shell variant={showMap ? "immersive" : "content"}>
      <div className="mx-auto w-full max-w-3xl space-y-2.5">
        <div className="flex items-center gap-2">
          {showMap ? (
            <Link
              to="/scout"
              search={{ course: courseId, hole, card: true }}
              replace
              className="press flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-border/60 px-2.5 text-sm font-semibold text-foreground"
            >
              Card
            </Link>
          ) : (
            <Link
              to="/scout"
              search={{ course: courseId, hole }}
              replace
              className="press flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-gold/35 bg-gold/15 px-2.5 text-sm font-semibold text-gold-light"
            >
              Hole
            </Link>
          )}
          <div
            className="grid min-w-0 flex-1 gap-1 rounded-2xl border border-border/60 bg-secondary/20 p-1"
            style={{ gridTemplateColumns: `repeat(${COURSE_ORDER.length}, minmax(0, 1fr))` }}
            role="tablist"
            aria-label="Course"
          >
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
                    ...(showCard ? { card: true } : {}),
                  }}
                  className={`press min-h-11 rounded-xl px-2 text-center text-sm font-semibold tracking-tight ${
                    on
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border/80"
                      : "text-muted-foreground"
                  }`}
                >
                  {COURSE_LABEL[id]}
                  {id === todayCourse ? (
                    <span className="mt-0.5 block text-[0.62rem] font-bold uppercase tracking-[0.1em] text-gold-light/90">
                      today
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
          {showCard && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setCardMenu((v) => !v)}
                aria-label="Plan actions"
                aria-expanded={cardMenu}
                className="press flex size-11 items-center justify-center rounded-xl border border-border/60 text-muted-foreground"
              >
                <MoreHorizontal className="size-4" />
              </button>
              {cardMenu && (
                <div className="panel absolute right-0 top-full z-20 mt-1 min-w-36 overflow-hidden py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCardMenu(false);
                      void onSharePlan();
                    }}
                    className="press flex min-h-11 w-full items-center gap-2 px-3 text-left t-body"
                  >
                    <Share2 className="size-4 text-muted-foreground" />
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCardMenu(false);
                      onPrintPlan();
                    }}
                    className="press flex min-h-11 w-full items-center gap-2 px-3 text-left t-body"
                  >
                    <Printer className="size-4 text-muted-foreground" />
                    Print
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {showMap ? (
          <>
            {!playGpsOn && (currentContests.length > 0 || plannedCount > 0) && (
              <div className="flex flex-wrap items-center gap-2 px-0.5">
                {plannedCount > 0 && (
                  <span className="t-micro font-semibold text-muted-foreground">
                    {plannedCount}/18 planned
                  </span>
                )}
                {currentContests.map((c) => (
                  <span
                    key={c}
                    className={`chip !min-h-8 ${
                      c === "ld" ? "border-copper/35 text-copper" : "chip-on"
                    }`}
                  >
                    <Target className="mr-1 size-3.5" />
                    {c === "ld" ? "LD" : "CTP"}
                  </span>
                ))}
              </div>
            )}

            <div className="-mx-4 sm:-mx-5">
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
                onPlayModeChange={setPlayGpsOn}
              />
            </div>

            {tip && !playGpsOn && (
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
                forceCollapsed={playGpsOn}
              />
            )}
          </>
        ) : (
          <RoundPlanBoard
            courseId={courseId}
            hole={current.h}
            holes={course.holes}
            lines={planLines}
            mode={planMode}
            loading={authLoading || journal.loading}
            editor={planEditor}
            contestByHole={contestByHole}
            onSelectHole={(h) => setSelection({ hole: h, card: true })}
            onOpenMap={(h) => setSelection({ hole: h, card: false })}
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
          />
        )}
      </div>
    </Shell>
  );
}
