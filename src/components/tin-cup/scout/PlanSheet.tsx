import { useEffect, useRef, useState } from "react";
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
}) {
  const [open, setOpen] = useState(!editor.filled);
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const { led, filled, summary } = editor;

  const expanded = open && !forceCollapsed;

  useEffect(() => {
    if (forceCollapsed) return;
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

  return (
    <div
      className={`glass-panel relative overflow-hidden transition-opacity ${
        forceCollapsed ? "opacity-90" : ""
      }`}
    >
      {/* Hole strip — compact in Play */}
      <div
        ref={stripRef}
        className={`no-scrollbar flex gap-1.5 overflow-x-auto scroll-smooth border-b border-white/10 px-3 ${
          forceCollapsed ? "py-1.5" : "py-2.5"
        }`}
      >
        {holes.map((h) => {
          const active = h.h === hole;
          const snake = courseId === "copperhead" && SNAKE_PIT.includes(h.h);
          const planned = hasNote(h.h);
          const contests = contestByHole.get(h.h) ?? [];
          return (
            <button
              key={h.h}
              ref={active ? activeRef : undefined}
              type="button"
              onClick={() => onSelectHole(h.h)}
              aria-current={active ? "true" : undefined}
              className={`press relative size-10 shrink-0 rounded-full text-sm font-bold tabular-nums transition-colors ${
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
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          if (forceCollapsed) return;
          setOpen((v) => !v);
        }}
        className={`press flex w-full items-center gap-3 px-4 text-left ${
          forceCollapsed ? "py-2.5" : "py-3.5"
        }`}
        aria-expanded={expanded}
        aria-disabled={forceCollapsed || undefined}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold tracking-tight text-white">
              Plan · H{hole}
              {forceCollapsed ? (
                <span className="ml-2 text-xs font-semibold text-sky-200/70">· Play</span>
              ) : null}
            </p>
            <StatusLED state={led} />
          </div>
          <p className="mt-1 truncate text-sm text-white/55">
            {forceCollapsed
              ? filled
                ? summary
                : "Exit Play to edit plan"
              : filled
                ? summary
                : expanded
                  ? "Club + miss — saves as you go"
                  : "Tap to set club · miss · line"}
          </p>
        </div>
        {!forceCollapsed && (
          <ChevronUp
            className={`size-5 shrink-0 text-white/45 transition-transform ${
              expanded ? "" : "rotate-180"
            }`}
          />
        )}
      </button>

      {expanded && (
        <div className="border-t border-white/8 px-4 pb-4 pt-3">
          <HolePlanFields par={par} mode={mode} loading={loading} editor={editor} />
        </div>
      )}
    </div>
  );
}
