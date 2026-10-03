import { Router, Response } from "express";
import crypto from "crypto";
import { prisma, rawPrisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { parsePagination, paginate } from "../lib/pagination";
import { broadcastToTenant } from "../socket";
import {
  calculateSubscriptionPeriod,
  resolvePlanPriceForDuration,
  calculateRemainingDays,
  normalizeBillingDuration,
  calculateTrialEndDate,
  calculatePlanPricing,
  validateBillableUserCount,
  ACTIVE_BILLING_DURATIONS,
  HISTORICAL_BILLING_DURATIONS,
} from "../services/billing-duration.service";
import { validateCoupon, recordCouponRedemption } from "../services/coupon.service";
import { getBaseDomain } from "../lib/workspace-host";

export const billingRouter = Router();

// ---------------------------------------------------------------------------
// 0.0 GET /api/billing/durations - Authoritative billing durations source of truth
// ---------------------------------------------------------------------------
billingRouter.get("/durations", (_req, res: Response) => {
  return res.json({
    activeDurations: ACTIVE_BILLING_DURATIONS,
    historicalDurations: HISTORICAL_BILLING_DURATIONS,
    defaultDuration: "1_month",
  });
});

// ---------------------------------------------------------------------------
// 0. GET /api/billing/public-plans - Public dynamic plans for /pricing CMS
// ---------------------------------------------------------------------------
billingRouter.get("/public-plans", async (_req, res: Response) => {
  try {
    const db = rawPrisma || prisma;

    // Fetch dynamic company details from system-platform-settings CMS page
    const settingsPage = await db.cmsPage.findUnique({
      where: { slug: "system-platform-settings" },
    });
    const settingsContent = (settingsPage?.content as any) || {};

    const companyDetails = {
      companyName: settingsContent.platformName || settingsContent.companyName || "Master ERP & HRMS",
      supportEmail: settingsContent.supportEmail || settingsContent.contactEmail || `support@${getBaseDomain()}`,
      contactNumber: settingsContent.contactNumber || settingsContent.contactPhone || "+91 98765 43210",
      companyAddress: settingsContent.companyAddress || settingsContent.address || "DLF Cyber City, Gurugram, India",
      taxGstNumber: settingsContent.taxGstNumber || settingsContent.gstNumber || null,
      currency: settingsContent.defaultCurrency || "INR",
      currencySymbol: settingsContent.currencySymbol || "₹",
    };

    const plans = await db.subscriptionPlan.findMany({
      where: {
        status: "active",
        isPublic: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const formatted = plans.map((p) => {
      const p1m = calculatePlanPricing(p, "1_month", p.billableUsers || 1);
      const p1y = calculatePlanPricing(p, "1_year", p.billableUsers || 1);
      const combinedLimit = p.maxUsers ?? p.maxEmployees ?? null;

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        planType: p.planType || "standard",
        pricingModel: p.pricingModel || "fixed",
        pricePerUser: p.pricePerUser ? Number(p.pricePerUser) : null,
        pricePerUserOriginal: p.pricePerUserOriginal ? Number(p.pricePerUserOriginal) : null,
        billableUsers: p.billableUsers || 1,
        minUsers: 1,
        maxUsers: 99999,
        isPopular: p.isPopular,
        isTrial: p.isTrial,
        trialDays: p.isTrial ? 3 : (p.trialDays || 3),
        combinedUserLimit: combinedLimit,
        features: (p.features as any) || [],
        pricing: {
          "1_month": {
            price: p1m.sellingPrice,
            originalPrice: p1m.originalPrice,
            discountAmount: p1m.discountAmount,
            discountPercent: p1m.discountPercentage,
            hasDiscount: p1m.hasDiscount,
            monthlyEquivalent: p1m.sellingPrice,
          },
          "1_year": {
            price: p1y.sellingPrice,
            originalPrice: p1y.originalPrice,
            discountAmount: p1y.discountAmount,
            discountPercent: p1y.discountPercentage,
            hasDiscount: p1y.hasDiscount,
            monthlyEquivalent: Math.round((p1y.sellingPrice / 12) * 100) / 100,
          },
        },
      };
    });

    return res.json({
      currency: companyDetails.currency,
      currencySymbol: companyDetails.currencySymbol,
      companyDetails,
      plans: formatted,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch public plans" });
  }
});

// ---------------------------------------------------------------------------
// 0.05 POST /api/billing/calculate - Dynamic pricing calculation
// ---------------------------------------------------------------------------
billingRouter.post("/calculate", async (req: any, res: Response) => {
  try {
    const db = rawPrisma || prisma;
    const { planId, duration = "1_month", userCount, couponCode, tenantId } = req.body;
    if (!planId) return res.status(400).json({ error: "planId is required." });

    const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: "Subscription plan not found." });

    const pricing = calculatePlanPricing(plan, duration, userCount);
    let discountAmount = 0;
    let finalAmount = pricing.sellingPrice;
    let couponResult: any = null;

    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      couponResult = await validateCoupon({
        code: couponCode.trim(),
        tenantId: tenantId || req.user?.tenantId,
        planId: plan.id,
        duration: pricing.durationKey,
        purchaseAmount: pricing.sellingPrice,
      });

      if (couponResult.valid) {
        discountAmount = couponResult.discountAmount;
        finalAmount = couponResult.finalAmount;
      }
    }

    return res.json({
      ...pricing,
      couponDiscount: discountAmount,
      finalAmount,
      finalAmountInPaise: Math.round(finalAmount * 100),
      coupon: couponResult,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Pricing calculation failed" });
  }
});

// ---------------------------------------------------------------------------
// 0.1 POST /api/billing/validate-coupon - Validate promo coupon
// ---------------------------------------------------------------------------
billingRouter.post("/validate-coupon", async (req: any, res: Response) => {
  try {
    const { code, planId, duration, amount, tenantId } = req.body;
    const result = await validateCoupon({
      code,
      tenantId: tenantId || req.user?.tenantId,
      planId,
      duration,
      purchaseAmount: Number(amount) || 0,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Coupon validation failed" });
  }
});

// ---------------------------------------------------------------------------
// 1. GET /api/billing/plans - List subscription plans with current tenant status
// ---------------------------------------------------------------------------
billingRouter.get("/plans", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = rawPrisma || prisma;
    const tenantId = req.user?.tenantId;

    const [plans, subscription] = await Promise.all([
      db.subscriptionPlan.findMany({
        where: { status: "active" },
        orderBy: [{ sortOrder: "asc" }, { priceMonthly: "asc" }],
      }),
      tenantId
        ? db.tenantSubscription.findFirst({
            where: { tenantId },
            include: { plan: true },
          })
        : null,
    ]);

    let trialDaysRemaining: number | null = null;
    if (subscription?.trialEndsAt) {
      trialDaysRemaining = calculateRemainingDays(subscription.trialEndsAt);
    }

    const plansWithDurations = plans.map((p) => {
      const p1m = resolvePlanPriceForDuration(p, "1_month");
      const p3m = resolvePlanPriceForDuration(p, "3_months");
      const p6m = resolvePlanPriceForDuration(p, "6_months");
      const p1y = resolvePlanPriceForDuration(p, "1_year");

      return {
        ...p,
        pricing: {
          "1_month": p1m,
          "3_months": p3m,
          "6_months": p6m,
          "1_year": p1y,
        },
      };
    });

    return res.json({
      plans: plansWithDurations,
      subscription: subscription
        ? {
            id: subscription.id,
            planId: subscription.planId,
            planName: subscription.plan?.name || "Trial / Custom",
            status: subscription.status,
            billingCycle: subscription.billingCycle,
            billingInterval: subscription.billingInterval,
            billingIntervalCount: subscription.billingIntervalCount,
            billingStartedAt: subscription.billingStartedAt,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            maxEmployees: subscription.maxEmployees ?? subscription.plan?.maxEmployees,
            maxUsers: subscription.maxUsers ?? subscription.plan?.maxUsers,
            trialStartedAt: subscription.trialStartedAt,
            trialEndsAt: subscription.trialEndsAt,
            trialDaysRemaining,
            expiresAt: subscription.expiresAt,
            remainingDays: calculateRemainingDays(subscription.expiresAt),
          }
        : null,
    });
  } catch (err: any) {
    console.error("[GET /api/billing/plans] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load billing plans." });
  }
});

// ---------------------------------------------------------------------------
// 2. GET /api/billing/preview - Preview for plan change / checkout
// ---------------------------------------------------------------------------
billingRouter.get("/preview", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = rawPrisma || prisma;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const planId = String(req.query.planId || "");
    const duration = normalizeBillingDuration(String(req.query.duration || req.query.billingCycle || "1_month"));
    const couponCode = req.query.couponCode ? String(req.query.couponCode).trim() : null;

    if (!planId) {
      return res.status(400).json({ error: "planId query parameter is required." });
    }

    const [targetPlan, currentSub] = await Promise.all([
      db.subscriptionPlan.findUnique({ where: { id: planId } }),
      db.tenantSubscription.findFirst({
        where: { tenantId },
        include: { plan: true },
      }),
    ]);

    if (!targetPlan) {
      return res.status(404).json({ error: "Selected plan does not exist." });
    }

    const priceResolution = resolvePlanPriceForDuration(targetPlan, duration);
    const subtotal = priceResolution.price;

    let discountAmount = 0;
    let finalAmount = subtotal;
    let couponInfo: any = null;

    if (couponCode) {
      const cRes = await validateCoupon({
        code: couponCode,
        tenantId,
        planId,
        duration,
        purchaseAmount: subtotal,
      });
      if (cRes.valid) {
        discountAmount = cRes.discountAmount;
        finalAmount = cRes.finalAmount;
        couponInfo = {
          code: cRes.coupon.code,
          discountType: cRes.coupon.discountType,
          discountValue: Number(cRes.coupon.discountValue),
        };
      }
    }

    const now = new Date();
    const period = calculateSubscriptionPeriod(now, duration, currentSub?.expiresAt);

    return res.json({
      currentPlan: currentSub?.plan
        ? {
            id: currentSub.plan.id,
            name: currentSub.plan.name,
            expiresAt: currentSub.expiresAt,
          }
        : null,
      targetPlan: {
        id: targetPlan.id,
        name: targetPlan.name,
        duration,
        durationLabel: priceResolution.durationKey,
        price: subtotal,
        monthlyEquivalent: priceResolution.monthlyEquivalent,
      },
      periodStart: period.periodStart.toISOString(),
      periodEnd: period.periodEnd.toISOString(),
      subtotal,
      discountAmount,
      amountDueToday: finalAmount,
      coupon: couponInfo,
      currency: "INR",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to calculate plan preview." });
  }
});

// ---------------------------------------------------------------------------
// 3. POST /api/billing/change-plan - Create BillingInvoice & Prepare Checkout
// ---------------------------------------------------------------------------
billingRouter.post("/change-plan", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = rawPrisma || prisma;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const userRoles = req.user?.roles || [];
    const isAuthorized = userRoles.some((r: string) => ["hr_admin", "admin", "super_admin", "owner"].includes(r));
    if (!isAuthorized) {
      return res.status(403).json({ error: "Unauthorized: Only tenant administrators can manage or purchase subscriptions." });
    }

    if (req.body.tenantId && req.body.tenantId !== tenantId && !userRoles.includes("super_admin")) {
      return res.status(403).json({ error: "Unauthorized: Cannot purchase or modify subscriptions for another tenant." });
    }

    const { planId, duration = "1_month", couponCode, paymentMethod = "razorpay", userCount } = req.body;
    if (!planId) return res.status(400).json({ error: "planId is required." });

    const [plan, sub] = await Promise.all([
      db.subscriptionPlan.findUnique({ where: { id: planId } }),
      db.tenantSubscription.findFirst({ where: { tenantId } }),
    ]);

    if (!plan) return res.status(404).json({ error: "Plan not found." });

    const durationKey = normalizeBillingDuration(duration);
    const pricing = calculatePlanPricing(plan, durationKey, userCount);
    const subtotal = pricing.sellingPrice;

    let discountAmount = 0;
    let finalAmount = subtotal;
    let validatedCouponId: string | null = null;

    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      const cRes = await validateCoupon({
        code: couponCode.trim(),
        tenantId,
        planId: plan.id,
        duration: durationKey,
        purchaseAmount: subtotal,
      });

      if (!cRes.valid) {
        return res.status(400).json({ error: cRes.error || "Invalid coupon code." });
      }

      discountAmount = cRes.discountAmount;
      finalAmount = cRes.finalAmount;
      validatedCouponId = cRes.coupon.id;
    }

    const now = new Date();
    const period = calculateSubscriptionPeriod(now, durationKey, sub?.expiresAt);

    // Ensure subscription row exists
    let subscriptionId = sub?.id;
    if (!subscriptionId) {
      const newSub = await db.tenantSubscription.create({
        data: {
          tenantId,
          planId: plan.id,
          status: "trialing",
          billingCycle: durationKey === "1_year" ? "annual" : "monthly",
          billingInterval: durationKey,
          billingIntervalCount: durationKey === "1_year" ? 12 : durationKey === "6_months" ? 6 : durationKey === "3_months" ? 3 : 1,
        },
      });
      subscriptionId = newSub.id;
    }

    const count = await db.billingInvoice.count({ where: { tenantId } });
    const invoiceNo = `SUB-INV-${now.getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const invoice = await db.billingInvoice.create({
      data: {
        tenantId,
        subscriptionId,
        invoiceNo,
        amount: finalAmount,
        currency: "INR",
        status: finalAmount === 0 ? "paid" : "open",
        pricingModel: plan.pricingModel || "fixed",
        pricePerUser: plan.pricePerUser ? Number(plan.pricePerUser) : null,
        billableUsers: pricing.userCount || null,
        planId: plan.id,
        billingCycle: durationKey === "1_year" ? "annual" : "monthly",
        paymentMethod,
        couponCode: couponCode ? String(couponCode).trim().toUpperCase() : null,
        discountAmount,
        subtotalAmount: subtotal,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        paidAt: finalAmount === 0 ? now : null,
      },
    });

    if (finalAmount === 0) {
      // 100% discount or free plan: Activate immediately
      await db.tenantSubscription.update({
        where: { id: subscriptionId },
        data: {
          planId: plan.id,
          status: "active",
          planType: plan.planType || "standard",
          pricingModel: plan.pricingModel || "fixed",
          pricePerUser: plan.pricePerUser ? Number(plan.pricePerUser) : null,
          billableUsers: pricing.userCount || null,
          calculatedTotal: finalAmount,
          billingCycle: durationKey === "1_year" ? "annual" : "monthly",
          billingInterval: durationKey,
          billingStartedAt: sub?.billingStartedAt || period.periodStart,
          currentPeriodStart: period.periodStart,
          currentPeriodEnd: period.periodEnd,
          expiresAt: period.periodEnd,
          renewedAt: now,
          maxEmployees: plan.maxEmployees,
          maxUsers: pricing.userCount || plan.maxUsers,
          storageLimitGb: plan.storageLimitGb,
        },
      });

      if (validatedCouponId) {
        await recordCouponRedemption({
          couponId: validatedCouponId,
          tenantId,
          invoiceId: invoice.id,
          discountApplied: discountAmount,
        });
      }

      broadcastToTenant(tenantId, "subscription:activated", {
        invoiceId: invoice.id,
        planId: plan.id,
        status: "active",
      });
    }

    return res.status(201).json({
      invoice,
      requiresPayment: finalAmount > 0,
      amount: finalAmount,
      subtotal,
      discountAmount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to initiate plan change." });
  }
});

// ---------------------------------------------------------------------------
// 3.1 POST /api/billing/trial-activate - Activate trial plan for tenant
// ---------------------------------------------------------------------------
billingRouter.post("/trial-activate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = rawPrisma || prisma;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const userRoles = req.user?.roles || [];
    const isAuthorized = userRoles.some((r: string) => ["hr_admin", "admin", "super_admin", "owner"].includes(r));
    if (!isAuthorized) {
      return res.status(403).json({ error: "Unauthorized: Only tenant administrators can activate trials." });
    }

    if (req.body.tenantId && req.body.tenantId !== tenantId && !userRoles.includes("super_admin")) {
      return res.status(403).json({ error: "Unauthorized: Cannot activate trials for another tenant." });
    }

    const { planId } = req.body;
    const targetPlan = await db.subscriptionPlan.findFirst({
      where: planId ? { id: planId } : { isTrial: true, status: "active" },
    });

    if (!targetPlan) {
      return res.status(404).json({ error: "Trial plan not found or not currently configured." });
    }

    const currentSub = await db.tenantSubscription.findUnique({
      where: { tenantId },
    });

    // Guard: Has tenant already consumed trial?
    if (currentSub?.trialStartedAt) {
      return res.status(400).json({
        error: "Your workspace has already utilized a trial subscription and is not eligible for another trial.",
      });
    }

    const now = new Date();
    const trialDays = targetPlan.trialDays || 3;
    const trialEndsAt = calculateTrialEndDate(now, trialDays);

    const updated = await db.tenantSubscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        planId: targetPlan.id,
        status: "trialing",
        billingCycle: "monthly",
        billingStartedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        trialStartedAt: now,
        trialEndsAt,
        expiresAt: trialEndsAt,
        maxEmployees: targetPlan.maxEmployees,
        maxUsers: targetPlan.maxUsers,
        storageLimitGb: targetPlan.storageLimitGb,
      },
      update: {
        planId: targetPlan.id,
        status: "trialing",
        billingStartedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        trialStartedAt: now,
        trialEndsAt,
        expiresAt: trialEndsAt,
        maxEmployees: targetPlan.maxEmployees,
        maxUsers: targetPlan.maxUsers,
        storageLimitGb: targetPlan.storageLimitGb,
      },
    });

    broadcastToTenant(tenantId, "subscription:activated", {
      status: "trialing",
      planId: targetPlan.id,
      trialEndsAt: trialEndsAt.toISOString(),
    });

    return res.json({
      success: true,
      message: `Activated ${targetPlan.name} ${trialDays}-day trial successfully.`,
      subscription: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to activate trial." });
  }
});

// ---------------------------------------------------------------------------
// 4. POST /api/billing/checkout - Create gateway order (Razorpay INR)
// ---------------------------------------------------------------------------
billingRouter.post("/checkout", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = rawPrisma || prisma;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const userRoles = req.user?.roles || [];
    const isAuthorized = userRoles.some((r: string) => ["hr_admin", "admin", "super_admin", "owner"].includes(r));
    if (!isAuthorized) {
      return res.status(403).json({ error: "Unauthorized: Only tenant administrators can initiate checkout." });
    }

    const { invoiceId } = req.body;
    if (!invoiceId) return res.status(400).json({ error: "invoiceId is required." });

    const invoice = await db.billingInvoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) return res.status(404).json({ error: "Billing invoice not found." });
    if (invoice.status === "paid") {
      return res.status(400).json({ error: "This invoice is already paid." });
    }

    // Razorpay order creation in INR
    const orderId = `order_${crypto.randomBytes(8).toString("hex")}`;
    const amountInPaise = Math.round(Number(invoice.amount) * 100);

    await db.billingInvoice.update({
      where: { id: invoice.id },
      data: {
        gatewayOrderId: orderId,
        status: "open",
      },
    });

    return res.json({
      invoiceId: invoice.id,
      orderId,
      amount: Number(invoice.amount),
      amountInPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_MasterHRMSKey",
      name: "Master HRMS & ERP",
      description: `Subscription: ${invoice.invoiceNo}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create checkout order." });
  }
});

