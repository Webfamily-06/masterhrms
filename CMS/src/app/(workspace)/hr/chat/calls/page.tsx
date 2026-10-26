"use client";

import React from "react";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export default function HRChatCallsPage() {
  return <UnifiedChatApp initialMode="calls" workspacePrefix="/hr" />;
}
