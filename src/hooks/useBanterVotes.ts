import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import {
  type BanterPrompt,
  type BanterVote,
  chipFromBody,
  mergeWallPrompts,
  normalizeCustomBody,
  upsertPrompt,
  upsertVote,
} from "@/lib/banter";
import { assertMutationAllowed, isPreviewMode } from "@/lib/runtime-mode";
import { supabase } from "@/integrations/supabase/client";

const VOTE_STORAGE = "tin-cup-banter-votes-v1";
const PROMPT_STORAGE = "tin-cup-banter-prompts-v1";
const CHANGE_EVENT = "tin-cup-banter-votes-changed";

type VoteRow = {
  prompt_id: string;
  voter_id: string;
  player_id: string;
  updated_at: string;
};

type PromptRow = {
  id: string;
  body: string;
  chip: string;
  author_id: string;
  created_at: string;
};

function readLocalVotes(): BanterVote[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(VOTE_STORAGE) ?? "[]") as BanterVote[];
  } catch {
    return [];
  }
}

function writeLocalVotes(votes: BanterVote[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VOTE_STORAGE, JSON.stringify(votes));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readLocalPrompts(): BanterPrompt[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(PROMPT_STORAGE) ?? "[]") as BanterPrompt[];
  } catch {
    return [];
  }
}

function writeLocalPrompts(prompts: BanterPrompt[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROMPT_STORAGE, JSON.stringify(prompts));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function fromVoteRow(row: VoteRow): BanterVote {
  return {
    promptId: row.prompt_id,
    voterId: row.voter_id,
    playerId: row.player_id,
    updatedAt: row.updated_at,
  };
}

function fromPromptRow(row: PromptRow): BanterPrompt {
  return {
    id: row.id,
    prompt: row.body,
    chip: row.chip,
    authorId: row.author_id,
    createdAt: row.created_at,
    custom: true,
  };
}

function newId() {
  return crypto.randomUUID();
}

export function useBanterVotes() {
  const { user } = useAuth();
  const [votes, setVotes] = useState<BanterVote[]>([]);
  const [customPrompts, setCustomPrompts] = useState<BanterPrompt[]>([]);
  const [remoteReady, setRemoteReady] = useState(false);

  const refresh = useCallback(async () => {
    const localVotes = readLocalVotes();
    const localPrompts = readLocalPrompts();
    let nextVotes = localVotes;
    let nextPrompts = localPrompts;
    let ready = false;
    try {
      const { data, error } = await supabase
        .from("banter_votes" as never)
        .select("prompt_id,voter_id,player_id,updated_at");
      if (error) throw error;
      ready = true;
      const remote = ((data ?? []) as VoteRow[]).map(fromVoteRow);
      const merged = new Map<string, BanterVote>();
      for (const vote of [...localVotes, ...remote]) {
        merged.set(`${vote.promptId}:${vote.voterId}`, vote);
      }
      nextVotes = [...merged.values()];
    } catch {
      nextVotes = localVotes;
    }
    try {
      const { data, error } = await supabase
        .from("banter_prompts" as never)
        .select("id,body,chip,author_id,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      ready = true;
      const remote = ((data ?? []) as PromptRow[]).map(fromPromptRow);
      const merged = new Map<string, BanterPrompt>();
      for (const row of [...localPrompts, ...remote]) {
        merged.set(row.id, row);
      }
      nextPrompts = [...merged.values()];
    } catch {
      nextPrompts = localPrompts;
    }
    setRemoteReady(ready);
    setVotes(nextVotes);
    setCustomPrompts(nextPrompts);
  }, []);

  useEffect(() => {
    void refresh();
    const onLocal = () => void refresh();
    window.addEventListener(CHANGE_EVENT, onLocal);
    window.addEventListener("storage", onLocal);
    const channels: ReturnType<typeof supabase.channel>[] = [];
    try {
      channels.push(
        supabase
          .channel("banter-votes")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "banter_votes" },
            () => void refresh(),
          )
          .subscribe(),
      );
      channels.push(
        supabase
          .channel("banter-prompts")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "banter_prompts" },
            () => void refresh(),
          )
          .subscribe(),
      );
    } catch {
      /* preview / missing realtime */
    }
    return () => {
      window.removeEventListener(CHANGE_EVENT, onLocal);
      window.removeEventListener("storage", onLocal);
      for (const channel of channels) void supabase.removeChannel(channel);
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
      const local = upsertVote(readLocalVotes(), next);
      writeLocalVotes(local);
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

  const createPrompt = useCallback(
    async (raw: string) => {
      if (!user) throw new Error("Claim a seat first.");
      const body = normalizeCustomBody(raw);
      if (!body) throw new Error("Write a most likely first.");
      const next: BanterPrompt = {
        id: newId(),
        prompt: body,
        chip: chipFromBody(body),
        authorId: user.id,
        createdAt: new Date().toISOString(),
        custom: true,
      };
      writeLocalPrompts(upsertPrompt(readLocalPrompts(), next));
      setCustomPrompts((prev) => upsertPrompt(prev, next));
      if (isPreviewMode()) return { source: "local" as const, prompt: next };
      assertMutationAllowed("Banter");
      const { data, error } = await supabase
        .from("banter_prompts" as never)
        .insert({
          id: next.id,
          body: next.prompt,
          chip: next.chip,
          author_id: next.authorId,
          created_at: next.createdAt,
        } as never)
        .select("id,body,chip,author_id,created_at")
        .single();
      if (error) return { source: "local" as const, prompt: next, error: error.message };
      const saved = fromPromptRow(data as PromptRow);
      writeLocalPrompts(upsertPrompt(readLocalPrompts(), saved));
      setCustomPrompts((prev) => upsertPrompt(prev, saved));
      setRemoteReady(true);
      return { source: "remote" as const, prompt: saved };
    },
    [user],
  );

  const prompts = useMemo(() => mergeWallPrompts(customPrompts), [customPrompts]);

  return useMemo(
    () => ({ votes, vote, createPrompt, prompts, customPrompts, remoteReady, refresh, userId: user?.id }),
    [votes, vote, createPrompt, prompts, customPrompts, remoteReady, refresh, user?.id],
  );
}
