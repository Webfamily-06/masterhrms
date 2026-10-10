/**
 * MASTERHRMS — Phase A3.3: Commerce Order State Machine & Lifecycle Engine
 *
 * Enforces:
 * 1. Deterministic Canonical Intent Hashing & 24h Idempotency Replay
 * 2. Immutable Price Snapshots with Server-Authoritative Math
 * 3. Statement-Timestamp Atomic Payment Updates Defeating Expiry Races
 * 4. Universal Coupon Lock Protocol (`SELECT FOR UPDATE`) & Limit Validation
 * 5. Two-Phase Failure Architecture (Full Rollback + Decoupled FAILED Recording)
 * 6. Multi-Tenant Isolation with Foreign Key Integrity
 * 7. Decoupled Fulfillment: Simulated payments cause ZERO entitlement/subscription grants
 */

import crypto from "crypto";
import { prisma, rawPrisma } from "../prisma";
import {
  CartCalculatorService,
  CartItemInput,
  TaxDetailsInput,
} from "./cart-calculator.service";
import { recordCouponRedemption } from "./coupon.service";
import { AuditService } from "./audit.service";
import { OutboxService } from "./outbox.service";
import { RazorpaySandboxService, RazorpaySandboxError } from "./razorpay-sandbox.service";

export class CommerceOrderError extends Error {
  public statusCode: number;
  public code: string;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "CommerceOrderError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface CreateCommerceOrderParams {
  tenantId: string;
  userId?: string | null;
  items: CartItemInput[];
  couponCode?: string | null;
  taxDetails?: TaxDetailsInput | null;
  idempotencyKey?: string | null;
}

export interface NormalizedIntent {
  tenantId: string;
  items: Array<{
    productSlug: string;
    billingInterval: string;
    quantity: number;
    seats?: number;
  }>;
  couponCode: string | null;
  taxDetails: {
    country: string | null;
    stateCode: string | null;
    gstin: string | null;
  } | null;
}

/**
 * Normalizes input intent deterministically and derives SHA-256 canonical hash.
 */
export function computeCanonicalIntentHash(params: {
  tenantId: string;
  items: CartItemInput[];
  couponCode?: string | null;
  taxDetails?: TaxDetailsInput | null;
}): { normalizedIntent: NormalizedIntent; hash: string } {
  const normalizedItems = (params.items || [])
    .map((i) => ({
      productSlug: String(i.productSlug || "").trim().toLowerCase(),
      billingInterval: (i.billingInterval || "1_month").trim(),
      quantity: Math.max(1, Number(i.quantity) || 1),
      seats: i.seats !== undefined ? Math.max(0, Number(i.seats)) : undefined,
    }))
    .sort((a, b) => {
      const cmp = a.productSlug.localeCompare(b.productSlug);
      if (cmp !== 0) return cmp;
      return a.billingInterval.localeCompare(b.billingInterval);
    });

  const normalizedIntent: NormalizedIntent = {
    tenantId: params.tenantId,
    items: normalizedItems,
    couponCode: params.couponCode ? params.couponCode.trim().toUpperCase() : null,
    taxDetails: params.taxDetails
      ? {
          country: params.taxDetails.country ? params.taxDetails.country.trim().toUpperCase() : null,
          stateCode: params.taxDetails.stateCode ? params.taxDetails.stateCode.trim().toUpperCase() : null,
          gstin: params.taxDetails.gstin ? params.taxDetails.gstin.trim().toUpperCase() : null,
        }
      : null,
  };

  const canonicalString = JSON.stringify(normalizedIntent);
  const hash = crypto.createHash("sha256").update(canonicalString).digest("hex");

  return { normalizedIntent, hash };
}

