import { useMemo } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useHoleNotes } from "@/hooks/useJournal";
import { COURSE_ORDER } from "@/lib/courses";
import { listGuestNotes } from "@/lib/guest-notes";
import { hasPlanContent } from "@/lib/round-sheet";

export function usePlanningProgress() {
  const { user } = useAuth();
  const south = useHoleNotes(COURSE_ORDER[0]);
  const copperhead = useHoleNotes(COURSE_ORDER[1]);
  const island = useHoleNotes(COURSE_ORDER[2]);

  return useMemo(() => {
    const byCourse = new Map<string, number>();
    const cloud = [south.notes, copperhead.notes, island.notes];
    if (user) {
      COURSE_ORDER.forEach((id, index) => {
        byCourse.set(id, cloud[index]!.filter(hasPlanContent).length);
      });
    } else {
      const guest = listGuestNotes();
      for (const id of COURSE_ORDER) {
        byCourse.set(
          id,
          guest.filter((note) => note.courseId === id && hasPlanContent(note.draft)).length,
        );
      }
    }
    return { byCourse, best: Math.max(0, ...byCourse.values()) };
  }, [user, south.notes, copperhead.notes, island.notes]);
}
