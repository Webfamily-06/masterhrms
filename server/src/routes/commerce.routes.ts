/**
 * MASTERHRMS — Phase A3.2 & A3.3: Commerce API Routes
 *
 * Endpoints:
 * 1. GET  /api/commerce/catalog           - Unified catalog (Plans, Standalone ERP Products, Add-Ons)
 * 2. POST /api/commerce/cart/calculate    - Server-authoritative Cart & Tax Calculation
 * 3. POST /api/commerce/orders            - Create commerce order with canonical idempotency & frozen snapshot
 * 4. GET  /api/commerce/orders/:id        - Get order with tenant isolation & virtual expiry
 * 5. POST /api/commerce/orders/:id/cancel - Cancel pending/draft order
 * 6. POST /api/commerce/checkout/simulate - Simulated payment settlement (gated to non-production)
 */

import { Router, Request, Response } from "express";
import { UnifiedCatalogService } from "../services/unified-catalog.service";
import { CartCalculatorService } from "../services/cart-calculator.service";
import {
  CommerceOrderService,
  CommerceOrderError,
  isCommerceSimulationProhibited,
} from "../services/commerce-order.service";
import { CommerceFulfillmentService } from "../services/commerce-fulfillment.service";
import { DynamicPricingService, DynamicPricingError } from "../services/dynamic-pricing.service";
import { SubscriptionScheduleService, SubscriptionScheduleError } from "../services/subscription-schedule.service";
import { RazorpaySandboxService, RazorpaySandboxError } from "../services/razorpay-sandbox.service";
import { prisma, rawPrisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

function isUserSuperAdmin(authReq: AuthRequest): boolean {
  return (
    authReq.user?.roles?.includes("super_admin") ||
    authReq.user?.roles?.includes("SUPER_ADMIN") ||
    (authReq.user as any)?.isSuperAdmin === true
  );
}

export const commerceRouter = Router();

/**
 * GET /api/commerce/catalog
 * Publicly browsable unified catalog with optional tenant entitlement evaluation.
 */
commerceRouter.get("/catalog", async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const requestedTenantId = req.query.tenantId as string | undefined;
    const category = req.query.category as string | undefined;
    const productType = req.query.productType as string | undefined;

    // Resolve user context from request or Bearer token if present
    let authUser = authReq.user;
    if (!authUser && req.headers.authorization?.startsWith("Bearer ")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const { verifyToken } = await import("../lib/jwt");
        const decoded = verifyToken(token);
        if (decoded) {
          const userId = decoded.userId || (decoded as any).id;
          const db = rawPrisma || prisma;
          const account = await db.user.findUnique({
            where: { id: userId },
            include: { profile: true, roles: true },
          });
          if (account) {
            const isSuper = account.roles.some((r) => r.role === "super_admin");
            const roles = account.roles.map((r) => r.role);
            authUser = {
              ...decoded,
              userId,
              tenantId: account.profile?.tenantId || (isSuper && decoded.tenantId ? decoded.tenantId : null),
              roles,
            };
          }
        }
      } catch {
        // Invalid or expired token - proceed as unauthenticated
      }
    }

    let tenantId: string | undefined = undefined;

    if (authUser) {
      const isSuper =
        authUser.roles?.includes("super_admin") ||
        authUser.roles?.includes("SUPER_ADMIN") ||
        (authUser as any).isSuperAdmin === true;

      if (isSuper) {
        // Super admin may explicitly inspect another tenant's catalog or default to their own
        tenantId = requestedTenantId || authUser.tenantId || undefined;
      } else {
        // Regular tenant user is strictly constrained to their own authenticated workspace
        tenantId = authUser.tenantId || undefined;
        if (requestedTenantId && requestedTenantId !== authUser.tenantId) {
          return res.status(403).json({
            success: false,
            code: "TENANT_MISMATCH",
            error: "Cross-tenant catalog inspection is prohibited.",
          });
        }
      }
    } else {
      // Unauthenticated caller: generic public catalog only. Strips tenant entitlement evaluation.
      tenantId = undefined;
    }

    const catalog = await UnifiedCatalogService.getCatalog({
      tenantId,
      isPublicOnly: true,
      category,
      productType,
    });

    return res.json({
      success: true,
      ...catalog,
    });
  } catch (err: any) {
    console.error("[commerce/catalog] error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to retrieve commerce catalog.",
    });
  }
});

