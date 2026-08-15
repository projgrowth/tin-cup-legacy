import { useState } from "react";

import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useLiveWire } from "@/hooks/useLiveWire";
import type { Match, Player, SideBet, Team } from "@/hooks/useTournament";
import type { WireEvent } from "@/lib/live-wire";
import { teamRailClass } from "@/lib/team-styles";

function relativeWire(at: number): string {
  const sec = Math.round((Date.now() - at) / 1000);
  if (sec < 45) return "now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 36) return `${hr}h`;
  return `${Math.round(hr / 24)}d`;
}

function WireRow({ item }: { item: WireEvent }) {
  const rail = item.teamSlug ? teamRailClass(item.teamSlug) : "";
  return (
    <li className={`flex gap-3 px-3.5 py-2.5 ${rail}`}>
      <div className="min-w-0 flex-1">
        <p className="t-body font-medium text-foreground">{item.title}</p>
        {(item.subtitle || item.at) && (
          <p className="t-micro mt-0.5 truncate text-muted-foreground">
            {item.subtitle}
            {item.subtitle ? " · " : ""}
            {relativeWire(item.at)}
          </p>
        )}
      </div>
    </li>
  );
}

export function LiveWireTicker({
  matches,
  sideBets,
  players,
  teams,
  /** pre = calmer social-first empty; live = waiting for results */
  variant = "live",
  limit = 5,
  toastEnabled = true,
}: {
  matches: Match[];
  sideBets: SideBet[];
  players: Player[];
  teams: Team[];
  variant?: "live" | "pre";
  limit?: number;
  toastEnabled?: boolean;
}) {
  const {
    data: activity,
    isError: activityError,
    isFetching: activityFetching,
    refetch: refetchActivity,
  } = useActivityFeed(players, teams);
  const { events, recent, hot } = useLiveWire({
    matches,
    sideBets,
    activity,
    toastEnabled,
  });
  const [open, setOpen] = useState(false);

  // Seed display from activity when wire log still empty (page load)
  const seeded: WireEvent[] =
    recent.length > 0
      ? recent
      : (activity ?? []).slice(0, limit).map((a) => ({
          id: a.id,
          kind: a.kind === "photo" || a.kind === "avatar" ? ("photo" as const) : ("claim" as const),
          priority: "low" as const,
          at: Date.parse(a.at) || 0,
          title: a.title,
          subtitle: a.subtitle,
          teamSlug: a.teamSlug,
        }));

  const list = seeded.slice(0, limit);
  const full = events.length > 0 ? events : seeded;

  if (!activityError && list.length === 0 && variant === "pre") {
    return <p className="t-micro text-center text-muted-foreground">No updates yet.</p>;
  }

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="t-section text-foreground">{variant === "live" ? "Wire" : "Updates"}</h2>
          {hot && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[color:oklch(0.72_0.12_155/40%)] px-1.5 py-0.5 t-micro font-semibold text-[oklch(0.78_0.1_155)]">
              <span className="size-1.5 animate-pulse rounded-full bg-[oklch(0.72_0.12_155)]" />
              Live
            </span>
          )}
        </div>
        {full.length > limit && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="press t-micro text-muted-foreground underline-offset-2 hover:underline"
          >
            {open ? "Less" : "All"}
          </button>
        )}
      </div>

      {activityError && list.length === 0 ? (
        <div className="panel flex items-start justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="t-body font-medium text-foreground">Couldn&apos;t load updates</p>
            <p className="t-micro mt-0.5 text-muted-foreground">
              Check the connection and try again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetchActivity()}
            disabled={activityFetching}
            className="press btn-quiet t-micro shrink-0"
          >
            {activityFetching ? "Retrying…" : "Retry"}
          </button>
        </div>
      ) : list.length === 0 ? (
        variant === "pre" ? (
          <p className="t-micro text-muted-foreground">No updates yet.</p>
        ) : (
          <p className="t-micro text-muted-foreground">Waiting on the first score.</p>
        )
      ) : (
        <ul className="panel divide-y divide-border/70 overflow-hidden">
          {(open ? full.slice(0, 20) : list).map((item) => (
            <WireRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
