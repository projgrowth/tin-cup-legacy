import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FormatCards } from "@/components/tin-cup/DayStory";
import { FormatSheet } from "@/components/tin-cup/FormatSheet";
import { CupDigest } from "@/components/tin-cup/live/ScoreBoard";
import { FridayPairings } from "@/components/tin-cup/FridayPairings";
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
  const selectedRound =
    rounds.find((round) => round.slug === details.roundSlug) ??
    rounds.find((round) => courseIdFromRound(round) === courseId) ??
    null;

  const socialOrdered = useMemo(() => {
    const dayLabel = details.dayLabel;
    const list = [...WEEKEND_SOCIAL];
    list.sort((a, b) => {
      const aToday = a.day.startsWith(dayLabel) ? 0 : 1;
      const bToday = b.day.startsWith(dayLabel) ? 0 : 1;
      return aToday - bToday;
    });
    return list;
  }, [details.dayLabel]);

  const claimedPlayer = profile?.player_id
    ? (data?.players ?? []).find((player) => player.id === profile.player_id)
    : undefined;
  const playerIdByName = (name: string) =>
    (data?.players ?? []).find((player) => player.name.trim().toLowerCase() === name.trim().toLowerCase())
      ?.id;

  return (
    <Shell variant="content">
      <div className="stack-page">
        <CupDigest matches={data?.matches ?? []} />

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
              {` · ${selectedRound?.points ?? details.points} pts`}
            </p>
          </header>

          {courseId === "south" ? (
            <FridayPairings
              getFace={(name) => avatars.data?.getByName(name)}
              claimedName={claimedPlayer?.name ?? null}
              playerIdByName={playerIdByName}
              matches={data?.matches ?? []}
              rounds={data?.rounds ?? []}
            />
          ) : (
            <div className="surface overflow-hidden">
              <div className="px-4 py-3">
                <p className="t-body font-medium text-foreground">{details.format}</p>
                <p className="t-micro mt-1">
                  {COURSE_LABEL[courseId]} · {details.firstTee}
                  {` · ${selectedRound?.points ?? details.points} pts`}
                </p>
              </div>
              {WEEKEND_SOCIAL.filter((row) => row.day.startsWith(details.dayLabel)).map((row) => (
                <div key={row.day} className="border-t border-border px-4 py-3">
                  <p className="t-body font-medium text-foreground">
                    {row.day} · {row.title}
                  </p>
                  <p className="t-micro mt-1 text-muted-foreground">{row.detail}</p>
                </div>
              ))}
              <p className="t-micro border-t border-border px-4 py-3 text-muted-foreground">
                Pairings when captains post
              </p>
            </div>
          )}

        </section>

        {isError && !data && <ErrorState onRetry={() => void refetch()} busy={isFetching} />}

        <section className="stack-tight">
          <h2 className="t-eyebrow">Formats</h2>
          <FormatCards />
        </section>

        <section className="stack-tight">
          <h2 className="t-eyebrow">Dinners</h2>
          <div className="surface divide-y divide-border overflow-hidden">
            {socialOrdered.map((row, index) => (
              <details key={row.day} open={index === 0 || undefined}>
                <summary className="press flex min-h-11 cursor-pointer list-none items-center px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="t-body min-w-0 font-medium text-foreground">
                    {row.day} · {row.title}
                  </span>
                </summary>
                <p className="t-micro px-4 pb-3 text-muted-foreground">{row.detail}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="surface divide-y divide-border overflow-hidden">
          <FormatSheet triggerClassName="flex w-full items-center px-4 py-3 t-body font-medium text-foreground" />
          <SnakePitDrawer triggerClassName="flex w-full items-center px-4 py-3 t-body font-medium text-foreground" />
          {rounds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                downloadWeekendIcs(rounds);
                void trackProductEvent("calendar_downloaded", { kind: "weekend" });
              }}
              className="press flex min-h-11 w-full items-center px-4 py-3 t-body font-medium text-foreground"
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
