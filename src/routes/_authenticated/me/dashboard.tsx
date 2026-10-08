import { createFileRoute } from "@tanstack/react-router";
import EmployeeDashboardPage from "../_app/employee-dashboard";

export const Route = createFileRoute("/_authenticated/me/dashboard")({
  component: EmployeeDashboardPage,
  head: () => ({
    meta: [{ title: "Employee Dashboard — Master HRMS" }],
  }),
});

export default EmployeeDashboardPage;
