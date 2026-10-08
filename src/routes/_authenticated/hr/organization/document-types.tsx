import { createFileRoute } from "@tanstack/react-router";
import HrDocumentCategoriesPage from "../documents/categories";

export const Route = createFileRoute("/_authenticated/hr/organization/document-types")({
  component: HrDocumentCategoriesPage,
  head: () => ({ meta: [{ title: "Organization Document Types — Master HRMS" }] }),
});

export default HrDocumentCategoriesPage;
