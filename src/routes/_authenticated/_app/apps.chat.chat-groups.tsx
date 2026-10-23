import { createFileRoute } from "@tanstack/react-router";
import { ClassicChatApp } from "@/components/apps/chat/classic-chat-app";

export const Route = createFileRoute("/_authenticated/_app/apps/chat/chat-groups")({
  component: ChatGroupsPage,
  head: () => ({ meta: [{ title: "Chat Groups — Master HRMS" }] }),
});

export function ChatGroupsPage() {
  return <ClassicChatApp initialMode="groups" />;
}

export default ChatGroupsPage;
