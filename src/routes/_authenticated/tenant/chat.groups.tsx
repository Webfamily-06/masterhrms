import { createFileRoute } from "@tanstack/react-router";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export const Route = createFileRoute("/_authenticated/tenant/chat/groups")({
  component: TenantChatGroupsPage,
  head: () => ({
    meta: [{ title: "Chat Groups — Tenant Administration — Master HRMS" }],
  }),
});

export function TenantChatGroupsPage() {
  return <UnifiedChatApp initialMode="groups" workspacePrefix="/tenant" />;
}

export default TenantChatGroupsPage;
