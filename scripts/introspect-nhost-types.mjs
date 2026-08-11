const subdomain = process.env.NHOST_SUBDOMAIN;
const region = process.env.NHOST_REGION;
const secret = process.env.NHOST_ADMIN_SECRET;
if (!subdomain || !region || !secret) throw new Error("Missing Nhost admin environment");

const endpoint = `https://${subdomain}.graphql.${region}.nhost.run/v1`;
const names = process.argv.slice(2);
const query = `query Types {
  __schema { types { name fields { name } } }
}`;
const response = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json", "x-hasura-admin-secret": secret },
  body: JSON.stringify({ query }),
});
const payload = await response.json();
if (!response.ok || payload.errors) throw new Error(JSON.stringify(payload.errors ?? payload));
for (const type of payload.data.__schema.types) {
  if (names.includes(type.name)) console.log(`${type.name}: ${type.fields?.map((field) => field.name).join(", ") ?? ""}`);
}
