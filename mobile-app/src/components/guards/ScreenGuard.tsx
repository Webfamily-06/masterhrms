import React from 'react';
import { usePermission } from '../../hooks/usePermission';
import { CanonicalRole } from '../../types/roles.types';
import { ErpModuleKey } from '../../types/modules.types';
import { AccessDeniedView } from './AccessDeniedView';

export interface ScreenGuardProps {
  requiredPermission?: string;
  anyOfPermissions?: string[];
  requiredModule?: ErpModuleKey;
  allowedRoles?: CanonicalRole[];
  children: React.ReactNode;
}

/**
 * Screen-level guard component.
 * Verifies role, module, and permission requirements before rendering child screen.
 * Gracefully presents AccessDeniedView when unauthorized.
 */
export const ScreenGuard: React.FC<ScreenGuardProps> = ({
  requiredPermission,
  anyOfPermissions,
  requiredModule,
  allowedRoles,
  children,
}) => {
  const { activeRole, hasPermission, hasAnyPermission, canAccessModule } = usePermission();

  // 1. Role validation
  if (allowedRoles && allowedRoles.length > 0) {
    if (!activeRole || !allowedRoles.includes(activeRole)) {
      return (
        <AccessDeniedView
          reason="ROLE_UNAUTHORIZED"
          detail={`This screen is restricted to ${allowedRoles.join(', ')} personas.`}
        />
      );
    }
  }

  // 2. Module subscription validation
  if (requiredModule && !canAccessModule(requiredModule)) {
    return (
      <AccessDeniedView
        reason="MODULE_DISABLED"
        detail={`The "${requiredModule.toUpperCase()}" module is not enabled in your organization workspace.`}
      />
    );
  }

  // 3. Authoritative permission check
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <AccessDeniedView
        reason="MISSING_PERMISSION"
        requiredPermission={requiredPermission}
        detail="You lack the required permission code to view this screen."
      />
    );
  }

  if (anyOfPermissions && anyOfPermissions.length > 0 && !hasAnyPermission(anyOfPermissions)) {
    return (
      <AccessDeniedView
        reason="MISSING_PERMISSION"
        requiredPermission={anyOfPermissions.join(' OR ')}
        detail="You lack the required permission code to view this screen."
      />
    );
  }

  return <>{children}</>;
};
