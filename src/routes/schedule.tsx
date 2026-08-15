import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, ChevronDown, Map } from "lucide-react";

import { FormatSheet } from "@/components/tin-cup/FormatSheet";
import { PairingRow } from "@/components/tin-cup/PairingRow";
import { ErrorState, LoadingRows, PageHeading, Shell } from "@/components/tin-cup/Shell";
import { SnakePitDrawer } from "@/components/tin-cup/SnakePitDrawer";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { useTournament } from "@/hooks/useTournament";
import { roundStart, roundStatus, roundTally } from "@/lib/scoring";
import { downloadWeekendIcs } from "@/lib/calendar";
import { formatCountdown } from "@/lib/countdown";
import { DAY1_META, DAY1_PAIRINGS } from "@/lib/day1-pairings";
import {
  COURSE_DETAILS,
  COURSE_LABEL,
  defaultCourseId,
  ROUND_COURSE,
  type CourseId,
} from "@/lib/courses";
import { WEEKEND_SOCIAL } from "@/lib/tin-cup";

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

function courseRail(course: string): string {
  const c = course.toLowerCase();
  if (c.includes("copperhead")) return "border-l-2 border-l-copper/60";
  if (c.includes("island")) return "border-l-2 border-l-[oklch(0.55_0.08_230)]";
  return "border-l-2 border-l-muted-foreground/40";
}

function courseIdFromRound(round: { slug: string; course: string }): CourseId | null {
  if (ROUND_COURSE[round.slug]) return ROUND_COURSE[round.slug];
  const c = round.course.toLowerCase();
  if (c.includes("copperhead")) return "copperhead";
  if (c.includes("island")) return "island";
  if (c.includes("south")) return "south";
  return null;
}

