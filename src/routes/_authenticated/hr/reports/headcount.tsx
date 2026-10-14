import { createFileRoute } from "@tanstack/react-router";
import { EmployeeReportPage } from "@/routes/_authenticated/_app/employee-report";

export const Route = createFileRoute("/_authenticated/hr/reports/headcount")({
  component: EmployeeReportPage,
  head: () => ({
    meta: [{ title: "Headcount Report — HR Management — Master HRMS" }],
  }),
});

export default EmployeeReportPage;
