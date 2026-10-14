/**
 * MASTERHRMS — Phase A3.2: Commerce Pricing & Catalog Configuration
 *
 * Enforces authoritative rules:
 * 1. Commercial prices remain configurable and unapproved under OD-1.
 * 2. In production (NODE_ENV === "production"), unset or whitespace-only price
 *    environment variables resolve strictly to null. No unapproved commercial
 *    fallback price may reach production.
 * 3. Malformed values, NaN, Infinity, negative values, or values with unsupported
 *    precision fail safely as unconfigured (null).
 * 4. Development/test fallbacks are strictly gated to non-production environments.
 * 5. Platform state is Haryana (State Code "06") for Indian GST place-of-supply determination.
 * 6. Arithmetic uses two-decimal ROUND_HALF_UP precision.
 */

export interface SeatBandTier {
  bandKey: "micro" | "small" | "mid" | "enterprise";
  name: string;
  minSeats: number;
  maxSeats: number;
  includedSeats: number;
  overagePricePerSeatMonthly: number;
  overagePricePerSeatAnnual: number;
}

export interface ProductPriceConfig {
  monthly: number | null; // in INR major units (e.g. 199.00)
  annual: number | null;  // in INR major units (e.g. 1990.00)
  pricePerUser?: number | null;
  includedSeats?: number;
  overagePricePerSeatMonthly?: number | null;
  overagePricePerSeatAnnual?: number | null;
  seatBands?: SeatBandTier[];
}

export interface TaxConfig {
  platformGstin: string;
  platformStateCode: string; // "06" (Haryana)
  platformStateName: string; // "Haryana"
  intraStateCgstRate: number; // 0.09 (9%)
  intraStateSgstRate: number; // 0.09 (9%)
  interStateIgstRate: number; // 0.18 (18%)
  exportGstRate: number;      // 0.00 (0%)
  currency: string;           // "INR"
}

export interface CommercePricingConfig {
  tax: TaxConfig;
  seatBands: SeatBandTier[];
  products: Record<string, ProductPriceConfig>;
  allowUnapprovedDefaults: boolean;
}

/**
 * Validates and safely parses an environment variable or string into a price.
 * 
 * Rules:
 * - In production, unset, empty, or whitespace-only inputs strictly return null.
 * - In non-production, unapproved development fallbacks are permitted only if allowDefault is true.
 * - Rejects NaN, positive/negative Infinity, negative numbers, and values exceeding maxDecimals.
 */
export function parseConfiguredPrice(
  rawValue: string | number | undefined | null,
  developmentFallback: number | null = null,
  options?: {
    allowZero?: boolean;
    maxDecimals?: number;
    allowDefaults?: boolean;
  }
): number | null {
  const isProduction = process.env.NODE_ENV === "production";
  const allowDefaults = options?.allowDefaults ?? (!isProduction);

  if (rawValue === undefined || rawValue === null) {
    return allowDefaults ? developmentFallback : null;
  }

  const str = typeof rawValue === "number" ? String(rawValue) : String(rawValue).trim();
  if (str === "") {
    return allowDefaults ? developmentFallback : null;
  }

  const num = Number(str);

  // Reject NaN, non-finite, and negative values
  if (isNaN(num) || !Number.isFinite(num) || num < 0) {
    return null;
  }

  if (!options?.allowZero && num === 0) {
    return null;
  }

  // Currency amounts must not exceed 2 decimal places
  const maxDecimals = options?.maxDecimals ?? 2;
  const parts = str.split(".");
  if (parts.length === 2 && parts[1].length > maxDecimals) {
    return null;
  }

  return num;
}

/**
 * Validates and safely parses an integer configuration value (e.g. seat quotas).
 */
