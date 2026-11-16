'use client';

import { WorkspaceAdminSettings } from "@/components/workspace-admin-settings";

export default function TenantRolesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <WorkspaceAdminSettings defaultTab="roles" />
    </div>
  );
}
