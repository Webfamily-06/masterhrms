import { createFileRoute } from "@tanstack/react-router";
import { UnifiedFileManager } from "@/components/apps/file-manager/unified-file-manager";

export const Route = createFileRoute("/_authenticated/hr/files")({
  component: HrFilesPage,
  head: () => ({ meta: [{ title: "File Manager — HR Management — Master HRMS" }] }),
});

export function HrFilesPage() {
  return <UnifiedFileManager initialView="list" role="hr" baseRoute="/hr/files" />;
}

export default HrFilesPage;

