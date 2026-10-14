import { createFileRoute } from "@tanstack/react-router";
import { AssetDashboardView } from "@/components/assets/asset-dashboard-view";

export const Route = createFileRoute("/_authenticated/_app/asset-dashboard")({
  component: AssetDashboardPage,
  head: () => ({
    meta: [
      { title: "Asset Register & Analytics | Dreams ERP" },
      {
        name: "description",
        content: "Enterprise asset register, equipment depreciation, warranty tracking, and analytics dashboard in Dreams ERP.",
      },
    ],
  }),
});

export default function AssetDashboardPage() {
  return <AssetDashboardView />;
}
