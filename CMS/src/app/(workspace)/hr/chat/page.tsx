'use client';

import React from "react";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export default function HrChatPage() {
  return <UnifiedChatApp initialMode="chats" workspacePrefix="/hr" />;
}
