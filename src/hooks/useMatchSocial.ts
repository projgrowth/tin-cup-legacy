import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { subscribeGraphql } from "@/integrations/supabase/graphql";
import {
  type MatchConfirmation,
  type MatchConfirmationState,
  type MatchPrediction,
  type MatchPredictionChoice,
} from "@/lib/social-platform";
import { normalizeCardNote } from "@/lib/the-card";
import { isPreviewMode, PREVIEW_STORAGE_PREFIX, socialFeatureEnabled } from "@/lib/runtime-mode";

const PREDICTION_KEY = `${PREVIEW_STORAGE_PREFIX}:match-predictions`;
const CONFIRMATION_KEY = `${PREVIEW_STORAGE_PREFIX}:match-confirmations`;

function localRead<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

function localWrite<T>(key: string, rows: T[]) {
  localStorage.setItem(key, JSON.stringify(rows));
}

export function useMatchSocial(userId?: string, playerId?: string | null) {
  const queryClient = useQueryClient();
  const predictionsEnabled = socialFeatureEnabled("predictions");
  const confirmationsEnabled = socialFeatureEnabled("confirmations");

  useEffect(() => {
    if (!predictionsEnabled && !confirmationsEnabled) return;
    return subscribeGraphql(
      `subscription MatchSocialLive {
          match_predictions { match_id updated_at }
          match_confirmations { match_id updated_at }
        }`,
      () => {
        void queryClient.invalidateQueries({ queryKey: ["match-predictions"] });
        void queryClient.invalidateQueries({ queryKey: ["match-confirmations"] });
      },
    );
  }, [queryClient, predictionsEnabled, confirmationsEnabled]);

  const predictions = useQuery({
    queryKey: ["match-predictions", userId],
    enabled: predictionsEnabled,
    queryFn: async (): Promise<MatchPrediction[]> => {
      if (isPreviewMode()) return localRead<MatchPrediction>(PREDICTION_KEY);
      const { data, error } = await supabase.from("match_predictions").select("*");
      if (error) throw error;
      return (data ?? []).map((row) => ({
        matchId: row.match_id,
        userId: row.user_id,
        choice: row.choice as MatchPredictionChoice,
        note: row.note ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },
    retry: false,
  });

  const confirmations = useQuery({
    queryKey: ["match-confirmations"],
    enabled: confirmationsEnabled,
    queryFn: async (): Promise<MatchConfirmation[]> => {
      if (isPreviewMode()) return localRead<MatchConfirmation>(CONFIRMATION_KEY);
      const { data, error } = await supabase.from("match_confirmations").select("*");
      if (error) throw error;
      return (data ?? []).map((row) => ({
        matchId: row.match_id,
        playerId: row.player_id,
        userId: row.user_id,
        state: row.state as MatchConfirmationState,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },
    retry: false,
  });

  const predict = useMutation({
    mutationFn: async ({
      matchIds,
      choice,
      note,
    }: {
      matchIds: string[];
      choice: MatchPredictionChoice;
      note?: string | null;
    }) => {
      if (!userId) throw new Error("Claim your player before taking a side.");
      if (matchIds.length === 0) throw new Error("This ticket is not on the board yet.");
      const cleaned = normalizeCardNote(note);
      const now = new Date().toISOString();
      if (isPreviewMode()) {
        let rows = localRead<MatchPrediction>(PREDICTION_KEY);
        for (const matchId of matchIds) {
          const previous = rows.find((row) => row.matchId === matchId && row.userId === userId);
          rows = rows.filter((row) => !(row.matchId === matchId && row.userId === userId));
          rows.push({
            matchId,
            userId,
            choice,
            note: note !== undefined ? cleaned : (previous?.note ?? null),
            createdAt: previous?.createdAt ?? now,
            updatedAt: now,
          });
        }
        localWrite(PREDICTION_KEY, rows);
        return;
      }
      for (const matchId of matchIds) {
        const payload: { match_id: string; user_id: string; choice: MatchPredictionChoice; note?: string | null } = {
          match_id: matchId,
          user_id: userId,
          choice,
        };
        if (note !== undefined) payload.note = cleaned;
        const { error } = await supabase.from("match_predictions").upsert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["match-predictions"] }),
  });

  const confirm = useMutation({
    mutationFn: async ({ matchId, state }: { matchId: string; state: MatchConfirmationState }) => {
      if (!userId || !playerId) throw new Error("Claim your player before confirming a result.");
      if (isPreviewMode()) {
        const now = new Date().toISOString();
        const rows = localRead<MatchConfirmation>(CONFIRMATION_KEY).filter(
          (row) => !(row.matchId === matchId && row.playerId === playerId),
        );
        localWrite(CONFIRMATION_KEY, [
          ...rows,
          { matchId, playerId, userId, state, createdAt: now, updatedAt: now },
        ]);
        return;
      }
      const { error } = await supabase.from("match_confirmations").upsert({
        match_id: matchId,
        player_id: playerId,
        user_id: userId,
        state,
      });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["match-confirmations"] }),
  });

  return {
    predictionsEnabled,
    confirmationsEnabled,
    predictions: predictions.data ?? [],
    confirmations: confirmations.data ?? [],
    unavailable: predictions.isError || confirmations.isError,
    predict,
    confirm,
  };
}
