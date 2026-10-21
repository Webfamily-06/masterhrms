'use client';
import {  createFileRoute  } from "@/src/lib/router-compat";
import SubscriptionPage from "@/src/app/(workspace)/subscription/page";



function TenantSubscriptionRoute() {
  return (
    <div className="space-y-4">
      <SubscriptionPage />
    </div>
  );
}

export default TenantSubscriptionRoute;
