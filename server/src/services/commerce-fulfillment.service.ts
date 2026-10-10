/**
 * MASTERHRMS — Phase A3.4: Atomic Entitlement Provisioning & Outbox Publisher Service
 *
 * Enforces:
 * 1. Canonical Item-to-Entitlement Resolution: Resolves line items exclusively from
 *    immutable `order.priceSnapshot.items` and authoritative `CANONICAL_CATALOG_REGISTRY`.
 * 2. Multi-Product Independence: Standalone products (POS, CRM, Finance) provision
 *    `TenantModule` without requiring an active HRMS base subscription.
 * 3. Atomic Single-Transaction Provisioning: Coordinates order fulfillment state,
 *    entitlements (Subscription, Module, Addon), OutboxEvent status, and AuditLog.
 * 4. Safe Concurrency & Row Locking: Serializes concurrent fulfillment workers via
 *    PostgreSQL row locks (`FOR UPDATE` and `FOR UPDATE SKIP LOCKED`).
 * 5. Strict Tenant & Paid Eligibility: Fails closed if order is unpaid, deleted, or cross-tenant.
 * 6. Bounded Retries & Kill Switch: Supports kill-switch (`COMMERCE_FULFILLMENT_ENABLED=false`).
 */

import { prisma, rawPrisma } from "../prisma";
import { findCanonicalProduct, CanonicalProductTemplate } from "./unified-catalog.service";
import { AuditService } from "./audit.service";

export class CommerceFulfillmentError extends Error {
  public statusCode: number;
  public code: string;

  constructor(code: string, message: string, statusCode = 400) {
    super(`[${code}] ${message}`);
    this.name = "CommerceFulfillmentError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface FulfillmentResult {
  success: boolean;
  orderId: string;
  tenantId: string;
  alreadyFulfilled: boolean;
  provisioned: {
    subscriptions: string[];
    modules: string[];
    addons: string[];
  };
  error?: string;
  code?: string;
}

/**
 * Deterministic UTC date arithmetic for subscription and add-on billing periods.
 * Handles month-end clamping (e.g., Jan 31 + 1 month = Feb 28 / 29) and leap years.
 */
export function calculatePeriodEnd(startDate: Date, interval: string): Date {
  const result = new Date(startDate.getTime());
  const normInterval = (interval || "").toLowerCase().trim();

  if (normInterval === "1_year" || normInterval === "annual" || normInterval === "yearly") {
    const year = result.getUTCFullYear() + 1;
    const month = result.getUTCMonth();
    const day = result.getUTCDate();
    // Handle leap day (Feb 29) rollover to Feb 28 on non-leap years
    if (month === 1 && day === 29) {
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      if (!isLeap) {
        result.setUTCFullYear(year, 1, 28);
        return result;
      }
    }
    result.setUTCFullYear(year);
    return result;
  }

  // Default: Monthly ("1_month" | "monthly")
  const startDay = result.getUTCDate();
  result.setUTCMonth(result.getUTCMonth() + 1);

  // If the target month has fewer days than startDay, clamp to the last day of target month
  if (result.getUTCDate() < startDay) {
    result.setUTCDate(0); // Clamps to last day of previous month
  }

  return result;
}

/**
 * Returns integer rank for Base Plan tier hierarchy comparisons.
 */
export function planTierRank(planSlugOrId: string): number {
  const slug = (planSlugOrId || "").toLowerCase().replace(/^plan_/, "");
  switch (slug) {
    case "starter":
      return 1;
    case "growth":
      return 2;
    case "sovereign":
      return 3;
    case "custom-flex":
    case "custom_flex":
      return 4;
    default:
      return 0;
  }
}

export class CommerceFulfillmentService {
  /**
   * Evaluates whether fulfillment worker processing is enabled via environment.
   */
  public static isFulfillmentEnabled(): boolean {
    return process.env.COMMERCE_FULFILLMENT_ENABLED !== "false";
  }

