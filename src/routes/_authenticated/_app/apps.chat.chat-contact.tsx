import { createFileRoute } from "@tanstack/react-router";
import { ClassicChatApp } from "@/components/apps/chat/classic-chat-app";

export const Route = createFileRoute("/_authenticated/_app/apps/chat/chat-contact")({
  component: ChatContactPage,
  head: () => ({ meta: [{ title: "Chat Contacts — Master HRMS" }] }),
});

export function ChatContactPage() {
  return <ClassicChatApp initialMode="contacts" />;
}

export default ChatContactPage;
