import { createClient } from "@nhost/nhost-js";

const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN || process.env.NHOST_SUBDOMAIN;
const region = import.meta.env.VITE_NHOST_REGION || process.env.NHOST_REGION;

if (!subdomain || !region) {
  throw new Error("Missing VITE_NHOST_SUBDOMAIN or VITE_NHOST_REGION");
}

/** Browser-safe Nhost client. Admin secrets must never be imported here. */
export const nhost = createClient({ subdomain, region });

export async function signOut() {
  const session = nhost.getUserSession();
  try {
    await nhost.auth.signOut({ refreshToken: session?.refreshToken });
  } finally {
    nhost.clearSession();
  }
}
