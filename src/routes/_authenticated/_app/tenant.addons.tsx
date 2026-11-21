import { createFileRoute } from "@tanstack/react-router";
import { MarketplaceAdmin } from "../super/marketplace";

export const Route = createFileRoute("/_authenticated/_app/tenant/addons")({
  component: MarketplaceAdmin,
});

export default MarketplaceAdmin;
