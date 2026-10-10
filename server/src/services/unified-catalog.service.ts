/**
 * MASTERHRMS — Phase A3.2: Unified Commerce Catalog Service
 *
 * Provides authoritative normalization of:
 * 1. Base Plans (HRMS Platform: Starter, Growth, Sovereign, Custom Flex)
 * 2. Standalone Products (ERP Modules: POS, CRM, Finance)
 * 3. Add-Ons (Biometric Sync, Google Workspace, Asset Management, OKR Performance, etc.)
 *
 * Enforces:
 * - Stable identifiers and explicit product types
 * - Server-authoritative descriptions, features, and entitlements
 * - Separation of public catalog visibility from tenant purchase eligibility
 * - Zero client-side pricing overrides
 */

import { prisma, rawPrisma } from "../prisma";
import {
  getCommercePricingConfig,
  SeatBandTier,
  ProductPriceConfig,
} from "../config/commerce-pricing.config";

export type ProductType = "BASE_PLAN" | "STANDALONE_PRODUCT" | "ADDON_FEATURE" | "ADDON_INTEGRATION";
export type TargetEngine = "subscription" | "module" | "addon";

export interface CatalogPriceDefinition {
  id: string;
  productId: string;
  currency: string;
  billingInterval: "1_month" | "1_year";
  pricingModel: "FLAT" | "PER_SEAT" | "SEAT_BAND";
  basePrice: number;
  originalPrice?: number | null;
  seatBandMin?: number;
  seatBandMax?: number;
  pricePerExcessSeat?: number;
  taxIncluded: boolean;
  isDefault: boolean;
}

export interface CatalogProductDefinition {
  id: string;
  slug: string;
  name: string;
  productType: ProductType;
  entitlementKey: string;
  targetEngine: TargetEngine;
  description: string;
  category: string;
  isPublic: boolean;
  status: "ACTIVE" | "RETIRED" | "DRAFT";
  version: string;
  features: string[];
  prices: CatalogPriceDefinition[];
  seatBands?: SeatBandTier[];
  requiredProductSlugs?: string[];
  eligibility?: {
    eligible: boolean;
    alreadyOwned?: boolean;
    reason?: string;
  };
  icon?: string;
  image?: string;
  tagline?: string;
  longDescription?: string;
  screenshots?: string[];
  developer?: string;
}

export interface CatalogQueryOptions {
  tenantId?: string;
  isPublicOnly?: boolean;
  category?: string;
  productType?: string;
}

/**
 * Canonical product registry defining metadata, features, and target entitlement engines.
 */
export interface CanonicalProductTemplate {
  id: string;
  slug: string;
  name: string;
  productType: ProductType;
  entitlementKey: string;
  targetEngine: TargetEngine;
  description: string;
  category: string;
  isPublic: boolean;
  status: "ACTIVE" | "RETIRED" | "DRAFT";
  version: string;
  features: string[];
  requiredProductSlugs?: string[];
  hasSeatBands?: boolean;
}

