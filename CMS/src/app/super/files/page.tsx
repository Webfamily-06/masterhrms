"use client";

import { UnifiedFileManager } from "@/components/apps/file-manager/unified-file-manager";

export default function SuperFilesPage() {
  return <UnifiedFileManager initialView="grid" role="super" baseRoute="/super/files" />;
}

