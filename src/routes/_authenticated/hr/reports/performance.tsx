import { createFileRoute } from "@tanstack/react-router";
import ProjectProgressReportRoute from "@/routes/_authenticated/_app/smart-reports.project-progress";

export const Route = createFileRoute("/_authenticated/hr/reports/performance")({
  component: ProjectProgressReportRoute,
  head: () => ({
    meta: [{ title: "Performance Goals & Progress Report — HR Management — Master HRMS" }],
  }),
});

export default ProjectProgressReportRoute;
