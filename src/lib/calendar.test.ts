import { describe, expect, it } from "vitest";

import { weekendIcs } from "@/lib/calendar";

describe("weekend calendar", () => {
  it("includes confirmed tee times and skips TBD times", () => {
    const ics = weekendIcs([
      {
        day_label: "Friday",
        course: "South Course",
        format: "Scramble",
        play_date: "2026-08-28",
        tee_window: "12:19–12:44 PM",
      },
      {
        day_label: "Sunday",
        course: "Island Course",
        format: "Singles",
        play_date: "2026-08-30",
        tee_window: "TBD",
      },
    ]);
    expect(ics).toContain("Tin Cup — Friday");
    expect(ics).not.toContain("Tin Cup — Sunday");
    expect(ics).toContain("BEGIN:VCALENDAR");
  });

  it("includes confirmed social events without inventing unknown times", () => {
    const start = Date.parse("2026-08-29T19:00:00-04:00");
    const ics = weekendIcs(
      [],
      [
        {
          id: "dinner",
          title: "Tin Cup — Dinner",
          location: "Steakhouse",
          detail: "Reservation",
          start,
          end: start + 7_200_000,
        },
      ],
    );
    expect(ics).toContain("Tin Cup — Dinner");
    expect(ics).toContain("LOCATION:Steakhouse");
  });
});
