'use client';

import React from "react";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export default function TenantChatContactsPage() {
  return <UnifiedChatApp initialMode="contacts" workspacePrefix="/tenant" />;
}
