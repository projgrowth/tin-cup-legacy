export type RuntimeMode = "production" | "preview" | "local";

export function getRuntimeMode(): RuntimeMode {
  const configured = String(import.meta.env.VITE_RUNTIME_MODE ?? "").toLowerCase();
  if (configured === "preview" || configured === "local" || configured === "production") {
    return configured;
  }
  // Vite's DEV flag is identical during server render and hydration. Hostname
  // sniffing here caused local-only feature markup to disagree across SSR.
  if (import.meta.env.DEV) {
    return "local";
  }
  return "production";
}

export function isPreviewMode(): boolean {
  return getRuntimeMode() === "preview";
}

export function assertMutationAllowed(action = "save"): void {
  if (isPreviewMode()) {
    throw new Error(
      `Preview is read-only. ${action} was simulated and no tournament data changed.`,
    );
  }
}

export const PREVIEW_STORAGE_PREFIX = "tin-cup-preview-v1";

export type SocialFeature =
  | "clubhouse"
  | "customization"
  | "predictions"
  | "confirmations"
  | "polls"
  | "checkins"
  | "prompts"
  | "achievements"
  | "gallery"
  | "analytics";

const FEATURE_ENV: Record<SocialFeature, string | undefined> = {
  clubhouse: import.meta.env.VITE_CLUBHOUSE_V1,
  customization: import.meta.env.VITE_CUSTOMIZATION_V1,
  predictions: import.meta.env.VITE_MATCH_PREDICTIONS_V1,
  confirmations: import.meta.env.VITE_MATCH_CONFIRMATIONS_V1,
  polls: import.meta.env.VITE_CLUBHOUSE_POLLS_V1,
  checkins: import.meta.env.VITE_PLAYER_CHECKINS_V1,
  prompts: import.meta.env.VITE_ENGAGEMENT_PROMPTS_V1,
  achievements: import.meta.env.VITE_ACHIEVEMENTS_V1,
  gallery: import.meta.env.VITE_MEDIA_GALLERY_V1,
  analytics: import.meta.env.VITE_PRODUCT_ANALYTICS_V1,
};

/** Preview/local exercise every staged feature; production requires an explicit flag. */
export function socialFeatureEnabled(feature: SocialFeature): boolean {
  if (getRuntimeMode() !== "production") return true;
  return String(FEATURE_ENV[feature] ?? "").toLowerCase() === "true";
}
