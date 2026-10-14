import { createFileRoute } from "@tanstack/react-router";
import { PayslipReportPage } from "@/routes/_authenticated/_app/payslip-report";

export const Route = createFileRoute("/_authenticated/hr/reports/payroll")({
  component: PayslipReportPage,
  head: () => ({
    meta: [{ title: "Payroll Report — HR Management — Master HRMS" }],
  }),
});

export default PayslipReportPage;
