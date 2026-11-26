'use client';

import { ManageRolesConsole } from "@/components/roles/manage-roles-console";

export default function TenantRolesPage() {
  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 space-y-6">
      <ManageRolesConsole />
    </div>
  );
}
