import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "@tanstack/react-router";

import type { HoleNote, HoleNoteDraft } from "@/hooks/useJournal";
import type { CourseId } from "@/lib/courses";
import { getGuestNote, setGuestNote } from "@/lib/guest-notes";
import { hasPlanContent } from "@/lib/round-sheet";
import { LoadingForm } from "@/components/tin-cup/Shell";
import type { useHoleNotes } from "@/hooks/useJournal";
import type { useAuth } from "@/hooks/useAuth";

const TEE_CLUBS = ["Driver", "3W", "5W", "Hybrid", "Iron"] as const;
const MISS = [
  { id: "L", label: "Miss L", value: "Miss L" },
  { id: "C", label: "Center", value: "Center" },
  { id: "R", label: "Miss R", value: "Miss R" },
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
 * One-thumb game plan dock — map-first companion.
 * Quick path: club + miss. Expand for line / green / target / notes.
 */
export function HolePlanDock({
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
  if (authLoading) return <LoadingForm fields={3} />;

  const mode = user ? "cloud" : "guest";
  const saved = user ? journal.noteFor(hole) : null;
  const guest = !user ? getGuestNote(courseId, hole) : null;

  return (
    <PlanDockInner
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

function PlanDockInner({
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
  const [more, setMore] = useState(false);
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
    setMore(false);
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
    }, 550);
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

  const statusWord =
    status === "saving"
      ? "Saving"
      : status === "saved"
        ? mode === "guest"
          ? "On device"
          : "Saved"
        : status === "error"
          ? "Retry"
          : mode === "guest"
            ? "Private"
            : "Private";

  const summary = [club, green, line || notes].filter(Boolean).join(" · ");
  const filled = hasPlanContent({
    tee_club: club || null,
    target_line: line || null,
    green_note: green || null,
    target_score: score ? Number(score) : null,
    notes: notes || null,
  });

  const chip = (active: boolean) =>
    `press min-h-11 rounded-full border px-3.5 text-sm font-semibold tabular-nums ${
      active
        ? "border-gold/40 bg-gold/15 text-gold-light"
        : "border-border text-muted-foreground"
    }`;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_12px_40px_-24px_oklch(0_0_0/70%)]">
      <div className="flex items-center justify-between gap-3 border-b border-border/80 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            Plan · hole {hole}
          </p>
          {filled && !more ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{summary}</p>
          ) : (
            <p className="mt-0.5 text-sm text-muted-foreground">Club + miss · auto-saves</p>
          )}
        </div>
        <span
          className={`shrink-0 text-xs font-semibold uppercase tracking-wide ${
            status === "error" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {statusWord}
        </span>
      </div>

      <div className="space-y-4 p-4">
        {/* Club */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Off the tee
          </p>
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

        {/* Miss */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Prefer
          </p>
          <div className="flex flex-wrap gap-1.5">
            {MISS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => touch(setGreen)(green === m.value ? "" : m.value)}
                className={chip(green === m.value)}
              >
                {m.label}
              </button>
            ))}
            {[par - 1, par, par + 1]
              .filter((n) => n > 0)
              .map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => touch(setScore)(score === String(n) ? "" : String(n))}
                  className={chip(score === String(n))}
                  aria-label={`Target score ${n}`}
                >
                  {n}
                </button>
              ))}
          </div>
        </div>

        {/* One-line note always available */}
        <input
          value={line}
          onChange={(e) => touch(setLine)(e.target.value)}
          aria-label="Target line"
          placeholder="Line — e.g. left of right bunker"
          maxLength={140}
          className="control w-full text-base"
        />

        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          className="press flex w-full items-center justify-center gap-1.5 py-1 text-sm font-medium text-muted-foreground"
        >
          {more ? (
            <>
              Less <ChevronUp className="size-4" />
            </>
          ) : (
            <>
              Green · notes <ChevronDown className="size-4" />
            </>
          )}
        </button>

        {more && (
          <div className="space-y-3 border-t border-border pt-3">
            <input
              value={green}
              onChange={(e) => touch(setGreen)(e.target.value)}
              aria-label="Green or miss note"
              placeholder="Green read"
              maxLength={140}
              className="control w-full text-base"
            />
            <textarea
              value={notes}
              onChange={(e) => touch(setNotes)(e.target.value)}
              rows={2}
              maxLength={600}
              aria-label="Hole notes"
              placeholder="Wind, bail-out…"
              className="control w-full resize-none text-base"
            />
          </div>
        )}

        {mode === "guest" && (
          <p className="text-sm text-muted-foreground">
            Stays on this phone until you{" "}
            <Link to="/profile" className="font-medium text-foreground underline underline-offset-2">
              sign in
            </Link>
            .
          </p>
        )}
        {loading && mode === "cloud" && (
          <p className="text-sm text-muted-foreground">Loading notes…</p>
        )}
      </div>
    </section>
  );
}
