import { useMemo } from "react";
import { useCurrentProfile, ProfileWithRoles } from "./session";
import { ERP_MODULES } from "./erp-modules";

export function isSuperAdminUser(profile: ProfileWithRoles | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(profile.roles?.includes("super_admin")) || profile.workspaceRole?.name === "Super Administrator";
}

export function isWorkspaceAdminUser(profile: ProfileWithRoles | null | undefined): boolean {
  if (!profile) return false;
  if (isSuperAdminUser(profile)) return true;
  if (profile.roles?.includes("admin") || profile.roles?.includes("workspace_admin")) return true;
  return profile.workspaceRole?.name === "Workspace Admin" && profile.workspaceRole?.isActive === true;
}

export function hasPermission(
  code: string,
  profile: ProfileWithRoles | null | undefined
): boolean {
  if (!profile) return false;
  if (isSuperAdminUser(profile)) return true;
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
  if (isSuperAdminUser(profile) || isWorkspaceAdminUser(profile)) return true;
  return codes.some((code) => hasPermission(code, profile));
}

export function hasAllPermissions(
  codes: string[],
  profile: ProfileWithRoles | null | undefined
): boolean {
  if (!profile) return false;
  if (isSuperAdminUser(profile) || isWorkspaceAdminUser(profile)) return true;
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

  // Check workspace enabled
  if (profile.enabledModules && !profile.enabledModules.includes(moduleKey)) {
    return false;
  }

  // Check role permission
  if (isWorkspaceAdminUser(profile)) return true;
  return (profile.permissions || []).includes(mod.permission);
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
