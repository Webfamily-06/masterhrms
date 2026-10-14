/**
 * MASTERHRMS — Global Application-Wide Add-on Navigation Architecture & Lifecycle Contract
 *
 * Provides authoritative navigation models separating:
 * 1. Layer A — Core Application Navigation: Native HRM, POS, CRM, Finance, Operations modules.
 * 2. Layer B — Extensions & Add-ons: App Marketplace discovery and settings-only utilities/connectors.
 * 3. Layer C — Installed Add-on Modules: Categorized across 4 explicit patterns:
 *    - Pattern 1: extension (Settings-only integrations/utilities)
 *    - Pattern 2: standalone (Single independent application module, e.g. Strategy Studio)
 *    - Pattern 3: standalone_with_submenu (Multi-channel suites with parent and submenus, e.g. E-Commerce)
 *    - Pattern 4: integrated (Add-ons operating within an existing parent core module, e.g. Biometric Sync)
 *
 * Enforces:
 * - Authoritative server/tenant entitlement gating (no client-side bypass).
 * - Complete metadata validation engine catching duplicates, invalid routes, and circular structures.
 * - Normalized alias resolution to canonical slugs.
 * - Strict isolation: Operational pages never leak into the Extensions discovery area.
 */

import { useMemo } from "react";
import { useNavigationResolver, ADDON_ALIASES } from "@/lib/navigation-resolver";
import { useRouterState } from "@tanstack/react-router";

export type AddonNavigationMode =
  | "extension"
  | "standalone"
  | "standalone_with_submenu"
  | "integrated";

export interface AddonNavigationChild {
  id: string;
  label: string;
  route: string;
  requiredAddonKey: string;
  order: number;
}

export interface MasterAddonNavDefinition {
  id: string;
  slug: string;
  aliases?: string[];
  name: string;
  category: string;
  navigationMode: AddonNavigationMode;
  navigationLabel: string;
  navigationIcon: string;
  navigationGroup: string;
  targetParentId?: string; // Required when navigationMode === "integrated"
  navigationOrder: number;
  route: string;
  requiredAddonSlugs: string[];
  adminOnly?: boolean;
  children?: AddonNavigationChild[];
}

export interface ResolvedStandaloneChild {
  id: string;
  label: string;
  route: string;
  isActive: boolean;
}

export interface ResolvedStandaloneModule {
  id: string;
  key: string;
  label: string;
  menuTitle: string;
  icon: string;
  navigationMode: AddonNavigationMode;
  routes: string[];
  activeRoute: boolean;
  children: ResolvedStandaloneChild[];
}

export interface ResolvedIntegratedAddon {
  id: string;
  slug: string;
  label: string;
  route: string;
  icon: string;
  isActive: boolean;
  order: number;
}

export interface ExtensionItemConfig {
  id: string;
  label: string;
  route: string;
  requiredAddonKey?: string;
  adminOnly?: boolean;
}

export interface ResolvedExtensionItem extends ExtensionItemConfig {
  isActive: boolean;
}

export interface NavigationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Authoritative Application-Wide Add-on Navigation Registry (Master Catalog)
 */
