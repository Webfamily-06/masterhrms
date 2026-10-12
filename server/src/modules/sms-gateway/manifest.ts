import { AddonManifest } from "../manifest.types";

export const smsGatewayManifest: AddonManifest = {
  slug: "sms-gateway",
  name: "SMS Gateway",
  version: "1.0.0",
  type: "integration",
  surface: "integration",
  engine: "E7",
  wave: 1,
  entitlementKey: "sms-gateway",
  routePrefix: "/sms-gateway",
  description: "Enterprise SMS messaging gateway supporting Fast2SMS, MSG91, and Twilio with credential encryption and sandbox testing.",
  provides: {
    nav: [
      {
        id: "sms-gateway-settings",
        label: "SMS Gateway Settings",
        path: "/sms-gateway/settings",
        icon: "MessageSquare",
      },
    ],
    permissions: [
      "sms.manage",
      "sms.view",
      "sms.send",
    ],
    events: [
      "sms.configured",
      "sms.dispatched",
      "sms.delivery.failed",
    ],
  },
  marketplace: {
    category: "Integrations",
    badge: "wave-1",
    rating: 4.8,
    reviewsCount: 39,
    isPopular: true,
  },
};
