import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Tables } from "@/integrations/supabase/types";
import { graphqlRequest, subscribeGraphql } from "@/integrations/supabase/graphql";
import { applyDay1ContestHoles } from "@/lib/contest-holes";
import { getEventPhase } from "@/lib/event-phase";
import { tallyStandings } from "@/lib/scoring";
import {
  applyPending,
  flushQueue,
  getFailed,
  getConflicts,
  getQueue,
  getServerQueue,
  hydrateQueue,
  retryFailed,
  subscribeQueue,
  type QueueTable,
} from "@/lib/write-queue";
export { dismissFailed, retryFailed } from "@/lib/write-queue";

export type Team = Tables<"teams">;
export type Player = Tables<"players">;
export type Round = Tables<"rounds">;
export type Match = Tables<"matches">;
export type SideBet = Tables<"side_bets">;
export type Trophy = Tables<"trophies">;

const CACHE_KEY = "tin-cup-cache-v2";

export type TournamentData = {
  teams: Team[];
  players: Player[];
  rounds: Round[];
  matches: Match[];
  sideBets: SideBet[];
  trophies: Trophy[];
  syncedAt: number;
};

function readCache(): TournamentData | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as TournamentData) : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(data: TournamentData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* storage full or unavailable — cache is best effort */
  }
}

async function fetchTournament(): Promise<TournamentData> {
  const result = await graphqlRequest<{
    teams: Team[];
    players: Player[];
    rounds: Round[];
    matches: Match[];
    side_bets: SideBet[];
    trophies: Trophy[];
  }>(`query TournamentHub {
    teams(order_by: {sort_order: asc}) { id slug name captain_name sort_order }
    players(order_by: {sort_order: asc}) { id team_id name is_captain sort_order }
    rounds(order_by: {sort_order: asc}) {
      id slug day_label play_date course tee_window format format_detail points meal sort_order
    }
    matches(order_by: {sort_order: asc}) {
      id round_id label points result side_a side_b sort_order revision updated_at
    }
    side_bets(order_by: {sort_order: asc}) {
      id kind label round_id hole amount player_name team_slug distance sort_order revision updated_at
    }
    trophies(order_by: {sort_order: asc}) {
      id slug name description winner_name winner_note sort_order revision created_at updated_at
    }
  }`);

  const data: TournamentData = {
    teams: result.teams,
    players: result.players,
    rounds: result.rounds,
    matches: result.matches,
    sideBets: applyDay1ContestHoles(result.side_bets, result.rounds),
    trophies: result.trophies,
    syncedAt: Date.now(),
  };
  writeCache(data);
  return data;
}

export const tournamentQueryKey = ["tournament"] as const;

/** Pending offline writes, re-rendered whenever the queue changes. */
export function usePendingWrites() {
  return useSyncExternalStore(subscribeQueue, getQueue, getServerQueue);
}

/** Writes the server refused or that ran out of retries — never silently dropped. */
export function useFailedWrites() {
  return useSyncExternalStore(subscribeQueue, getFailed, getServerQueue);
}

export function useWriteConflicts() {
  return useSyncExternalStore(subscribeQueue, getConflicts, getServerQueue);
}

export function useRowWriteStatus(table: QueueTable, rowId: string) {
  const pending = usePendingWrites();
  const failed = useFailedWrites();
  const conflicts = useWriteConflicts();
  if (conflicts.some((write) => write.table === table && write.rowId === rowId)) {
    return "conflict" as const;
  }
  if (failed.some((write) => write.table === table && write.rowId === rowId)) {
    return "failed" as const;
  }
  if (pending.some((write) => write.table === table && write.rowId === rowId)) {
    return "pending" as const;
  }
  return "clean" as const;
}

