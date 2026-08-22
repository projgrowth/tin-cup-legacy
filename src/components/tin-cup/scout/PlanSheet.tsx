import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronUp } from "lucide-react";

import { StatusLED } from "@/components/tin-cup/scout/DistanceStack";
import { HolePlanFields } from "@/components/tin-cup/scout/HolePlanFields";
import { useHolePlanEditor } from "@/hooks/useHolePlanEditor";
import { useAuth } from "@/hooks/useAuth";
import { useHoleNotes } from "@/hooks/useJournal";
import { SNAKE_PIT, type CourseId } from "@/lib/courses";
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
      aria-expanded={expanded}
      aria-disabled={forceCollapsed || undefined}
    >
      {overlay ? <span aria-hidden className="mb-2 h-1 w-8 rounded-full bg-white/30" /> : null}
      <span className="text-sm font-semibold tracking-tight text-white">
        H{hole}
        {pitLabel ? <span className="text-copper"> · {pitLabel}</span> : null}
      </span>
      <span className="mt-1 flex max-w-full items-center justify-center gap-2">
        {!overlay && <StatusLED state={led} />}
        <span className="truncate text-sm text-white/55">
          {filled ? summary : " "}
        </span>
        {!overlay && (
          <ChevronUp
            className={`size-4 shrink-0 text-white/45 transition-transform ${expanded ? "" : "rotate-180"}`}
          />
        )}
      </span>
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
            aria-label={`Hole ${h.h}`}
            aria-current={active ? "true" : undefined}
            className={`press relative size-11 shrink-0 rounded-full text-sm font-bold tabular-nums transition-colors ${
              active
                ? "bg-gold/20 text-gold-light ring-1 ring-gold/40"
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
                className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-gold"
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
          </Link>
        );
      })}
    </div>
  );

  return (
    <div
      className={`relative overflow-hidden transition-opacity ${
        overlay
          ? `rounded-t-[1.15rem] border-t border-white/10 backdrop-blur-md ${
              expanded ? "bg-black/78" : "bg-black/40"
            }`
          : "glass-panel"
      }`}
    >
      {overlay ? handle : strip}
      {overlay ? strip : handle}
      {expanded && (
        <div className="border-t border-white/8 px-4 pb-4 pt-3">
          <HolePlanFields par={par} mode={mode} loading={loading} editor={editor} />
        </div>
      )}
    </div>
  );
}
