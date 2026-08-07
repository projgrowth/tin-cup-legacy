import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireNhostAuth } from "@/integrations/nhost/auth-middleware";

export type MemberRow = {
  userId: string;
  email: string;
  displayName: string;
  roles: string[];
};

async function db<TData, TVariables extends Record<string, unknown> = Record<string, never>>(
  query: string,
  variables?: TVariables,
) {
  const { adminGraphqlRequest } = await import("@/integrations/nhost/admin.server");
  return adminGraphqlRequest<TData, TVariables>(query, variables);
}

async function assertAdmin(userId: string) {
  const result = await db<{ user_roles: Array<{ id: string }> }, { userId: string }>(
    `query AssertAdmin($userId: uuid!) {
      user_roles(where: {user_id: {_eq: $userId}, role: {_eq: admin}}, limit: 1) { id }
    }`,
    { userId },
  );
  if (result.user_roles.length === 0) throw new Error("Admin access required");
}

export const getRoleSetup = createServerFn({ method: "GET" })
  .middleware([requireNhostAuth])
  .handler(async ({ context }) => {
    const result = await db<
      { admins: Array<{ id: string }>; mine: Array<{ role: string }> },
      { userId: string }
    >(
      `query RoleSetup($userId: uuid!) {
        admins: user_roles(where: {role: {_eq: admin}}, limit: 1) { id }
        mine: user_roles(where: {user_id: {_eq: $userId}}) { role }
      }`,
      { userId: context.userId },
    );
    const roles = result.mine.map((row) => row.role);
    return {
      adminExists: result.admins.length > 0,
      isAdmin: roles.includes("admin"),
      canScore: roles.includes("admin") || roles.includes("captain"),
    };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireNhostAuth])
  .handler(async ({ context }) => {
    const allowlist = (process.env.INITIAL_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    if (!allowlist.includes(context.userEmail.toLowerCase())) {
      throw new Error("This account is not configured as an initial admin");
    }
    const result = await db<{ user_roles: Array<{ id: string }> }>(
      `query ExistingAdmin { user_roles(where: {role: {_eq: admin}}, limit: 1) { id } }`,
    );
    if (result.user_roles.length > 0) throw new Error("An admin already exists");
    await db<{ insert_user_roles_one: { id: string } }, { userId: string }>(
      `mutation ClaimAdmin($userId: uuid!) {
        insert_user_roles_one(object: {user_id: $userId, role: admin}) { id }
      }`,
      { userId: context.userId },
    );
    return { ok: true as const };
  });

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireNhostAuth])
  .handler(async ({ context }): Promise<MemberRow[]> => {
    await assertAdmin(context.userId);
    const result = await db<{
      users: Array<{ id: string; email: string | null; displayName: string }>;
      user_roles: Array<{ user_id: string; role: string }>;
      profiles: Array<{ id: string; display_name: string }>;
    }>(`query Members {
      users(order_by: {createdAt: asc}) { id email displayName }
      user_roles { user_id role }
      profiles { id display_name }
    }`);
    const names = new Map(result.profiles.map((row) => [row.id, row.display_name]));
    return result.users.map((user) => ({
      userId: user.id,
      email: user.email ?? "",
      displayName: names.get(user.id) || user.displayName || "",
      roles: result.user_roles.filter((row) => row.user_id === user.id).map((row) => row.role),
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
  .middleware([requireNhostAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    if (!data.grant && data.userId === context.userId && data.role === "admin") {
      throw new Error("You can't remove your own admin access");
    }
    if (data.grant) {
      await db(
        `mutation GrantRole($object: user_roles_insert_input!) {
          insert_user_roles_one(
            object: $object,
            on_conflict: {constraint: user_roles_user_id_role_key, update_columns: []}
          ) { id }
        }`,
        { object: { user_id: data.userId, role: data.role } },
      );
    } else {
      await db(
        `mutation RevokeRole($userId: uuid!, $role: app_role_enum!) {
          delete_user_roles(where: {user_id: {_eq: $userId}, role: {_eq: $role}}) { affected_rows }
        }`,
        { userId: data.userId, role: data.role },
      );
    }
    return { ok: true as const };
  });

export const syncMyCaptainAccess = createServerFn({ method: "POST" })
  .middleware([requireNhostAuth])
  .handler(async ({ context }) => {
    const allowlist = (process.env.CAPTAIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const emailMatch = allowlist.includes(context.userEmail.toLowerCase());
    if (!emailMatch) {
      return { granted: false as const, reason: "not_allowlisted" as const };
    }
    await db(
      `mutation GrantCaptain($object: user_roles_insert_input!) {
        insert_user_roles_one(
          object: $object,
          on_conflict: {constraint: user_roles_user_id_role_key, update_columns: []}
        ) { id }
      }`,
      { object: { user_id: context.userId, role: "captain" } },
    );
    return {
      granted: true as const,
      reason: "email" as const,
    };
  });
