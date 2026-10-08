import { createFileRoute } from "@tanstack/react-router";
import HrCareerSitePage from "./career-site";

export const Route = createFileRoute("/_authenticated/hr/recruitment/career")({
  component: HrCareerSitePage,
  head: () => ({
    meta: [{ title: "Career Portal & Public Board — Master HRMS" }],
  }),
});

export default HrCareerSitePage;
