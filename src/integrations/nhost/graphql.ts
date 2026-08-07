import { nhost } from "./client";
import { createClient as createWsClient, type Client as GraphqlWsClient } from "graphql-ws";

export type NhostGraphQLError = Error & { code?: string };

export async function graphqlRequest<
  TData,
  TVariables extends Record<string, unknown> = Record<string, never>,
>(query: string, variables?: TVariables): Promise<TData> {
  const response = await nhost.graphql.request<TData, TVariables>({ query, variables });
  const error = response.body.errors?.[0];
  if (error) {
    const thrown = new Error(error.message) as NhostGraphQLError;
    thrown.code = error.extensions?.code;
    throw thrown;
  }
  if (!response.body.data) throw new Error("Nhost returned no data");
  return response.body.data;
}

export function currentUserId(): string | null {
  return nhost.getUserSession()?.user?.id ?? null;
}

let wsClient: GraphqlWsClient | undefined;

function websocketClient(): GraphqlWsClient | null {
  if (typeof window === "undefined") return null;
  if (wsClient) return wsClient;
  const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN;
  const region = import.meta.env.VITE_NHOST_REGION;
  if (!subdomain || !region) return null;
  wsClient = createWsClient({
    url: `wss://${subdomain}.graphql.${region}.nhost.run/v1`,
    lazy: true,
    retryAttempts: Infinity,
    connectionParams: () => {
      const token = nhost.getUserSession()?.accessToken;
      return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    },
  });
  return wsClient;
}

export function subscribeGraphql(query: string, onData: () => void): () => void {
  const client = websocketClient();
  if (!client) return () => {};
  return client.subscribe(
    { query },
    {
      next: (result) => {
        if (!result.errors?.length) onData();
      },
      error: () => {
        // graphql-ws reconnects automatically. Polling in useTournament remains
        // the safety net for weak cellular connections.
      },
      complete: () => {},
    },
  );
}
