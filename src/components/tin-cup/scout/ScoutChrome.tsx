import { useEffect, useRef } from "react";
import { MoreHorizontal, Printer, Share2 } from "lucide-react";

import {
  COURSE_LABEL,
  COURSE_ORDER,
  SNAKE_PIT,
  type CourseId,
} from "@/lib/courses";

/**
 * Slim sticky planner chrome — course + progress + hole strip.
 * Map stays the hero below.
 */
export function ScoutChrome({
  courseId,
  todayCourse,
  hole,
  holes,
  plannedCount,
  hasNote,
  contestByHole,
  gridOpen,
  onSelectCourse,
  onSelectHole,
  onToggleGrid,
  onShare,
  onPrint,
}: {
  courseId: CourseId;
  todayCourse: CourseId;
  hole: number;
  holes: { h: number }[];
  plannedCount: number;
  hasNote: (h: number) => boolean;
  contestByHole: Map<number, Array<"ctp" | "ld">>;
  gridOpen: boolean;
  onSelectCourse: (id: CourseId) => void;
  onSelectHole: (h: number) => void;
  onToggleGrid: () => void;
  onShare: () => void;
  onPrint: () => void;
}) {
  const pct = Math.round((plannedCount / 18) * 100);
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Keep active hole visible in the horizontal strip
  useEffect(() => {
    if (gridOpen) return;
    const el = activeRef.current;
    const strip = stripRef.current;
    if (!el || !strip) return;
    const left = el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [hole, courseId, gridOpen]);

  return (
    <div className="sticky top-[3.25rem] z-20 -mx-4 mb-4 border-b border-border/70 bg-background/94 px-4 pb-3 pt-1 backdrop-blur-md sm:-mx-5 sm:px-5">
      {/* Course segmented */}
      <div
        className="mb-3 grid grid-cols-3 gap-1 rounded-2xl border border-border/80 bg-secondary/25 p-1"
        role="tablist"
        aria-label="Course"
      >
        {COURSE_ORDER.map((id) => {
          const active = id === courseId;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelectCourse(id)}
              className={`press min-h-11 rounded-xl px-1 text-center text-sm font-semibold tracking-tight ${
                active
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground"
              }`}
            >
              {COURSE_LABEL[id]}
              {id === todayCourse ? (
                <span className="mt-0.5 block text-[0.62rem] font-bold uppercase tracking-[0.1em] text-gold-light/90">
                  today
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Progress + actions */}
      <div className="mb-2 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {plannedCount}
              <span className="font-medium text-muted-foreground">/18 planned</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleGrid}
                className={`press min-h-9 rounded-lg px-2.5 text-xs font-semibold ${
                  gridOpen
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {gridOpen ? "Strip" : "Grid"}
              </button>
              <button
                type="button"
                onClick={onShare}
                aria-label="Share plan"
                className="press flex size-9 items-center justify-center rounded-lg text-muted-foreground"
              >
                <Share2 className="size-4" />
              </button>
              <button
                type="button"
                onClick={onPrint}
                aria-label="Print plan"
                className="press flex size-9 items-center justify-center rounded-lg text-muted-foreground"
              >
                <Printer className="size-4" />
              </button>
            </div>
          </div>
          <div
            className="h-1 overflow-hidden rounded-full bg-track"
            role="progressbar"
            aria-valuenow={plannedCount}
            aria-valuemin={0}
            aria-valuemax={18}
          >
            <div
              className="h-full rounded-full bg-gold/85 transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {gridOpen ? (
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9">
          {holes.map((h) => {
            const contests = contestByHole.get(h.h) ?? [];
            const active = h.h === hole;
            const snake = courseId === "copperhead" && SNAKE_PIT.includes(h.h);
            return (
              <button
                key={h.h}
                type="button"
                onClick={() => onSelectHole(h.h)}
                aria-label={`Hole ${h.h}`}
                className={`press relative flex min-h-11 items-center justify-center rounded-xl border text-sm font-bold tabular-nums ${
                  active
                    ? "border-foreground/30 bg-foreground text-background"
                    : snake
                      ? "border-copper/35 text-copper"
                      : "border-border text-muted-foreground"
                }`}
              >
                {h.h}
                {hasNote(h.h) && !active ? (
                  <span
                    aria-hidden
                    className="absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-gold"
                  />
                ) : null}
                {contests.length > 0 && !active ? (
                  <span
                    aria-hidden
                    className={`absolute right-1 top-1 size-1.5 rounded-full ${
                      contests.includes("ld") ? "bg-copper" : "bg-gold-light"
                    }`}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="relative">
          <div
            ref={stripRef}
            className="no-scrollbar flex snap-x snap-mandatory gap-1.5 overflow-x-auto scroll-smooth px-0.5"
          >
            {holes.map((h) => {
              const contests = contestByHole.get(h.h) ?? [];
              const active = h.h === hole;
              const snake = courseId === "copperhead" && SNAKE_PIT.includes(h.h);
              const planned = hasNote(h.h);
              return (
                <button
                  key={h.h}
                  ref={active ? activeRef : undefined}
                  type="button"
                  onClick={() => onSelectHole(h.h)}
                  aria-current={active ? "true" : undefined}
                  aria-label={`Hole ${h.h}${planned ? ", planned" : ""}`}
                  className={`press relative size-11 shrink-0 snap-start rounded-full border text-sm font-bold tabular-nums transition-colors ${
                    active
                      ? "border-gold/50 bg-gold/20 text-gold-light shadow-[0_0_0_1px_oklch(from_var(--gold)_l_c_h/25%)]"
                      : snake
                        ? "border-copper/35 text-copper"
                        : planned
                          ? "border-border bg-secondary/40 text-foreground"
                          : "border-border text-muted-foreground"
                  }`}
                >
                  {h.h}
                  {planned && !active ? (
                    <span
                      aria-hidden
                      className="absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-gold"
                    />
                  ) : null}
                  {contests.length > 0 && !active ? (
                    <span
                      aria-hidden
                      className={`absolute right-0.5 top-0.5 size-1.5 rounded-full ${
                        contests.includes("ld") ? "bg-copper" : "bg-gold-light"
                      }`}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Reserved for future overflow menu wiring */
export function ScoutOverflowIcon() {
  return <MoreHorizontal className="size-4" />;
}
