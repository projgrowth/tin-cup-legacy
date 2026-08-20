import { supabase } from "@/integrations/supabase/client";
import { isPreviewMode, PREVIEW_STORAGE_PREFIX } from "@/lib/runtime-mode";

export type NotificationPreference = {
  tee_reminders: boolean;
  my_match: boolean;
  mentions: boolean;
  lead_changes: boolean;
  final_result: boolean;
  organizer_announcements: boolean;
  match_reviews: boolean;
  quiet_start: string | null;
  quiet_end: string | null;
  timezone: string | null;
};
export type PushEligibility = {
  supported: boolean;
  secure: boolean;
  installed: boolean;
  permission: NotificationPermission | "unsupported";
  reason?: string;
};
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreference = {
  tee_reminders: true,
  my_match: true,
  mentions: true,
  lead_changes: true,
  final_result: true,
  organizer_announcements: true,
  match_reviews: true,
  quiet_start: null,
  quiet_end: null,
  timezone: null,
};
const PREVIEW_KEY = `${PREVIEW_STORAGE_PREFIX}:push`;

function decodeKey(value: string): Uint8Array<ArrayBuffer> {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
export function getPushEligibility(): PushEligibility {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return {
      supported: false,
      secure: false,
      installed: false,
      permission: "unsupported",
      reason: "Web Push is unavailable in this browser.",
    };
  }
  const installed =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const secure = window.isSecureContext;
  return {
    supported: true,
    secure,
    installed,
    permission: Notification.permission,
    reason: !secure
      ? "Notifications require HTTPS."
      : Notification.permission === "denied"
        ? "Notifications are blocked for Tin Cup. Re-enable them in this browser’s site settings, then reload."
        : /iPhone|iPad/i.test(navigator.userAgent) && !installed
          ? "On iPhone, add Tin Cup to the Home Screen first."
          : undefined,
  };
}
export async function enablePush(userId: string, preferences = DEFAULT_NOTIFICATION_PREFERENCES) {
  const eligibility = getPushEligibility();
  if (!eligibility.supported || !eligibility.secure)
    throw new Error(eligibility.reason || "Push unavailable");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");
  if (isPreviewMode()) {
    localStorage.setItem(PREVIEW_KEY, JSON.stringify({ enabled: true, userId, preferences }));
    return;
  }
  const publicKey = String(import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "");
  if (!publicKey) throw new Error("Push is not configured for this deployment.");
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) throw new Error("Install or reload Tin Cup before enabling notifications.");
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeKey(publicKey),
  });
  const json = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      user_agent: navigator.userAgent,
      enabled: true,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
  const preference = await supabase
    .from("notification_preferences")
    .upsert({ user_id: userId, ...preferences });
  if (preference.error) throw preference.error;
}
export async function disablePush(userId: string) {
  if (isPreviewMode()) {
    localStorage.removeItem(PREVIEW_KEY);
    return;
  }
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await supabase
      .from("push_subscriptions")
      .update({ enabled: false })
      .eq("user_id", userId)
      .eq("endpoint", subscription.endpoint);
    await subscription.unsubscribe();
  }
}
export async function pushEnabled(userId: string): Promise<boolean> {
  if (isPreviewMode()) return Boolean(localStorage.getItem(PREVIEW_KEY));
  if (!("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return false;
  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", subscription.endpoint)
    .eq("enabled", true);
  return Boolean(count);
}

export async function loadNotificationPreferences(userId: string): Promise<NotificationPreference> {
  if (isPreviewMode()) {
    try {
      const saved = JSON.parse(localStorage.getItem(PREVIEW_KEY) ?? "null") as {
        preferences?: NotificationPreference;
      } | null;
      return saved?.preferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
    } catch {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  }
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? { ...DEFAULT_NOTIFICATION_PREFERENCES, ...data } : DEFAULT_NOTIFICATION_PREFERENCES;
}

export async function saveNotificationPreferences(
  userId: string,
  preferences: NotificationPreference,
) {
  const normalized = {
    ...preferences,
    quiet_start: preferences.quiet_start || null,
    quiet_end: preferences.quiet_end || null,
    timezone: preferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || null,
  };
  if (isPreviewMode()) {
    const current = JSON.parse(localStorage.getItem(PREVIEW_KEY) ?? "{}") as Record<
      string,
      unknown
    >;
    localStorage.setItem(
      PREVIEW_KEY,
      JSON.stringify({ ...current, enabled: true, userId, preferences: normalized }),
    );
    return normalized;
  }
  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: userId, ...normalized });
  if (error) throw error;
  return normalized;
}

export async function sendTestNotification() {
  if (Notification.permission !== "granted") throw new Error("Enable notifications first.");
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    await registration.showNotification("Tin Cup alerts are ready", {
      body: "Tee times, your match, mentions, and the final result will arrive here.",
      icon: "/app-icon-512.png",
      data: { url: "/profile" },
      tag: "tin-cup-test",
    });
    return;
  }
  new Notification("Tin Cup alerts are ready", {
    body: "This device can receive your selected weekend alerts.",
  });
}
