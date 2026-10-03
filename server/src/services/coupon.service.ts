import { prisma, rawPrisma } from "../prisma";

export interface ValidateCouponParams {
  code: string;
  tenantId?: string;
  planId?: string;
  duration?: string;
  purchaseAmount: number;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: any;
  discountAmount: number;
  finalAmount: number;
  payableAmount?: number;
  error?: string;
  reason?: string;
}

/**
 * Validates a coupon code against business rules:
 * - Active status
 * - Start / expiry date boundaries
 * - Minimum purchase amount
 * - Total redemptions limit
 * - Per-tenant redemption limit
 * - Applicable plan constraints
 * - Applicable duration constraints
 */
export async function validateCoupon(
  paramsOrCode: ValidateCouponParams | string,
  argPurchaseAmount?: number,
  argTenantId?: string,
  argPlanId?: string,
  argDuration?: string
): Promise<CouponValidationResult & { payableAmount: number; reason?: string }> {
  const db = rawPrisma || prisma;

  let code: string;
  let purchaseAmount: number;
  let tenantId: string | undefined;
  let planId: string | undefined;
  let duration: string | undefined;

  if (typeof paramsOrCode === "string") {
    code = paramsOrCode;
    purchaseAmount = Number(argPurchaseAmount) || 0;
    tenantId = argTenantId;
    planId = argPlanId;
    duration = argDuration;
  } else {
    code = paramsOrCode?.code;
    purchaseAmount = Number(paramsOrCode?.purchaseAmount) || 0;
    tenantId = paramsOrCode?.tenantId;
    planId = paramsOrCode?.planId;
    duration = paramsOrCode?.duration;
  }

  if (!code || typeof code !== "string") {
    return { valid: false, discountAmount: 0, finalAmount: purchaseAmount, payableAmount: purchaseAmount, error: "Coupon code is required.", reason: "Coupon code is required." };
  }

  const cleanCode = code.trim().toUpperCase();
  const coupon = await db.coupon.findUnique({
    where: { code: cleanCode },
  });

  if (!coupon) {
    return { valid: false, discountAmount: 0, finalAmount: purchaseAmount, payableAmount: purchaseAmount, error: "Invalid coupon code.", reason: "Invalid coupon code." };
  }

  const fail = (msg: string) => ({
    valid: false,
    discountAmount: 0,
    finalAmount: purchaseAmount,
    payableAmount: purchaseAmount,
    error: msg,
    reason: msg,
  });

  if (coupon.status !== "active") {
    return fail("This coupon is currently inactive.");
  }

  const now = new Date();

  if (coupon.startsAt && new Date(coupon.startsAt) > now) {
    return fail("This coupon is not yet active.");
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
    return fail("This coupon has expired.");
  }

  if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) {
    return fail("Coupon redemption limit has been reached.");
  }

  if (coupon.minPurchaseAmount !== null && purchaseAmount < Number(coupon.minPurchaseAmount)) {
    return fail(`Minimum purchase amount of ₹${Number(coupon.minPurchaseAmount).toLocaleString("en-IN")} required for this coupon.`);
  }

  // Check applicable plans
  if (coupon.applicablePlanIds && Array.isArray(coupon.applicablePlanIds) && coupon.applicablePlanIds.length > 0) {
    if (!planId || !coupon.applicablePlanIds.includes(planId)) {
      return fail("This coupon is not applicable to the selected plan.");
    }
  }

  // Check applicable durations
  if (coupon.applicableDurations && Array.isArray(coupon.applicableDurations) && coupon.applicableDurations.length > 0) {
    if (!duration || !coupon.applicableDurations.includes(duration)) {
      return fail("This coupon is not applicable to the selected billing duration.");
    }
  }

  // Check per-tenant redemptions
  if (tenantId && coupon.perTenantLimit) {
    const tenantRedemptions = await db.couponRedemption.count({
      where: {
        couponId: coupon.id,
        tenantId,
      },
    });

    if (tenantRedemptions >= coupon.perTenantLimit) {
      return fail("You have already used this coupon the maximum allowed times.");
    }
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    const percentage = Number(coupon.discountValue);
    discountAmount = Math.round(((purchaseAmount * percentage) / 100) * 100) / 100;
  } else {
    discountAmount = Number(coupon.discountValue);
  }

  // Cap discount so finalAmount never falls below zero
  discountAmount = Math.min(purchaseAmount, Math.max(0, discountAmount));
  const finalAmount = Math.max(0, purchaseAmount - discountAmount);

  return {
    valid: true,
    coupon,
    discountAmount,
    finalAmount,
    payableAmount: finalAmount,
  };
}

/**
 * Records coupon redemption idempotently.
 */
export async function recordCouponRedemption(
  paramsOrCouponId: {
    couponId: string;
    tenantId: string;
    orderId?: string;
    invoiceId?: string;
    discountApplied: number;
  } | string,
  argTenantId?: string,
  argInvoiceId?: string,
  argDiscountApplied?: number,
  argOrderId?: string
): Promise<any> {
  const db = rawPrisma || prisma;

  let couponId: string;
  let tenantId: string;
  let orderId: string | undefined;
  let invoiceId: string | undefined;
  let discountApplied: number;

  if (typeof paramsOrCouponId === "string") {
    couponId = paramsOrCouponId;
    tenantId = argTenantId!;
    invoiceId = argInvoiceId;
    discountApplied = Number(argDiscountApplied) || 0;
    orderId = argOrderId;
  } else {
    couponId = paramsOrCouponId.couponId;
    tenantId = paramsOrCouponId.tenantId;
    orderId = paramsOrCouponId.orderId;
    invoiceId = paramsOrCouponId.invoiceId;
    discountApplied = Number(paramsOrCouponId.discountApplied) || 0;
  }

  return await db.$transaction(async (tx) => {
    // Check if already redeemed for this invoice
    if (invoiceId) {
      const existing = await tx.couponRedemption.findFirst({
        where: { couponId, invoiceId },
      });
      if (existing) return existing;
    }

    const redemption = await tx.couponRedemption.create({
      data: {
        couponId,
        tenantId,
        orderId,
        invoiceId,
        discountApplied,
      },
    });

    await tx.coupon.update({
      where: { id: couponId },
      data: {
        redemptionCount: { increment: 1 },
      },
    });

    return redemption;
  });
}
