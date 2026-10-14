import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tenet/$")({
  beforeLoad: ({ params }) => {
    const splat = (params as any)["_splat"] || "";
    const target = splat ? `/tenant/${splat}` : "/tenant/dashboard";
    throw redirect({ to: target as any });
  },
  component: () => null,
});
