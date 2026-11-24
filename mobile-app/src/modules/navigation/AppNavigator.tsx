import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { EmployeeNavigator } from './EmployeeNavigator';
import { ManagerNavigator } from './ManagerNavigator';
import { HrAdminNavigator } from './HrAdminNavigator';
import { TenantAdminNavigator } from './TenantAdminNavigator';
import { SuperAdminNavigator } from './SuperAdminNavigator';
import { AccessDeniedView } from '../../components/guards/AccessDeniedView';

export const AppNavigator: React.FC = () => {
  const activeRole = useAuthStore((state) => state.activeRole);
  const canonicalRoles = useAuthStore((state) => state.canonicalRoles);

  // Strict: If user has no valid canonical role, fail closed and render AccessDeniedView
  if (!activeRole || canonicalRoles.length === 0) {
    return <AccessDeniedView reason="NO_VALID_ROLE" />;
  }

  if ((activeRole as string) === 'super_admin') {
    return <SuperAdminNavigator />;
  }

  switch (activeRole) {
    case 'tenant_admin':
      return <TenantAdminNavigator />;
    case 'hr_admin':
      return <HrAdminNavigator />;
    case 'manager':
      return <ManagerNavigator />;
    case 'employee':
      return <EmployeeNavigator />;
    default:
      return <AccessDeniedView reason="NO_VALID_ROLE" />;
  }
};
