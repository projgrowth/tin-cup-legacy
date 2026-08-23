import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_EXPERIENCE_PREFERENCES,
  normalizeHomeModules,
  type ExperiencePreferences,
} from "@/lib/social-platform";
import { isPreviewMode, PREVIEW_STORAGE_PREFIX, socialFeatureEnabled } from "@/lib/runtime-mode";

const STORAGE_KEY = `${PREVIEW_STORAGE_PREFIX}:experience`;

function localRead(): ExperiencePreferences {
  try {
    const value = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    ) as Partial<ExperiencePreferences> | null;
    if (!value) return DEFAULT_EXPERIENCE_PREFERENCES;
    return {
      appearance:
        value.appearance === "night" || value.appearance === "team" ? value.appearance : "heritage",
      compactFeed: Boolean(value.compactFeed),
      homeModules: normalizeHomeModules(value.homeModules),
      layoutMode: value.layoutMode === "custom" ? "custom" : "auto",
    };
  } catch {
    return DEFAULT_EXPERIENCE_PREFERENCES;
  }
}

export function useExperiencePreferences(userId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["experience-preferences", userId],
    enabled: Boolean(userId && socialFeatureEnabled("customization")),
    queryFn: async (): Promise<ExperiencePreferences> => {
      if (isPreviewMode()) return localRead();
      const { data, error } = await supabase
        .from("user_experience_preferences")
        .select("appearance, home_modules, compact_feed, layout_mode")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_EXPERIENCE_PREFERENCES;
      return {
        appearance:
          data.appearance === "night" || data.appearance === "team" ? data.appearance : "heritage",
        compactFeed: data.compact_feed,
        homeModules: normalizeHomeModules(data.home_modules),
        layoutMode: data.layout_mode === "custom" ? "custom" : "auto",
      };
    },
    retry: false,
  });
  const preferences = query.data ?? DEFAULT_EXPERIENCE_PREFERENCES;

  const save = useMutation({
    mutationFn: async (next: ExperiencePreferences) => {
      if (!userId) throw new Error("Sign in to save your layout.");
      const normalized = { ...next, homeModules: normalizeHomeModules(next.homeModules) };
      if (isPreviewMode()) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
      }
      const { error } = await supabase.from("user_experience_preferences").upsert({
        user_id: userId,
        appearance: normalized.appearance,
        home_modules: normalized.homeModules,
        compact_feed: normalized.compactFeed,
        layout_mode: normalized.layoutMode,
      });
      if (error) throw error;
      return normalized;
    },
    onSuccess: (next) => queryClient.setQueryData(["experience-preferences", userId], next),
  });

  return { ...query, preferences, save };
}