export function parseConfiguredInteger(
  rawValue: string | number | undefined | null,
  developmentFallback: number | null = null,
  min: number = 1,
  allowDefaultsOverride?: boolean
): number | null {
  const isProduction = process.env.NODE_ENV === "production";
  const allowDefaults = allowDefaultsOverride ?? (!isProduction);

  if (rawValue === undefined || rawValue === null) {
    return allowDefaults ? developmentFallback : null;
  }

  const str = typeof rawValue === "number" ? String(rawValue) : String(rawValue).trim();
  if (str === "") {
    return allowDefaults ? developmentFallback : null;
  }

  const num = Number(str);
  if (isNaN(num) || !Number.isFinite(num) || !Number.isInteger(num) || num < min) {
    return null;
  }

  return num;
}

export const DEFAULT_SEAT_BANDS: SeatBandTier[] = [
  {
    bandKey: "micro",
    name: "Micro (1-25 seats)",
    minSeats: 1,
    maxSeats: 25,
    includedSeats: 25,
    overagePricePerSeatMonthly: 15,
    overagePricePerSeatAnnual: 150,
  },
  {
    bandKey: "small",
    name: "Small (26-100 seats)",
    minSeats: 26,
    maxSeats: 100,
    includedSeats: 100,
    overagePricePerSeatMonthly: 12,
    overagePricePerSeatAnnual: 120,
  },
  {
    bandKey: "mid",
    name: "Mid-Market (101-500 seats)",
    minSeats: 101,
    maxSeats: 500,
    includedSeats: 500,
    overagePricePerSeatMonthly: 10,
    overagePricePerSeatAnnual: 100,
  },
  {
    bandKey: "enterprise",
    name: "Enterprise (501+ seats)",
    minSeats: 501,
    maxSeats: 99999,
    includedSeats: 500,
    overagePricePerSeatMonthly: 8,
    overagePricePerSeatAnnual: 80,
  },
];

export const DEFAULT_TAX_CONFIG: TaxConfig = {
  platformGstin: process.env.PLATFORM_GSTIN || "06AAACM1234F1Z8",
  platformStateCode: "06",
  platformStateName: "Haryana",
  intraStateCgstRate: 0.09,
  intraStateSgstRate: 0.09,
  interStateIgstRate: 0.18,
  exportGstRate: 0.00,
  currency: "INR",
};

/**
 * Builds the commerce pricing configuration reflecting the current environment.
 * In production (NODE_ENV === "production"), unconfigured prices evaluate strictly to null.
 */
