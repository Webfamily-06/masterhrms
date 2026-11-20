import { createFileRoute } from "@tanstack/react-router";
import { InteractiveOrgTree } from "@/components/organization/interactive-org-tree";

export const Route = createFileRoute("/_authenticated/tenant/organization")({
  component: TenantOrganizationPage,
  head: () => ({
    meta: [{ title: "Organization Structure — Master HRMS Workspace" }],
  }),
});

export function TenantOrganizationPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <InteractiveOrgTree />
    </div>
  );
}

export default TenantOrganizationPage;
