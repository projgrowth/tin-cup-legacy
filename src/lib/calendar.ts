import { roundStart } from "@/lib/scoring";

export type CalendarRound = {
  day_label: string;
  course: string;
  format: string;
  play_date: string;
  tee_window: string;
};

function utcStamp(value: number) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Build a local calendar file using only confirmed database tee times. */
export type CalendarExtra = {
  id: string;
  title: string;
  location: string;
  detail: string;
  start: number;
  end: number;
};

function eventBlock(event: CalendarExtra) {
  return [
    "BEGIN:VEVENT",
    `UID:tin-cup-2026-${escapeIcs(event.id)}@tincup.local`,
    `DTSTAMP:${utcStamp(Date.UTC(2026, 7, 1, 12))}`,
    `DTSTART:${utcStamp(event.start)}`,
    `DTEND:${utcStamp(event.end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `LOCATION:${escapeIcs(event.location)}`,
    `DESCRIPTION:${escapeIcs(event.detail)}`,
    "END:VEVENT",
  ].join("\r\n");
}

export function weekendIcs(rounds: CalendarRound[], extras: CalendarExtra[] = []) {
  const events = rounds.flatMap((round, index) => {
    const start = roundStart(round);
    if (!start) return [];
    const end = start + 5 * 60 * 60 * 1000;
    return [
      [
        "BEGIN:VEVENT",
        `UID:tin-cup-2026-round-${index + 1}@tincup.local`,
        `DTSTAMP:${utcStamp(Date.UTC(2026, 7, 1, 12))}`,
        `DTSTART:${utcStamp(start)}`,
        `DTEND:${utcStamp(end)}`,
        `SUMMARY:${escapeIcs(`Tin Cup — ${round.day_label}`)}`,
        `LOCATION:${escapeIcs(`${round.course}, Innisbrook Golf Resort`)}`,
        `DESCRIPTION:${escapeIcs(`${round.format}. Tee window: ${round.tee_window}.`)}`,
        "END:VEVENT",
      ].join("\r\n"),
    ];
  });
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tin Cup Invitational//2026//EN",
    ...events,
    ...extras.map(eventBlock),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadWeekendIcs(rounds: CalendarRound[]) {
  const saturdayDinner = Date.parse("2026-08-29T19:00:00-04:00");
  const blob = new Blob(
    [
      weekendIcs(rounds, [
        {
          id: "saturday-steakhouse",
          title: "Tin Cup — Steakhouse dinner",
          location: "Innisbrook Golf Resort",
          detail: "Saturday dinner reservation at the Steakhouse.",
          start: saturdayDinner,
          end: saturdayDinner + 2 * 60 * 60 * 1000,
        },
      ]),
    ],
    { type: "text/calendar;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "tin-cup-invitational-2026.ics";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadRoundIcs(round: CalendarRound) {
  const blob = new Blob([weekendIcs([round])], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `tin-cup-${round.day_label.toLowerCase()}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}
