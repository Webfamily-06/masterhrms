/**
 * MASTERHRMS — Phase A3.2: Authoritative Server-Side Cart & Pricing Engine
 *
 * Enforces:
 * 1. Zero Trust in Client Input: Client-supplied prices, totals, taxes, and discounts are strictly ignored.
 * 2. Decimal-Safe Math: Uses Decimal.js with ROUND_HALF_UP precision.
 * 3. Seat-Band Boundaries: Scales employee overages according to active workforce bands.
 * 4. Multi-Duration: Supports active 1_month and 1_year billing cycles.
 * 5. GST Engine: Authoritative Place-of-Supply (Intra-state CGST+SGST vs Inter-state IGST vs Export 0%).
 * 6. Tenant-Isolated Coupons: Integrates with coupon.service.ts preventing cross-tenant abuse.
 * 7. Zero Mutation: Calculations create zero invoices, subscriptions, or gateway charges.
 */

import Decimal from "decimal.js";
import crypto from "crypto";
import {
  getCommercePricingConfig,
  SeatBandTier,
  TaxConfig,
} from "../config/commerce-pricing.config";
import { UnifiedCatalogService, CatalogProductDefinition } from "./unified-catalog.service";
import { validateCoupon } from "./coupon.service";
import { CompanyProfileService } from "./company-profile/company-profile.service";
import { DynamicPricingService } from "./dynamic-pricing.service";

// Set global Decimal rounding to ROUND_HALF_UP (standard financial rounding)
Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

export interface CartItemInput {
  productSlug: string;
  billingInterval?: "1_month" | "1_year";
  quantity?: number;
  seats?: number;
  // Intentionally ignored client fields (security honeypots)
  price?: any;
  unitPrice?: any;
  discount?: any;
  total?: any;
}

export interface TaxDetailsInput {
  gstin?: string | null;
  stateCode?: string | null;
  country?: string | null;
}

export interface CalculateCartParams {
  items: CartItemInput[];
  couponCode?: string | null;
  tenantId?: string | null;
  taxDetails?: TaxDetailsInput | null;
  // Security honeypot: client must not dictate grand total
  clientTotal?: any;
  clientTax?: any;
}

export interface CalculatedLineItem {
  id: string;
  productSlug: string;
  productName: string;
  productType: string;
  targetEngine: string;
  billingInterval: "1_month" | "1_year";
  quantity: number;
  seats?: number;
  includedSeats?: number;
  excessSeats?: number;
  baseUnitPrice: number;
  overageUnitPrice?: number;
  overageAmount: number;
  lineSubtotal: number;
}

export interface TaxLine {
  type: "CGST" | "SGST" | "IGST";
  rate: number;
  amount: number;
}

export interface CartCalculationResult {
  success: boolean;
  currency: string;
  lineItems: CalculatedLineItem[];
  subtotal: number;
  discountAmount: number;
  coupon?: {
    code: string;
    discountType: string;
    discountValue: number;
    description?: string;
  } | null;
  taxableAmount: number;
  taxes: TaxLine[];
  totalTax: number;
  totalAmount: number;
  amountInPaise: number;
  taxJurisdiction: {
    platformState: string;
    customerState: string;
    isInterState: boolean;
    isExport: boolean;
  };
  snapshot: {
    snapshotId: string;
    calculatedAt: string;
    currency: string;
    subtotal: number;
    discountAmount: number;
    taxableAmount: number;
    totalTax: number;
    totalAmount: number;
    amountInPaise: number;
    lineItems: CalculatedLineItem[];
    taxes: TaxLine[];
    couponCode?: string | null;
  };
}

const STATE_CODE_MAP: Record<string, string> = {
  "HR": "06", "HARYANA": "06",
  "DL": "07", "DELHI": "07",
  "KA": "29", "KARNATAKA": "29",
  "MH": "27", "MAHARASHTRA": "27",
  "TN": "33", "TAMIL NADU": "33", "TAMILNADU": "33",
  "TS": "36", "TG": "36", "TELANGANA": "36",
  "AP": "37", "ANDHRA PRADESH": "37",
  "WB": "19", "WEST BENGAL": "19",
  "GJ": "24", "GUJARAT": "24",
  "UP": "09", "UTTAR PRADESH": "09",
  "RJ": "08", "RAJASTHAN": "08",
  "KL": "32", "KERALA": "32",
  "MP": "23", "MADHYA PRADESH": "23",
  "PB": "03", "PUNJAB": "03",
  "CH": "04", "CHANDIGARH": "04",
  "GA": "30", "GOA": "30",
  "OR": "21", "ODISHA": "21",
};

