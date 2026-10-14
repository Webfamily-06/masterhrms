import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/settings/webhook")({
  beforeLoad: () => {
    throw redirect({ to: "/addons/webhook/endpoints" });
  },
  component: () => null,
});
