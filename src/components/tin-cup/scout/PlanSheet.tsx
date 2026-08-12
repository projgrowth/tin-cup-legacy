import { useEffect, useState } from "react";
import { ChevronUp, Link as LinkIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { StatusLED } from "@/components/tin-cup/scout/DistanceStack";
import {
  MISS_SHAPES,
  TEE_CLUBS,
  useHolePlanEditor,
} from "@/hooks/useHolePlanEditor";
import { useAuth } from "@/hooks/useAuth";
import { useHoleNotes } from "@/hooks/useJournal";
import type { CourseId } from "@/lib/courses";
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
 * Grint-inspired plan sheet — editor owned by parent (shared with map strip).
 */
export function PlanSheet({
  hole,
  par,
  mode,
  loading,
  editor,
}: {
  hole: number;
  par: number;
  mode: "cloud" | "guest";
  loading: boolean;
  editor: ReturnType<typeof useHolePlanEditor>;
}) {
  const [open, setOpen] = useState(!editor.filled);
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

  // When hole changes, open if empty so first plan is obvious
  useEffect(() => {
    setOpen(!filled);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on hole change
  }, [hole]);

  const chip = (on: boolean) => `press chip-hud ${on ? "chip-hud-on" : ""}`;

  return (
    <div className="hud-pod relative overflow-hidden border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="press flex w-full items-center gap-3 px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <span
          className="pointer-events-none absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/25"
          aria-hidden
        />
        <div className="min-w-0 flex-1 pt-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold tracking-tight text-white">
              Plan <span className="text-white/40">·</span> H{hole}
            </p>
            <StatusLED state={led} />
          </div>
          <p className="mt-1 truncate text-sm text-white/60">
            {filled
              ? summary
              : open
                ? "Pick club + shape — or use map tools"
                : "Tap to set club · miss · target"}
          </p>
        </div>
        <ChevronUp
          className={`size-5 shrink-0 text-white/50 transition-transform ${open ? "" : "rotate-180"}`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/10 px-4 pb-4 pt-3">
          <div>
            <p className="hud-label mb-2">Club</p>
            <div className="flex flex-wrap gap-1.5">
              {TEE_CLUBS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClub(club === c ? "" : c)}
                  className={chip(club === c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="hud-label mb-2">Shape</p>
            <div className="flex flex-wrap gap-1.5">
              {MISS_SHAPES.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => setGreen(green === m.value ? "" : m.value)}
                  className={chip(green === m.value)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="hud-label mb-2">Target</p>
            <div className="flex gap-1.5">
              {[par - 1, par, par + 1]
                .filter((n) => n > 0)
                .map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScore(score === String(n) ? "" : String(n))}
                    className={`${chip(score === String(n))} min-w-[3.25rem] text-base`}
                  >
                    {n}
                  </button>
                ))}
            </div>
          </div>

          <div>
            <p className="hud-label mb-2">Line</p>
            <input
              value={line}
              onChange={(e) => setLine(e.target.value)}
              placeholder="left edge of right bunker"
              maxLength={140}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-base text-white placeholder:text-white/35 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
            />
          </div>

          <details className="group">
            <summary className="press cursor-pointer list-none text-xs font-bold uppercase tracking-[0.1em] text-white/45 [&::-webkit-details-marker]:hidden">
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
            <p className="flex items-start gap-1.5 text-xs text-white/50">
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
            <p className="text-xs text-white/45">Loading…</p>
          )}
        </div>
      )}
    </div>
  );
}
