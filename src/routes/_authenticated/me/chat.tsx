import { createFileRoute } from "@tanstack/react-router";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export const Route = createFileRoute("/_authenticated/me/chat")({
  component: MeChatPage,
  head: () => ({
    meta: [{ title: "Personal Chat — Employee Portal — Master HRMS" }],
  }),
});

export function MeChatPage() {
  return <UnifiedChatApp initialMode="chats" workspacePrefix="/me" />;
}

export default MeChatPage;