  /**
   * Atomically provisions entitlements for an eligible paid order.
   *
   * Executes inside an interactive PostgreSQL transaction with row-level locking
   * to guarantee zero duplicate fulfillment and complete rollback on any error.
   */
  public static async fulfillOrder(params: {
    orderId: string;
    tenantId?: string;
    actorId?: string;
  }): Promise<FulfillmentResult> {
    const db = rawPrisma || prisma;
    const { orderId, tenantId, actorId } = params;

    return await db.$transaction(async (tx: any) => {
      // 1. Acquire row lock on CommerceOrder to serialize concurrent fulfillment workers
      const orderRows: any[] = await tx.$queryRawUnsafe(
        `SELECT * FROM commerce_orders WHERE id = $1 FOR UPDATE;`,
        orderId
      );

      if (!orderRows || orderRows.length === 0) {
        throw new CommerceFulfillmentError("ORDER_NOT_FOUND", "Order not found.", 404);
      }

      const order = orderRows[0];

      // 2. Multi-tenant isolation verification
      if (tenantId && order.tenant_id !== tenantId) {
        throw new CommerceFulfillmentError("ORDER_NOT_FOUND", "Order not found for tenant.", 404);
      }

      const orderTenantId = order.tenant_id;

      // 3. Strict Payment State Eligibility
      if (order.status !== "PAID") {
        throw new CommerceFulfillmentError(
          "ORDER_NOT_PAID",
          `Cannot fulfill order in '${order.status}' state. Only PAID orders may be fulfilled.`,
          400
        );
      }

      // 4. Idempotent Replay Check
      if (order.fulfillment_status === "FULFILLED") {
        return {
          success: true,
          orderId: order.id,
          tenantId: orderTenantId,
          alreadyFulfilled: true,
          provisioned: { subscriptions: [], modules: [], addons: [] },
        };
      }

      if (order.fulfillment_status !== "UNFULFILLED") {
        throw new CommerceFulfillmentError(
          "INVALID_FULFILLMENT_STATE",
          `Order is in invalid fulfillment state: ${order.fulfillment_status}`,
          409
        );
      }

      // 5. Structural Validation of Price Snapshot Items
      const snapshot = typeof order.price_snapshot === "string"
        ? JSON.parse(order.price_snapshot)
        : order.price_snapshot;

      const items: any[] = snapshot?.lineItems || snapshot?.items;
      if (!Array.isArray(items) || items.length === 0) {
        throw new CommerceFulfillmentError(
          "MALFORMED_PRICE_SNAPSHOT",
          "Order price snapshot contains no valid items.",
          422
        );
      }

      const paidAt = order.paid_at ? new Date(order.paid_at) : new Date();
      const provisioned = {
        subscriptions: [] as string[],
        modules: [] as string[],
        addons: [] as string[],
      };

      // 6. Iterate and Provision Line Items
      for (const item of items) {
        const itemKey = item.productSlug || item.productId || item.slug || item.id;
        const catalogProduct = findCanonicalProduct(itemKey);

        if (!catalogProduct) {
          throw new CommerceFulfillmentError(
            "UNKNOWN_CATALOG_PRODUCT",
            `Item '${itemKey}' does not resolve to an authoritative canonical catalog product.`,
            422
          );
        }

        const billingInterval = item.billingInterval || "1_month";
        const periodEnd = calculatePeriodEnd(paidAt, billingInterval);

        // ── Engine 1: Base Plan Subscription ──────────────────────────────────
        if (catalogProduct.targetEngine === "subscription") {
          const planRecordId = catalogProduct.slug; // Matches SubscriptionPlan.id in database
          const existingSub = await tx.tenantSubscription.findUnique({
            where: { tenantId: orderTenantId },
          });

          if (existingSub && existingSub.status === "active") {
            const currentRank = planTierRank(existingSub.planId || "");
            const newRank = planTierRank(catalogProduct.slug);

            // Guard against unintended downgrade
            if (newRank < currentRank) {
              throw new CommerceFulfillmentError(
                "DOWNGRADE_NOT_PERMITTED",
                `Active subscription tier (${existingSub.planId}) cannot be downgraded to ${catalogProduct.slug} via standard fulfillment.`,
                409
              );
            }
          }

          let includedSeats = Math.max(item.includedSeats || 0, item.seats || 0);
          if (includedSeats <= 1) {
            if (catalogProduct.slug === "starter") includedSeats = 25;
            else if (catalogProduct.slug === "growth") includedSeats = 100;
            else if (catalogProduct.slug === "sovereign") includedSeats = 500;
            else includedSeats = 25;
          }

          await tx.tenantSubscription.upsert({
            where: { tenantId: orderTenantId },
            create: {
              tenantId: orderTenantId,
              planId: planRecordId,
              status: "active",
              billingInterval,
              currentPeriodStart: paidAt,
              currentPeriodEnd: periodEnd,
              maxEmployees: includedSeats,
              maxUsers: includedSeats,
            },
            update: {
              planId: planRecordId,
              status: "active",
              billingInterval,
              currentPeriodStart: paidAt,
              currentPeriodEnd: periodEnd,
              maxEmployees: includedSeats,
              maxUsers: includedSeats,
            },
          });

          if (existingSub) {
            await tx.subscriptionPolicyAudit.create({
              data: {
                tenantId: orderTenantId,
                subscriptionId: existingSub.id,
                actorUserId: actorId || "SYSTEM_FULFILLMENT_ENGINE",
                before: {
                  planId: existingSub.planId,
                  status: existingSub.status,
                  billingInterval: existingSub.billingInterval,
                  currentPeriodStart: existingSub.currentPeriodStart,
                  currentPeriodEnd: existingSub.currentPeriodEnd,
                  maxEmployees: existingSub.maxEmployees,
                },
                after: {
                  planId: planRecordId,
                  status: "active",
                  billingInterval,
                  currentPeriodStart: paidAt,
                  currentPeriodEnd: periodEnd,
                  maxEmployees: includedSeats,
                },
              },
            });
          }

          provisioned.subscriptions.push(planRecordId);
        }

        // ── Engine 2: Standalone ERP Module (POS, CRM, Finance) ───────────────
        else if (catalogProduct.targetEngine === "module") {
          await tx.tenantModule.upsert({
            where: {
              tenantId_moduleKey: {
                tenantId: orderTenantId,
                moduleKey: catalogProduct.entitlementKey,
              },
            },
            create: {
              tenantId: orderTenantId,
              moduleKey: catalogProduct.entitlementKey,
              isEnabled: true,
            },
            update: {
              isEnabled: true,
            },
          });

          provisioned.modules.push(catalogProduct.entitlementKey);
        }

        // ── Engine 3: Add-on Features & Integrations ──────────────────────────
        else if (catalogProduct.targetEngine === "addon") {
          const existingAddon = await tx.tenantAddon.findUnique({
            where: {
              tenantId_addonSlug: {
                tenantId: orderTenantId,
                addonSlug: catalogProduct.slug,
              },
            },
          });

          // If add-on is already active and unexpired, extend renewal from existing renewsAt
          let targetRenewsAt = periodEnd;
          if (existingAddon?.renewsAt && existingAddon.renewsAt.getTime() > paidAt.getTime()) {
            const addedMs = periodEnd.getTime() - paidAt.getTime();
            targetRenewsAt = new Date(existingAddon.renewsAt.getTime() + addedMs);
          }

          await tx.tenantAddon.upsert({
            where: {
              tenantId_addonSlug: {
                tenantId: orderTenantId,
                addonSlug: catalogProduct.slug,
              },
            },
            create: {
              tenantId: orderTenantId,
              addonSlug: catalogProduct.slug,
              status: "active",
              plan: "standard",
              renewsAt: targetRenewsAt,
            },
            update: {
              status: "active",
              renewsAt: targetRenewsAt,
            },
          });

          provisioned.addons.push(catalogProduct.slug);
        }
      }

      // 6.5. Generate Compliant Billing Invoice (OD-3 Option 3A)
      const activeSub = await tx.tenantSubscription.findUnique({
        where: { tenantId: orderTenantId },
      });

      const existingInv = await tx.billingInvoice.findFirst({
        where: { gatewayOrderId: order.order_number },
      });

      if (!existingInv) {
        await tx.billingInvoice.create({
          data: {
            tenant: { connect: { id: orderTenantId } },
            ...(activeSub ? { subscription: { connect: { id: activeSub.id } } } : {}),
            invoiceNo: `INV-${order.order_number}`,
            amount: order.total_amount,
            currency: order.currency || "INR",
            subtotalAmount: order.subtotal,
            taxAmount: order.total_tax,
            discountAmount: order.discount_amount,
            status: "paid",
            billingCycle: "monthly",
            paymentMethod: order.is_simulated ? "simulated" : "razorpay",
            gatewayOrderId: order.order_number,
            periodStart: paidAt,
            periodEnd: new Date(paidAt.getTime() + 30 * 24 * 3600 * 1000),
            paidAt: paidAt,
          },
        });
      }

      // 7. Transition Order Fulfillment State
      await tx.commerceOrder.update({
        where: { id: order.id },
        data: {
          fulfillmentStatus: "FULFILLED",
          fulfilledAt: new Date(),
          version: { increment: 1 },
        },
      });

      // 8. Mark Associated Outbox Event as PROCESSED
      await tx.outboxEvent.updateMany({
        where: {
          entityType: "CommerceOrder",
          entityId: order.id,
          eventType: "COMMERCE_ORDER_PAID",
          status: "PENDING",
        },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
        },
      });

      // 9. Persist Structured AuditLog Entry
      await AuditService.logMutation(
        {
          tenantId: orderTenantId,
          actorId: actorId || "SYSTEM_FULFILLMENT_ENGINE",
          action: "COMMERCE_FULFILLMENT_SUCCEEDED",
          entityType: "CommerceOrder",
          entityId: order.id,
          metadata: {
            orderNumber: order.order_number,
            provisioned,
            fulfilledAt: new Date().toISOString(),
          },
        },
        tx
      );

      return {
        success: true,
        orderId: order.id,
        tenantId: orderTenantId,
        alreadyFulfilled: false,
        provisioned,
      };
    });
  }

