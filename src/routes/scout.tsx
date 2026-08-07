import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, List } from "lucide-react";

import { HoleMap } from "@/components/tin-cup/HoleMap";
import { LoadingForm, PageHeading, Shell } from "@/components/tin-cup/Shell";
import { useAuth } from "@/hooks/useAuth";
import { useHoleNotes, type HoleNote, type HoleNoteDraft } from "@/hooks/useJournal";
import { SNAKE_PIT as SNAKE_PIT_TIPS } from "@/lib/tin-cup";
import {
  COURSE_LABEL,
  COURSE_DETAILS,
  COURSE_ORDER,
  SNAKE_PIT,
  clampHole,
  coursePar,
  defaultCourseId,
  formatBlackYardChip,
  formatScorecardYards,
  getCourse,
  isCourseId,
  type CourseId,
} from "@/lib/courses";
import { getGuestNote, guestNoteHoles, setGuestNote } from "@/lib/guest-notes";

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
      { title: "Course Scout & Journal — Tin Cup Invitational" },
      {
        name: "description",
        content:
          "Hole-by-hole overhead maps of Innisbrook's Copperhead, Island and South courses, with a private journal for your club, target line and green notes.",
      },
      { property: "og:title", content: "Course Scout & Journal — Tin Cup Invitational" },
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

const TEE_CLUBS = ["Driver", "3W", "5W", "Hybrid", "Iron", "Other"] as const;
const MISS_SIDES = [
  { id: "left", label: "Miss L" },
  { id: "center", label: "Center" },
  { id: "right", label: "Miss R" },
] as const;

