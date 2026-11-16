import { useMemo, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { PermissionService } from '../core/permissions/permissionService';
import { ErpModuleKey } from '../types/modules.types';

export function usePermission() {
  const permissions = useAuthStore((state) => state.permissions);
  const activeRole = useAuthStore((state) => state.activeRole);
  const roles = useAuthStore((state) => state.canonicalRoles);
  const enabledModules = useAuthStore((state) => state.enabledModules);
  const allowedDashboards = useAuthStore((state) => state.allowedDashboards);

  const hasPermission = useCallback(
    (requiredPermission: string): boolean => {
      return PermissionService.hasPermission(permissions, requiredPermission);
    },
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (requiredPermissions: string[]): boolean => {
      return PermissionService.hasAnyPermission(permissions, requiredPermissions);
    },
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (requiredPermissions: string[]): boolean => {
      return PermissionService.hasAllPermissions(permissions, requiredPermissions);
    },
    [permissions]
  );

  const canAccessModule = useCallback(
    (moduleKey: ErpModuleKey): boolean => {
      return enabledModules.includes(moduleKey);
    },
    [enabledModules]
  );

  const canAccessDashboard = useCallback(
    (moduleKey: ErpModuleKey): boolean => {
      return allowedDashboards.includes(moduleKey);
    },
    [allowedDashboards]
  );

  return useMemo(
    () => ({
      permissions,
      activeRole,
      roles,
      enabledModules,
      allowedDashboards,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canAccessModule,
      canAccessDashboard,
    }),
    [
      permissions,
      activeRole,
      roles,
      enabledModules,
      allowedDashboards,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canAccessModule,
      canAccessDashboard,
    ]
  );
}
