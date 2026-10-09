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
import { requireAuth, AuthRequest } from "../middleware/auth";

export const commerceRouter = Router();

/**
 * GET /api/commerce/catalog
 * Publicly browsable unified catalog with optional tenant entitlement evaluation.
 */
commerceRouter.get("/catalog", async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId || (req.query.tenantId as string) || undefined;
    const category = req.query.category as string | undefined;
    const productType = req.query.productType as string | undefined;

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

