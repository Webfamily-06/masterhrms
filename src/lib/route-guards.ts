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
 * Resolves current authentication state from localStorage.
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

  const roles: string[] = user?.roles || [];
  const permissions: string[] = user?.permissions || [];
  const enabledModules: string[] = user?.enabledModules || [];
  const isSuperAdmin = roles.includes("super_admin");
  const isTenantAdmin =
    isSuperAdmin ||
    roles.includes("admin") ||
    roles.includes("workspace_admin") ||
    roles.includes("tenant_admin") ||
    roles.includes("Workspace Admin");

  return {
    token,
    userId: user?.id || user?.userId || null,
    tenantId: user?.tenantId || null,
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
    return {
      allowed: false,
      redirectUrl: "/onboarding",
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
    const hasHrRole = auth.roles.some((r) => r === "hr_admin" || r === "hr_manager" || r === "manager");
    const hasHrPerm = auth.permissions.some((p) => p.startsWith("hr.") || p.startsWith("employees.") || p.startsWith("attendance."));
    if (!hasHrRole && !hasHrPerm) {
      return {
        allowed: false,
        redirectUrl: "/403",
        reason: "HR Management privileges required",
      };
    }
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
