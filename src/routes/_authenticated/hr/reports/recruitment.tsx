import { createFileRoute } from "@tanstack/react-router";
import DealPipelineReportRoute from "@/routes/_authenticated/_app/smart-reports.deal-pipeline";

export const Route = createFileRoute("/_authenticated/hr/reports/recruitment")({
  component: DealPipelineReportRoute,
  head: () => ({
    meta: [{ title: "Recruitment Pipeline Report — HR Management — Master HRMS" }],
  }),
});

export default DealPipelineReportRoute;
