import { createFileRoute } from "@tanstack/react-router";
import { SmartReportDetailView } from "@/components/smart-reports/report-view";

export const Route = createFileRoute("/_authenticated/_app/smart-reports/product-stock")({
  component: ProductStockReportRoute,
  head: () => ({ meta: [{ title: "Product Stock Inventory Report — Smart Reports" }] }),
});

export default function ProductStockReportRoute() {
  return <SmartReportDetailView reportId="product-stock" />;
}
