import { isTenantWorkspaceHost } from "./platform-domain";

export type BrandingContextType = "PLATFORM" | "TENANT_LOGIN" | "TENANT_APP" | "CMS";

export interface BrandingResolutionInput {
  host?: string | null;
  pathname?: string | null;
  tenantId?: string | null;
  isTenantHost?: boolean;
}

export interface BrandingResolutionResult {
  scope: "PLATFORM" | "TENANT";
  context: BrandingContextType;
  tenantId: string | null;
}

export function isCmsPath(pathname?: string | null): boolean {
  if (!pathname) return false;
  const p = pathname.split("?")[0].toLowerCase().trim();
  return (
    p === "/cms" ||
    p.startsWith("/cms/") ||
    p === "/api/cms" ||
    p.startsWith("/api/cms/")
  );
}

export function isAuthPath(pathname?: string | null): boolean {
  if (!pathname) return false;
  const p = pathname.split("?")[0].toLowerCase().trim();
  return (
    p === "/login" ||
    p.startsWith("/login/") ||
    p === "/auth" ||
    p.startsWith("/auth/") ||
    p === "/super-login" ||
    p.startsWith("/super-login/") ||
    p === "/verify-2fa" ||
    p.startsWith("/verify-2fa/") ||
    p === "/lock-screen" ||
    p.startsWith("/lock-screen/") ||
    p === "/session-expired" ||
    p.startsWith("/session-expired/")
  );
}

/**
 * Single Authoritative Frontend Branding Context Resolver.
 * Implements the Workspace Branding Matrix:
 *
 * IF host is platform host:
 *     return PLATFORM
 *
 * IF host belongs to tenant:
 *     IF pathname is CMS:
 *         return PLATFORM (Context: CMS)
 *     IF pathname is login/auth:
 *         return TENANT (Context: TENANT_LOGIN)
 *     IF pathname is tenant application/workspace:
 *         return TENANT (Context: TENANT_APP)
 */
export function resolveBrandingContext(input: BrandingResolutionInput): BrandingResolutionResult {
  const { host = "", pathname = "", tenantId = null } = input;

  const isTenant =
    input.isTenantHost !== undefined
      ? input.isTenantHost
      : isTenantWorkspaceHost(host || (typeof window !== "undefined" ? window.location.hostname : ""));

  // 1. IF host is platform host: return PLATFORM
  if (!isTenant) {
    return {
      scope: "PLATFORM",
      context: "PLATFORM",
      tenantId: null,
    };
  }

  // 2. IF host belongs to tenant:
  // IF pathname is CMS: return PLATFORM
  if (isCmsPath(pathname)) {
    return {
      scope: "PLATFORM",
      context: "CMS",
      tenantId: tenantId || null,
    };
  }

  // IF pathname is login/auth: return TENANT
  if (isAuthPath(pathname)) {
    return {
      scope: "TENANT",
      context: "TENANT_LOGIN",
      tenantId: tenantId || null,
    };
  }

  // IF pathname is tenant application/workspace: return TENANT
  return {
    scope: "TENANT",
    context: "TENANT_APP",
    tenantId: tenantId || null,
  };
}
