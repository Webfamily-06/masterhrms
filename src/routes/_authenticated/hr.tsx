import { createFileRoute, redirect } from "@tanstack/react-router";
import { evaluateRouteAccess } from "@/lib/route-guards";
import { AppShell } from "@/routes/_authenticated/_app/route";

export const Route = createFileRoute("/_authenticated/hr")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const access = evaluateRouteAccess({ targetPortal: "hr" });
    if (!access.allowed && access.redirectUrl) {
      throw redirect({ to: access.redirectUrl as any });
    }
  },
  component: AppShell,
});
