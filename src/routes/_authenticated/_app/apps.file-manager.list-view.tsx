import { createFileRoute } from "@tanstack/react-router";
import { ClassicFileManagerApp } from "@/components/apps/file-manager/classic-file-manager-app";

export const Route = createFileRoute("/_authenticated/_app/apps/file-manager/list-view")({
  component: FileManagerListPage,
  head: () => ({ meta: [{ title: "File Manager List View — Master HRMS" }] }),
});

export function FileManagerListPage() {
  return <ClassicFileManagerApp initialView="list" />;
}

export default FileManagerListPage;
