import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { Tables } from "@/integrations/supabase/types";
import { graphqlRequest, subscribeGraphql } from "@/integrations/nhost/graphql";
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
    sideBets: result.side_bets,
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

export function useTournament() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: tournamentQueryKey,
    queryFn: fetchTournament,
    staleTime: 15_000,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
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
        // Hasura sends an initial snapshot. The query already loaded that data,
        // so only invalidate after the subscription is established.
        if (ready) void queryClient.invalidateQueries({ queryKey: tournamentQueryKey });
        ready = true;
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
    if (pending.length === 0) return query.data;
    return {
      ...query.data,
      matches: applyPending("matches", query.data.matches),
      sideBets: applyPending("side_bets", query.data.sideBets),
      trophies: applyPending("trophies", query.data.trophies),
    };
  }, [query.data, pending]);

  return {
    ...query,
    data,
    pendingWrites: pending.length,
    failedWrites: failedWrites.length,
    conflicts: conflicts.length,
    retryFailedWrites: retryFailed,
  };
}

import { tallyStandings } from "@/lib/scoring";

export { tallyStandings };
export type { Standings } from "@/lib/scoring";

export function useStandings(matches: Match[] | undefined) {
  return useMemo(() => tallyStandings(matches ?? []), [matches]);
}
