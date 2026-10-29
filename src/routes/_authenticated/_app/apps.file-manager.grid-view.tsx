import { createFileRoute } from "@tanstack/react-router";
import { UnifiedFileManager } from "@/components/apps/file-manager/unified-file-manager";

export const Route = createFileRoute("/_authenticated/_app/apps/file-manager/grid-view")({
  component: FileManagerGridPage,
  head: () => ({ meta: [{ title: "File Manager Grid View — Master HRMS" }] }),
});

export function FileManagerGridPage() {
  return <UnifiedFileManager initialView="grid" baseRoute="/apps/file-manager/grid-view" />;
}

export default FileManagerGridPage;
