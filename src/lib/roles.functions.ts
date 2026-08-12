import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MemberRow = {
  userId: string;
  email: string;
  displayName: string;
  roles: string[];
};

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(userId: string) {
  const admin = await adminClient();
  const { data, error } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Admin access required");
}

function claimEmail(claims: Record<string, unknown>) {
  return typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
}

export const getRoleSetup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await adminClient();
    const [{ data: admins, error: adminsError }, { data: mine, error: mineError }] =
      await Promise.all([
        admin.from("user_roles").select("id").eq("role", "admin").limit(1),
        admin.from("user_roles").select("role").eq("user_id", context.userId),
      ]);
    if (adminsError) throw adminsError;
    if (mineError) throw mineError;
    const roles = (mine ?? []).map((row) => row.role);
    return {
      adminExists: (admins ?? []).length > 0,
      isAdmin: roles.includes("admin"),
      canScore: roles.includes("admin") || roles.includes("captain"),
    };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = claimEmail(context.claims as Record<string, unknown>);
    const allowlist = (process.env.INITIAL_ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (!email || !allowlist.includes(email)) {
      throw new Error("This account is not configured as an initial admin");
    }
    const admin = await adminClient();
    const { data: existing, error: selectError } = await admin
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);
    if (selectError) throw selectError;
    if ((existing ?? []).length > 0) throw new Error("An admin already exists");
    const { error } = await admin.from("user_roles").insert({
      user_id: context.userId,
      role: "admin",
    });
    if (error) throw error;
    return { ok: true as const };
  });

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MemberRow[]> => {
    await assertAdmin(context.userId);
    const admin = await adminClient();
    const [{ data: authData, error: authError }, { data: roles, error: rolesError }, { data: profiles, error: profilesError }] =
      await Promise.all([
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        admin.from("user_roles").select("user_id, role"),
        admin.from("profiles").select("id, display_name"),
      ]);
    if (authError) throw authError;
    if (rolesError) throw rolesError;
    if (profilesError) throw profilesError;
    const names = new Map((profiles ?? []).map((row) => [row.id, row.display_name]));
    return authData.users.map((user) => ({
      userId: user.id,
      email: user.email ?? "",
      displayName: names.get(user.id) ?? "",
      roles: (roles ?? []).filter((row) => row.user_id === user.id).map((row) => row.role),
    }));
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "captain", "player"]),
        grant: z.boolean(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    if (!data.grant && data.userId === context.userId && data.role === "admin") {
      throw new Error("You can't remove your own admin access");
    }
    const admin = await adminClient();
    const result = data.grant
      ? await admin.from("user_roles").upsert(
          { user_id: data.userId, role: data.role },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        )
      : await admin
          .from("user_roles")
          .delete()
          .eq("user_id", data.userId)
          .eq("role", data.role);
    if (result.error) throw result.error;
    return { ok: true as const };
  });

export const syncMyCaptainAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = claimEmail(context.claims as Record<string, unknown>);
    const allowlist = (process.env.CAPTAIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (!email || !allowlist.includes(email)) {
      return { granted: false as const, reason: "not_allowlisted" as const };
    }
    const admin = await adminClient();
    const { error } = await admin.from("user_roles").upsert(
      { user_id: context.userId, role: "captain" },
      { onConflict: "user_id,role", ignoreDuplicates: true },
    );
    if (error) throw error;
    return { granted: true as const, reason: "email" as const };
  });
