"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.commerceRouter = void 0;
const express_1 = require("express");
const unified_catalog_service_1 = require("../services/unified-catalog.service");
const cart_calculator_service_1 = require("../services/cart-calculator.service");
const commerce_order_service_1 = require("../services/commerce-order.service");
const commerce_fulfillment_service_1 = require("../services/commerce-fulfillment.service");
const dynamic_pricing_service_1 = require("../services/dynamic-pricing.service");
const subscription_schedule_service_1 = require("../services/subscription-schedule.service");
const razorpay_sandbox_service_1 = require("../services/razorpay-sandbox.service");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
function isUserSuperAdmin(authReq) {
    return (authReq.user?.roles?.includes("super_admin") ||
        authReq.user?.roles?.includes("SUPER_ADMIN") ||
        authReq.user?.isSuperAdmin === true);
}
exports.commerceRouter = (0, express_1.Router)();
/**
 * GET /api/commerce/catalog
 * Publicly browsable unified catalog with optional tenant entitlement evaluation.
 */
exports.commerceRouter.get("/catalog", async (req, res) => {
    try {
        const authReq = req;
        const requestedTenantId = req.query.tenantId;
        const category = req.query.category;
        const productType = req.query.productType;
        // Resolve user context from request or Bearer token if present
        let authUser = authReq.user;
        if (!authUser && req.headers.authorization?.startsWith("Bearer ")) {
            try {
                const token = req.headers.authorization.split(" ")[1];
                const { verifyToken } = await Promise.resolve().then(() => __importStar(require("../lib/jwt")));
                const decoded = verifyToken(token);
                if (decoded) {
                    const userId = decoded.userId || decoded.id;
                    const db = prisma_1.rawPrisma || prisma_1.prisma;
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
            }
            catch {
                // Invalid or expired token - proceed as unauthenticated
            }
        }
        let tenantId = undefined;
        if (authUser) {
            const isSuper = authUser.roles?.includes("super_admin") ||
                authUser.roles?.includes("SUPER_ADMIN") ||
                authUser.isSuperAdmin === true;
            if (isSuper) {
                // Super admin may explicitly inspect another tenant's catalog or default to their own
                tenantId = requestedTenantId || authUser.tenantId || undefined;
            }
            else {
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
        }
        else {
            // Unauthenticated caller: generic public catalog by default; or previewing for a specific tenantId if requested
            tenantId = requestedTenantId || undefined;
        }
        const catalog = await unified_catalog_service_1.UnifiedCatalogService.getCatalog({
            tenantId,
            isPublicOnly: true,
            category,
            productType,
        });
        return res.json({
            success: true,
            ...catalog,
        });
    }
    catch (err) {
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
exports.commerceRouter.post("/cart/calculate", async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.user?.tenantId || req.body.tenantId || undefined;
        const { items, couponCode, taxDetails } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Cart must contain at least one item.",
            });
        }
        const calculation = await cart_calculator_service_1.CartCalculatorService.calculate({
            items,
            couponCode,
            tenantId,
            taxDetails,
        });
        return res.json(calculation);
    }
    catch (err) {
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
exports.commerceRouter.post("/orders", auth_1.requireAuth, async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.user?.tenantId;
        const userId = authReq.user?.userId || authReq.user?.id;
        if (!tenantId) {
            return res.status(403).json({
                success: false,
                error: "Tenant context is required to create a commerce order.",
            });
        }
        const { items, couponCode, taxDetails } = req.body;
        const idempotencyKey = req.headers["idempotency-key"] || req.body.idempotencyKey || null;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Order must contain at least one line item.",
            });
        }
        const result = await commerce_order_service_1.CommerceOrderService.createOrder({
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
    }
    catch (err) {
        if (err instanceof commerce_order_service_1.CommerceOrderError) {
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
exports.commerceRouter.get("/orders/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({
                success: false,
                error: "Tenant context required.",
            });
        }
        const order = await commerce_order_service_1.CommerceOrderService.getOrderById(tenantId, req.params.id);
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
    }
    catch (err) {
        if (err instanceof commerce_order_service_1.CommerceOrderError) {
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
exports.commerceRouter.post("/orders/:id/cancel", auth_1.requireAuth, async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({
                success: false,
                error: "Tenant context required.",
            });
        }
        const order = await commerce_order_service_1.CommerceOrderService.cancelOrder(tenantId, req.params.id, req.body.reason);
        return res.json({
            success: true,
            order,
        });
    }
    catch (err) {
        if (err instanceof commerce_order_service_1.CommerceOrderError) {
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
exports.commerceRouter.post("/checkout/simulate", auth_1.requireAuth, async (req, res) => {
    try {
        if ((0, commerce_order_service_1.isCommerceSimulationProhibited)()) {
            return res.status(403).json({
                success: false,
                code: "SIMULATION_PROHIBITED",
                error: "Simulated checkout is strictly disabled in production and production-like deployment configurations.",
            });
        }
        const authReq = req;
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
        const result = await commerce_order_service_1.CommerceOrderService.simulatePaymentSettlement(tenantId, orderId, outcomeVal, notes);
        return res.json({
            success: result.success,
            isReplay: result.isReplay,
            order: result.order,
            disclaimer: "NON-MONETARY SIMULATION — FOR TEST PURPOSES ONLY",
            gatewayProvider: "SIMULATED_SANDBOX",
            error: result.error,
        });
    }
    catch (err) {
        if (err instanceof commerce_order_service_1.CommerceOrderError) {
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
exports.commerceRouter.post("/checkout/initiate", auth_1.requireAuth, async (req, res) => {
    try {
        const authReq = req;
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
        const result = await commerce_order_service_1.CommerceOrderService.initiateRazorpayCheckout(tenantId, orderId, {
            name: authReq.user?.name,
            email: authReq.user?.email,
        });
        return res.json({
            success: true,
            ...result,
        });
    }
    catch (err) {
        if (err instanceof commerce_order_service_1.CommerceOrderError) {
            return res.status(err.statusCode).json({
                success: false,
                code: err.code,
                error: err.message,
            });
        }
        if (err instanceof razorpay_sandbox_service_1.RazorpaySandboxError) {
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
exports.commerceRouter.post("/webhook", async (req, res) => {
    try {
        const signature = req.headers["x-razorpay-signature"] || "";
        // Fail closed: Signature header required
        if (!signature) {
            return res.status(400).json({
                success: false,
                code: "INVALID_SIGNATURE",
                error: "Missing x-razorpay-signature header.",
            });
        }
        // Extract raw body
        const rawReq = req;
        let rawBody;
        if (Buffer.isBuffer(rawReq.rawBody)) {
            rawBody = rawReq.rawBody;
        }
        else if (Buffer.isBuffer(req.body)) {
            rawBody = req.body;
        }
        else if (typeof req.body === "string") {
            rawBody = req.body;
        }
        else {
            rawBody = JSON.stringify(req.body || {});
        }
        // Timing-safe cryptographic HMAC-SHA256 signature verification
        const isSigValid = razorpay_sandbox_service_1.RazorpaySandboxService.verifyWebhookSignature(rawBody, signature);
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
        const result = await commerce_order_service_1.CommerceOrderService.settleRazorpayWebhook(eventPayload);
        if (result.isReplay) {
            res.setHeader("X-Idempotent-Replay", "true");
        }
        return res.json({
            success: true,
            isReplay: result.isReplay,
            orderId: result.orderId,
            message: result.message || "Webhook processed successfully.",
        });
    }
    catch (err) {
        if (err instanceof razorpay_sandbox_service_1.RazorpaySandboxError) {
            return res.status(err.statusCode).json({
                success: false,
                code: err.code,
                error: err.message,
            });
        }
        if (err instanceof commerce_order_service_1.CommerceOrderError) {
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
exports.commerceRouter.post("/outbox/sweep", auth_1.requireAuth, async (req, res) => {
    try {
        const authReq = req;
        const isSuperAdmin = authReq.user?.roles?.includes("super_admin") ||
            authReq.user?.roles?.includes("SUPER_ADMIN") ||
            authReq.user?.isSuperAdmin === true;
        if (!isSuperAdmin) {
            return res.status(403).json({
                success: false,
                code: "UNAUTHORIZED_OPERATOR",
                error: "Outbox processing trigger is restricted to platform operators.",
            });
        }
        const batchSize = req.body?.batchSize ? Number(req.body.batchSize) : 10;
        const workerId = req.body?.workerId || "OPERATOR_MANUAL_TRIGGER";
        const result = await commerce_fulfillment_service_1.CommerceFulfillmentService.processOutboxBatch({
            batchSize,
            workerId,
        });
        return res.json({
            success: true,
            ...result,
        });
    }
    catch (err) {
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
exports.commerceRouter.get("/invoices", auth_1.requireAuth, async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({
                success: false,
                error: "Tenant context required.",
            });
        }
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        const invoices = await db.billingInvoice.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
        });
        return res.json({
            success: true,
            count: invoices.length,
            invoices,
        });
    }
    catch (err) {
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
exports.commerceRouter.get("/invoices/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({
                success: false,
                error: "Tenant context required.",
            });
        }
        const db = prisma_1.rawPrisma || prisma_1.prisma;
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
    }
    catch (err) {
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
exports.commerceRouter.get("/subscriptions/current", auth_1.requireAuth, async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({
                success: false,
                error: "Tenant context required.",
            });
        }
        const db = prisma_1.rawPrisma || prisma_1.prisma;
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
    }
    catch (err) {
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
exports.commerceRouter.post("/subscriptions/schedule-plan-change", auth_1.requireAuth, async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.user?.tenantId;
        const userId = authReq.user?.userId || authReq.user?.id || "ANONYMOUS_USER";
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
        const result = await subscription_schedule_service_1.SubscriptionScheduleService.schedulePlanChange({
            tenantId,
            targetPlanSlug,
            userId,
            targetSeats: targetSeats ? Number(targetSeats) : undefined,
        });
        return res.json(result);
    }
    catch (err) {
        if (err instanceof subscription_schedule_service_1.SubscriptionScheduleError) {
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
exports.commerceRouter.post("/subscriptions/cancel-scheduled-plan-change", auth_1.requireAuth, async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.user?.tenantId;
        const userId = authReq.user?.userId || authReq.user?.id || "ANONYMOUS_USER";
        if (!tenantId) {
            return res.status(403).json({
                success: false,
                error: "Tenant context required.",
            });
        }
        const result = await subscription_schedule_service_1.SubscriptionScheduleService.cancelScheduledPlanChange(tenantId, userId);
        return res.json(result);
    }
    catch (err) {
        if (err instanceof subscription_schedule_service_1.SubscriptionScheduleError) {
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
exports.commerceRouter.post("/admin/subscription/override", auth_1.requireAuth, async (req, res) => {
    try {
        const authReq = req;
        if (!isUserSuperAdmin(authReq)) {
            return res.status(403).json({
                success: false,
                code: "FORBIDDEN_SUPER_ADMIN_REQUIRED",
                error: "Immediate subscription override is strictly restricted to platform Super Admins.",
            });
        }
        const { targetTenantId, targetPlanSlug, ticketReference, reason, financialTerms, targetSeats, } = req.body;
        if (!targetTenantId || !targetPlanSlug) {
            return res.status(400).json({
                success: false,
                error: "targetTenantId and targetPlanSlug are required.",
            });
        }
        const result = await subscription_schedule_service_1.SubscriptionScheduleService.executeSuperAdminOverride({
            superAdminUserId: authReq.user?.userId || authReq.user?.id || "SUPER_ADMIN",
            superAdminEmail: authReq.user?.email,
            targetTenantId,
            targetPlanSlug,
            ticketReference,
            reason,
            financialTerms: financialTerms || "COMPLIMENTARY",
            targetSeats: targetSeats ? Number(targetSeats) : undefined,
        });
        return res.json(result);
    }
    catch (err) {
        if (err instanceof subscription_schedule_service_1.SubscriptionScheduleError) {
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
exports.commerceRouter.post("/admin/pricing/schedules", auth_1.requireAuth, async (req, res) => {
    try {
        const authReq = req;
        if (!isUserSuperAdmin(authReq)) {
            return res.status(403).json({
                success: false,
                code: "FORBIDDEN_SUPER_ADMIN_REQUIRED",
                error: "Price schedule configuration is restricted to platform administrators.",
            });
        }
        const { productSlug, currency, amountMonthly, amountAnnual, taxPercentage, effectiveFrom, effectiveTo, } = req.body;
        const schedule = await dynamic_pricing_service_1.DynamicPricingService.createPriceSchedule({
            productSlug,
            currency,
            amountMonthly,
            amountAnnual,
            taxPercentage,
            effectiveFrom,
            effectiveTo,
            createdBy: authReq.user?.userId || authReq.user?.id || "SUPER_ADMIN",
        });
        return res.status(201).json({
            success: true,
            schedule,
        });
    }
    catch (err) {
        if (err instanceof dynamic_pricing_service_1.DynamicPricingError) {
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
exports.commerceRouter.post("/admin/pricing/schedules/:id/submit", auth_1.requireAuth, async (req, res) => {
    try {
        const authReq = req;
        if (!isUserSuperAdmin(authReq)) {
            return res.status(403).json({
                success: false,
                code: "FORBIDDEN_SUPER_ADMIN_REQUIRED",
                error: "Price schedule configuration is restricted to platform administrators.",
            });
        }
        const schedule = await dynamic_pricing_service_1.DynamicPricingService.submitForApproval(req.params.id, authReq.user?.userId || "SUPER_ADMIN");
        return res.json({
            success: true,
            schedule,
        });
    }
    catch (err) {
        if (err instanceof dynamic_pricing_service_1.DynamicPricingError) {
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
exports.commerceRouter.post("/admin/pricing/schedules/:id/approve", auth_1.requireAuth, async (req, res) => {
    try {
        const authReq = req;
        if (!isUserSuperAdmin(authReq)) {
            return res.status(403).json({
                success: false,
                code: "FORBIDDEN_SUPER_ADMIN_REQUIRED",
                error: "Price schedule approval is restricted to platform administrators.",
            });
        }
        const schedule = await dynamic_pricing_service_1.DynamicPricingService.approveAndPublish(req.params.id, authReq.user?.userId || "SUPER_ADMIN");
        return res.json({
            success: true,
            schedule,
        });
    }
    catch (err) {
        if (err instanceof dynamic_pricing_service_1.DynamicPricingError) {
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
exports.commerceRouter.post("/admin/pricing/schedules/:id/archive", auth_1.requireAuth, async (req, res) => {
    try {
        const authReq = req;
        if (!isUserSuperAdmin(authReq)) {
            return res.status(403).json({
                success: false,
                code: "FORBIDDEN_SUPER_ADMIN_REQUIRED",
                error: "Price schedule management is restricted to platform administrators.",
            });
        }
        const schedule = await dynamic_pricing_service_1.DynamicPricingService.archiveSchedule(req.params.id, authReq.user?.userId || "SUPER_ADMIN");
        return res.json({
            success: true,
            schedule,
        });
    }
    catch (err) {
        if (err instanceof dynamic_pricing_service_1.DynamicPricingError) {
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
exports.commerceRouter.get("/admin/pricing/schedules", auth_1.requireAuth, async (req, res) => {
    try {
        const authReq = req;
        if (!isUserSuperAdmin(authReq)) {
            return res.status(403).json({
                success: false,
                code: "FORBIDDEN_SUPER_ADMIN_REQUIRED",
                error: "Price schedule access is restricted to platform administrators.",
            });
        }
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        const productSlug = req.query.productSlug;
        const schedules = await db.commercialPriceSchedule.findMany({
            where: productSlug ? { productSlug: productSlug.toLowerCase() } : undefined,
            orderBy: [{ productSlug: "asc" }, { version: "desc" }],
        });
        return res.json({
            success: true,
            count: schedules.length,
            schedules,
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message || "Failed to list price schedules.",
        });
    }
});
