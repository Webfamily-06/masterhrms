import { createFileRoute } from "@tanstack/react-router";
import { ClassicChatApp } from "@/components/apps/chat/classic-chat-app";

export const Route = createFileRoute("/_authenticated/_app/apps/chat/chats")({
  component: PersonalChatsPage,
  head: () => ({ meta: [{ title: "Personal Chat — Master HRMS" }] }),
});

export function PersonalChatsPage() {
  return <ClassicChatApp initialMode="chats" />;
}

export default PersonalChatsPage;
