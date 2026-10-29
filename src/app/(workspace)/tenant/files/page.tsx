"use client";

import { UnifiedFileManager } from "@/components/apps/file-manager/unified-file-manager";

export default function TenantFilesPage() {
  return <UnifiedFileManager initialView="list" role="tenant" baseRoute="/tenant/files" />;
}
