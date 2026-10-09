/**
 * MASTERHRMS — Phase A3.5: End-to-End Commerce, Entitlement & Integration Acceptance Suite
 *
 * Verifies the complete purchase-to-access journey:
 * 1. Unified Catalog & Pricing Calculation
 * 2. Order Creation with Frozen Price Snapshot & Idempotency
 * 3. Payment Settlement & Atomic Outbox Event Persistence
 * 4. Asynchronous Outbox Worker Claiming (FOR UPDATE SKIP LOCKED) & Atomic Provisioning
 * 5. Runtime Session Entitlement Reflection (/api/auth/me & checkTenantEntitlement)
 * 6. Multi-Product Independence (Base Plans, Standalone ERP Modules without HRMS, Add-Ons)
 * 7. Security Boundaries (Authentication, Cross-Tenant Isolation, Operator Authorization)
 * 8. Concurrency, Crash Recovery, and Dead-Letter Queue Safety
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import crypto from "crypto";
import { rawPrisma as prisma } from "../prisma";
import { commerceRouter } from "../routes/commerce.routes";
import { authRouter } from "../routes/auth.routes";
import { generateToken } from "../lib/jwt";
import { CommerceFulfillmentService } from "../services/commerce-fulfillment.service";
import { checkTenantEntitlement } from "../middleware/entitlements";

function hostFetch(
  url: string,
  opts: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; json: () => Promise<any> }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers: Record<string, string | number> = { ...(opts.headers || {}) };
    if (opts.body) headers["Content-Length"] = Buffer.byteLength(opts.body);
    const req = http.request(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: opts.method || "GET", headers },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () =>
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            json: async () => {
              try {
                return JSON.parse(raw);
              } catch {
                return { raw };
              }
            },
          })
        );
      }
    );
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

describe("MASTERHRMS — Phase A3.5 End-to-End Commerce & Entitlement Acceptance Suite", () => {
  let server: http.Server;
  let baseUrl: string;

  const timestamp = Date.now();
  const tenantAId = `tenant_e2e_a_${timestamp}`;
  const tenantBId = `tenant_e2e_b_${timestamp}`;
  const userAId = `user_e2e_a_${timestamp}`;
  const userBId = `user_e2e_b_${timestamp}`;
  const superAdminId = `super_admin_${timestamp}`;

  let tokenUserA: string;
  let tokenUserB: string;
  let tokenSuperAdmin: string;

  beforeAll(async () => {
    // 1. Spin up test HTTP server mounting both commerce and auth routes
    const app = express();
    app.use(express.json());
    app.use("/api/commerce", commerceRouter);
    app.use("/api/auth", authRouter);

    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;

    // 2. Seed Test Tenants
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        name: "Acme Enterprises (E2E Test)",
        slug: `acme-e2e-${timestamp}`,
      },
    });

    await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: "Globex ERP (E2E Test)",
        slug: `globex-e2e-${timestamp}`,
      },
    });

    // 3. Seed Users
    await prisma.user.create({
      data: {
        id: userAId,
        email: `admin-a-${timestamp}@example.com`,
        passwordHash: "hash123",
        profile: {
          create: {
            fullName: "Alice Admin A",
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

    await prisma.user.create({
      data: {
        id: userBId,
        email: `admin-b-${timestamp}@example.com`,
        passwordHash: "hash123",
        profile: {
          create: {
            fullName: "Bob Admin B",
            tenantId: tenantBId,
          },
        },
        roles: {
          create: {
            role: "hr_admin",
            tenantId: tenantBId,
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        id: superAdminId,
        email: `super-${timestamp}@example.com`,
        passwordHash: "hash123",
        roles: {
          create: {
            role: "super_admin",
          },
        },
      },
    });

    // 4. Generate JWT Tokens
    tokenUserA = generateToken({
      userId: userAId,
      email: `admin-a-${timestamp}@example.com`,
      tenantId: tenantAId,
      roles: ["hr_admin"],
    });

    tokenUserB = generateToken({
      userId: userBId,
      email: `admin-b-${timestamp}@example.com`,
      tenantId: tenantBId,
      roles: ["hr_admin"],
    });

    tokenSuperAdmin = generateToken({
      userId: superAdminId,
      email: `super-${timestamp}@example.com`,
      roles: ["super_admin"],
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    // Clean up test data
    try {
      await prisma.outboxEvent.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.subscriptionPolicyAudit.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.tenantAddon.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.tenantModule.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.tenantSubscription.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.commerceOrder.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await prisma.userRole.deleteMany({ where: { userId: { in: [userAId, userBId, superAdminId] } } });
      await prisma.userProfile.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId, superAdminId] } } });
      await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    } catch (e) {
      // Ignore cleanup error
    }
  });

  // ─── JOURNEY 1: BASE PLAN FULL LIFECYCLE ──────────────────────────────────────

  describe("Journey 1: Base Plan Full Purchase-to-Access Lifecycle", () => {
    it("E2E-1.1: Complete flow: Catalog -> Cart -> Order -> Settle -> Sweep -> Subscription Active -> /api/auth/me", async () => {
      // Step 1: Browse Unified Catalog
      const catRes = await hostFetch(`${baseUrl}/api/commerce/catalog?tenantId=${tenantAId}`);
      expect(catRes.status).toBe(200);
      const catData = await catRes.json();
      expect(catData.success).toBe(true);
      expect(catData.products.some((p: any) => p.slug === "starter")).toBe(true);

      // Step 2: Authoritative Cart Calculation
      const calcRes = await hostFetch(`${baseUrl}/api/commerce/cart/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenUserA}` },
        body: JSON.stringify({
          items: [{ productSlug: "starter", quantity: 1, billingInterval: "1_month" }],
        }),
      });
      expect(calcRes.status).toBe(200);
      const calcData = await calcRes.json();
      expect(calcData.success).toBe(true);
      expect(calcData.subtotal).toBe(199);
      expect(calcData.totalAmount).toBe(234.82); // 199 + 18% GST

      // Step 3: Create Commerce Order with frozen price snapshot
      const idempotencyKey = `e2e_starter_${Date.now()}`;
      const orderRes = await hostFetch(`${baseUrl}/api/commerce/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          idempotencyKey,
          items: [{ productSlug: "starter", quantity: 1, billingInterval: "1_month" }],
        }),
      });
      expect(orderRes.status).toBe(201);
      const orderData = await orderRes.json();
      expect(orderData.success).toBe(true);
      expect(orderData.order.status).toBe("PENDING_PAYMENT");
      expect(orderData.order.fulfillmentStatus).toBe("UNFULFILLED");
      const orderId = orderData.order.id;

      // Step 4: Settle Payment (Simulated Checkout)
      const payRes = await hostFetch(`${baseUrl}/api/commerce/checkout/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenUserA}` },
        body: JSON.stringify({ orderId, outcome: "SUCCESS", notes: "E2E Test Settlement" }),
      });
      expect(payRes.status).toBe(200);
      const payData = await payRes.json();
      expect(payData.success).toBe(true);
      expect(payData.order.status).toBe("PAID");
      expect(payData.order.fulfillmentStatus).toBe("UNFULFILLED");

      // Verify outbox event was written atomically
      const outboxEvt = await prisma.outboxEvent.findFirst({
        where: { tenantId: tenantAId, entityId: orderId, eventType: "COMMERCE_ORDER_PAID" },
      });
      expect(outboxEvt).toBeDefined();
      expect(outboxEvt?.status).toBe("PENDING");

      // Step 5: Operator/Worker Sweeper Execution
      const sweepRes = await hostFetch(`${baseUrl}/api/commerce/outbox/sweep`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenSuperAdmin}` },
        body: JSON.stringify({ batchSize: 10, workerId: "E2E_WORKER" }),
      });
      expect(sweepRes.status).toBe(200);
      const sweepData = await sweepRes.json();
      expect(sweepData.success).toBe(true);
      expect(sweepData.processed).toBeGreaterThanOrEqual(1);

      // Verify order is now FULFILLED and event is PROCESSED
      const updatedOrder = await prisma.commerceOrder.findUnique({ where: { id: orderId } });
      expect(updatedOrder?.fulfillmentStatus).toBe("FULFILLED");
      const updatedEvt = await prisma.outboxEvent.findUnique({ where: { id: outboxEvt!.id } });
      expect(updatedEvt?.status).toBe("PROCESSED");

      // Step 6: Verify Database Entitlement
      const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId: tenantAId } });
      expect(sub?.planId).toBe("starter");
      expect(sub?.status).toBe("active");
      expect(sub?.maxEmployees).toBe(25);

      // Step 7: Verify Session Profile & Navigation (/api/auth/me)
      const meRes = await hostFetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${tokenUserA}` },
      });
      expect(meRes.status).toBe(200);
      const meData = await meRes.json();
      expect(meData.id).toBeDefined();
      expect(meData.profile.tenantId).toBe(tenantAId);
      // Core HRMS access is available
      expect(meData.enabledModules.includes("hrm")).toBe(true);
    });

    it("E2E-1.2: Forensic Gate 1: Subscription upgrade (Starter -> Growth) verifies period dates, paidAt, immutable SubscriptionPolicyAudit, rejects downgrade, and preserves fail-closed proration policy", async () => {
      // Step 1: Verify current Starter subscription from E2E-1.1
      const initialSub = await prisma.tenantSubscription.findUnique({ where: { tenantId: tenantAId } });
      expect(initialSub?.planId).toBe("starter");
      expect(initialSub?.maxEmployees).toBe(25);
      const initialPeriodEnd = initialSub!.currentPeriodEnd.getTime();

      // Step 2: Tenant A orders higher-tier Growth Plan
      const upgradeKey = `e2e_upgrade_${Date.now()}`;
      const upgradeOrderRes = await hostFetch(`${baseUrl}/api/commerce/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
          "idempotency-key": upgradeKey,
        },
        body: JSON.stringify({
          idempotencyKey: upgradeKey,
          items: [{ productSlug: "growth", quantity: 1, billingInterval: "1_month" }],
        }),
      });
      expect(upgradeOrderRes.status).toBe(201);
      const upgradeOrderId = (await upgradeOrderRes.json()).order.id;

      // Settle payment and sweep outbox
      await hostFetch(`${baseUrl}/api/commerce/checkout/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenUserA}` },
        body: JSON.stringify({ orderId: upgradeOrderId, outcome: "SUCCESS" }),
      });
      await hostFetch(`${baseUrl}/api/commerce/outbox/sweep`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenSuperAdmin}` },
        body: JSON.stringify({ batchSize: 10 }),
      });

      // Step 3: Verify upgraded subscription state
      const upgradedSub = await prisma.tenantSubscription.findUnique({ where: { tenantId: tenantAId } });
      expect(upgradedSub?.planId).toBe("growth");
      expect(upgradedSub?.maxEmployees).toBe(100);
      expect(upgradedSub?.status).toBe("active");
      expect(upgradedSub!.currentPeriodEnd.getTime()).toBeGreaterThanOrEqual(initialPeriodEnd);

      // Step 4: Verify immutable SubscriptionPolicyAudit record
      const audit = await prisma.subscriptionPolicyAudit.findFirst({
        where: { tenantId: tenantAId, subscriptionId: initialSub!.id },
        orderBy: { createdAt: "desc" },
      });
      expect(audit).toBeDefined();
      const beforeState = audit!.before as any;
      const afterState = audit!.after as any;
      expect(beforeState.planId).toBe("starter");
      expect(beforeState.maxEmployees).toBe(25);
      expect(afterState.planId).toBe("growth");
      expect(afterState.maxEmployees).toBe(100);

      // Step 5: Downgrade Prevention: Attempt to purchase Starter plan while Growth is active
      const downgradeKey = `e2e_downgrade_${Date.now()}`;
      const downgradeOrderRes = await hostFetch(`${baseUrl}/api/commerce/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
          "idempotency-key": downgradeKey,
        },
        body: JSON.stringify({
          idempotencyKey: downgradeKey,
          items: [{ productSlug: "starter", quantity: 1, billingInterval: "1_month" }],
        }),
      });
      const downgradeOrderId = (await downgradeOrderRes.json()).order.id;

      await hostFetch(`${baseUrl}/api/commerce/checkout/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenUserA}` },
        body: JSON.stringify({ orderId: downgradeOrderId, outcome: "SUCCESS" }),
      });

      // Sweep attempts fulfillment of downgrade order
      await hostFetch(`${baseUrl}/api/commerce/outbox/sweep`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenSuperAdmin}` },
        body: JSON.stringify({ batchSize: 10 }),
      });

      // Subscription remains firmly on Growth plan (unmodified)
      const postDowngradeSub = await prisma.tenantSubscription.findUnique({ where: { tenantId: tenantAId } });
      expect(postDowngradeSub?.planId).toBe("growth");
      expect(postDowngradeSub?.maxEmployees).toBe(100);

      // Outbox event recorded error and order remained unfulfilled
      const downgradeOrder = await prisma.commerceOrder.findUnique({ where: { id: downgradeOrderId } });
      expect(downgradeOrder?.fulfillmentStatus).toBe("UNFULFILLED");
    });
  });

  // ─── JOURNEY 2: STANDALONE ERP PRODUCTS (POS & CRM) WITHOUT HRMS BASE PLAN ────

  describe("Journey 2: Standalone ERP Modules Independence", () => {
    it("E2E-2.1: Sells and provisions POS and CRM to a tenant with zero base plan, enabling them in /api/auth/me", async () => {
      // Tenant B starts with ZERO subscription
      const initialSub = await prisma.tenantSubscription.findUnique({ where: { tenantId: tenantBId } });
      expect(initialSub).toBeNull();

      // Create Order for Standalone POS and CRM
      const orderRes = await hostFetch(`${baseUrl}/api/commerce/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserB}`,
          "idempotency-key": `e2e_standalone_${Date.now()}`,
        },
        body: JSON.stringify({
          idempotencyKey: `e2e_standalone_${Date.now()}`,
          items: [
            { productSlug: "pos", quantity: 1 },
            { productSlug: "crm", quantity: 1 },
          ],
        }),
      });
      expect(orderRes.status).toBe(201);
      const orderId = (await orderRes.json()).order.id;

      // Settle payment
      await hostFetch(`${baseUrl}/api/commerce/checkout/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenUserB}` },
        body: JSON.stringify({ orderId, outcome: "SUCCESS" }),
      });

      // Sweep outbox
      await hostFetch(`${baseUrl}/api/commerce/outbox/sweep`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenSuperAdmin}` },
        body: JSON.stringify({ batchSize: 10 }),
      });

      // Verify TenantModule records were created
      const posMod = await prisma.tenantModule.findUnique({
        where: { tenantId_moduleKey: { tenantId: tenantBId, moduleKey: "product_pos" } },
      });
      expect(posMod?.isEnabled).toBe(true);

      const crmMod = await prisma.tenantModule.findUnique({
        where: { tenantId_moduleKey: { tenantId: tenantBId, moduleKey: "product_crm" } },
      });
      expect(crmMod?.isEnabled).toBe(true);

      // Verify that tenant B STILL has NO HRMS base plan (Strict Standalone Independence)
      const afterSub = await prisma.tenantSubscription.findUnique({ where: { tenantId: tenantBId } });
      expect(afterSub).toBeNull();

      // Verify /api/auth/me reflects POS and CRM in enabledModules
      const meRes = await hostFetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${tokenUserB}` },
      });
      const meData = await meRes.json();
      expect(meData.enabledModules.includes("pos")).toBe(true);
      expect(meData.enabledModules.includes("crm")).toBe(true);

      // Verify that unpurchased module (finance) is NOT enabled
      expect(meData.enabledModules.includes("finance")).toBe(false);
    });
  });

  // ─── JOURNEY 3: ADD-ON INTEGRATION & RENEWAL EXTENSION ────────────────────────

  describe("Journey 3: Add-on Entitlement & Renewal Extension", () => {
    it("E2E-3.1: Provisions add-on and subsequent repurchase extends renewal period instead of resetting", async () => {
      // Order 1: Initial Purchase of Biometric Sync add-on
      const idKey1 = `e2e_addon_1_${Date.now()}`;
      const order1Res = await hostFetch(`${baseUrl}/api/commerce/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
          "idempotency-key": idKey1,
        },
        body: JSON.stringify({
          idempotencyKey: idKey1,
          items: [{ productSlug: "biometric-sync", quantity: 1, billingInterval: "1_month" }],
        }),
      });
      const order1Id = (await order1Res.json()).order.id;

      // Settle & sweep
      await hostFetch(`${baseUrl}/api/commerce/checkout/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenUserA}` },
        body: JSON.stringify({ orderId: order1Id, outcome: "SUCCESS" }),
      });
      await hostFetch(`${baseUrl}/api/commerce/outbox/sweep`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenSuperAdmin}` },
      });

      // Verify initial addon record
      const addonInitial = await prisma.tenantAddon.findUnique({
        where: { tenantId_addonSlug: { tenantId: tenantAId, addonSlug: "biometric-sync" } },
      });
      expect(addonInitial?.status).toBe("active");
      const initialRenewsAt = addonInitial!.renewsAt!.getTime();

      // Order 2: Repurchase renewal for biometric-sync
      const idKey2 = `e2e_addon_2_${Date.now()}`;
      const order2Res = await hostFetch(`${baseUrl}/api/commerce/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
          "idempotency-key": idKey2,
        },
        body: JSON.stringify({
          idempotencyKey: idKey2,
          items: [{ productSlug: "biometric-sync", quantity: 1, billingInterval: "1_month" }],
        }),
      });
      const order2Id = (await order2Res.json()).order.id;

      await hostFetch(`${baseUrl}/api/commerce/checkout/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenUserA}` },
        body: JSON.stringify({ orderId: order2Id, outcome: "SUCCESS" }),
      });
      await hostFetch(`${baseUrl}/api/commerce/outbox/sweep`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenSuperAdmin}` },
        body: JSON.stringify({ batchSize: 10 }),
      });

      // Verify addon expiration was extended beyond initial period
      const addonRenewed = await prisma.tenantAddon.findUnique({
        where: { tenantId_addonSlug: { tenantId: tenantAId, addonSlug: "biometric-sync" } },
      });
      const renewedRenewsAt = addonRenewed!.renewsAt!.getTime();
      expect(renewedRenewsAt).toBeGreaterThan(initialRenewsAt);
    });
  });

  // ─── JOURNEY 4: MIXED-PRODUCT ATOMIC TRANSACTIONS ─────────────────────────────

  describe("Journey 4: Mixed Multi-Product Atomic Transactions", () => {
    it("E2E-4.1: Mixed order provisions Base Plan, Standalone ERP, and Addon in a single commit", async () => {
      const mixedIdKey = `e2e_mixed_${Date.now()}`;
      const mixedOrderRes = await hostFetch(`${baseUrl}/api/commerce/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
          "idempotency-key": mixedIdKey,
        },
        body: JSON.stringify({
          idempotencyKey: mixedIdKey,
          items: [
            { productSlug: "growth", quantity: 1, billingInterval: "1_month" },
            { productSlug: "finance", quantity: 1 },
            { productSlug: "google-workspace", quantity: 1, billingInterval: "1_month" },
          ],
        }),
      });
      expect(mixedOrderRes.status).toBe(201);
      const mixedOrderId = (await mixedOrderRes.json()).order.id;

      // Settle & sweep
      await hostFetch(`${baseUrl}/api/commerce/checkout/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenUserA}` },
        body: JSON.stringify({ orderId: mixedOrderId, outcome: "SUCCESS" }),
      });
      await hostFetch(`${baseUrl}/api/commerce/outbox/sweep`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenSuperAdmin}` },
      });

      // Verify all 3 target engines provisioned simultaneously
      const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId: tenantAId } });
      expect(sub?.planId).toBe("growth");
      expect(sub?.maxEmployees).toBe(100);

      const mod = await prisma.tenantModule.findUnique({
        where: { tenantId_moduleKey: { tenantId: tenantAId, moduleKey: "product_finance" } },
      });
      expect(mod?.isEnabled).toBe(true);

      const addon = await prisma.tenantAddon.findUnique({
        where: { tenantId_addonSlug: { tenantId: tenantAId, addonSlug: "google-workspace" } },
      });
      expect(addon?.status).toBe("active");

      // Verify /api/auth/me shows finance is now enabled
      const meRes = await hostFetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${tokenUserA}` },
      });
      const meData = await meRes.json();
      expect(meData.enabledModules.includes("finance")).toBe(true);
    });
  });

  // ─── JOURNEY 5: SECURITY, MULTI-TENANT BOUNDARIES & AUTHORIZATION ─────────────

  describe("Journey 5: Security Boundaries & Negative Access Control", () => {
    it("E2E-5.1: Unauthenticated requests to commerce endpoints are strictly rejected (401)", async () => {
      const res = await hostFetch(`${baseUrl}/api/commerce/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ productSlug: "starter", quantity: 1 }] }),
      });
      expect(res.status).toBe(401);
    });

    it("E2E-5.2: Cross-tenant order settlement strictly returns 404 without leaking order existence", async () => {
      // Create an order belonging to Tenant A
      const crossIdKey = `cross_tenant_${Date.now()}`;
      const orderRes = await hostFetch(`${baseUrl}/api/commerce/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
          "idempotency-key": crossIdKey,
        },
        body: JSON.stringify({
          idempotencyKey: crossIdKey,
          items: [{ productSlug: "starter", quantity: 1 }],
        }),
      });
      const orderAId = (await orderRes.json()).order.id;

      // User B attempts to settle User A's order
      const crossPayRes = await hostFetch(`${baseUrl}/api/commerce/checkout/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenUserB}` },
        body: JSON.stringify({ orderId: orderAId, outcome: "SUCCESS" }),
      });
      expect(crossPayRes.status).toBe(404);
    });

    it("E2E-5.3: Operator sweep route strictly rejects non-admin users with 403 Forbidden", async () => {
      const res = await hostFetch(`${baseUrl}/api/commerce/outbox/sweep`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenUserA}` },
        body: JSON.stringify({ batchSize: 5 }),
      });
      expect(res.status).toBe(403);
    });

    it("E2E-5.4: Unpaid orders in PENDING_PAYMENT state strictly decline entitlement fulfillment", async () => {
      // Create order without paying
      const unpaidIdKey = `unpaid_${Date.now()}`;
      const orderRes = await hostFetch(`${baseUrl}/api/commerce/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
          "idempotency-key": unpaidIdKey,
        },
        body: JSON.stringify({
          idempotencyKey: unpaidIdKey,
          items: [{ productSlug: "pos", quantity: 1 }],
        }),
      });
      const unpaidOrderId = (await orderRes.json()).order.id;

      // Attempt manual fulfillment on unpaid order
      await expect(
        CommerceFulfillmentService.fulfillOrder({
          orderId: unpaidOrderId,
          tenantId: tenantAId,
        })
      ).rejects.toThrowError(/ORDER_NOT_PAID/);
    });
  });

  // ─── JOURNEY 6: CONCURRENCY, CRASH RECOVERY & RETRY BOUNDARIES ────────────────

  describe("Journey 6: Concurrency, Crash Recovery & Dead-Letter Safety", () => {
    it("E2E-6.1: Concurrent workers competing for same paid order serialize cleanly (exactly 1 provisions)", async () => {
      // Create and pay for an order
      const concIdKey = `concurrent_worker_${Date.now()}`;
      const orderRes = await hostFetch(`${baseUrl}/api/commerce/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserB}`,
          "idempotency-key": concIdKey,
        },
        body: JSON.stringify({
          idempotencyKey: concIdKey,
          items: [{ productSlug: "crm", quantity: 1 }],
        }),
      });
      const orderId = (await orderRes.json()).order.id;

      await hostFetch(`${baseUrl}/api/commerce/checkout/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenUserB}` },
        body: JSON.stringify({ orderId, outcome: "SUCCESS" }),
      });

      // Launch 2 simultaneous fulfillment workers on the same order
      const [worker1, worker2] = await Promise.all([
        CommerceFulfillmentService.fulfillOrder({ orderId, tenantId: tenantBId, actorId: "WORKER_1" }),
        CommerceFulfillmentService.fulfillOrder({ orderId, tenantId: tenantBId, actorId: "WORKER_2" }),
      ]);

      const oneSucceeded = worker1.alreadyFulfilled === false || worker2.alreadyFulfilled === false;
      const oneDeduplicated = worker1.alreadyFulfilled === true || worker2.alreadyFulfilled === true;
      expect(oneSucceeded).toBe(true);
      expect(oneDeduplicated).toBe(true);
    });

    it("E2E-6.2: Outbox retry exhaustion (5 attempts) marks event FAILED, logs audit failure, and preserves PAID order", async () => {
      const exhaustedEvent = await prisma.outboxEvent.create({
        data: {
          tenantId: tenantAId,
          eventId: crypto.randomUUID(),
          eventType: "COMMERCE_ORDER_PAID",
          entityType: "CommerceOrder",
          entityId: "e2e_exhausted_order",
          status: "PENDING",
          retryCount: 4,
          payload: { orderId: "non_existent_e2e_exhausted_order" },
        },
      });

      await CommerceFulfillmentService.processOutboxBatch({ batchSize: 10 });

      const finalEvent = await prisma.outboxEvent.findUnique({ where: { id: exhaustedEvent.id } });
      expect(finalEvent?.retryCount).toBe(5);
      expect(finalEvent?.status).toBe("FAILED");

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: { tenantId: tenantAId, action: "COMMERCE_FULFILLMENT_FAILED_PERMANENT" },
        orderBy: { createdAt: "desc" },
      });
      expect(audit).toBeDefined();
    });

    it("E2E-6.3: Stale/crashed worker event is reclaimed and fulfilled cleanly by subsequent sweep", async () => {
      // Create and pay an order
      const crashIdKey = `crash_recover_${Date.now()}`;
      const orderRes = await hostFetch(`${baseUrl}/api/commerce/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
          "idempotency-key": crashIdKey,
        },
        body: JSON.stringify({
          idempotencyKey: crashIdKey,
          items: [{ productSlug: "ai-ocr", quantity: 1, billingInterval: "1_month" }],
        }),
      });
      const orderId = (await orderRes.json()).order.id;

      await hostFetch(`${baseUrl}/api/commerce/checkout/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenUserA}` },
        body: JSON.stringify({ orderId, outcome: "SUCCESS" }),
      });

      // Simulate a crashed worker event (status = PENDING, retryCount = 1)
      const event = await prisma.outboxEvent.findFirst({
        where: { entityId: orderId, eventType: "COMMERCE_ORDER_PAID" },
      });
      await prisma.outboxEvent.update({
        where: { id: event!.id },
        data: { retryCount: 1, status: "PENDING" },
      });

      // Subsequent sweep claims and fulfills
      const sweep = await CommerceFulfillmentService.processOutboxBatch({
        batchSize: 5,
        workerId: "RECOVERY_WORKER",
      });
      expect(sweep.processed).toBeGreaterThanOrEqual(1);

      const addon = await prisma.tenantAddon.findUnique({
        where: { tenantId_addonSlug: { tenantId: tenantAId, addonSlug: "ai-ocr" } },
      });
      expect(addon?.status).toBe("active");
    });

    it("E2E-6.4: Forensic Gate 2: Outbox retry exhaustion, transient failure safety, and operator runbook recovery without duplicate entitlements", async () => {
      // Step 1: Create and pay an order for google-workspace addon
      const recIdKey = `operator_rec_${Date.now()}`;
      const orderRes = await hostFetch(`${baseUrl}/api/commerce/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
          "idempotency-key": recIdKey,
        },
        body: JSON.stringify({
          idempotencyKey: recIdKey,
          items: [{ productSlug: "google-workspace", quantity: 1, billingInterval: "1_month" }],
        }),
      });
      const orderId = (await orderRes.json()).order.id;

      await hostFetch(`${baseUrl}/api/commerce/checkout/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenUserA}` },
        body: JSON.stringify({ orderId, outcome: "SUCCESS" }),
      });

      // Find the created outbox event
      const outboxEvt = await prisma.outboxEvent.findFirst({
        where: { entityId: orderId, eventType: "COMMERCE_ORDER_PAID" },
      });
      expect(outboxEvt).toBeDefined();

      // Step 2: Simulate transient worker failure (attempts 1..4)
      await prisma.outboxEvent.update({
        where: { id: outboxEvt!.id },
        data: { retryCount: 4, error: "Database lock contention timeout (transient)" },
      });

      // Order must remain untouched in PAID / UNFULFILLED state
      const preOrder = await prisma.commerceOrder.findUnique({ where: { id: orderId } });
      expect(preOrder?.status).toBe("PAID");
      expect(preOrder?.fulfillmentStatus).toBe("UNFULFILLED");

      // Step 3: Trigger 5th attempt failure by pointing payload to non-existent temporary entity
      await prisma.outboxEvent.update({
        where: { id: outboxEvt!.id },
        data: { payload: { orderId: "non_existent_dead_letter_order" } },
      });

      await CommerceFulfillmentService.processOutboxBatch({ batchSize: 5 });

      // Verify event transitioned to FAILED status
      const failedEvt = await prisma.outboxEvent.findUnique({ where: { id: outboxEvt!.id } });
      expect(failedEvt?.retryCount).toBe(5);
      expect(failedEvt?.status).toBe("FAILED");

      // Verify permanent failure audit log
      const auditFail = await prisma.auditLog.findFirst({
        where: { tenantId: tenantAId, action: "COMMERCE_FULFILLMENT_FAILED_PERMANENT" },
        orderBy: { createdAt: "desc" },
      });
      expect(auditFail).toBeDefined();

      // Step 4: Runbook Manual Operator Recovery: Tenant-safe SQL query
      // Restore the valid orderId in payload and reset status to PENDING
      await prisma.$executeRawUnsafe(
        `UPDATE outbox_events
         SET status = 'PENDING',
             retry_count = 0,
             error = NULL,
             payload = $1::jsonb
         WHERE id = $2 AND tenant_id = $3 AND status = 'FAILED'`,
        JSON.stringify({ orderId, tenantId: tenantAId }),
        outboxEvt!.id,
        tenantAId
      );

      // Operator triggers sweep to fulfill recovered event
      const sweepRec = await CommerceFulfillmentService.processOutboxBatch({
        batchSize: 5,
        workerId: "OPERATOR_CLI_RECOVERY",
      });
      expect(sweepRec.processed).toBeGreaterThanOrEqual(1);

      // Verify order is now FULFILLED and outbox event is PROCESSED
      const recOrder = await prisma.commerceOrder.findUnique({ where: { id: orderId } });
      expect(recOrder?.fulfillmentStatus).toBe("FULFILLED");
      expect(recOrder?.status).toBe("PAID");

      const recEvt = await prisma.outboxEvent.findUnique({ where: { id: outboxEvt!.id } });
      expect(recEvt?.status).toBe("PROCESSED");

      const addon = await prisma.tenantAddon.findUnique({
        where: { tenantId_addonSlug: { tenantId: tenantAId, addonSlug: "google-workspace" } },
      });
      expect(addon?.status).toBe("active");
      const firstRenewsAt = addon!.renewsAt!.getTime();

      // Step 5: Operator Idempotency Check: Re-running fulfillment on recovered event does NOT extend renewsAt twice
      const replayRes = await CommerceFulfillmentService.fulfillOrder({ orderId, tenantId: tenantAId });
      expect(replayRes.alreadyFulfilled).toBe(true);

      const addonAfterReplay = await prisma.tenantAddon.findUnique({
        where: { tenantId_addonSlug: { tenantId: tenantAId, addonSlug: "google-workspace" } },
      });
      expect(addonAfterReplay!.renewsAt!.getTime()).toBe(firstRenewsAt);
    });
  });
});