export const CANONICAL_CATALOG_REGISTRY: CanonicalProductTemplate[] = [
  // ─── Base Plans (HRMS) ────────────────────────────────────────────────────────
  {
    id: "plan_starter",
    slug: "starter",
    name: "Starter Cloud",
    productType: "BASE_PLAN",
    entitlementKey: "core_platform",
    targetEngine: "subscription",
    description: "Core HRMS essentials for emerging teams. Includes employee directory, attendance, leaves, and basic payroll.",
    category: "HRM",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    hasSeatBands: true,
    features: [
      "Up to 25 included employee profiles",
      "Biometric & web attendance tracking",
      "Standard statutory compliance (PF, ESI, PT)",
      "Employee self-service mobile portal",
      "Email support",
    ],
  },
  {
    id: "plan_growth",
    slug: "growth",
    name: "Growth Enterprise",
    productType: "BASE_PLAN",
    entitlementKey: "core_platform",
    targetEngine: "subscription",
    description: "Comprehensive workforce automation for growing organizations with advanced payroll and shift management.",
    category: "HRM",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    hasSeatBands: true,
    features: [
      "Up to 100 included employee profiles",
      "Automated multi-shift scheduling",
      "Advanced salary structures & flexi-benefits",
      "Workflow approvals & custom policies",
      "Priority business-hours support",
    ],
  },
  {
    id: "plan_sovereign",
    slug: "sovereign",
    name: "Enterprise Sovereign",
    productType: "BASE_PLAN",
    entitlementKey: "core_platform",
    targetEngine: "subscription",
    description: "Full-scale corporate governance, unlimited workforce capability, dedicated tenant domain, and SLA guarantees.",
    category: "HRM",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    hasSeatBands: true,
    features: [
      "Up to 500 included employee profiles",
      "Custom domain & white-label branding",
      "Full audit logs & statutory returns pack",
      "Dedicated account manager & 99.9% SLA",
      "24/7 dedicated support",
    ],
  },
  {
    id: "plan_custom_flex",
    slug: "custom-flex",
    name: "Custom Enterprise Flex",
    productType: "BASE_PLAN",
    entitlementKey: "core_platform",
    targetEngine: "subscription",
    description: "Tailored per-seat subscription for large enterprises with custom workforce sizes and flexible seat scaling.",
    category: "HRM",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    hasSeatBands: false,
    features: [
      "Custom per-user monthly billing",
      "Unlimited workforce scalability",
      "Enterprise SLA & custom contract terms",
    ],
  },

  // ─── Standalone Products (ERP Modules) ────────────────────────────────────────
  {
    id: "prod_pos",
    slug: "pos",
    name: "Point of Sale & Inventory Suite",
    productType: "STANDALONE_PRODUCT",
    entitlementKey: "product_pos",
    targetEngine: "module",
    description: "High-speed retail POS billing, barcode scanning, thermal printing, real-time inventory management, and multi-warehouse control.",
    category: "Retail",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    features: [
      "Offline-first POS checkout & receipt printing",
      "Real-time stock valuation (FIFO / Weighted Average)",
      "Multi-store & warehouse transfers",
      "QZ-Tray thermal hardware integration",
      "Customer ledger & store credit",
    ],
  },
  {
    id: "prod_crm",
    slug: "crm",
    name: "Sales CRM & Lead Pipeline",
    productType: "STANDALONE_PRODUCT",
    entitlementKey: "product_crm",
    targetEngine: "module",
    description: "Omnichannel customer relationship management, sales pipelines, lead scoring, deal tracking, and quote management.",
    category: "Sales",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    features: [
      "Visual Kanban deal pipelines",
      "Lead capture & automated stage tracking",
      "Quotation & commercial proposal generator",
      "Activity logging & customer communication timeline",
    ],
  },
  {
    id: "prod_finance",
    slug: "finance",
    name: "Financial Ledgers & Accounting",
    productType: "STANDALONE_PRODUCT",
    entitlementKey: "product_finance",
    targetEngine: "module",
    description: "Double-entry general ledger, chart of accounts, bank reconciliation, trial balance, and Indian GST return preparation.",
    category: "Finance",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    features: [
      "Double-entry bookkeeping & journal vouchers",
      "Real-time Trial Balance, P&L, and Balance Sheet",
      "Accounts receivable & payable tracking",
      "Indian GST summary and e-invoicing export",
    ],
  },

  // ─── Feature Add-Ons ─────────────────────────────────────────────────────────
  {
    id: "addon_biometric_sync",
    slug: "biometric-sync",
    name: "Biometric Device Cloud Sync",
    productType: "ADDON_FEATURE",
    entitlementKey: "biometric-sync",
    targetEngine: "addon",
    description: "Direct real-time hardware synchronization with ZKTeco, Essl, and biometric push-data attendance terminals.",
    category: "Integrations",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    features: [
      "Push-protocol & iClock ADMS support",
      "Automated attendance punch log reconciliation",
      "Real-time device health monitoring",
    ],
  },
  {
    id: "addon_google_workspace",
    slug: "google-workspace",
    name: "Google Workspace Directory & Calendar Sync",
    productType: "ADDON_INTEGRATION",
    entitlementKey: "google-workspace",
    targetEngine: "addon",
    description: "Two-way synchronization for Google Workspace directory, Google Calendar leave events, and Single Sign-On.",
    category: "Integrations",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    features: [
      "Google Calendar out-of-office synchronization",
      "Workspace directory provisioning",
      "OAuth 2.0 single sign-on integration",
    ],
  },
  {
    id: "addon_asset_management",
    slug: "asset-management",
    name: "Enterprise Asset Management",
    productType: "ADDON_FEATURE",
    entitlementKey: "asset-management",
    targetEngine: "addon",
    description: "Track laptops, equipment, asset allocations, serial numbers, warranty expirations, and employee offboarding returns.",
    category: "Operations",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    features: [
      "Asset custody & custodian sign-off",
      "Warranty tracking & maintenance scheduling",
      "Return checklist integration during offboarding",
    ],
  },
  {
    id: "addon_okr_performance",
    slug: "okr-performance",
    name: "Strategic OKRs & Goal Tracking",
    productType: "ADDON_FEATURE",
    entitlementKey: "okr-performance",
    targetEngine: "addon",
    description: "Company-wide Objective and Key Result (OKR) framework, 360-degree performance reviews, and KPI alignment.",
    category: "HRM",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    features: [
      "Quarterly & annual OKR cycle management",
      "Key result progress tracking with weightings",
      "Manager & self-review evaluation workflows",
    ],
  },
  {
    id: "addon_whatsapp_alerts",
    slug: "whatsapp-alerts",
    name: "WhatsApp Business Automations",
    productType: "ADDON_INTEGRATION",
    entitlementKey: "whatsapp-alerts",
    targetEngine: "addon",
    description: "Instant WhatsApp delivery for payslips, leave approvals, attendance alerts, and critical HR notifications.",
    category: "Communications",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    features: [
      "Automated PDF payslip dispatch",
      "Instant shift and leave status alerts",
    ],
  },
  {
    id: "addon_ai_ocr",
    slug: "ai-ocr",
    name: "Neural AI OCR Invoice Reader",
    productType: "ADDON_FEATURE",
    entitlementKey: "ai-ocr",
    targetEngine: "addon",
    description: "Automated receipt and vendor invoice data extraction using optical character recognition and neural parsing.",
    category: "AI",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    features: [
      "Automated invoice data extraction",
      "Vendor GSTIN and line-item reconciliation",
    ],
  },
  {
    id: "addon_tally_importer",
    slug: "tally-importer",
    name: "TallyPrime XML Data Bridge",
    productType: "ADDON_INTEGRATION",
    entitlementKey: "tally-importer",
    targetEngine: "addon",
    description: "Seamless two-way XML export and import bridge for TallyPrime and Tally.ERP 9 financial records.",
    category: "Finance",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    features: [
      "Tally XML journal and voucher generation",
      "Ledger masters two-way sync",
    ],
  },
  {
    id: "addon_multi_currency",
    slug: "multi-currency",
    name: "Multi-Currency Financials",
    productType: "ADDON_FEATURE",
    entitlementKey: "multi-currency",
    targetEngine: "addon",
    description: "International multi-currency transactions, daily forex rates, and unrealized exchange gain/loss calculations.",
    category: "Finance",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    features: [
      "Multi-currency invoices and bills",
      "Automated foreign exchange rate updates",
    ],
  },
];

