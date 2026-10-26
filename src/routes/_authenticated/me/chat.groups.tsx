import { createFileRoute } from "@tanstack/react-router";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export const Route = createFileRoute("/_authenticated/me/chat/groups")({
  component: MeChatGroupsPage,
  head: () => ({
    meta: [{ title: "Chat Groups — Employee Portal — Master HRMS" }],
  }),
});

export function MeChatGroupsPage() {
  return <UnifiedChatApp initialMode="groups" workspacePrefix="/me" />;
}

export default MeChatGroupsPage;
