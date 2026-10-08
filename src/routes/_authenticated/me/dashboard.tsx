import { createFileRoute } from "@tanstack/react-router";
import { EmployeeDashboardFoundation } from "./index";

export const Route = createFileRoute("/_authenticated/me/dashboard")({
  component: EmployeeDashboardFoundation,
  head: () => ({
    meta: [{ title: "Employee Dashboard — Master HRMS" }],
  }),
});

export default EmployeeDashboardFoundation;
