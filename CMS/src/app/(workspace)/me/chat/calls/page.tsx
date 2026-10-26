"use client";

import React from "react";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export default function EmployeeChatCallsPage() {
  return <UnifiedChatApp initialMode="calls" workspacePrefix="/me" />;
}