// ---------------------------------------------------------------------------
// 4.1 POST /api/billing/verify - Verify Razorpay payment signature & activate
// ---------------------------------------------------------------------------
billingRouter.post("/verify", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = rawPrisma || prisma;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const userRoles = req.user?.roles || [];
    const isAuthorized = userRoles.some((r: string) => ["hr_admin", "admin", "super_admin", "owner"].includes(r));
    if (!isAuthorized) {
      return res.status(403).json({ error: "Unauthorized: Only tenant administrators can verify payments." });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !invoiceId) {
      return res.status(400).json({ error: "Order ID, Payment ID, and Invoice ID are required." });
    }

    const invoice = await db.billingInvoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) return res.status(404).json({ error: "Billing invoice not found." });

    // Verify signature if secret provided (or in test environment)
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (secret && razorpay_signature) {
      const generated = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generated !== razorpay_signature) {
        return res.status(400).json({ error: "Invalid Razorpay payment signature." });
      }
    }

    const now = new Date();

    // Mark invoice paid
    await db.billingInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "paid",
        paidAt: now,
        gatewayOrderId: razorpay_order_id,
        gatewayPaymentId: razorpay_payment_id,
      },
    });

    // Record coupon redemption if applicable
    if (invoice.couponCode) {
      const coupon = await db.coupon.findUnique({
        where: { code: invoice.couponCode },
      });
      if (coupon) {
        await recordCouponRedemption({
          couponId: coupon.id,
          tenantId,
          orderId: razorpay_order_id,
          invoiceId: invoice.id,
          discountApplied: Number(invoice.discountAmount || 0),
        });
      }
    }

    // Activate/Renew tenant subscription with authoritative dates
    const plan = invoice.planId
      ? await db.subscriptionPlan.findUnique({ where: { id: invoice.planId } })
      : null;

    const currentSub = await db.tenantSubscription.findUnique({
      where: { id: invoice.subscriptionId },
    });

    await db.tenantSubscription.update({
      where: { id: invoice.subscriptionId },
      data: {
        status: "active",
        planId: invoice.planId,
        planType: plan?.planType || "standard",
        pricingModel: invoice.pricingModel || plan?.pricingModel || "fixed",
        pricePerUser: invoice.pricePerUser,
        billableUsers: invoice.billableUsers,
        calculatedTotal: invoice.amount,
        billingCycle: invoice.billingCycle,
        billingStartedAt: currentSub?.billingStartedAt || invoice.periodStart,
        currentPeriodStart: invoice.periodStart,
        currentPeriodEnd: invoice.periodEnd,
        expiresAt: invoice.periodEnd,
        renewedAt: now,
        maxEmployees: plan?.maxEmployees ?? undefined,
        maxUsers: invoice.billableUsers || plan?.maxUsers || undefined,
        storageLimitGb: plan?.storageLimitGb ?? undefined,
      },
    });

    broadcastToTenant(tenantId, "subscription:activated", {
      invoiceId: invoice.id,
      planId: invoice.planId,
      status: "active",
      expiresAt: invoice.periodEnd.toISOString(),
    });

    return res.json({
      success: true,
      message: "Payment verified and subscription activated successfully.",
      invoiceNo: invoice.invoiceNo,
      expiresAt: invoice.periodEnd,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Payment verification failed." });
  }
});

