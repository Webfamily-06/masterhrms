import { createFileRoute, redirect } from "@tanstack/react-router";
import { resolveWorkspaceChatRoute } from "@/lib/auth-navigation";

export const Route = createFileRoute("/_authenticated/_app/apps/chat/chat-contact")({
  beforeLoad: () => {
    const destination = resolveWorkspaceChatRoute("/contacts") || "/super/dashboard";
    throw redirect({ to: destination as any });
  },
  component: () => null,
});

export default Route;
