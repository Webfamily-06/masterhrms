'use client';

import React from "react";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export default function TenantChatGroupsPage() {
  return <UnifiedChatApp initialMode="groups" workspacePrefix="/tenant" />;
}
