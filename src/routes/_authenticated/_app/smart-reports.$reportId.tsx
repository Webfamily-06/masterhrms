import { createFileRoute } from "@tanstack/react-router";
import { SmartReportDetailView } from "@/components/smart-reports/report-view";

export const Route = createFileRoute("/_authenticated/_app/smart-reports/$reportId")({
  component: DynamicReportFallbackRoute,
  head: ({ params }) => ({ meta: [{ title: `Report — ${params.reportId}` }] }),
});

export default function DynamicReportFallbackRoute() {
  const { reportId } = Route.useParams();
  return <SmartReportDetailView reportId={reportId} />;
}