/**
 * POST /api/commerce/cart/calculate
 * Server-authoritative pricing and tax calculation with zero trust in client inputs.
 */
commerceRouter.post("/cart/calculate", async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId || req.body.tenantId || undefined;
    const { items, couponCode, taxDetails } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Cart must contain at least one item.",
      });
    }

    const calculation = await CartCalculatorService.calculate({
      items,
      couponCode,
      tenantId,
      taxDetails,
    });

    return res.json(calculation);
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || "Cart calculation failed.",
    });
  }
});

/**
 * POST /api/commerce/orders
 * Create an authoritative order with frozen pricing snapshot and canonical intent hashing.
 */
commerceRouter.post("/orders", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const userId = authReq.user?.userId || (authReq.user as any)?.id;

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        error: "Tenant context is required to create a commerce order.",
      });
    }

    const { items, couponCode, taxDetails } = req.body;
    const idempotencyKey =
      (req.headers["idempotency-key"] as string) || req.body.idempotencyKey || null;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Order must contain at least one line item.",
      });
    }

    const result = await CommerceOrderService.createOrder({
      tenantId,
      userId,
      items,
      couponCode,
      taxDetails,
      idempotencyKey,
    });

    if (result.isReplay) {
      res.setHeader("X-Idempotent-Replay", "true");
      return res.status(200).json({
        success: true,
        isReplay: true,
        order: result.order,
      });
    }

    return res.status(201).json({
      success: true,
      isReplay: false,
      order: result.order,
    });
  } catch (err: any) {
    if (err instanceof CommerceOrderError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        error: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to create order.",
    });
  }
});

/**
 * GET /api/commerce/orders/:id
 * Retrieve order with strict tenant isolation and virtual expiry presentation.
 */
commerceRouter.get("/orders/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        error: "Tenant context required.",
      });
    }

    const order = await CommerceOrderService.getOrderById(tenantId, req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found.",
      });
    }

    return res.json({
      success: true,
      order,
    });
  } catch (err: any) {
    if (err instanceof CommerceOrderError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        error: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to retrieve order.",
    });
  }
});

/**
 * POST /api/commerce/orders/:id/cancel
 * Cancel order prior to payment settlement.
 */
commerceRouter.post("/orders/:id/cancel", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        error: "Tenant context required.",
      });
    }

    const order = await CommerceOrderService.cancelOrder(
      tenantId,
      req.params.id,
      req.body.reason
    );

    return res.json({
      success: true,
      order,
    });
  } catch (err: any) {
    if (err instanceof CommerceOrderError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        error: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to cancel order.",
    });
  }
});

/**
 * POST /api/commerce/checkout/simulate
 * Development/test simulated checkout execution. Strictly disabled in production.
 */
commerceRouter.post("/checkout/simulate", requireAuth, async (req: Request, res: Response) => {
  try {
    if (isCommerceSimulationProhibited()) {
      return res.status(403).json({
        success: false,
        code: "SIMULATION_PROHIBITED",
        error: "Simulated checkout is strictly disabled in production and production-like deployment configurations.",
      });
    }

    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        error: "Tenant context required.",
      });
    }

    const { orderId, outcome, notes } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: "orderId is required.",
      });
    }

    const outcomeVal = outcome === "FAILURE" ? "FAILURE" : "SUCCESS";

    const result = await CommerceOrderService.simulatePaymentSettlement(
      tenantId,
      orderId,
      outcomeVal,
      notes
    );

    return res.json({
      success: result.success,
      isReplay: result.isReplay,
      order: result.order,
      disclaimer: "NON-MONETARY SIMULATION — FOR TEST PURPOSES ONLY",
      gatewayProvider: "SIMULATED_SANDBOX",
      error: result.error,
    });
  } catch (err: any) {
    if (err instanceof CommerceOrderError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        error: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: err.message || "Simulated checkout settlement failed.",
    });
  }
});

