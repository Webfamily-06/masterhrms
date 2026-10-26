import { createFileRoute } from "@tanstack/react-router";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export const Route = createFileRoute("/_authenticated/hr/chat")({
  component: HrChatPage,
  head: () => ({
    meta: [{ title: "Personal Chat — HR Operations — Master HRMS" }],
  }),
});

export function HrChatPage() {
  return <UnifiedChatApp initialMode="chats" workspacePrefix="/hr" />;
}

export default HrChatPage;