export class UnifiedCatalogService {
  /**
   * Retrieves the full normalized unified catalog with configured prices and optional tenant eligibility.
   */
  public static async getCatalog(options?: CatalogQueryOptions): Promise<{
    currency: string;
    totalProducts: number;
    products: CatalogProductDefinition[];
  }> {
    const config = getCommercePricingConfig();
    const db = rawPrisma || prisma;

    // Optional tenant entitlement state
    let tenantSub: any = null;
    let tenantModules: Set<string> = new Set();
    let tenantAddons: Set<string> = new Set();

    if (options?.tenantId) {
      try {
        const [sub, mods, addons] = await Promise.all([
          db.tenantSubscription.findFirst({
            where: { tenantId: options.tenantId, status: { in: ["active", "trialing"] } },
            include: { plan: true },
          }),
          db.tenantModule.findMany({
            where: { tenantId: options.tenantId, isEnabled: true },
            select: { moduleKey: true },
          }),
          db.tenantAddon.findMany({
            where: { tenantId: options.tenantId, status: "active" },
            select: { addonSlug: true },
          }),
        ]);
        tenantSub = sub;
        mods.forEach((m) => tenantModules.add(m.moduleKey.toLowerCase()));
        addons.forEach((a) => tenantAddons.add(a.addonSlug.toLowerCase()));
      } catch (err) {
        // Non-fatal, proceed without tenant state
      }
    }

    // Query active published dynamic price schedules (OD-1)
    const publishedSchedulesMap = new Map<string, any>();
    try {
      const now = new Date();
      const schedules = await db.commercialPriceSchedule.findMany({
        where: {
          status: "PUBLISHED",
          effectiveFrom: { lte: now },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: now } },
          ],
        },
        orderBy: { version: "desc" },
      });
      for (const s of schedules) {
        if (!publishedSchedulesMap.has(s.productSlug)) {
          publishedSchedulesMap.set(s.productSlug, s);
        }
      }
    } catch (err: any) {
      // Non-fatal, table may be unmigrated in edge environments
    }

    // Load CMS Addon marketing records to bridge persisted metadata (icon, tagline, screenshots, category)
    const addonMarketingMap = new Map<string, any>();
    try {
      const dbAddons = await db.addon.findMany({
        where: { status: "active" },
      });
      for (const a of dbAddons) {
        addonMarketingMap.set(a.slug.toLowerCase(), a);
      }
    } catch {
      // Non-fatal, proceed with template defaults
    }

    const result: CatalogProductDefinition[] = [];

    for (const template of CANONICAL_CATALOG_REGISTRY) {
      // Filter by public status
      if (options?.isPublicOnly && !template.isPublic) {
        continue;
      }

      const marketing = addonMarketingMap.get(template.slug.toLowerCase());
      const resolvedCategory = marketing?.category || template.category;

      // Filter by category (reconciled against both marketing category and template category)
      if (options?.category && options.category.toLowerCase() !== "all") {
        const catTarget = options.category.toLowerCase();
        const matchesCat =
          resolvedCategory.toLowerCase() === catTarget ||
          template.category.toLowerCase() === catTarget ||
          (marketing?.category && marketing.category.toLowerCase() === catTarget);
        if (!matchesCat) {
          continue;
        }
      }
      // Filter by productType
      if (options?.productType && template.productType.toLowerCase() !== options.productType.toLowerCase()) {
        continue;
      }

      // Resolve prices from dynamic published schedule if present, else fallback to config
      const dbSchedule = publishedSchedulesMap.get(template.slug);
      const priceConfig: ProductPriceConfig | undefined = dbSchedule
        ? {
            monthly: Number(dbSchedule.amountMonthly),
            annual: dbSchedule.amountAnnual ? Number(dbSchedule.amountAnnual) : null,
            pricePerUser: null,
            includedSeats: undefined,
          }
        : config.products[template.slug];

      const monthlyPrice = priceConfig?.monthly ?? null;
      const annualPrice = priceConfig?.annual ?? null;
      const perUserPrice = priceConfig?.pricePerUser ?? null;

      const prices: CatalogPriceDefinition[] = [];

      if (template.slug === "custom-flex") {
        if (perUserPrice !== null && perUserPrice >= 0) {
          prices.push({
            id: `price_${template.slug}_user_m`,
            productId: template.id,
            currency: config.tax.currency,
            billingInterval: "1_month",
            pricingModel: "PER_SEAT",
            basePrice: perUserPrice,
            taxIncluded: false,
            isDefault: true,
          });
          prices.push({
            id: `price_${template.slug}_user_y`,
            productId: template.id,
            currency: config.tax.currency,
            billingInterval: "1_year",
            pricingModel: "PER_SEAT",
            basePrice: Math.round(perUserPrice * 12 * 0.8 * 100) / 100,
            originalPrice: perUserPrice * 12,
            taxIncluded: false,
            isDefault: false,
          });
        }
      } else {
        if (monthlyPrice !== null && monthlyPrice >= 0) {
          prices.push({
            id: `price_${template.slug}_1m`,
            productId: template.id,
            currency: config.tax.currency,
            billingInterval: "1_month",
            pricingModel: template.hasSeatBands ? "SEAT_BAND" : "FLAT",
            basePrice: monthlyPrice,
            taxIncluded: false,
            isDefault: true,
          });
        }

        if (annualPrice !== null && annualPrice >= 0) {
          prices.push({
            id: `price_${template.slug}_1y`,
            productId: template.id,
            currency: config.tax.currency,
            billingInterval: "1_year",
            pricingModel: template.hasSeatBands ? "SEAT_BAND" : "FLAT",
            basePrice: annualPrice,
            originalPrice: monthlyPrice !== null ? monthlyPrice * 12 : null,
            taxIncluded: false,
            isDefault: false,
          });
        }
      }

      // Check tenant eligibility
      let eligibility: CatalogProductDefinition["eligibility"] = undefined;
      if (options?.tenantId) {
        let alreadyOwned = false;
        let eligible = true;
        let reason: string | undefined = undefined;

        if (template.targetEngine === "subscription") {
          if (tenantSub?.planId === template.slug) {
            alreadyOwned = true;
            eligible = false;
            reason = "Currently active plan for this workspace";
          }
        } else if (template.targetEngine === "module") {
          const modKey = template.slug.toLowerCase();
          if (tenantModules.has(modKey) || tenantModules.has(`product_${modKey}`)) {
            alreadyOwned = true;
            eligible = false;
            reason = "Module is already activated for this workspace";
          }
        } else if (template.targetEngine === "addon") {
          if (tenantAddons.has(template.slug.toLowerCase())) {
            alreadyOwned = true;
            eligible = false;
            reason = "Add-on is already active for this workspace";
          }
        }

        eligibility = {
          eligible,
          alreadyOwned,
          reason,
        };
      }

      let image: string | undefined = undefined;
      if (
        marketing?.icon &&
        (marketing.icon.startsWith("/uploads/") ||
          marketing.icon.startsWith("http://") ||
          marketing.icon.startsWith("https://"))
      ) {
        image = marketing.icon;
      }

      result.push({
        id: template.id,
        slug: template.slug,
        name: marketing?.name || template.name,
        productType: template.productType,
        entitlementKey: template.entitlementKey,
        targetEngine: template.targetEngine,
        description: marketing?.description || template.description,
        tagline: marketing?.tagline || undefined,
        longDescription: marketing?.longDescription || undefined,
        developer: marketing?.developer || undefined,
        category: resolvedCategory,
        isPublic: template.isPublic,
        status: template.status,
        version: marketing?.version || template.version,
        features:
          Array.isArray(marketing?.features) && marketing.features.length > 0
            ? marketing.features
            : template.features,
        icon: marketing?.icon || undefined,
        image,
        screenshots: Array.isArray(marketing?.screenshots) ? marketing.screenshots : undefined,
        prices,
        seatBands: template.hasSeatBands ? config.seatBands : undefined,
        requiredProductSlugs: template.requiredProductSlugs,
        eligibility,
      });
    }

    return {
      currency: config.tax.currency,
      totalProducts: result.length,
      products: result,
    };
  }

  /**
   * Finds a product definition by slug or ID.
   */
  public static async getProductBySlug(
    slugOrId: string,
    options?: { tenantId?: string }
  ): Promise<CatalogProductDefinition | null> {
    const catalog = await this.getCatalog({ tenantId: options?.tenantId });
    const match = catalog.products.find(
      (p) => p.slug.toLowerCase() === slugOrId.toLowerCase() || p.id.toLowerCase() === slugOrId.toLowerCase()
    );
    return match || null;
  }
}

/**
 * Resolves a product by slug or id against the canonical product registry.
 */
export function findCanonicalProduct(slugOrId: string): CanonicalProductTemplate | undefined {
  if (!slugOrId) return undefined;
  const target = slugOrId.trim().toLowerCase();
  return CANONICAL_CATALOG_REGISTRY.find(
    (p) => p.slug.toLowerCase() === target || p.id.toLowerCase() === target
  );
}
