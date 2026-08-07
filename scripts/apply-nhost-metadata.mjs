import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const endpoint =
  "https://crgtkfggsuplprwqutbk.hasura.us-east-1.nhost.run/v1/metadata";
const secretFileIndex = process.argv.indexOf("--secret-file");
const adminSecret =
  secretFileIndex >= 0
    ? readFileSync(process.argv[secretFileIndex + 1], "utf8").trim()
    : execFileSync("/usr/bin/pbpaste", { encoding: "utf8" }).trim();

if (!adminSecret) throw new Error("Copy the Nhost Hasura admin secret before running this script");

const table = (name, schema = "public") => ({ schema, name });
const command = (type, args) => ({ type, args: { source: "default", ...args } });
const select = (name, role, columns, filter = {}, schema = "public") =>
  command("pg_create_select_permission", {
    table: table(name, schema),
    role,
    permission: { columns, filter, allow_aggregations: false },
  });
const insert = (name, role, columns, check, set = {}, schema = "public") =>
  command("pg_create_insert_permission", {
    table: table(name, schema),
    role,
    permission: { columns, check, set },
  });
const update = (name, role, columns, filter, check = filter, schema = "public") =>
  command("pg_create_update_permission", {
    table: table(name, schema),
    role,
    permission: { columns, filter, check },
  });
const remove = (name, role, filter, schema = "public") =>
  command("pg_create_delete_permission", {
    table: table(name, schema),
    role,
    permission: { filter },
  });

const ownUser = { user_id: { _eq: "X-Hasura-User-Id" } };
const ownProfile = { id: { _eq: "X-Hasura-User-Id" } };
const scorekeeper = {
  _exists: {
    _table: table("user_roles"),
    _where: {
      user_id: { _eq: "X-Hasura-User-Id" },
      role: { _in: ["admin", "captain"] },
    },
  },
};

const readTables = [
  ["teams", ["id", "slug", "name", "captain_name", "sort_order"]],
  ["players", ["id", "team_id", "name", "is_captain", "sort_order"]],
  [
    "rounds",
    [
      "id",
      "slug",
      "day_label",
      "play_date",
      "course",
      "tee_window",
      "format",
      "format_detail",
      "points",
      "meal",
      "sort_order",
    ],
  ],
  [
    "matches",
    [
      "id",
      "round_id",
      "label",
      "points",
      "result",
      "side_a",
      "side_b",
      "sort_order",
      "revision",
      "updated_at",
    ],
  ],
  [
    "side_bets",
    [
      "id",
      "kind",
      "label",
      "round_id",
      "hole",
      "amount",
      "player_name",
      "team_slug",
      "distance",
      "sort_order",
      "revision",
      "updated_at",
    ],
  ],
  [
    "trophies",
    [
      "id",
      "slug",
      "name",
      "description",
      "winner_name",
      "winner_note",
      "sort_order",
      "revision",
      "created_at",
      "updated_at",
    ],
  ],
  ["photos", ["id", "storage_path", "caption", "uploaded_by", "created_at"]],
];

const operations = [];
for (const [name, columns] of readTables) {
  operations.push(select(name, "public", columns), select(name, "user", columns));
}

operations.push(
  command("pg_create_object_relationship", {
    table: table("players"),
    name: "team",
    using: { foreign_key_constraint_on: "team_id" },
  }),
  command("pg_create_object_relationship", {
    table: table("matches"),
    name: "round",
    using: { foreign_key_constraint_on: "round_id" },
  }),
  command("pg_create_object_relationship", {
    table: table("side_bets"),
    name: "round",
    using: { foreign_key_constraint_on: "round_id" },
  }),
  command("pg_create_object_relationship", {
    table: table("profiles"),
    name: "player",
    using: { foreign_key_constraint_on: "player_id" },
  }),
  update("matches", "user", ["result", "side_a", "side_b"], scorekeeper),
  update("side_bets", "user", ["player_name", "team_slug", "distance"], scorekeeper),
  update("trophies", "user", ["winner_name", "winner_note"], scorekeeper),
  select("user_roles", "user", ["id", "user_id", "role", "created_at"], ownUser),
  select(
    "profiles",
    "user",
    ["id", "display_name", "player_id", "created_at", "updated_at"],
  ),
  insert("profiles", "user", ["display_name", "player_id"], ownProfile, {
    id: "X-Hasura-User-Id",
  }),
  update("profiles", "user", ["display_name", "player_id"], ownProfile),
  select(
    "hole_notes",
    "user",
    [
      "id",
      "user_id",
      "course_id",
      "hole",
      "tee_club",
      "target_line",
      "green_note",
      "target_score",
      "notes",
      "created_at",
      "updated_at",
    ],
    ownUser,
  ),
  insert(
    "hole_notes",
    "user",
    ["course_id", "hole", "tee_club", "target_line", "green_note", "target_score", "notes"],
    ownUser,
    { user_id: "X-Hasura-User-Id" },
  ),
  update(
    "hole_notes",
    "user",
    ["tee_club", "target_line", "green_note", "target_score", "notes"],
    ownUser,
  ),
  remove("hole_notes", "user", ownUser),
  select(
    "round_plans",
    "user",
    ["id", "user_id", "round_slug", "plan", "created_at", "updated_at"],
    ownUser,
  ),
  insert("round_plans", "user", ["round_slug", "plan"], ownUser, {
    user_id: "X-Hasura-User-Id",
  }),
  update("round_plans", "user", ["plan"], ownUser),
  remove("round_plans", "user", ownUser),
  insert("photos", "user", ["storage_path", "caption"], {
    uploaded_by: { _eq: "X-Hasura-User-Id" },
  }, { uploaded_by: "X-Hasura-User-Id" }),
  remove("photos", "user", {
    _or: [{ uploaded_by: { _eq: "X-Hasura-User-Id" } }, scorekeeper],
  }),
);

const storageColumns = [
  "id",
  "name",
  "size",
  "bucket_id",
  "etag",
  "created_at",
  "updated_at",
  "is_uploaded",
  "mime_type",
  "uploaded_by_user_id",
  "metadata",
];
operations.push(
  select("files", "user", storageColumns, { bucket_id: { _eq: "default" } }, "storage"),
  insert(
    "files",
    "user",
    storageColumns.filter((column) => column !== "uploaded_by_user_id"),
    { bucket_id: { _eq: "default" } },
    { uploaded_by_user_id: "X-Hasura-User-Id" },
    "storage",
  ),
  remove(
    "files",
    "user",
    {
      _and: [
        { bucket_id: { _eq: "default" } },
        {
          _or: [
            { uploaded_by_user_id: { _eq: "X-Hasura-User-Id" } },
            scorekeeper,
          ],
        },
      ],
    },
    "storage",
  ),
);

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-hasura-admin-secret": adminSecret,
  },
  body: JSON.stringify({ type: "bulk", args: operations }),
});

const body = await response.json();
if (!response.ok || body?.error) {
  console.error(JSON.stringify(body, null, 2));
  process.exitCode = 1;
} else {
  console.log(`Applied ${operations.length} Nhost metadata operations.`);
}