// ---------------------------------------------------------------------------
// 5. POST /api/billing/retry/:invoiceId - Retry failed payment
// ---------------------------------------------------------------------------
billingRouter.post("/retry/:invoiceId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = rawPrisma || prisma;
    const tenantId = req.user?.tenantId;
    const { invoiceId } = req.params;

    const invoice = await db.billingInvoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) return res.status(404).json({ error: "Invoice not found." });
    if (invoice.status === "paid") return res.status(400).json({ error: "Invoice is already paid." });

    const orderId = `order_retry_${crypto.randomBytes(8).toString("hex")}`;
    const updated = await db.billingInvoice.update({
      where: { id: invoice.id },
      data: { gatewayOrderId: orderId, status: "open" },
    });

    return res.json({
      invoice: updated,
      orderId,
      amount: Number(updated.amount),
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_MasterHRMSKey",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to retry invoice payment." });
  }
});

// ---------------------------------------------------------------------------
// 6. GET /api/billing/invoices - Tenant billing history
// ---------------------------------------------------------------------------
billingRouter.get("/invoices", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = rawPrisma || prisma;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const p = parsePagination(req.query, ["createdAt", "amount", "status", "periodStart"], "createdAt");
    const result = await paginate(
      db.billingInvoice,
      {
        where: { tenantId },
      },
      p
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch billing invoices." });
  }
});