/**
 * POST /api/commerce/checkout/initiate
 * Initiates Razorpay sandbox checkout. Gated strictly to test credentials (rzp_test_*).
 */
commerceRouter.post("/checkout/initiate", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        code: "TENANT_CONTEXT_REQUIRED",
        error: "Authenticated tenant context required.",
      });
    }

    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({
        success: false,
        code: "ORDER_ID_REQUIRED",
        error: "orderId is required.",
      });
    }

    const result = await CommerceOrderService.initiateRazorpayCheckout(
      tenantId,
      orderId,
      {
        name: (authReq.user as any)?.name,
        email: authReq.user?.email,
      }
    );

    return res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    if (err instanceof CommerceOrderError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        error: err.message,
      });
    }
    if (err instanceof RazorpaySandboxError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        error: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to initiate Razorpay checkout.",
    });
  }
});

/**
 * POST /api/commerce/webhook
 * Cryptographically verified Razorpay sandbox webhook handler.
 */
commerceRouter.post("/webhook", async (req: Request, res: Response) => {
  try {
    const signature = (req.headers["x-razorpay-signature"] as string) || "";

    // Fail closed: Signature header required
    if (!signature) {
      return res.status(400).json({
        success: false,
        code: "INVALID_SIGNATURE",
        error: "Missing x-razorpay-signature header.",
      });
    }

    // Extract raw body
    const rawReq = req as any;
    let rawBody: Buffer | string;
    if (Buffer.isBuffer(rawReq.rawBody)) {
      rawBody = rawReq.rawBody;
    } else if (Buffer.isBuffer(req.body)) {
      rawBody = req.body;
    } else if (typeof req.body === "string") {
      rawBody = req.body;
    } else {
      rawBody = JSON.stringify(req.body || {});
    }

    // Timing-safe cryptographic HMAC-SHA256 signature verification
    const isSigValid = RazorpaySandboxService.verifyWebhookSignature(rawBody, signature);
    if (!isSigValid) {
      return res.status(400).json({
        success: false,
        code: "INVALID_SIGNATURE",
        error: "Invalid Razorpay webhook signature.",
      });
    }

    // Parse payload
    const eventPayload = typeof req.body === "object" && !Buffer.isBuffer(req.body)
      ? req.body
      : JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody);

    const result = await CommerceOrderService.settleRazorpayWebhook(eventPayload);

    if (result.isReplay) {
      res.setHeader("X-Idempotent-Replay", "true");
    }

    return res.json({
      success: true,
      isReplay: result.isReplay,
      orderId: result.orderId,
      message: result.message || "Webhook processed successfully.",
    });
  } catch (err: any) {
    if (err instanceof RazorpaySandboxError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        error: err.message,
      });
    }
    if (err instanceof CommerceOrderError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        error: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to process Razorpay webhook.",
    });
  }
});

/**
 * POST /api/commerce/outbox/sweep
 * Operator endpoint to trigger an outbox event sweep batch. Strictly requires SUPER_ADMIN role.
 */
commerceRouter.post("/outbox/sweep", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const isSuperAdmin =
      authReq.user?.roles?.includes("super_admin") ||
      authReq.user?.roles?.includes("SUPER_ADMIN") ||
      (authReq.user as any)?.isSuperAdmin === true;

    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        code: "UNAUTHORIZED_OPERATOR",
        error: "Outbox processing trigger is restricted to platform operators.",
      });
    }

    const batchSize = req.body?.batchSize ? Number(req.body.batchSize) : 10;
    const workerId = req.body?.workerId || "OPERATOR_MANUAL_TRIGGER";

    const result = await CommerceFulfillmentService.processOutboxBatch({
      batchSize,
      workerId,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("[commerce/outbox/sweep] operator sweep error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Outbox batch sweep failed.",
    });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PHASE A3.6: WORKSPACE INVOICES (OD-3 Option 3A)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * GET /api/commerce/invoices
 * Retrieves all billing invoices for the authenticated workspace.
 */
commerceRouter.get("/invoices", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        error: "Tenant context required.",
      });
    }

    const db = rawPrisma || prisma;
    const invoices = await db.billingInvoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to list invoices.",
    });
  }
});

