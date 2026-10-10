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
  wave?: "WAVE_1" | "WAVE_2" | "WAVE_3";
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
  wave?: "WAVE_1" | "WAVE_2" | "WAVE_3";
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

  // ─── Feature Add-Ons (Wave 1: Foundation & Trust) ─────────────────────────────
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
    wave: "WAVE_1",
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
    wave: "WAVE_1",
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
    wave: "WAVE_1",
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
    wave: "WAVE_1",
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
    wave: "WAVE_1",
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
    wave: "WAVE_1",
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
    wave: "WAVE_1",
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
    wave: "WAVE_1",
    features: [
      "Multi-currency invoices and bills",
      "Automated foreign exchange rate updates",
    ],
  },
  {
    id: "addon_time_tracker",
    slug: "time-tracker",
    name: "Employee Time & Workload Tracker",
    productType: "ADDON_FEATURE",
    entitlementKey: "time-tracker",
    targetEngine: "addon",
    description: "Granular project and task time tracking with timesheet approvals and billable rate calculations.",
    category: "Operations",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_1",
    features: [
      "Project & activity timesheets",
      "Manager timesheet approval flows",
      "Billable hours reporting",
    ],
  },
  {
    id: "addon_recruitment_ats",
    slug: "recruitment-ats",
    name: "Recruitment ATS & Pipeline",
    productType: "ADDON_FEATURE",
    entitlementKey: "recruitment-ats",
    targetEngine: "addon",
    description: "End-to-end applicant tracking system, job opening publisher, candidate stages, and interview scorecards.",
    category: "HRM",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_1",
    features: [
      "Kanban candidate hiring pipeline",
      "Job requisition and career board",
      "Structured interview scorecards",
    ],
  },
  {
    id: "addon_support",
    slug: "support",
    name: "Internal Helpdesk & Ticket System",
    productType: "ADDON_FEATURE",
    entitlementKey: "support",
    targetEngine: "addon",
    description: "Internal employee ticketing, IT support queues, SLA policies, and issue resolution workflows.",
    category: "Operations",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_1",
    features: [
      "Ticket triage with priority queues",
      "Automated response notifications",
      "Internal departmental SLA tracking",
    ],
  },
  {
    id: "addon_activity_logs",
    slug: "activity-logs",
    name: "Enterprise Audit & Activity Logs",
    productType: "ADDON_FEATURE",
    entitlementKey: "activity-logs",
    targetEngine: "addon",
    description: "Comprehensive immutable tenant audit trails, compliance tracking, and administrative event logs.",
    category: "Security",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_1",
    features: [
      "User sign-in and session audit history",
      "Privileged data mutation records",
      "Exportable CSV compliance logs",
    ],
  },
  {
    id: "addon_notice_board",
    slug: "notice-board",
    name: "Corporate Notice Board & Broadcasts",
    productType: "ADDON_FEATURE",
    entitlementKey: "notice-board",
    targetEngine: "addon",
    description: "Company-wide announcements, policy bulletin updates, and departmental communication broadcasts.",
    category: "Communications",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_1",
    features: [
      "Targeted departmental broadcasts",
      "Pin important executive memos",
      "Read receipts and acknowledgement tracking",
    ],
  },
  {
    id: "addon_documents",
    slug: "documents",
    name: "Workforce Document Management",
    productType: "ADDON_FEATURE",
    entitlementKey: "documents",
    targetEngine: "addon",
    description: "Centralized employee files, digital signatures, expiring document alerts, and policy handbooks.",
    category: "Operations",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_1",
    features: [
      "Encrypted cloud document storage",
      "Passport and visa expiry notifications",
      "Employee contract repository",
    ],
  },

  // ─── Feature Add-Ons (Wave 2: Growth & Integrations) ──────────────────────────
  {
    id: "addon_learning_lms",
    slug: "learning-lms",
    name: "Learning Management System (LMS)",
    productType: "ADDON_FEATURE",
    entitlementKey: "learning-lms",
    targetEngine: "addon",
    description: "Corporate course builder, compliance training programs, video modules, and certification issuing.",
    category: "HRM",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_2",
    features: [
      "Interactive course modules and quizzes",
      "Automated mandatory compliance certificates",
      "Employee learning progress dashboards",
    ],
  },
  {
    id: "addon_procurement",
    slug: "procurement",
    name: "Vendor Procurement & POs",
    productType: "ADDON_FEATURE",
    entitlementKey: "procurement",
    targetEngine: "addon",
    description: "Vendor quotation requests, purchase orders, 3-way matching, and goods receipt verification.",
    category: "Finance",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_2",
    features: [
      "Purchase order creation and approval hierarchy",
      "Vendor catalog management",
      "Goods receipt note (GRN) reconciliation",
    ],
  },
  {
    id: "addon_team_workload",
    slug: "team-workload",
    name: "Team Workload & Capacity Balancer",
    productType: "ADDON_FEATURE",
    entitlementKey: "team-workload",
    targetEngine: "addon",
    description: "Visual heatmaps of department workload, resource allocation, and project deadline feasibility.",
    category: "Operations",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_2",
    features: [
      "Real-time bandwidth utilization heatmaps",
      "Cross-project resource reassignment",
      "Overwork and burnout risk warnings",
    ],
  },
  {
    id: "addon_smart_reports",
    slug: "smart-reports",
    name: "Executive Smart Reports & Analytics",
    productType: "ADDON_FEATURE",
    entitlementKey: "smart-reports",
    targetEngine: "addon",
    description: "Custom report builder with automated scheduling, drill-down financial metrics, and executive PDF summaries.",
    category: "Finance",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_2",
    features: [
      "Custom multi-dimensional report generator",
      "Scheduled email delivery for leadership",
      "Aggregated KPI trends and comparisons",
    ],
  },
  {
    id: "addon_smart_dashboard",
    slug: "smart-dashboard",
    name: "Custom BI Smart Dashboards",
    productType: "ADDON_FEATURE",
    entitlementKey: "smart-dashboard",
    targetEngine: "addon",
    description: "Interactive visual dashboards with configurable drag-and-drop widgets and real-time operational metrics.",
    category: "Operations",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_2",
    features: [
      "Widget-based real-time telemetry",
      "Role-tailored KPI views",
      "Exportable presentation graphics",
    ],
  },
  {
    id: "addon_contracts",
    slug: "contracts",
    name: "Contract Lifecycle Management",
    productType: "ADDON_FEATURE",
    entitlementKey: "contracts",
    targetEngine: "addon",
    description: "Vendor, client, and employee legal contract repository with renewal alerts, audit trail, and approval stages.",
    category: "Operations",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_2",
    features: [
      "Digital contract authoring and version control",
      "Milestone-based renewal reminders",
      "Authorized signatory approval chains",
    ],
  },
  {
    id: "addon_budget_planner",
    slug: "budget-planner",
    name: "Departmental Budget Planner",
    productType: "ADDON_FEATURE",
    entitlementKey: "budget-planner",
    targetEngine: "addon",
    description: "Fiscal year departmental budget forecasting, variance analysis, and spend limits.",
    category: "Finance",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_2",
    features: [
      "Departmental budget envelope controls",
      "Actual vs. forecasted expense variance",
      "Fiscal year reallocation workflows",
    ],
  },
  {
    id: "addon_quickbooks",
    slug: "quickbooks",
    name: "QuickBooks Online Bridge",
    productType: "ADDON_INTEGRATION",
    entitlementKey: "quickbooks",
    targetEngine: "addon",
    description: "Bi-directional sync of chart of accounts, invoices, expenses, and payroll journals with Intuit QuickBooks.",
    category: "Finance",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_2",
    features: [
      "Automated journal sync to QuickBooks Online",
      "Customer and vendor master reconciliation",
      "Payment receipt status synchronization",
    ],
  },
  {
    id: "addon_xero",
    slug: "xero",
    name: "Xero Cloud Accounting Sync",
    productType: "ADDON_INTEGRATION",
    entitlementKey: "xero",
    targetEngine: "addon",
    description: "Direct bank feed and general ledger synchronizer with Xero global cloud accounting platform.",
    category: "Finance",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_2",
    features: [
      "Two-way invoice and bill mirroring",
      "Tax code mapping for international compliance",
      "Payroll expense journal dispatches",
    ],
  },
  {
    id: "addon_shopify_sync",
    slug: "shopify-sync",
    name: "Shopify E-Commerce Cloud Sync",
    productType: "ADDON_INTEGRATION",
    entitlementKey: "shopify-sync",
    targetEngine: "addon",
    description: "Bi-directional catalog, order, and stock sync connecting Shopify e-commerce storefronts to POS inventory.",
    category: "Integrations",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_2",
    features: [
      "Real-time order webhook ingestion",
      "Automatic POS inventory decrementing",
      "Customer profile synchronization",
    ],
  },
  {
    id: "addon_woocommerce_sync",
    slug: "woocommerce-sync",
    name: "WooCommerce Store Connector",
    productType: "ADDON_INTEGRATION",
    entitlementKey: "woocommerce-sync",
    targetEngine: "addon",
    description: "Synchronize WordPress WooCommerce digital storefronts with centralized billing, stock, and orders.",
    category: "Integrations",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_2",
    features: [
      "REST API product catalog publishing",
      "Two-way order and fulfillment sync",
      "Refund and stock balance reconciliation",
    ],
  },
  {
    id: "addon_razorpay_gateway",
    slug: "razorpay-gateway",
    name: "Razorpay Merchant Payment Gateway",
    productType: "ADDON_INTEGRATION",
    entitlementKey: "razorpay-gateway",
    targetEngine: "addon",
    description: "Native Indian payment checkout integration supporting UPI, Netbanking, Credit Cards, and Auto-Debit.",
    category: "Finance",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_2",
    features: [
      "Standard Checkout modal with instant capture",
      "Webhook payment verification with HMAC signatures",
      "Automatic invoice reconciliation upon receipt",
    ],
  },

  // ─── Feature Add-Ons (Wave 3: Strategy & Regional) ────────────────────────────
  {
    id: "addon_swot",
    slug: "swot",
    name: "SWOT Analysis Matrix (Strategy Studio)",
    productType: "ADDON_FEATURE",
    entitlementKey: "swot",
    targetEngine: "addon",
    description: "Corporate Strengths, Weaknesses, Opportunities, and Threats strategic assessment studio with AI recommendations.",
    category: "Strategy",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_3",
    features: [
      "Interactive 4-quadrant strategic canvas",
      "Strategic initiative prioritization scoring",
      "Exportable executive presentation decks",
    ],
  },
  {
    id: "addon_pestel",
    slug: "pestel",
    name: "PESTEL Strategic Macro Analysis",
    productType: "ADDON_FEATURE",
    entitlementKey: "pestel",
    targetEngine: "addon",
    description: "Political, Economic, Social, Technological, Environmental, and Legal corporate environment analysis.",
    category: "Strategy",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_3",
    features: [
      "6-pillar environmental impact assessment",
      "Macro risk heatmapping and early alerts",
      "Strategic risk register integration",
    ],
  },
  {
    id: "addon_porters_five_forces",
    slug: "porters-five-forces",
    name: "Porter's Five Forces Framework",
    productType: "ADDON_FEATURE",
    entitlementKey: "porters-five-forces",
    targetEngine: "addon",
    description: "Industry competitiveness and market position modeling based on Michael Porter's 5 market forces.",
    category: "Strategy",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_3",
    features: [
      "Competitive rivalry and substitute threat scoring",
      "Supplier and buyer power dynamic indexes",
      "Barrier to entry defensibility rating",
    ],
  },
  {
    id: "addon_pest",
    slug: "pest",
    name: "PEST Business Environment Framework",
    productType: "ADDON_FEATURE",
    entitlementKey: "pest",
    targetEngine: "addon",
    description: "Streamlined 4-pillar Political, Economic, Social, and Technological business environment tracker.",
    category: "Strategy",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_3",
    features: [
      "Core external factor assessment",
      "Quarterly impact tracking and metrics",
      "Leadership decision summary reports",
    ],
  },
  {
    id: "addon_mckinsey_7s",
    slug: "mckinsey-7s",
    name: "McKinsey 7-S Organizational Alignment",
    productType: "ADDON_FEATURE",
    entitlementKey: "mckinsey-7s",
    targetEngine: "addon",
    description: "Organizational design assessment aligning Strategy, Structure, Systems, Shared Values, Style, Staff, and Skills.",
    category: "Strategy",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_3",
    features: [
      "Hard and soft element cohesion evaluation",
      "Change management alignment audits",
      "Post-merger organizational readiness scoring",
    ],
  },
  {
    id: "addon_business_model",
    slug: "business-model",
    name: "Business Model Canvas Modeler",
    productType: "ADDON_FEATURE",
    entitlementKey: "business-model",
    targetEngine: "addon",
    description: "Interactive 9-box Business Model Canvas for structuring value propositions, channels, and revenue streams.",
    category: "Strategy",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_3",
    features: [
      "Dynamic 9-building-block visual canvas",
      "Multiple scenario planning and comparison",
      "Cost structure vs revenue stream balance",
    ],
  },
  {
    id: "addon_business_plan",
    slug: "business-plan",
    name: "Enterprise Business Plan Builder",
    productType: "ADDON_FEATURE",
    entitlementKey: "business-plan",
    targetEngine: "addon",
    description: "Structured multi-chapter enterprise business planning with financial projections and executive summaries.",
    category: "Strategy",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_3",
    features: [
      "Standard investor-ready business plan sections",
      "Built-in 3-year cashflow projections",
      "Collaborative executive commenting",
    ],
  },
  {
    id: "addon_marketing_plan",
    slug: "marketing-plan",
    name: "Omnichannel Marketing Strategic Planner",
    productType: "ADDON_FEATURE",
    entitlementKey: "marketing-plan",
    targetEngine: "addon",
    description: "Marketing campaign roadmaps, target audience personas, acquisition channels, and CAC/LTV forecasting.",
    category: "Strategy",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_3",
    features: [
      "Buyer persona definitions and user journeys",
      "Quarterly campaign calendar and budget allocation",
      "Channel ROI and conversion projections",
    ],
  },
  {
    id: "addon_zatca",
    slug: "zatca",
    name: "ZATCA E-Invoicing Phase 2 (KSA)",
    productType: "ADDON_INTEGRATION",
    entitlementKey: "zatca",
    targetEngine: "addon",
    description: "Saudi Zakat, Tax and Customs Authority compliant e-invoicing bridge with cryptographic stamps and QR codes.",
    category: "Finance",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_3",
    features: [
      "FATOORA XML generation with digital signature",
      "ZATCA clearance and reporting API integration",
      "B2B and B2C compliant invoice QR code rendering",
    ],
  },
  {
    id: "addon_einvoice_eu",
    slug: "einvoice-eu",
    name: "EU Peppol E-Invoicing Network",
    productType: "ADDON_INTEGRATION",
    entitlementKey: "einvoice-eu",
    targetEngine: "addon",
    description: "European Pan-European Public Procurement On-Line (Peppol) BIS Billing 3.0 compliant XML invoice exchange.",
    category: "Finance",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_3",
    features: [
      "UBL 2.1 / Peppol BIS Billing 3.0 generation",
      "Certified Peppol Access Point transmission",
      "Cross-border EU VAT compliance validation",
    ],
  },
  {
    id: "addon_plaid",
    slug: "plaid",
    name: "Plaid Open Banking Bridge",
    productType: "ADDON_INTEGRATION",
    entitlementKey: "plaid",
    targetEngine: "addon",
    description: "Automated real-time corporate bank feed imports and transaction reconciliation via Plaid Open Banking.",
    category: "Finance",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_3",
    features: [
      "Secure OAuth bank account linking",
      "Daily transaction sync to accounting ledgers",
      "Automated bank statement reconciliation",
    ],
  },
  {
    id: "addon_financial_goal",
    slug: "financial-goal",
    name: "Corporate Financial Targets & Goals",
    productType: "ADDON_FEATURE",
    entitlementKey: "financial-goal",
    targetEngine: "addon",
    description: "Revenue milestone tracking, EBITDA goals, operating margin thresholds, and alert triggers.",
    category: "Finance",
    isPublic: true,
    status: "ACTIVE",
    version: "1.0.0",
    wave: "WAVE_3",
    features: [
      "Milestone-based financial target trackers",
      "Real-time attainment percentages",
      "Executive pacing forecasts",
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
          const tSlug = template.slug.toLowerCase();
          const checkSlugs = [
            tSlug,
            ...(tSlug.includes("google-workspace")
              ? ["google-workspace", "google-workspace-integration"]
              : []),
          ];
          if (checkSlugs.some((s) => tenantAddons.has(s))) {
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
        wave: template.wave,
      });
    }

    return {
      currency: config.tax.currency,
      totalProducts: result.length,
      products: result,
    };
  }

  /**
   * Ensures that all canonical add-on entries are represented in the database Addon table.
   * Auto-provisions missing canonical records without modifying existing customized records.
   */
  public static async ensureCanonicalAddonsInDb(): Promise<void> {
    const db = rawPrisma || prisma;
    const existingAddons = await db.addon.findMany({ select: { slug: true } });
    const existingSlugs = new Set(existingAddons.map((a) => a.slug));

    const toCreate = CANONICAL_CATALOG_REGISTRY.filter(
      (template) => template.targetEngine === "addon" && !existingSlugs.has(template.slug)
    );

    if (toCreate.length > 0) {
      await db.addon.createMany({
        data: toCreate.map((template) => ({
          slug: template.slug,
          name: template.name,
          description: template.description,
          category: template.category,
          version: template.version,
          status: "active",
          priceMonthly: 0,
          features: template.features,
        })),
        skipDuplicates: true,
      });
    }
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
