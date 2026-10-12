import { AddonManifest } from "../manifest.types";

export const outboundWebhooksManifest: AddonManifest = {
  slug: "outbound-webhooks",
  name: "Outbound Webhooks",
  version: "1.0.0",
  type: "integration",
  surface: "integration",
  engine: "E6",
  wave: 1,
  entitlementKey: "outbound-webhooks",
  routePrefix: "/outbound-webhooks",
  description: "Secure tenant-owned webhook endpoints with HMAC-SHA256 signing, SSRF defense, bounded retries, and delivery audit logs.",
  provides: {
    nav: [
      {
        id: "outbound-webhooks-endpoints",
        label: "Webhook Endpoints",
        path: "/outbound-webhooks",
        icon: "Webhook",
      },
      {
        id: "outbound-webhooks-logs",
        label: "Delivery Logs",
        path: "/outbound-webhooks/logs",
        icon: "Activity",
      },
    ],
    permissions: [
      "webhooks.view",
      "webhooks.manage",
      "webhooks.trigger",
    ],
    events: [
      "webhook.endpoint.created",
      "webhook.endpoint.updated",
      "webhook.endpoint.deleted",
      "webhook.delivered",
      "webhook.delivery.failed",
    ],
  },
  marketplace: {
    category: "Integrations",
    badge: "wave-1",
    rating: 4.9,
    reviewsCount: 42,
    isPopular: true,
  },
};