/**
 * GET /api/commerce/invoices/:id
 * Retrieves a specific invoice ensuring strict tenant boundary isolation.
 */
commerceRouter.get("/invoices/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        error: "Tenant context required.",
      });
    }

    const db = rawPrisma || prisma;
    const invoice = await db.billingInvoice.findFirst({
      where: { id: req.params.id, tenantId },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: "Invoice not found.",
      });
    }

    return res.json({
      success: true,
      invoice,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to retrieve invoice.",
    });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PHASE A3.6: SUBSCRIPTION PLAN SCHEDULE & OVERRIDE (OD-10)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * GET /api/commerce/subscriptions/current
 * Retrieves the current workspace subscription and any scheduled plan change.
 */
commerceRouter.get("/subscriptions/current", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        error: "Tenant context required.",
      });
    }

    const db = rawPrisma || prisma;
    const sub = await db.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!sub) {
      return res.status(404).json({
        success: false,
        error: "No subscription found for this workspace.",
      });
    }

    return res.json({
      success: true,
      subscription: sub,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to retrieve subscription.",
    });
  }
});

/**
 * POST /api/commerce/subscriptions/schedule-plan-change
 * Customer-initiated plan change scheduled for next renewal.
 */
commerceRouter.post("/subscriptions/schedule-plan-change", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const userId = authReq.user?.userId || (authReq.user as any)?.id || "ANONYMOUS_USER";

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        error: "Tenant context required.",
      });
    }

    const { targetPlanSlug, targetSeats } = req.body;

    if (!targetPlanSlug) {
      return res.status(400).json({
        success: false,
        error: "targetPlanSlug is required.",
      });
    }

    const result = await SubscriptionScheduleService.schedulePlanChange({
      tenantId,
      targetPlanSlug,
      userId,
      targetSeats: targetSeats ? Number(targetSeats) : undefined,
    });

    return res.json(result);
  } catch (err: any) {
    if (err instanceof SubscriptionScheduleError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        error: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to schedule plan change.",
    });
  }
});

/**
 * POST /api/commerce/subscriptions/cancel-scheduled-plan-change
 * Cancels a pending scheduled plan change.
 */
commerceRouter.post("/subscriptions/cancel-scheduled-plan-change", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const userId = authReq.user?.userId || (authReq.user as any)?.id || "ANONYMOUS_USER";

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        error: "Tenant context required.",
      });
    }

    const result = await SubscriptionScheduleService.cancelScheduledPlanChange(tenantId, userId);
    return res.json(result);
  } catch (err: any) {
    if (err instanceof SubscriptionScheduleError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        error: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to cancel scheduled plan change.",
    });
  }
});

/**
 * POST /api/commerce/admin/subscription/override
 * Controlled Super Admin immediate override with mandatory ticketReference and justification.
 */
commerceRouter.post("/admin/subscription/override", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;

    if (!isUserSuperAdmin(authReq)) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN_SUPER_ADMIN_REQUIRED",
        error: "Immediate subscription override is strictly restricted to platform Super Admins.",
      });
    }

    const {
      targetTenantId,
      targetPlanSlug,
      ticketReference,
      reason,
      financialTerms,
      targetSeats,
    } = req.body;

    if (!targetTenantId || !targetPlanSlug) {
      return res.status(400).json({
        success: false,
        error: "targetTenantId and targetPlanSlug are required.",
      });
    }

    const result = await SubscriptionScheduleService.executeSuperAdminOverride({
      superAdminUserId: authReq.user?.userId || (authReq.user as any)?.id || "SUPER_ADMIN",
      superAdminEmail: authReq.user?.email,
      targetTenantId,
      targetPlanSlug,
      ticketReference,
      reason,
      financialTerms: financialTerms || "COMPLIMENTARY",
      targetSeats: targetSeats ? Number(targetSeats) : undefined,
    });

    return res.json(result);
  } catch (err: any) {
    if (err instanceof SubscriptionScheduleError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        error: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to execute Super Admin override.",
    });
  }
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PHASE A3.6: DYNAMIC COMMERCIAL PRICING ADMINISTRATION (OD-1)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * POST /api/commerce/admin/pricing/schedules
 * Creates a new DRAFT commercial price schedule.
 */
