/**
 * Role-Based Portal Redirection & Navigation Engine
 * Resolves the authenticated user's landing page based on verified server-side roles.
 */

export function extractRolesFromToken(token?: string | null): { roles: string[]; isImpersonating?: boolean } {
  if (!token) return { roles: [] };
  try {
    const parts = token.split(".");
    if (parts.length < 2) return { roles: [] };
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    return {
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      isImpersonating: Boolean(payload.isImpersonating),
    };
  } catch {
    return { roles: [] };
  }
}

export function resolveDefaultRoute(
  roles: string[] = [],
  redirect?: string | null,
  options?: { isImpersonating?: boolean }
): string {
  const normalized = roles.map((r) => String(r).toLowerCase().replace(/[-_ ]/g, ""));
  const isSuperAdmin = roles.includes("super_admin") || normalized.includes("superadmin");
  const isTenantAdmin =
    isSuperAdmin ||
    normalized.some((r) =>
      ["admin", "tenantadmin", "workspaceadmin", "organizationadmin", "owner"].includes(r)
    );
  const isHrAdmin = isTenantAdmin || normalized.some((r) => ["hradmin", "hr", "hrmanager", "manager"].includes(r));
  const isEmployee = normalized.includes("employee") || normalized.includes("staff") || roles.length === 0;

  // Resolve authorized landing page based on role hierarchy
  const defaultLanding = isSuperAdmin
    ? "/super"
    : isTenantAdmin
    ? "/tenant/dashboard"
    : isHrAdmin
    ? "/hr/dashboard"
    : "/me/dashboard";

  // If super admin is impersonating a tenant, preserve tenant landing (/hrm-dashboard)
  const isImpersonating =
    options?.isImpersonating ??
    (typeof window !== "undefined" && localStorage.getItem("hrms_impersonation_active") === "true");

  if (isImpersonating) {
    return "/hrm-dashboard";
  }

  // Validate explicit intended redirect path
  if (
    redirect &&
    redirect !== "/" &&
    redirect !== "/auth" &&
    redirect !== "/login" &&
    redirect !== "/super-login" &&
    !redirect.startsWith("/auth")
  ) {
    // 1. Legacy Route Translation based on authorized role
    if (redirect === "/todo" || redirect === "/apps/todo/task-list") {
      return isEmployee && !isHrAdmin && !isTenantAdmin ? "/me/todo" : isHrAdmin && !isTenantAdmin ? "/hr/todo" : "/tenant/todo";
    }
    if (redirect === "/apps/todo/gantt") {
      return isEmployee && !isHrAdmin && !isTenantAdmin ? "/me/todo/gantt" : isHrAdmin && !isTenantAdmin ? "/hr/todo/gantt" : "/tenant/todo/gantt";
    }
    if (redirect === "/apps/calendar") {
      return isEmployee && !isHrAdmin && !isTenantAdmin ? "/me/calendar" : isHrAdmin && !isTenantAdmin ? "/hr/calendar" : "/tenant/calendar";
    }
    if (redirect === "/chat" || redirect === "/apps/chat" || redirect === "/apps/chat/chats") {
      return isEmployee && !isHrAdmin && !isTenantAdmin ? "/me/chat" : isHrAdmin && !isTenantAdmin ? "/hr/chat" : "/tenant/chat";
    }
    if (redirect === "/apps/chat/chat-groups") {
      return isEmployee && !isHrAdmin && !isTenantAdmin ? "/me/chat/groups" : isHrAdmin && !isTenantAdmin ? "/hr/chat/groups" : "/tenant/chat/groups";
    }
    if (redirect === "/apps/chat/chat-contact") {
      return isEmployee && !isHrAdmin && !isTenantAdmin ? "/me/chat/contacts" : isHrAdmin && !isTenantAdmin ? "/hr/chat/contacts" : "/tenant/chat/contacts";
    }

    // 2. Authorization validation for destination path
    if (redirect.startsWith("/super") && !isSuperAdmin) {
      return defaultLanding;
    }
    if (redirect.startsWith("/tenant") && !isTenantAdmin) {
      return defaultLanding;
    }
    if (redirect.startsWith("/hr") && !isHrAdmin) {
      return defaultLanding;
    }

    return redirect;
  }

  return defaultLanding;
}

export function resolveWorkspaceChatRoute(
  subpath: "" | "/groups" | "/contacts" = "",
  token?: string | null
): string | null {
  const effectiveToken = token || (typeof window !== "undefined" ? localStorage.getItem("hrms_auth_token") : null);
  const { roles } = extractRolesFromToken(effectiveToken);
  const normalized = roles.map((r) => String(r).toLowerCase().replace(/[-_ ]/g, ""));
  const isSuperAdmin = roles.includes("super_admin") || normalized.includes("superadmin");
  if (isSuperAdmin) {
    return null;
  }
  const isTenantAdmin = normalized.some((r) =>
    ["admin", "tenantadmin", "workspaceadmin", "organizationadmin", "owner"].includes(r)
  );
  const isHrAdmin = isTenantAdmin || normalized.some((r) => ["hradmin", "hr", "hrmanager", "manager"].includes(r));
  const prefix = isTenantAdmin ? "/tenant/chat" : isHrAdmin ? "/hr/chat" : "/me/chat";
  return `${prefix}${subpath}`;
}