export class CartCalculatorService {
  /**
   * Resolves 2-digit Indian GST state code from inputs or tenant profile.
   */
  public static async resolveCustomerStateCode(
    taxDetails?: TaxDetailsInput | null,
    tenantId?: string | null
  ): Promise<{ stateCode: string; isExport: boolean }> {
    // 1. Check Country for Export treatment
    const country = (taxDetails?.country || "").trim().toLowerCase();
    if (country && country !== "india" && country !== "in" && country !== "ind") {
      return { stateCode: "EXPORT", isExport: true };
    }

    // 2. Check GSTIN prefix (First 2 digits)
    if (taxDetails?.gstin && typeof taxDetails.gstin === "string") {
      const cleanGstin = taxDetails.gstin.trim().toUpperCase();
      const prefix = cleanGstin.slice(0, 2);
      if (/^\d{2}$/.test(prefix)) {
        return { stateCode: prefix, isExport: false };
      }
    }

    // 3. Check direct stateCode input
    if (taxDetails?.stateCode && typeof taxDetails.stateCode === "string") {
      const cleanState = taxDetails.stateCode.trim().toUpperCase();
      if (/^\d{2}$/.test(cleanState)) {
        return { stateCode: cleanState, isExport: false };
      }
      if (STATE_CODE_MAP[cleanState]) {
        return { stateCode: STATE_CODE_MAP[cleanState], isExport: false };
      }
    }

    // 4. Fallback to Tenant Identity if available
    if (tenantId) {
      try {
        const identity = await CompanyProfileService.resolveTenantCompanyIdentity(tenantId);
        if (identity?.primaryGst?.stateCode) {
          return { stateCode: identity.primaryGst.stateCode, isExport: false };
        }
        if (identity?.primaryGst?.gstin) {
          const gstinPrefix = identity.primaryGst.gstin.slice(0, 2);
          if (/^\d{2}$/.test(gstinPrefix)) {
            return { stateCode: gstinPrefix, isExport: false };
          }
        }
        if (identity?.registeredOffice?.stateCode) {
          const sc = identity.registeredOffice.stateCode.trim().toUpperCase();
          if (/^\d{2}$/.test(sc)) return { stateCode: sc, isExport: false };
          if (STATE_CODE_MAP[sc]) return { stateCode: STATE_CODE_MAP[sc], isExport: false };
        }
      } catch (err) {
        // Non-fatal, use default
      }
    }

    // Default domestic Indian state: Inter-state (e.g. "29" Karnataka)
    return { stateCode: "29", isExport: false };
  }

