import { readFileSync, writeFileSync } from "node:fs";

const secretFileIndex = process.argv.indexOf("--secret-file");
if (secretFileIndex < 0) throw new Error("Use --secret-file with a temporary credential file");
const adminSecret = readFileSync(process.argv[secretFileIndex + 1], "utf8").trim();
const endpoint =
  "https://crgtkfggsuplprwqutbk.hasura.us-east-1.nhost.run/v1/metadata";

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-hasura-admin-secret": adminSecret,
  },
  body: JSON.stringify({ type: "export_metadata", args: {} }),
});
const metadata = await response.json();
if (!response.ok || metadata?.error) {
  console.error(JSON.stringify(metadata, null, 2));
  process.exitCode = 1;
} else {
  // JSON is valid YAML. Keeping sources inline preserves Nhost's built-in auth
  // and storage metadata alongside the Tin Cup tables and permissions.
  writeFileSync("nhost/metadata/version.yaml", `${JSON.stringify({ version: metadata.version }, null, 2)}\n`);
  writeFileSync(
    "nhost/metadata/databases/databases.yaml",
    `${JSON.stringify(metadata.sources, null, 2)}\n`,
  );
  console.log(`Exported ${metadata.sources?.[0]?.tables?.length ?? 0} tracked tables.`);
}
