import { AddonManifest } from "../manifest.types";

export const publicApiManifest: AddonManifest = {
  slug: "public-api",
  name: "Public Developer API",
  version: "1.0.0",
  type: "app",
  surface: "app",
  engine: "E12",
  wave: 1,
  entitlementKey: "public-api",
  routePrefix: "/public-api",
  description: "Tenant API keys, permission scopes, rate limiting, and developer documentation viewer.",
  provides: {
    nav: [
      {
        id: "public-api-keys",
        label: "API Keys",
        path: "/public-api/keys",
        icon: "Key",
      },
      {
        id: "public-api-docs",
        label: "API Documentation",
        path: "/public-api/docs",
        icon: "BookOpen",
      },
    ],
    permissions: [
      "public-api.keys.read",
      "public-api.keys.manage",
      "public-api.docs.read",
    ],
    events: [
      "public-api.key.created",
      "public-api.key.revoked",
      "public-api.key.deleted",
    ],
  },
  marketplace: {
    category: "Developer & Collaboration",
    badge: "wave-1",
    rating: 4.9,
    reviewsCount: 18,
    isPopular: true,
  },
};
