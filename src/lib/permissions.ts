import { useMemo } from "react";
import { useCurrentProfile, ProfileWithRoles } from "./session";
import { ERP_MODULES } from "./erp-modules";

export function isSuperAdminUser(profile: ProfileWithRoles | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(profile.roles?.includes("super_admin")) || profile.workspaceRole?.name === "Super Administrator";
}

export function isWorkspaceAdminUser(profile: ProfileWithRoles | null | undefined): boolean {
  if (!profile) return false;
  if (
    profile.roles?.includes("admin") ||
    profile.roles?.includes("workspace_admin") ||
    profile.roles?.includes("tenant_admin") ||
    profile.roles?.includes("hr_admin")
  ) return true;
  return profile.workspaceRole?.name === "Workspace Admin" && profile.workspaceRole?.isActive === true;
}

export function hasPermission(
  code: string,
  profile: ProfileWithRoles | null | undefined
): boolean {
  if (!profile) return false;
  if (isWorkspaceAdminUser(profile)) return true;

  // Check if parent module is disabled in workspace
  const moduleKey = code.split(".")[0];
  if (profile.enabledModules && profile.enabledModules.length > 0) {
    if (!profile.enabledModules.includes(moduleKey)) {
      return false;
    }
  }

  return (profile.permissions || []).includes(code);
}

export function hasAnyPermission(
  codes: string[],
  profile: ProfileWithRoles | null | undefined
): boolean {
  if (!profile) return false;
  if (isWorkspaceAdminUser(profile)) return true;
  return codes.some((code) => hasPermission(code, profile));
}

export function hasAllPermissions(
  codes: string[],
  profile: ProfileWithRoles | null | undefined
): boolean {
  if (!profile) return false;
  if (isWorkspaceAdminUser(profile)) return true;
  return codes.every((code) => hasPermission(code, profile));
}

export function isModuleAllowed(
  moduleKey: string,
  profile: ProfileWithRoles | null | undefined
): boolean {
  if (!profile) return false;
  if (isSuperAdminUser(profile)) return true;

  const mod = ERP_MODULES.find((m) => m.key === moduleKey);
  if (!mod) return false;

  // Check workspace entitlement (supporting product aliases)
  if (profile.enabledModules && profile.enabledModules.length > 0) {
    const isEnabled =
      profile.enabledModules.includes(moduleKey) ||
      (moduleKey === "crm" && profile.enabledModules.includes("product_crm")) ||
      ((moduleKey === "pos" || moduleKey === "inventory") &&
        (profile.enabledModules.includes("pos") || profile.enabledModules.includes("product_pos") || profile.enabledModules.includes("inventory"))) ||
      ((moduleKey === "accounting" || moduleKey === "finance") &&
        (profile.enabledModules.includes("accounting") || profile.enabledModules.includes("finance") || profile.enabledModules.includes("product_finance")));
    if (!isEnabled) {
      return false;
    }
  }

  // Check role permission
  if (isWorkspaceAdminUser(profile)) return true;
  return (profile.permissions || []).includes(mod.permission);
}

/**
 * Platform-only routes: Strictly restricted to Platform Super Admin
 */
export const PLATFORM_ONLY_ROUTES = ["/cronjob"];

export function isPlatformOnlyRoute(pathname: string): boolean {
  if (pathname.startsWith("/super")) return true;
  return PLATFORM_ONLY_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

/**
 * Explicitly approved shared routes: Normal routes authorized for Platform Super Admin
 * as well as authorized tenant roles.
 */
export const EXPLICIT_SHARED_ROUTES = [
  "/clear-cache",
  "/system-states",
  "/ai-configuration",
  "/ai-settings",
  "/ai-writer",
  "/ai",
];

export function isSharedRoute(pathname: string): boolean {
  return EXPLICIT_SHARED_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

/**
 * usePermissions - Central React hook for permission checks in components and pages
 */
export function usePermissions() {
  const { data: profile, isLoading } = useCurrentProfile();

  const isSuperAdmin = useMemo(() => isSuperAdminUser(profile), [profile]);
  const isWorkspaceAdmin = useMemo(() => isWorkspaceAdminUser(profile), [profile]);

  const permissions = useMemo(() => profile?.permissions || [], [profile]);
  const enabledModules = useMemo(() => profile?.enabledModules || [], [profile]);
  const allowedDashboards = useMemo(() => profile?.allowedDashboards || [], [profile]);

  const allowedModules = useMemo(() => {
    if (isLoading || !profile) return [];
    return ERP_MODULES.filter((m) => isModuleAllowed(m.key, profile));
  }, [profile, isLoading]);

  return {
    profile,
    loading: isLoading,
    workspaceRole: profile?.workspaceRole || null,
    isSuperAdmin,
    isWorkspaceAdmin,
    permissions,
    enabledModules,
    allowedDashboards,
    allowedModules,
    can: (code: string) => hasPermission(code, profile),
    canAny: (...codes: string[]) => hasAnyPermission(codes, profile),
    canAll: (...codes: string[]) => hasAllPermissions(codes, profile),
    canAccessModule: (key: string) => isModuleAllowed(key, profile),
  };
}
