import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentProfile } from "@/lib/session";
import { useNavigationResolver } from "@/lib/navigation-resolver";
import { useWorkspaceDashboardCapabilities } from "@/lib/workspace-dashboard-capabilities";
import { AddonNotInstalled } from "@/components/addon-not-installed";
import { SmartDashboardNav } from "@/components/smart-dashboard/dashboard-nav";
import { SalesSection } from "@/components/smart-dashboard/sales-section";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/smart-dashboard/sales")({
  component: SalesAnalyticsPage,
  head: () => ({ meta: [{ title: "Sales & Customer Analytics — Smart Dashboard" }] }),
});

export default function SalesAnalyticsPage() {
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || profile?.tenant?.id;
  const { isEntitled, isLoading: isNavLoading } = useNavigationResolver();
  const { canAccessSection, isLoading: isCapLoading } = useWorkspaceDashboardCapabilities();
  const queryClient = useQueryClient();

  const hasEntitlement = isEntitled("smart-dashboard");
  const canAccess = canAccessSection("sales");

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

  if (!isNavLoading && !isCapLoading && !canAccess) {
    return (
      <div className="flex-1 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
        <AddonNotInstalled
          addonName="Sales & CRM"
          addonSlug="crm"
          category="Sales & CRM"
          description="Leads funnel, deal pipelines, customer revenue telemetry, and conversion analytics are not enabled for this workspace."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
      <SmartDashboardNav
        activeSection="sales"
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ["smart-dashboard-sales", tenantId] });
          toast.info("Refreshed sales & CRM metrics");
        }}
      />
      <SalesSection />
    </div>
  );
}
