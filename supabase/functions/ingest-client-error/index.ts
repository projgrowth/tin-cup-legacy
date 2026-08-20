import { createClient } from "npm:@supabase/supabase-js@2";

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function sanitize(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/[?&](code|token|email)=[^&\s]+/gi, "$1=[redacted]")
    .slice(0, max);
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const body = await request.json();
    const route = sanitize(body.route || "/", 120);
    const release = sanitize(body.release || "unknown", 80);
    const browser = sanitize(body.browserCategory || "unknown", 40);
    const message = sanitize(body.message || "Client error", 240);
    const stack = sanitize(body.stack || "", 600) || null;
    const fingerprint = `${request.headers.get("x-forwarded-for") ?? "unknown"}|${request.headers.get("user-agent") ?? "unknown"}`;
    const sessionHash = await digest(fingerprint);
    const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
    const since = new Date(Date.now() - 2 * 60_000).toISOString();
    const recent = await supabase
      .from("client_error_events")
      .select("id", { count: "exact", head: true })
      .eq("session_hash", sessionHash)
      .gt("created_at", since);
    if ((recent.count ?? 0) >= 5)
      return Response.json({ accepted: false, reason: "rate_limited" }, { status: 429 });
    const result = await supabase
      .from("client_error_events")
      .insert({
        route,
        release,
        browser_category: browser,
        message,
        stack_excerpt: stack,
        session_hash: sessionHash,
      });
    if (result.error) throw result.error;
    return Response.json({ accepted: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Ingestion failed" },
      { status: 500 },
    );
  }
});
