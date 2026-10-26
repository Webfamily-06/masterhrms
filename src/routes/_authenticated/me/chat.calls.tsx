import { createFileRoute } from "@tanstack/react-router";
import { UnifiedChatApp } from "@/components/chat/unified-chat-app";

export const Route = createFileRoute("/_authenticated/me/chat/calls")({
  component: EmployeeChatCallsPage,
  head: () => ({ meta: [{ title: "Call Logs — Master HRMS" }] }),
});

function EmployeeChatCallsPage() {
  return <UnifiedChatApp initialMode="calls" workspacePrefix="/me" />;
}

export default EmployeeChatCallsPage;