export function useTournament() {
  const queryClient = useQueryClient();
  const lastRealtimeAt = useRef(0);
  const prevMatchSig = useRef<Map<string, string>>(new Map());
  const [realtimeStatus, setRealtimeStatus] = useState<"ok" | "stale">("stale");
  const [flashedMatchIds, setFlashedMatchIds] = useState<string[]>([]);

  const query = useQuery({
    queryKey: tournamentQueryKey,
    queryFn: fetchTournament,
    staleTime: 15_000,
    retry: 2,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
    refetchInterval: () => {
      if (getEventPhase() !== "live") return 15_000;
      if (Date.now() - lastRealtimeAt.current < 20_000) return 40_000;
      return 5_000;
    },
  });

  const pending = usePendingWrites();
  const failedWrites = useFailedWrites();
  const conflicts = useWriteConflicts();

  // Seed from the local cache after hydration only — using it as initialData
  // makes the first client render disagree with the server HTML.
  useEffect(() => {
    hydrateQueue();
    if (queryClient.getQueryData(tournamentQueryKey)) return;
    const cached = readCache();
    if (cached) queryClient.setQueryData(tournamentQueryKey, cached);
  }, [queryClient]);

  useEffect(() => {
    let ready = false;
    return subscribeGraphql(
      `subscription TournamentLive {
        matches { id revision updated_at }
        side_bets { id revision updated_at }
        trophies { id revision updated_at }
      }`,
      () => {
        lastRealtimeAt.current = Date.now();
        setRealtimeStatus("ok");
        if (ready) void queryClient.invalidateQueries({ queryKey: tournamentQueryKey });
        ready = true;
      },
      (status) => {
        setRealtimeStatus(status);
        if (status === "ok") lastRealtimeAt.current = Date.now();
      },
    );
  }, [queryClient]);

  // Replay any writes that were made while offline.
  useEffect(() => {
    const flush = () => {
      void flushQueue().then((left) => {
        if (left === 0) queryClient.invalidateQueries({ queryKey: tournamentQueryKey });
      });
    };
    flush();
    window.addEventListener("online", flush);
    const id = window.setInterval(flush, 20_000);
    return () => {
      window.removeEventListener("online", flush);
      window.clearInterval(id);
    };
  }, [queryClient]);

  const data = useMemo(() => {
    if (!query.data) return undefined;
    const matches =
      pending.length === 0 ? query.data.matches : applyPending("matches", query.data.matches);
    const sideBets = applyDay1ContestHoles(
      pending.length === 0 ? query.data.sideBets : applyPending("side_bets", query.data.sideBets),
      query.data.rounds,
    );
    const trophies =
      pending.length === 0 ? query.data.trophies : applyPending("trophies", query.data.trophies);
    return { ...query.data, matches, sideBets, trophies };
  }, [query.data, pending]);

  useEffect(() => {
    const matches = data?.matches ?? [];
    const next = new Map(
      matches.map((match) => [match.id, `${match.revision}:${match.updated_at}:${match.result}`]),
    );
    const prev = prevMatchSig.current;
    const flashed: string[] = [];
    if (prev.size > 0) {
      for (const [id, sig] of next) {
        const prior = prev.get(id);
        if (prior && prior !== sig) flashed.push(id);
      }
    }
    prevMatchSig.current = next;
    if (flashed.length === 0) return;
    setFlashedMatchIds(flashed);
    const clear = window.setTimeout(() => setFlashedMatchIds([]), 3200);
    return () => window.clearTimeout(clear);
  }, [data?.matches]);

  return {
    ...query,
    data,
    pendingWrites: pending.length,
    failedWrites: failedWrites.length,
    conflicts: conflicts.length,
    retryFailedWrites: retryFailed,
    realtimeStatus,
    lastRealtimeAt: lastRealtimeAt.current,
    flashedMatchIds,
  };
}

export { tallyStandings };
export type { Standings } from "@/lib/scoring";

export function useStandings(matches: Match[] | undefined) {
  return useMemo(() => tallyStandings(matches ?? []), [matches]);
}
