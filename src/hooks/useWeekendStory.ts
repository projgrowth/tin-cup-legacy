import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeGraphql } from "@/integrations/supabase/graphql";
import { isPreviewMode, PREVIEW_STORAGE_PREFIX, socialFeatureEnabled } from "@/lib/runtime-mode";
import type { ReactionKind, StoryComment, StoryReaction } from "@/lib/weekend-story";
import { CLUBHOUSE_MOMENT_KEY } from "@/lib/social-platform";

const enabled = () =>
  isPreviewMode() || String(import.meta.env.VITE_WEEKEND_STORY_V2 ?? "").toLowerCase() === "true";
const COMMENT_KEY = `${PREVIEW_STORAGE_PREFIX}:comments`;
const REACTION_KEY = `${PREVIEW_STORAGE_PREFIX}:reactions`;
const REPORT_KEY = `${PREVIEW_STORAGE_PREFIX}:story-reports`;
const READ_KEY = `${PREVIEW_STORAGE_PREFIX}:clubhouse-read`;
const SEEDED_KEY = `${PREVIEW_STORAGE_PREFIX}:clubhouse-seeded`;
const SEEDED_COMMENT_IDS = new Set([
  "preview-announcement-welcome",
  "preview-post-captain",
  "preview-post-player",
]);
const SEEDED_AUTHOR_IDS = new Set(["preview-organizer", "preview-captain", "preview-player"]);

