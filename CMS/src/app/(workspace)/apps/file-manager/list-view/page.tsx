"use client";

import { UnifiedFileManager } from "@/components/apps/file-manager/unified-file-manager";

export default function FileManagerListPage() {
  return <UnifiedFileManager initialView="list" baseRoute="/apps/file-manager/list-view" />;
}
