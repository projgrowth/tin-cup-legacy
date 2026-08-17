/** Password-reset / auth-callback URL helpers. PKCE `code` needs same-browser storage; `token_hash` does not. */

export const RECOVERY_FLAG_KEY = "tc-recovery-v1";

export type AuthCallbackParams = {
  code?: string;
  tokenHash?: string;
  type?: string;
};

function readParams(source: URLSearchParams): AuthCallbackParams {
  const code = source.get("code")?.trim() || undefined;
  const tokenHash = source.get("token_hash")?.trim() || undefined;
  const type = source.get("type")?.trim() || undefined;
  return { code, tokenHash, type };
}

/** Pull `code`, `token_hash`, and `type` from search and hash (Supabase uses both). */
export function parseAuthCallbackParams(href: string): AuthCallbackParams {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return {};
  }
  const fromSearch = readParams(url.searchParams);
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const fromHash = hash ? readParams(new URLSearchParams(hash)) : {};
  return {
    code: fromSearch.code ?? fromHash.code,
    tokenHash: fromSearch.tokenHash ?? fromHash.tokenHash,
    type: fromSearch.type ?? fromHash.type,
  };
}

export function isRecoveryCallback(params: AuthCallbackParams): boolean {
  return params.type === "recovery" || Boolean(params.tokenHash);
}

export function hasAuthCallbackParams(params: AuthCallbackParams): boolean {
  return Boolean(params.code || params.tokenHash || params.type);
}

export function readRecoveryFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(RECOVERY_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeRecoveryFlag(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(RECOVERY_FLAG_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function clearRecoveryFlag(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(RECOVERY_FLAG_KEY);
  } catch {
    /* ignore */
  }
}

type VerifyClient = {
  auth: {
    verifyOtp: (args: {
      type: "recovery";
      token_hash: string;
    }) => Promise<{ error: { message: string } | null }>;
  };
};

function stripRecoveryParamsFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("token_hash");
  url.searchParams.delete("type");
  if (url.hash.includes("token_hash") || url.hash.includes("type=")) {
    url.hash = "";
  }
  window.history.replaceState(window.history.state, "", url.toString());
}

/** Exchange a recovery `token_hash` (works in Mail / another browser). PKCE `code` stays with detectSessionInUrl. */
export async function consumeRecoverySession(
  client: VerifyClient,
  params: AuthCallbackParams,
): Promise<{ error: string | null }> {
  if (!params.tokenHash) return { error: null };
  const { error } = await client.auth.verifyOtp({
    type: "recovery",
    token_hash: params.tokenHash,
  });
  stripRecoveryParamsFromUrl();
  return { error: error?.message ?? null };
}