  /**
   * Authoritative calculation for cart items, seat bands, coupons, and GST.
   */
  public static async calculate(params: CalculateCartParams): Promise<CartCalculationResult> {
    if (!params || !params.items || !Array.isArray(params.items) || params.items.length === 0) {
      throw new Error("Cart must contain at least one item.");
    }

    if (params.items.length > 20) {
      throw new Error("Cart exceeds maximum limit of 20 items.");
    }

    const config = getCommercePricingConfig();
    const seenProductSlugs = new Set<string>();
    let basePlanCount = 0;

    const calculatedLines: CalculatedLineItem[] = [];
    let subtotal = new Decimal(0);

    for (const item of params.items) {
      if (!item.productSlug || typeof item.productSlug !== "string") {
        throw new Error("Each cart item must have a valid productSlug.");
      }

      const slug = item.productSlug.trim().toLowerCase();
      if (seenProductSlugs.has(slug)) {
        throw new Error(`Duplicate item '${slug}' in cart. Update item quantity instead.`);
      }
      seenProductSlugs.add(slug);

      // Validate Product in Catalog
      const product: CatalogProductDefinition | null = await UnifiedCatalogService.getProductBySlug(slug);
      if (!product || product.status !== "ACTIVE") {
        throw new Error(`Product '${slug}' is not available or does not exist in catalog.`);
      }

      if (product.productType === "BASE_PLAN") {
        basePlanCount++;
        if (basePlanCount > 1) {
          throw new Error("A cart may only contain one base plan subscription.");
        }
      }

      // Validate Billing Interval
      const interval = item.billingInterval || "1_month";
      if (interval !== "1_month" && interval !== "1_year") {
        throw new Error(`Invalid billing interval '${interval}'. Supported intervals are '1_month' and '1_year'.`);
      }

      // Validate Quantity
      const rawQty = item.quantity !== undefined ? item.quantity : 1;
      const numQty = Number(rawQty);
      if (!Number.isInteger(numQty) || numQty < 1 || numQty > 99999) {
        throw new Error(`Invalid quantity '${rawQty}' for '${slug}'. Quantity must be a whole integer between 1 and 99,999.`);
      }

      // Resolve Price Configuration (OD-1 Dynamic & Configured Pricing)
      const dynamicPrice = await DynamicPricingService.resolveProductPricing(slug);
      const priceConfig = dynamicPrice || config.products[slug];
      if (!priceConfig) {
        throw new Error(`Price configuration missing for product '${slug}'. OD-1 pricing decision is required.`);
      }

      let lineAmount = new Decimal(0);
      let baseUnitPrice = new Decimal(0);
      let overageUnitPrice: number | undefined = undefined;
      let overageAmount = new Decimal(0);
      let resolvedSeats: number | undefined = undefined;
      let includedSeats: number | undefined = undefined;
      let excessSeats: number | undefined = undefined;

      const isValidPriceNumber = (val: any): val is number =>
        typeof val === "number" && !isNaN(val) && Number.isFinite(val) && val >= 0;

      if (slug === "custom-flex") {
        // Custom Per-User Plan
        const userPrice = priceConfig.pricePerUser;
        if (!isValidPriceNumber(userPrice) || userPrice <= 0) {
          throw new Error(`Per-user price for '${slug}' is not configured. OD-1 pricing decision is required.`);
        }

        const rawSeats = item.seats !== undefined ? item.seats : (item.quantity || 1);
        const seatCount = Number(rawSeats);
        if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > 99999) {
          throw new Error(`Invalid seat count '${rawSeats}' for per-user plan. Must be between 1 and 99,999.`);
        }

        resolvedSeats = seatCount;
        baseUnitPrice = new Decimal(userPrice);
        const months = interval === "1_year" ? 12 : 1;
        const annualDiscountFactor = interval === "1_year" ? 0.8 : 1.0;

        lineAmount = baseUnitPrice
          .times(seatCount)
          .times(months)
          .times(annualDiscountFactor)
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      } else if (product.productType === "BASE_PLAN" && priceConfig.seatBands && priceConfig.seatBands.length > 0) {
        // Base Plan with Seat Bands
        const planPrice = interval === "1_year" ? priceConfig.annual : priceConfig.monthly;
        if (!isValidPriceNumber(planPrice)) {
          throw new Error(`Price for '${slug}' (${interval}) is not configured. OD-1 pricing decision is required.`);
        }

        baseUnitPrice = new Decimal(planPrice);

        // Validate Seat Count
        const rawSeats = item.seats !== undefined ? item.seats : 1;
        const seatCount = Number(rawSeats);
        if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > 99999) {
          throw new Error(`Invalid employee seat count '${rawSeats}'. Must be an integer between 1 and 99,999.`);
        }
        resolvedSeats = seatCount;

        // Resolve matching seat band tier
        const matchingTier = priceConfig.seatBands.find(
          (b) => seatCount >= b.minSeats && seatCount <= b.maxSeats
        ) || priceConfig.seatBands[priceConfig.seatBands.length - 1];

        // Plan's base included seats and overage rates
        includedSeats = priceConfig.includedSeats !== undefined
          ? priceConfig.includedSeats
          : (matchingTier ? matchingTier.includedSeats : 25);

        const configuredOverage = interval === "1_year"
          ? priceConfig.overagePricePerSeatAnnual
          : priceConfig.overagePricePerSeatMonthly;

        const overageRate: number | null = (configuredOverage !== undefined && configuredOverage !== null)
          ? configuredOverage
          : (config.allowUnapprovedDefaults
              ? (interval === "1_year" ? (matchingTier?.overagePricePerSeatAnnual ?? 150) : (matchingTier?.overagePricePerSeatMonthly ?? 15))
              : null);

        if (seatCount > includedSeats) {
          if (!isValidPriceNumber(overageRate)) {
            throw new Error(`Seat overage price for '${slug}' (${interval}) is not configured. OD-1 pricing decision is required.`);
          }
          excessSeats = seatCount - includedSeats;
          overageUnitPrice = overageRate;
          overageAmount = new Decimal(excessSeats).times(overageRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        } else {
          excessSeats = 0;
          overageUnitPrice = isValidPriceNumber(overageRate) ? overageRate : undefined;
          overageAmount = new Decimal(0);
        }

        lineAmount = baseUnitPrice.plus(overageAmount).times(numQty).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      } else {
        // Standalone Product or Flat Add-On
        const unitPrice = interval === "1_year" ? priceConfig.annual : priceConfig.monthly;
        if (!isValidPriceNumber(unitPrice)) {
          throw new Error(`Price for '${slug}' (${interval}) is not configured. OD-1 pricing decision is required.`);
        }

        baseUnitPrice = new Decimal(unitPrice);
        lineAmount = baseUnitPrice.times(numQty).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      }

      subtotal = subtotal.plus(lineAmount);

      calculatedLines.push({
        id: `line_${slug}_${interval}`,
        productSlug: slug,
        productName: product.name,
        productType: product.productType,
        targetEngine: product.targetEngine,
        billingInterval: interval,
        quantity: numQty,
        seats: resolvedSeats,
        includedSeats,
        excessSeats,
        baseUnitPrice: baseUnitPrice.toNumber(),
        overageUnitPrice,
        overageAmount: overageAmount.toNumber(),
        lineSubtotal: lineAmount.toNumber(),
      });
    }

