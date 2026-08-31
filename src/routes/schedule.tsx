import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FormatSheet } from "@/components/tin-cup/FormatSheet";
import { ErrorState, Shell } from "@/components/tin-cup/Shell";
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
import { SNAKE_PIT, TROPHIES, WEEKEND_SOCIAL } from "@/lib/tin-cup";

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

function SchedulePage() {
  const search = Route.useSearch();
  const { data, isError, refetch, isFetching } = useTournament();
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
  const social = WEEKEND_SOCIAL.find((row) => row.day === details.dayLabel);

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

          {social ? (
            <article className="surface overflow-hidden">
              <header className="card-row py-4">
                <p className="t-eyebrow">Where to be</p>
                <h2 className="t-title mt-1.5 text-foreground">{social.title}</h2>
              </header>
              <ol>
                {social.beats.map((beat) => (
                  <li
                    key={beat.when}
                    className="card-row flex gap-4 border-t border-border py-3.5"
                  >
                    <span className="t-micro w-[5.5rem] shrink-0 pt-0.5">{beat.when}</span>
                    <span className="t-body font-semibold text-foreground">{beat.what}</span>
                  </li>
                ))}
              </ol>
            </article>
          ) : null}

          {courseId !== "south" ? (
            <p className="t-micro">Pairings are on the Home board.</p>
          ) : null}

          {courseId === "copperhead" ? (
            <section className="surface overflow-hidden">
              <p className="section-cap t-eyebrow">Snake Pit</p>
              <ul className="grid grid-cols-3 divide-x divide-border">
                {SNAKE_PIT.map((hole) => (
                  <li key={hole.hole} className="px-3 py-4 text-center">
                    <p className="t-numeral text-[1.35rem] text-foreground">{hole.hole}</p>
                    <p className="t-micro mt-1.5 text-foreground">{hole.name}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {courseId === "island" ? (
            <section className="surface overflow-hidden">
              <p className="section-cap t-eyebrow">Awards</p>
              <ul>
                {TROPHIES.map((row, index) => (
                  <li
                    key={row.name}
                    className={`card-row py-3.5 ${index === 0 ? "" : "border-t border-border"}`}
                  >
                    <p className="t-body font-semibold text-foreground">{row.name}</p>
                    <p className="t-micro mt-1">{row.detail}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

        </section>

        {isError && !data && <ErrorState onRetry={() => void refetch()} busy={isFetching} />}
      </div>
    </Shell>
  );
}
