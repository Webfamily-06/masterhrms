import { createFileRoute } from "@tanstack/react-router";
import { MarketplaceAdmin } from "../super/marketplace";

export const Route = createFileRoute("/_authenticated/_app/tenant/addon")({
  component: MarketplaceAdmin,
});

export default MarketplaceAdmin;
