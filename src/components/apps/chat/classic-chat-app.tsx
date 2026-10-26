"use client";

import React from "react";
import { UnifiedChatApp, ChatMode } from "@/components/chat/unified-chat-app";

export interface ClassicChatAppProps {
  initialMode?: ChatMode;
  workspacePrefix?: string;
}

export function ClassicChatApp({ initialMode = "chats", workspacePrefix }: ClassicChatAppProps) {
  return <UnifiedChatApp initialMode={initialMode} workspacePrefix={workspacePrefix} />;
}

export default ClassicChatApp;
