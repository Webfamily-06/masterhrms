import { createFileRoute } from "@tanstack/react-router";
import { SmartReportDetailView } from "@/components/smart-reports/report-view";

export const Route = createFileRoute("/_authenticated/_app/smart-reports/deal-pipeline")({
  component: DealPipelineReportRoute,
  head: () => ({ meta: [{ title: "Deal Pipeline Report — Smart Reports" }] }),
});

export default function DealPipelineReportRoute() {
  return <SmartReportDetailView reportId="deal-pipeline" />;
}
