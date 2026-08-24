import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { LiveHoles, LiveReport } from "@/lib/live-report";
import { assertMutationAllowed, isPreviewMode } from "@/lib/runtime-mode";

const STORAGE_KEY = "tin-cup-live-reports-v1";
const QUERY_KEY_EVENT = "tin-cup-live-reports-changed";

type Row = {
  match_id: string | null;
  pairing_key: string;
  reporter_id: string;
  player_id: string;
  status: string;
  holes: LiveHoles | null;
  updated_at: string;
};

function readLocal(): Row[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as Row[];
  } catch {
    return [];
  }
}

function writeLocal(rows: Row[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  window.dispatchEvent(new Event(QUERY_KEY_EVENT));
}

function upsertLocal(row: Row) {
  const next = readLocal().filter(
    (item) => !(item.pairing_key === row.pairing_key && item.reporter_id === row.reporter_id),
  );
  next.push(row);
  writeLocal(next);
}

function toReport(row: Row, playerName: string): LiveReport {
  return {
    pairingKey: row.pairing_key,
    matchId: row.match_id,
    reporterId: row.reporter_id,
    playerId: row.player_id,
    playerName,
    status: row.status,
    holes: row.holes,
    updatedAt: row.updated_at,
    unofficial: true,
  };
}

export function useMatchLiveReports(
  pairingKey: string | null,
  players: Array<{ id: string; name: string }>,
) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [remoteReady, setRemoteReady] = useState(false);

  const refresh = useCallback(async () => {
    const local = readLocal();
    if (!pairingKey) {
      setRows(local);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("match_live_reports" as never)
        .select("match_id,pairing_key,reporter_id,player_id,status,holes,updated_at")
        .eq("pairing_key", pairingKey);
      if (error) throw error;
      setRemoteReady(true);
      const remote = (data ?? []) as Row[];
      const merged = new Map<string, Row>();
      for (const row of [...local, ...remote]) {
        if (row.pairing_key !== pairingKey) continue;
        merged.set(`${row.pairing_key}:${row.reporter_id}`, row);
      }
      setRows([...merged.values()]);
    } catch {
      setRemoteReady(false);
      setRows(local.filter((row) => !pairingKey || row.pairing_key === pairingKey));
    }
  }, [pairingKey]);

  useEffect(() => {
    void refresh();
    const onLocal = () => void refresh();
    window.addEventListener(QUERY_KEY_EVENT, onLocal);
    window.addEventListener("storage", onLocal);
    const poll = window.setInterval(() => void refresh(), 8_000);
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`live-reports:${pairingKey ?? "all"}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "match_live_reports" },
          () => void refresh(),
        )
        .subscribe();
    } catch {
      channel = null;
    }
    return () => {
      window.removeEventListener(QUERY_KEY_EVENT, onLocal);
      window.removeEventListener("storage", onLocal);
      window.clearInterval(poll);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [pairingKey, refresh]);

  const reports = useMemo(
    () =>
      rows.map((row) => {
        const player = players.find((item) => item.id === row.player_id);
        return toReport(row, player?.name ?? "Player");
      }),
    [players, rows],
  );

  const save = useCallback(
    async (input: {
      pairingKey: string;
      matchId: string | null;
      playerId: string;
      status: string;
      holes: LiveHoles | null;
    }) => {
      if (!user) throw new Error("Sign in to post live status.");
      const row: Row = {
        match_id: input.matchId,
        pairing_key: input.pairingKey,
        reporter_id: user.id,
        player_id: input.playerId,
        status: input.status,
        holes: input.holes,
        updated_at: new Date().toISOString(),
      };
      upsertLocal(row);
      setRows((prev) => {
        const next = prev.filter(
          (item) => !(item.pairing_key === row.pairing_key && item.reporter_id === row.reporter_id),
        );
        next.push(row);
        return next;
      });
      if (isPreviewMode()) {
        return { source: "local" as const };
      }
      assertMutationAllowed("Live score");
      const { error } = await supabase.from("match_live_reports" as never).upsert(
        {
          match_id: row.match_id,
          pairing_key: row.pairing_key,
          reporter_id: row.reporter_id,
          player_id: row.player_id,
          status: row.status,
          holes: row.holes,
          updated_at: row.updated_at,
        } as never,
        { onConflict: "pairing_key,reporter_id" },
      );
      if (error) {
        return { source: "local" as const, error: error.message };
      }
      setRemoteReady(true);
      return { source: "remote" as const };
    },
    [user],
  );

  return { reports, save, remoteReady, refresh };
}
