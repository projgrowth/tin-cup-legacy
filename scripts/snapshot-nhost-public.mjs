import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const subdomain = process.env.NHOST_SUBDOMAIN || process.env.VITE_NHOST_SUBDOMAIN || "crgtkfggsuplprwqutbk";
const region = process.env.NHOST_REGION || process.env.VITE_NHOST_REGION || "us-east-1";
const output = resolve(process.argv[2] || `/private/tmp/tin-cup-nhost-public-${new Date().toISOString().replaceAll(":", "-")}.json`);
const endpoint = `https://${subdomain}.graphql.${region}.nhost.run/v1`;
const query = `query MigrationPublicSnapshot {
  teams(order_by: {sort_order: asc}) { id slug name captain_name sort_order }
  players(order_by: {sort_order: asc}) { id team_id name is_captain sort_order }
  rounds(order_by: {sort_order: asc}) { id slug day_label play_date course tee_window format format_detail points meal sort_order }
  matches(order_by: {sort_order: asc}) { id round_id label side_a side_b points result sort_order revision updated_at }
  side_bets(order_by: {sort_order: asc}) { id kind label round_id hole amount player_name team_slug distance sort_order revision updated_at }
  trophies(order_by: {sort_order: asc}) { id slug name description winner_name winner_note sort_order revision created_at updated_at }
  profiles(order_by: {created_at: asc}) { id display_name player_id avatar_path created_at updated_at }
  photos(order_by: {created_at: asc}) { id storage_path caption uploaded_by created_at }
}`;

const response = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ query }),
});
const payload = await response.json();
if (!response.ok || payload.errors) throw new Error(JSON.stringify(payload.errors ?? payload));

const tables = payload.data;
const canonical = JSON.stringify(tables);
const snapshot = {
  source: endpoint,
  capturedAt: new Date().toISOString(),
  scope: "anonymous-readable rows only; auth, private notes, roles, and storage bytes require an Nhost admin/database backup",
  sha256: createHash("sha256").update(canonical).digest("hex"),
  counts: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])),
  tables,
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ output, counts: snapshot.counts, sha256: snapshot.sha256 }, null, 2));
