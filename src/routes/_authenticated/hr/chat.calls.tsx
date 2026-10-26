import { createFileRoute } from "@tanstack/react-router";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export const Route = createFileRoute("/_authenticated/hr/chat/calls")({
  component: HRChatCallsPage,
  head: () => ({ meta: [{ title: "Call Logs — Master HRMS" }] }),
});

function HRChatCallsPage() {
  return <UnifiedChatApp initialMode="calls" workspacePrefix="/hr" />;
}

export default HRChatCallsPage;
