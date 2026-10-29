import { createFileRoute } from "@tanstack/react-router";
import { UnifiedFileManager } from "@/components/apps/file-manager/unified-file-manager";

export const Route = createFileRoute("/_authenticated/_app/apps/file-manager/list-view")({
  component: FileManagerListPage,
  head: () => ({ meta: [{ title: "File Manager List View — Master HRMS" }] }),
});

export function FileManagerListPage() {
  return <UnifiedFileManager initialView="list" baseRoute="/apps/file-manager/list-view" />;
}

export default FileManagerListPage;
