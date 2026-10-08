import { createFileRoute } from "@tanstack/react-router";
import DashboardPage from "../_app/hrm-dashboard";

export const Route = createFileRoute("/_authenticated/hr/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [{ title: "HRM Dashboard — Master HRMS" }],
  }),
});

export default DashboardPage;
