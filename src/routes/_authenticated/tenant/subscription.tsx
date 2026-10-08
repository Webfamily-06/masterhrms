import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionPage } from "@/routes/_authenticated/_app/subscription";

export const Route = createFileRoute("/_authenticated/tenant/subscription")({
  component: TenantSubscriptionRoute,
  head: () => ({
    meta: [{ title: "Subscription & Quotas — Master HRMS" }],
  }),
});

function TenantSubscriptionRoute() {
  return (
    <div className="space-y-4">
      <SubscriptionPage />
    </div>
  );
}