export const MASTER_ADDON_REGISTRY: MasterAddonNavDefinition[] = [
  // ─── Pattern 3: Standalone With Submenu (E-Commerce Suite) ────────────────────
  {
    id: "module-ecommerce",
    slug: "ecommerce",
    aliases: ["ecommerce", "e-commerce", "woocommerce-sync", "woocommerce-hub", "shopify-sync"],
    name: "E-Commerce Cloud Suite",
    category: "E-Commerce",
    navigationMode: "standalone_with_submenu",
    navigationLabel: "E-Commerce",
    navigationIcon: "ph-shopping-bag",
    navigationGroup: "E-COMMERCE",
    navigationOrder: 1,
    route: "/integrations",
    requiredAddonSlugs: ["woocommerce-sync", "woocommerce-hub", "shopify-sync"],
    adminOnly: true,
    children: [
      {
        id: "ecommerce-woocommerce",
        label: "WooCommerce Sync",
        route: "/integrations",
        requiredAddonKey: "woocommerce-sync",
        order: 1,
      },
      {
        id: "ecommerce-shopify",
        label: "Shopify Sync",
        route: "/shopify",
        requiredAddonKey: "shopify-sync",
        order: 2,
      },
    ],
  },

  // ─── Pattern 3: Standalone With Submenu (Strategic Planning) ─────────────────
  {
    id: "module-planning",
    slug: "planning",
    aliases: ["planning", "strategy-planning", "charters", "strategic-planning"],
    name: "Strategic Planning",
    category: "Strategy",
    navigationMode: "standalone_with_submenu",
    navigationLabel: "Planning",
    navigationIcon: "ph-target",
    navigationGroup: "STRATEGY",
    navigationOrder: 1,
    route: "/addons/planning/dashboard",
    requiredAddonSlugs: ["planning", "strategy-studio", "swot"],
    adminOnly: false,
    children: [
      { id: "planning-dashboard", label: "Dashboard", route: "/addons/planning/dashboard", requiredAddonKey: "planning", order: 1 },
      { id: "planning-challenges", label: "Challenges", route: "/addons/planning/challenges", requiredAddonKey: "planning", order: 2 },
      { id: "planning-charters", label: "Charters", route: "/addons/planning/charters", requiredAddonKey: "planning", order: 3 },
      { id: "planning-setup-categories", label: "Categories", route: "/addons/planning/setup/categories", requiredAddonKey: "planning", order: 4 },
      { id: "planning-setup-stages", label: "Stages", route: "/addons/planning/setup/stages", requiredAddonKey: "planning", order: 5 },
      { id: "planning-setup-statuses", label: "Statuses", route: "/addons/planning/setup/statuses", requiredAddonKey: "planning", order: 6 },
    ],
  },

  // ─── Pattern 2: Standalone Main Menu (Strategy Studio) ─────────────────────────
  {
    id: "module-strategy-studio",
    slug: "strategy-studio",
    aliases: [
      "swot",
      "pestel",
      "pest",
      "strategy",
      "strategy-studio",
      "porters-five-forces",
      "mckinsey-7s",
      "business-model",
      "business-plan",
      "marketing-plan",
    ],
    name: "Strategy Studio (SWOT & PESTEL)",
    category: "Strategy",
    navigationMode: "standalone",
    navigationLabel: "Strategy Studio",
    navigationIcon: "ph-compass",
    navigationGroup: "STRATEGY",
    navigationOrder: 2,
    route: "/strategy-studio",
    requiredAddonSlugs: ["swot", "pestel", "pest", "strategy-studio"],
    adminOnly: true,
  },
  {
    id: "module-smart-dashboard",
    slug: "smart-dashboard",
    aliases: ["smart-dashboard", "custom-dashboard", "bi-dashboard"],
    name: "Smart Dashboard Analytics",
    category: "Operations",
    navigationMode: "standalone_with_submenu",
    navigationLabel: "Smart Dashboard",
    navigationIcon: "ph-chart-pie",
    navigationGroup: "OPERATIONS",
    navigationOrder: 3,
    route: "/smart-dashboard",
    requiredAddonSlugs: ["smart-dashboard"],
    adminOnly: false,
    children: [
      { id: "smart-dash-overview", label: "Executive Overview", route: "/smart-dashboard", requiredAddonKey: "smart-dashboard", order: 1 },
      { id: "smart-dash-financial", label: "Financial Analytics", route: "/smart-dashboard/financial", requiredAddonKey: "smart-dashboard", order: 2 },
      { id: "smart-dash-sales", label: "Sales & Customer", route: "/smart-dashboard/sales", requiredAddonKey: "smart-dashboard", order: 3 },
      { id: "smart-dash-operations", label: "Operational Analytics", route: "/smart-dashboard/operational", requiredAddonKey: "smart-dashboard", order: 4 },
    ],
  },
  {
    id: "module-smart-reports",
    slug: "smart-reports",
    aliases: ["smart-reports", "executive-reports", "custom-reports"],
    name: "Executive Smart Reports",
    category: "Finance",
    navigationMode: "standalone_with_submenu",
    navigationLabel: "Smart Reports",
    navigationIcon: "ph-file-text",
    navigationGroup: "FINANCE",
    navigationOrder: 4,
    route: "/smart-reports",
    requiredAddonSlugs: ["smart-reports"],
    adminOnly: false,
    children: [
      { id: "smart-reports-catalogue", label: "Reports Catalogue", route: "/smart-reports", requiredAddonKey: "smart-reports", order: 1 },
      { id: "smart-reports-attendance", label: "Attendance Summary", route: "/smart-reports/attendance-summary", requiredAddonKey: "smart-reports", order: 2 },
      { id: "smart-reports-payroll", label: "Payroll Sheet", route: "/smart-reports/payroll-sheet", requiredAddonKey: "smart-reports", order: 3 },
      { id: "smart-reports-leave", label: "Leave Utilization", route: "/smart-reports/leave-report", requiredAddonKey: "smart-reports", order: 4 },
      { id: "smart-reports-sales", label: "Sales Invoices", route: "/smart-reports/sales-invoice", requiredAddonKey: "smart-reports", order: 5 },
      { id: "smart-reports-purchase", label: "Purchase Invoices", route: "/smart-reports/purchase-invoice", requiredAddonKey: "smart-reports", order: 6 },
      { id: "smart-reports-deals", label: "Deal Pipeline", route: "/smart-reports/deal-pipeline", requiredAddonKey: "smart-reports", order: 7 },
      { id: "smart-reports-stock", label: "Product Stock", route: "/smart-reports/product-stock", requiredAddonKey: "smart-reports", order: 8 },
      { id: "smart-reports-project", label: "Project Progress", route: "/smart-reports/project-progress", requiredAddonKey: "smart-reports", order: 9 },
    ],
  },
  {
    id: "module-ai-business-advisor",
    slug: "ai-business-advisor",
    aliases: ["ai-business-advisor", "business-advisor", "advisor", "ai-advisor"],
    name: "AI Business Advisor",
    category: "AI",
    navigationMode: "standalone",
    navigationLabel: "AI Business Advisor",
    navigationIcon: "ph-brain",
    navigationGroup: "AI",
    navigationOrder: 5,
    route: "/ai-business-advisor",
    requiredAddonSlugs: ["ai-business-advisor"],
    adminOnly: false,
  },

  // ─── Pattern 4: Integrated Modules (Belongs in Core Parent Menus) ─────────────
  {
    id: "integrated-biometric-sync",
    slug: "biometric-sync",
    aliases: ["biometric", "biometrics", "biometric-sync"],
    name: "Biometric Device Cloud Sync",
    category: "Integrations",
    navigationMode: "integrated",
    targetParentId: "time-attendance",
    navigationLabel: "Biometric Hardware Sync",
    navigationIcon: "ph-fingerprint",
    navigationGroup: "HRM SUITE",
    navigationOrder: 10,
    route: "/biometric-sync",
    requiredAddonSlugs: ["biometric-sync"],
    adminOnly: false,
  },
  {
    id: "integrated-tally-importer",
    slug: "tally-importer",
    aliases: ["tally", "tally-importer", "tally_importer", "tally-prime"],
    name: "TallyPrime XML Data Bridge",
    category: "Finance",
    navigationMode: "integrated",
    targetParentId: "finance-accounting",
    navigationLabel: "TallyPrime XML Bridge",
    navigationIcon: "ph-arrows-left-right",
    navigationGroup: "Finance",
    navigationOrder: 10,
    route: "/tally-importer",
    requiredAddonSlugs: ["tally-importer"],
    adminOnly: true,
  },
  {
    id: "integrated-okr-performance",
    slug: "okr-performance",
    aliases: ["okr", "okr-performance", "performance_okr"],
    name: "Strategic OKRs & Goal Tracking",
    category: "HRM",
    navigationMode: "integrated",
    targetParentId: "hrm-performance",
    navigationLabel: "Strategic OKRs & Goals",
    navigationIcon: "ph-target",
    navigationGroup: "HRM SUITE",
    navigationOrder: 5,
    route: "/okr",
    requiredAddonSlugs: ["okr-performance"],
    adminOnly: false,
  },
  {
    id: "integrated-asset-management",
    slug: "asset-management",
    aliases: ["assets", "asset-management", "asset_management"],
    name: "Enterprise Asset Management",
    category: "Operations",
    navigationMode: "integrated",
    targetParentId: "operations-assets",
    navigationLabel: "Enterprise Asset Management",
    navigationIcon: "ph-cube",
    navigationGroup: "Operations",
    navigationOrder: 5,
    route: "/assets",
    requiredAddonSlugs: ["asset-management"],
    adminOnly: false,
  },
  {
    id: "integrated-time-tracker",
    slug: "time-tracker",
    aliases: ["time-tracker", "workload"],
    name: "Employee Time & Workload Tracker",
    category: "Operations",
    navigationMode: "integrated",
    targetParentId: "time-attendance",
    navigationLabel: "Time & Workload Tracker",
    navigationIcon: "ph-timer",
    navigationGroup: "HRM SUITE",
    navigationOrder: 11,
    route: "/attendance",
    requiredAddonSlugs: ["time-tracker"],
    adminOnly: false,
  },
  {
    id: "integrated-recruitment-ats",
    slug: "recruitment-ats",
    aliases: ["recruitment-ats", "ats"],
    name: "Recruitment ATS & Pipeline",
    category: "HRM",
    navigationMode: "integrated",
    targetParentId: "talent-recruitment",
    navigationLabel: "Recruitment ATS Pipeline",
    navigationIcon: "ph-user-plus",
    navigationGroup: "HRM SUITE",
    navigationOrder: 1,
    route: "/recruitment",
    requiredAddonSlugs: ["recruitment-ats"],
    adminOnly: false,
  },
  {
    id: "integrated-learning-lms",
    slug: "learning-lms",
    aliases: ["learning-lms", "lms", "training"],
    name: "Learning Management System (LMS)",
    category: "HRM",
    navigationMode: "integrated",
    targetParentId: "talent-learning",
    navigationLabel: "Learning Management (LMS)",
    navigationIcon: "ph-graduation-cap",
    navigationGroup: "HRM SUITE",
    navigationOrder: 1,
    route: "/training",
    requiredAddonSlugs: ["learning-lms"],
    adminOnly: false,
  },
  {
    id: "integrated-procurement",
    slug: "procurement",
    aliases: ["procurement", "purchase-orders"],
    name: "Vendor Procurement & POs",
    category: "Finance",
    navigationMode: "integrated",
    targetParentId: "finance-procurement",
    navigationLabel: "Vendor Procurement & POs",
    navigationIcon: "ph-shopping-cart",
    navigationGroup: "Finance",
    navigationOrder: 1,
    route: "/purchases",
    requiredAddonSlugs: ["procurement"],
    adminOnly: true,
  },
  {
    id: "integrated-budget-planner",
    slug: "budget-planner",
    aliases: ["budget-planner", "budgeting"],
    name: "Departmental Budget Planner",
    category: "Finance",
    navigationMode: "integrated",
    targetParentId: "finance-accounting",
    navigationLabel: "Budgets & Financial Plans",
    navigationIcon: "ph-piggy-bank",
    navigationGroup: "Finance",
    navigationOrder: 12,
    route: "/budgets",
    requiredAddonSlugs: ["budget-planner"],
    adminOnly: true,
  },
  {
    id: "integrated-multi-currency",
    slug: "multi-currency",
    aliases: ["multi-currency", "forex"],
    name: "Multi-Currency Financials",
    category: "Finance",
    navigationMode: "integrated",
    targetParentId: "finance-accounting",
    navigationLabel: "Currencies & FX",
    navigationIcon: "ph-coins",
    navigationGroup: "Finance",
    navigationOrder: 13,
    route: "/currencies",
    requiredAddonSlugs: ["multi-currency"],
    adminOnly: true,
  },

  // ─── Pattern 1: Extension-Only (Discovery & Settings Only) ────────────────────
  {
    id: "ext-marketplace",
    slug: "marketplace",
    name: "App Marketplace",
    category: "Extensions",
    navigationMode: "extension",
    navigationLabel: "App Marketplace",
    navigationIcon: "ph-storefront",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 1,
    route: "/marketplace",
    requiredAddonSlugs: [],
    adminOnly: true,
  },
  {
    id: "ext-notice-board",
    slug: "notice-board",
    aliases: ["notice-board", "notices"],
    name: "Corporate Notice Board",
    category: "Communication",
    navigationMode: "extension",
    navigationLabel: "Notice Board",
    navigationIcon: "ph-megaphone",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 2,
    route: "/notice-board",
    requiredAddonSlugs: ["notice-board"],
  },
  {
    id: "ext-internal-reminders",
    slug: "internal-reminders",
    aliases: ["internal-reminders", "reminders"],
    name: "Internal Reminders",
    category: "Productivity",
    navigationMode: "extension",
    navigationLabel: "Internal Reminders",
    navigationIcon: "ph-bell-ringing",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 3,
    route: "/internal-reminders",
    requiredAddonSlugs: ["internal-reminders"],
  },
  {
    id: "ext-two-factor-auth",
    slug: "two-factor-auth",
    aliases: ["two-factor-auth", "2fa", "two_factor"],
    name: "Two-Factor Auth",
    category: "Security",
    navigationMode: "extension",
    navigationLabel: "Two-Factor Auth",
    navigationIcon: "ph-shield-check",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 4,
    route: "/two-factor-auth",
    requiredAddonSlugs: ["two-factor-auth"],
  },
  {
    id: "ext-backup-restore",
    slug: "backup-restore",
    aliases: ["backup-restore", "backup", "restore"],
    name: "Backup & Restore",
    category: "Security",
    navigationMode: "extension",
    navigationLabel: "Backup & Restore",
    navigationIcon: "ph-database",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 5,
    route: "/backup-restore",
    requiredAddonSlugs: ["backup-restore"],
    adminOnly: true,
  },
  {
    id: "ext-activity-logs",
    slug: "activity-logs",
    aliases: ["activity-logs", "activity_logs", "audit-logs"],
    name: "Activity Logs",
    category: "Security",
    navigationMode: "extension",
    navigationLabel: "Activity Logs",
    navigationIcon: "ph-list-checks",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 6,
    route: "/activity-logs",
    requiredAddonSlugs: ["activity-logs"],
    adminOnly: true,
  },
  {
    id: "ext-public-api",
    slug: "public-api",
    aliases: ["public-api", "api-keys"],
    name: "Public API Keys",
    category: "Developer",
    navigationMode: "extension",
    navigationLabel: "Public API Keys",
    navigationIcon: "ph-key",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 7,
    route: "/public-api",
    requiredAddonSlugs: ["public-api"],
    adminOnly: true,
  },
  {
    id: "ext-outbound-webhooks",
    slug: "outbound-webhooks",
    aliases: ["outbound-webhooks", "webhooks", "webhook"],
    name: "Outbound Webhooks",
    category: "Developer",
    navigationMode: "extension",
    navigationLabel: "Outbound Webhooks",
    navigationIcon: "ph-webhooks-logo",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 8,
    route: "/addons/webhook/endpoints",
    requiredAddonSlugs: ["outbound-webhooks", "webhook"],
    adminOnly: true,
  },
  {
    id: "ext-sms-gateway",
    slug: "sms-gateway",
    aliases: ["sms-gateway", "sms"],
    name: "SMS Gateway",
    category: "Communication",
    navigationMode: "extension",
    navigationLabel: "SMS Gateway",
    navigationIcon: "ph-chats-circle",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 9,
    route: "/sms-gateway",
    requiredAddonSlugs: ["sms-gateway"],
    adminOnly: true,
  },
  {
    id: "ext-google-workspace",
    slug: "google-workspace",
    aliases: ["google-workspace", "google-workspace-integration", "google_workspace"],
    name: "Google Workspace",
    category: "Integrations",
    navigationMode: "extension",
    navigationLabel: "Google Workspace",
    navigationIcon: "ph-google-logo",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 10,
    route: "/google-workspace",
    requiredAddonSlugs: ["google-workspace-integration", "google-workspace"],
    adminOnly: true,
  },
  {
    id: "ext-whatsapp-alerts",
    slug: "whatsapp-alerts",
    aliases: ["whatsapp", "whatsapp-alerts", "whatsapp_alerts"],
    name: "WhatsApp Alerts",
    category: "Communications",
    navigationMode: "extension",
    navigationLabel: "WhatsApp Alerts",
    navigationIcon: "ph-whatsapp-logo",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 11,
    route: "/whatsapp-alerts",
    requiredAddonSlugs: ["whatsapp-alerts"],
    adminOnly: true,
  },
  {
    id: "ext-razorpay-gateway",
    slug: "razorpay-gateway",
    aliases: ["razorpay", "razorpay-gateway", "razorpay_gateway"],
    name: "Razorpay Gateway",
    category: "Finance",
    navigationMode: "extension",
    navigationLabel: "Razorpay Gateway",
    navigationIcon: "ph-credit-card",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 12,
    route: "/razorpay-gateway",
    requiredAddonSlugs: ["razorpay-gateway"],
    adminOnly: true,
  },
  {
    id: "ext-ai-ocr",
    slug: "ai-ocr",
    aliases: ["ai-ocr", "ocr", "ai-invoice-ocr"],
    name: "Neural AI OCR Invoice Reader",
    category: "AI",
    navigationMode: "extension",
    navigationLabel: "AI Document OCR",
    navigationIcon: "ph-file-text",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 13,
    route: "/ai-ocr",
    requiredAddonSlugs: ["ai-ocr"],
    adminOnly: true,
  },
  {
    id: "ext-support",
    slug: "support",
    aliases: ["support", "helpdesk", "tickets"],
    name: "Internal Helpdesk & Ticket System",
    category: "Operations",
    navigationMode: "extension",
    navigationLabel: "Support Tickets",
    navigationIcon: "ph-lifebuoy",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 14,
    route: "/support",
    requiredAddonSlugs: ["support"],
    adminOnly: false,
  },
  {
    id: "ext-documents",
    slug: "documents",
    aliases: ["documents", "docs", "file-storage"],
    name: "Workforce Document Management",
    category: "Operations",
    navigationMode: "extension",
    navigationLabel: "Company Documents",
    navigationIcon: "ph-folder-simple",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 15,
    route: "/documents",
    requiredAddonSlugs: ["documents"],
    adminOnly: false,
  },
  {
    id: "ext-custom-fields",
    slug: "custom-fields",
    aliases: ["custom-fields", "custom_fields"],
    name: "Enterprise Custom Fields",
    category: "Operations",
    navigationMode: "extension",
    navigationLabel: "Custom Fields",
    navigationIcon: "ph-sliders-horizontal",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 16,
    route: "/custom-fields",
    requiredAddonSlugs: ["custom-fields"],
    adminOnly: true,
  },
  {
    id: "ext-suggestion-box",
    slug: "suggestion-box",
    aliases: ["suggestion-box", "suggestions"],
    name: "Employee Suggestion Box",
    category: "Communication",
    navigationMode: "extension",
    navigationLabel: "Suggestion Box",
    navigationIcon: "ph-lightbulb",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 17,
    route: "/suggestion-box",
    requiredAddonSlugs: ["suggestion-box"],
    adminOnly: false,
  },
  {
    id: "ext-contracts",
    slug: "contracts",
    aliases: ["contracts", "contract-management"],
    name: "Contract Lifecycle Management",
    category: "Operations",
    navigationMode: "extension",
    navigationLabel: "Contracts Management",
    navigationIcon: "ph-file-lock",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 18,
    route: "/hr/documents/contracts",
    requiredAddonSlugs: ["contracts"],
    adminOnly: true,
  },
  {
    id: "ext-ai-document",
    slug: "ai-document",
    aliases: ["ai-document", "ai-docs", "ai-template"],
    name: "AI Document Templates",
    category: "AI",
    navigationMode: "extension",
    navigationLabel: "AI Document Templates",
    navigationIcon: "ph-sparkles",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 19,
    route: "/addons/ai-document/generate",
    requiredAddonSlugs: ["ai-document"],
    adminOnly: true,
  },
  {
    id: "ext-ai-assistant",
    slug: "ai-assistant",
    aliases: ["ai-assistant", "ai-bot"],
    name: "Universal AI Assistant",
    category: "AI",
    navigationMode: "extension",
    navigationLabel: "AI Assistant",
    navigationIcon: "ph-robot",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 20,
    route: "/addons/ai-assistant/settings",
    requiredAddonSlugs: ["ai-assistant"],
    adminOnly: false,
  },
  {
    id: "integrated-team-workload",
    slug: "team-workload",
    aliases: ["team-workload", "workload"],
    name: "Team Workload & Capacity Balancer",
    category: "Operations",
    navigationMode: "integrated",
    targetParentId: "time-attendance",
    navigationLabel: "Team Workload",
    navigationIcon: "ph-users-three",
    navigationGroup: "HRM SUITE",
    navigationOrder: 14,
    route: "/timesheets",
    requiredAddonSlugs: ["team-workload"],
    adminOnly: false,
  },
  {
    id: "integrated-training",
    slug: "training",
    aliases: ["training", "certifications"],
    name: "Employee Training & Certification",
    category: "HRM",
    navigationMode: "integrated",
    targetParentId: "talent-learning",
    navigationLabel: "Training Programs",
    navigationIcon: "ph-certificate",
    navigationGroup: "HRM SUITE",
    navigationOrder: 3,
    route: "/training",
    requiredAddonSlugs: ["training"],
    adminOnly: false,
  },
  {
    id: "ext-quickbooks",
    slug: "quickbooks",
    aliases: ["quickbooks", "quickbooks-online"],
    name: "QuickBooks Online Bridge",
    category: "Finance",
    navigationMode: "extension",
    navigationLabel: "QuickBooks Online",
    navigationIcon: "ph-arrows-left-right",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 21,
    route: "/integrations",
    requiredAddonSlugs: ["quickbooks"],
    adminOnly: true,
  },
  {
    id: "ext-xero",
    slug: "xero",
    aliases: ["xero", "xero-sync"],
    name: "Xero Cloud Accounting Sync",
    category: "Finance",
    navigationMode: "extension",
    navigationLabel: "Xero Accounting Sync",
    navigationIcon: "ph-arrows-left-right",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 22,
    route: "/integrations",
    requiredAddonSlugs: ["xero"],
    adminOnly: true,
  },
  {
    id: "ext-zatca",
    slug: "zatca",
    aliases: ["zatca", "zatca-einvoice"],
    name: "ZATCA E-Invoicing Phase 2",
    category: "Finance",
    navigationMode: "extension",
    navigationLabel: "ZATCA E-Invoicing",
    navigationIcon: "ph-shield-check",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 23,
    route: "/invoices",
    requiredAddonSlugs: ["zatca"],
    adminOnly: true,
  },
  {
    id: "ext-einvoice-eu",
    slug: "einvoice-eu",
    aliases: ["einvoice-eu", "peppol"],
    name: "EU Peppol E-Invoicing Network",
    category: "Finance",
    navigationMode: "extension",
    navigationLabel: "EU Peppol E-Invoicing",
    navigationIcon: "ph-globe",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 24,
    route: "/invoices",
    requiredAddonSlugs: ["einvoice-eu"],
    adminOnly: true,
  },
  {
    id: "ext-plaid",
    slug: "plaid",
    aliases: ["plaid", "open-banking"],
    name: "Plaid Open Banking Bridge",
    category: "Finance",
    navigationMode: "extension",
    navigationLabel: "Plaid Open Banking",
    navigationIcon: "ph-bank",
    navigationGroup: "EXTENSIONS & ADD-ONS",
    navigationOrder: 25,
    route: "/accounting",
    requiredAddonSlugs: ["plaid"],
    adminOnly: true,
  },
  {
    id: "integrated-financial-goal",
    slug: "financial-goal",
    aliases: ["financial-goal", "financial-targets"],
    name: "Corporate Financial Targets & Goals",
    category: "Finance",
    navigationMode: "integrated",
    targetParentId: "finance-accounting",
    navigationLabel: "Financial Goals",
    navigationIcon: "ph-trend-up",
    navigationGroup: "Finance",
    navigationOrder: 15,
    route: "/budgets",
    requiredAddonSlugs: ["financial-goal"],
    adminOnly: true,
  },
];

