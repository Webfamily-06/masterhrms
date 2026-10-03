/**
 * Central Billing Duration, Date Calculation, and Subscription Renewal Engine
 * 
 * Enforces authoritative rules:
 * 1. Subscription duration is calculated strictly from confirmed billing start date (NOT calendar month boundaries).
 * 2. Month-end rule: If target month has fewer days than source day (e.g. Jan 31 + 1 mo -> Feb 28/29),
 *    clamps to the last valid day of that target month.
 * 3. Supported billing durations:
 *    - "1_month" / "monthly": 1 calendar month
 *    - "3_months" / "quarterly": 3 calendar months
 *    - "6_months" / "semi_annual": 6 calendar months
 *    - "1_year" / "annual" / "yearly": 12 calendar months
 * 4. Remaining days calculated via actual millisecond difference to expiry timestamp.
 * 5. Early renewal retains remaining paid period (extends from currentPeriodEnd).
 * 6. Expired renewal starts fresh from current time.
 */

export type BillingDuration = "1_month" | "3_months" | "6_months" | "1_year";

export interface DurationDetails {
  durationKey: BillingDuration;
  monthsCount: number;
  label: string;
}

/**
 * Single Source of Truth: Active customer-facing billing durations under the current pricing model.
 * 3 Months and 6 Months are deprecated/legacy and must NOT be offered for new subscriptions/coupons.
 */
export const ACTIVE_BILLING_DURATIONS: { key: "1_month" | "1_year"; label: string; monthsCount: number }[] = [
  { key: "1_month", label: "1 Month", monthsCount: 1 },
  { key: "1_year", label: "1 Year", monthsCount: 12 },
];

/**
 * Full historical list preserved for legacy billing subscriptions and historical coupons.
 */
export const HISTORICAL_BILLING_DURATIONS: { key: BillingDuration; label: string; monthsCount: number; isLegacy?: boolean }[] = [
  { key: "1_month", label: "1 Month", monthsCount: 1 },
  { key: "3_months", label: "3 Months", monthsCount: 3, isLegacy: true },
  { key: "6_months", label: "6 Months", monthsCount: 6, isLegacy: true },
  { key: "1_year", label: "1 Year", monthsCount: 12 },
];

export const DURATION_MAP: Record<string, DurationDetails> = {
  "1_month": { durationKey: "1_month", monthsCount: 1, label: "1 Month" },
  "monthly": { durationKey: "1_month", monthsCount: 1, label: "1 Month" },
  "3_months": { durationKey: "3_months", monthsCount: 3, label: "3 Months" },
  "quarterly": { durationKey: "3_months", monthsCount: 3, label: "3 Months" },
  "6_months": { durationKey: "6_months", monthsCount: 6, label: "6 Months" },
  "semi_annual": { durationKey: "6_months", monthsCount: 6, label: "6 Months" },
  "half_yearly": { durationKey: "6_months", monthsCount: 6, label: "6 Months" },
  "1_year": { durationKey: "1_year", monthsCount: 12, label: "1 Year" },
  "annual": { durationKey: "1_year", monthsCount: 12, label: "1 Year" },
  "yearly": { durationKey: "1_year", monthsCount: 12, label: "1 Year" },
};

/**
 * Normalizes an expiry date to the end of that day in Asia/Kolkata (23:59:59.999 IST = 18:29:59.999 UTC)
 * so that a coupon with date 2026-10-03 remains valid through the entire business date in India.
 */
export function normalizeExpiryDateKolkata(dateInput?: string | Date | null): Date | null {
  if (!dateInput) return null;

  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;
    // Format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split("-").map(Number);
      // 23:59:59.999 in IST (+05:30) is 18:29:59.999 UTC
      return new Date(Date.UTC(year, month - 1, day, 18, 29, 59, 999));
    }
  }

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  // If time is exactly midnight UTC (common when YYYY-MM-DD is parsed as UTC Date)
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 18, 29, 59, 999));
  }

  return d;
}

/**
 * Normalizes a start date to the start of that day in Asia/Kolkata (00:00:00.000 IST = 18:30:00.000 UTC prev day).
 */
export function normalizeStartDateKolkata(dateInput?: string | Date | null): Date | null {
  if (!dateInput) return null;

  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split("-").map(Number);
      return new Date(Date.UTC(year, month - 1, day - 1, 18, 30, 0, 0));
    }
  }

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  return d;
}

