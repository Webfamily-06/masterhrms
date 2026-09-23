import { createFileRoute } from "@tanstack/react-router";
import { SessionExpiredView } from "@/components/error-pages/session-expired-view";

export const Route = createFileRoute("/session-expired")({
  component: () => <SessionExpiredView />,
  head: () => ({
    meta: [{ title: "Session Expired - Master ERP" }],
  }),
});
