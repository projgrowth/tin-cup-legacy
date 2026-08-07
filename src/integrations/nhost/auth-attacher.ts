import { createMiddleware } from "@tanstack/react-start";
import { nhost } from "./client";

/** Attach the Nhost access token to TanStack server functions. */
export const attachNhostAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const token = nhost.getUserSession()?.accessToken;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