export function buildCommercePricingConfig(overrides?: Partial<CommercePricingConfig>): CommercePricingConfig {
  const isProduction = process.env.NODE_ENV === "production";
  const allowDefaults = isProduction ? false : (overrides?.allowUnapprovedDefaults ?? true);

  const p = (envVal: string | undefined, devFallback: number | null, allowZero = false) =>
    parseConfiguredPrice(envVal, devFallback, { allowZero, allowDefaults });

  const pInt = (envVal: string | undefined, devFallback: number | null, min = 1) =>
    parseConfiguredInteger(envVal, devFallback, min, allowDefaults);

  const productPrices: Record<string, ProductPriceConfig> = {
    // Base Plans (HRMS)
    "starter": {
      monthly: p(process.env.COMMERCE_PRICE_STARTER_MONTHLY, 199),
      annual: p(process.env.COMMERCE_PRICE_STARTER_ANNUAL, 1990),
      includedSeats: pInt(process.env.COMMERCE_SEATS_STARTER_INCLUDED, 25) ?? 25,
      overagePricePerSeatMonthly: p(process.env.COMMERCE_OVERAGE_STARTER_MONTHLY, 15),
      overagePricePerSeatAnnual: p(process.env.COMMERCE_OVERAGE_STARTER_ANNUAL, 150),
      seatBands: DEFAULT_SEAT_BANDS,
    },
    "growth": {
      monthly: p(process.env.COMMERCE_PRICE_GROWTH_MONTHLY, 399),
      annual: p(process.env.COMMERCE_PRICE_GROWTH_ANNUAL, 3990),
      includedSeats: pInt(process.env.COMMERCE_SEATS_GROWTH_INCLUDED, 100) ?? 100,
      overagePricePerSeatMonthly: p(process.env.COMMERCE_OVERAGE_GROWTH_MONTHLY, 12),
      overagePricePerSeatAnnual: p(process.env.COMMERCE_OVERAGE_GROWTH_ANNUAL, 120),
      seatBands: DEFAULT_SEAT_BANDS,
    },
    "sovereign": {
      monthly: p(process.env.COMMERCE_PRICE_SOVEREIGN_MONTHLY, 799),
      annual: p(process.env.COMMERCE_PRICE_SOVEREIGN_ANNUAL, 7990),
      includedSeats: pInt(process.env.COMMERCE_SEATS_SOVEREIGN_INCLUDED, 500) ?? 500,
      overagePricePerSeatMonthly: p(process.env.COMMERCE_OVERAGE_SOVEREIGN_MONTHLY, 10),
      overagePricePerSeatAnnual: p(process.env.COMMERCE_OVERAGE_SOVEREIGN_ANNUAL, 100),
      seatBands: DEFAULT_SEAT_BANDS,
    },
    "custom-flex": {
      monthly: 0,
      annual: 0,
      pricePerUser: p(process.env.COMMERCE_PRICE_CUSTOM_PER_USER, 49),
    },

    // Standalone Products (ERP Modules)
    "pos": {
      monthly: p(process.env.COMMERCE_PRICE_POS_MONTHLY, 2499),
      annual: p(process.env.COMMERCE_PRICE_POS_ANNUAL, 24990),
    },
    "crm": {
      monthly: p(process.env.COMMERCE_PRICE_CRM_MONTHLY, 1999),
      annual: p(process.env.COMMERCE_PRICE_CRM_ANNUAL, 19990),
    },
    "finance": {
      monthly: p(process.env.COMMERCE_PRICE_FINANCE_MONTHLY, 2999),
      annual: p(process.env.COMMERCE_PRICE_FINANCE_ANNUAL, 29990),
    },

    // Feature Add-Ons
    "biometric-sync": {
      monthly: p(process.env.COMMERCE_PRICE_BIOMETRIC_MONTHLY, 79),
      annual: p(process.env.COMMERCE_PRICE_BIOMETRIC_ANNUAL, 790),
    },
    "google-workspace": {
      monthly: p(process.env.COMMERCE_PRICE_GOOGLE_WORKSPACE_MONTHLY, 149),
      annual: p(process.env.COMMERCE_PRICE_GOOGLE_WORKSPACE_ANNUAL, 1490),
    },
    "asset-management": {
      monthly: p(process.env.COMMERCE_PRICE_ASSET_MGMT_MONTHLY, 99),
      annual: p(process.env.COMMERCE_PRICE_ASSET_MGMT_ANNUAL, 990),
    },
    "okr-performance": {
      monthly: p(process.env.COMMERCE_PRICE_OKR_MONTHLY, 129),
      annual: p(process.env.COMMERCE_PRICE_OKR_ANNUAL, 1290),
    },
    "whatsapp-alerts": {
      monthly: p(process.env.COMMERCE_PRICE_WHATSAPP_MONTHLY, 49),
      annual: p(process.env.COMMERCE_PRICE_WHATSAPP_ANNUAL, 490),
    },
    "ai-ocr": {
      monthly: p(process.env.COMMERCE_PRICE_AI_OCR_MONTHLY, 99),
      annual: p(process.env.COMMERCE_PRICE_AI_OCR_ANNUAL, 990),
    },
    "tally-importer": {
      monthly: p(process.env.COMMERCE_PRICE_TALLY_MONTHLY, 59),
      annual: p(process.env.COMMERCE_PRICE_TALLY_ANNUAL, 590),
    },
    "multi-currency": {
      monthly: p(process.env.COMMERCE_PRICE_MULTI_CURRENCY_MONTHLY, 89),
      annual: p(process.env.COMMERCE_PRICE_MULTI_CURRENCY_ANNUAL, 890),
    },
    "woocommerce-sync": {
      monthly: p(process.env.COMMERCE_PRICE_WOOCOMMERCE_MONTHLY, 0, true),
      annual: p(process.env.COMMERCE_PRICE_WOOCOMMERCE_ANNUAL, 0, true),
    },
    "woocommerce-hub": {
      monthly: p(process.env.COMMERCE_PRICE_WOOCOMMERCE_HUB_MONTHLY, 0, true),
      annual: p(process.env.COMMERCE_PRICE_WOOCOMMERCE_HUB_ANNUAL, 0, true),
    },
    "shopify-sync": {
      monthly: p(process.env.COMMERCE_PRICE_SHOPIFY_MONTHLY, 0, true),
      annual: p(process.env.COMMERCE_PRICE_SHOPIFY_ANNUAL, 0, true),
    },
    "smart-dashboard": {
      monthly: p(process.env.COMMERCE_PRICE_SMART_DASHBOARD_MONTHLY, 0, true),
      annual: p(process.env.COMMERCE_PRICE_SMART_DASHBOARD_ANNUAL, 0, true),
    },
    "smart-reports": {
      monthly: p(process.env.COMMERCE_PRICE_SMART_REPORTS_MONTHLY, 0, true),
      annual: p(process.env.COMMERCE_PRICE_SMART_REPORTS_ANNUAL, 0, true),
    },
    "ai-business-advisor": {
      monthly: p(process.env.COMMERCE_PRICE_AI_BUSINESS_ADVISOR_MONTHLY, 0, true),
      annual: p(process.env.COMMERCE_PRICE_AI_BUSINESS_ADVISOR_ANNUAL, 0, true),
    },

    // Wave 1 HRMS, Security & Operations Add-ons
    "time-tracker": {
      monthly: p(process.env.COMMERCE_PRICE_TIME_TRACKER_MONTHLY, 79),
      annual: p(process.env.COMMERCE_PRICE_TIME_TRACKER_ANNUAL, 790),
    },
    "recruitment-ats": {
      monthly: p(process.env.COMMERCE_PRICE_RECRUITMENT_ATS_MONTHLY, 199),
      annual: p(process.env.COMMERCE_PRICE_RECRUITMENT_ATS_ANNUAL, 1990),
    },
    "support": {
      monthly: p(process.env.COMMERCE_PRICE_SUPPORT_MONTHLY, 79),
      annual: p(process.env.COMMERCE_PRICE_SUPPORT_ANNUAL, 790),
    },
    "activity-logs": {
      monthly: p(process.env.COMMERCE_PRICE_ACTIVITY_LOGS_MONTHLY, 0, true),
      annual: p(process.env.COMMERCE_PRICE_ACTIVITY_LOGS_ANNUAL, 0, true),
    },
    "notice-board": {
      monthly: p(process.env.COMMERCE_PRICE_NOTICE_BOARD_MONTHLY, 0, true),
      annual: p(process.env.COMMERCE_PRICE_NOTICE_BOARD_ANNUAL, 0, true),
    },
    "documents": {
      monthly: p(process.env.COMMERCE_PRICE_DOCUMENTS_MONTHLY, 99),
      annual: p(process.env.COMMERCE_PRICE_DOCUMENTS_ANNUAL, 990),
    },
    "two-factor-auth": {
      monthly: p(process.env.COMMERCE_PRICE_TWO_FACTOR_AUTH_MONTHLY, 0, true),
      annual: p(process.env.COMMERCE_PRICE_TWO_FACTOR_AUTH_ANNUAL, 0, true),
    },
    "backup-restore": {
      monthly: p(process.env.COMMERCE_PRICE_BACKUP_RESTORE_MONTHLY, 0, true),
      annual: p(process.env.COMMERCE_PRICE_BACKUP_RESTORE_ANNUAL, 0, true),
    },
    "internal-reminders": {
      monthly: p(process.env.COMMERCE_PRICE_INTERNAL_REMINDERS_MONTHLY, 0, true),
      annual: p(process.env.COMMERCE_PRICE_INTERNAL_REMINDERS_ANNUAL, 0, true),
    },
    "public-api": {
      monthly: p(process.env.COMMERCE_PRICE_PUBLIC_API_MONTHLY, 0, true),
      annual: p(process.env.COMMERCE_PRICE_PUBLIC_API_ANNUAL, 0, true),
    },
    "outbound-webhooks": {
      monthly: p(process.env.COMMERCE_PRICE_OUTBOUND_WEBHOOKS_MONTHLY, 0, true),
      annual: p(process.env.COMMERCE_PRICE_OUTBOUND_WEBHOOKS_ANNUAL, 0, true),
    },
    "sms-gateway": {
      monthly: p(process.env.COMMERCE_PRICE_SMS_GATEWAY_MONTHLY, 0, true),
      annual: p(process.env.COMMERCE_PRICE_SMS_GATEWAY_ANNUAL, 0, true),
    },
    "custom-fields": {
      monthly: p(process.env.COMMERCE_PRICE_CUSTOM_FIELDS_MONTHLY, 0, true),
      annual: p(process.env.COMMERCE_PRICE_CUSTOM_FIELDS_ANNUAL, 0, true),
    },
    "training": {
      monthly: p(process.env.COMMERCE_PRICE_TRAINING_MONTHLY, 119),
      annual: p(process.env.COMMERCE_PRICE_TRAINING_ANNUAL, 1190),
    },

    // Wave 2 Learning, Strategy & AI Add-ons
    "learning-lms": {
      monthly: p(process.env.COMMERCE_PRICE_LEARNING_LMS_MONTHLY, 149),
      annual: p(process.env.COMMERCE_PRICE_LEARNING_LMS_ANNUAL, 1490),
    },
    "team-workload": {
      monthly: p(process.env.COMMERCE_PRICE_TEAM_WORKLOAD_MONTHLY, 99),
      annual: p(process.env.COMMERCE_PRICE_TEAM_WORKLOAD_ANNUAL, 990),
    },
    "contracts": {
      monthly: p(process.env.COMMERCE_PRICE_CONTRACTS_MONTHLY, 89),
      annual: p(process.env.COMMERCE_PRICE_CONTRACTS_ANNUAL, 890),
    },
    "budget-planner": {
      monthly: p(process.env.COMMERCE_PRICE_BUDGET_PLANNER_MONTHLY, 99),
      annual: p(process.env.COMMERCE_PRICE_BUDGET_PLANNER_ANNUAL, 990),
    },
    "quickbooks": {
      monthly: p(process.env.COMMERCE_PRICE_QUICKBOOKS_MONTHLY, 149),
      annual: p(process.env.COMMERCE_PRICE_QUICKBOOKS_ANNUAL, 1490),
    },
    "xero": {
      monthly: p(process.env.COMMERCE_PRICE_XERO_MONTHLY, 149),
      annual: p(process.env.COMMERCE_PRICE_XERO_ANNUAL, 1490),
    },
    "razorpay-gateway": {
      monthly: p(process.env.COMMERCE_PRICE_RAZORPAY_GATEWAY_MONTHLY, 0, true),
      annual: p(process.env.COMMERCE_PRICE_RAZORPAY_GATEWAY_ANNUAL, 0, true),
    },
    "suggestion-box": {
      monthly: p(process.env.COMMERCE_PRICE_SUGGESTION_BOX_MONTHLY, 49),
      annual: p(process.env.COMMERCE_PRICE_SUGGESTION_BOX_ANNUAL, 490),
    },
    "ai-document": {
      monthly: p(process.env.COMMERCE_PRICE_AI_DOCUMENT_MONTHLY, 149),
      annual: p(process.env.COMMERCE_PRICE_AI_DOCUMENT_ANNUAL, 1490),
    },
    "ai-assistant": {
      monthly: p(process.env.COMMERCE_PRICE_AI_ASSISTANT_MONTHLY, 99),
      annual: p(process.env.COMMERCE_PRICE_AI_ASSISTANT_ANNUAL, 990),
    },

    // Wave 3 Strategy & Regional Add-ons
    "swot": {
      monthly: p(process.env.COMMERCE_PRICE_SWOT_MONTHLY, 79),
      annual: p(process.env.COMMERCE_PRICE_SWOT_ANNUAL, 790),
    },
    "pestel": {
      monthly: p(process.env.COMMERCE_PRICE_PESTEL_MONTHLY, 79),
      annual: p(process.env.COMMERCE_PRICE_PESTEL_ANNUAL, 790),
    },
    "porters-five-forces": {
      monthly: p(process.env.COMMERCE_PRICE_PORTERS_MONTHLY, 69),
      annual: p(process.env.COMMERCE_PRICE_PORTERS_ANNUAL, 690),
    },
    "pest": {
      monthly: p(process.env.COMMERCE_PRICE_PEST_MONTHLY, 59),
      annual: p(process.env.COMMERCE_PRICE_PEST_ANNUAL, 590),
    },
    "mckinsey-7s": {
      monthly: p(process.env.COMMERCE_PRICE_MCKINSEY_MONTHLY, 69),
      annual: p(process.env.COMMERCE_PRICE_MCKINSEY_ANNUAL, 690),
    },
    "business-model": {
      monthly: p(process.env.COMMERCE_PRICE_BUSINESS_MODEL_MONTHLY, 89),
      annual: p(process.env.COMMERCE_PRICE_BUSINESS_MODEL_ANNUAL, 890),
    },
    "business-plan": {
      monthly: p(process.env.COMMERCE_PRICE_BUSINESS_PLAN_MONTHLY, 99),
      annual: p(process.env.COMMERCE_PRICE_BUSINESS_PLAN_ANNUAL, 990),
    },
    "marketing-plan": {
      monthly: p(process.env.COMMERCE_PRICE_MARKETING_PLAN_MONTHLY, 89),
      annual: p(process.env.COMMERCE_PRICE_MARKETING_PLAN_ANNUAL, 890),
    },
    "zatca": {
      monthly: p(process.env.COMMERCE_PRICE_ZATCA_MONTHLY, 99),
      annual: p(process.env.COMMERCE_PRICE_ZATCA_ANNUAL, 990),
    },
    "einvoice-eu": {
      monthly: p(process.env.COMMERCE_PRICE_EINVOICE_EU_MONTHLY, 99),
      annual: p(process.env.COMMERCE_PRICE_EINVOICE_EU_ANNUAL, 990),
    },
    "plaid": {
      monthly: p(process.env.COMMERCE_PRICE_PLAID_MONTHLY, 129),
      annual: p(process.env.COMMERCE_PRICE_PLAID_ANNUAL, 1290),
    },
    "financial-goal": {
      monthly: p(process.env.COMMERCE_PRICE_FINANCIAL_GOAL_MONTHLY, 49),
      annual: p(process.env.COMMERCE_PRICE_FINANCIAL_GOAL_ANNUAL, 490),
    },
  };

  return {
    tax: overrides?.tax ? { ...DEFAULT_TAX_CONFIG, ...overrides.tax } : { ...DEFAULT_TAX_CONFIG },
    seatBands: overrides?.seatBands ? [...overrides.seatBands] : [...DEFAULT_SEAT_BANDS],
    products: overrides?.products ? { ...productPrices, ...overrides.products } : productPrices,
    allowUnapprovedDefaults: allowDefaults,
  };
}

let activeConfig: CommercePricingConfig = buildCommercePricingConfig();

/**
 * Retrieves active commerce pricing configuration.
 */
export function getCommercePricingConfig(): CommercePricingConfig {
  return activeConfig;
}

/**
 * Updates commerce pricing configuration dynamically (for runtime adjustments or tests).
 */
export function setCommercePricingConfig(overrides: Partial<CommercePricingConfig>): void {
  activeConfig = buildCommercePricingConfig(overrides);
}

/**
 * Resets configuration to initial environment state.
 */
export function resetCommercePricingConfig(): void {
  activeConfig = buildCommercePricingConfig();
}
