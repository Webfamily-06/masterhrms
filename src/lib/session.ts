import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError, clearToken } from "./api";

export type SessionUser = {
  id: string;
  email: string;
};

export type WorkspaceRoleInfo = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  isSystem?: boolean;
};

export type ProfileWithRoles = {
  id: string;
  tenant_id: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  tenant: { id: string; name: string; slug: string; timezone?: string } | null;
  roles: string[];
  workspaceRole: WorkspaceRoleInfo | null;
  permissions: string[];
  enabledModules: string[];
  allowedDashboards: string[];
  twoFactorEnabled?: boolean;
};

/**
 * Shared internal hook — fires ONE /auth/me request.
 * Both useSession() and useCurrentProfile() read from this same TanStack Query cache entry.
 * Eliminates the duplicate /auth/me call that previously happened on every page load.
 */
function useSessionQuery() {
  const [token, setTokenState] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("hrms_auth_token") : null
  );

  // Keep token state in sync across browser tabs (e.g. login/logout in another tab)
  useEffect(() => {
    const handleStorage = () => setTokenState(localStorage.getItem("hrms_auth_token"));
    window.addEventListener("storage", handleStorage);
    window.addEventListener("auth-token-changed", handleStorage);
    return () => { window.removeEventListener("storage", handleStorage); window.removeEventListener("auth-token-changed", handleStorage); };
  }, []);

  const query = useQuery({
    // Shared query key — any component calling useSession or useCurrentProfile
    // gets data from the exact same cache slot. Zero duplicate network calls.
    queryKey: ["current-session-user", token],
    enabled: !!token,
    staleTime: 5 * 60 * 1000,  // Fresh for 5 min — no needless re-fetches on focus
    gcTime: 10 * 60 * 1000,    // Keep in memory 10 min after last subscriber unmounts
    queryFn: async () => {
      try {
        const res = await api.get("/auth/me");
        return res;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearToken();
          setTokenState(null);
        }
        throw error;
      }
    },
  });

  return { token, setTokenState, query };
}

/**
 * useSession — provides user identity + auth loading state.
 * Reads from shared cache — does NOT trigger a second /auth/me call.
 */
export function useSession() {
  const { token, query } = useSessionQuery();
  const { data: rawUser, isLoading } = query;

  const user: SessionUser | null = rawUser
    ? { id: rawUser.id, email: rawUser.email }
    : null;

  return {
    session: token ? { access_token: token, user } : null,
    user,
    loading: isLoading,
  };
}

/**
 * useCurrentProfile — returns full profile with roles and tenant.
 * Derives data from the same shared cache entry as useSession().
 * Zero extra network requests — profile is computed via useMemo from cached raw user data.
 */
export function useCurrentProfile(user?: SessionUser | null | undefined) {
  const { query } = useSessionQuery();
  const { data: rawUser, isLoading } = query;

  const data = useMemo<ProfileWithRoles | null>(() => {
    if (!rawUser) return null;
    const p = rawUser.profile;
    return {
      id: rawUser.id,
      tenant_id: p?.tenantId ?? null,
      full_name:
        p?.fullName ??
        (rawUser.email ? rawUser.email.split("@")[0] : "User"),
      email: rawUser.email,
      avatar_url: p?.avatarUrl ?? null,
      tenant: p?.tenant
        ? { id: p.tenant.id, name: p.tenant.name, slug: p.tenant.slug, timezone: (p.tenant as any).timezone || "Asia/Kolkata" }
        : null,
      roles: rawUser.roles ?? [],
      workspaceRole: rawUser.workspaceRole ?? null,
      permissions: rawUser.permissions ?? [],
      enabledModules: rawUser.enabledModules ?? [],
      allowedDashboards: rawUser.allowedDashboards ?? [],
      twoFactorEnabled: Boolean(rawUser.twoFactorEnabled),
    };
  }, [rawUser]);

  return { data, isLoading, error: query.error, refetch: query.refetch };
}

export function hasRole(profile: ProfileWithRoles | null | undefined, role: string) {
  return !!profile?.roles?.includes(role);
}