// ---------------------------------------------------------------------------
// 7. POST /api/billing/webhook (Shared Webhook Handler)
// ---------------------------------------------------------------------------
export async function handleRazorpayWebhook(req: any, res: Response) {
  try {
    const db = rawPrisma || prisma;
    const signature = req.headers["x-razorpay-signature"] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "default_webhook_secret";

    let rawBody = "";
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString("utf8");
    } else if (typeof req.body === "string") {
      rawBody = req.body;
    } else {
      rawBody = JSON.stringify(req.body);
    }

    if (signature && process.env.NODE_ENV === "production") {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: "Invalid webhook signature." });
      }
    }

    const payload = typeof req.body === "object" && !Buffer.isBuffer(req.body)
      ? req.body
      : JSON.parse(rawBody || "{}");

    const eventId = payload.id || `evt_${Date.now()}`;
    const eventType = payload.event;

    // Idempotency: Check if this event was already processed
    const alreadyProcessed = await db.billingInvoice.findFirst({
      where: { gatewayEventId: eventId },
    });
    if (alreadyProcessed) {
      return res.json({ status: "already_processed", eventId });
    }

    if (eventType === "payment.captured" || eventType === "order.paid") {
      const payment = payload.payload?.payment?.entity || {};
      const orderId = payment.order_id || payload.payload?.order?.entity?.id;
      const paymentId = payment.id || `pay_${Date.now()}`;

      if (orderId) {
        const invoice = await db.billingInvoice.findFirst({
          where: { gatewayOrderId: orderId },
        });

        if (invoice) {
          const now = new Date();
          await db.billingInvoice.update({
            where: { id: invoice.id },
            data: {
              status: "paid",
              paidAt: now,
              gatewayPaymentId: paymentId,
              gatewayEventId: eventId,
            },
          });

          // Record coupon redemption if coupon was applied
          if (invoice.couponCode) {
            const coupon = await db.coupon.findUnique({
              where: { code: invoice.couponCode },
            });
            if (coupon) {
              await recordCouponRedemption({
                couponId: coupon.id,
                tenantId: invoice.tenantId,
                orderId,
                invoiceId: invoice.id,
                discountApplied: Number(invoice.discountAmount || 0),
              });
            }
          }

          const plan = invoice.planId
            ? await db.subscriptionPlan.findUnique({ where: { id: invoice.planId } })
            : null;

          const currentSub = await db.tenantSubscription.findUnique({
            where: { id: invoice.subscriptionId },
          });

          await db.tenantSubscription.update({
            where: { id: invoice.subscriptionId },
            data: {
              status: "active",
              planId: invoice.planId,
              billingCycle: invoice.billingCycle,
              billingStartedAt: currentSub?.billingStartedAt || invoice.periodStart,
              currentPeriodStart: invoice.periodStart,
              currentPeriodEnd: invoice.periodEnd,
              expiresAt: invoice.periodEnd,
              renewedAt: now,
              maxEmployees: plan?.maxEmployees ?? undefined,
              maxUsers: plan?.maxUsers ?? undefined,
              storageLimitGb: plan?.storageLimitGb ?? undefined,
            },
          });

          broadcastToTenant(invoice.tenantId, "subscription:activated", {
            invoiceId: invoice.id,
            planId: invoice.planId,
            status: "active",
          });
        }
      }
    }

    return res.json({ received: true, event: eventType, eventId });
  } catch (err: any) {
    console.error("[handleRazorpayWebhook] error:", err);
    return res.status(500).json({ error: err.message || "Webhook processing failed." });
  }
}

billingRouter.post("/webhook", handleRazorpayWebhook);