/**
 * Normalizes duration string to standard key: "1_month" | "3_months" | "6_months" | "1_year"
 */
export function normalizeBillingDuration(input?: string | null): BillingDuration {
  if (!input || typeof input !== "string") return "1_month";
  const lower = String(input).toLowerCase().trim().replace(/-/g, "_").replace(/\s+/g, "_");
  if (DURATION_MAP[lower]) {
    return DURATION_MAP[lower].durationKey;
  }
  return "1_month";
}

/**
 * Calculates end date from start date by adding N calendar months with authoritative month-end clamping.
 * Example:
 * Jan 31 + 1 month -> Feb 28 (or Feb 29 in leap year)
 * Mar 31 + 1 month -> Apr 30
 * Oct 03 + 1 month -> Nov 03
 * Oct 03 + 3 months -> Jan 03 (next year)
 * Oct 03 + 6 months -> Apr 03 (next year)
 * Oct 03 + 12 months -> Oct 03 (next year)
 */
export function addBillingMonths(startDate: Date, monthsToAdd: number): Date {
  const date = new Date(startDate.getTime());
  const originalDay = date.getUTCDate();
  const currentMonth = date.getUTCMonth();
  const currentYear = date.getUTCFullYear();

  // Target year & month calculation
  const totalMonths = currentMonth + monthsToAdd;
  const targetYear = currentYear + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;

  // Number of days in target month (0th day of next month gives last day of target month)
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();

  // Clamp day if original day exceeds target month's maximum (e.g. 31st -> 28th/30th)
  const targetDay = Math.min(originalDay, daysInTargetMonth);

  return new Date(Date.UTC(
    targetYear,
    targetMonth,
    targetDay,
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  ));
}

export function calculateTrialEndDate(arg1: Date | number, arg2?: Date | number): Date {
  let startDate: Date;
  let trialDays: number;
  if (typeof arg1 === "number") {
    trialDays = arg1;
    startDate = arg2 instanceof Date ? arg2 : new Date();
  } else {
    startDate = arg1 instanceof Date ? arg1 : new Date();
    trialDays = typeof arg2 === "number" ? arg2 : 3;
  }
  return new Date(startDate.getTime() + trialDays * 24 * 60 * 60 * 1000);
}

/**
 * Validates billable user count for Custom Per-User plans.
 * Rules:
 * - Must be an integer
 * - Minimum: 1
 * - Maximum: 99,999
 * - Rejects 0, negative, fractional, and above 99,999 without silent clamping.
 */
export function validateBillableUserCount(count: any): { valid: boolean; userCount: number; error?: string } {
  if (count === null || count === undefined || count === "") {
    return { valid: false, userCount: 0, error: "User count is required." };
  }

  const num = Number(count);
  if (isNaN(num)) {
    return { valid: false, userCount: 0, error: "User count must be a valid number." };
  }

  if (!Number.isInteger(num)) {
    return { valid: false, userCount: num, error: "User count must be a whole integer (fractional numbers not allowed)." };
  }

  if (num < 1) {
    return { valid: false, userCount: num, error: "User count must be at least 1." };
  }

  if (num > 99999) {
    return { valid: false, userCount: num, error: "User count cannot exceed 99,999." };
  }

  return { valid: true, userCount: num };
}

export interface DetailedPlanPricing {
  durationKey: BillingDuration;
  planType: "standard" | "custom";
  pricingModel: "fixed" | "per_user";
  userCount?: number;
  unitPrice: number;
  unitPriceOriginal?: number | null;
  sellingPrice: number;
  originalPrice: number;
  discountAmount: number;
  discountPercentage: number;
  hasDiscount: boolean;
  amountInPaise: number;
}

/**
 * Authoritative pricing calculation for Standard and Custom (Fixed / Per-User) plans.
 * Recalculated server-side and never trusts client-supplied sums.
 */
