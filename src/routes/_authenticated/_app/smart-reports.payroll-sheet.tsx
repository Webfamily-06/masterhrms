import { createFileRoute } from "@tanstack/react-router";
import { SmartReportDetailView } from "@/components/smart-reports/report-view";

export const Route = createFileRoute("/_authenticated/_app/smart-reports/payroll-sheet")({
  component: PayrollSheetReportRoute,
  head: () => ({ meta: [{ title: "Payroll Sheet Report — Smart Reports" }] }),
});

export default function PayrollSheetReportRoute() {
  return <SmartReportDetailView reportId="payroll-sheet" />;
}
