import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FormatSheet } from "@/components/tin-cup/FormatSheet";
import { PageMasthead } from "@/components/tin-cup/PageMasthead";
import { FridayPairings } from "@/components/tin-cup/FridayPairings";
import { CourseDayStory, DayStory } from "@/components/tin-cup/DayStory";
import { ErrorState, Shell } from "@/components/tin-cup/Shell";
import { SnakePitDrawer } from "@/components/tin-cup/SnakePitDrawer";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { useTournament } from "@/hooks/useTournament";
import { roundStart, roundStatus, roundTally } from "@/lib/scoring";
import { downloadRoundIcs, downloadWeekendIcs } from "@/lib/calendar";
import { trackProductEvent } from "@/lib/product-analytics";
import { formatCountdownShort } from "@/lib/countdown";

import {
  COURSE_DETAILS,
  COURSE_LABEL,
  COURSE_ORDER,
  courseIdFromRound,
  defaultCourseId,
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

function SchedulePage() {
  const { data, isError, refetch, isFetching } = useTournament();
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

  const otherCourseIds = COURSE_ORDER.filter((id) => id !== todayCourseId);
  const pairingsInToday = showDay1Pairings && todayCourseId === "south";

  function roundForCourse(courseId: CourseId) {
    const slug = COURSE_DETAILS[courseId].roundSlug;
    return (
      rounds.find((round) => round.slug === slug) ??
      rounds.find((round) => courseIdFromRound(round) === courseId) ??
      null
    );
  }

  return (
    <Shell variant="content">
      <div className="stack-page pb-4">
        <section>
          <PageMasthead
            title={
              <>
                {todayDetails.dayLabel} · {COURSE_LABEL[todayCourseId]}
              </>
            }
            meta={
              <>
                {todayDetails.firstTee} · {todayDetails.format}
                {` · ${todayRound?.points ?? todayDetails.points} pts`}
              </>
            }
          />

          {pairingsInToday && (
            <div className="mt-3">
              <FridayPairings getFace={(name) => avatars.data?.getByName(name)} />
            </div>
          )}

          {todayRound && todayRound.slug !== "friday" && (
            <p className="t-micro border-t border-border px-1 py-2.5 text-muted-foreground">
              Pairings when captains post
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 px-1 pt-1">
            <Link
              to="/scout"
              search={{ course: todayCourseId, card: true }}
              className="press t-micro inline-flex min-h-11 items-center font-semibold text-foreground"
            >
              {COURSE_LABEL[todayCourseId]} planner
            </Link>
            {todayRound && roundStart(todayRound) && (
              <button
                type="button"
                onClick={() => {
                  downloadRoundIcs(todayRound);
                  void trackProductEvent("calendar_downloaded", { kind: "round" });
                }}
                className="press t-micro inline-flex min-h-11 items-center text-muted-foreground"
              >
                Add this round
              </button>
            )}
          </div>
        </section>

        {isError && !data && <ErrorState onRetry={() => void refetch()} busy={isFetching} />}

        <section className="stack-tight">
          <h2 className="t-micro font-semibold text-foreground">Also this weekend</h2>
          {otherCourseIds.map((courseId) => {
            const round = roundForCourse(courseId);
            const status = round ? roundStatus(round, now ?? undefined) : "upcoming";
            const start = round ? roundStart(round) : null;
            const tally = round ? roundTally(data?.matches ?? [], round.id) : null;
            const decided = Boolean(tally && tally.strongMental + tally.grassRoots > 0);
            const countdown =
              start && now && status === "upcoming" ? formatCountdownShort(start - now) : null;
            const phase =
              status === "live" ? "Live" : status === "complete" ? "Final" : null;
            return (
              <CourseDayStory
                key={courseId}
                courseId={courseId}
                extraMeta={[phase, countdown, decided && tally ? `${tally.strongMental}–${tally.grassRoots}` : null]
                  .filter(Boolean)
                  .join(" · ") || null}
                action={
                  <>
                    {courseId !== "south" && !decided ? (
                      <p className="t-micro mt-2 text-muted-foreground">
                        Pairings when captains post
                      </p>
                    ) : null}
                    <Link
                      to="/scout"
                      search={{ course: courseId, card: true }}
                      className="press t-micro mt-1 inline-flex min-h-11 items-center font-semibold text-foreground"
                    >
                      {COURSE_LABEL[courseId]} planner
                    </Link>
                  </>
                }
              />
            );
          })}
        </section>

        <section className="stack-tight">
          <h2 className="t-micro font-semibold text-foreground">Dinners</h2>
          {socialOrdered.map((row) => (
            <DayStory key={row.day} kicker={row.day} title={row.title} body={row.detail} />
          ))}
        </section>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
          <FormatSheet />
          <SnakePitDrawer />
          {rounds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                downloadWeekendIcs(rounds);
                void trackProductEvent("calendar_downloaded", { kind: "weekend" });
              }}
              className="press t-micro inline-flex min-h-11 items-center text-muted-foreground"
            >
              Add weekend to calendar
            </button>
          )}
        </div>
        <p className="t-micro px-1 text-muted-foreground">
          Playoff · If 13–13: captains each pick a scramble partner · one hole until decided.
        </p>
      </div>
    </Shell>
  );
}
