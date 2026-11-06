import { createFileRoute } from "@tanstack/react-router";
import { InteractiveOrgTree } from "@/components/organization/interactive-org-tree";

export const Route = createFileRoute("/_authenticated/hr/organization/structure")({
  component: OrgStructurePage,
  head: () => ({
    meta: [{ title: "Organization Tree & Hierarchy — Master HRMS" }],
  }),
});

export function OrgStructurePage() {
  return <InteractiveOrgTree />;
}

export default OrgStructurePage;
