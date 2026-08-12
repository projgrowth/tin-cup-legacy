import { useEffect, useRef, useState } from "react";

import type { HoleNote, HoleNoteDraft } from "@/hooks/useJournal";
import type { useHoleNotes } from "@/hooks/useJournal";
import type { CourseId } from "@/lib/courses";
import { setGuestNote } from "@/lib/guest-notes";
import { hasPlanContent } from "@/lib/round-sheet";

export type PlanEditorStatus = "idle" | "saving" | "saved" | "error";

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

/** Shared auto-save plan state for map quick tools + plan sheet. */
export function useHolePlanEditor({
  courseId,
  hole,
  mode,
  saved,
  guest,
  save,
  onGuestChange,
}: {
  courseId: CourseId;
  hole: number;
  mode: "cloud" | "guest";
  saved: HoleNote | null;
  guest: HoleNoteDraft | null;
  save: ReturnType<typeof useHoleNotes>["save"];
  onGuestChange: () => void;
}) {
  const initial = draftFromSaved(saved, guest);
  const [club, setClub] = useState(initial.club);
  const [line, setLine] = useState(initial.line);
  const [green, setGreen] = useState(initial.green);
  const [score, setScore] = useState(initial.score);
  const [notes, setNotes] = useState(initial.notes);
  const [status, setStatus] = useState<PlanEditorStatus>("idle");
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
    }, 480);
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

  return {
    club,
    line,
    green,
    score,
    notes,
    setClub: touch(setClub),
    setLine: touch(setLine),
    setGreen: touch(setGreen),
    setScore: touch(setScore),
    setNotes: touch(setNotes),
    status,
    led,
    filled,
    summary,
  };
}

export const TEE_CLUBS = ["Driver", "3W", "5W", "Hybrid", "Iron"] as const;
export const MISS_SHAPES = [
  { label: "L", value: "Miss L" },
  { label: "C", value: "Center" },
  { label: "R", value: "Miss R" },
] as const;
