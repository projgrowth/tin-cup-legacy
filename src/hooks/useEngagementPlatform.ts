import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { subscribeGraphql } from "@/integrations/supabase/graphql";
import {
  pollClosed,
  type CheckInStatus,
  type ClubhousePoll,
  type EngagementPrompt,
  type EngagementPromptKind,
  type PhotoFavorite,
  type PlayerCheckIn,
  type PollVote,
} from "@/lib/social-platform";
import { isPreviewMode, PREVIEW_STORAGE_PREFIX, socialFeatureEnabled } from "@/lib/runtime-mode";

const POLLS_KEY = `${PREVIEW_STORAGE_PREFIX}:polls`;
const VOTES_KEY = `${PREVIEW_STORAGE_PREFIX}:poll-votes`;
const CHECKINS_KEY = `${PREVIEW_STORAGE_PREFIX}:checkins`;
const PROMPTS_KEY = `${PREVIEW_STORAGE_PREFIX}:prompts`;
const FAVORITES_KEY = `${PREVIEW_STORAGE_PREFIX}:photo-favorites`;
const SEEDED_POLL_IDS = new Set(["preview-poll-walkoff"]);
const SEEDED_PROMPT_IDS = new Set(["preview-first-tee"]);

function localRead<T>(key: string, fallback: T[] = []): T[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "null") as T[] | null;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function localWrite<T>(key: string, rows: T[]) {
  localStorage.setItem(key, JSON.stringify(rows));
}

function dropSeededPolls(polls: ClubhousePoll[]) {
  const kept = polls.filter((poll) => !SEEDED_POLL_IDS.has(poll.id) && !poll.deletedAt);
  if (kept.length !== polls.length) localWrite(POLLS_KEY, kept);
  return kept;
}

function dropSeededPrompts(prompts: EngagementPrompt[]) {
  const kept = prompts.filter((prompt) => !SEEDED_PROMPT_IDS.has(prompt.id));
  if (kept.length !== prompts.length) localWrite(PROMPTS_KEY, kept);
  return kept;
}

