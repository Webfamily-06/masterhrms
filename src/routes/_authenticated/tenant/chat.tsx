import { createFileRoute } from "@tanstack/react-router";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export const Route = createFileRoute("/_authenticated/tenant/chat")({
  component: TenantChatPage,
  head: () => ({
    meta: [{ title: "Personal Chat — Tenant Administration — Master HRMS" }],
  }),
});

export function TenantChatPage() {
  return <UnifiedChatApp initialMode="chats" workspacePrefix="/tenant" />;
}

export default TenantChatPage;