export const Route = createFileRoute("/schedule")({
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

const STATUS_PILL: Record<string, string> = {
  live: "border-[color:oklch(0.72_0.12_155/45%)] text-[oklch(0.78_0.1_155)]",
  complete: "border-border text-muted-foreground",
  upcoming: "border-border text-muted-foreground",
};

function SchedulePage() {
  const { data, isPending, isError, refetch, isFetching } = useTournament();
  const avatars = usePlayerAvatars(data?.players ?? [], data?.teams ?? []);
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

  const todayCourseId = todayRound ? (courseIdFromRound(todayRound) ?? todayCourse) : todayCourse;
  const todayDetails = COURSE_DETAILS[todayCourseId];
  const showDay1Pairings =
    todayCourseId === "south" ||
    !now ||
    (todayRound ? roundStatus(todayRound, now) !== "complete" : true);

  // Social: panel today's dinner first
  const socialOrdered = useMemo(() => {
    const dayLabel = todayDetails.dayLabel; // Friday / Saturday / Sunday
    const list = [...WEEKEND_SOCIAL];
    list.sort((a, b) => {
      const aToday = a.day.startsWith(dayLabel) ? 0 : 1;
      const bToday = b.day.startsWith(dayLabel) ? 0 : 1;
      return aToday - bToday;
    });
    return list;
  }, [todayDetails.dayLabel]);

  return (
    <Shell>
      <PageHeading eyebrow="Aug 28–30" title="Weekend" />
      <div className="stack-page pb-4">
        {/* Today-first command card */}
        <section className="panel overflow-hidden">
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="t-eyebrow">Today · focus</p>
              <h2 className="t-title mt-1.5 text-foreground">
                {todayDetails.dayLabel} · {COURSE_LABEL[todayCourseId]}
              </h2>
              <p className="t-micro mt-1 text-muted-foreground">
                First tee {todayDetails.firstTee} · {todayDetails.format}
              </p>
            </div>
            {todayRound && (
              <span className="t-numeral shrink-0 text-2xl text-foreground">
                {todayRound.points}
                <span className="t-micro ml-1 font-normal text-muted-foreground">pts</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
            <Link
              to="/scout"
              search={{ course: todayCourseId }}
              className="press btn-gold t-body inline-flex min-h-11 items-center gap-2 px-4"
            >
              <Map className="size-4" />
              Open planner
            </Link>
            <Link to="/" className="press btn-quiet t-body inline-flex min-h-11 items-center px-4">
              Live board
            </Link>
          </div>
        </section>

        {rounds.length > 0 && (
          <button
            type="button"
            onClick={() => downloadWeekendIcs(rounds)}
            className="press chip inline-flex min-h-11 items-center gap-2"
          >
            <CalendarPlus className="size-3.5" /> Add to calendar
          </button>
        )}

        {/* Day 1 pairings — show while still relevant */}
        {showDay1Pairings && (
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <div>
                <h2 className="t-section text-foreground">Day 1 pairings</h2>
                <p className="t-micro mt-1 text-muted-foreground">
                  {DAY1_META.day} · {DAY1_META.course} · {DAY1_META.tee}
                </p>
              </div>
              <Link
                to="/scout"
                search={{ course: "south" }}
                className="t-micro shrink-0 text-muted-foreground"
              >
                South plan →
              </Link>
            </div>
            <ul className="surface-inset divide-y divide-border overflow-hidden">
              {DAY1_PAIRINGS.map((p) => (
                <PairingRow
                  key={p.matchIndex}
                  index={p.matchIndex}
                  sideALabel={p.sideA}
                  sideBLabel={p.sideB}
                  sideAPeople={p.playersA.map((name) => ({
                    name,
                    teamSlug: "strong-mental",
                    src: avatars.data?.getByName(name)?.url,
                  }))}
                  sideBPeople={p.playersB.map((name) => ({
                    name,
                    teamSlug: "grass-roots",
                    src: avatars.data?.getByName(name)?.url,
                  }))}
                />
              ))}
            </ul>
            <div className="mt-3">
              <FormatSheet />
            </div>
          </section>
        )}

        {isPending && !data && <LoadingRows rows={3} height={88} />}
        {isError && !data && <ErrorState onRetry={() => void refetch()} busy={isFetching} />}

        {/* Golf days — today/live first via sort */}
        <section className="stack-tight">
          <h2 className="t-section text-foreground">Golf · 26 pts</h2>
          {rounds.map((round) => {
            const status = roundStatus(round, now ?? undefined);
            const start = roundStart(round);
            const tally = roundTally(data?.matches ?? [], round.id);
            const decided = tally.strongMental + tally.grassRoots > 0;
            const countdown =
              start && now && status !== "complete" ? formatCountdown(start - now) : null;
            const hasDetail = Boolean(round.format_detail || round.meal);
            const raised = status === "live" || round.id === todayRound?.id;
            const courseId = courseIdFromRound(round);

            return (
              <article
                key={round.id}
                className={`overflow-hidden ${raised ? "panel" : "surface-inset"} ${courseRail(round.course)}`}
              >
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="t-title text-foreground">{round.day_label}</h3>
                      <span
                        className={`rounded-full border px-2 py-0.5 t-micro font-semibold ${STATUS_PILL[status]}`}
                      >
                        {status === "live" ? "Live" : status === "complete" ? "Final" : "Upcoming"}
                      </span>
                    </div>
                    <p className="t-body mt-1.5 font-medium text-foreground">{round.course}</p>
                    <p className="t-micro mt-0.5 text-muted-foreground">
                      {round.tee_window} · {round.format}
                      {countdown ? ` · ${countdown}` : ""}
                    </p>
                    {decided && (
                      <p className="t-numeral mt-2 text-foreground">
                        {tally.strongMental}–{tally.grassRoots}
                      </p>
                    )}
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                      {courseId && (
                        <Link
                          to="/scout"
                          search={{ course: courseId }}
                          className="press t-micro font-semibold text-foreground underline-offset-2 hover:underline"
                        >
                          {COURSE_LABEL[courseId]} planner →
                        </Link>
                      )}
                      {status === "live" && (
                        <Link
                          to="/"
                          className="press t-micro font-semibold text-foreground underline-offset-2 hover:underline"
                        >
                          Open live board →
                        </Link>
                      )}
                    </div>
                  </div>
                  <span className="t-numeral shrink-0 text-2xl text-foreground">
                    {round.points}
                  </span>
                </div>
                {hasDetail && (
                  <details className="border-t border-border" open={raised}>
                    <summary className="press flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 t-micro text-muted-foreground [&::-webkit-details-marker]:hidden">
                      {raised ? "Format & dinner" : "More"}
                      <ChevronDown className="size-3.5 opacity-60" />
                    </summary>
                    <div className="space-y-1.5 px-4 pb-3.5">
                      {round.format_detail && (
                        <p className="t-micro text-muted-foreground">{round.format_detail}</p>
                      )}
                      {round.meal && (
                        <p className="t-micro text-muted-foreground">After · {round.meal}</p>
                      )}
                    </div>
                  </details>
                )}
                {round.slug !== "friday" && !decided && (
                  <p className="t-micro border-t border-border px-4 py-2.5 text-muted-foreground">
                    Pairings when captains post
                  </p>
                )}
              </article>
            );
          })}
        </section>

        <section>
          <h2 className="t-section mb-3 text-foreground">Social</h2>
          <ul className="surface-inset divide-y divide-border overflow-hidden">
            {socialOrdered.map((row) => {
              const isToday = row.day.startsWith(todayDetails.dayLabel);
              return (
                <li key={row.day}>
                  <details className="group" open={isToday}>
                    <summary className="press flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                      <span className="t-body font-medium text-foreground">
                        {row.day} · {row.title}
                        {isToday ? (
                          <span className="ml-2 t-micro font-semibold text-gold-light">Today</span>
                        ) : null}
                      </span>
                      <span className="t-micro text-muted-foreground group-open:hidden">More</span>
                    </summary>
                    <p className="t-micro border-t border-border px-4 py-3 text-muted-foreground">
                      {row.detail}
                    </p>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>

        <details className="t-micro text-muted-foreground">
          <summary className="cursor-pointer">Playoff rule</summary>
          <p className="mt-1.5">
            If 13–13: captains each pick a scramble partner · one hole until decided.
          </p>
        </details>
        <SnakePitDrawer />
      </div>
    </Shell>
  );
}
