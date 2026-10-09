import { prisma, rawPrisma } from "../prisma";
import { normalizeExpiryDateKolkata, normalizeStartDateKolkata } from "./billing-duration.service";

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

  if (coupon.startsAt) {
    const startDate = normalizeStartDateKolkata(coupon.startsAt);
    if (startDate && startDate > now) {
      return fail("This coupon is not yet active.");
    }
  }

  if (coupon.expiresAt) {
    const expiryDate = normalizeExpiryDateKolkata(coupon.expiresAt);
    if (expiryDate && expiryDate < now) {
      return fail("This coupon has expired.");
    }
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
    const percentage = Math.min(100, Math.max(0, Number(coupon.discountValue)));
    discountAmount = Math.round(((purchaseAmount * percentage) / 100) * 100) / 100;
  } else {
    discountAmount = Math.max(0, Number(coupon.discountValue));
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

export interface RecordCouponRedemptionParams {
  couponId: string;
  tenantId: string;
  orderId?: string;
  invoiceId?: string;
  discountApplied: number;
  tx?: any;
}

/**
 * Records coupon redemption idempotently adhering to the Universal Lock Order Hierarchy:
 * 1. Lock Coupon row FOR UPDATE
 * 2. Validate status, active time window (statement_timestamp), and global quota
 * 3. Validate per-tenant redemption limit
 * 4. Create CouponRedemption and increment redemptionCount
 */
export async function recordCouponRedemption(
  paramsOrCouponId: RecordCouponRedemptionParams | string,
  argTenantId?: string,
  argInvoiceId?: string,
  argDiscountApplied?: number,
  argOrderId?: string,
  argTx?: any
): Promise<any> {
  const db = rawPrisma || prisma;

  let couponId: string;
  let tenantId: string;
  let orderId: string | undefined;
  let invoiceId: string | undefined;
  let discountApplied: number;
  let txClient: any;

  if (typeof paramsOrCouponId === "string") {
    couponId = paramsOrCouponId;
    tenantId = argTenantId!;
    invoiceId = argInvoiceId;
    discountApplied = Number(argDiscountApplied) || 0;
    orderId = argOrderId;
    txClient = argTx;
  } else {
    couponId = paramsOrCouponId.couponId;
    tenantId = paramsOrCouponId.tenantId;
    orderId = paramsOrCouponId.orderId;
    invoiceId = paramsOrCouponId.invoiceId;
    discountApplied = Number(paramsOrCouponId.discountApplied) || 0;
    txClient = paramsOrCouponId.tx;
  }

  const executeAtomic = async (client: any) => {
    // Idempotency: check if already redeemed for this order or invoice
    if (orderId) {
      const existing = await client.couponRedemption.findFirst({
        where: { couponId, orderId },
      });
      if (existing) return existing;
    }

    if (invoiceId) {
      const existing = await client.couponRedemption.findFirst({
        where: { couponId, invoiceId },
      });
      if (existing) return existing;
    }

    // Step 1: Universal Row Lock on Coupon
    const lockedCoupons: any[] = await client.$queryRawUnsafe(
      `SELECT id, status, redemption_count, max_redemptions, per_tenant_limit, starts_at, expires_at 
       FROM coupons 
       WHERE id = $1 
       FOR UPDATE`,
      couponId
    );

    if (!lockedCoupons || lockedCoupons.length === 0) {
      throw new Error("COUPON_NOT_FOUND");
    }
    const coupon = lockedCoupons[0];

    // Step 2: In-Transaction Validation
    if (coupon.status !== "active") {
      throw new Error("COUPON_INACTIVE");
    }

    const timeCheck: any[] = await client.$queryRawUnsafe(
      `SELECT 
        ($1::timestamptz IS NULL OR $1::timestamptz <= statement_timestamp()) AS is_started,
        ($2::timestamptz IS NULL OR $2::timestamptz > statement_timestamp()) AS not_expired`,
      coupon.starts_at,
      coupon.expires_at
    );

    if (!timeCheck[0]?.is_started || !timeCheck[0]?.not_expired) {
      throw new Error("COUPON_EXPIRED");
    }

    if (coupon.max_redemptions !== null && coupon.redemption_count >= coupon.max_redemptions) {
      throw new Error("COUPON_MAX_REDEMPTIONS_REACHED");
    }

    // Step 3: Per-Tenant Limit Validation
    const tenantCount = await client.couponRedemption.count({
      where: { couponId, tenantId },
    });
    const perTenantLimit = coupon.per_tenant_limit ?? 1;
    if (tenantCount >= perTenantLimit) {
      throw new Error("COUPON_PER_TENANT_LIMIT_EXCEEDED");
    }

    // Step 4: Atomic Execution
    const redemption = await client.couponRedemption.create({
      data: {
        couponId,
        tenantId,
        orderId,
        invoiceId,
        discountApplied,
      },
    });

    await client.coupon.update({
      where: { id: couponId },
      data: {
        redemptionCount: { increment: 1 },
      },
    });

    return redemption;
  };

  if (txClient) {
    return await executeAtomic(txClient);
  }

  return await db.$transaction(async (innerTx) => {
    return await executeAtomic(innerTx);
  });
}

