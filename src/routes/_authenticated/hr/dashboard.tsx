import { createFileRoute } from "@tanstack/react-router";
import { HrDashboardFoundation } from "./index";

export const Route = createFileRoute("/_authenticated/hr/dashboard")({
  component: HrDashboardFoundation,
  head: () => ({
    meta: [{ title: "HR Command Center — Master HRMS" }],
  }),
});

export default HrDashboardFoundation;
