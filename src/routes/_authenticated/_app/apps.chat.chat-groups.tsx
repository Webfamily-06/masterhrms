import { createFileRoute, redirect } from "@tanstack/react-router";
import { resolveWorkspaceChatRoute } from "@/lib/auth-navigation";

export const Route = createFileRoute("/_authenticated/_app/apps/chat/chat-groups")({
  beforeLoad: () => {
    const destination = resolveWorkspaceChatRoute("/groups") || "/super/dashboard";
    throw redirect({ to: destination as any });
  },
  component: () => null,
});

export default Route;
