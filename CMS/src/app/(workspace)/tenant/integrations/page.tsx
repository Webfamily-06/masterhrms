'use client';

import { IntegrationsHubStudio } from '@/components/integrations/integrations-hub-studio';
import { AccessDenied } from '@/components/access-denied';
import { usePermissions } from '@/lib/permissions';

export default function TenantIntegrationsPage() {
  const { isWorkspaceAdmin, isSuperAdmin, loading } = usePermissions();
  const isAuthorized = isWorkspaceAdmin || isSuperAdmin;

  if (!loading && !isAuthorized) {
    return (
      <AccessDenied
        moduleName="Tenant Integrations"
        requiredPermission="workspace.integrations.view"
      />
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto pb-16">
      <IntegrationsHubStudio mode="tenant" />
    </div>
  );
}
