import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/marketplace")({
  beforeLoad: () => {
    throw redirect({ to: "/tenant/addon" });
  },
  component: () => null,
});