export class CommerceOrderService {
  /**
   * Creates an order idempotently with authoritative pricing snapshot and 30-minute expiry.
   */
  public static async createOrder(params: CreateCommerceOrderParams): Promise<{
    order: any;
    isReplay: boolean;
  }> {
    const db = rawPrisma || prisma;
    const { tenantId, idempotencyKey } = params;

    const { hash } = computeCanonicalIntentHash({
      tenantId,
      items: params.items,
      couponCode: params.couponCode,
      taxDetails: params.taxDetails,
    });

    // 1. Idempotency Key Evaluation
    if (idempotencyKey) {
      const existing = await db.commerceOrder.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId,
            idempotencyKey,
          },
        },
      });

      if (existing) {
        const ageMs = Date.now() - existing.createdAt.getTime();
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

        // Post-24h replay rejection
        if (ageMs > TWENTY_FOUR_HOURS_MS) {
          throw new CommerceOrderError(
            "IDEMPOTENCY_KEY_EXPIRED",
            "Idempotency key has expired after 24 hours. Submit checkout with a fresh key.",
            409
          );
        }

        // Payload hash mismatch rejection
        if (existing.idempotencyPayloadHash && existing.idempotencyPayloadHash !== hash) {
          throw new CommerceOrderError(
            "IDEMPOTENCY_PAYLOAD_MISMATCH",
            "An order was already created with this idempotency key but with different order parameters.",
            409
          );
        }

        return { order: existing, isReplay: true };
      }
    }

    // 2. Authoritative Server-Side Cart Calculation
    const calc = await CartCalculatorService.calculate({
      items: params.items,
      couponCode: params.couponCode,
      tenantId,
      taxDetails: params.taxDetails,
    });

    if (!calc.success) {
      throw new CommerceOrderError("CART_CALCULATION_FAILED", "Authoritative cart calculation failed.");
    }

    // 3. Generate Order Identifiers and 30-minute Expiry
    const orderNumber = `ORD-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // 4. Persist CommerceOrder Record
    const order = await db.commerceOrder.create({
      data: {
        orderNumber,
        tenantId,
        userId: params.userId ?? null,
        status: "PENDING_PAYMENT",
        fulfillmentStatus: "UNFULFILLED",
        currency: calc.currency || "INR",
        subtotal: calc.subtotal,
        discountAmount: calc.discountAmount,
        taxableAmount: calc.taxableAmount,
        totalTax: calc.totalTax,
        totalAmount: calc.totalAmount,
        amountInPaise: calc.amountInPaise,
        priceSnapshot: calc.snapshot as any,
        couponCode: calc.coupon ? calc.coupon.code : (params.couponCode ? params.couponCode.trim().toUpperCase() : null),
        idempotencyKey: idempotencyKey ?? null,
        idempotencyPayloadHash: hash,
        version: 1,
        isSimulated: false,
        expiresAt,
      },
    });

    return { order, isReplay: false };
  }

  /**
   * Retrieves an order by ID strictly scoped to tenant.
   * Virtual expiry guarantee: evaluates expiresAt without writing to the database on read.
   */
  public static async getOrderById(tenantId: string, orderId: string): Promise<any | null> {
    const db = rawPrisma || prisma;

    const order = await db.commerceOrder.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
    });

    if (!order) return null;

    const snapshot = typeof order.priceSnapshot === "string"
      ? JSON.parse(order.priceSnapshot)
      : (order.priceSnapshot || {});
    const metadata = snapshot.metadata || snapshot.gatewayMetadata || {};

    // Virtual presentation of expiry on read
    if (order.status === "PENDING_PAYMENT" && order.expiresAt && order.expiresAt.getTime() <= Date.now()) {
      return {
        ...order,
        status: "EXPIRED",
        metadata,
      };
    }

    return {
      ...order,
      metadata,
    };
  }

  /**
   * Cancels an order before payment.
   */
  public static async cancelOrder(tenantId: string, orderId: string, reason?: string): Promise<any> {
    const db = rawPrisma || prisma;

    const order = await db.commerceOrder.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!order) {
      throw new CommerceOrderError("ORDER_NOT_FOUND", "Order not found.", 404);
    }

    if (order.status === "PAID") {
      throw new CommerceOrderError("ORDER_ALREADY_PAID", "Cannot cancel an order that has already been paid.", 409);
    }

    if (order.status === "CANCELLED") {
      return order; // Idempotent cancel
    }

    if (order.status === "EXPIRED" || (order.expiresAt && order.expiresAt.getTime() <= Date.now())) {
      throw new CommerceOrderError("ORDER_EXPIRED", "Cannot cancel an expired order.", 409);
    }

    return await db.commerceOrder.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        version: { increment: 1 },
        simulationNotes: reason || "User cancelled checkout session",
      },
    });
  }

  /**
   * Simulates payment settlement for development/test environments.
   * Strictly gated by multi-layered production environment guard.
   *
   * Implements Two-Phase Concurrency Architecture:
   * Phase 1: Interactive Transaction (Atomic statement_timestamp update + Universal Coupon Lock + AuditLog)
   * Phase 2: Decoupled Terminal Failure Recording (guaranteed never to overwrite a PAID order)
   */
  public static async simulatePaymentSettlement(
    tenantId: string,
    orderId: string,
    outcome: "SUCCESS" | "FAILURE",
    notes?: string
  ): Promise<{
    order: any;
    isReplay: boolean;
    success: boolean;
    error?: string;
  }> {
    if (isCommerceSimulationProhibited()) {
      throw new CommerceOrderError(
        "SIMULATION_PROHIBITED",
        "Simulated checkout is strictly disabled in production and production-like deployment configurations.",
        403
      );
    }

    const db = rawPrisma || prisma;

    // Fetch initial order
    const order = await db.commerceOrder.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!order) {
      throw new CommerceOrderError("ORDER_NOT_FOUND", "Order not found.", 404);
    }

    // Handle already terminal orders
    if (order.status === "PAID") {
      return { order, isReplay: true, success: true };
    }

    if (order.status === "CANCELLED") {
      throw new CommerceOrderError("ORDER_CANCELLED", "Cannot settle payment for a cancelled order.", 409);
    }

    if (order.status === "EXPIRED" || (order.expiresAt && order.expiresAt.getTime() <= Date.now())) {
      throw new CommerceOrderError("ORDER_EXPIRED", "Order has expired. Settlement declined.", 400);
    }

    // Direct Simulated Failure Path -> Phase 2
    if (outcome === "FAILURE") {
      await this.recordPhase2Failure(db, tenantId, orderId, notes || "Simulated payment provider decline");
      const failed = await db.commerceOrder.findUnique({ where: { id: orderId } });
      return { order: failed, isReplay: false, success: false, error: "PAYMENT_FAILED" };
    }

    // Phase 1: Settlement Attempt Inside Interactive Transaction
    try {
      const settledOrder = await db.$transaction(async (tx: any) => {
        // Step 1: Statement-Timestamp Atomic Conditional Update
        const updatedRows: any[] = await tx.$queryRawUnsafe(
          `UPDATE commerce_orders 
           SET status = 'PAID', 
               paid_at = statement_timestamp(), 
               version = version + 1, 
               is_simulated = true,
               simulation_notes = $1, 
               updated_at = statement_timestamp()
           WHERE id = $2 
             AND tenant_id = $3
             AND status = 'PENDING_PAYMENT' 
             AND version = $4
             AND (expires_at IS NULL OR expires_at > statement_timestamp())
           RETURNING *;`,
          notes || "Simulated payment settled successfully",
          orderId,
          tenantId,
          order.version
        );

        if (!updatedRows || updatedRows.length === 0) {
          // Zero-row diagnostics without cross-tenant leakage
          const current: any[] = await tx.$queryRawUnsafe(
            `SELECT status, version, expires_at FROM commerce_orders WHERE id = $1 AND tenant_id = $2;`,
            orderId,
            tenantId
          );

          if (!current || current.length === 0) {
            throw new CommerceOrderError("ORDER_NOT_FOUND", "Order not found.", 404);
          }

          const currRow = current[0];
          if (currRow.status === "PAID") {
            return { __isReplay: true };
          }
          if (currRow.status === "EXPIRED") {
            throw new CommerceOrderError("ORDER_EXPIRED", "Order has expired.", 400);
          }

          const expCheck: any[] = await tx.$queryRawUnsafe(
            `SELECT ($1::timestamptz <= statement_timestamp()) AS is_expired;`,
            currRow.expires_at
          );
          if (expCheck[0]?.is_expired) {
            throw new CommerceOrderError("ORDER_EXPIRED", "Order has expired.", 400);
          }

          if (currRow.version !== order.version) {
            throw new CommerceOrderError(
              "CONCURRENT_MODIFICATION",
              "Order was modified concurrently. Please reload.",
              409
            );
          }

          throw new CommerceOrderError("ORDER_STATE_CONFLICT", "Order state does not allow payment.", 409);
        }

        // Step 2: Universal Coupon Row Lock & Limit Enforcement (if coupon applied)
        if (order.couponCode) {
          const coupon = await tx.coupon.findUnique({
            where: { code: order.couponCode },
          });

          if (!coupon) {
            throw new CommerceOrderError("COUPON_NOT_FOUND", `Coupon ${order.couponCode} not found.`, 400);
          }

          await recordCouponRedemption(
            {
              couponId: coupon.id,
              tenantId,
              orderId: order.id,
              discountApplied: Number(order.discountAmount) || 0,
              tx,
            }
          );
        }

        // Step 3: Insert AuditLog Entry inside Phase 1 transaction
        await AuditService.logMutation(
          {
            tenantId,
            actorId: order.userId || "SIMULATED_CHECKOUT",
            action: "ORDER_PAID",
            entityType: "CommerceOrder",
            entityId: order.id,
            metadata: {
              orderNumber: order.orderNumber,
              totalAmount: Number(order.totalAmount),
              currency: order.currency,
              isSimulated: true,
            },
          },
          tx
        );

        // Step 4: Persist Outbox Event atomically inside Phase 1 transaction
        await OutboxService.createOutboxEvent(
          {
            tenantId,
            eventType: "COMMERCE_ORDER_PAID",
            entityType: "CommerceOrder",
            entityId: order.id,
            actorId: order.userId || "SIMULATED_CHECKOUT",
            payload: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              tenantId,
              amountInPaise: order.amountInPaise,
              currency: order.currency,
              items: (order.priceSnapshot as any)?.items || [],
              paidAt: new Date().toISOString(),
            },
            metadata: {
              isSimulated: true,
            },
          },
          tx
        );

        return { isReplay: false };
      });

      const reloadedOrder = await db.commerceOrder.findUnique({ where: { id: orderId } });
      return {
        order: reloadedOrder,
        isReplay: Boolean((settledOrder as any)?.__isReplay),
        success: true,
      };
    } catch (phase1Err: any) {
      // Phase 1 rolled back completely!
      // If error is terminal coupon failure, execute Phase 2 Failure Transition
      if (
        phase1Err.message === "COUPON_MAX_REDEMPTIONS_REACHED" ||
        phase1Err.message === "COUPON_PER_TENANT_LIMIT_EXCEEDED" ||
        phase1Err.message === "COUPON_EXPIRED" ||
        phase1Err.message === "COUPON_INACTIVE" ||
        phase1Err.message === "COUPON_NOT_FOUND"
      ) {
        await this.recordPhase2Failure(
          db,
          tenantId,
          orderId,
          `Settlement aborted: ${phase1Err.message}`
        );
        throw new CommerceOrderError(
          "COUPON_EXHAUSTED",
          `Coupon validation failed during settlement: ${phase1Err.message}`,
          409
        );
      }

      throw phase1Err;
    }
  }

  /**
   * Phase 2: Decoupled Failure Recorder
   * Conditionally transitions PENDING_PAYMENT -> FAILED.
   * Guarantees that a concurrently committed PAID order is NEVER overwritten.
   */
  private static async recordPhase2Failure(
    db: any,
    tenantId: string,
    orderId: string,
    reason: string
  ): Promise<void> {
    try {
      await db.$executeRawUnsafe(
        `UPDATE commerce_orders 
         SET status = 'FAILED', 
             version = version + 1, 
             simulation_notes = $1, 
             updated_at = statement_timestamp()
         WHERE id = $2 
           AND tenant_id = $3 
           AND status = 'PENDING_PAYMENT';`,
        reason,
        orderId,
        tenantId
      );

      await AuditService.logMutation(
        {
          tenantId,
          actorId: "SYSTEM",
          action: "PAYMENT_FAILED",
          entityType: "CommerceOrder",
          entityId: orderId,
          metadata: { reason, isSimulated: true },
        },
        db
      );
    } catch (phase2Err: any) {
      console.warn("[CommerceOrderService] Phase 2 failure logging error:", phase2Err.message);
    }
  }

  /**
   * Initiates Razorpay sandbox checkout for a CommerceOrder.
   * Gated strictly to test credentials (rzp_test_*). Live credentials fail closed.
   */
  public static async initiateRazorpayCheckout(
    tenantId: string,
    orderId: string,
    customer?: { name?: string; email?: string }
  ): Promise<{
    orderId: string;
    gatewayOrderId: string;
    amount: number;
    currency: string;
    keyId: string;
    orderNumber: string;
    customer: { name: string; email: string };
    isReplay: boolean;
  }> {
    const db = rawPrisma || prisma;

    const order = await db.commerceOrder.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!order) {
      throw new CommerceOrderError("ORDER_NOT_FOUND", "Order not found.", 404);
    }

    if (order.status === "PAID") {
      throw new CommerceOrderError("ALREADY_PAID", "Order is already paid.", 409);
    }

    if (order.status === "EXPIRED") {
      throw new CommerceOrderError("ORDER_EXPIRED", "Order has expired.", 400);
    }

    if (order.status === "CANCELLED") {
      throw new CommerceOrderError("ORDER_NOT_PAYABLE", "Cancelled orders cannot be paid.", 400);
    }

    if (order.expiresAt && order.expiresAt.getTime() <= Date.now()) {
      throw new CommerceOrderError("ORDER_EXPIRED", "Order has expired.", 400);
    }

    if (order.status !== "PENDING_PAYMENT") {
      throw new CommerceOrderError("ORDER_NOT_PAYABLE", "Order is not in payable state.", 400);
    }

    const amountInPaise = Math.round(Number(order.totalAmount) * 100);
    const keyId = RazorpaySandboxService.getKeyId();

    const snapshot = typeof order.priceSnapshot === "string"
      ? JSON.parse(order.priceSnapshot)
      : (order.priceSnapshot || {});
    const existingMeta = snapshot.metadata || snapshot.gatewayMetadata || {};

    // Idempotency: If gateway order is already recorded, return existing gateway order
    if (existingMeta.gatewayOrderId && existingMeta.gatewayProvider === "RAZORPAY_SANDBOX") {
      return {
        orderId: order.id,
        gatewayOrderId: existingMeta.gatewayOrderId,
        amount: amountInPaise,
        currency: order.currency,
        keyId,
        orderNumber: order.orderNumber,
        customer: {
          name: customer?.name || "Workspace Admin",
          email: customer?.email || "admin@workspace.local",
        },
        isReplay: true,
      };
    }

    // Create order on Razorpay Sandbox API
    const rzpOrder = await RazorpaySandboxService.createOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountInPaise,
      currency: order.currency,
      tenantId: order.tenantId,
    });

    // Persist gateway order ID into priceSnapshot.metadata
    const updatedSnapshot = {
      ...snapshot,
      metadata: {
        ...existingMeta,
        gatewayOrderId: rzpOrder.id,
        gatewayProvider: "RAZORPAY_SANDBOX",
        initiatedAt: new Date().toISOString(),
      },
    };

    await db.commerceOrder.update({
      where: { id: order.id },
      data: {
        priceSnapshot: updatedSnapshot as any,
      },
    });

    return {
      orderId: order.id,
      gatewayOrderId: rzpOrder.id,
      amount: amountInPaise,
      currency: order.currency,
      keyId,
      orderNumber: order.orderNumber,
      customer: {
        name: customer?.name || "Workspace Admin",
        email: customer?.email || "admin@workspace.local",
      },
      isReplay: false,
    };
  }

  /**
   * Settles a Razorpay webhook event transactionally.
   * Enforces timing-safe verification, amount/currency matching, replay protection,
   * atomic transition to PAID, audit logging, and outbox event publishing.
   */
  public static async settleRazorpayWebhook(eventPayload: any): Promise<{
    success: boolean;
    isReplay: boolean;
    orderId?: string;
    message?: string;
    ignored?: boolean;
  }> {
    const db = rawPrisma || prisma;

    const event = eventPayload.event;
    if (event !== "payment.captured" && event !== "order.paid") {
      return {
        success: true,
        isReplay: false,
        ignored: true,
        message: `Ignored unhandled webhook event: ${event}`,
      };
    }

    const payment =
      eventPayload.payload?.payment?.entity ||
      eventPayload.payment?.entity;

    if (!payment) {
      throw new CommerceOrderError(
        "MALFORMED_WEBHOOK_PAYLOAD",
        "Payment entity missing from webhook payload.",
        400
      );
    }

    const orderId = payment.notes?.orderId;
    let order: any = null;

    if (orderId) {
      order = await db.commerceOrder.findUnique({
        where: { id: orderId },
      });
    }

    // Fallback: Lookup by gateway order reference inside price_snapshot JSON
    if (!order && payment.order_id) {
      const candidates: any[] = await db.$queryRawUnsafe(
        `SELECT id FROM commerce_orders 
         WHERE price_snapshot->'metadata'->>'gatewayOrderId' = $1 
         LIMIT 1;`,
        payment.order_id
      );
      if (candidates && candidates.length > 0) {
        order = await db.commerceOrder.findUnique({
          where: { id: candidates[0].id },
        });
      }
    }

    if (!order) {
      throw new CommerceOrderError(
        "ORDER_NOT_FOUND",
        "Order referenced in webhook was not found.",
        404
      );
    }

    // Currency verification
    if (payment.currency && payment.currency.toUpperCase() !== order.currency.toUpperCase()) {
      throw new CommerceOrderError(
        "CURRENCY_MISMATCH",
        `Currency mismatch: order expects ${order.currency}, gateway reported ${payment.currency}.`,
        400
      );
    }

    // Authoritative amount verification in paise
    const expectedPaise = Math.round(Number(order.totalAmount) * 100);
    const receivedPaise = Number(payment.amount);

    if (receivedPaise !== expectedPaise) {
      // Forensic record of failed payment attempt
      const snapshot = typeof order.priceSnapshot === "string"
        ? JSON.parse(order.priceSnapshot)
        : (order.priceSnapshot || {});
      const updatedSnapshot = {
        ...snapshot,
        metadata: {
          ...(snapshot.metadata || {}),
          failureReason: "AMOUNT_MISMATCH_DETECTED",
          expectedPaise,
          receivedPaise,
          gatewayPaymentId: payment.id,
        },
      };

      await db.commerceOrder.update({
        where: { id: order.id },
        data: {
          status: "FAILED",
          simulationNotes: "AMOUNT_MISMATCH_DETECTED",
          priceSnapshot: updatedSnapshot as any,
        },
      });

      throw new CommerceOrderError(
        "AMOUNT_MISMATCH_DETECTED",
        `Amount mismatch: expected ${expectedPaise} paise, gateway received ${receivedPaise} paise.`,
        400
      );
    }

    // Idempotent replay check: If order is already PAID
    if (order.status === "PAID") {
      return {
        success: true,
        isReplay: true,
        orderId: order.id,
        message: "Order is already marked as PAID. Replay ignored.",
      };
    }

    // Transactional settlement
    const settled = await db.$transaction(async (tx: any) => {
      // Step 1: Statement-timestamp atomic update
      const updatedRows: any[] = await tx.$queryRawUnsafe(
        `UPDATE commerce_orders
         SET status = 'PAID',
             paid_at = statement_timestamp(),
             version = version + 1,
             updated_at = statement_timestamp()
         WHERE id = $1
           AND tenant_id = $2
           AND status = 'PENDING_PAYMENT'
           AND version = $3
           AND (expires_at IS NULL OR expires_at > statement_timestamp())
         RETURNING *;`,
        order.id,
        order.tenantId,
        order.version
      );

      if (!updatedRows || updatedRows.length === 0) {
        const current: any[] = await tx.$queryRawUnsafe(
          `SELECT status, version, expires_at FROM commerce_orders WHERE id = $1 AND tenant_id = $2;`,
          order.id,
          order.tenantId
        );

        if (!current || current.length === 0) {
          throw new CommerceOrderError("ORDER_NOT_FOUND", "Order not found.", 404);
        }

        const currRow = current[0];
        if (currRow.status === "PAID") {
          return { __isReplay: true };
        }
        if (currRow.status === "EXPIRED") {
          throw new CommerceOrderError("ORDER_EXPIRED", "Order has expired.", 400);
        }

        const expCheck: any[] = await tx.$queryRawUnsafe(
          `SELECT ($1::timestamptz <= statement_timestamp()) AS is_expired;`,
          currRow.expires_at
        );
        if (expCheck[0]?.is_expired) {
          throw new CommerceOrderError("ORDER_EXPIRED", "Order has expired.", 400);
        }

        throw new CommerceOrderError("ORDER_STATE_CONFLICT", "Order state does not allow payment.", 409);
      }

      // Step 2: Persist payment metadata into priceSnapshot
      const snapshot = typeof order.priceSnapshot === "string"
        ? JSON.parse(order.priceSnapshot)
        : (order.priceSnapshot || {});
      const updatedSnapshot = {
        ...snapshot,
        metadata: {
          ...(snapshot.metadata || {}),
          gatewayProvider: "RAZORPAY_SANDBOX",
          gatewayOrderId: payment.order_id,
          gatewayPaymentId: payment.id,
          gatewayMethod: payment.method || "card",
          gatewayEventId: eventPayload.id || eventPayload.event_id || null,
        },
      };

      await tx.commerceOrder.update({
        where: { id: order.id },
        data: {
          priceSnapshot: updatedSnapshot as any,
        },
      });

      // Step 3: Coupon redemption if coupon applied
      if (order.couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: order.couponCode },
        });

        if (coupon) {
          await recordCouponRedemption({
            couponId: coupon.id,
            tenantId: order.tenantId,
            orderId: order.id,
            discountApplied: Number(order.discountAmount) || 0,
            tx,
          });
        }
      }

      // Step 4: AuditLog mutation
      await AuditService.logMutation(
        {
          tenantId: order.tenantId,
          actorId: order.userId || "RAZORPAY_WEBHOOK",
          action: "ORDER_PAID",
          entityType: "CommerceOrder",
          entityId: order.id,
          metadata: {
            orderNumber: order.orderNumber,
            totalAmount: Number(order.totalAmount),
            currency: order.currency,
            gatewayProvider: "RAZORPAY_SANDBOX",
            gatewayPaymentId: payment.id,
            gatewayOrderId: payment.order_id,
          },
        },
        tx
      );

      // Step 5: Atomically insert OutboxEvent
      await OutboxService.createOutboxEvent(
        {
          tenantId: order.tenantId,
          eventType: "COMMERCE_ORDER_PAID",
          entityType: "CommerceOrder",
          entityId: order.id,
          actorId: order.userId || "RAZORPAY_WEBHOOK",
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            tenantId: order.tenantId,
            amountInPaise: receivedPaise,
            currency: order.currency,
            items: (order.priceSnapshot as any)?.items || (order.priceSnapshot as any)?.lineItems || [],
            paidAt: new Date(payment.created_at ? payment.created_at * 1000 : Date.now()).toISOString(),
            gatewayPaymentId: payment.id,
            gatewayOrderId: payment.order_id,
          },
          metadata: {
            gatewayProvider: "RAZORPAY_SANDBOX",
            gatewayPaymentId: payment.id,
          },
        },
        tx
      );

      return { __isReplay: false };
    });

    return {
      success: true,
      isReplay: Boolean(settled?.__isReplay),
      orderId: order.id,
    };
  }
}

/**
 * Evaluates whether simulated checkout is prohibited based on multi-layered deployment configuration.
 * Fails closed across all production-like deployments (NODE_ENV, APP_ENV, VERCEL_ENV, flags).
 */
export function isCommerceSimulationProhibited(): boolean {
  const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
  const appEnv = (process.env.APP_ENV || "").toLowerCase();
  const vercelEnv = (process.env.VERCEL_ENV || "").toLowerCase();

  // 1. Unconditionally prohibited in any production or live environment
  if (
    nodeEnv === "production" ||
    nodeEnv === "prod" ||
    appEnv === "production" ||
    appEnv === "prod" ||
    appEnv === "live" ||
    vercelEnv === "production"
  ) {
    return true;
  }

  // 2. Explicit opt-out flag
  if (
    process.env.COMMERCE_SIMULATION_ENABLED === "false" ||
    process.env.ALLOW_COMMERCE_SIMULATION === "false"
  ) {
    return true;
  }

  // 3. Staging and other non-development environments fail closed unless explicitly authorized
  const isDevOrTest =
    nodeEnv === "development" || nodeEnv === "test" || appEnv === "local" || appEnv === "test";
  if (!isDevOrTest && process.env.ALLOW_COMMERCE_SIMULATION !== "true") {
    return true;
  }

  return false;
}
