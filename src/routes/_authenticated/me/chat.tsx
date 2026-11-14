import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export const Route = createFileRoute("/_authenticated/me/chat")({
  component: MeChatPage,
  head: () => ({
    meta: [{ title: "Personal Chat — Employee Portal — Master HRMS" }],
  }),
});

export function MeChatPage() {
  const location = useLocation();
  if (/\/chat\/(groups|contacts|calls)(\/|$)/.test(location.pathname)) {
    return <Outlet />;
  }
  return <UnifiedChatApp initialMode="chats" workspacePrefix="/me" />;
}

export default MeChatPage;
