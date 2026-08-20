import { supabase } from "./client";
import type { Database } from "./types";
import { isMissingColumnError } from "@/lib/profile-identity";
import { assertMutationAllowed } from "@/lib/runtime-mode";

export type SupabaseDataError = Error & { code?: string };

function fail(error: { message: string; code?: string } | null): never {
  const thrown = new Error(error?.message || "Supabase request failed") as SupabaseDataError;
  thrown.code = error?.code;
  throw thrown;
}

async function userId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

type PublicTable = keyof Database["public"]["Tables"];
type QueuedPublicTable = "matches" | "side_bets" | "trophies";

async function rows(table: PublicTable, columns = "*", configure?: (query: any) => any) {
  let query: any = supabase.from(table).select(columns);
  if (configure) query = configure(query);
  const { data, error } = await query;
  if (error) fail(error);
  return data ?? [];
}

/**
 * Temporary Hasura-shaped compatibility adapter for the Nhost rollback window.
 * Call sites keep their typed response contracts while all I/O is Supabase/PostgREST.
 */
export async function graphqlRequest<
  TData,
  TVariables extends Record<string, unknown> = Record<string, never>,
>(query: string, variables = {} as TVariables): Promise<TData> {
  const operation = query.match(/(?:query|mutation)\s+(\w+)/)?.[1] ?? "";
  const v = variables as Record<string, any>;

  if (operation === "TournamentHub") {
    const [teams, players, rounds, matches, side_bets, trophies] = await Promise.all([
      rows("teams", "id,slug,name,captain_name,sort_order", (q) => q.order("sort_order")),
      rows("players", "id,team_id,name,is_captain,sort_order", (q) => q.order("sort_order")),
      rows(
        "rounds",
        "id,slug,day_label,play_date,course,tee_window,format,format_detail,points,meal,sort_order",
        (q) => q.order("sort_order"),
      ),
      rows(
        "matches",
        "id,round_id,label,points,result,side_a,side_b,sort_order,revision,updated_at",
        (q) => q.order("sort_order"),
      ),
      rows(
        "side_bets",
        "id,kind,label,round_id,hole,amount,player_name,team_slug,distance,sort_order,revision,updated_at",
        (q) => q.order("sort_order"),
      ),
      rows(
        "trophies",
        "id,slug,name,description,winner_name,winner_note,sort_order,revision,created_at,updated_at",
        (q) => q.order("sort_order"),
      ),
    ]);
    return { teams, players, rounds, matches, side_bets, trophies } as TData;
  }

  if (operation === "MyRosterSpot" || operation === "MyProfile") {
    const full =
      "id,display_name,player_id,avatar_path,status_text,flair,created_at,updated_at";
    const legacy = "id,display_name,player_id,avatar_path,created_at,updated_at";
    const first = await supabase.from("profiles").select(full).eq("id", v.id).maybeSingle();
    if (!first.error) {
      return { profiles_by_pk: dataOrPlayerId(operation, first.data) } as TData;
    }
    if (!isMissingColumnError(first.error)) fail(first.error);
    const fallback = await supabase.from("profiles").select(legacy).eq("id", v.id).maybeSingle();
    if (fallback.error) fail(fallback.error);
    const row = fallback.data
      ? { ...fallback.data, status_text: null, flair: null }
      : null;
    return { profiles_by_pk: dataOrPlayerId(operation, row) } as TData;
  }

  if (operation === "MyRoles") {
    return {
      user_roles: await rows("user_roles", "role", (q) => q.eq("user_id", v.userId)),
    } as TData;
  }

  if (operation === "CreateMyProfile") {
    assertMutationAllowed("Profile creation");
    const id = await userId();
    if (!id) throw new Error("Sign in again");
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id, display_name: v.displayName }, { onConflict: "id", ignoreDuplicates: true })
      .select("id")
      .maybeSingle();
    if (error && error.code !== "23505") fail(error);
    return { insert_profiles_one: data ?? { id } } as TData;
  }

  if (operation === "SaveMyProfile") {
    assertMutationAllowed("Profile update");
    const id = await userId();
    if (!id) throw new Error("Sign in again");
    const object = { id, ...v.object };
    let result = await supabase.from("profiles").upsert(object).select("id").single();
    if (result.error && isMissingColumnError(result.error)) {
      const { status_text: _status, flair: _flair, ...legacy } = object;
      result = await supabase.from("profiles").upsert(legacy).select("id").single();
    }
    if (result.error) fail(result.error);
    return { insert_profiles_one: result.data } as TData;
  }

  if (operation === "MyHoleNotes") {
    return {
      hole_notes: await rows("hole_notes", "*", (q) =>
        q.eq("user_id", v.userId).eq("course_id", v.courseId).order("hole"),
      ),
    } as TData;
  }
  if (operation === "SaveHoleNote") {
    assertMutationAllowed("Course note save");
    const id = await userId();
    if (!id) throw new Error("Sign in again");
    const object = { user_id: id, ...v.object };
    const { data, error } = await supabase
      .from("hole_notes")
      .upsert(object, { onConflict: "user_id,course_id,hole" })
      .select("id")
      .single();
    if (error) fail(error);
    return { insert_hole_notes_one: data } as TData;
  }
  if (operation === "MyRoundPlan") {
    return {
      round_plans: await rows("round_plans", "*", (q) =>
        q.eq("user_id", v.userId).eq("round_slug", v.roundSlug).limit(1),
      ),
    } as TData;
  }
  if (operation === "SaveRoundPlan") {
    assertMutationAllowed("Round plan save");
    const id = await userId();
    if (!id) throw new Error("Sign in again");
    const { data, error } = await supabase
      .from("round_plans")
      .upsert({ user_id: id, ...v.object }, { onConflict: "user_id,round_slug" })
      .select("id")
      .single();
    if (error) fail(error);
    return { insert_round_plans_one: data } as TData;
  }

  if (operation === "AvatarMap") {
    return {
      profiles: await rows("profiles", "id,player_id,display_name,avatar_path", (q) =>
        q.not("player_id", "is", null),
      ),
    } as TData;
  }
  if (operation === "ActivityFeed" || operation === "ActivityFeedLite") {
    const profileCols =
      operation === "ActivityFeed"
        ? "id,display_name,player_id,avatar_path,created_at,updated_at"
        : "id,display_name,player_id,avatar_path";
    const [profiles, photos] = await Promise.all([
      rows("profiles", profileCols, (q) => q.not("player_id", "is", null)),
      rows("photos", "id,caption,created_at,uploaded_by,storage_path", (q) =>
        q.order("created_at", { ascending: false }).limit(12),
      ),
    ]);
    return { profiles, photos } as TData;
  }
  if (operation === "PhotoVault") {
    const [photos, profiles, players] = await Promise.all([
      rows("photos", "id,caption,storage_path,uploaded_by,created_at", (q) =>
        q.order("created_at", { ascending: false }).limit(60),
      ),
      rows("profiles", "id,display_name,player_id").catch(() => []),
      rows("players", "id,name"),
    ]);
    return { photos, profiles, players } as TData;
  }
  if (operation === "AddPhoto") {
    assertMutationAllowed("Photo upload");
    const id = await userId();
    if (!id) throw new Error("Sign in again");
    const { data, error } = await supabase
      .from("photos")
      .insert({ storage_path: v.fileId, caption: v.caption, uploaded_by: id })
      .select("id")
      .single();
    if (error) fail(error);
    return { insert_photos_one: data } as TData;
  }
  if (operation === "RemovePhoto") {
    assertMutationAllowed("Photo removal");
    const { data, error } = await supabase
      .from("photos")
      .delete()
      .eq("id", v.id)
      .select("id")
      .maybeSingle();
    if (error) fail(error);
    return { delete_photos_by_pk: data } as TData;
  }

  if (operation === "QueueWrite") {
    const table = query.match(/update_(matches|side_bets|trophies)/)?.[1] as
      QueuedPublicTable | undefined;
    if (!table) throw new Error("Unsupported queued table");
    let update: any = supabase.from(table).update(v.patch).eq("id", v.where.id._eq);
    if (v.where.revision?._eq != null) update = update.eq("revision", v.where.revision._eq);
    if (v.where.updated_at?._eq != null) update = update.eq("updated_at", v.where.updated_at._eq);
    const { data, error } = await update.select("id");
    if (error) fail(error);
    return { [`update_${table}`]: { affected_rows: data?.length ?? 0 } } as TData;
  }

  throw new Error(`Unsupported Supabase compatibility operation: ${operation || "anonymous"}`);
}

export function subscribeGraphql(
  query: string,
  onData: () => void,
  onStatus?: (status: "ok" | "stale") => void,
): () => void {
  const tables: PublicTable[] = (
    [
      "matches",
      "side_bets",
      "trophies",
      "photos",
      "story_comments",
      "story_reactions",
      "story_reports",
      "match_predictions",
      "match_confirmations",
    ] as const
  ).filter((table) => query.includes(table));
  const channel = supabase.channel(`live:${tables.join(":")}:${crypto.randomUUID()}`);
  for (const table of tables) {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, onData);
  }
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") onStatus?.("ok");
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      onStatus?.("stale");
    }
  });
  return () => {
    void supabase.removeChannel(channel);
  };
}

function dataOrPlayerId(
  operation: string,
  row: { player_id?: string | null } | null,
) {
  if (operation === "MyRosterSpot") return row ? { player_id: row.player_id ?? null } : null;
  return row;
}
