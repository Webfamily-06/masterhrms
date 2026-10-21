'use client';
import {  createFileRoute, Outlet, useRouterState, redirect  } from "@/src/lib/router-compat";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentProfile } from "@/lib/session";
import { useNavigationResolver } from "@/lib/navigation-resolver";
import { AddonNotInstalled } from "@/components/addon-not-installed";
import { SmartDashboardNav } from "@/components/smart-dashboard/dashboard-nav";
import { OverviewSection } from "@/components/smart-dashboard/overview-section";
import { toast } from "sonner";



export default function SmartDashboardParentPage() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || profile?.tenant?.id;
  const { isEntitled, isLoading: isNavLoading } = useNavigationResolver();
  const queryClient = useQueryClient();

  const hasEntitlement = isEntitled("smart-dashboard");

  if (!isNavLoading && !hasEntitlement) {
    return (
      <div className="flex-1 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
        <AddonNotInstalled
          addonName="Smart Dashboard Analytics"
          addonSlug="smart-dashboard"
          category="Operations"
          description="Unified executive analytics, real-time telemetry, financial KPIs, sales pipelines, and inventory intelligence."
        />
      </div>
    );
  }

  // If URL is a sub-page (e.g. /smart-dashboard/financial), delegate to Outlet
  if (pathname !== "/smart-dashboard" && pathname !== "/smart-dashboard/") {
    return <Outlet />;
  }

  // Canonical Executive Overview page (/smart-dashboard)
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
      <SmartDashboardNav
        activeSection="overview"
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ["smart-dashboard-overview", tenantId] });
          toast.info("Refreshed executive overview metrics");
        }}
      />
      <OverviewSection />
    </div>
  );
}
