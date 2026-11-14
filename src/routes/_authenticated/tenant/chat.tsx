import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export const Route = createFileRoute("/_authenticated/tenant/chat")({
  component: TenantChatPage,
  head: () => ({
    meta: [{ title: "Personal Chat — Tenant Administration — Master HRMS" }],
  }),
});

export function TenantChatPage() {
  const location = useLocation();
  if (/\/chat\/(groups|contacts|calls)(\/|$)/.test(location.pathname)) {
    return <Outlet />;
  }
  return <UnifiedChatApp initialMode="chats" workspacePrefix="/tenant" />;
}

export default TenantChatPage;
