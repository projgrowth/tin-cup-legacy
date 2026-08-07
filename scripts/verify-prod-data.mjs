/**
 * Quick anonymous GraphQL probe against production Nhost.
 * Usage: node scripts/verify-prod-data.mjs
 */
const URL =
  "https://crgtkfggsuplprwqutbk.graphql.us-east-1.nhost.run/v1";

async function q(query) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

function ok(label, pass, detail) {
  console.log(`${pass ? "PASS" : "FAIL"} | ${label} | ${detail}`);
}

const data = await q(`{
  side_bets(order_by: {sort_order: asc}) { label amount hole kind }
  matches(where: {round: {slug: {_eq: "friday"}}}, order_by: {sort_order: asc}) {
    label side_a side_b
  }
}`);

if (data.errors) {
  console.log("GraphQL errors:", JSON.stringify(data.errors, null, 2));
}

const bets = data.data?.side_bets ?? [];
const matches = data.data?.matches ?? [];
const amts = bets.map((b) => Number(b.amount));
const allHundred = amts.length >= 8 && amts.every((a) => a === 100);
const paired = matches.filter((m) => m.side_a && m.side_b).length;

ok("Side pots $100", allHundred, `count=${bets.length} amounts=${amts.join(",") || "none"}`);
ok("Friday pairings filled", paired >= 8, `paired=${paired}/${matches.length}`);

const prof = await q(`{ profiles(limit: 1) { id player_id avatar_path display_name } }`);
const profilesOk = !prof.errors && Array.isArray(prof.data?.profiles);
ok(
  "Public profiles (avatars)",
  profilesOk,
  profilesOk
    ? `ok (sample avatar_path=${prof.data.profiles[0]?.avatar_path ?? "null"})`
    : prof.errors?.[0]?.message || "fail",
);

const pass = allHundred && paired >= 8 && profilesOk;
console.log(pass ? "\nAll green." : "\nStill red — re-run scripts/prod-data-ready.sql + Hasura profile permissions.");
process.exit(pass ? 0 : 1);
