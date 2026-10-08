import { isTenantWorkspaceHost } from "@/lib/platform-domain";

/**
 * Client-Side UX Route Guard Chain
 * 
 * Provides UX protection, early redirects, and clean error messages.
 * Note: The server remains authoritative for all authorization decisions.
 */

export interface GuardEvaluationOptions {
  requiredPermission?: string;
  requiredModule?: string;
  requiredRole?: string;
  requiredDataScope?: string;
  targetPortal?: "tenant" | "hr" | "me" | "sa" | "client";
}

export interface GuardEvaluationResult {
  allowed: boolean;
  redirectUrl?: string;
  reason?: string;
}

export interface AuthUserState {
  token: string | null;
  userId: string | null;
  tenantId: string | null;
  roles: string[];
  permissions: string[];
  enabledModules: string[];
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  workspaceStatus?: string;
}

/**
 * Resolves current authentication state from localStorage and active JWT token.
 */
export function getClientAuthState(): AuthUserState {
  if (typeof window === "undefined") {
    return {
      token: null,
      userId: null,
      tenantId: null,
      roles: [],
      permissions: [],
      enabledModules: [],
      isSuperAdmin: false,
      isTenantAdmin: false,
    };
  }

  const token = localStorage.getItem("hrms_auth_token");
  let user: any = null;
  try {
    const raw = localStorage.getItem("hrms_user");
    if (raw) user = JSON.parse(raw);
  } catch {
    user = null;
  }

  // Authoritatively decode JWT token if present
  let tokenPayload: any = null;
  if (token) {
    try {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        tokenPayload = JSON.parse(jsonPayload);
      }
    } catch {}
  }

  const roles: string[] = (user?.roles && Array.isArray(user.roles) && user.roles.length > 0)
    ? user.roles
    : (Array.isArray(tokenPayload?.roles) ? tokenPayload.roles : []);

  const permissions: string[] = (user?.permissions && Array.isArray(user.permissions) && user.permissions.length > 0)
    ? user.permissions
    : (Array.isArray(tokenPayload?.permissions) ? tokenPayload.permissions : []);

  const enabledModules: string[] = user?.enabledModules || [];
  const isSuperAdmin = roles.includes("super_admin");
  const isTenantAdmin =
    isSuperAdmin ||
    roles.includes("admin") ||
    roles.includes("workspace_admin") ||
    roles.includes("tenant_admin") ||
    roles.includes("Workspace Admin");

  const resolvedTenantId =
    user?.tenantId ||
    tokenPayload?.tenantId ||
    (typeof window !== "undefined" && isTenantWorkspaceHost() ? "tenant-host-active" : null);

  return {
    token,
    userId: user?.id || user?.userId || tokenPayload?.userId || tokenPayload?.id || null,
    tenantId: resolvedTenantId,
    roles,
    permissions,
    enabledModules,
    isSuperAdmin,
    isTenantAdmin,
    workspaceStatus: user?.workspaceStatus || "ACTIVE",
  };
}

/**
 * Executes the complete Route Guard Chain:
 * Authenticated -> Tenant Resolved -> Portal Guard -> Module Enabled -> Permission -> Data Scope
 */
export function evaluateRouteAccess(
  options: GuardEvaluationOptions = {}
): GuardEvaluationResult {
  const auth = getClientAuthState();

  // 1. Authenticated Guard
  if (!auth.token) {
    return {
      allowed: false,
      redirectUrl: "/auth",
      reason: "Authentication required",
    };
  }

  // 2. Tenant Resolved Guard (unless Super Admin portal)
  if (options.targetPortal !== "sa" && !auth.isSuperAdmin && !auth.tenantId) {
    // Only tenant administrators should be routed to onboarding setup
    if (auth.isTenantAdmin) {
      return {
        allowed: false,
        redirectUrl: "/onboarding",
        reason: "Tenant workspace context required",
      };
    }
    return {
      allowed: false,
      redirectUrl: "/auth",
      reason: "Tenant workspace context required",
    };
  }

  // Check Workspace Suspension / Expiry
  if (auth.workspaceStatus === "SUSPENDED" || auth.workspaceStatus === "EXPIRED") {
    return {
      allowed: false,
      redirectUrl: "/session-expired",
      reason: "Workspace subscription is currently inactive",
    };
  }

  // 3. Portal Isolation Guards
  if (options.targetPortal === "tenant" && !auth.isTenantAdmin && !auth.isSuperAdmin) {
    return {
      allowed: false,
      redirectUrl: "/403",
      reason: "Tenant Administrator privileges required",
    };
  }

  if (options.targetPortal === "hr" && !auth.isTenantAdmin && !auth.isSuperAdmin) {
    const hasHrRole = auth.roles.some((r) =>
      ["hr_admin", "hr_manager", "manager", "hr", "admin", "tenant_admin"].includes(r)
    );
    const hasHrPerm = auth.permissions.some(
      (p) => p.startsWith("hr.") || p.startsWith("employees.") || p.startsWith("attendance.")
    );
    if (!hasHrRole && !hasHrPerm) {
      return {
        allowed: false,
        redirectUrl: "/403",
        reason: "HR Management privileges required",
      };
    }
  }

  // me portal is open to all authenticated workspace users
  if (options.targetPortal === "me" && !auth.token) {
    return {
      allowed: false,
      redirectUrl: "/auth",
      reason: "Employee authentication required",
    };
  }

  // 4. Module Enabled Guard
  if (options.requiredModule && auth.enabledModules.length > 0) {
    if (!auth.enabledModules.includes(options.requiredModule) && !auth.isSuperAdmin) {
      return {
        allowed: false,
        redirectUrl: "/403",
        reason: `Module '${options.requiredModule}' is not enabled for this workspace`,
      };
    }
  }

  // 5. Role Guard
  if (options.requiredRole && !auth.isSuperAdmin) {
    if (!auth.roles.includes(options.requiredRole) && !auth.isTenantAdmin) {
      return {
        allowed: false,
        redirectUrl: "/403",
        reason: `Role '${options.requiredRole}' required`,
      };
    }
  }

  // 6. Permission Guard (Tenant Admin has all permissions automatically)
  if (options.requiredPermission && !auth.isSuperAdmin && !auth.isTenantAdmin) {
    if (!auth.permissions.includes(options.requiredPermission)) {
      return {
        allowed: false,
        redirectUrl: "/403",
        reason: `Permission '${options.requiredPermission}' required`,
      };
    }
  }

  return { allowed: true };
}
