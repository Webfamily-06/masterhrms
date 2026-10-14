import { createFileRoute } from "@tanstack/react-router";
import PayrollSheetReportRoute from "@/routes/_authenticated/_app/smart-reports.payroll-sheet";

export const Route = createFileRoute("/_authenticated/hr/reports/statutory")({
  component: PayrollSheetReportRoute,
  head: () => ({
    meta: [{ title: "Statutory Payroll Report — HR Management — Master HRMS" }],
  }),
});

export default PayrollSheetReportRoute;
