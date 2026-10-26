import { createFileRoute } from "@tanstack/react-router";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export const Route = createFileRoute("/_authenticated/hr/chat/groups")({
  component: HrChatGroupsPage,
  head: () => ({
    meta: [{ title: "Chat Groups — HR Operations — Master HRMS" }],
  }),
});

export function HrChatGroupsPage() {
  return <UnifiedChatApp initialMode="groups" workspacePrefix="/hr" />;
}

export default HrChatGroupsPage;
