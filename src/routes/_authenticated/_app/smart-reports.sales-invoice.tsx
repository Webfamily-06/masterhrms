import { createFileRoute } from "@tanstack/react-router";
import { SmartReportDetailView } from "@/components/smart-reports/report-view";

export const Route = createFileRoute("/_authenticated/_app/smart-reports/sales-invoice")({
  component: SalesInvoiceReportRoute,
  head: () => ({ meta: [{ title: "Sales Invoice Summary Report — Smart Reports" }] }),
});

export default function SalesInvoiceReportRoute() {
  return <SmartReportDetailView reportId="sales-invoice" />;
}
