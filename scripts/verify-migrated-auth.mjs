import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_FILE
  ? readFileSync(process.env.SUPABASE_SERVICE_ROLE_KEY_FILE, "utf8").trim()
  : process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const expectedUsers = new Set([
  "89aeaeb7-8032-450d-a60b-581c24696044",
  "ed6f78fd-b39c-4053-b81c-93be67f1ec0e",
]);
const expectedPhotoSha256 = "3dff65c674091f42a8e33ac905ec0667395cb568dbacd96d7f3ac645eedcb239";
const photoPath = "73d5867c-15a5-494b-b119-517b3747dbbb";

const service = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function requireData(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function createPasswordlessSession(email) {
  const link = await requireData(
    service.auth.admin.generateLink({ type: "magiclink", email }),
    "generate passwordless link",
  );
  const tokenHash = link.properties?.hashed_token;
  if (!tokenHash) throw new Error("Passwordless link did not include a token hash");

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const verified = await requireData(
    client.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" }),
    "verify passwordless link",
  );
  if (!verified.user || !verified.session)
    throw new Error("Passwordless verification returned no session");
  return { client, user: verified.user };
}

const listed = await requireData(
  service.auth.admin.listUsers({ page: 1, perPage: 50 }),
  "list users",
);
if (listed.users.length !== expectedUsers.size) {
  throw new Error(`Expected ${expectedUsers.size} migrated users, found ${listed.users.length}`);
}
for (const user of listed.users) {
  if (!expectedUsers.has(user.id)) throw new Error(`Unexpected auth user ${user.id}`);
  if (!user.email) throw new Error(`Migrated auth user ${user.id} has no email identity`);
}

const roleRows = await requireData(
  service.from("user_roles").select("user_id, role"),
  "read roles",
);
const adminIds = new Set(roleRows.filter((row) => row.role === "admin").map((row) => row.user_id));
if (adminIds.size !== 1)
  throw new Error(`Expected one migrated administrator, found ${adminIds.size}`);

const sessions = [];
for (const sourceUser of listed.users) {
  const session = await createPasswordlessSession(sourceUser.email);
  sessions.push(session);
  if (session.user.id !== sourceUser.id)
    throw new Error("Passwordless session changed the user UUID");

  const profile = await requireData(
    session.client.from("profiles").select("id, player_id").eq("id", sourceUser.id).single(),
    "read own profile",
  );
  if (profile.id !== sourceUser.id) throw new Error("Own-profile RLS returned the wrong profile");

  const visibleRoles = await requireData(
    session.client.from("user_roles").select("user_id, role"),
    "read visible roles",
  );
  const isAdmin = adminIds.has(sourceUser.id);
  if (isAdmin && visibleRoles.length !== 1)
    throw new Error("Administrator cannot read the migrated role");
  if (!isAdmin && visibleRoles.length !== 0)
    throw new Error("Ordinary user can read another user's role");

  const photo = await requireData(
    session.client.storage.from("vault").download(photoPath),
    "download photo",
  );
  const photoHash = createHash("sha256")
    .update(Buffer.from(await photo.arrayBuffer()))
    .digest("hex");
  if (photoHash !== expectedPhotoSha256) throw new Error("Authenticated storage checksum mismatch");

  await requireData(
    service.auth.admin.generateLink({ type: "recovery", email: sourceUser.email }),
    "generate recovery link",
  );

  const refreshed = await requireData(session.client.auth.refreshSession(), "refresh session");
  if (refreshed.user?.id !== sourceUser.id)
    throw new Error("Session refresh changed the user UUID");

  if (!isAdmin) {
    const attemptedRoleId = randomUUID();
    const { error } = await session.client.from("user_roles").insert({
      id: attemptedRoleId,
      user_id: sourceUser.id,
      role: "admin",
    });
    if (!error) {
      await service.from("user_roles").delete().eq("id", attemptedRoleId);
      throw new Error("Ordinary user was able to grant an administrator role");
    }
  }
}

const admin = listed.users.find((user) => adminIds.has(user.id));
if (!admin?.email) throw new Error("Migrated administrator has no email identity");
const secondAdminSession = await createPasswordlessSession(admin.email);
const [deviceOneMatches, deviceTwoMatches] = await Promise.all([
  sessions
    .find((session) => session.user.id === admin.id)
    .client.from("matches")
    .select("id")
    .limit(1),
  secondAdminSession.client.from("matches").select("id").limit(1),
]);
if (deviceOneMatches.error || deviceTwoMatches.error)
  throw new Error("Concurrent admin sessions cannot read scores");
if (deviceOneMatches.data.length !== 1 || deviceTwoMatches.data.length !== 1) {
  throw new Error("Concurrent admin sessions returned no score rows");
}

for (const session of [...sessions, secondAdminSession]) {
  await session.client.auth.signOut({ scope: "local" });
}

console.log(
  JSON.stringify(
    {
      migrated_users: listed.users.length,
      administrators: adminIds.size,
      ordinary_users: listed.users.length - adminIds.size,
      passwordless_links_verified: listed.users.length + 1,
      recovery_links_generated: listed.users.length,
      session_refreshes_verified: listed.users.length,
      concurrent_admin_sessions_verified: 2,
      role_escalation_blocked: true,
      authenticated_storage_checksum_verified: true,
    },
    null,
    2,
  ),
);
