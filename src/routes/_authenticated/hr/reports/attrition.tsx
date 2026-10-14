import { createFileRoute } from "@tanstack/react-router";
import { EmployeeReportPage } from "@/routes/_authenticated/_app/employee-report";

export const Route = createFileRoute("/_authenticated/hr/reports/attrition")({
  component: EmployeeReportPage,
  head: () => ({
    meta: [{ title: "Attrition Report — HR Management — Master HRMS" }],
  }),
});

export default EmployeeReportPage;