export function calculatePlanPricing(
  plan: {
    planType?: string | null;
    pricingModel?: string | null;
    priceMonthly?: any;
    priceMonthlyOriginal?: any;
    priceAnnual?: any;
    priceAnnualOriginal?: any;
    pricePerUser?: any;
    pricePerUserOriginal?: any;
    billableUsers?: any;
    durationPrices?: any;
  },
  durationInput: string = "1_month",
  userCountInput?: any
): DetailedPlanPricing {
  const durationKey = normalizeBillingDuration(durationInput);
  const planType = (plan.planType === "custom" ? "custom" : "standard") as "standard" | "custom";
  const pricingModel = (plan.pricingModel === "per_user" ? "per_user" : "fixed") as "fixed" | "per_user";

  if (pricingModel === "per_user") {
    // Validate user count
    const resolvedCount = userCountInput !== undefined && userCountInput !== null
      ? userCountInput
      : (plan.billableUsers || 1);
    
    const countValidation = validateBillableUserCount(resolvedCount);
    if (!countValidation.valid) {
      throw new Error(countValidation.error || "Invalid user count for per-user plan.");
    }

    const userCount = countValidation.userCount;
    const unitPrice = Math.max(0, Number(plan.pricePerUser || 0));
    const unitPriceOriginal = plan.pricePerUserOriginal !== null && plan.pricePerUserOriginal !== undefined
      ? Math.max(0, Number(plan.pricePerUserOriginal))
      : null;

    const monthsMultiplier = durationKey === "1_year" ? 12 : 1;
    // For 1 year, apply configured discount (or default 20% savings on annual commitment)
    const annualDiscountFactor = durationKey === "1_year" ? 0.80 : 1.0;

    const sellingPrice = Math.round(unitPrice * userCount * monthsMultiplier * annualDiscountFactor * 100) / 100;
    const baseOriginalUnit = unitPriceOriginal !== null ? unitPriceOriginal : unitPrice;
    const originalPrice = Math.round(baseOriginalUnit * userCount * monthsMultiplier * 100) / 100;

    const discountAmount = originalPrice > sellingPrice ? Math.round((originalPrice - sellingPrice) * 100) / 100 : 0;
    const discountPercentage = originalPrice > sellingPrice && originalPrice > 0
      ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
      : 0;

    return {
      durationKey,
      planType,
      pricingModel,
      userCount,
      unitPrice,
      unitPriceOriginal,
      sellingPrice,
      originalPrice,
      discountAmount,
      discountPercentage,
      hasDiscount: discountAmount > 0,
      amountInPaise: toRazorpayPaise(sellingPrice),
    };
  }

  // Standard or Custom Fixed Price plan
  const basePriceResolution = resolvePlanPriceForDuration(plan, durationKey);
  const sellingPrice = basePriceResolution.price;

  let originalPrice = sellingPrice;
  if (durationKey === "1_month") {
    if (plan.priceMonthlyOriginal !== null && plan.priceMonthlyOriginal !== undefined) {
      originalPrice = Number(plan.priceMonthlyOriginal);
    }
  } else if (durationKey === "1_year") {
    if (plan.priceAnnualOriginal !== null && plan.priceAnnualOriginal !== undefined) {
      originalPrice = Number(plan.priceAnnualOriginal);
    } else if (plan.priceMonthlyOriginal !== null && plan.priceMonthlyOriginal !== undefined) {
      originalPrice = Number(plan.priceMonthlyOriginal) * 12;
    }
  }

  const discountAmount = originalPrice > sellingPrice ? Math.round((originalPrice - sellingPrice) * 100) / 100 : 0;
  const discountPercentage = originalPrice > sellingPrice && originalPrice > 0
    ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
    : 0;

  return {
    durationKey,
    planType,
    pricingModel,
    unitPrice: sellingPrice,
    unitPriceOriginal: originalPrice,
    sellingPrice,
    originalPrice,
    discountAmount,
    discountPercentage,
    hasDiscount: discountAmount > 0,
    amountInPaise: toRazorpayPaise(sellingPrice),
  };
}

/**
 * Calculates the subscription period based on billing start date and duration.
 */
