import { createFileRoute } from "@tanstack/react-router";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export const Route = createFileRoute("/_authenticated/hr/chat/contacts")({
  component: HrChatContactsPage,
  head: () => ({
    meta: [{ title: "Chat Contacts — HR Operations — Master HRMS" }],
  }),
});

export function HrChatContactsPage() {
  return <UnifiedChatApp initialMode="contacts" workspacePrefix="/hr" />;
}

export default HrChatContactsPage;
