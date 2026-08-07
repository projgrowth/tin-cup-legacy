import { useState } from "react";
import { Radio } from "lucide-react";

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
  const { data: activity } = useActivityFeed(players, teams);
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

      {list.length === 0 ? (
        <div className="surface-inset flex items-start gap-2.5 px-3.5 py-3.5">
          <Radio className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.7} />
          <p className="t-body text-muted-foreground">
            {variant === "live"
              ? "Waiting for first result…"
              : "Field is quiet — claim your name or post the first photo."}
          </p>
        </div>
      ) : (
        <ul className="surface-inset divide-y divide-border overflow-hidden">
          {(open ? full.slice(0, 20) : list).map((item) => (
            <WireRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
