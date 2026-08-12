import { useEffect, useRef, useState } from "react";
import { ChevronUp, Link as LinkIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { StatusLED } from "@/components/tin-cup/scout/DistanceStack";
import { Chip } from "@/components/tin-cup/ui/primitives";
import {
  MISS_SHAPES,
  TEE_CLUBS,
  useHolePlanEditor,
} from "@/hooks/useHolePlanEditor";
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
  const {
    club,
    line,
    green,
    score,
    notes,
    setClub,
    setLine,
    setGreen,
    setScore,
    setNotes,
    led,
    filled,
    summary,
  } = editor;

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
                <span className="ml-2 text-xs font-semibold text-sky-200/70">
                  · Play
                </span>
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
        <div className="space-y-4 border-t border-white/8 px-4 pb-4 pt-3">
          <div>
            <p className="t-eyebrow mb-2 text-white/45">Club</p>
            <div className="flex flex-wrap gap-1.5">
              {TEE_CLUBS.map((c) => (
                <Chip key={c} on={club === c} onClick={() => setClub(club === c ? "" : c)}>
                  {c === "Driver" ? "Dr" : c}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="t-eyebrow mb-2 text-white/45">Shape</p>
            <div className="flex flex-wrap gap-1.5">
              {MISS_SHAPES.map((m) => (
                <Chip
                  key={m.label}
                  on={green === m.value}
                  onClick={() => setGreen(green === m.value ? "" : m.value)}
                >
                  {m.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="t-eyebrow mb-2 text-white/45">Target</p>
            <div className="flex gap-1.5">
              {[par - 1, par, par + 1]
                .filter((n) => n > 0)
                .map((n) => (
                  <Chip
                    key={n}
                    on={score === String(n)}
                    onClick={() => setScore(score === String(n) ? "" : String(n))}
                    className="min-w-[3rem]"
                  >
                    {n}
                  </Chip>
                ))}
            </div>
          </div>

          <div>
            <p className="t-eyebrow mb-2 text-white/45">Line</p>
            <input
              value={line}
              onChange={(e) => setLine(e.target.value)}
              placeholder="left edge of right bunker"
              maxLength={140}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-base text-white placeholder:text-white/35 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
            />
          </div>

          <details className="group">
            <summary className="press cursor-pointer list-none text-xs font-bold uppercase tracking-[0.1em] text-white/40 [&::-webkit-details-marker]:hidden">
              More notes
            </summary>
            <div className="mt-2 space-y-2">
              <input
                value={green}
                onChange={(e) => setGreen(e.target.value)}
                placeholder="Green read"
                maxLength={140}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-base text-white placeholder:text-white/35"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={600}
                placeholder="Wind, bail-out…"
                className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-base text-white placeholder:text-white/35"
              />
            </div>
          </details>

          {mode === "guest" && (
            <p className="flex items-start gap-1.5 text-xs text-white/45">
              <LinkIcon className="mt-0.5 size-3.5 shrink-0" />
              <span>
                On this device until you{" "}
                <Link to="/profile" className="font-semibold text-gold-light underline">
                  sign in
                </Link>
              </span>
            </p>
          )}
          {loading && mode === "cloud" && (
            <p className="text-xs text-white/40">Loading…</p>
          )}
        </div>
      )}
    </div>
  );
}
