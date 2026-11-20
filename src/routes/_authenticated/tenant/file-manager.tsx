import { createFileRoute } from "@tanstack/react-router";
import { UnifiedFileManager } from "@/components/apps/file-manager/unified-file-manager";

export const Route = createFileRoute("/_authenticated/tenant/file-manager")({
  component: TenantFileManagerPage,
  head: () => ({
    meta: [{ title: "File Manager — Master HRMS Workspace" }],
  }),
});

export function TenantFileManagerPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <UnifiedFileManager initialView="list" baseRoute="/tenant/file-manager" />
    </div>
  );
}

export default TenantFileManagerPage;
