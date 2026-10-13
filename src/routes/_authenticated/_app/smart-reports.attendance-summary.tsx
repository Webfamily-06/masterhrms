import { createFileRoute } from "@tanstack/react-router";
import { SmartReportDetailView } from "@/components/smart-reports/report-view";

export const Route = createFileRoute("/_authenticated/_app/smart-reports/attendance-summary")({
  component: AttendanceSummaryReportRoute,
  head: () => ({ meta: [{ title: "Attendance Summary Report — Smart Reports" }] }),
});

export default function AttendanceSummaryReportRoute() {
  return <SmartReportDetailView reportId="attendance-summary" />;
}
