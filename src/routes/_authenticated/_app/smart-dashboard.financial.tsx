import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentProfile } from "@/lib/session";
import { useNavigationResolver } from "@/lib/navigation-resolver";
import { useWorkspaceDashboardCapabilities } from "@/lib/workspace-dashboard-capabilities";
import { AddonNotInstalled } from "@/components/addon-not-installed";
import { SmartDashboardNav } from "@/components/smart-dashboard/dashboard-nav";
import { FinancialSection } from "@/components/smart-dashboard/financial-section";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/smart-dashboard/financial")({
  component: FinancialAnalyticsPage,
  head: () => ({ meta: [{ title: "Financial Analytics — Smart Dashboard" }] }),
});

export default function FinancialAnalyticsPage() {
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || profile?.tenant?.id;
  const { isEntitled, isLoading: isNavLoading } = useNavigationResolver();
  const { canAccessSection, isLoading: isCapLoading } = useWorkspaceDashboardCapabilities();
  const queryClient = useQueryClient();

  const hasEntitlement = isEntitled("smart-dashboard");
  const canAccess = canAccessSection("financial");

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
          addonName="Finance & Accounting"
          addonSlug="finance"
          category="Finance"
          description="General ledger, revenue accounts, profitability analytics, and cash flow telemetry are not enabled for this workspace."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
      <SmartDashboardNav
        activeSection="financial"
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ["smart-dashboard-financial", tenantId] });
          toast.info("Refreshed financial analytics metrics");
        }}
      />
      <FinancialSection />
    </div>
  );
}
