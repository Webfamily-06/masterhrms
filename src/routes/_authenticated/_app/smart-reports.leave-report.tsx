import { createFileRoute } from "@tanstack/react-router";
import { SmartReportDetailView } from "@/components/smart-reports/report-view";

export const Route = createFileRoute("/_authenticated/_app/smart-reports/leave-report")({
  component: LeaveReportRoute,
  head: () => ({ meta: [{ title: "Leave Utilization Report — Smart Reports" }] }),
});

export default function LeaveReportRoute() {
  return <SmartReportDetailView reportId="leave-report" />;
}
