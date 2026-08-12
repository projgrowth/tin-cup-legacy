import { useEffect, useRef, useState } from "react";
import { ChevronUp, Link as LinkIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

import type { HoleNote, HoleNoteDraft } from "@/hooks/useJournal";
import type { useAuth } from "@/hooks/useAuth";
import type { useHoleNotes } from "@/hooks/useJournal";
import type { CourseId } from "@/lib/courses";
import { getGuestNote, setGuestNote } from "@/lib/guest-notes";
import { hasPlanContent } from "@/lib/round-sheet";
import { LoadingForm } from "@/components/tin-cup/Shell";
import { StatusLED } from "@/components/tin-cup/scout/DistanceStack";

const TEE_CLUBS = ["Driver", "3W", "5W", "Hybrid", "Iron"] as const;
const MISS = [
  { label: "L", value: "Miss L" },
  { label: "C", value: "Center" },
  { label: "R", value: "Miss R" },
] as const;

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

/**
 * Grint-inspired plan sheet — collapsed HUD summary, expand for full journal.
 * Same hole_notes fields / guest storage as before.
 */
export function PlanSheet({
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
  if (authLoading) return <LoadingForm fields={2} />;

  const mode = user ? "cloud" : "guest";
  const saved = user ? journal.noteFor(hole) : null;
  const guest = !user ? getGuestNote(courseId, hole) : null;

  return (
    <PlanSheetInner
      courseId={courseId}
      hole={hole}
      par={par}
      mode={mode}
      saved={saved}
      guest={guest}
      save={journal.save}
      loading={journal.loading}
      onGuestChange={onGuestChange}
    />
  );
}

function PlanSheetInner({
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
  const [open, setOpen] = useState(false);
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
    // Keep expanded only if empty (encourage first plan)
    setOpen(!filled);
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
    }, 500);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club, line, green, score, notes, courseId, hole, mode]);

  function touch<T>(setter: (v: T) => void) {
    return (v: T) => {
      dirty.current = true;
      setter(v);
    };
  }

  const filled = hasPlanContent({
    tee_club: club || null,
    target_line: line || null,
    green_note: green || null,
    target_score: score ? Number(score) : null,
    notes: notes || null,
  });
  const summary = [club, green, score ? `tgt ${score}` : "", line || notes]
    .filter(Boolean)
    .join(" · ");

  const led: "idle" | "saving" | "saved" | "error" | "guest" =
    status === "saving"
      ? "saving"
      : status === "error"
        ? "error"
        : status === "saved"
          ? mode === "guest"
            ? "guest"
            : "saved"
          : "idle";

  const chip = (on: boolean) => `press chip-hud ${on ? "chip-hud-on" : ""}`;

  return (
    <div className="hud-pod relative overflow-hidden border-white/10">
      {/* Handle + collapsed row */}
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
                ? "Pick club + shape"
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
                  onClick={() => touch(setClub)(club === c ? "" : c)}
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
              {MISS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => touch(setGreen)(green === m.value ? "" : m.value)}
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
                    onClick={() => touch(setScore)(score === String(n) ? "" : String(n))}
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
              onChange={(e) => touch(setLine)(e.target.value)}
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
                onChange={(e) => touch(setGreen)(e.target.value)}
                placeholder="Green read"
                maxLength={140}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-base text-white placeholder:text-white/35"
              />
              <textarea
                value={notes}
                onChange={(e) => touch(setNotes)(e.target.value)}
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