export function calculateSubscriptionPeriod(
  arg1: string | Date,
  arg2?: Date | string | null,
  arg3?: Date | null
): {
  periodStart: Date;
  periodEnd: Date;
  durationKey: BillingDuration;
  monthsCount: number;
  interval: "month";
  intervalCount: number;
} {
  let startDate: Date;
  let durationInput: string;
  let existingPeriodEnd: Date | null = arg3 || null;

  if (typeof arg1 === "string") {
    durationInput = arg1;
    startDate = (arg2 instanceof Date) ? arg2 : new Date();
  } else {
    startDate = arg1 || new Date();
    durationInput = (typeof arg2 === "string") ? arg2 : "1_month";
  }

  const durationKey = normalizeBillingDuration(durationInput);
  const monthsCount = DURATION_MAP[durationKey]?.monthsCount || 1;

  // Renewal rule:
  // If an existing subscription is still active and in the future, extend from existingPeriodEnd
  // Otherwise, start fresh from startDate
  let effectiveStart = startDate;
  if (existingPeriodEnd && new Date(existingPeriodEnd).getTime() > startDate.getTime()) {
    effectiveStart = new Date(existingPeriodEnd);
  }

  const periodEnd = addBillingMonths(effectiveStart, monthsCount);

  return {
    periodStart: effectiveStart,
    periodEnd,
    durationKey,
    monthsCount,
    interval: "month" as const,
    intervalCount: monthsCount,
  };
}

/**
 * Calculates remaining days until expiry based on actual UTC timestamps.
 */
export function calculateRemainingDays(expiresAt?: Date | string | null, fromTime: Date = new Date()): number {
  if (!expiresAt) return 0;
  const expiryDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  const diffMs = expiryDate.getTime() - fromTime.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Resolves the configured price for a plan for a given billing duration.
 * Priority:
 * 1. Plan.durationPrices JSON map (e.g. {"1_month": 199, "3_months": 549, "6_months": 999, "1_year": 1899})
 * 2. Dedicated column (priceMonthly, priceQuarterly, priceSemiAnnual, priceAnnual)
 * 3. Safe fallback if unconfigured: monthly price * monthsCount
 */
export function resolvePlanPriceForDuration(
  plan: {
    priceMonthly?: any;
    priceQuarterly?: any;
    priceSemiAnnual?: any;
    priceAnnual?: any;
    durationPrices?: any;
  },
  durationInput: string
): {
  durationKey: BillingDuration;
  price: number;
  monthlyEquivalent: number;
  isAvailable: boolean;
} {
  const durationKey = normalizeBillingDuration(durationInput);
  const monthlyPrice = Number(plan.priceMonthly || 0);

  // Check durationPrices JSON
  let configuredPrice: number | null = null;
  if (plan.durationPrices && typeof plan.durationPrices === "object") {
    const rawVal = plan.durationPrices[durationKey];
    if (rawVal !== undefined && rawVal !== null && !isNaN(Number(rawVal))) {
      configuredPrice = Number(rawVal);
    }
  }

  // Check column fallbacks
  if (configuredPrice === null) {
    if (durationKey === "1_month") {
      configuredPrice = monthlyPrice;
    } else if (durationKey === "3_months") {
      configuredPrice = plan.priceQuarterly !== null && plan.priceQuarterly !== undefined
        ? Number(plan.priceQuarterly)
        : Math.round(monthlyPrice * 3 * 0.95); // 5% discount default if unconfigured
    } else if (durationKey === "6_months") {
      configuredPrice = plan.priceSemiAnnual !== null && plan.priceSemiAnnual !== undefined
        ? Number(plan.priceSemiAnnual)
        : Math.round(monthlyPrice * 6 * 0.90); // 10% discount default if unconfigured
    } else if (durationKey === "1_year") {
      configuredPrice = plan.priceAnnual !== null && plan.priceAnnual !== undefined && Number(plan.priceAnnual) > 0
        ? Number(plan.priceAnnual)
        : Math.round(monthlyPrice * 12 * 0.80); // 20% discount default if unconfigured
    }
  }

  const finalPrice = Math.max(0, configuredPrice ?? monthlyPrice);
  const monthsCount = DURATION_MAP[durationKey]?.monthsCount || 1;
  const monthlyEquivalent = Math.round((finalPrice / monthsCount) * 100) / 100;

  return {
    durationKey,
    price: finalPrice,
    monthlyEquivalent,
    isAvailable: finalPrice >= 0,
  };
}

/**
 * Converts INR rupees to smallest integer currency units (paise) for Razorpay API.
 * Avoids floating-point artifacts by using Math.round.
 */
export function toRazorpayPaise(rupees: number): number {
  return Math.round(Number(rupees) * 100);
}
