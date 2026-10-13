import { createFileRoute } from "@tanstack/react-router";
import { SmartReportDetailView } from "@/components/smart-reports/report-view";

export const Route = createFileRoute("/_authenticated/_app/smart-reports/project-progress")({
  component: ProjectProgressReportRoute,
  head: () => ({ meta: [{ title: "Project Progress Report — Smart Reports" }] }),
});

export default function ProjectProgressReportRoute() {
  return <SmartReportDetailView reportId="project-progress" />;
}
