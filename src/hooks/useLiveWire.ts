import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { ActivityItem } from "@/hooks/useActivityFeed";
import type { Match, SideBet } from "@/hooks/useTournament";
import {
  coalesceWireToast,
  diffWireEvents,
  sortWireEvents,
  type SocialSnap,
  type WireEvent,
  type WireSnapshot,
} from "@/lib/live-wire";

const LOG_CAP = 40;
const SEEN_KEY = "tin-cup-wire-seen-v1";
const TOAST_DEBOUNCE_MS = 1800;

function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr.slice(-80) : []);
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-80)));
  } catch {
    /* ignore */
  }
}

function toSnapshot(
  matches: Match[],
  sideBets: SideBet[],
  activity: ActivityItem[] | undefined,
): WireSnapshot {
  const social: SocialSnap[] | undefined = activity?.map((a) => ({
    id: a.id,
    kind: a.kind === "photo" || a.kind === "avatar" ? "photo" : "claim",
    title: a.title,
    subtitle: a.subtitle,
    at: a.at,
    teamSlug: a.teamSlug,
  }));
  return {
    matches: matches.map((m) => ({
      id: m.id,
      label: m.label,
      points: m.points,
      result: m.result,
      side_a: m.side_a,
      side_b: m.side_b,
      round_id: m.round_id,
      updated_at: m.updated_at,
      revision: m.revision,
    })),
    sideBets: sideBets.map((b) => ({
      id: b.id,
      kind: b.kind,
      label: b.label,
      amount: b.amount,
      player_name: b.player_name,
      team_slug: b.team_slug,
      hole: b.hole,
      updated_at: b.updated_at,
    })),
    social,
  };
}

export function useLiveWire({
  matches,
  sideBets,
  activity,
  enabled = true,
  toastEnabled = true,
}: {
  matches: Match[];
  sideBets: SideBet[];
  activity?: ActivityItem[];
  enabled?: boolean;
  /** Soft in-app toasts for high-priority events */
  toastEnabled?: boolean;
}) {
  const [events, setEvents] = useState<WireEvent[]>([]);
  const prevRef = useRef<WireSnapshot | null>(null);
  const seenRef = useRef<Set<string>>(loadSeen());
  const toastQueue = useRef<WireEvent[]>([]);
  const toastTimer = useRef<number | null>(null);
  const primed = useRef(false);
  const toastEnabledRef = useRef(toastEnabled);
  toastEnabledRef.current = toastEnabled;

  const signature = useMemo(() => {
    const m = matches
      .map((x) => `${x.id}:${x.result}:${x.revision}:${x.side_a}:${x.side_b}`)
      .join("|");
    const b = sideBets
      .map((x) => `${x.id}:${x.player_name}:${x.revision}`)
      .join("|");
    const s = (activity ?? []).map((a) => a.id).join("|");
    return `${m}#${b}#${s}`;
  }, [matches, sideBets, activity]);

  useEffect(() => {
    if (!enabled) return;
    const next = toSnapshot(matches, sideBets, activity);
    const prev = prevRef.current;

    if (!primed.current) {
      primed.current = true;
      prevRef.current = next;
      return;
    }

    const fresh = diffWireEvents(prev, next).filter((e) => !seenRef.current.has(e.id));
    prevRef.current = next;
    if (fresh.length === 0) return;

    for (const e of fresh) seenRef.current.add(e.id);
    saveSeen(seenRef.current);

    setEvents((log) => sortWireEvents([...fresh, ...log]).slice(0, LOG_CAP));

    if (!toastEnabledRef.current) return;

    toastQueue.current.push(...fresh.filter((e) => e.priority === "high"));
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      toastTimer.current = null;
      const batch = toastQueue.current;
      toastQueue.current = [];
      const msg = coalesceWireToast(batch);
      if (!msg) return;
      toast.message(msg.title, {
        description: msg.subtitle,
        duration: 4500,
      });
    }, TOAST_DEBOUNCE_MS);
    // signature drives recompute; lists closed over intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, enabled]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const recent = useMemo(() => events.slice(0, 8), [events]);
  const hot = recent.some((e) => Date.now() - e.at < 120_000 && e.priority === "high");

  return { events, recent, hot };
}
