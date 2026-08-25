import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FormatSheet } from "@/components/tin-cup/FormatSheet";
import { FridayPairings } from "@/components/tin-cup/FridayPairings";
import { ErrorState, Shell } from "@/components/tin-cup/Shell";
import { useProfile } from "@/hooks/useJournal";
import { useTournament } from "@/hooks/useTournament";
import { roundStatus } from "@/lib/scoring";
import { downloadWeekendIcs } from "@/lib/calendar";
import { trackProductEvent } from "@/lib/product-analytics";

import {
  COURSE_DETAILS,
  COURSE_LABEL,
  COURSE_ORDER,
  courseIdFromRound,
  defaultCourseId,
  type CourseId,
} from "@/lib/courses";
import { SNAKE_PIT, TROPHIES } from "@/lib/tin-cup";

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

type ScheduleSearch = { course?: CourseId };

export const Route = createFileRoute("/schedule")({
  validateSearch: (raw: Record<string, unknown>): ScheduleSearch => {
    const course = String(raw.course ?? "");
    return COURSE_ORDER.includes(course as CourseId) ? { course: course as CourseId } : {};
  },
  head: () => ({
    meta: [
      { title: "Weekend Guide — Tin Cup Invitational 2026" },
      {
        name: "description",
        content:
          "South, Copperhead and Island. Tee windows, formats, point allocations and dinner plans for the 2026 Tin Cup Invitational.",
      },
      { property: "og:title", content: "Schedule & Formats — Tin Cup Invitational 2026" },
      {
        property: "og:description",
        content: "Three days, three courses, 26 points. August 28-30, 2026 at Innisbrook.",
      },
    ],
  }),
  component: SchedulePage,
});

function afterGolf(dayLabel: string) {
  if (dayLabel === "Friday") return "Pool if the weather holds, then Salamander.";
  return null;
}

function dayBeat(courseId: CourseId) {
  if (courseId === "copperhead") return "Breakfast · Steakhouse 7:00";
  if (courseId === "island") return "Breakfast · lunch and awards";
  return null;
}

function SchedulePage() {
  const search = Route.useSearch();
  const { data, isError, refetch, isFetching } = useTournament();
  const { profile } = useProfile();
  const now = useNow();
  const todayCourse = defaultCourseId(now ?? undefined);

  const rounds = useMemo(() => {
    const list = [...(data?.rounds ?? [])];
    const statusOrder: Record<string, number> = { live: 0, upcoming: 1, complete: 2 };
    list.sort((a, b) => {
      const sa = statusOrder[roundStatus(a, now ?? undefined)] ?? 99;
      const sb = statusOrder[roundStatus(b, now ?? undefined)] ?? 99;
      if (sa !== sb) return sa - sb;
      return new Date(a.play_date).getTime() - new Date(b.play_date).getTime();
    });
    return list;
  }, [data?.rounds, now]);

  const todayRound = useMemo(() => {
    if (!now) return rounds[0] ?? null;
    const live = rounds.find((r) => roundStatus(r, now) === "live");
    if (live) return live;
    const upcoming = rounds.find((r) => roundStatus(r, now) === "upcoming");
    return upcoming ?? rounds[0] ?? null;
  }, [rounds, now]);

  const autoCourseId: CourseId = todayRound
    ? (courseIdFromRound(todayRound) ?? todayCourse)
    : todayCourse;
  const courseId: CourseId = search.course ?? autoCourseId;
  const details = COURSE_DETAILS[courseId];
  const claimedPlayer = profile?.player_id
    ? (data?.players ?? []).find((player) => player.id === profile.player_id)
    : undefined;
  const playerIdByName = (name: string) =>
    (data?.players ?? []).find(
      (player) => player.name.trim().toLowerCase() === name.trim().toLowerCase(),
    )?.id;

  return (
    <Shell variant="content">
      <div className="stack-page pb-4">
        <section className="stack-tight">
          <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Day">
            {COURSE_ORDER.map((id) => {
              const on = id === courseId;
              return (
                <Link
                  key={id}
                  role="tab"
                  aria-selected={on}
                  to="/schedule"
                  search={{ course: id }}
                  replace
                  className={`press chip min-h-11 w-full ${on ? "chip-on" : ""}`}
                >
                  {COURSE_DETAILS[id].dayLabel}
                </Link>
              );
            })}
          </div>

          <header>
            <div className="flex min-h-11 items-center justify-between gap-3">
              <h1 className="t-display text-foreground">{COURSE_LABEL[courseId]}</h1>
              <button
                type="button"
                disabled={rounds.length === 0}
                onClick={() => {
                  if (rounds.length === 0) return;
                  downloadWeekendIcs(rounds);
                  void trackProductEvent("calendar_downloaded", { kind: "weekend" });
                }}
                className="press t-micro min-h-11 shrink-0 disabled:opacity-40"
              >
                Calendar
              </button>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-1.5">
              <span className="t-micro">{details.firstTee}</span>
              <span className="t-micro" aria-hidden="true">
                ·
              </span>
              <FormatSheet
                ariaLabel={`${details.format}. How formats work`}
                triggerClassName="t-micro inline-flex items-center text-foreground"
              >
                {details.format}
              </FormatSheet>
              <span className="t-micro" aria-hidden="true">
                ·
              </span>
              <span className="t-micro">{details.points} pts</span>
            </p>
            <p className="t-body mt-3 text-muted-foreground">{details.formatTip}</p>
          </header>

          {dayBeat(courseId) ? <p className="t-body">{dayBeat(courseId)}</p> : null}

          {courseId === "south" ? (
            <FridayPairings
              claimedName={claimedPlayer?.name ?? null}
              playerIdByName={playerIdByName}
            />
          ) : (
            <p className="t-micro">
              {courseId === "copperhead"
                ? "Pairings posted Friday night."
                : "Pairings posted Saturday night."}
            </p>
          )}

          {courseId === "copperhead" ? (
            <ul className="surface divide-y divide-border overflow-hidden">
              <li className="px-4 py-2.5">
                <p className="t-eyebrow">Snake Pit</p>
              </li>
              {SNAKE_PIT.map((hole) => (
                <li key={hole.hole} className="flex gap-3 px-4 py-2.5">
                  <span className="t-micro w-4 shrink-0 tabular-nums">{hole.hole}</span>
                  <span className="t-body text-foreground">{hole.name}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {courseId === "island" ? (
            <ul className="surface divide-y divide-border overflow-hidden">
              <li className="px-4 py-2.5">
                <p className="t-eyebrow">Awards</p>
              </li>
              {TROPHIES.map((row) => (
                <li key={row.name} className="px-4 py-2.5">
                  <p className="t-body text-foreground">{row.name}</p>
                </li>
              ))}
            </ul>
          ) : null}

          {afterGolf(details.dayLabel) ? (
            <p className="t-body font-medium text-foreground">{afterGolf(details.dayLabel)}</p>
          ) : null}
        </section>

        {isError && !data && <ErrorState onRetry={() => void refetch()} busy={isFetching} />}
      </div>
    </Shell>
  );
}
