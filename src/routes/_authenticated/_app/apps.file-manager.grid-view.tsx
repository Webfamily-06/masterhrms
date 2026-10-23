import { createFileRoute } from "@tanstack/react-router";
import { ClassicFileManagerApp } from "@/components/apps/file-manager/classic-file-manager-app";

export const Route = createFileRoute("/_authenticated/_app/apps/file-manager/grid-view")({
  component: FileManagerGridPage,
  head: () => ({ meta: [{ title: "File Manager Grid View — Master HRMS" }] }),
});

export function FileManagerGridPage() {
  return <ClassicFileManagerApp initialView="grid" />;
}

export default FileManagerGridPage;
