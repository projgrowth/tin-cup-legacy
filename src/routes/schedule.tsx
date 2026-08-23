import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FormatSheet } from "@/components/tin-cup/FormatSheet";
import { FridayPairings, FRIDAY_HOW } from "@/components/tin-cup/FridayPairings";
import { ErrorState, Shell } from "@/components/tin-cup/Shell";
import { SnakePitDrawer } from "@/components/tin-cup/SnakePitDrawer";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
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
  const { profile } = useProfile();
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

  const autoCourseId = todayRound ? (courseIdFromRound(todayRound) ?? todayCourse) : todayCourse;
  const courseId = search.course ?? autoCourseId;
  const details = COURSE_DETAILS[courseId];
  const claimedPlayer = profile?.player_id
    ? (data?.players ?? []).find((player) => player.id === profile.player_id)
    : undefined;
  const playerIdByName = (name: string) =>
    (data?.players ?? []).find((player) => player.name.trim().toLowerCase() === name.trim().toLowerCase())
      ?.id;

  return (
    <Shell variant="content">
      <div className="stack-page">
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

          <header className="px-0.5">
            <h1 className="t-title text-foreground">{details.format}</h1>
            <p className="t-micro mt-1">
              {details.dayLabel} · {COURSE_LABEL[courseId]} · {details.firstTee}
            </p>
          </header>

          {courseId === "south" ? (
            <p className="t-micro">{FRIDAY_HOW}</p>
          ) : null}

          {courseId === "south" ? (
            <FridayPairings
              hideIntro
              getFace={(name) => avatars.data?.getByName(name)}
              claimedName={claimedPlayer?.name ?? null}
              playerIdByName={playerIdByName}
              matches={data?.matches ?? []}
              rounds={data?.rounds ?? []}
            />
          ) : (
            <p className="t-micro">Pairings when captains post</p>
          )}

          {WEEKEND_SOCIAL.filter((row) => row.day.startsWith(details.dayLabel)).slice(0, 1).map((row) => (
            <p key={row.day} className="t-body text-foreground">
              Tonight · {row.title}
            </p>
          ))}

        </section>

        {isError && !data && <ErrorState onRetry={() => void refetch()} busy={isFetching} />}

        <details className="group">
          <summary className="press t-micro cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            How formats · Snake Pit · Calendar
          </summary>
          <div className="mt-[var(--space-3)] stack-tight">
            <FormatSheet triggerClassName="t-micro" />
            <SnakePitDrawer triggerClassName="t-micro" />
            {rounds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  downloadWeekendIcs(rounds);
                  void trackProductEvent("calendar_downloaded", { kind: "weekend" });
                }}
                className="press t-micro min-h-11 text-left"
              >
                Add weekend to calendar
              </button>
            )}
          </div>
        </details>
        <p className="t-micro px-1 text-muted-foreground">
          Playoff · If 13–13: captains each pick a scramble partner · one hole until decided.
        </p>
      </div>
    </Shell>
  );
}