export function useEngagementPlatform(userId?: string, playerId?: string | null) {
  const queryClient = useQueryClient();
  const pollsEnabled = socialFeatureEnabled("polls");
  const checkinsEnabled = socialFeatureEnabled("checkins");
  const promptsEnabled = socialFeatureEnabled("prompts");
  const galleryEnabled = socialFeatureEnabled("gallery");

  useEffect(() => {
    if (!pollsEnabled && !checkinsEnabled && !promptsEnabled && !galleryEnabled) return;
    return subscribeGraphql(
      `subscription EngagementLive {
          clubhouse_polls { id updated_at }
          clubhouse_poll_votes { poll_id updated_at }
          player_checkins { user_id created_at }
          engagement_prompts { id starts_at ends_at }
          photo_favorites { photo_id created_at }
        }`,
      () => void queryClient.invalidateQueries({ queryKey: ["engagement-platform"] }),
    );
  }, [queryClient, pollsEnabled, checkinsEnabled, promptsEnabled, galleryEnabled]);

  const query = useQuery({
    queryKey: ["engagement-platform", userId],
    enabled: pollsEnabled || checkinsEnabled || promptsEnabled || galleryEnabled,
    retry: false,
    queryFn: async () => {
      if (isPreviewMode()) {
        return {
          polls: dropSeededPolls(localRead<ClubhousePoll>(POLLS_KEY)),
          votes: localRead<PollVote>(VOTES_KEY),
          checkIns: localRead<PlayerCheckIn>(CHECKINS_KEY),
          prompts: dropSeededPrompts(localRead<EngagementPrompt>(PROMPTS_KEY)),
          favorites: localRead<PhotoFavorite>(FAVORITES_KEY),
        };
      }
      const [polls, options, votes, checkIns, prompts, favorites] = await Promise.all([
        supabase
          .from("clubhouse_polls")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase.from("clubhouse_poll_options").select("*").order("sort_order"),
        supabase.from("clubhouse_poll_votes").select("*"),
        supabase.from("player_checkins").select("*").gt("expires_at", new Date().toISOString()),
        supabase.from("engagement_prompts").select("*").order("starts_at", { ascending: false }),
        userId
          ? supabase.from("photo_favorites").select("*").eq("user_id", userId)
          : Promise.resolve({ data: [], error: null }),
      ]);
      const error =
        polls.error ||
        options.error ||
        votes.error ||
        checkIns.error ||
        prompts.error ||
        favorites.error;
      if (error) throw error;
      return {
        polls: (polls.data ?? []).map((poll) => ({
          id: poll.id,
          authorId: poll.author_id,
          question: poll.question,
          createdAt: poll.created_at,
          closesAt: poll.closes_at,
          closedAt: poll.closed_at,
          deletedAt: poll.deleted_at,
          moderatedBy: poll.moderated_by,
          options: (options.data ?? [])
            .filter((option) => option.poll_id === poll.id)
            .map((option) => ({
              id: option.id,
              pollId: option.poll_id,
              label: option.label,
              sortOrder: option.sort_order,
            })),
        })) satisfies ClubhousePoll[],
        votes: (votes.data ?? []).map((vote) => ({
          pollId: vote.poll_id,
          optionId: vote.option_id,
          userId: vote.user_id,
          updatedAt: vote.updated_at,
        })) satisfies PollVote[],
        checkIns: (checkIns.data ?? []).map((row) => ({
          userId: row.user_id,
          playerId: row.player_id,
          status: row.status as CheckInStatus,
          createdAt: row.created_at,
          expiresAt: row.expires_at,
        })) satisfies PlayerCheckIn[],
        prompts: (prompts.data ?? []).map((row) => ({
          id: row.id,
          authorId: row.author_id,
          kind: row.kind as EngagementPromptKind,
          title: row.title,
          detail: row.detail,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          roundId: row.round_id,
        })) satisfies EngagementPrompt[],
        favorites: (favorites.data ?? []).map((row) => ({
          photoId: row.photo_id,
          userId: row.user_id,
          createdAt: row.created_at,
        })) satisfies PhotoFavorite[],
      };
    },
  });

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ["engagement-platform"] });

  const createPoll = useMutation({
    mutationFn: async ({
      question,
      options,
      closesAt,
    }: {
      question: string;
      options: string[];
      closesAt?: string | null;
    }) => {
      if (!userId) throw new Error("Sign in to add a poll.");
      const cleanQuestion = question.trim().slice(0, 140);
      const cleanOptions = options
        .map((option) => option.trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 16);
      if (!cleanQuestion || cleanOptions.length < 2)
        throw new Error("Add a question and at least two options.");
      const now = new Date().toISOString();
      if (isPreviewMode()) {
        const id = crypto.randomUUID();
        localWrite(POLLS_KEY, [
          {
            id,
            authorId: userId,
            question: cleanQuestion,
            createdAt: now,
            closesAt: closesAt ?? null,
            closedAt: null,
            deletedAt: null,
            moderatedBy: null,
            options: cleanOptions.map((label, index) => ({
              id: crypto.randomUUID(),
              pollId: id,
              label,
              sortOrder: index,
            })),
          },
          ...localRead<ClubhousePoll>(POLLS_KEY),
        ]);
        return;
      }
      const created = await supabase
        .from("clubhouse_polls")
        .insert({ author_id: userId, question: cleanQuestion, closes_at: closesAt ?? null })
        .select("id")
        .single();
      if (created.error) throw created.error;
      const inserted = await supabase.from("clubhouse_poll_options").insert(
        cleanOptions.map((label, index) => ({
          poll_id: created.data.id,
          label,
          sort_order: index,
        })),
      );
      if (inserted.error) throw inserted.error;
    },
    onSuccess: invalidate,
  });

  const vote = useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: string; optionId: string }) => {
      if (!userId || !playerId) throw new Error("Claim your player before voting.");
      const poll = query.data?.polls.find((row) => row.id === pollId);
      if (!poll || pollClosed(poll)) throw new Error("This poll is closed.");
      const now = new Date().toISOString();
      if (isPreviewMode()) {
        const rows = localRead<PollVote>(VOTES_KEY).filter(
          (row) => !(row.pollId === pollId && row.userId === userId),
        );
        localWrite(VOTES_KEY, [...rows, { pollId, optionId, userId, updatedAt: now }]);
        return;
      }
      const result = await supabase.from("clubhouse_poll_votes").upsert({
        poll_id: pollId,
        option_id: optionId,
        user_id: userId,
      });
      if (result.error) throw result.error;
    },
    onSuccess: invalidate,
  });

  const closePoll = useMutation({
    mutationFn: async ({ pollId, moderate = false }: { pollId: string; moderate?: boolean }) => {
      if (!userId) throw new Error("Sign in again to manage this poll.");
      const now = new Date().toISOString();
      if (isPreviewMode()) {
        localWrite(
          POLLS_KEY,
          localRead<ClubhousePoll>(POLLS_KEY).map((poll) =>
            poll.id === pollId
              ? moderate
                ? { ...poll, deletedAt: now, moderatedBy: userId }
                : { ...poll, closedAt: now }
              : poll,
          ),
        );
        return;
      }
      const result = await supabase
        .from("clubhouse_polls")
        .update(moderate ? { deleted_at: now, moderated_by: userId } : { closed_at: now })
        .eq("id", pollId);
      if (result.error) throw result.error;
    },
    onSuccess: invalidate,
  });

  const checkIn = useMutation({
    mutationFn: async (status: CheckInStatus | null) => {
      if (!userId || !playerId) throw new Error("Claim your player before checking in.");
      if (isPreviewMode()) {
        const rows = localRead<PlayerCheckIn>(CHECKINS_KEY).filter((row) => row.userId !== userId);
        if (status) {
          const now = Date.now();
          rows.push({
            userId,
            playerId,
            status,
            createdAt: new Date(now).toISOString(),
            expiresAt: new Date(now + 6 * 60 * 60 * 1000).toISOString(),
          });
        }
        localWrite(CHECKINS_KEY, rows);
        return;
      }
      if (!status) {
        const removed = await supabase.from("player_checkins").delete().eq("user_id", userId);
        if (removed.error) throw removed.error;
        return;
      }
      const result = await supabase.from("player_checkins").upsert({
        user_id: userId,
        player_id: playerId,
        status,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      });
      if (result.error) throw result.error;
    },
    onSuccess: invalidate,
  });

  const createPrompt = useMutation({
    mutationFn: async ({
      kind,
      title,
      detail,
      startsAt,
      endsAt,
      roundId,
    }: {
      kind: EngagementPromptKind;
      title: string;
      detail?: string;
      startsAt: string;
      endsAt: string;
      roundId?: string | null;
    }) => {
      if (!userId) throw new Error("Sign in again to schedule a prompt.");
      const row: EngagementPrompt = {
        id: crypto.randomUUID(),
        authorId: userId,
        kind,
        title: title.trim().slice(0, 100),
        detail: detail?.trim().slice(0, 300) || null,
        startsAt,
        endsAt,
        roundId: roundId ?? null,
      };
      if (!row.title || Date.parse(endsAt) <= Date.parse(startsAt))
        throw new Error("Add a title and a valid time window.");
      if (isPreviewMode()) {
        localWrite(PROMPTS_KEY, [
          row,
          ...dropSeededPrompts(localRead<EngagementPrompt>(PROMPTS_KEY)),
        ]);
        return;
      }
      const result = await supabase.from("engagement_prompts").insert({
        author_id: userId,
        kind,
        title: row.title,
        detail: row.detail,
        starts_at: startsAt,
        ends_at: endsAt,
        round_id: row.roundId,
      });
      if (result.error) throw result.error;
    },
    onSuccess: invalidate,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (photoId: string) => {
      if (!userId) throw new Error("Sign in to save favorite photos.");
      const rows = query.data?.favorites ?? [];
      const exists = rows.some((row) => row.photoId === photoId && row.userId === userId);
      if (isPreviewMode()) {
        localWrite(
          FAVORITES_KEY,
          exists
            ? localRead<PhotoFavorite>(FAVORITES_KEY).filter(
                (row) => !(row.photoId === photoId && row.userId === userId),
              )
            : [
                ...localRead<PhotoFavorite>(FAVORITES_KEY),
                { photoId, userId, createdAt: new Date().toISOString() },
              ],
        );
        return;
      }
      const result = exists
        ? await supabase
            .from("photo_favorites")
            .delete()
            .match({ photo_id: photoId, user_id: userId })
        : await supabase.from("photo_favorites").insert({ photo_id: photoId, user_id: userId });
      if (result.error) throw result.error;
    },
    onSuccess: invalidate,
  });

  return {
    pollsEnabled,
    checkinsEnabled,
    promptsEnabled,
    galleryEnabled,
    polls: query.data?.polls ?? [],
    votes: query.data?.votes ?? [],
    checkIns: query.data?.checkIns ?? [],
    prompts: query.data?.prompts ?? [],
    favorites: query.data?.favorites ?? [],
    unavailable: query.isError,
    createPoll,
    vote,
    closePoll,
    checkIn,
    createPrompt,
    toggleFavorite,
  };
}
