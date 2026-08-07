type GraphqlEnvelope<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

const subdomain = process.env.NHOST_SUBDOMAIN || import.meta.env.VITE_NHOST_SUBDOMAIN;
const region = process.env.NHOST_REGION || import.meta.env.VITE_NHOST_REGION;

/** Server-only Hasura access. Never import this module from a browser component. */
export async function adminGraphqlRequest<
  TData,
  TVariables extends Record<string, unknown> = Record<string, never>,
>(query: string, variables?: TVariables): Promise<TData> {
  const adminSecret = process.env.NHOST_ADMIN_SECRET || process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!subdomain || !region || !adminSecret) {
    throw new Error("Nhost admin environment variables are not configured");
  }
  const response = await fetch(`https://${subdomain}.graphql.${region}.nhost.run/v1`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hasura-admin-secret": adminSecret,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await response.json()) as GraphqlEnvelope<TData>;
  if (!response.ok || body.errors?.length) {
    throw new Error(body.errors?.[0]?.message || `Nhost admin request failed (${response.status})`);
  }
  if (!body.data) throw new Error("Nhost admin request returned no data");
  return body.data;
}
