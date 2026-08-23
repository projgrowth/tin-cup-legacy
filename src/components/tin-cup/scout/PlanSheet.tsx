import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronUp } from "lucide-react";

import { StatusLED } from "@/components/tin-cup/scout/DistanceStack";
import { HolePlanFields } from "@/components/tin-cup/scout/HolePlanFields";
import { useHolePlanEditor } from "@/hooks/useHolePlanEditor";
import { useAuth } from "@/hooks/useAuth";
import { useHoleNotes } from "@/hooks/useJournal";
import { cannedHoleLine, SNAKE_PIT, type CourseId } from "@/lib/courses";
import { getGuestNote } from "@/lib/guest-notes";

/** Parent-owned editor for map tools + sheet (single autosave). */
export function useScoutPlanEditor(
  courseId: CourseId,
  hole: number,
  user: ReturnType<typeof useAuth>["user"],
  journal: ReturnType<typeof useHoleNotes>,
  onGuestChange: () => void,
) {
  const mode = user ? "cloud" : ("guest" as const);
  const saved = user ? journal.noteFor(hole) : null;
  const guest = !user ? getGuestNote(courseId, hole) : null;
  return useHolePlanEditor({
    courseId,
    hole,
    mode,
    saved,
    guest,
    save: journal.save,
    onGuestChange,
  });
}

/**
 * Single plan surface — collapsed summary, expand for chips + notes.
 * Hole strip lives here (not a second sticky chrome).
 */
export function PlanSheet({
  courseId,
  hole,
  par,
  holes,
  mode,
  loading,
  editor,
  hasNote,
  contestByHole,
  onSelectHole,
  forceCollapsed = false,
  overlay = false,
  pitLabel = null,
}: {
  courseId: CourseId;
  hole: number;
  par: number;
  holes: { h: number }[];
  mode: "cloud" | "guest";
  loading: boolean;
  editor: ReturnType<typeof useHolePlanEditor>;
  hasNote: (h: number) => boolean;
  contestByHole: Map<number, Array<"ctp" | "ld">>;
  onSelectHole: (h: number) => void;
  /** Play GPS mode — keep plan collapsed so map stays hero. */
  forceCollapsed?: boolean;
  /** Bottom drawer over the aerial. Starts collapsed. */
  overlay?: boolean;
  pitLabel?: string | null;
}) {
  const [open, setOpen] = useState(overlay ? false : !editor.filled);
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const { led, filled, summary } = editor;
  const canned = cannedHoleLine(courseId, hole);
  const emptyLine = pitLabel ? "Pit · Club, miss, line" : canned || "Club · miss · line";


  const expanded = open && !forceCollapsed;

  useEffect(() => {
    if (forceCollapsed || overlay) return;
    setOpen(!filled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hole]);

  useEffect(() => {
    if (forceCollapsed) setOpen(false);
  }, [forceCollapsed]);

  useEffect(() => {
    const el = activeRef.current;
    const strip = stripRef.current;
    if (!el || !strip) return;
    const left = el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [hole, courseId]);

  const handle = (
    <button
      type="button"
      onClick={() => {
        if (forceCollapsed) return;
        setOpen((v) => !v);
      }}
      className={`press flex w-full flex-col items-center px-4 text-center ${
        overlay && !expanded ? "pb-3 pt-2" : "py-3"
      }`}
      aria-label={overlay ? `Hole ${hole} plan` : undefined}
      aria-expanded={expanded}
      aria-disabled={forceCollapsed || undefined}
    >
      {overlay ? <span aria-hidden className="mb-2 h-0.5 w-7 rounded-full bg-white/25" /> : null}
      <span className="t-body font-semibold tracking-tight text-white">
        {overlay
          ? filled
            ? summary
            : emptyLine
          : `H${hole}${pitLabel ? ` · ${pitLabel}` : ""}`}
      </span>
      {overlay ? null : (
        <span className="mt-1 flex max-w-full items-center justify-center gap-2">
          <StatusLED state={led} />
          <span className="truncate text-sm text-white/55">{filled ? summary : " "}</span>
          <ChevronUp
            className={`size-4 shrink-0 text-white/45 transition-transform ${expanded ? "" : "rotate-180"}`}
          />
        </span>
      )}
    </button>
  );

  const strip = (
    <div
      ref={stripRef}
      className="no-scrollbar flex gap-1.5 overflow-x-auto scroll-smooth border-b border-white/10 px-3 py-2.5"
    >
      {holes.map((h) => {
        const active = h.h === hole;
        const snake = courseId === "copperhead" && SNAKE_PIT.includes(h.h);
        const planned = hasNote(h.h);
        const contests = contestByHole.get(h.h) ?? [];
        return (
          <Link
            key={h.h}
            ref={active ? activeRef : undefined}
            to="/scout"
            search={{ course: courseId, hole: h.h, map: true }}
            replace
            onClick={() => onSelectHole(h.h)}
            aria-label={`Open hole ${h.h} map`}
            aria-current={active ? "true" : undefined}
            className={`press relative flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
              active
                ? "bg-hunter text-primary-foreground"
                : snake
                  ? "bg-white/5 text-copper"
                  : planned
                    ? "bg-white/8 text-white/90"
                    : "bg-white/5 text-white/45"
            }`}
          >
            {h.h}
            {planned && !active ? (
              <span
                aria-hidden
                className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-white"
              />
            ) : null}
            {contests.length > 0 && !active ? (
              <span
                aria-hidden
                className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-white"
              />
            ) : null}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div
      className={`relative overflow-hidden transition-opacity ${
        overlay
          ? `rounded-t-[var(--radius-card)] border-t border-white/12 ${
              expanded ? "bg-black" : "bg-black/72"
            }`
          : "glass-panel"
      }`}
    >
      {overlay ? handle : strip}
      {overlay ? strip : handle}
      {expanded && (
        <div className="border-t border-white/8 px-4 pb-4 pt-3">
          {overlay ? (
            <div className="surface p-3">
              <HolePlanFields par={par} mode={mode} loading={loading} editor={editor} />
            </div>
          ) : (
            <HolePlanFields par={par} mode={mode} loading={loading} editor={editor} />
          )}
        </div>
      )}
    </div>
  );
}
