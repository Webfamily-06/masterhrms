import { createFileRoute } from "@tanstack/react-router";
import { OrgStructurePage } from "./structure";

export const Route = createFileRoute("/_authenticated/hr/organization/")({
  component: OrgStructurePage,
  head: () => ({
    meta: [{ title: "Organization Structure — Master HRMS" }],
  }),
});

export default OrgStructurePage;