function isSeededClubhouseComment(comment: StoryComment) {
  return SEEDED_COMMENT_IDS.has(comment.id) || SEEDED_AUTHOR_IDS.has(comment.author_id);
}
function localRead<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}
function localWrite<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function useWeekendStory(userId?: string) {
  const queryClient = useQueryClient();
  const clubhouseEnabled = socialFeatureEnabled("clubhouse");
  useEffect(() => {
    if (!enabled() || !clubhouseEnabled) return;
    return subscribeGraphql(
      `subscription WeekendStoryLive {
          story_comments { id updated_at }
          story_reactions { moment_key created_at }
          story_reports { comment_id created_at }
        }`,
      () => {
        void queryClient.invalidateQueries({ queryKey: ["story-comments"] });
        void queryClient.invalidateQueries({ queryKey: ["story-reactions"] });
        void queryClient.invalidateQueries({ queryKey: ["story-reports"] });
      },
    );
  }, [queryClient, clubhouseEnabled]);
  const comments = useQuery({
    queryKey: ["story-comments"],
    enabled: enabled(),
    queryFn: async () => {
      if (isPreviewMode()) {
        localStorage.removeItem(SEEDED_KEY);
        const saved = localRead<StoryComment>(COMMENT_KEY);
        const kept = saved.filter((comment) => !isSeededClubhouseComment(comment));
        if (kept.length !== saved.length) localWrite(COMMENT_KEY, kept);
        return kept.filter((comment) => !comment.deleted_at);
      }
      const { data, error } = await supabase
        .from("story_comments")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) {
        if (error.code === "PGRST205" || /schema cache/i.test(error.message)) return [];
        throw error;
      }
      return data as StoryComment[];
    },
    retry: false,
  });
  const reactions = useQuery({
    queryKey: ["story-reactions"],
    enabled: enabled(),
    queryFn: async () => {
      if (isPreviewMode()) return localRead<StoryReaction>(REACTION_KEY);
      const { data, error } = await supabase.from("story_reactions").select("*");
      if (error) {
        if (error.code === "PGRST205" || /schema cache/i.test(error.message)) return [];
        throw error;
      }
      return data as StoryReaction[];
    },
    retry: false,
  });
  const addComment = useMutation({
    mutationFn: async ({
      momentKey,
      body,
      mentionedUserId,
    }: {
      momentKey: string;
      body: string;
      mentionedUserId?: string;
    }) => {
      if (!userId) throw new Error("Claim your player before commenting.");
      if (isPreviewMode()) {
        const list = localRead<StoryComment>(COMMENT_KEY);
        const comment: StoryComment = {
          id: crypto.randomUUID(),
          moment_key: momentKey,
          author_id: userId,
          body: body.trim().slice(0, 500),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          moderated_by: null,
          pinned_at: null,
          pinned_by: null,
          announcement_expires_at: null,
        };
        localWrite(COMMENT_KEY, [...list, comment]);
        return comment;
      }
      const { data, error } = await supabase
        .from("story_comments")
        .insert({ moment_key: momentKey, author_id: userId, body: body.trim().slice(0, 500) })
        .select()
        .single();
      if (error) throw error;
      if (mentionedUserId) {
        const mention = await supabase
          .from("comment_mentions")
          .insert({ comment_id: data.id, mentioned_user_id: mentionedUserId });
        if (mention.error) throw mention.error;
      }
      return data as StoryComment;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["story-comments"] }),
  });
  const removeComment = useMutation({
    mutationFn: async ({ id, moderate }: { id: string; moderate?: boolean }) => {
      if (isPreviewMode()) {
        localWrite(
          COMMENT_KEY,
          localRead<StoryComment>(COMMENT_KEY).map((comment) =>
            comment.id === id
              ? {
                  ...comment,
                  deleted_at: new Date().toISOString(),
                  moderated_by: moderate ? userId || null : null,
                }
              : comment,
          ),
        );
        return;
      }
      const { error } = await supabase
        .from("story_comments")
        .update({ deleted_at: new Date().toISOString(), moderated_by: moderate ? userId : null })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["story-comments"] });
      const previous = queryClient.getQueryData<StoryComment[]>(["story-comments"]);
      queryClient.setQueryData<StoryComment[]>(["story-comments"], (current = []) =>
        current.filter((comment) => comment.id !== id),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["story-comments"], context.previous);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["story-comments"] }),
  });
  const editComment = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      if (!userId) throw new Error("Sign in again to edit this comment.");
      const trimmed = body.trim().slice(0, 500);
      if (!trimmed) throw new Error("A comment cannot be empty.");
      if (isPreviewMode()) {
        localWrite(
          COMMENT_KEY,
          localRead<StoryComment>(COMMENT_KEY).map((comment) =>
            comment.id === id && comment.author_id === userId
              ? { ...comment, body: trimmed, updated_at: new Date().toISOString() }
              : comment,
          ),
        );
        return;
      }
      const { error } = await supabase
        .from("story_comments")
        .update({ body: trimmed, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("author_id", userId);
      if (error) throw error;
    },
    onMutate: async ({ id, body }) => {
      await queryClient.cancelQueries({ queryKey: ["story-comments"] });
      const previous = queryClient.getQueryData<StoryComment[]>(["story-comments"]);
      queryClient.setQueryData<StoryComment[]>(["story-comments"], (current = []) =>
        current.map((comment) =>
          comment.id === id
            ? { ...comment, body: body.trim(), updated_at: new Date().toISOString() }
            : comment,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["story-comments"], context.previous);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["story-comments"] }),
  });
  const toggleReaction = useMutation({
    mutationFn: async ({ momentKey, kind }: { momentKey: string; kind: ReactionKind }) => {
      if (!userId) throw new Error("Claim your name to react.");
      const cached = queryClient.getQueryData<StoryReaction[]>(["story-reactions"]) ?? [];
      const exists = cached.some(
        (row) => row.moment_key === momentKey && row.user_id === userId && row.kind === kind,
      );
      if (isPreviewMode()) {
        const list = localRead<StoryReaction>(REACTION_KEY);
        const previewExists = list.some(
          (row) => row.moment_key === momentKey && row.user_id === userId && row.kind === kind,
        );
        localWrite(
          REACTION_KEY,
          previewExists
            ? list.filter(
                (row) =>
                  !(row.moment_key === momentKey && row.user_id === userId && row.kind === kind),
              )
            : [
                ...list,
                {
                  moment_key: momentKey,
                  user_id: userId,
                  kind,
                  created_at: new Date().toISOString(),
                },
              ],
        );
        return;
      }
      const request = exists
        ? supabase
            .from("story_reactions")
            .delete()
            .match({ moment_key: momentKey, user_id: userId, kind })
        : supabase.from("story_reactions").insert({ moment_key: momentKey, user_id: userId, kind });
      const { error } = await request;
      if (error && error.code !== "23505") throw error;
    },
    onMutate: async ({ momentKey, kind }) => {
      if (!userId) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey: ["story-reactions"] });
      const previous = queryClient.getQueryData<StoryReaction[]>(["story-reactions"]);
      const list = previous ?? [];
      const exists = list.some(
        (row) => row.moment_key === momentKey && row.user_id === userId && row.kind === kind,
      );
      queryClient.setQueryData<StoryReaction[]>(
        ["story-reactions"],
        exists
          ? list.filter(
              (row) =>
                !(row.moment_key === momentKey && row.user_id === userId && row.kind === kind),
            )
          : [
              ...list,
              {
                moment_key: momentKey,
                user_id: userId,
                kind,
                created_at: new Date().toISOString(),
              },
            ],
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["story-reactions"], context.previous);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["story-reactions"] }),
  });
  const reports = useQuery({
    queryKey: ["story-reports", userId],
    enabled: Boolean(userId && enabled()),
    queryFn: async () => {
      if (isPreviewMode())
        return localRead<{
          comment_id: string;
          reporter_id: string;
          reason: string;
          created_at: string;
          resolved_at: string | null;
        }>(REPORT_KEY);
      const { data, error } = await supabase
        .from("story_reports")
        .select("comment_id, reporter_id, reason, created_at, resolved_at");
      if (error) throw error;
      return data;
    },
    retry: false,
  });
  const readCursor = useQuery({
    queryKey: ["clubhouse-read", userId],
    enabled: Boolean(userId && enabled()),
    queryFn: async () => {
      if (isPreviewMode()) return localStorage.getItem(READ_KEY);
      const { data, error } = await supabase
        .from("clubhouse_reads")
        .select("last_read_at")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data?.last_read_at ?? null;
    },
    retry: false,
  });
  const reportPost = useMutation({
    mutationFn: async ({
      commentId,
      reason = "review",
    }: {
      commentId: string;
      reason?: string;
    }) => {
      if (!userId) throw new Error("Claim your player before reporting a post.");
      if (isPreviewMode()) {
        const list = localRead<{
          comment_id: string;
          reporter_id: string;
          reason: string;
          created_at: string;
          resolved_at: string | null;
        }>(REPORT_KEY);
        if (!list.some((row) => row.comment_id === commentId && row.reporter_id === userId)) {
          localWrite(REPORT_KEY, [
            ...list,
            {
              comment_id: commentId,
              reporter_id: userId,
              reason,
              created_at: new Date().toISOString(),
              resolved_at: null,
            },
          ]);
        }
        return;
      }
      const { error } = await supabase
        .from("story_reports")
        .insert({ comment_id: commentId, reporter_id: userId, reason });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["story-reports"] }),
  });
  const pinPost = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      if (!userId) throw new Error("Sign in again to pin announcements.");
      const patch = {
        pinned_at: pinned ? new Date().toISOString() : null,
        pinned_by: pinned ? userId : null,
      };
      if (isPreviewMode()) {
        localWrite(
          COMMENT_KEY,
          localRead<StoryComment>(COMMENT_KEY).map((comment) =>
            comment.id === id ? { ...comment, ...patch } : comment,
          ),
        );
        return;
      }
      const { error } = await supabase.from("story_comments").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["story-comments"] }),
  });
  const addAnnouncement = useMutation({
    mutationFn: async ({ body, expiresAt }: { body: string; expiresAt?: string | null }) => {
      if (!userId) throw new Error("Sign in again to post an announcement.");
      const now = new Date().toISOString();
      const clean = body.trim().slice(0, 500);
      if (!clean) throw new Error("Write an announcement first.");
      if (isPreviewMode()) {
        const row: StoryComment = {
          id: crypto.randomUUID(),
          moment_key: CLUBHOUSE_MOMENT_KEY,
          author_id: userId,
          body: clean,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          moderated_by: null,
          pinned_at: now,
          pinned_by: userId,
          announcement_expires_at: expiresAt ?? null,
        };
        localWrite(COMMENT_KEY, [...localRead<StoryComment>(COMMENT_KEY), row]);
        return row;
      }
      const result = await supabase.from("story_comments").insert({
        moment_key: CLUBHOUSE_MOMENT_KEY,
        author_id: userId,
        body: clean,
        pinned_at: now,
        pinned_by: userId,
        announcement_expires_at: expiresAt ?? null,
      });
      if (result.error) throw result.error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["story-comments"] }),
  });
  const markClubhouseRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const last_read_at = new Date().toISOString();
      if (isPreviewMode()) {
        localStorage.setItem(READ_KEY, last_read_at);
        return last_read_at;
      }
      const { error } = await supabase
        .from("clubhouse_reads")
        .upsert({ user_id: userId, last_read_at });
      if (error) throw error;
      return last_read_at;
    },
    onSuccess: (lastReadAt) =>
      queryClient.setQueryData(["clubhouse-read", userId], lastReadAt ?? null),
  });
  const clubhousePosts = (comments.data ?? [])
    .filter(
      (comment) =>
        comment.moment_key === CLUBHOUSE_MOMENT_KEY &&
        (!comment.announcement_expires_at ||
          Date.parse(comment.announcement_expires_at) > Date.now()),
    )
    .sort((a, b) =>
      a.pinned_at !== b.pinned_at
        ? a.pinned_at
          ? -1
          : 1
        : Date.parse(b.created_at) - Date.parse(a.created_at),
    );
  const readAt = readCursor.data ?? null;
  const unreadCount = readAt
    ? clubhousePosts.filter((post) => Date.parse(post.created_at) > Date.parse(readAt)).length
    : clubhousePosts.length;
  return {
    enabled: enabled(),
    clubhouseEnabled,
    comments: comments.data ?? [],
    reactions: reactions.data ?? [],
    addComment,
    editComment,
    removeComment,
    toggleReaction,
    clubhousePosts,
    unreadCount,
    reports: reports.data ?? [],
    reportPost,
    pinPost,
    addAnnouncement,
    markClubhouseRead,
    unavailable: comments.isError || reactions.isError,
  };
}
