import { createFileRoute } from "@tanstack/react-router";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export const Route = createFileRoute("/_authenticated/tenant/chat/calls")({
  component: TenantChatCallsPage,
  head: () => ({ meta: [{ title: "Call Logs — Master HRMS" }] }),
});

function TenantChatCallsPage() {
  return <UnifiedChatApp initialMode="calls" workspacePrefix="/tenant" />;
}

export default TenantChatCallsPage;
