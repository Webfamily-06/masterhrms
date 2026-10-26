'use client';

import React from "react";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export default function MeChatPage() {
  return <UnifiedChatApp initialMode="chats" workspacePrefix="/me" />;
}
