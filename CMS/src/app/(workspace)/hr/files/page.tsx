"use client";

import { UnifiedFileManager } from "@/components/apps/file-manager/unified-file-manager";

export default function HrFilesPage() {
  return <UnifiedFileManager initialView="list" role="hr" baseRoute="/hr/files" />;
}

