import { createFileRoute } from "@tanstack/react-router";
import { ClassicAllApps } from "@/components/apps/integrations/classic-all-apps";

export const Route = createFileRoute("/_authenticated/_app/apps/integrations/all-apps")({
  component: AllAppsCatalogPage,
  head: () => ({ meta: [{ title: "Organization Add-ons & Integrations — Master HRMS" }] }),
});

export function AllAppsCatalogPage() {
  return <ClassicAllApps />;
}

export default AllAppsCatalogPage;
