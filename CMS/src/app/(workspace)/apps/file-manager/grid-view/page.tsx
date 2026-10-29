"use client";

import { UnifiedFileManager } from "@/components/apps/file-manager/unified-file-manager";

export default function FileManagerGridPage() {
  return <UnifiedFileManager initialView="grid" baseRoute="/apps/file-manager/grid-view" />;
}
