import { createFileRoute } from "@tanstack/react-router";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export const Route = createFileRoute("/_authenticated/me/chat/contacts")({
  component: MeChatContactsPage,
  head: () => ({
    meta: [{ title: "Chat Contacts — Employee Portal — Master HRMS" }],
  }),
});

export function MeChatContactsPage() {
  return <UnifiedChatApp initialMode="contacts" workspacePrefix="/me" />;
}

export default MeChatContactsPage;