commerceRouter.post("/admin/pricing/schedules", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;

    if (!isUserSuperAdmin(authReq)) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN_SUPER_ADMIN_REQUIRED",
        error: "Price schedule configuration is restricted to platform administrators.",
      });
    }

    const {
      productSlug,
      currency,
      amountMonthly,
      amountAnnual,
      taxPercentage,
      effectiveFrom,
      effectiveTo,
    } = req.body;

    const schedule = await DynamicPricingService.createPriceSchedule({
      productSlug,
      currency,
      amountMonthly,
      amountAnnual,
      taxPercentage,
      effectiveFrom,
      effectiveTo,
      createdBy: authReq.user?.userId || (authReq.user as any)?.id || "SUPER_ADMIN",
    });

    return res.status(201).json({
      success: true,
      schedule,
    });
  } catch (err: any) {
    if (err instanceof DynamicPricingError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        error: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to create price schedule.",
    });
  }
});

/**
 * POST /api/commerce/admin/pricing/schedules/:id/submit
 * Submits a draft schedule for approval.
 */
commerceRouter.post("/admin/pricing/schedules/:id/submit", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;

    if (!isUserSuperAdmin(authReq)) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN_SUPER_ADMIN_REQUIRED",
        error: "Price schedule configuration is restricted to platform administrators.",
      });
    }

    const schedule = await DynamicPricingService.submitForApproval(
      req.params.id,
      authReq.user?.userId || "SUPER_ADMIN"
    );

    return res.json({
      success: true,
      schedule,
    });
  } catch (err: any) {
    if (err instanceof DynamicPricingError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        error: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to submit price schedule.",
    });
  }
});

/**
 * POST /api/commerce/admin/pricing/schedules/:id/approve
 * Approves and publishes a price schedule.
 */
commerceRouter.post("/admin/pricing/schedules/:id/approve", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;

    if (!isUserSuperAdmin(authReq)) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN_SUPER_ADMIN_REQUIRED",
        error: "Price schedule approval is restricted to platform administrators.",
      });
    }

    const schedule = await DynamicPricingService.approveAndPublish(
      req.params.id,
      authReq.user?.userId || "SUPER_ADMIN"
    );

    return res.json({
      success: true,
      schedule,
    });
  } catch (err: any) {
    if (err instanceof DynamicPricingError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        error: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to approve price schedule.",
    });
  }
});

/**
 * POST /api/commerce/admin/pricing/schedules/:id/archive
 * Archives a price schedule.
 */
commerceRouter.post("/admin/pricing/schedules/:id/archive", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;

    if (!isUserSuperAdmin(authReq)) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN_SUPER_ADMIN_REQUIRED",
        error: "Price schedule management is restricted to platform administrators.",
      });
    }

    const schedule = await DynamicPricingService.archiveSchedule(
      req.params.id,
      authReq.user?.userId || "SUPER_ADMIN"
    );

    return res.json({
      success: true,
      schedule,
    });
  } catch (err: any) {
    if (err instanceof DynamicPricingError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        error: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to archive price schedule.",
    });
  }
});

/**
 * GET /api/commerce/admin/pricing/schedules
 * Lists price schedules.
 */
commerceRouter.get("/admin/pricing/schedules", requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;

    if (!isUserSuperAdmin(authReq)) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN_SUPER_ADMIN_REQUIRED",
        error: "Price schedule access is restricted to platform administrators.",
      });
    }

    const db = rawPrisma || prisma;
    const productSlug = req.query.productSlug as string | undefined;

    const schedules = await db.commercialPriceSchedule.findMany({
      where: productSlug ? { productSlug: productSlug.toLowerCase() } : undefined,
      orderBy: [{ productSlug: "asc" }, { version: "desc" }],
    });

    return res.json({
      success: true,
      count: schedules.length,
      schedules,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to list price schedules.",
    });
  }
});


