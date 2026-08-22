import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FormatSheet } from "@/components/tin-cup/FormatSheet";
import { PageMasthead } from "@/components/tin-cup/PageMasthead";
import { PairingRow } from "@/components/tin-cup/PairingRow";
import { ErrorState, Shell } from "@/components/tin-cup/Shell";
import { SnakePitDrawer } from "@/components/tin-cup/SnakePitDrawer";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { useTournament } from "@/hooks/useTournament";
import { roundStart, roundStatus, roundTally } from "@/lib/scoring";
import { downloadRoundIcs, downloadWeekendIcs } from "@/lib/calendar";
import { trackProductEvent } from "@/lib/product-analytics";
import { formatCountdown } from "@/lib/countdown";
import { DAY1_PAIRINGS } from "@/lib/day1-pairings";
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
  if (c.includes("island")) return "border-l-2 border-l-[color:var(--border-strong)]";
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
  live: "border-[color:var(--status-live)] text-[var(--status-live)]",
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

  const otherRounds = rounds.filter((round) => round.id !== todayRound?.id);
  const pairingsInToday = showDay1Pairings && todayCourseId === "south";

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
                {todayRound ? ` · ${todayRound.points} pts` : " · 8 pts"}
              </>
            }
          />

          {pairingsInToday && (
            <ul className="mt-3 divide-y divide-border">
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

        {otherRounds.length > 0 && (
          <section className="stack-tight lg:grid lg:grid-cols-2 lg:gap-3">
            <h2 className="t-section text-foreground lg:col-span-2">Also this weekend</h2>
            {otherRounds.map((round) => {
              const status = roundStatus(round, now ?? undefined);
              const start = roundStart(round);
              const tally = roundTally(data?.matches ?? [], round.id);
              const decided = tally.strongMental + tally.grassRoots > 0;
              const countdown =
                start && now && status !== "complete" ? formatCountdown(start - now) : null;
              const courseId = courseIdFromRound(round);

              return (
                <article
                  key={round.id}
                  className={`overflow-hidden surface-inset ${courseRail(round.course)}`}
                >
                  <div className="flex items-start justify-between gap-3 px-3.5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="t-title text-foreground">{round.day_label}</h3>
                        <span
                          className={`rounded-full border px-2 py-0.5 t-micro font-semibold ${STATUS_PILL[status]}`}
                        >
                          {status === "live"
                            ? "Live"
                            : status === "complete"
                              ? "Final"
                              : "Upcoming"}
                        </span>
                      </div>
                      <p className="t-micro mt-1 text-muted-foreground">
                        {round.course} · {round.tee_window} · {round.format}
                        {countdown ? ` · ${countdown}` : ""}
                      </p>
                      {decided && (
                        <p className="t-numeral mt-2 text-foreground">
                          {tally.strongMental}–{tally.grassRoots}
                        </p>
                      )}
                      {courseId && (
                        <Link
                          to="/scout"
                          search={{ course: courseId, card: true }}
                          className="press t-micro mt-1 inline-flex min-h-11 items-center font-semibold text-foreground underline-offset-2 hover:underline"
                        >
                          {COURSE_LABEL[courseId]} planner →
                        </Link>
                      )}
                    </div>
                    <span className="t-numeral shrink-0 text-[1.25rem] text-foreground">
                      {round.points}
                    </span>
                  </div>
                  {round.slug !== "friday" && !decided && (
                    <p className="t-micro border-t border-border px-4 py-2.5 text-muted-foreground">
                      Pairings when captains post
                    </p>
                  )}
                </article>
              );
            })}
          </section>
        )}

        <section className="stack-tight">
          <h2 className="t-section text-foreground">Dinners</h2>
          <ul className="divide-y divide-border">
            {socialOrdered.map((row) => (
              <li key={row.day} className="px-1 py-3">
                <p className="t-body font-medium text-foreground">
                  {row.day} · {row.title}
                </p>
                <p className="t-micro mt-1 text-muted-foreground">{row.detail}</p>
              </li>
            ))}
          </ul>
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
