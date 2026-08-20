import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type OutboxKind =
  | "tee_reminder"
  | "my_match"
  | "mention"
  | "lead_change"
  | "final_result"
  | "organizer_announcement"
  | "match_review";
type OutboxRow = {
  id: string;
  kind: OutboxKind;
  recipient_id: string | null;
  payload: Record<string, unknown>;
  attempts: number;
};

const preferenceColumn: Record<OutboxKind, string> = {
  tee_reminder: "tee_reminders",
  my_match: "my_match",
  mention: "mentions",
  lead_change: "lead_changes",
  final_result: "final_result",
  organizer_announcement: "organizer_announcements",
  match_review: "match_reviews",
};

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function notificationFor(row: OutboxRow) {
  const title: Record<OutboxKind, string> = {
    tee_reminder: "Your Tin Cup tee time is coming up",
    my_match: "Your match result is in",
    mention: "You were mentioned in Weekend Story",
    lead_change: "The Cup lead changed",
    final_result: "The Tin Cup is final",
    organizer_announcement: "An organizer posted an announcement",
    match_review: "A match result needs review",
  };
  return {
    title: title[row.kind],
    body: String(row.payload.body ?? "Open Tin Cup for the latest update."),
    url: String(row.payload.url ?? "/"),
    tag: `tin-cup-${row.id}`,
  };
}

function pairingNames(value: string | null): string[] {
  return (value ?? "")
    .split(/[/,&+]|\band\b/i)
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
}

function timeMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function minutesInZone(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function quietUntil(preference: Record<string, unknown>, now = new Date()): Date | null {
  const start = timeMinutes(String(preference.quiet_start ?? ""));
  const end = timeMinutes(String(preference.quiet_end ?? ""));
  if (start == null || end == null || start === end) return null;
  const timezone = String(preference.timezone ?? "America/New_York");
  const current = minutesInZone(now, timezone);
  const quiet = start < end ? current >= start && current < end : current >= start || current < end;
  if (!quiet) return null;
  for (let step = 1; step <= 288; step += 1) {
    const candidate = new Date(now.getTime() + step * 5 * 60_000);
    const minute = minutesInZone(candidate, timezone);
    const stillQuiet =
      start < end ? minute >= start && minute < end : minute >= start || minute < end;
    if (!stillQuiet) return candidate;
  }
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

async function resolveRecipients(
  supabase: ReturnType<typeof createClient>,
  row: OutboxRow,
): Promise<string[]> {
  if (row.recipient_id) return [row.recipient_id];
  if (row.kind === "match_review") {
    const { data } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["captain", "admin"]);
    return [...new Set((data ?? []).map((item) => item.user_id))];
  }
  if (row.kind !== "my_match") {
    const { data } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq(preferenceColumn[row.kind], true);
    return (data ?? []).map((item) => item.user_id);
  }

  const matchId = String(row.payload.matchId ?? "");
  const { data: match } = await supabase
    .from("matches")
    .select("side_a, side_b")
    .eq("id", matchId)
    .maybeSingle();
  const named = new Set([...pairingNames(match?.side_a), ...pairingNames(match?.side_b)]);
  if (named.size === 0) return [];
  const [{ data: players }, { data: profiles }] = await Promise.all([
    supabase.from("players").select("id, name"),
    supabase.from("profiles").select("id, player_id").not("player_id", "is", null),
  ]);
  const playerIds = new Set(
    (players ?? [])
      .filter((player) => {
        const full = player.name.trim().toLowerCase();
        const first = full.split(/\s+/)[0];
        return named.has(full) || (first && named.has(first));
      })
      .map((player) => player.id),
  );
  return (profiles ?? [])
    .filter((profile) => profile.player_id && playerIds.has(profile.player_id))
    .map((profile) => profile.id);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
    webpush.setVapidDetails(
      required("VAPID_SUBJECT"),
      required("VAPID_PUBLIC_KEY"),
      required("VAPID_PRIVATE_KEY"),
    );

    const { data, error } = await supabase
      .from("notification_outbox")
      .select("id, kind, recipient_id, payload, attempts")
      .in("status", ["pending", "failed"])
      .lte("available_at", new Date().toISOString())
      .lt("attempts", 5)
      .order("created_at")
      .limit(50);
    if (error) throw error;

    let delivered = 0;
    let failed = 0;
    for (const row of (data ?? []) as OutboxRow[]) {
      await supabase
        .from("notification_outbox")
        .update({ status: "sending", attempts: row.attempts + 1 })
        .eq("id", row.id);

      const recipients = await resolveRecipients(supabase, row);

      const { data: preferences } = await supabase
        .from("notification_preferences")
        .select("*")
        .in("user_id", recipients.length ? recipients : ["00000000-0000-0000-0000-000000000000"]);
      const allowed = new Set(
        (preferences ?? [])
          .filter((item) => Boolean(item[preferenceColumn[row.kind]]))
          .map((item) => item.user_id),
      );
      const preferenceByUser = new Map((preferences ?? []).map((item) => [item.user_id, item]));
      const subscriptions =
        allowed.size === 0
          ? []
          : ((
              await supabase
                .from("push_subscriptions")
                .select("id, user_id, endpoint, p256dh, auth, failure_count")
                .in("user_id", [...allowed])
                .eq("enabled", true)
            ).data ?? []);

      const { data: receipts } = await supabase
        .from("notification_delivery_receipts")
        .select("subscription_id")
        .eq("outbox_id", row.id);
      const deliveredSubscriptions = new Set(
        (receipts ?? []).map((receipt) => receipt.subscription_id),
      );

      let rowFailed = false;
      const deferredUntil: Date[] = [];
      for (const subscription of subscriptions) {
        if (deliveredSubscriptions.has(subscription.id)) continue;
        const defer = quietUntil(preferenceByUser.get(subscription.user_id) ?? {});
        if (defer) {
          deferredUntil.push(defer);
          continue;
        }
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify(notificationFor(row)),
            { TTL: 60 * 60 * 6 },
          );
          await supabase
            .from("push_subscriptions")
            .update({ failure_count: 0, last_success_at: new Date().toISOString() })
            .eq("id", subscription.id);
          delivered += 1;
          await supabase.from("notification_delivery_receipts").upsert({
            outbox_id: row.id,
            subscription_id: subscription.id,
          });
        } catch (cause) {
          rowFailed = true;
          const statusCode = Number((cause as { statusCode?: number }).statusCode ?? 0);
          const expired = statusCode === 404 || statusCode === 410;
          await supabase
            .from("push_subscriptions")
            .update({
              enabled: expired ? false : true,
              failure_count: Number(subscription.failure_count ?? 0) + 1,
            })
            .eq("id", subscription.id);
          if (expired) {
            await supabase.from("notification_delivery_receipts").upsert({
              outbox_id: row.id,
              subscription_id: subscription.id,
            });
          }
        }
      }

      if (rowFailed) {
        failed += 1;
        const nextAttempt = new Date(Date.now() + Math.min(60, 2 ** row.attempts) * 60_000);
        await supabase
          .from("notification_outbox")
          .update({
            status: "failed",
            available_at: nextAttempt.toISOString(),
            last_error: "One or more deliveries failed",
          })
          .eq("id", row.id);
      } else if (deferredUntil.length > 0) {
        deferredUntil.sort((a, b) => a.getTime() - b.getTime());
        await supabase
          .from("notification_outbox")
          .update({
            status: "pending",
            available_at: deferredUntil[0].toISOString(),
            last_error: null,
          })
          .eq("id", row.id);
      } else {
        await supabase
          .from("notification_outbox")
          .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
          .eq("id", row.id);
      }
    }

    return Response.json({ processed: data?.length ?? 0, delivered, failed });
  } catch (cause) {
    return Response.json(
      { error: cause instanceof Error ? cause.message : "Push dispatch failed" },
      { status: 500 },
    );
  }
});
