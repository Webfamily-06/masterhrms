import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/chat")({
  beforeLoad: () => {
    // Legacy route forward: redirect /chat directly to canonical Employee Chat
    throw redirect({ to: "/me/chat" });
  },
});
