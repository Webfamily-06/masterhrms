import { createFileRoute } from "@tanstack/react-router";
import { AssetDashboardView } from "@/components/assets/asset-dashboard-view";

export const Route = createFileRoute("/_authenticated/hr/assets/dashboard")({
  component: HrAssetsDashboardPage,
  head: () => ({
    meta: [
      { title: "Asset Register & Analytics | HR Portal" },
      {
        name: "description",
        content: "Enterprise asset register, equipment depreciation, warranty tracking, and analytics dashboard in HR Portal.",
      },
    ],
  }),
});

export default function HrAssetsDashboardPage() {
  return <AssetDashboardView />;
}
