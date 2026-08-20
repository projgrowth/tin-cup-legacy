export const AUTH_STORAGE_KEY = "tc-auth-v1";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
const COOKIE_CHUNK = 3500;

type TokenSession = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
};

export function compactAuthValue(value: string): string {
  try {
    const parsed = JSON.parse(value) as TokenSession & { user?: unknown };
    return JSON.stringify({
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      expires_at: parsed.expires_at,
      expires_in: parsed.expires_in,
      token_type: parsed.token_type ?? "bearer",
    } satisfies TokenSession);
  } catch {
    return value;
  }
}

function cookieAttrs(): string {
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  return `; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split("; ");
  const found = parts.find((part) => part.startsWith(`${name}=`));
  if (!found) return null;
  return decodeURIComponent(found.slice(name.length + 1));
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}${cookieAttrs()}`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function writeChunkedCookie(value: string) {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += COOKIE_CHUNK) {
    chunks.push(value.slice(i, i + COOKIE_CHUNK));
  }
  writeCookie(AUTH_STORAGE_KEY, String(chunks.length));
  chunks.forEach((chunk, index) => writeCookie(`${AUTH_STORAGE_KEY}.${index}`, chunk));
  for (let i = chunks.length; i < 8; i += 1) clearCookie(`${AUTH_STORAGE_KEY}.${i}`);
}

function readChunkedCookie(): string | null {
  const countRaw = readCookie(AUTH_STORAGE_KEY);
  if (!countRaw) return null;
  if (countRaw.startsWith("{")) return countRaw;
  const count = Number(countRaw);
  if (!Number.isFinite(count) || count < 1) return countRaw;
  const chunks: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const piece = readCookie(`${AUTH_STORAGE_KEY}.${i}`);
    if (piece == null) return null;
    chunks.push(piece);
  }
  return chunks.join("");
}

function clearChunkedCookie() {
  clearCookie(AUTH_STORAGE_KEY);
  for (let i = 0; i < 8; i += 1) clearCookie(`${AUTH_STORAGE_KEY}.${i}`);
}

function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Safari private mode */
  }
}

function clearLocal(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Supabase-js storage: cookie first so iOS keeps the session after localStorage eviction. */
export const authStorage = {
  getItem(key: string) {
    const fromCookie = key === AUTH_STORAGE_KEY ? readChunkedCookie() : null;
    const fromLocal = readLocal(key);
    return fromLocal ?? fromCookie;
  },
  setItem(key: string, value: string) {
    writeLocal(key, value);
    if (key === AUTH_STORAGE_KEY && typeof document !== "undefined") {
      writeChunkedCookie(compactAuthValue(value));
    }
  },
  removeItem(key: string) {
    clearLocal(key);
    if (key === AUTH_STORAGE_KEY) clearChunkedCookie();
  },
};
