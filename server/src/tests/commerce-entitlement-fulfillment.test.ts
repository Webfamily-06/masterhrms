/**
 * MASTERHRMS — Phase A3.4: Atomic Entitlement Provisioning & Outbox Publisher Acceptance Suite
 *
 * Verifies all 6 Critical Tiers of Phase A3.4:
 * - Tier 1: Canonical Catalog & Entitlement Mapping (Base Plans, Standalone ERP Modules, Addons, Periods, Seats)
 * - Tier 2: Transaction Atomicity & Rollback (Single $transaction commit, complete rollback on invalid items)
 * - Tier 3: Concurrency & Lock Serialization (Two workers competing, zero duplicate mutations, idempotent replays)
 * - Tier 4: Security & Multi-Tenant Isolation (Cross-tenant rejection, unpaid order rejection, zero secret disclosure)
 * - Tier 5: Crash & Outbox Recovery (Outbox sweep, bounded retries, kill-switch)
 * - Tier 6: Runtime Entitlement Reflection (checkTenantEntitlement verification for modules & addons)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "crypto";
import { rawPrisma as prisma } from "../prisma";
import {
  CommerceFulfillmentService,
  CommerceFulfillmentError,
  calculatePeriodEnd,
  planTierRank,
} from "../services/commerce-fulfillment.service";
import { checkTenantEntitlement } from "../middleware/entitlements";

describe("MASTERHRMS — Phase A3.4 Entitlement Provisioning & Outbox Acceptance Suite", () => {
  const timestamp = Date.now();
  const tenantAId = `tenant_fulfill_a_${timestamp}`;
  const tenantBId = `tenant_fulfill_b_${timestamp}`;
  const userAId = `user_fulfill_a_${timestamp}`;

  beforeAll(async () => {
    // 1. Seed Test Tenants
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        name: "Fulfillment Test Tenant A",
        slug: `tenant-fa-${timestamp}`,
      },
    });

    await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: "Fulfillment Test Tenant B",
        slug: `tenant-fb-${timestamp}`,
      },
    });

    // 2. Seed Test User
    await prisma.user.create({
      data: {
        id: userAId,
        email: `fulfill-admin-${timestamp}@example.com`,
        passwordHash: "hashedsecret123",
        profile: {
          create: {
            fullName: "Fulfillment Admin",
            tenantId: tenantAId,
          },
        },
        roles: {
          create: {
            role: "hr_admin",
            tenantId: tenantAId,
          },
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up created test data in reverse FK order
    await prisma.auditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.outboxEvent.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.commerceOrder.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantAddon.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantModule.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRole.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.profile.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { id: userAId } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
  });

  // Helper to create test orders with specific status and items
  async function createTestOrder(opts: {
    id?: string;
    tenantId: string;
    status: any;
    fulfillmentStatus?: any;
    items: any[];
  }) {
    const id = opts.id || crypto.randomUUID();
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    return await prisma.commerceOrder.create({
      data: {
        id,
        orderNumber,
        tenantId: opts.tenantId,
        userId: userAId,
        status: opts.status,
        fulfillmentStatus: opts.fulfillmentStatus || "UNFULFILLED",
        currency: "INR",
        subtotal: 1000,
        discountAmount: 0,
        taxableAmount: 1000,
        totalTax: 180,
        totalAmount: 1180,
        amountInPaise: 118000,
        priceSnapshot: {
          items: opts.items,
          subtotal: 1000,
          total: 1180,
        },
        paidAt: opts.status === "PAID" ? new Date() : null,
      },
    });
  }

  // ─── TIER 1: CATALOG & MAPPING TESTS ──────────────────────────────────────────

  describe("Tier 1: Canonical Catalog & Entitlement Mapping", () => {
    it("T1.1: Correctly provisions a Base Plan (Starter Cloud) to TenantSubscription", async () => {
      const order = await createTestOrder({
        tenantId: tenantAId,
        status: "PAID",
        items: [
          {
            productId: "plan_starter",
            slug: "starter",
            name: "Starter Cloud",
            productType: "BASE_PLAN",
            targetEngine: "subscription",
            billingInterval: "1_month",
            seats: 25,
            unitPrice: 999,
          },
        ],
      });

      const res = await CommerceFulfillmentService.fulfillOrder({ orderId: order.id, tenantId: tenantAId });
      expect(res.success).toBe(true);
      expect(res.provisioned.subscriptions).toContain("starter");

      const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId: tenantAId } });
      expect(sub).toBeDefined();
      expect(sub?.planId).toBe("starter");
      expect(sub?.status).toBe("active");
      expect(sub?.maxEmployees).toBe(25);
      expect(sub?.currentPeriodEnd).toBeDefined();
    });

    it("T1.2: Correctly provisions Standalone ERP Products (POS & CRM) to TenantModule without HRMS dependency", async () => {
      const order = await createTestOrder({
        tenantId: tenantBId,
        status: "PAID",
        items: [
          {
            productId: "prod_pos",
            slug: "pos",
            name: "POS Suite",
            productType: "STANDALONE_PRODUCT",
            targetEngine: "module",
            entitlementKey: "product_pos",
          },
          {
            productId: "prod_crm",
            slug: "crm",
            name: "CRM Suite",
            productType: "STANDALONE_PRODUCT",
            targetEngine: "module",
            entitlementKey: "product_crm",
          },
        ],
      });

      const res = await CommerceFulfillmentService.fulfillOrder({ orderId: order.id, tenantId: tenantBId });
      expect(res.success).toBe(true);
      expect(res.provisioned.modules).toContain("product_pos");
      expect(res.provisioned.modules).toContain("product_crm");

      // Verify modules exist in database with isEnabled: true
      const posMod = await prisma.tenantModule.findUnique({
        where: { tenantId_moduleKey: { tenantId: tenantBId, moduleKey: "product_pos" } },
      });
      const crmMod = await prisma.tenantModule.findUnique({
        where: { tenantId_moduleKey: { tenantId: tenantBId, moduleKey: "product_crm" } },
      });
      expect(posMod?.isEnabled).toBe(true);
      expect(crmMod?.isEnabled).toBe(true);

      // Verify that tenantB has ZERO base subscription (standalone independence!)
      const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId: tenantBId } });
      expect(sub).toBeNull();
    });

    it("T1.3: Correctly provisions Add-On (Biometric Sync) to TenantAddon", async () => {
      const order = await createTestOrder({
        tenantId: tenantAId,
        status: "PAID",
        items: [
          {
            productId: "addon_biometric_sync",
            slug: "biometric-sync",
            name: "Biometric Device Cloud Sync",
            productType: "ADDON_FEATURE",
            targetEngine: "addon",
            billingInterval: "1_month",
          },
        ],
      });

      const res = await CommerceFulfillmentService.fulfillOrder({ orderId: order.id, tenantId: tenantAId });
      expect(res.success).toBe(true);
      expect(res.provisioned.addons).toContain("biometric-sync");

      const addon = await prisma.tenantAddon.findUnique({
        where: { tenantId_addonSlug: { tenantId: tenantAId, addonSlug: "biometric-sync" } },
      });
      expect(addon?.status).toBe("active");
      expect(addon?.plan).toBe("standard");
    });

    it("T1.4: Rejects unknown catalog products and fails closed", async () => {
      const order = await createTestOrder({
        tenantId: tenantAId,
        status: "PAID",
        items: [
          {
            productId: "unknown_hacked_item",
            slug: "unauthorized_product",
            productType: "STANDALONE_PRODUCT",
          },
        ],
      });

      await expect(
        CommerceFulfillmentService.fulfillOrder({ orderId: order.id, tenantId: tenantAId })
      ).rejects.toThrowError(/UNKNOWN_CATALOG_PRODUCT/);
    });

    it("T1.5: Rejects malformed or empty price snapshots", async () => {
      const order = await createTestOrder({
        tenantId: tenantAId,
        status: "PAID",
        items: [],
      });

      await expect(
        CommerceFulfillmentService.fulfillOrder({ orderId: order.id, tenantId: tenantAId })
      ).rejects.toThrowError(/MALFORMED_PRICE_SNAPSHOT/);
    });

    it("T1.6: Validates deterministic UTC period calculations across month boundaries", () => {
      // Jan 31 + 1 month should clamp to Feb 28 on a non-leap year
      const jan31 = new Date(Date.UTC(2025, 0, 31, 12, 0, 0));
      const febEnd = calculatePeriodEnd(jan31, "1_month");
      expect(febEnd.getUTCMonth()).toBe(1); // February
      expect(febEnd.getUTCDate()).toBe(28);

      // Annual calculation
      const annualEnd = calculatePeriodEnd(jan31, "1_year");
      expect(annualEnd.getUTCFullYear()).toBe(2026);
      expect(annualEnd.getUTCMonth()).toBe(0);
      expect(annualEnd.getUTCDate()).toBe(31);
    });

    it("T1.7: Validates higher-tier subscription upgrade (Starter -> Growth) upgrades plan, increases seats to 100, updates billing period, and persists SubscriptionPolicyAudit with before/after state", async () => {
      // 1. Establish initial active Starter plan for tenantB
      await prisma.tenantSubscription.upsert({
        where: { tenantId: tenantBId },
        create: {
          tenantId: tenantBId,
          planId: "starter",
          status: "active",
          billingInterval: "1_month",
          maxEmployees: 25,
          maxUsers: 25,
        },
        update: {
          planId: "starter",
          status: "active",
          maxEmployees: 25,
        },
      });

      // 2. Order an upgrade to Growth plan
      const upgradeOrder = await createTestOrder({
        tenantId: tenantBId,
        status: "PAID",
        items: [
          {
            productId: "plan_growth",
            slug: "growth",
            productType: "BASE_PLAN",
            targetEngine: "subscription",
            billingInterval: "1_month",
            seats: 100,
          },
        ],
      });

      const res = await CommerceFulfillmentService.fulfillOrder({
        orderId: upgradeOrder.id,
        tenantId: tenantBId,
        actorId: "UPGRADE_TEST_ACTOR",
      });

      expect(res.success).toBe(true);
      expect(res.provisioned.subscriptions).toContain("growth");

      // Verify updated subscription
      const updatedSub = await prisma.tenantSubscription.findUnique({
        where: { tenantId: tenantBId },
      });
      expect(updatedSub?.planId).toBe("growth");
      expect(updatedSub?.maxEmployees).toBe(100);
      expect(updatedSub?.status).toBe("active");

      // Verify SubscriptionPolicyAudit captured before and after states
      const audit = await prisma.subscriptionPolicyAudit.findFirst({
        where: { tenantId: tenantBId },
        orderBy: { createdAt: "desc" },
      });
      expect(audit).toBeDefined();
      expect(audit?.subscriptionId).toBe(updatedSub?.id);
      expect((audit?.before as any)?.planId).toBe("starter");
      expect((audit?.after as any)?.planId).toBe("growth");
      expect((audit?.after as any)?.maxEmployees).toBe(100);
    });
  });

  // ─── TIER 2: ATOMICITY & TRANSACTION INTEGRITY ────────────────────────────────

  describe("Tier 2: Transaction Atomicity & Rollback", () => {
    it("T2.1: Atomically provisions multiple targets, updates order, outbox, and audit in single commit", async () => {
      const order = await createTestOrder({
        tenantId: tenantAId,
        status: "PAID",
        items: [
          {
            productId: "prod_finance",
            slug: "finance",
            productType: "STANDALONE_PRODUCT",
            targetEngine: "module",
            entitlementKey: "product_finance",
          },
          {
            productId: "addon_google_workspace",
            slug: "google-workspace",
            productType: "ADDON_INTEGRATION",
            targetEngine: "addon",
          },
        ],
      });

      // Also create a pending outbox event simulating A3.3 settlement
      await prisma.outboxEvent.create({
        data: {
          tenantId: tenantAId,
          eventId: crypto.randomUUID(),
          eventType: "COMMERCE_ORDER_PAID",
          entityType: "CommerceOrder",
          entityId: order.id,
          status: "PENDING",
          payload: { orderId: order.id },
        },
      });

      const res = await CommerceFulfillmentService.fulfillOrder({ orderId: order.id, tenantId: tenantAId });
      expect(res.success).toBe(true);

      // Verify order state
      const reloadedOrder = await prisma.commerceOrder.findUnique({ where: { id: order.id } });
      expect(reloadedOrder?.fulfillmentStatus).toBe("FULFILLED");
      expect(reloadedOrder?.fulfilledAt).toBeDefined();

      // Verify outbox status updated to PROCESSED
      const outbox = await prisma.outboxEvent.findFirst({
        where: { entityId: order.id, eventType: "COMMERCE_ORDER_PAID" },
      });
      expect(outbox?.status).toBe("PROCESSED");

      // Verify audit log entry created
      const audit = await prisma.auditLog.findFirst({
        where: { entityId: order.id, action: "COMMERCE_FULFILLMENT_SUCCEEDED" },
      });
      expect(audit).toBeDefined();
    });

    it("T2.2: Partial failure rolls back 100% of attempted mutations", async () => {
      const order = await createTestOrder({
        tenantId: tenantBId,
        status: "PAID",
        items: [
          {
            productId: "addon_asset_management",
            slug: "asset-management",
            productType: "ADDON_FEATURE",
            targetEngine: "addon",
          },
          {
            productId: "invalid_unsupported_slug",
            slug: "invalid_slug",
          },
        ],
      });

      await expect(
        CommerceFulfillmentService.fulfillOrder({ orderId: order.id, tenantId: tenantBId })
      ).rejects.toThrowError(/UNKNOWN_CATALOG_PRODUCT/);

      // Verify asset-management was ROLLED BACK and NOT created
      const addon = await prisma.tenantAddon.findUnique({
        where: { tenantId_addonSlug: { tenantId: tenantBId, addonSlug: "asset-management" } },
      });
      expect(addon).toBeNull();

      // Verify order remains UNFULFILLED
      const reloadedOrder = await prisma.commerceOrder.findUnique({ where: { id: order.id } });
      expect(reloadedOrder?.fulfillmentStatus).toBe("UNFULFILLED");
    });

    it("T2.3: Idempotent replay of already fulfilled order returns alreadyFulfilled: true with zero mutations", async () => {
      const order = await createTestOrder({
        tenantId: tenantAId,
        status: "PAID",
        fulfillmentStatus: "FULFILLED",
        items: [
          {
            productId: "prod_pos",
            slug: "pos",
            productType: "STANDALONE_PRODUCT",
            targetEngine: "module",
            entitlementKey: "product_pos",
          },
        ],
      });

      const res = await CommerceFulfillmentService.fulfillOrder({ orderId: order.id, tenantId: tenantAId });
      expect(res.success).toBe(true);
      expect(res.alreadyFulfilled).toBe(true);
    });
  });

  // ─── TIER 3: CONCURRENCY & SERIALIZATION ──────────────────────────────────────

  describe("Tier 3: Concurrency & Lock Serialization", () => {
    it("T3.1: Concurrent workers competing for the same eligible order serialize cleanly (exactly 1 provisions)", async () => {
      const order = await createTestOrder({
        tenantId: tenantBId,
        status: "PAID",
        items: [
          {
            productId: "prod_pos",
            slug: "pos",
            productType: "STANDALONE_PRODUCT",
            targetEngine: "module",
            entitlementKey: "product_pos",
          },
        ],
      });

      // Launch 2 parallel fulfillment requests simultaneously
      const [res1, res2] = await Promise.all([
        CommerceFulfillmentService.fulfillOrder({ orderId: order.id, tenantId: tenantBId, actorId: "WORKER_1" }),
        CommerceFulfillmentService.fulfillOrder({ orderId: order.id, tenantId: tenantBId, actorId: "WORKER_2" }),
      ]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);

      // Exactly one must be the primary provisioner, and the other an idempotent replay
      const fulfilledResults = [res1.alreadyFulfilled, res2.alreadyFulfilled];
      expect(fulfilledResults).toContain(false);
      expect(fulfilledResults).toContain(true);

      // Exactly one module record must exist
      const modules = await prisma.tenantModule.findMany({
        where: { tenantId: tenantBId, moduleKey: "product_pos" },
      });
      expect(modules.length).toBe(1);
    });

    it("T3.2: Re-purchasing an existing add-on extends renewal period rather than resetting it", async () => {
      const initialPaid = new Date(Date.UTC(2026, 0, 1, 10, 0, 0));
      // First order
      const order1 = await createTestOrder({
        tenantId: tenantAId,
        status: "PAID",
        items: [
          {
            productId: "addon_okr_performance",
            slug: "okr-performance",
            productType: "ADDON_FEATURE",
            targetEngine: "addon",
            billingInterval: "1_month",
          },
        ],
      });
      await CommerceFulfillmentService.fulfillOrder({ orderId: order1.id, tenantId: tenantAId });

      const addonAfterOrder1 = await prisma.tenantAddon.findUnique({
        where: { tenantId_addonSlug: { tenantId: tenantAId, addonSlug: "okr-performance" } },
      });
      expect(addonAfterOrder1?.renewsAt).toBeDefined();
      const firstRenewsAt = addonAfterOrder1!.renewsAt!.getTime();

      // Second order for same add-on
      const order2 = await createTestOrder({
        tenantId: tenantAId,
        status: "PAID",
        items: [
          {
            productId: "addon_okr_performance",
            slug: "okr-performance",
            productType: "ADDON_FEATURE",
            targetEngine: "addon",
            billingInterval: "1_month",
          },
        ],
      });
      await CommerceFulfillmentService.fulfillOrder({ orderId: order2.id, tenantId: tenantAId });

      const addonAfterOrder2 = await prisma.tenantAddon.findUnique({
        where: { tenantId_addonSlug: { tenantId: tenantAId, addonSlug: "okr-performance" } },
      });

      // Second renewal date must be GREATER than first renewal date
      expect(addonAfterOrder2!.renewsAt!.getTime()).toBeGreaterThan(firstRenewsAt);
    });
  });

  // ─── TIER 4: SECURITY & MULTI-TENANT ISOLATION ────────────────────────────────

  describe("Tier 4: Security & Multi-Tenant Boundary Isolation", () => {
    it("T4.1: Cross-tenant order fulfillment is strictly rejected (returns 404 without disclosure)", async () => {
      const orderA = await createTestOrder({
        tenantId: tenantAId,
        status: "PAID",
        items: [
          {
            productId: "prod_pos",
            slug: "pos",
            productType: "STANDALONE_PRODUCT",
            targetEngine: "module",
            entitlementKey: "product_pos",
          },
        ],
      });

      // Tenant B attempts to fulfill Tenant A's order
      await expect(
        CommerceFulfillmentService.fulfillOrder({ orderId: orderA.id, tenantId: tenantBId })
      ).rejects.toThrowError(/ORDER_NOT_FOUND/);
    });

    it("T4.2: Unpaid orders in PENDING_PAYMENT state are strictly rejected from fulfillment", async () => {
      const unpaidOrder = await createTestOrder({
        tenantId: tenantAId,
        status: "PENDING_PAYMENT",
        items: [
          {
            productId: "prod_pos",
            slug: "pos",
            productType: "STANDALONE_PRODUCT",
            targetEngine: "module",
            entitlementKey: "product_pos",
          },
        ],
      });

      await expect(
        CommerceFulfillmentService.fulfillOrder({ orderId: unpaidOrder.id, tenantId: tenantAId })
      ).rejects.toThrowError(/ORDER_NOT_PAID/);
    });

    it("T4.3: Protects against accidental subscription downgrade (Sovereign -> Starter)", async () => {
      // First put tenant on sovereign tier
      await prisma.tenantSubscription.upsert({
        where: { tenantId: tenantAId },
        create: {
          tenantId: tenantAId,
          planId: "sovereign",
          status: "active",
          billingInterval: "1_month",
          maxEmployees: 500,
        },
        update: {
          planId: "sovereign",
          status: "active",
        },
      });

      const orderStarter = await createTestOrder({
        tenantId: tenantAId,
        status: "PAID",
        items: [
          {
            productId: "plan_starter",
            slug: "starter",
            productType: "BASE_PLAN",
            targetEngine: "subscription",
          },
        ],
      });

      await expect(
        CommerceFulfillmentService.fulfillOrder({ orderId: orderStarter.id, tenantId: tenantAId })
      ).rejects.toThrowError(/DOWNGRADE_NOT_PERMITTED/);
    });
  });

  // ─── TIER 5: CRASH & OUTBOX WORKER RECOVERY ───────────────────────────────────

  describe("Tier 5: Crash & Outbox Recovery", () => {
    it("T5.1: processOutboxBatch claims pending events and fulfills corresponding orders", async () => {
      const order = await createTestOrder({
        tenantId: tenantBId,
        status: "PAID",
        items: [
          {
            productId: "addon_ai_ocr",
            slug: "ai-ocr",
            productType: "ADDON_FEATURE",
            targetEngine: "addon",
          },
        ],
      });

      // Create outbox event
      await prisma.outboxEvent.create({
        data: {
          tenantId: tenantBId,
          eventId: crypto.randomUUID(),
          eventType: "COMMERCE_ORDER_PAID",
          entityType: "CommerceOrder",
          entityId: order.id,
          status: "PENDING",
          payload: { orderId: order.id },
        },
      });

      const sweep = await CommerceFulfillmentService.processOutboxBatch({ batchSize: 5 });
      expect(sweep.processed).toBeGreaterThanOrEqual(1);

      // Verify addon was provisioned via outbox worker
      const addon = await prisma.tenantAddon.findUnique({
        where: { tenantId_addonSlug: { tenantId: tenantBId, addonSlug: "ai-ocr" } },
      });
      expect(addon?.status).toBe("active");
    });

    it("T5.2: Kill-switch disables outbox worker cleanly when COMMERCE_FULFILLMENT_ENABLED=false", async () => {
      process.env.COMMERCE_FULFILLMENT_ENABLED = "false";

      const res = await CommerceFulfillmentService.processOutboxBatch();
      expect(res.status).toBe("DISABLED");
      expect(res.processed).toBe(0);

      // Restore
      delete process.env.COMMERCE_FULFILLMENT_ENABLED;
    });

    it("T5.3: Transient failure increments outbox retry count, leaves status PENDING, and preserves PAID order untouched", async () => {
      // Create a genuine paid order for tenantA
      const order = await createTestOrder({
        tenantId: tenantAId,
        status: "PAID",
        items: [
          {
            productId: "addon_ai_ocr",
            slug: "ai-ocr",
            productType: "ADDON_FEATURE",
            targetEngine: "addon",
          },
        ],
      });

      // Create an outbox event with a transiently failing non-existent order ID
      const event = await prisma.outboxEvent.create({
        data: {
          tenantId: tenantAId,
          eventId: crypto.randomUUID(),
          eventType: "COMMERCE_ORDER_PAID",
          entityType: "CommerceOrder",
          entityId: "temp_transient_id",
          status: "PENDING",
          retryCount: 0,
          payload: { orderId: "non_existent_transient_order_id" },
        },
      });

      await CommerceFulfillmentService.processOutboxBatch({ batchSize: 1 });

      const updatedEvent = await prisma.outboxEvent.findUnique({ where: { id: event.id } });
      expect(updatedEvent?.retryCount).toBe(1);
      expect(updatedEvent?.status).toBe("PENDING");
      expect(updatedEvent?.error).toBeDefined();

      // Ensure genuine paid order was never altered or lost
      const realOrder = await prisma.commerceOrder.findUnique({ where: { id: order.id } });
      expect(realOrder?.status).toBe("PAID");
      expect(realOrder?.fulfillmentStatus).toBe("UNFULFILLED");
    });

    it("T5.4: Retry exhaustion (attempt 5) transitions event to FAILED, logs permanent audit failure, and preserves PAID order intact", async () => {
      const exhaustedEvent = await prisma.outboxEvent.create({
        data: {
          tenantId: tenantAId,
          eventId: crypto.randomUUID(),
          eventType: "COMMERCE_ORDER_PAID",
          entityType: "CommerceOrder",
          entityId: "exhausted_order_id",
          status: "PENDING",
          retryCount: 4, // 5th attempt will exceed limit
          payload: { orderId: "non_existent_exhausted_order_id" },
        },
      });

      await CommerceFulfillmentService.processOutboxBatch({ batchSize: 10 });

      const finalEvent = await prisma.outboxEvent.findUnique({ where: { id: exhaustedEvent.id } });
      expect(finalEvent?.retryCount).toBe(5);
      expect(finalEvent?.status).toBe("FAILED");

      // Verify audit log of permanent failure
      const audit = await prisma.auditLog.findFirst({
        where: {
          tenantId: tenantAId,
          action: "COMMERCE_FULFILLMENT_FAILED_PERMANENT",
        },
        orderBy: { createdAt: "desc" },
      });
      expect(audit).toBeDefined();
      expect(((audit?.afterJson || (audit as any)?.metadata) as any)?.attempts).toBe(5);
    });

    it("T5.5: Worker crash recovery: uncommitted or interrupted worker event is picked up and successfully fulfilled on next sweep", async () => {
      // Create a paid order
      const order = await createTestOrder({
        tenantId: tenantBId,
        status: "PAID",
        items: [
          {
            productId: "prod_pos",
            slug: "pos",
            productType: "STANDALONE_PRODUCT",
            targetEngine: "module",
            entitlementKey: "product_pos",
          },
        ],
      });

      // Simulate an event that was previously claimed by worker A that crashed (status PENDING, retryCount = 1)
      const event = await prisma.outboxEvent.create({
        data: {
          tenantId: tenantBId,
          eventId: crypto.randomUUID(),
          eventType: "COMMERCE_ORDER_PAID",
          entityType: "CommerceOrder",
          entityId: order.id,
          status: "PENDING",
          retryCount: 1, // simulated previous crashed attempt
          payload: { orderId: order.id },
        },
      });

      // Worker B runs a sweep
      const sweep = await CommerceFulfillmentService.processOutboxBatch({
        batchSize: 5,
        workerId: "WORKER_B_RECOVERY",
      });

      expect(sweep.processed).toBeGreaterThanOrEqual(1);

      // Verify the event is now PROCESSED
      const updatedEvent = await prisma.outboxEvent.findUnique({ where: { id: event.id } });
      expect(updatedEvent?.status).toBe("PROCESSED");

      // Verify POS module is provisioned
      const mod = await prisma.tenantModule.findUnique({
        where: { tenantId_moduleKey: { tenantId: tenantBId, moduleKey: "product_pos" } },
      });
      expect(mod?.isEnabled).toBe(true);

      // Verify order is FULFILLED
      const fulfilledOrder = await prisma.commerceOrder.findUnique({ where: { id: order.id } });
      expect(fulfilledOrder?.fulfillmentStatus).toBe("FULFILLED");
    });
  });

  // ─── TIER 6: RUNTIME ENTITLEMENT REFLECTION ───────────────────────────────────

  describe("Tier 6: Runtime Entitlement Reflection Integration", () => {
    it("T6.1: checkTenantEntitlement reflects newly provisioned modules immediately", async () => {
      const checkBefore = await checkTenantEntitlement(tenantAId, "product_finance");
      expect(checkBefore.entitled).toBe(true); // From T2.1 provisioning!
      expect(checkBefore.source).toBe("module");
    });

    it("T6.2: checkTenantEntitlement reflects newly provisioned add-ons immediately", async () => {
      const checkAddon = await checkTenantEntitlement(tenantAId, "biometric-sync");
      expect(checkAddon.entitled).toBe(true); // From T1.3 provisioning!
      expect(checkAddon.source).toBe("addon");
    });
  });
});
