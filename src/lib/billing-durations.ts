/**
 * Canonical Billing Durations and Asia/Kolkata Timezone Utilities
 * Single source of truth across Frontend and Backend.
 */

export type BillingDurationKey = "1_month" | "1_year";
export type LegacyBillingDurationKey = "3_months" | "6_months";
export type AllBillingDurationKey = BillingDurationKey | LegacyBillingDurationKey;

export interface BillingDurationOption {
  key: string;
  label: string;
  monthsCount: number;
  isLegacy?: boolean;
}

/**
 * Supported customer-facing billing durations under the current pricing model.
 */
export const ACTIVE_BILLING_DURATIONS: BillingDurationOption[] = [
  { key: "1_month", label: "1 Month", monthsCount: 1 },
  { key: "1_year", label: "1 Year", monthsCount: 12 },
];

/**
 * Historical billing durations preserved for reading/editing legacy subscriptions & coupons.
 */
export const HISTORICAL_BILLING_DURATIONS: BillingDurationOption[] = [
  { key: "1_month", label: "1 Month", monthsCount: 1 },
  { key: "3_months", label: "3 Months", monthsCount: 3, isLegacy: true },
  { key: "6_months", label: "6 Months", monthsCount: 6, isLegacy: true },
  { key: "1_year", label: "1 Year", monthsCount: 12 },
];

export function getBillingDurationLabel(key: string): string {
  switch (key) {
    case "1_month":
    case "monthly":
      return "1 Month";
    case "3_months":
    case "quarterly":
      return "3 Months (Legacy)";
    case "6_months":
    case "semi_annual":
      return "6 Months (Legacy)";
    case "1_year":
    case "annual":
    case "yearly":
      return "1 Year";
    default:
      return key.replace(/_/g, " ").toUpperCase();
  }
}

/**
 * Formats a Date / ISO string into YYYY-MM-DD in the Asia/Kolkata timezone
 * for HTML `<input type="date" />`.
 */
export function toKolkataDateInputString(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  // en-CA outputs YYYY-MM-DD format
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Formats a Date / ISO string for natural UI display in the configured timezone (e.g., "3 Oct 2026").
 * Defaults to Asia/Kolkata without displaying timezone name in the label.
 */
export function formatDisplayDate(dateInput?: string | Date | null, timeZone: string = "Asia/Kolkata"): string {
  if (!dateInput) return "No Expiry";
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return "Invalid Date";

  return d.toLocaleDateString("en-IN", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Backward compatibility alias for formatDisplayDate.
 */
export const toKolkataDisplayDate = formatDisplayDate;

/**
 * Checks whether an expiry timestamp has elapsed compared to current time.
 */
export function isCouponExpired(expiresAt?: string | Date | null): boolean {
  if (!expiresAt) return false;
  const expiryDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (isNaN(expiryDate.getTime())) return false;
  return expiryDate.getTime() < Date.now();
}

export type CouponDisplayStatus = "active" | "inactive" | "expired";

/**
 * Derives presentation status distinguishing ACTIVE, INACTIVE, and EXPIRED.
 * Does not overwrite or corrupt persisted database status.
 */
export function getCouponDisplayStatus(coupon: {
  status: string;
  expiresAt?: string | Date | null;
}): CouponDisplayStatus {
  const expired = isCouponExpired(coupon.expiresAt);
  if (expired) return "expired";
  if (coupon.status === "active") return "active";
  return "inactive";
}
