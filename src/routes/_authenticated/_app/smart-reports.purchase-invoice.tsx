import { createFileRoute } from "@tanstack/react-router";
import { SmartReportDetailView } from "@/components/smart-reports/report-view";

export const Route = createFileRoute("/_authenticated/_app/smart-reports/purchase-invoice")({
  component: PurchaseInvoiceReportRoute,
  head: () => ({ meta: [{ title: "Purchase Invoice Summary Report — Smart Reports" }] }),
});

export default function PurchaseInvoiceReportRoute() {
  return <SmartReportDetailView reportId="purchase-invoice" />;
}
