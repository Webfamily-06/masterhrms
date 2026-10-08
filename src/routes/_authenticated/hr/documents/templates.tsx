import { createFileRoute } from "@tanstack/react-router";
import HrDocumentTemplatesPage from "./document-templates";

export const Route = createFileRoute("/_authenticated/hr/documents/templates")({
  component: HrDocumentTemplatesPage,
  head: () => ({
    meta: [{ title: "Document Templates — Master HRMS" }],
  }),
});

export default HrDocumentTemplatesPage;
