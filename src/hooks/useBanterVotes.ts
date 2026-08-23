import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { type BanterVote, upsertVote } from "@/lib/banter";
import { assertMutationAllowed, isPreviewMode } from "@/lib/runtime-mode";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "tin-cup-banter-votes-v1";
const CHANGE_EVENT = "tin-cup-banter-votes-changed";

type Row = {
  prompt_id: string;
  voter_id: string;
  player_id: string;
  updated_at: string;
};

function readLocal(): BanterVote[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as BanterVote[];
  } catch {
    return [];
  }
}

function writeLocal(votes: BanterVote[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function fromRow(row: Row): BanterVote {
  return {
    promptId: row.prompt_id,
    voterId: row.voter_id,
    playerId: row.player_id,
    updatedAt: row.updated_at,
  };
}

export function useBanterVotes() {
  const { user } = useAuth();
  const [votes, setVotes] = useState<BanterVote[]>([]);
  const [remoteReady, setRemoteReady] = useState(false);

  const refresh = useCallback(async () => {
    const local = readLocal();
    try {
      const { data, error } = await supabase
        .from("banter_votes" as never)
        .select("prompt_id,voter_id,player_id,updated_at");
      if (error) throw error;
      setRemoteReady(true);
      const remote = ((data ?? []) as Row[]).map(fromRow);
      const merged = new Map<string, BanterVote>();
      for (const vote of [...local, ...remote]) {
        merged.set(`${vote.promptId}:${vote.voterId}`, vote);
      }
      setVotes([...merged.values()]);
    } catch {
      setRemoteReady(false);
      setVotes(local);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onLocal = () => void refresh();
    window.addEventListener(CHANGE_EVENT, onLocal);
    window.addEventListener("storage", onLocal);
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel("banter-votes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "banter_votes" },
          () => void refresh(),
        )
        .subscribe();
    } catch {
      channel = null;
    }
    return () => {
      window.removeEventListener(CHANGE_EVENT, onLocal);
      window.removeEventListener("storage", onLocal);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const vote = useCallback(
    async (promptId: string, playerId: string) => {
      if (!user) throw new Error("Claim a seat first.");
      const next: BanterVote = {
        promptId,
        voterId: user.id,
        playerId,
        updatedAt: new Date().toISOString(),
      };
      const local = upsertVote(readLocal(), next);
      writeLocal(local);
      setVotes((prev) => upsertVote(prev, next));
      if (isPreviewMode()) return { source: "local" as const };
      assertMutationAllowed("Banter");
      const { error } = await supabase.from("banter_votes" as never).upsert(
        {
          prompt_id: next.promptId,
          voter_id: next.voterId,
          player_id: next.playerId,
          updated_at: next.updatedAt,
        } as never,
        { onConflict: "prompt_id,voter_id" },
      );
      if (error) return { source: "local" as const, error: error.message };
      setRemoteReady(true);
      return { source: "remote" as const };
    },
    [user],
  );

  return useMemo(
    () => ({ votes, vote, remoteReady, refresh, userId: user?.id }),
    [votes, vote, remoteReady, refresh, user?.id],
  );
}
