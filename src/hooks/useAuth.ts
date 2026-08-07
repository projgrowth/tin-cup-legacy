import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { StoredSession } from "@nhost/nhost-js";
import type { User } from "@nhost/nhost-js/auth";

import { nhost } from "@/integrations/nhost/client";
import { graphqlRequest } from "@/integrations/nhost/graphql";

export type AuthState = {
  session: StoredSession | null;
  user: User | null;
  loading: boolean;
  canScore: boolean;
  isAdmin: boolean;
  rolesLoading: boolean;
  rolesError: string | null;
  /** Re-fetch captain/admin roles (e.g. after an admin grant or /ops sync). */
  refreshRoles: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
const ROLE_CACHE_KEY = "tin-cup-role-cache-v1";
const ROLE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

type RoleCache = {
  userId: string;
  canScore: boolean;
  isAdmin: boolean;
  verifiedAt: number;
};

function readRoleCache(userId?: string): Pick<RoleCache, "canScore" | "isAdmin"> {
  if (!userId || typeof window === "undefined") return { canScore: false, isAdmin: false };
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(ROLE_CACHE_KEY) ?? "null",
    ) as RoleCache | null;
    if (
      !parsed ||
      parsed.userId !== userId ||
      Date.now() - parsed.verifiedAt > ROLE_CACHE_MAX_AGE_MS
    ) {
      return { canScore: false, isAdmin: false };
    }
    return { canScore: parsed.canScore, isAdmin: parsed.isAdmin };
  } catch {
    return { canScore: false, isAdmin: false };
  }
}

function writeRoleCache(userId: string, roles: { canScore: boolean; isAdmin: boolean }) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      ROLE_CACHE_KEY,
      JSON.stringify({ userId, ...roles, verifiedAt: Date.now() } satisfies RoleCache),
    );
  } catch {
    /* best effort; database permissions remain authoritative */
  }
}

async function loadRoles(userId: string): Promise<{ canScore: boolean; isAdmin: boolean }> {
  const data = await graphqlRequest<{ user_roles: Array<{ role: string }> }, { userId: string }>(
    `query MyRoles($userId: uuid!) {
      user_roles(where: {user_id: {_eq: $userId}}) { role }
    }`,
    { userId },
  );
  const roles = data.user_roles.map((row) => row.role);
  return {
    canScore: roles.includes("admin") || roles.includes("captain"),
    isAdmin: roles.includes("admin"),
  };
}

function useAuthState(): AuthState {
  const [session, setSession] = useState<StoredSession | null>(() => nhost.getUserSession());
  const initialRoles = readRoleCache(session?.user?.id);
  const [loading, setLoading] = useState(true);
  const [canScore, setCanScore] = useState(initialRoles.canScore);
  const [isAdmin, setIsAdmin] = useState(initialRoles.isAdmin);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(false);
    return nhost.sessionStorage.onChange((next) => setSession(next));
  }, []);

  const refreshRoles = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      setCanScore(false);
      setIsAdmin(false);
      setRolesLoading(false);
      return;
    }
    setRolesLoading(true);
    setRolesError(null);
    try {
      const roles = await loadRoles(userId);
      setCanScore(roles.canScore);
      setIsAdmin(roles.isAdmin);
      writeRoleCache(userId, roles);
    } catch (error) {
      // Preserve the last known role during a transient network/database error;
      // do not silently demote a captain while the event is in progress.
      setRolesError(error instanceof Error ? error.message : "Could not refresh access");
    } finally {
      setRolesLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const cached = readRoleCache(session?.user?.id);
    setCanScore(cached.canScore);
    setIsAdmin(cached.isAdmin);
  }, [session?.user?.id]);

  useEffect(() => {
    void refreshRoles();
  }, [refreshRoles]);

  // Captains may be granted mid-session via /admin or the server-side email allowlist.
  useEffect(() => {
    const onFocus = () => {
      void refreshRoles();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshRoles]);

  return {
    session,
    user: session?.user ?? null,
    loading,
    canScore,
    isAdmin,
    rolesLoading,
    rolesError,
    refreshRoles,
  };
}

/** Single session listener + role lookup for the whole app. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthState();
  return createElement(AuthContext.Provider, { value }, children);
}

const SIGNED_OUT: AuthState = {
  session: null,
  user: null,
  loading: true,
  canScore: false,
  isAdmin: false,
  rolesLoading: true,
  rolesError: null,
  refreshRoles: async () => {},
};

export function useAuth(): AuthState {
  return useContext(AuthContext) ?? SIGNED_OUT;
}
