import { createClient } from "npm:@supabase/supabase-js@2";

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const { data: rounds, error: roundsError } = await supabase
      .from("rounds")
      .select("id, day_label, course, play_date, tee_window")
      .eq("play_date", today);
    if (roundsError) throw roundsError;

    const { data: preferences, error: preferencesError } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("tee_reminders", true);
    if (preferencesError) throw preferencesError;

    let queued = 0;
    for (const round of rounds ?? []) {
      for (const preference of preferences ?? []) {
        const { error } = await supabase.from("notification_outbox").upsert(
          {
            kind: "tee_reminder",
            dedupe_key: `tee:${round.id}:${preference.user_id}`,
            recipient_id: preference.user_id,
            payload: {
              body: `${round.day_label} at ${round.course} · ${round.tee_window}`,
              url: "/schedule",
            },
          },
          { onConflict: "dedupe_key", ignoreDuplicates: true },
        );
        if (error) throw error;
        queued += 1;
      }
    }
    return Response.json({ rounds: rounds?.length ?? 0, queued });
  } catch (cause) {
    return Response.json(
      { error: cause instanceof Error ? cause.message : "Reminder enqueue failed" },
      { status: 500 },
    );
  }
});
