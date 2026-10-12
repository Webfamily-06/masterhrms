/**
 * Authoritative Add-on Manifest Types
 * Reference: docs/Saas/12_Addon_Catalog_and_Engines.md & docs/Saas/18_Addon_Routing_and_Implementation_Playbook.md
 */

export type AddonType =
  | "module"
  | "integration"
  | "ai"
  | "security"
  | "content"
  | "finance"
  | "ops"
  | "app"
  | "setting";

export type AddonSurface = "app" | "hr-module" | "integration" | "setting";

export interface AddonNavItem {
  id?: string;
  app?: string;
  heading?: string;
  label: string;
  path: string;
  permission?: string;
  icon?: string;
}

export interface AddonProvides {
  nav?: AddonNavItem[];
  permissions?: string[];
  settings?: string[];
  jobs?: string[];
  events?: string[];
  widgets?: string[];
  models?: string[];
  i18n?: string;
}

export interface AddonMarketplace {
  tagline?: string;
  description?: string;
  features?: string[];
  faq?: Array<{ question: string; answer: string }>;
  docsUrl?: string;
  category?: string;
  badge?: string;
  rating?: number;
  reviewsCount?: number;
  isPopular?: boolean;
  [key: string]: any;
}

export interface AddonManifest {
  slug: string;
  name: string;
  category?: string;
  description?: string;
  wave?: number;
  type: AddonType;
  surface: AddonSurface;
  routePrefix: string;
  engine: string;
  version: string;
  entitlementKey: string;
  requires?: string[];
  conflicts?: string[];
  minPlatformVersion?: string;
  provides?: AddonProvides;
  hooks?: {
    install?: string;
    uninstall?: string;
    upgrade?: string;
  };
  marketplace?: AddonMarketplace;
}
