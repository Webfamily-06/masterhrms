import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/helpdesk")({
  beforeLoad: () => {
    // Legacy route forward: redirect /helpdesk to canonical Employee Helpdesk
    throw redirect({ to: "/me/helpdesk" });
  },
});
