'use client';

import React from "react";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export default function MeChatContactsPage() {
  return <UnifiedChatApp initialMode="contacts" workspacePrefix="/me" />;
}