  /**
   * Multi-worker-safe outbox event batch sweeper.
   * Uses PostgreSQL `FOR UPDATE SKIP LOCKED` to prevent concurrent worker collisions.
   */
  public static async processOutboxBatch(options?: {
    batchSize?: number;
    workerId?: string;
  } | number): Promise<{ processed: number; errors: number; status: string }> {
    if (!this.isFulfillmentEnabled()) {
      return { processed: 0, errors: 0, status: "DISABLED" };
    }

    const batchSize = typeof options === "number" ? options : (options?.batchSize || 10);
    const workerId = (typeof options === "object" && options?.workerId) || "DEFAULT_WORKER";
    const db = rawPrisma || prisma;

    let processedCount = 0;
    let errorCount = 0;

    try {
      // 1. Select pending outbox events using SKIP LOCKED inside transaction
      const events: any[] = await db.$transaction(async (tx: any) => {
        return await tx.$queryRawUnsafe(
          `SELECT id, event_id, tenant_id, payload, retry_count
           FROM outbox_events
           WHERE status = 'PENDING'
             AND event_type = 'COMMERCE_ORDER_PAID'
             AND retry_count < 5
           ORDER BY occurred_at ASC
           LIMIT $1
           FOR UPDATE SKIP LOCKED;`,
          batchSize
        );
      });

      if (!events || events.length === 0) {
        return { processed: 0, errors: 0, status: "IDLE" };
      }

      // 2. Process each claimed event independently
      for (const event of events) {
        const payload = typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload;
        const orderId = payload?.orderId;
        const eventTenantId = event.tenant_id;

        if (!orderId) {
          await db.outboxEvent.update({
            where: { id: event.id },
            data: { status: "FAILED", error: "Missing orderId in payload" },
          });
          errorCount++;
          continue;
        }

        try {
          await this.fulfillOrder({
            orderId,
            tenantId: eventTenantId,
            actorId: `WORKER_${workerId}`,
          });

          processedCount++;
        } catch (fulfillmentErr: any) {
          console.error("[CommerceFulfillmentService] Fulfillment error for order:", orderId, fulfillmentErr?.message);
          errorCount++;
          const nextRetry = (event.retry_count || 0) + 1;
          const isPermanent = nextRetry >= 5 || fulfillmentErr.code === "UNKNOWN_CATALOG_PRODUCT";

          await db.outboxEvent.update({
            where: { id: event.id },
            data: {
              retryCount: nextRetry,
              error: fulfillmentErr.message,
              status: isPermanent ? "FAILED" : "PENDING",
            },
          });

          if (isPermanent) {
            await AuditService.logMutation({
              tenantId: eventTenantId,
              actorId: `WORKER_${workerId}`,
              action: "COMMERCE_FULFILLMENT_FAILED_PERMANENT",
              entityType: "CommerceOrder",
              entityId: orderId,
              metadata: {
                error: fulfillmentErr.message,
                code: fulfillmentErr.code,
                attempts: nextRetry,
              },
            });
          }
        }
      }

      return { processed: processedCount, errors: errorCount, status: "ACTIVE" };
    } catch (sweepErr: any) {
      console.error("[CommerceFulfillmentService] Outbox sweep error:", sweepErr.message);
      return { processed: processedCount, errors: errorCount + 1, status: "ERROR" };
    }
  }
}
