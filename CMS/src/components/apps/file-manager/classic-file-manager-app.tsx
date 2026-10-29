"use client";

import React from "react";
import { UnifiedFileManager, FileManagerView } from "./unified-file-manager";

export type { FileManagerView };

export interface ClassicFileManagerAppProps {
  initialView?: FileManagerView;
}

export function ClassicFileManagerApp({ initialView = "list" }: ClassicFileManagerAppProps) {
  return <UnifiedFileManager initialView={initialView} />;
}

export default ClassicFileManagerApp;
