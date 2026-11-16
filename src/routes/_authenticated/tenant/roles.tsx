import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceAdminSettings } from "@/components/workspace-admin-settings";

export const Route = createFileRoute("/_authenticated/tenant/roles")({
  component: TenantRolesPage,
  head: () => ({
    meta: [{ title: "Roles & Access Governance — Master HRMS" }],
  }),
});

function TenantRolesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <WorkspaceAdminSettings defaultTab="roles" />
    </div>
  );
}
