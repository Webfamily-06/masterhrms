"use client";

import { UnifiedFileManager } from "@/components/apps/file-manager/unified-file-manager";

export default function MeFilesPage() {
  return <UnifiedFileManager initialView="list" role="me" baseRoute="/me/files" />;
}
