import { createFileRoute } from "@tanstack/react-router";
import { UnifiedFileManager } from "@/components/apps/file-manager/unified-file-manager";

export const Route = createFileRoute("/_authenticated/me/files")({
  component: MeFilesPage,
  head: () => ({ meta: [{ title: "My Files — Master HRMS" }] }),
});

export function MeFilesPage() {
  return <UnifiedFileManager initialView="list" role="me" baseRoute="/me/files" />;
}

export default MeFilesPage;

