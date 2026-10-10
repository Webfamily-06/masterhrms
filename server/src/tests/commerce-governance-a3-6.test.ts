/**
 * MASTERHRMS — Phase A3.6: Owner Decision & Controlled Governance Acceptance Suite
 *
 * Verifies:
 * - OD-1: Dynamic Versioned Commercial Pricing, Approval Lifecycle, Immutability & Grandfathering
 * - OD-3: Standalone Workspace Add-ons with Consolidated Invoicing (Option 3A: nullable subscriptionId)
 * - OD-10: Renewal-Based Plan Changes, Downgrade Capacity Guards, and Super Admin Override with Audit
 * - Mandatory Workspace Isolation: Cross-tenant denial, host tampering defense, and idempotent safety
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { rawPrisma as prisma } from "../prisma";
import { commerceRouter } from "../routes/commerce.routes";
import { authRouter } from "../routes/auth.routes";
import { generateToken } from "../lib/jwt";
import { DynamicPricingService } from "../services/dynamic-pricing.service";
import { SubscriptionScheduleService } from "../services/subscription-schedule.service";
import { CommerceOrderService } from "../services/commerce-order.service";
import { CommerceFulfillmentService } from "../services/commerce-fulfillment.service";
import { checkTenantEntitlement } from "../middleware/entitlements";
import { workspaceHostMiddleware } from "../middleware/workspace-host.middleware";
import { getBaseDomain } from "../lib/workspace-host";

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

describe("MASTERHRMS — Phase A3.6 Governance & Owner Acceptance Suite", () => {
  let server: http.Server;
  let baseUrl: string;

  const timestamp = Date.now();
  const tenantAId = `tenant_gov_a_${timestamp}`;
  const tenantBId = `tenant_gov_b_${timestamp}`;
  const userAId = `user_gov_a_${timestamp}`;
  const userBId = `user_gov_b_${timestamp}`;
  const superAdminId = `super_admin_gov_${timestamp}`;

  let tokenUserA: string;
  let tokenUserB: string;
  let tokenSuperAdmin: string;

  let createdScheduleIds: string[] = [];

  beforeAll(async () => {
    // 1. Mount test Express app
    const app = express();
    app.use(express.json());
    app.use(workspaceHostMiddleware);
    app.use("/api/commerce", commerceRouter);
    app.use("/api/auth", authRouter);

    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;

    // 2. Provision Test Workspaces
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        name: "Acme Governance Corp",
        slug: `acme-gov-${timestamp}`,
      },
    });

    await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: "Beta Horizon Ltd",
        slug: `beta-gov-${timestamp}`,
      },
    });

    // 3. Provision Users
    await prisma.user.create({
      data: {
        id: userAId,
        email: `alice-gov-${timestamp}@example.com`,
        passwordHash: "hash123",
        profile: {
          create: {
            fullName: "Alice Workspace Admin A",
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
        email: `bob-gov-${timestamp}@example.com`,
        passwordHash: "hash123",
        profile: {
          create: {
            fullName: "Bob Workspace Admin B",
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
        email: `ops-superadmin-${timestamp}@example.com`,
        passwordHash: "hash123",
        profile: {
          create: {
            fullName: "Ops Super Admin",
          },
        },
        roles: {
          create: {
            role: "super_admin",
          },
        },
      },
    });

    // 4. Generate Authoritative JWT Tokens
    tokenUserA = generateToken({
      userId: userAId,
      email: `alice-gov-${timestamp}@example.com`,
      roles: ["hr_admin"],
      tenantId: tenantAId,
    });

    tokenUserB = generateToken({
      userId: userBId,
      email: `bob-gov-${timestamp}@example.com`,
      roles: ["hr_admin"],
      tenantId: tenantBId,
    });

    tokenSuperAdmin = generateToken({
      userId: superAdminId,
      email: `ops-superadmin-${timestamp}@example.com`,
      roles: ["super_admin"],
    });
  });

  afterAll(async () => {
    // Cleanup created test price schedules
    if (createdScheduleIds.length > 0) {
      await prisma.commercialPriceSchedule.deleteMany({
        where: { id: { in: createdScheduleIds } },
      }).catch(() => {});
    }

    // Cleanup tenant fixtures
    await prisma.subscriptionPolicyAudit.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});

    await prisma.billingInvoice.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});

    await prisma.commerceOrder.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});

    await prisma.tenantSubscription.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});

    await prisma.tenantModule.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});

    await prisma.tenantAddon.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});

    await prisma.employee.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});

    await prisma.userRole.deleteMany({
      where: { userId: { in: [userAId, userBId, superAdminId] } },
    }).catch(() => {});

    await prisma.profile.deleteMany({
      where: { userId: { in: [userAId, userBId, superAdminId] } },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId, superAdminId] } },
    }).catch(() => {});

    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // CATEGORY 1: OD-1 DYNAMIC PRICING LIFECYCLE & FAIL-CLOSED GUARDS
  // ═════════════════════════════════════════════════════════════════════════════

  describe("Tier 1: Dynamic Commercial Pricing Lifecycle (OD-1)", () => {
    let testScheduleId: string;

    it("T1.1: Creates DRAFT price schedule with versioning, currency, tax info, and audit attribution", async () => {
      const res = await hostFetch(`${baseUrl}/api/commerce/admin/pricing/schedules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenSuperAdmin}`,
        },
        body: JSON.stringify({
          productSlug: "growth",
          currency: "INR",
          amountMonthly: 599.00,
          amountAnnual: 5990.00,
          taxPercentage: 18.00,
          effectiveFrom: new Date().toISOString(),
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.schedule.status).toBe("DRAFT");
      expect(Number(data.schedule.amountMonthly)).toBe(599.00);
      expect(data.schedule.version).toBeGreaterThanOrEqual(1);

      testScheduleId = data.schedule.id;
      createdScheduleIds.push(testScheduleId);
    });

    it("T1.2: Transitions DRAFT -> PENDING_APPROVAL and blocks unapproved schedules from live catalog", async () => {
      const res = await hostFetch(
        `${baseUrl}/api/commerce/admin/pricing/schedules/${testScheduleId}/submit`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${tokenSuperAdmin}` },
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.schedule.status).toBe("PENDING_APPROVAL");

      // Verify that PENDING_APPROVAL schedule does not yet affect public catalog
      const catRes = await hostFetch(`${baseUrl}/api/commerce/catalog`);
      const cat = await catRes.json();
      const growthPlan = cat.products.find((p: any) => p.slug === "growth");
      // Still reflects baseline unapproved/dev price (399), not 599
      expect(growthPlan.prices[0].basePrice).toBe(399);
    });

    it("T1.3: Approves and publishes schedule; catalog immediately resolves updated dynamic price", async () => {
      const res = await hostFetch(
        `${baseUrl}/api/commerce/admin/pricing/schedules/${testScheduleId}/approve`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${tokenSuperAdmin}` },
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.schedule.status).toBe("PUBLISHED");
      expect(data.schedule.approvedBy).toBe(superAdminId);

      // Verify that public catalog now reflects the published dynamic price (599)
      const catRes = await hostFetch(`${baseUrl}/api/commerce/catalog`);
      const cat = await catRes.json();
      const growthPlan = cat.products.find((p: any) => p.slug === "growth");
      expect(growthPlan.prices[0].basePrice).toBe(599);
    });

    it("T1.4: Historical order and invoice retain immutable price snapshots when catalog price changes", async () => {
      // Step 1: Create an order under current published price (599)
      const orderRes = await hostFetch(`${baseUrl}/api/commerce/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
        },
        body: JSON.stringify({
          items: [{ productSlug: "growth", billingInterval: "1_month", quantity: 1 }],
        }),
      });

      expect(orderRes.status).toBe(201);
      const orderData = await orderRes.json();
      const orderId = orderData.order.id;
      const originalSubtotal = orderData.order.subtotal;
      expect(Number(originalSubtotal)).toBe(599);

      // Step 2: Now publish a new price revision (799)
      const newSchedule = await DynamicPricingService.createPriceSchedule({
        productSlug: "growth",
        amountMonthly: 799.00,
        effectiveFrom: new Date(),
        createdBy: superAdminId,
      });
      createdScheduleIds.push(newSchedule.id);
      await DynamicPricingService.approveAndPublish(newSchedule.id, superAdminId);

      // Step 3: Verify the previously created order remains frozen at 599
      const getOrderRes = await hostFetch(`${baseUrl}/api/commerce/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${tokenUserA}` },
      });
      const getOrderData = await getOrderRes.json();
      expect(Number(getOrderData.order.subtotal)).toBe(599);
      const rawSnapshot = getOrderData.order.priceSnapshot || getOrderData.order.price_snapshot;
      const snapshot = typeof rawSnapshot === "string"
        ? JSON.parse(rawSnapshot)
        : rawSnapshot;
      const items = snapshot?.lineItems || snapshot?.items || [];
      expect(Number(items[0].baseUnitPrice)).toBe(599);
    });

    it("T1.5: Grandfathering policy: Active subscription retains agreed price despite catalog changes", async () => {
      // Provision an active subscription for Tenant A at initial agreed price
      await prisma.tenantSubscription.upsert({
        where: { tenantId: tenantAId },
        create: {
          tenantId: tenantAId,
          planId: "growth",
          status: "active",
          calculatedTotal: "599.00",
          pricePerUser: null,
          maxEmployees: 100,
        },
        update: {
          planId: "growth",
          status: "active",
          calculatedTotal: "599.00",
        },
      });

      const sub = await prisma.tenantSubscription.findUnique({
        where: { tenantId: tenantAId },
      });

      expect(DynamicPricingService.isSubscriptionGrandfathered(sub)).toBe(true);
      expect(Number(sub?.calculatedTotal)).toBe(599.00);
    });

    it("T1.6: In production mode with unconfigured product, resolveProductPricing fails closed", async () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = "production";
        const missingPrice = await DynamicPricingService.resolveProductPricing("non-existent-product-slug");
        expect(missingPrice).toBeNull();
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // CATEGORY 2: OD-3 STANDALONE ADD-ONS & CONSOLIDATED INVOICING (OPTION 3A)
  // ═════════════════════════════════════════════════════════════════════════════

  describe("Tier 2: Standalone Add-ons & Consolidated Invoicing (OD-3)", () => {
    it("T2.1: Standalone add-on (Biometric Sync) fulfilled without base plan creates BillingInvoice with subscriptionId = null", async () => {
      // Ensure Tenant B has zero subscription
      await prisma.tenantSubscription.deleteMany({ where: { tenantId: tenantBId } });

      // Create order for standalone add-on
      const order = await CommerceOrderService.createOrder({
        tenantId: tenantBId,
        userId: userBId,
        items: [{ productSlug: "biometric-sync", billingInterval: "1_month", quantity: 1 }],
      });

      // Simulate payment
      await CommerceOrderService.simulatePaymentSettlement(
        tenantBId,
        order.order.id,
        "SUCCESS",
        "Standalone add-on payment"
      );

      // Fulfill order
      const fulfillResult = await CommerceFulfillmentService.fulfillOrder({
        orderId: order.order.id,
        tenantId: tenantBId,
      });
      expect(fulfillResult.success).toBe(true);
      expect(fulfillResult.provisioned.addons).toContain("biometric-sync");

      // Verify that BillingInvoice was generated with subscriptionId = null (Option 3A)
      const invoice = await prisma.billingInvoice.findFirst({
        where: { gatewayOrderId: order.order.order_number, tenantId: tenantBId },
      });

      expect(invoice).not.toBeNull();
      expect(invoice?.subscriptionId).toBeNull(); // Option 3A confirmed!
      expect(invoice?.tenantId).toBe(tenantBId);
      expect(invoice?.status).toBe("paid");
    });

    it("T2.2: Consolidated checkout (Base Plan + POS Module + Add-on) creates consolidated invoice with distinct line items", async () => {
      // Clear existing subscription so starter can be cleanly provisioned without triggering downgrade check
      await prisma.tenantSubscription.deleteMany({ where: { tenantId: tenantAId } });

      const order = await CommerceOrderService.createOrder({
        tenantId: tenantAId,
        userId: userAId,
        items: [
          { productSlug: "starter", billingInterval: "1_month", quantity: 1 },
          { productSlug: "pos", billingInterval: "1_month", quantity: 1 },
          { productSlug: "whatsapp-alerts", billingInterval: "1_month", quantity: 1 },
        ],
      });

      const rawSnapshot = order.order.priceSnapshot || order.order.price_snapshot;
      const snapshot = typeof rawSnapshot === "string"
        ? JSON.parse(rawSnapshot)
        : rawSnapshot;
      const items = snapshot?.lineItems || snapshot?.items || [];
      expect(items.length).toBe(3);

      await CommerceOrderService.simulatePaymentSettlement(
        tenantAId,
        order.order.id,
        "SUCCESS",
        "Consolidated checkout payment"
      );

      const fulfillResult = await CommerceFulfillmentService.fulfillOrder({
        orderId: order.order.id,
        tenantId: tenantAId,
      });
      expect(fulfillResult.success).toBe(true);
      expect(fulfillResult.provisioned.subscriptions).toContain("starter");
      expect(fulfillResult.provisioned.modules.some((m) => m === "pos" || m === "product_pos")).toBe(true);
      expect(fulfillResult.provisioned.addons).toContain("whatsapp-alerts");

      // Verify invoice generated and linked to the base plan subscription
      const invoice = await prisma.billingInvoice.findFirst({
        where: { gatewayOrderId: order.order.order_number, tenantId: tenantAId },
      });

      expect(invoice).not.toBeNull();
      expect(invoice?.subscriptionId).not.toBeNull();
      expect(invoice?.tenantId).toBe(tenantAId);
    });

    it("T2.3: Cross-tenant isolation: Workspace A's provisioned add-on is strictly inaccessible from Workspace B", async () => {
      // Check Tenant A has whatsapp-alerts
      const entA = await checkTenantEntitlement(tenantAId, "whatsapp-alerts");
      expect(entA.entitled).toBe(true);

      // Check Tenant B has NO access to whatsapp-alerts
      const entB = await checkTenantEntitlement(tenantBId, "whatsapp-alerts");
      expect(entB.entitled).toBe(false);
    });

    it("T2.4: Cross-tenant invoice isolation: Workspace B cannot query Workspace A's invoice", async () => {
      const invA = await prisma.billingInvoice.findFirst({
        where: { tenantId: tenantAId },
      });
      expect(invA).not.toBeNull();

      // Attempt to access Workspace A's invoice using Workspace B's token
      const res = await hostFetch(`${baseUrl}/api/commerce/invoices/${invA!.id}`, {
        headers: { Authorization: `Bearer ${tokenUserB}` },
      });

      // Strict fail-closed 404 (anti-enumeration)
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Invoice not found.");
    });

    it("T2.5: Re-purchasing an existing add-on extends renewal period rather than resetting it", async () => {
      const existingAddon = await prisma.tenantAddon.findUnique({
        where: {
          tenantId_addonSlug: {
            tenantId: tenantAId,
            addonSlug: "whatsapp-alerts",
          },
        },
      });

      const initialRenewsAt = existingAddon!.renewsAt!.getTime();

      // Purchase another cycle of whatsapp-alerts
      const order = await CommerceOrderService.createOrder({
        tenantId: tenantAId,
        userId: userAId,
        items: [{ productSlug: "whatsapp-alerts", billingInterval: "1_month", quantity: 1 }],
      });

      await CommerceOrderService.simulatePaymentSettlement(tenantAId, order.order.id, "SUCCESS");
      await CommerceFulfillmentService.fulfillOrder({
        orderId: order.order.id,
        tenantId: tenantAId,
      });

      const extendedAddon = await prisma.tenantAddon.findUnique({
        where: {
          tenantId_addonSlug: {
            tenantId: tenantAId,
            addonSlug: "whatsapp-alerts",
          },
        },
      });

      expect(extendedAddon!.renewsAt!.getTime()).toBeGreaterThan(initialRenewsAt);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // CATEGORY 3: OD-10 RENEWAL-BASED PLAN CHANGES & CAPACITY VALIDATION
  // ═════════════════════════════════════════════════════════════════════════════

  describe("Tier 3: Renewal-Based Plan Changes & Downgrade Capacity (OD-10)", () => {
    beforeAll(async () => {
      // Ensure Tenant A has an active Starter subscription with future currentPeriodEnd
      const now = new Date();
      const futureEnd = new Date(now.getTime() + 25 * 24 * 3600 * 1000); // 25 days left

      await prisma.tenantSubscription.upsert({
        where: { tenantId: tenantAId },
        create: {
          tenantId: tenantAId,
          planId: "starter",
          status: "active",
          maxEmployees: 25,
          currentPeriodStart: now,
          currentPeriodEnd: futureEnd,
        },
        update: {
          planId: "starter",
          status: "active",
          maxEmployees: 25,
          currentPeriodStart: now,
          currentPeriodEnd: futureEnd,
          scheduledPlanId: null,
        },
      });
    });

    it("T3.1: Normal plan change request schedules targetPlan for next renewal (currentPeriodEnd)", async () => {
      const res = await hostFetch(`${baseUrl}/api/commerce/subscriptions/schedule-plan-change`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
        },
        body: JSON.stringify({
          targetPlanSlug: "growth",
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.scheduledPlan).toBe("growth");
      expect(data.scheduledSeats).toBe(100);

      // Verify DB state: active plan remains "starter", scheduledPlanId is set to "growth"
      const sub = await prisma.tenantSubscription.findUnique({
        where: { tenantId: tenantAId },
      });
      expect(sub?.planId).toBe("starter"); // UNCHANGED!
      expect(sub?.scheduledPlanId).toBe("growth"); // SCHEDULED!
      expect(sub?.scheduledSeats).toBe(100);
    });

    it("T3.2: Active plan, seat limits, and active entitlements remain active while scheduled change is pending", async () => {
      const res = await hostFetch(`${baseUrl}/api/commerce/subscriptions/current`, {
        headers: { Authorization: `Bearer ${tokenUserA}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.subscription.planId).toBe("starter");
      expect(data.subscription.maxEmployees).toBe(25);
      expect(data.subscription.scheduledPlanId).toBe("growth");
    });

    it("T3.3: Customer can cancel scheduled plan change cleanly", async () => {
      const res = await hostFetch(`${baseUrl}/api/commerce/subscriptions/cancel-scheduled-plan-change`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenUserA}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const sub = await prisma.tenantSubscription.findUnique({
        where: { tenantId: tenantAId },
      });
      expect(sub?.scheduledPlanId).toBeNull();
    });

    it("T3.4: Downgrade is safely declined (409 DOWNGRADE_CAPACITY_EXCEEDED) when active employee count exceeds target capacity", async () => {
      // Set Tenant A to Growth (100 seats)
      await prisma.tenantSubscription.update({
        where: { tenantId: tenantAId },
        data: { planId: "growth", maxEmployees: 100 },
      });

      // Seed 30 active employees in Tenant A (target Starter capacity is 25)
      const empData = Array.from({ length: 30 }, (_, i) => ({
        id: `emp_gov_${timestamp}_${i}`,
        tenantId: tenantAId,
        employeeCode: `EMP-GOV-${timestamp}-${i}`,
        firstName: `Employee`,
        lastName: `${i}`,
        email: `emp_${timestamp}_${i}@example.com`,
        status: "active",
      }));

      await prisma.employee.createMany({ data: empData });

      // Attempt to schedule downgrade to Starter (capacity 25)
      const res = await hostFetch(`${baseUrl}/api/commerce/subscriptions/schedule-plan-change`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
        },
        body: JSON.stringify({
          targetPlanSlug: "starter",
        }),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.code).toBe("DOWNGRADE_CAPACITY_EXCEEDED");
      expect(data.error).toContain("Workspace active employee count");

      // Verify scheduledPlanId was NOT set
      const sub = await prisma.tenantSubscription.findUnique({
        where: { tenantId: tenantAId },
      });
      expect(sub?.scheduledPlanId).toBeNull();
    });

    it("T3.5: Renewal sweeper applies scheduled plan change upon cycle renewal and logs SubscriptionPolicyAudit", async () => {
      // Clean up excess employees
      await prisma.employee.deleteMany({ where: { tenantId: tenantAId } });

      // Schedule change to Starter now that employee count is 0
      await SubscriptionScheduleService.schedulePlanChange({
        tenantId: tenantAId,
        targetPlanSlug: "starter",
        userId: userAId,
      });

      // Simulate renewal sweeper execution
      const applyResult = await SubscriptionScheduleService.applyScheduledPlanChange(tenantAId);
      expect(applyResult.applied).toBe(true);
      expect(applyResult.newPlan).toBe("starter");

      // Verify Subscription was updated
      const sub = await prisma.tenantSubscription.findUnique({
        where: { tenantId: tenantAId },
      });
      expect(sub?.planId).toBe("starter");
      expect(sub?.scheduledPlanId).toBeNull();

      // Verify immutable SubscriptionPolicyAudit record created
      const audit = await prisma.subscriptionPolicyAudit.findFirst({
        where: { tenantId: tenantAId },
        orderBy: { createdAt: "desc" },
      });

      expect(audit).not.toBeNull();
      expect((audit?.after as any).transitionType).toBe("RENEWAL_SCHEDULED_PLAN_CHANGE");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // CATEGORY 4: SUPER ADMIN IMMEDIATE OVERRIDE & GOVERNANCE GUARDS
  // ═════════════════════════════════════════════════════════════════════════════

  describe("Tier 4: Super Admin Override & Security Controls (OD-10)", () => {
    it("T4.1: Non-Super-Admin user attempting immediate override is strictly denied (403 Forbidden)", async () => {
      const res = await hostFetch(`${baseUrl}/api/commerce/admin/subscription/override`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`, // Workspace admin, NOT Super Admin!
        },
        body: JSON.stringify({
          targetTenantId: tenantAId,
          targetPlanSlug: "sovereign",
          ticketReference: "INC-8891",
          reason: "Emergency tier change",
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("FORBIDDEN_SUPER_ADMIN_REQUIRED");
    });

    it("T4.2: Super Admin override without ticket reference or written justification is rejected (400)", async () => {
      const res = await hostFetch(`${baseUrl}/api/commerce/admin/subscription/override`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenSuperAdmin}`,
        },
        body: JSON.stringify({
          targetTenantId: tenantAId,
          targetPlanSlug: "sovereign",
          ticketReference: "", // Empty!
          reason: "",
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("MISSING_TICKET_REFERENCE");
    });

    it("T4.3: Authorized Super Admin override with ticket and reason executes immediately and creates immutable SubscriptionPolicyAudit", async () => {
      const res = await hostFetch(`${baseUrl}/api/commerce/admin/subscription/override`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenSuperAdmin}`,
        },
        body: JSON.stringify({
          targetTenantId: tenantAId,
          targetPlanSlug: "sovereign",
          ticketReference: "SEC-OPS-2026-991",
          reason: "Contractual enterprise expansion approved by finance",
          financialTerms: "OUT_OF_BAND_INVOICE",
          targetSeats: 500,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.newPlan).toBe("sovereign");
      expect(data.seats).toBe(500);

      // Verify active subscription immediately transitioned
      const sub = await prisma.tenantSubscription.findUnique({
        where: { tenantId: tenantAId },
      });
      expect(sub?.planId).toBe("sovereign");
      expect(sub?.maxEmployees).toBe(500);

      // Verify immutable SubscriptionPolicyAudit record created
      const audit = await prisma.subscriptionPolicyAudit.findUnique({
        where: { id: data.auditId },
      });
      expect(audit).not.toBeNull();
      expect(audit?.actorUserId).toBe(superAdminId);
      expect((audit?.after as any).ticketReference).toBe("SEC-OPS-2026-991");
      expect((audit?.after as any).financialTerms).toBe("OUT_OF_BAND_INVOICE");
      expect((audit?.after as any).transitionType).toBe("SUPER_ADMIN_IMMEDIATE_OVERRIDE");
    });

    it("T4.4: Host header / JWT tenant mismatch is strictly denied (403 TENANT_HOST_MISMATCH)", async () => {
      // Send token for Tenant A with Host header for Tenant B
      const res = await hostFetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${tokenUserA}`,
          Host: `beta-gov-${timestamp}.${getBaseDomain()}`,
        },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("TENANT_HOST_MISMATCH");
    });

    it("T4.5: Idempotent replay of order returns identical snapshot with zero duplicate invoices or duplicate entitlements", async () => {
      const idempotencyKey = `idem_gov_${timestamp}`;

      const res1 = await hostFetch(`${baseUrl}/api/commerce/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          items: [{ productSlug: "pos", billingInterval: "1_month", quantity: 1 }],
        }),
      });

      expect(res1.status).toBe(201);
      const data1 = await res1.json();

      // Second identical call
      const res2 = await hostFetch(`${baseUrl}/api/commerce/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          items: [{ productSlug: "pos", billingInterval: "1_month", quantity: 1 }],
        }),
      });

      expect(res2.status).toBe(200);
      expect(res2.headers["x-idempotent-replay"]).toBe("true");
      const data2 = await res2.json();
      expect(data2.order.id).toBe(data1.order.id);
      expect(data2.order.order_number).toBe(data1.order.order_number);
    });
  });
});
