import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createNhostClient } from "@nhost/nhost-js";

const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN || process.env.NHOST_SUBDOMAIN;
const region = import.meta.env.VITE_NHOST_REGION || process.env.NHOST_REGION;

/** Validate server-function bearer tokens against Nhost Auth, never by decoding alone. */
export const requireNhostAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const authorization = request?.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("Unauthorized");
  if (!subdomain || !region) throw new Error("Nhost server configuration is missing");

  const auth = createNhostClient({ subdomain, region, configure: [] });
  const response = await auth.auth.getUser({ headers: { Authorization: authorization } });
  if (!response.body.id) throw new Error("Unauthorized");

  return next({
    context: {
      userId: response.body.id,
      userEmail: response.body.email ?? "",
    },
  });
});