    // ─── Discount & Coupon Processing ──────────────────────────────────────────
    let discountAmount = new Decimal(0);
    let couponResult: any = null;

    if (params.couponCode && typeof params.couponCode === "string" && params.couponCode.trim()) {
      const cleanCode = params.couponCode.trim().toUpperCase();
      const primaryDuration = calculatedLines[0]?.billingInterval || "1_month";
      const primaryPlanId = calculatedLines.find((l) => l.targetEngine === "subscription")?.productSlug;

      const couponValidation = await validateCoupon({
        code: cleanCode,
        tenantId: params.tenantId || undefined,
        planId: primaryPlanId,
        duration: primaryDuration,
        purchaseAmount: subtotal.toNumber(),
      });

      if (!couponValidation.valid) {
        throw new Error(couponValidation.error || "Invalid coupon code.");
      }

      discountAmount = new Decimal(couponValidation.discountAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      discountAmount = Decimal.min(subtotal, discountAmount);
      couponResult = {
        code: cleanCode,
        discountType: couponValidation.coupon.discountType,
        discountValue: Number(couponValidation.coupon.discountValue),
        description: couponValidation.coupon.description || couponValidation.coupon.name,
      };
    }

    const taxableAmount = Decimal.max(0, subtotal.minus(discountAmount)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    // ─── Tax (GST) Calculation ─────────────────────────────────────────────────
    const { stateCode: customerState, isExport } = await this.resolveCustomerStateCode(
      params.taxDetails,
      params.tenantId
    );

    const taxes: TaxLine[] = [];
    let totalTax = new Decimal(0);

    if (isExport) {
      // 0% GST Export
      totalTax = new Decimal(0);
    } else if (customerState === config.tax.platformStateCode) {
      // Intra-state (Haryana): CGST 9% + SGST 9%
      const cgst = taxableAmount.times(config.tax.intraStateCgstRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      const sgst = taxableAmount.times(config.tax.intraStateSgstRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      totalTax = cgst.plus(sgst);
      taxes.push({ type: "CGST", rate: config.tax.intraStateCgstRate, amount: cgst.toNumber() });
      taxes.push({ type: "SGST", rate: config.tax.intraStateSgstRate, amount: sgst.toNumber() });
    } else {
      // Inter-state: IGST 18%
      const igst = taxableAmount.times(config.tax.interStateIgstRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      totalTax = igst;
      taxes.push({ type: "IGST", rate: config.tax.interStateIgstRate, amount: igst.toNumber() });
    }

    const totalAmount = taxableAmount.plus(totalTax).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const amountInPaise = totalAmount.times(100).round().toNumber();

    const snapshotId = `snap_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const calculatedAt = new Date().toISOString();

    return {
      success: true,
      currency: config.tax.currency,
      lineItems: calculatedLines,
      subtotal: subtotal.toNumber(),
      discountAmount: discountAmount.toNumber(),
      coupon: couponResult,
      taxableAmount: taxableAmount.toNumber(),
      taxes,
      totalTax: totalTax.toNumber(),
      totalAmount: totalAmount.toNumber(),
      amountInPaise,
      taxJurisdiction: {
        platformState: config.tax.platformStateCode,
        customerState,
        isInterState: !isExport && customerState !== config.tax.platformStateCode,
        isExport,
      },
      snapshot: {
        snapshotId,
        calculatedAt,
        currency: config.tax.currency,
        subtotal: subtotal.toNumber(),
        discountAmount: discountAmount.toNumber(),
        taxableAmount: taxableAmount.toNumber(),
        totalTax: totalTax.toNumber(),
        totalAmount: totalAmount.toNumber(),
        amountInPaise,
        lineItems: calculatedLines,
        taxes,
        couponCode: couponResult?.code || null,
      },
    };
  }
}
