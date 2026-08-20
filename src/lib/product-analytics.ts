import { supabase } from "@/integrations/supabase/client";
import { isPreviewMode, PREVIEW_STORAGE_PREFIX, socialFeatureEnabled } from "@/lib/runtime-mode";

export type ProductEventName =
  | "home_action"
  | "clubhouse_post"
  | "poll_created"
  | "poll_voted"
  | "checkin_changed"
  | "gallery_opened"
  | "calendar_downloaded"
  | "notification_opt_in"
  | "notification_test"
  | "pwa_install"
  | "offline_conflict";

const PREVIEW_KEY = `${PREVIEW_STORAGE_PREFIX}:product-events`;
const ALLOWED_METADATA = new Set(["kind", "mode", "source", "result", "category"]);

function safeMetadata(value: Record<string, string | number | boolean | null> = {}) {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => ALLOWED_METADATA.has(key))
      .map(([key, item]) => [key, typeof item === "string" ? item.slice(0, 64) : item]),
  );
}

/** First-party, content-free telemetry. Never include names, message bodies, email, or media. */
export async function trackProductEvent(
  name: ProductEventName,
  metadata?: Record<string, string | number | boolean | null>,
) {
  if (!socialFeatureEnabled("analytics") || typeof window === "undefined") return;
  const row = {
    name,
    route: window.location.pathname,
    metadata: safeMetadata(metadata),
    created_at: new Date().toISOString(),
  };
  if (isPreviewMode()) {
    try {
      const previous = JSON.parse(localStorage.getItem(PREVIEW_KEY) ?? "[]") as unknown[];
      localStorage.setItem(PREVIEW_KEY, JSON.stringify([...previous.slice(-99), row]));
    } catch {
      // Analytics must never block the product.
    }
    return;
  }
  await supabase.from("product_events").insert(row);
}
