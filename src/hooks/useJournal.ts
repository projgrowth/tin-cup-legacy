import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Tables } from "@/integrations/supabase/types";
import { graphqlRequest } from "@/integrations/supabase/graphql";
import { useAuth } from "@/hooks/useAuth";

export type Profile = Tables<"profiles">;
export type HoleNote = Tables<"hole_notes">;
export type RoundPlan = Tables<"round_plans">;

export type HoleNoteDraft = {
  tee_club?: string | null;
  target_line?: string | null;
  green_note?: string | null;
  target_score?: number | null;
  notes?: string | null;
};

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const data = await graphqlRequest<{ profiles_by_pk: Profile | null }, { id: string }>(
        `query MyProfile($id: uuid!) {
          profiles_by_pk(id: $id) {
            id display_name player_id avatar_path created_at updated_at
          }
        }`,
        { id: userId! },
      );
      return data.profiles_by_pk;
    },
  });

  // Every signed-in player gets a profile row the first time they land here.
  useEffect(() => {
    if (!userId || query.isLoading || query.data) return;
    void graphqlRequest(
      `mutation CreateMyProfile($displayName: String!) {
        insert_profiles_one(object: {display_name: $displayName}) { id }
      }`,
      { displayName: user?.email?.split("@")[0] ?? "" },
    ).then(() => queryClient.invalidateQueries({ queryKey: ["profile", userId] }));
  }, [userId, user?.email, query.isLoading, query.data, queryClient]);

  const save = useMutation({
    mutationFn: async (
      patch: Partial<Pick<Profile, "display_name" | "player_id" | "avatar_path">>,
    ) => {
      await graphqlRequest<
        { insert_profiles_one: { id: string } | null },
        { object: Record<string, unknown> }
      >(
        `mutation SaveMyProfile($object: profiles_insert_input!) {
          insert_profiles_one(
            object: $object,
            on_conflict: {
              constraint: profiles_pkey,
              update_columns: [display_name, player_id, avatar_path]
            }
          ) { id }
        }`,
        { object: { display_name: patch.display_name ?? query.data?.display_name ?? "", ...patch } },
      );
      return { saved: true as const };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      void queryClient.invalidateQueries({ queryKey: ["player-avatars"] });
    },
  });

  return { profile: query.data ?? null, loading: query.isLoading, save };
}

export function useHoleNotes(courseId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const key = ["hole-notes", userId, courseId];

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: async () => {
      const data = await graphqlRequest<
        { hole_notes: HoleNote[] },
        { userId: string; courseId: string }
      >(
        `query MyHoleNotes($userId: uuid!, $courseId: String!) {
          hole_notes(where: {user_id: {_eq: $userId}, course_id: {_eq: $courseId}}) {
            id user_id course_id hole tee_club target_line green_note target_score notes created_at updated_at
          }
        }`,
        { userId: userId!, courseId },
      );
      return data.hole_notes;
    },
  });

  const byHole = useMemo(() => {
    const map = new Map<number, HoleNote>();
    for (const note of query.data ?? []) map.set(note.hole, note);
    return map;
  }, [query.data]);

  const save = useMutation({
    mutationFn: async ({ hole, draft }: { hole: number; draft: HoleNoteDraft }) => {
      await graphqlRequest(
        `mutation SaveHoleNote($object: hole_notes_insert_input!) {
          insert_hole_notes_one(
            object: $object,
            on_conflict: {
              constraint: hole_notes_user_id_course_id_hole_key,
              update_columns: [tee_club, target_line, green_note, target_score, notes]
            }
          ) { id }
        }`,
        { object: { course_id: courseId, hole, ...draft } },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const noteFor = useCallback((hole: number) => byHole.get(hole) ?? null, [byHole]);

  return { notes: query.data ?? [], noteFor, save, loading: query.isLoading };
}

export function useRoundPlan(roundSlug: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const key = ["round-plan", userId, roundSlug];

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: async () => {
      const data = await graphqlRequest<
        { round_plans: RoundPlan[] },
        { userId: string; roundSlug: string }
      >(
        `query MyRoundPlan($userId: uuid!, $roundSlug: String!) {
          round_plans(
            where: {user_id: {_eq: $userId}, round_slug: {_eq: $roundSlug}},
            limit: 1
          ) { id user_id round_slug plan created_at updated_at }
        }`,
        { userId: userId!, roundSlug },
      );
      return data.round_plans[0] ?? null;
    },
  });

  const save = useMutation({
    mutationFn: async (plan: string) => {
      await graphqlRequest(
        `mutation SaveRoundPlan($object: round_plans_insert_input!) {
          insert_round_plans_one(
            object: $object,
            on_conflict: {
              constraint: round_plans_user_id_round_slug_key,
              update_columns: [plan]
            }
          ) { id }
        }`,
        { object: { round_slug: roundSlug, plan } },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return { plan: query.data?.plan ?? "", loading: query.isLoading, save };
}
