import { createFileRoute } from "@tanstack/react-router";
import SmartReportsParentPage from "@/routes/_authenticated/_app/smart-reports";

export const Route = createFileRoute("/_authenticated/hr/reports/training")({
  component: SmartReportsParentPage,
  head: () => ({
    meta: [{ title: "Training Reports — HR Management — Master HRMS" }],
  }),
});

export default SmartReportsParentPage;
