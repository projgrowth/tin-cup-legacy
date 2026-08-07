import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, ChevronDown } from "lucide-react";

import { ErrorState, LoadingRows, PageHeading, Shell } from "@/components/tin-cup/Shell";
import { SnakePitDrawer } from "@/components/tin-cup/SnakePitDrawer";
import { useTournament } from "@/hooks/useTournament";
import { roundStart, roundStatus, roundTally } from "@/lib/scoring";
import { downloadWeekendIcs } from "@/lib/calendar";
import { formatCountdown } from "@/lib/countdown";
import { DAY1_META, DAY1_PAIRINGS } from "@/lib/day1-pairings";
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
  if (c.includes("island")) return "border-l-2 border-l-gold/50";
  return "border-l-2 border-l-muted-foreground/40";
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
  const now = useNow();
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

  return (
    <Shell>
      <PageHeading eyebrow="Aug 28–30" title="Weekend" />
      <div className="stack-page pb-4">
        {rounds.length > 0 && (
          <button
            type="button"
            onClick={() => downloadWeekendIcs(rounds)}
            className="press t-micro inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-3.5 text-muted-foreground"
          >
            <CalendarPlus className="size-3.5" /> Add to calendar
          </button>
        )}

        {/* Day 1 pairings — lean */}
        <section>
          <div className="mb-3">
            <h2 className="t-section text-foreground">Day 1 pairings</h2>
            <p className="t-micro mt-1 text-muted-foreground">
              {DAY1_META.day} · {DAY1_META.course} · {DAY1_META.tee}
            </p>
          </div>
          <ul className="surface-inset divide-y divide-border overflow-hidden">
            {DAY1_PAIRINGS.map((p) => (
              <li key={p.matchIndex} className="flex items-center gap-2 px-3.5 py-3.5">
                <span className="t-micro w-4 shrink-0 text-muted-foreground">{p.matchIndex}</span>
                <span className="t-body min-w-0 flex-1 truncate font-medium text-foreground">
                  {p.sideA}
                </span>
                <span className="t-micro shrink-0 text-muted-foreground">vs</span>
                <span className="t-body min-w-0 flex-1 truncate text-right font-medium text-foreground">
                  {p.sideB}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {isPending && !data && <LoadingRows rows={3} height={88} />}
        {isError && !data && <ErrorState onRetry={() => void refetch()} busy={isFetching} />}

        {/* Golf days */}
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
            const raised = status === "live";

            return (
              <article
                key={round.id}
                className={`overflow-hidden ${raised ? "surface-raised" : "surface-inset"} ${courseRail(round.course)}`}
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
                  </div>
                  <span className="t-numeral shrink-0 text-2xl text-foreground">{round.points}</span>
                </div>
                {hasDetail && (
                  <details className="border-t border-border">
                    <summary className="press flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 t-micro text-muted-foreground [&::-webkit-details-marker]:hidden">
                      Details
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
              </article>
            );
          })}
        </section>

        <section>
          <h2 className="t-section mb-3 text-foreground">Social</h2>
          <ul className="surface-inset divide-y divide-border overflow-hidden">
            {WEEKEND_SOCIAL.map((row) => (
              <li key={row.day} className="px-4 py-3.5">
                <p className="t-body font-medium text-foreground">
                  {row.day} · {row.title}
                </p>
                <p className="t-micro mt-0.5 text-muted-foreground">{row.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <details className="t-micro text-muted-foreground">
          <summary className="cursor-pointer">Playoff rule</summary>
          <p className="mt-1.5">
            If 13–13: captains each pick a scramble partner · one hole until decided.
          </p>
        </details>
        <SnakePitDrawer />
        <Link to="/" className="press t-body block text-center text-muted-foreground">
          ← Live board
        </Link>
      </div>
    </Shell>
  );
}