/**
 * Backwards compatibility exports for legacy test references
 */
export const STANDALONE_ADDON_MODULES = MASTER_ADDON_REGISTRY.filter(
  (m) => m.navigationMode === "standalone" || m.navigationMode === "standalone_with_submenu"
).map((m) => ({
  id: m.id,
  key: m.slug,
  label: m.navigationLabel,
  menuTitle: m.navigationGroup,
  icon: m.navigationIcon,
  navigationMode: m.navigationMode,
  routes: m.navigationMode === "standalone_with_submenu" && m.children ? m.children.map((c) => c.route) : [m.route],
  requiredAddonSlugs: m.requiredAddonSlugs,
  adminOnly: m.adminOnly,
  children: m.children || [],
}));

export const EXTENSION_ADDONS = MASTER_ADDON_REGISTRY.filter(
  (m) => m.navigationMode === "extension"
).map((m) => ({
  id: m.id,
  label: m.navigationLabel,
  route: m.route,
  requiredAddonKey: m.requiredAddonSlugs[0],
  adminOnly: m.adminOnly,
}));

/**
 * Validates the entire navigation registry to catch configuration errors,
 * route collisions, duplicate identifiers, and invalid parent/child links.
 */
export function validateNavigationRegistry(
  registry: MasterAddonNavDefinition[] = MASTER_ADDON_REGISTRY
): NavigationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const seenIds = new Set<string>();
  const routeOwnership = new Map<string, string[]>();

  for (const def of registry) {
    // 1. Unique ID verification
    if (seenIds.has(def.id)) {
      errors.push(`Duplicate navigation ID detected: '${def.id}'`);
    }
    seenIds.add(def.id);

    // 2. Route formatting
    if (!def.route || !def.route.startsWith("/")) {
      errors.push(`Invalid route format for '${def.id}': route must start with '/' (found '${def.route}')`);
    }

    // 3. Mode-specific contract checks
    if (def.navigationMode === "integrated") {
      if (!def.targetParentId || !def.targetParentId.trim()) {
        errors.push(`Integrated add-on '${def.id}' must specify a valid 'targetParentId'.`);
      }
    }

    if (def.navigationMode === "standalone_with_submenu") {
      if (!def.children || def.children.length === 0) {
        errors.push(`Standalone submenu add-on '${def.id}' must provide at least one child item.`);
      } else {
        const seenChildIds = new Set<string>();
        for (const child of def.children) {
          if (seenChildIds.has(child.id)) {
            errors.push(`Duplicate child ID '${child.id}' inside parent '${def.id}'.`);
          }
          seenChildIds.add(child.id);

          if (!child.route || !child.route.startsWith("/")) {
            errors.push(`Invalid child route for '${child.id}': must start with '/'`);
          }
        }
      }
    }

    // 4. Conflicting route tracking (ignoring intentional shared landing pages between parent and primary child)
    if (def.navigationMode !== "integrated") {
      const existing = routeOwnership.get(def.route) || [];
      existing.push(def.id);
      routeOwnership.set(def.route, existing);
    }
  }

  // Check for route conflicts across different top-level definitions
  for (const [route, itemIds] of routeOwnership.entries()) {
    if (itemIds.length > 1) {
      warnings.push(`Shared route '${route}' used by multiple definitions: [${itemIds.join(", ")}]`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Resolves any raw slug or alias to its canonical catalog slug.
 */
export function resolveCanonicalSlug(slugOrAlias: string): string {
  const clean = slugOrAlias.trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(ADDON_ALIASES)) {
    if (canonical.toLowerCase() === clean || aliases.some((a) => a.toLowerCase() === clean)) {
      return canonical;
    }
  }
  return clean;
}

/**
 * Pure evaluation function resolving standalone modules (Patterns 2 & 3)
 * for a given entitlement context.
 */
export function resolveStandaloneModules(
  isEntitled: (key: string) => boolean,
  isAdminOrSuper: boolean,
  currentPath: string,
  registry: MasterAddonNavDefinition[] = MASTER_ADDON_REGISTRY
): ResolvedStandaloneModule[] {
  return registry
    .filter(
      (mod) =>
        mod.navigationMode === "standalone" || mod.navigationMode === "standalone_with_submenu"
    )
    .filter((mod) => {
      if (mod.adminOnly && !isAdminOrSuper) return false;
      return mod.requiredAddonSlugs.some((slug) => isEntitled(slug));
    })
    .map((mod) => {
      if (mod.navigationMode === "standalone_with_submenu" && mod.children) {
        // Pattern 3: Submenu resolution with deduplication & entitlement check
        const seenRoutes = new Set<string>();
        const authorizedChildren: ResolvedStandaloneChild[] = [];

        const sortedChildren = [...mod.children].sort((a, b) => a.order - b.order);
        for (const child of sortedChildren) {
          if (seenRoutes.has(child.route)) continue;
          if (isEntitled(child.requiredAddonKey)) {
            seenRoutes.add(child.route);
            authorizedChildren.push({
              id: child.id,
              label: child.label,
              route: child.route,
              isActive: currentPath === child.route || currentPath.split("?")[0] === child.route,
            });
          }
        }

        const activeRoutes = authorizedChildren.map((c) => c.route);
        return {
          id: mod.id,
          key: mod.slug,
          label: mod.navigationLabel,
          menuTitle: mod.navigationGroup,
          icon: mod.navigationIcon,
          navigationMode: mod.navigationMode,
          routes: activeRoutes,
          activeRoute: activeRoutes.includes(currentPath) || activeRoutes.includes(currentPath.split("?")[0]),
          children: authorizedChildren,
        };
      } else {
        // Pattern 2: Standalone single menu resolution
        const isActive = currentPath === mod.route || currentPath.startsWith(`${mod.route}/`);
        return {
          id: mod.id,
          key: mod.slug,
          label: mod.navigationLabel,
          menuTitle: mod.navigationGroup,
          icon: mod.navigationIcon,
          navigationMode: mod.navigationMode,
          routes: [mod.route],
          activeRoute: isActive,
          children: [],
        };
      }
    })
    .filter((mod) => mod.navigationMode === "standalone" || mod.children.length > 0);
}

/**
 * Pure evaluation function resolving integrated add-ons (Pattern 4)
 * that belong inside a specified core parent module (e.g. 'time-attendance', 'finance-accounting').
 */
export function resolveIntegratedAddons(
  isEntitled: (key: string) => boolean,
  isAdminOrSuper: boolean,
  targetParentId: string,
  currentPath: string,
  registry: MasterAddonNavDefinition[] = MASTER_ADDON_REGISTRY
): ResolvedIntegratedAddon[] {
  return registry
    .filter(
      (item) => item.navigationMode === "integrated" && item.targetParentId === targetParentId
    )
    .filter((item) => {
      if (item.adminOnly && !isAdminOrSuper) return false;
      return item.requiredAddonSlugs.some((slug) => isEntitled(slug));
    })
    .sort((a, b) => a.navigationOrder - b.navigationOrder)
    .map((item) => ({
      id: item.id,
      slug: item.slug,
      label: item.navigationLabel,
      route: item.route,
      icon: item.navigationIcon,
      isActive: currentPath === item.route,
      order: item.navigationOrder,
    }));
}

/**
 * Pure evaluation function resolving extension items (Pattern 1)
 * strictly limited to discovery and settings-only utilities.
 */
export function resolveExtensionItems(
  isEntitled: (key: string) => boolean,
  isAdminOrSuper: boolean,
  currentPath: string,
  registry: MasterAddonNavDefinition[] = MASTER_ADDON_REGISTRY
): ResolvedExtensionItem[] {
  const seenRoutes = new Set<string>();
  const items: ResolvedExtensionItem[] = [];

  const candidates = registry
    .filter((item) => item.navigationMode === "extension")
    .filter((item) => {
      if (item.adminOnly && !isAdminOrSuper) return false;
      if (item.requiredAddonSlugs.length === 0) return true; // e.g. marketplace for admins
      return item.requiredAddonSlugs.some((slug) => isEntitled(slug));
    })
    .sort((a, b) => a.navigationOrder - b.navigationOrder);

  for (const item of candidates) {
    if (seenRoutes.has(item.route)) continue;
    seenRoutes.add(item.route);
    items.push({
      id: item.id,
      label: item.navigationLabel,
      route: item.route,
      requiredAddonKey: item.requiredAddonSlugs[0],
      adminOnly: item.adminOnly,
      isActive: currentPath === item.route,
    });
  }

  return items;
}

/**
 * Hook providing resolved navigation items for the current session.
 */
export function useAddonNavigation() {
  const { isEntitled, isSuperAdmin, isWorkspaceAdmin, isLoading } = useNavigationResolver();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isAdminOrSuper = isSuperAdmin || isWorkspaceAdmin;

  const standaloneModules = useMemo(
    () => resolveStandaloneModules(isEntitled, isAdminOrSuper, currentPath),
    [isEntitled, isAdminOrSuper, currentPath]
  );

  const extensionItems = useMemo(
    () => resolveExtensionItems(isEntitled, isAdminOrSuper, currentPath),
    [isEntitled, isAdminOrSuper, currentPath]
  );

  const hasWooCommerce = useMemo(
    () => (isEntitled("woocommerce-sync") || isEntitled("woocommerce-hub")) && isAdminOrSuper,
    [isEntitled, isAdminOrSuper]
  );

  const hasShopify = useMemo(
    () => isEntitled("shopify-sync") && isAdminOrSuper,
    [isEntitled, isAdminOrSuper]
  );

  const isEcommerceEntitled = hasWooCommerce || hasShopify;

  const isStrategyStudioEntitled = useMemo(
    () =>
      (isEntitled("swot") ||
        isEntitled("pestel") ||
        isEntitled("pest") ||
        isEntitled("strategy-studio")) &&
      isAdminOrSuper,
    [isEntitled, isAdminOrSuper]
  );

  return {
    standaloneModules,
    extensionItems,
    resolveIntegratedAddons: (parentId: string) =>
      resolveIntegratedAddons(isEntitled, isAdminOrSuper, parentId, currentPath),
    isEcommerceEntitled,
    hasWooCommerce,
    hasShopify,
    isStrategyStudioEntitled,
    isLoading,
    isAdminOrSuper,
    currentPath,
  };
}
