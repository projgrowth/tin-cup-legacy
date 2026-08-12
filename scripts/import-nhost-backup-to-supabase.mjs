import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const [dumpArg, storageArg] = process.argv.slice(2);
const dumpPath = dumpArg ? resolve(dumpArg) : "";
const storageRoot = storageArg ? resolve(storageArg) : "";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pgRestore = process.env.PG_RESTORE ?? "/opt/homebrew/opt/postgresql@14/bin/pg_restore";

if (!dumpPath || !storageRoot || !supabaseUrl || !serviceKey) {
  throw new Error(
    "Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-nhost-backup-to-supabase.mjs <dump> <storage-root>",
  );
}
if (!existsSync(dumpPath)) throw new Error(`Nhost dump not found: ${dumpPath}`);
if (!existsSync(storageRoot)) throw new Error(`Nhost storage export not found: ${storageRoot}`);
if (!serviceKey.startsWith("sb_secret_") && !serviceKey.includes(".")) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY does not look like a Supabase secret key");
}

const sql = execFileSync(
  pgRestore,
  ["--data-only", "--no-owner", "--no-privileges", "--file=-", dumpPath],
  { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
);

function decodeCopyValue(value) {
  if (value === String.raw`\N`) return null;
  return value.replace(
    /\\(?:x([0-9a-fA-F]{2})|([0-7]{1,3})|(.))/g,
    (_match, hex, octal, escaped) => {
      if (hex) return String.fromCharCode(Number.parseInt(hex, 16));
      if (octal) return String.fromCharCode(Number.parseInt(octal, 8));
      return (
        {
          b: "\b",
          f: "\f",
          n: "\n",
          r: "\r",
          t: "\t",
          v: "\v",
          "\\": "\\",
        }[escaped] ?? escaped
      );
    },
  );
}

function copyRows(table) {
  const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = sql.match(
    new RegExp(`^COPY ${escaped} \\(([^\\n]+)\\) FROM stdin;\\n([\\s\\S]*?)^\\\\\\.$`, "m"),
  );
  if (!match) throw new Error(`COPY data missing for ${table}`);
  const columns = match[1].split(", ");
  const body = match[2].trim();
  if (!body) return [];
  return body.split("\n").map((line) => {
    const values = line.split("\t").map(decodeCopyValue);
    if (values.length !== columns.length) {
      throw new Error(`Unexpected COPY column count for ${table}`);
    }
    return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
  });
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function findFile(root, targetName) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      const nested = findFile(path, targetName);
      if (nested) return nested;
    } else if (entry.name === targetName) {
      return path;
    }
  }
  return null;
}

function md5(buffer) {
  return createHash("md5").update(buffer).digest("hex");
}

function cleanEtag(etag) {
  return (etag ?? "").replaceAll('"', "").toLowerCase();
}

const authUsers = copyRows("auth.users");
const authRoleRows = copyRows("auth.user_roles");
const profiles = copyRows("public.profiles");
const userRoles = copyRows("public.user_roles");
const photos = copyRows("public.photos");
const storageFiles = copyRows("storage.files").filter((file) => file.is_uploaded === "t");

if (
  authUsers.length !== 2 ||
  profiles.length !== 2 ||
  photos.length !== 1 ||
  storageFiles.length !== 1
) {
  throw new Error(
    `Unexpected source baseline: auth=${authUsers.length}, profiles=${profiles.length}, photos=${photos.length}, files=${storageFiles.length}`,
  );
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function assertEmptyDestination() {
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 50,
  });
  if (usersError) throw usersError;
  if (users.users.length !== 0)
    throw new Error("Destination auth.users is not empty; refusing to import");

  for (const table of ["profiles", "user_roles", "photos"]) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) throw error;
    if (count !== 0) throw new Error(`Destination ${table} is not empty; refusing to import`);
  }
}

await assertEmptyDestination();

const rolesByUser = new Map();
for (const row of authRoleRows) {
  const roles = rolesByUser.get(row.user_id) ?? [];
  roles.push(row.role);
  rolesByUser.set(row.user_id, roles);
}

for (const user of authUsers) {
  const roles = rolesByUser.get(user.id) ?? [user.default_role ?? "user"];
  const userMetadata = {
    ...parseJson(user.metadata, {}),
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    locale: user.locale,
  };
  const { error } = await supabase.auth.admin.createUser({
    id: user.id,
    email: user.email ?? undefined,
    phone: user.phone_number ?? undefined,
    password_hash: user.password_hash ?? undefined,
    email_confirm: user.email_verified === "t",
    phone_confirm: user.phone_number_verified === "t",
    user_metadata: userMetadata,
    app_metadata: {
      provider: user.email ? "email" : user.phone_number ? "phone" : undefined,
      providers: user.email ? ["email"] : user.phone_number ? ["phone"] : [],
      default_role: user.default_role,
      roles,
      migrated_from: "nhost",
    },
    ban_duration: user.disabled === "t" ? "876000h" : "none",
  });
  if (error) {
    const message = error.message.replaceAll(user.email ?? "", "[redacted]");
    throw new Error(`Could not import Nhost auth user ${user.id}: ${message}`);
  }
}

for (const [table, rows] of [
  ["profiles", profiles],
  ["user_roles", userRoles],
]) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`Could not import ${table}: ${error.message}`);
}

for (const file of storageFiles) {
  const filePath = findFile(storageRoot, file.name);
  if (!filePath) throw new Error(`Exported storage object missing: ${file.name}`);
  const bytes = readFileSync(filePath);
  if (bytes.length !== Number(file.size)) {
    throw new Error(`Storage size mismatch for ${basename(filePath)}`);
  }
  if (cleanEtag(file.etag) && md5(bytes) !== cleanEtag(file.etag)) {
    throw new Error(`Storage checksum mismatch for ${basename(filePath)}`);
  }
  const { error } = await supabase.storage.from("vault").upload(file.id, bytes, {
    contentType: file.mime_type ?? "application/octet-stream",
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(`Could not upload storage object ${file.id}: ${error.message}`);
}

const { error: photosError } = await supabase.from("photos").upsert(photos, { onConflict: "id" });
if (photosError) throw new Error(`Could not import photos: ${photosError.message}`);

const { data: importedUsers, error: importedUsersError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 50,
});
if (importedUsersError) throw importedUsersError;

const result = { auth_users: importedUsers.users.length };
for (const table of ["profiles", "user_roles", "photos"]) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw error;
  result[table] = count;
}
const { data: objects, error: storageError } = await supabase.storage.from("vault").list("", {
  limit: 100,
});
if (storageError) throw storageError;
result.storage_objects = objects.length;

console.log(JSON.stringify(result, null, 2));
