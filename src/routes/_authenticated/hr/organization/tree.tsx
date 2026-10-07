import { createFileRoute } from "@tanstack/react-router";
import { OrgStructurePage } from "./structure";

export const Route = createFileRoute("/_authenticated/hr/organization/tree")({
  component: OrgStructurePage,
  head: () => ({
    meta: [{ title: "Organization Tree — Master HRMS" }],
  }),
});
