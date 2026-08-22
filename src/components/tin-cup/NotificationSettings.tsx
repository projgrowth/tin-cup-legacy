import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  disablePush,
  enablePush,
  getPushEligibility,
  loadNotificationPreferences,
  pushEnabled,
  saveNotificationPreferences,
  sendTestNotification,
  type NotificationPreference,
} from "@/lib/push-notifications";
import { trackProductEvent } from "@/lib/product-analytics";

const categories: Array<{
  key: keyof Pick<
    NotificationPreference,
    | "tee_reminders"
    | "my_match"
    | "mentions"
    | "organizer_announcements"
    | "match_reviews"
    | "lead_changes"
    | "final_result"
  >;
  label: string;
  detail: string;
}> = [
  { key: "tee_reminders", label: "Tee reminders", detail: "A useful heads-up before your round" },
  { key: "my_match", label: "My match", detail: "When your official result posts" },
  { key: "mentions", label: "Direct mentions", detail: "When a player tags you" },
  {
    key: "organizer_announcements",
    label: "Announcements",
    detail: "Pinned updates from organizers",
  },
  { key: "match_reviews", label: "Review alerts", detail: "Result questions that need attention" },
  { key: "lead_changes", label: "Lead changes", detail: "Only meaningful Cup swings" },
  { key: "final_result", label: "Final result", detail: "The Cup winner and recap" },
];

export function NotificationSettings({ userId }: { userId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const eligibility = typeof window === "undefined" ? null : getPushEligibility();
  useEffect(() => {
    void Promise.all([pushEnabled(userId), loadNotificationPreferences(userId)])
      .then(([push, next]) => {
        setEnabled(push);
        setPreferences(next);
      })
      .catch(() => setEnabled(false));
  }, [userId]);
  return (
    <section className="surface space-y-3 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-hunter/10 text-hunter">
          {enabled ? <Bell className="size-5" /> : <BellOff className="size-5" />}
        </span>
        <div>
          <h2 className="t-section text-foreground">Weekend alerts</h2>
          <p className="t-micro mt-1 text-muted-foreground">
            Opt in for tee reminders, your match, direct mentions, organizer announcements, review
            alerts, lead changes, and the final result. Never every score.
          </p>
        </div>
      </div>
      {eligibility?.reason && (
        <p className="t-micro rounded-xl bg-secondary/50 px-3 py-2.5 text-muted-foreground">
          {eligibility.reason}
        </p>
      )}
      <button
        type="button"
        disabled={
          busy ||
          !eligibility?.supported ||
          !eligibility.secure ||
          eligibility.permission === "denied"
        }
        onClick={async () => {
          setBusy(true);
          try {
            if (enabled) {
              await disablePush(userId);
              setEnabled(false);
              toast.message("Weekend alerts turned off");
            } else {
              await enablePush(userId);
              setEnabled(true);
              setPreferences(await loadNotificationPreferences(userId));
              void trackProductEvent("notification_opt_in", { result: "enabled" });
              toast.success("Weekend alerts are on");
            }
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not update alerts");
          } finally {
            setBusy(false);
          }
        }}
        className="press btn-quiet t-body flex min-h-11 w-full items-center justify-center gap-2"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {enabled ? "Turn off alerts" : "Enable weekend alerts"}
      </button>
      {enabled && (
        <div className="space-y-3 border-t border-border pt-3">
          <fieldset>
            <legend className="t-micro text-foreground/75">Choose your alerts</legend>
            <div className="mt-2 divide-y divide-border rounded-xl border border-border px-3">
              {categories.map((item) => (
                <label key={item.key} className="flex min-h-14 items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {item.label}
                    </span>
                    <span className="t-micro block">{item.detail}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences[item.key]}
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        [item.key]: event.target.checked,
                      }))
                    }
                    className="size-5"
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="t-micro text-foreground/75">Quiet hours</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="t-micro">
                From
                <input
                  type="time"
                  value={preferences.quiet_start ?? ""}
                  onChange={(event) =>
                    setPreferences((current) => ({
                      ...current,
                      quiet_start: event.target.value || null,
                    }))
                  }
                  className="control mt-1 min-h-11 w-full text-base"
                />
              </label>
              <label className="t-micro">
                Until
                <input
                  type="time"
                  value={preferences.quiet_end ?? ""}
                  onChange={(event) =>
                    setPreferences((current) => ({
                      ...current,
                      quiet_end: event.target.value || null,
                    }))
                  }
                  className="control mt-1 min-h-11 w-full text-base"
                />
              </label>
            </div>
            <p className="t-micro mt-1">
              Uses {Intl.DateTimeFormat().resolvedOptions().timeZone || "this device’s timezone"}.
              Urgent organizer alerts remain queued until quiet hours end.
            </p>
          </fieldset>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const saved = await saveNotificationPreferences(userId, {
                    ...preferences,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
                  });
                  setPreferences(saved);
                  toast.success("Alert preferences saved");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not save alerts");
                } finally {
                  setBusy(false);
                }
              }}
              className="press btn-primary flex min-h-11 items-center justify-center gap-2 text-sm font-semibold"
            >
              <Save className="size-4" /> Save alerts
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await sendTestNotification();
                  void trackProductEvent("notification_test", { result: "sent" });
                  toast.success("Test notification sent");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not send a test");
                } finally {
                  setBusy(false);
                }
              }}
              className="press btn-quiet flex min-h-11 items-center justify-center gap-2 text-sm font-semibold"
            >
              <Send className="size-4" /> Send test
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
