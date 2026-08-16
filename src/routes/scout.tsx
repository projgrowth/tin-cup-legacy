import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, MoreHorizontal, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Shell } from "@/components/tin-cup/Shell";
import { HoleStage, type MapMode } from "@/components/tin-cup/scout/HoleStage";
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
  const [mapMode, setMapMode] = useState<MapMode>("sat");
  const [cardMenu, setCardMenu] = useState(false);
  const [theaterMenu, setTheaterMenu] = useState(false);

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

  const orb =
    "press flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-[0_8px_24px_-12px_oklch(0_0_0/80%)] backdrop-blur-md";

  if (showMap) {
    return (
      <Shell variant="theater">
        <div className="relative h-svh w-full overflow-hidden bg-black">
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
            onMapMode={setMapMode}
            onSatFailed={() => setPlayGpsOn(false)}
          />

          <Link
            to="/scout"
            search={{ course: courseId, hole, card: true }}
            replace
            aria-label="Card"
            className={`${orb} absolute left-3 z-40`}
            style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <ChevronLeft className="size-5" />
          </Link>

          <div
            className="absolute right-3 z-40"
            style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <button
              type="button"
              onClick={() => setTheaterMenu((v) => !v)}
              aria-label="Plan actions"
              aria-expanded={theaterMenu}
              className={orb}
            >
              <MoreHorizontal className="size-4" />
            </button>
            {theaterMenu && (
              <div className="panel absolute right-0 mt-2 min-w-44 overflow-hidden py-1">
                {COURSE_ORDER.map((id) => (
                  <Link
                    key={id}
                    to="/scout"
                    replace
                    search={{ course: id, hole: 1 }}
                    onClick={() => setTheaterMenu(false)}
                    className={`press flex min-h-11 items-center px-3 t-body ${
                      id === courseId ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {COURSE_LABEL[id]}
                    {id === todayCourse ? " · today" : ""}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPlayGpsOn((v) => !v);
                    if (!playGpsOn) setMapMode("sat");
                    setTheaterMenu(false);
                  }}
                  className="press flex min-h-11 w-full items-center border-t border-border px-3 text-left t-body"
                >
                  {playGpsOn ? "Exit Play GPS" : "Play GPS"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (mapMode === "sat") {
                      setMapMode("diagram");
                      setPlayGpsOn(false);
                    } else {
                      setMapMode("sat");
                    }
                    setTheaterMenu(false);
                  }}
                  className="press flex min-h-11 w-full items-center px-3 text-left t-body"
                >
                  {mapMode === "sat" ? "Schematic" : "Satellite"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTheaterMenu(false);
                    void onSharePlan();
                  }}
                  className="press flex min-h-11 w-full items-center gap-2 px-3 text-left t-body"
                >
                  <Share2 className="size-4 text-muted-foreground" />
                  Share
                </button>
              </div>
            )}
          </div>

          {!authLoading && (
            <div className="absolute inset-x-0 bottom-0 z-30 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
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
                overlay
                pitLabel={tip && !playGpsOn ? tip.name : null}
              />
            </div>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <Shell variant="content">
      <div className="mx-auto w-full max-w-3xl space-y-2.5">
        <div className="flex items-center gap-2">
          <Link
            to="/scout"
            search={{ course: courseId, hole }}
            replace
            className="press flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-gold/35 bg-gold/15 px-2.5 text-sm font-semibold text-gold-light"
          >
            Hole
          </Link>
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
                    card: true,
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
        </div>
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
      </div>
    </Shell>
  );
}
