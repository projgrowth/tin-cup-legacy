import { readFileSync, writeFileSync } from "node:fs";

const [snapshotPath, outputPath] = process.argv.slice(2);
if (!snapshotPath || !outputPath) {
  throw new Error("Usage: node scripts/generate-supabase-public-import.mjs SNAPSHOT OUTPUT_SQL");
}
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));

const specs = {
  teams: ["id", "slug", "name", "captain_name", "sort_order"],
  players: ["id", "team_id", "name", "is_captain", "sort_order"],
  rounds: ["id", "slug", "day_label", "play_date", "course", "tee_window", "format", "format_detail", "points", "meal", "sort_order"],
  matches: ["id", "round_id", "label", "side_a", "side_b", "points", "result", "sort_order", "revision", "updated_at"],
  side_bets: ["id", "kind", "label", "round_id", "hole", "amount", "player_name", "team_slug", "distance", "sort_order", "revision", "updated_at"],
  trophies: ["id", "slug", "name", "description", "winner_name", "winner_note", "sort_order", "revision", "created_at", "updated_at"],
};

function literal(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function inserts(table, columns, rows) {
  if (!rows.length) return "";
  const values = rows.map((row) => `  (${columns.map((column) => literal(row[column])).join(", ")})`).join(",\n");
  return `insert into public.${table} (${columns.join(", ")}) values\n${values};\n`;
}

let sql = `-- Generated from the read-only Nhost public snapshot captured ${snapshot.capturedAt}.
-- Snapshot SHA-256: ${snapshot.sha256}
-- This migration is intentionally guarded for a new, user-empty Supabase project.
do $$
begin
  if exists (select 1 from public.profiles)
     or exists (select 1 from public.photos)
     or exists (select 1 from public.hole_notes)
     or exists (select 1 from public.round_plans)
     or exists (select 1 from public.user_roles) then
    raise exception 'Refusing public import after user-owned data exists';
  end if;
end;
$$;

delete from public.matches;
delete from public.side_bets;
delete from public.trophies;
delete from public.players;
delete from public.rounds;
delete from public.teams;

`;
for (const [table, columns] of Object.entries(specs)) {
  sql += `${inserts(table, columns, snapshot.tables[table])}\n`;
}
writeFileSync(outputPath, sql, { mode: 0o600 });