function ScoutPage() {
  const navigate = useNavigate({ from: "/scout" });
  const search = Route.useSearch();
  const { user, loading: authLoading } = useAuth();

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
  const isToday = courseId === todayCourse;

  const hasNote = (h: number) => Boolean(journal.noteFor(h)) || guestHoles.has(h);

  const [overviewOpen, setOverviewOpen] = useState(false);

  return (
    <Shell variant="dashboard">
      <PageHeading eyebrow="Courses" title="On the ground" />

      {isToday && (
        <p className="t-micro mb-5 rounded-lg border border-border px-3.5 py-2 text-muted-foreground">
          Playing today · {COURSE_LABEL[todayCourse]}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] lg:items-start">
        <div className="min-w-0">
          <div
            className="mb-5 flex gap-1 rounded-xl border border-border bg-secondary/30 p-1"
            role="tablist"
            aria-label="Course"
          >
            {COURSE_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={id === courseId}
                onClick={() => setSelection({ course: id, hole: 1 })}
                className={`press t-body min-h-11 flex-1 rounded-lg px-2 py-2 text-center font-semibold tracking-tight ${
                  id === courseId
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {COURSE_LABEL[id]}
                {id === todayCourse ? (
                  <span className="mt-0.5 block text-[0.62rem] font-semibold uppercase tracking-[0.08em] opacity-80">
                    today
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="relative mb-5">
            <div className="no-scrollbar flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 scroll-px-1">
              {course.holes.map((h) => (
                <button
                  key={h.h}
                  type="button"
                  onClick={() => setSelection({ hole: h.h })}
                  aria-label={`Hole ${h.h}${hasNote(h.h) ? " — has notes" : ""}`}
                  className={`press t-micro relative size-10 shrink-0 snap-start rounded-full border font-semibold tabular-nums ${
                    h.h === current.h
                      ? "border-foreground/35 bg-foreground text-background"
                      : courseId === "copperhead" && SNAKE_PIT.includes(h.h)
                        ? "border-copper/40 text-copper"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {h.h}
                  {hasNote(h.h) && h.h !== current.h && (
                    <span
                      aria-hidden
                      className="absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-foreground/70"
                    />
                  )}
                </button>
              ))}
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent"
            />
          </div>

          <div className="mb-4 flex items-end justify-between gap-3 px-0.5">
            <div className="min-w-0">
              <p className="t-hero text-foreground">{current.h}</p>
              {current.name ? (
                <p className="t-title mt-1 text-foreground/95">{current.name}</p>
              ) : (
                <p className="t-title mt-1 text-muted-foreground">Hole {current.h}</p>
              )}
              <p className="t-micro mt-1 text-muted-foreground">
                {COURSE_LABEL[courseId]}
                {isSnake ? " · Snake Pit" : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="t-numeral text-2xl text-foreground">Par {current.par}</span>
              <span className="rounded-full border border-border px-2.5 py-1 t-micro font-semibold tabular-nums text-muted-foreground">
                {formatBlackYardChip(current.yards)}
              </span>
            </div>
          </div>

          <section
            className={`surface-raised relative overflow-hidden ${isSnake ? "ring-1 ring-copper/40" : ""}`}
          >
            <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-border bg-background/80 px-2 py-1 t-micro text-muted-foreground backdrop-blur-sm">
              Map · orientation only
            </span>
            <HoleMap
              hole={current}
              className="block h-[min(52vh,380px)] w-full bg-transparent sm:h-[340px]"
            />
            <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={index <= 0}
                className="press t-body inline-flex min-h-11 items-center gap-1 rounded-lg px-2.5 py-1.5 text-muted-foreground disabled:opacity-30"
              >
                <ChevronLeft className="size-4" /> Prev
              </button>
              <button
                type="button"
                onClick={() => setOverviewOpen((v) => !v)}
                className="press t-micro inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-muted-foreground"
              >
                <List className="size-3.5" />
                {index + 1} of {course.holes.length}
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                disabled={index >= course.holes.length - 1}
                className="press t-body inline-flex min-h-11 items-center gap-1 rounded-lg px-2.5 py-1.5 text-muted-foreground disabled:opacity-30"
              >
                Next <ChevronRight className="size-4" />
              </button>
            </div>
          </section>

          <details className="mt-2 px-1">
            <summary className="t-micro cursor-pointer text-muted-foreground">Map notes</summary>
            <p className="t-micro mt-1.5 text-muted-foreground">
              Yardages = official Black tees. Day tees may differ. Map is orientation only.
            </p>
            <div className="mt-2">
              <Legend />
            </div>
          </details>

          {overviewOpen && (
            <RoundOverview
              courseId={courseId}
              holes={course.holes}
              current={current.h}
              hasNote={hasNote}
              noteSnippet={(h) => {
                const saved = journal.noteFor(h);
                if (saved?.tee_club || saved?.target_line || saved?.notes) {
                  return [saved.tee_club, saved.target_line, saved.notes]
                    .filter(Boolean)
                    .join(" · ");
                }
                const g = getGuestNote(courseId, h);
                if (!g) return null;
                return [g.tee_club, g.target_line, g.notes].filter(Boolean).join(" · ") || null;
              }}
              onJump={(h) => {
                setSelection({ hole: h });
                setOverviewOpen(false);
              }}
            />
          )}

          {/* Journal under map on mobile; sticky column on lg */}
          <div className="mt-6 lg:hidden">
            <JournalSection
              courseId={courseId}
              hole={current.h}
              par={current.par}
              user={user}
              authLoading={authLoading}
              journal={journal}
              onGuestChange={() => setGuestTick((t) => t + 1)}
            />
          </div>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-24">
          <details className="surface-inset mb-4 group">
            <summary className="press cursor-pointer list-none px-4 py-3.5 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="t-title block text-foreground">{course.name}</span>
                  <span className="t-micro mt-0.5 block text-muted-foreground">
                    Par {coursePar(courseId)} · {details.blackTotal.toLocaleString()} yds black
                  </span>
                </span>
                <span className="t-micro text-muted-foreground group-open:hidden">About</span>
              </span>
            </summary>
            <div className="space-y-3 border-t border-border px-4 py-3">
              <p className="t-micro text-muted-foreground">{details.description}</p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={details.scorecardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="press t-micro inline-flex items-center gap-1.5 text-muted-foreground"
                >
                  Scorecard <ExternalLink className="size-3" />
                </a>
                <a
                  href={details.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="press t-micro inline-flex items-center gap-1.5 text-muted-foreground"
                >
                  Course page <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          </details>

          {tip && (
            <section className="surface rail-copper mb-5 border-copper/25 p-4">
              <h2 className="t-eyebrow text-copper">Snake Pit · {tip.name}</h2>
              <p className="t-body mt-2 text-foreground/85">{tip.tip}</p>
            </section>
          )}

          <div className="hidden lg:block">
            <JournalSection
              courseId={courseId}
              hole={current.h}
              par={current.par}
              user={user}
              authLoading={authLoading}
              journal={journal}
              onGuestChange={() => setGuestTick((t) => t + 1)}
            />
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function JournalSection({
  courseId,
  hole,
  par,
  user,
  authLoading,
  journal,
  onGuestChange,
}: {
  courseId: CourseId;
  hole: number;
  par: number;
  user: ReturnType<typeof useAuth>["user"];
  authLoading: boolean;
  journal: ReturnType<typeof useHoleNotes>;
  onGuestChange: () => void;
}) {
  if (authLoading) {
    return <LoadingForm fields={5} />;
  }

  const saved = user ? journal.noteFor(hole) : null;
  const guest = !user ? getGuestNote(courseId, hole) : null;

  return (
    <HoleJournal
      courseId={courseId}
      hole={hole}
      par={par}
      mode={user ? "cloud" : "guest"}
      saved={saved}
      guest={guest}
      save={journal.save}
      loading={journal.loading}
      onGuestChange={onGuestChange}
    />
  );
}

function RoundOverview({
  courseId,
  holes,
  current,
  hasNote,
  noteSnippet,
  onJump,
}: {
  courseId: CourseId;
  holes: { h: number; par: number; yards: number; name: string | null }[];
  current: number;
  hasNote: (h: number) => boolean;
  noteSnippet: (h: number) => string | null;
  onJump: (h: number) => void;
}) {
  return (
    <section className="surface-inset mt-4 overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <p className="t-section text-foreground">{COURSE_LABEL[courseId]} · journal</p>
        <p className="t-micro mt-0.5 text-muted-foreground">Tap a hole to jump</p>
      </div>
      <ul className="divide-y divide-border">
        {holes.map((h) => {
          const snippet = noteSnippet(h.h);
          return (
            <li key={h.h}>
              <button
                type="button"
                onClick={() => onJump(h.h)}
                className={`press flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                  h.h === current ? "bg-secondary/50" : ""
                }`}
              >
                <span
                  className={`t-numeral w-7 shrink-0 tabular-nums ${
                    hasNote(h.h) ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {h.h}
                </span>
                <span className="t-micro w-12 shrink-0 text-muted-foreground">Par {h.par}</span>
                <span className="t-micro min-w-0 flex-1 truncate text-muted-foreground">
                  {snippet || "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Legend() {
  const items = [
    { label: "Fairway", color: "var(--turf-fairway)" },
    { label: "Green", color: "var(--turf-green)" },
    { label: "Bunker", color: "var(--turf-bunker)" },
    { label: "Water", color: "var(--turf-water)" },
  ];
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="t-micro flex items-center gap-1.5 text-muted-foreground">
          <span
            aria-hidden
            className="size-2.5 rounded-[3px]"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function draftFromSaved(saved: HoleNote | null | undefined, guest: HoleNoteDraft | null | undefined) {
  const src = saved
    ? {
        tee_club: saved.tee_club,
        target_line: saved.target_line,
        green_note: saved.green_note,
        target_score: saved.target_score,
        notes: saved.notes,
      }
    : guest;
  return {
    club: src?.tee_club ?? "",
    line: src?.target_line ?? "",
    green: src?.green_note ?? "",
    score: src?.target_score != null ? String(src.target_score) : "",
    notes: src?.notes ?? "",
  };
}

function HoleJournal({
  courseId,
  hole,
  par,
  mode,
  saved,
  guest,
  save,
  loading,
  onGuestChange,
}: {
  courseId: CourseId;
  hole: number;
  par: number;
  mode: "cloud" | "guest";
  saved: HoleNote | null;
  guest: HoleNoteDraft | null;
  save: ReturnType<typeof useHoleNotes>["save"];
  loading: boolean;
  onGuestChange: () => void;
}) {
  const initial = draftFromSaved(saved, guest);
  const [club, setClub] = useState(initial.club);
  const [line, setLine] = useState(initial.line);
  const [green, setGreen] = useState(initial.green);
  const [score, setScore] = useState(initial.score);
  const [notes, setNotes] = useState(initial.notes);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [editing, setEditing] = useState(
    !initial.club && !initial.line && !initial.green && !initial.score && !initial.notes,
  );
  const dirty = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const next = draftFromSaved(saved, guest);
    dirty.current = false;
    if (timer.current) window.clearTimeout(timer.current);
    setClub(next.club);
    setLine(next.line);
    setGreen(next.green);
    setScore(next.score);
    setNotes(next.notes);
    const filled = Boolean(next.club || next.line || next.green || next.score || next.notes);
    setStatus(filled ? "saved" : "idle");
    setEditing(!filled);
  }, [saved, guest, hole, courseId]);

  useEffect(() => {
    if (!dirty.current) return;
    if (timer.current) window.clearTimeout(timer.current);
    setStatus("saving");
    timer.current = window.setTimeout(() => {
      const draft: HoleNoteDraft = {
        tee_club: club.trim() || null,
        target_line: line.trim() || null,
        green_note: green.trim() || null,
        target_score: score.trim() ? Number(score) : null,
        notes: notes.trim() || null,
      };
      if (mode === "guest") {
        setGuestNote(courseId, hole, draft);
        onGuestChange();
        setStatus("saved");
        dirty.current = false;
        return;
      }
      save.mutate(
        { hole, draft },
        {
          onSuccess: () => {
            setStatus("saved");
            dirty.current = false;
          },
          onError: () => setStatus("error"),
        },
      );
    }, 700);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberate field-driven auto-save
  }, [club, line, green, score, notes, courseId, hole, mode]);

  function touch<T>(setter: (v: T) => void) {
    return (v: T) => {
      dirty.current = true;
      setter(v);
    };
  }

  const field = "control t-body w-full";
  const hasContent = Boolean(club || line || green || score || notes);
  const statusLabel =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? mode === "guest"
          ? "Saved on device"
          : "Saved"
        : status === "error"
          ? "Couldn't save"
          : mode === "guest"
            ? "Private on device"
            : "Private · only you";

  if (!editing && hasContent) {
    return (
      <section className="surface-raised overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="t-section text-foreground">Game plan · {hole}</p>
            <p className="t-micro mt-0.5 text-muted-foreground">{statusLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="press btn-quiet t-micro shrink-0 !min-h-9 !px-3"
          >
            Edit
          </button>
        </div>
        <dl className="divide-y divide-border">
          {club.trim() && (
            <div className="flex gap-3 px-4 py-2.5">
              <dt className="t-micro w-16 shrink-0 text-muted-foreground">Club</dt>
              <dd className="t-body min-w-0 font-medium text-foreground">{club.trim()}</dd>
            </div>
          )}
          {line.trim() && (
            <div className="flex gap-3 px-4 py-2.5">
              <dt className="t-micro w-16 shrink-0 text-muted-foreground">Line</dt>
              <dd className="t-body min-w-0 text-foreground">{line.trim()}</dd>
            </div>
          )}
          {green.trim() && (
            <div className="flex gap-3 px-4 py-2.5">
              <dt className="t-micro w-16 shrink-0 text-muted-foreground">Green</dt>
              <dd className="t-body min-w-0 text-foreground">{green.trim()}</dd>
            </div>
          )}
          {score.trim() && (
            <div className="flex gap-3 px-4 py-2.5">
              <dt className="t-micro w-16 shrink-0 text-muted-foreground">Target</dt>
              <dd className="t-body min-w-0 tabular-nums font-medium text-foreground">{score.trim()}</dd>
            </div>
          )}
          {notes.trim() && (
            <div className="px-4 py-2.5">
              <dt className="t-micro text-muted-foreground">Notes</dt>
              <dd className="t-body mt-1 line-clamp-4 text-foreground/90">“{notes.trim()}”</dd>
            </div>
          )}
        </dl>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="t-section text-foreground">Game plan · {hole}</h2>
        <span
          className={`t-micro ${
            status === "saved"
              ? "text-foreground/70"
              : status === "error"
                ? "text-destructive"
                : "text-muted-foreground"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="surface-inset space-y-4 p-3.5">
        <div>
          <p className="t-micro mb-1.5 text-muted-foreground">Club off the tee</p>
          <div className="flex flex-wrap gap-1.5">
            {TEE_CLUBS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => touch(setClub)(c === "Other" ? "" : c)}
                className={`press t-micro min-h-10 rounded-full border px-3 ${
                  club === c ||
                  (c === "Other" &&
                    club &&
                    !TEE_CLUBS.slice(0, -1).includes(club as (typeof TEE_CLUBS)[number]))
                    ? "border-foreground/30 bg-secondary text-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            value={club}
            onChange={(e) => touch(setClub)(e.target.value)}
            aria-label="Club off the tee"
            placeholder="Or type a club"
            maxLength={60}
            className={`${field} mt-2`}
          />
        </div>

        <div>
          <p className="t-micro mb-1.5 text-muted-foreground">Target line</p>
          <input
            value={line}
            onChange={(e) => touch(setLine)(e.target.value)}
            aria-label="Target line"
            placeholder="e.g. left edge of the right bunker"
            maxLength={140}
            className={field}
          />
        </div>

        <div>
          <p className="t-micro mb-1.5 text-muted-foreground">Miss / green</p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {MISS_SIDES.map((side) => (
              <button
                key={side.id}
                type="button"
                onClick={() => touch(setGreen)(side.label)}
                className={`press t-micro min-h-10 rounded-full border px-3 ${
                  green === side.label
                    ? "border-foreground/30 bg-secondary text-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {side.label}
              </button>
            ))}
          </div>
          <input
            value={green}
            onChange={(e) => touch(setGreen)(e.target.value)}
            aria-label="Green read or miss side"
            placeholder="Green read / miss side"
            maxLength={140}
            className={field}
          />
        </div>

        <div>
          <p className="t-micro mb-1.5 text-muted-foreground">Personal target</p>
          <div className="flex flex-wrap items-center gap-2">
            {[par - 1, par, par + 1].filter((n) => n > 0).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => touch(setScore)(String(n))}
                className={`press t-micro min-h-10 min-w-11 rounded-full border px-3 tabular-nums ${
                  score === String(n)
                    ? "border-foreground/30 bg-secondary text-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {n}
              </button>
            ))}
            <input
              value={score}
              onChange={(e) => touch(setScore)(e.target.value.replace(/\D/g, "").slice(0, 2))}
              inputMode="numeric"
              aria-label="Personal target score"
              placeholder="Score"
              className={`${field} max-w-[5.5rem]`}
            />
          </div>
        </div>

        <div>
          <p className="t-micro mb-1.5 text-muted-foreground">Notes</p>
          <textarea
            value={notes}
            onChange={(e) => touch(setNotes)(e.target.value)}
            rows={3}
            maxLength={600}
            aria-label="Hole notes"
            placeholder="Wind, bail-out, anything you want to remember"
            className={`${field} resize-none`}
          />
        </div>

        {mode === "guest" && (
          <p className="t-micro text-muted-foreground">
            Notes stay on this phone until you{" "}
            <Link to="/profile" className="text-foreground underline underline-offset-2">
              sign in
            </Link>
            .
          </p>
        )}

        {loading && mode === "cloud" && (
          <p className="t-micro text-muted-foreground">Loading your notes…</p>
        )}

        {hasContent && (
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            <span className="t-micro text-muted-foreground">
              {status === "saving" ? "Saving…" : status === "saved" ? "All set" : "Auto-saves"}
            </span>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={status === "saving"}
              className="press btn-gold t-body !min-h-10 !px-4"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
