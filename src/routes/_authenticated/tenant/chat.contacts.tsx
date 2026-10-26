import { createFileRoute } from "@tanstack/react-router";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export const Route = createFileRoute("/_authenticated/tenant/chat/contacts")({
  component: TenantChatContactsPage,
  head: () => ({
    meta: [{ title: "Chat Contacts — Tenant Administration — Master HRMS" }],
  }),
});

export function TenantChatContactsPage() {
  return <UnifiedChatApp initialMode="contacts" workspacePrefix="/tenant" />;
}

export default TenantChatContactsPage;
