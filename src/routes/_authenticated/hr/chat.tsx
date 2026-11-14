import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export const Route = createFileRoute("/_authenticated/hr/chat")({
  component: HrChatPage,
  head: () => ({
    meta: [{ title: "Personal Chat — HR Operations — Master HRMS" }],
  }),
});

export function HrChatPage() {
  const location = useLocation();
  if (/\/chat\/(groups|contacts|calls)(\/|$)/.test(location.pathname)) {
    return <Outlet />;
  }
  return <UnifiedChatApp initialMode="chats" workspacePrefix="/hr" />;
}

export default HrChatPage;
