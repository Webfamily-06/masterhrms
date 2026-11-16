import React from 'react';
import { usePermission } from '../../hooks/usePermission';
import { ErpModuleKey } from '../../types/modules.types';

export interface ModuleGateProps {
  module: ErpModuleKey;
  requireDashboardAccess?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditionally renders child components based on whether an ERP module
 * is actively subscribed and enabled for the tenant.
 */
export const ModuleGate: React.FC<ModuleGateProps> = ({
  module,
  requireDashboardAccess = false,
  fallback = null,
  children,
}) => {
  const { canAccessModule, canAccessDashboard } = usePermission();

  const isModuleEnabled = canAccessModule(module);
  if (!isModuleEnabled) {
    return <>{fallback}</>;
  }

  if (requireDashboardAccess && !canAccessDashboard(module)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
