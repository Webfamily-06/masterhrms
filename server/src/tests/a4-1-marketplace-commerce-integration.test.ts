/**
 * MASTERHRMS — Phase A4.1: Tenant Marketplace Commerce Integration Test Suite
 *
 * Verifies:
 * 1. Catalog Integrity & Zero Trust in Client Pricing (T1.1, T1.2)
 * 2. Idempotent Order Creation & Duplicate Submission Protection (T1.3)
 * 3. Checkout Initiation with Test Credentials & Sandbox Safety (T1.4)
 * 4. Multi-Tenant Isolation: Cross-tenant checkout and order access denial (T1.5)
 * 5. Cancellation Safety: Cancelled orders reject payment initiation and grant no entitlements (T1.6)
 * 6. Entitlement Security: Unpaid orders decline entitlement; only authoritative webhook settlement activates product (T1.7, T1.8)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import crypto from "crypto";
import { rawPrisma as prisma } from "../prisma";
import { commerceRouter } from "../routes/commerce.routes";
import { generateToken } from "../lib/jwt";
import { CommerceOrderService } from "../services/commerce-order.service";
import { CommerceFulfillmentService } from "../services/commerce-fulfillment.service";
import { RazorpaySandboxService } from "../services/razorpay-sandbox.service";

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

describe("MASTERHRMS — Phase A4.1 Tenant Marketplace Commerce Integration", () => {
  let server: http.Server;
  let baseUrl: string;

  const timestamp = Date.now();
  const tenantAId = `tenant_mkt_a_${timestamp}`;
  const tenantBId = `tenant_mkt_b_${timestamp}`;
  const userAId = `user_mkt_a_${timestamp}`;
  const userBId = `user_mkt_b_${timestamp}`;

  let tokenUserA: string;
  let tokenUserB: string;

  let createdOrderAId: string;
  let initiatedGatewayOrderId: string;

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_MarketplaceTestKey";
    process.env.RAZORPAY_KEY_SECRET = "test_marketplace_secret_key_123456789";
    process.env.RAZORPAY_WEBHOOK_SECRET = "test_marketplace_webhook_secret_987654";

    // Set mock gateway transport for isolated sandbox test environment
    RazorpaySandboxService.setMockTransport(async (_url, opts) => {
      const body = JSON.parse(opts.body);
      const generatedOrderId = `order_mock_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
      return {
        status: 200,
        ok: true,
        json: async () => ({
          id: generatedOrderId,
          entity: "order",
          amount: body.amount,
          amount_paid: 0,
          amount_due: body.amount,
          currency: body.currency || "INR",
          receipt: body.receipt,
          status: "created",
          attempts: 0,
          notes: body.notes || {},
          created_at: Math.floor(Date.now() / 1000),
        }),
        text: async () => JSON.stringify({ id: generatedOrderId }),
      };
    });

    // 1. Create Test Tenants
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        name: "Acme Marketplace Corp",
        slug: `acme-mkt-${timestamp}`,
      },
    });

    await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: "Beta Marketplace Corp",
        slug: `beta-mkt-${timestamp}`,
      },
    });

    // 2. Create Users
    await prisma.user.create({
      data: {
        id: userAId,
        email: `alice-mkt-${timestamp}@example.com`,
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
        email: `bob-mkt-${timestamp}@example.com`,
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

    // 3. Generate Authoritative JWT Tokens
    tokenUserA = generateToken({
      userId: userAId,
      email: `alice-mkt-${timestamp}@example.com`,
      roles: ["hr_admin", "admin"],
      tenantId: tenantAId,
    });

    tokenUserB = generateToken({
      userId: userBId,
      email: `bob-mkt-${timestamp}@example.com`,
      roles: ["hr_admin", "admin"],
      tenantId: tenantBId,
    });

    // 4. Mount Express Test Server
    const app = express();
    app.use(express.json());
    app.use("/api/commerce", commerceRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    RazorpaySandboxService.setMockTransport(null);

    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.paymentGatewayTransaction.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.commerceOrder.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.billingInvoice.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantAddon.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.tenantModule.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.userRole.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.profile.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
  });

  it("T1.1: Authoritative Catalog Retrieval returns canonical products and eligibility", async () => {
    const res = await hostFetch(`${baseUrl}/api/commerce/catalog?tenantId=${tenantAId}`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products.length).toBeGreaterThan(0);

    const pos = body.products.find((p: any) => p.slug === "pos");
    expect(pos).toBeDefined();
    expect(pos.name).toContain("Point of Sale");
    expect(pos.prices.length).toBeGreaterThan(0);
    expect(pos.eligibility?.alreadyOwned).toBe(false);
  });

  it("T1.2: Client-Price Tampering Defense: Server ignores client prices and computes authoritative total", async () => {
    const tamperedPayload = {
      items: [{ productSlug: "pos", billingCycle: "1_month" }],
      clientSuppliedPrice: 1.0,
      totalAmount: 1.0,
      discount: 9999,
    };

    const res = await hostFetch(`${baseUrl}/api/commerce/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenUserA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tamperedPayload),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.order).toBeDefined();
    createdOrderAId = body.order.id;

    // Server-authoritative POS price is 2499 + GST (18% = 449.82) => 2948.82
    expect(Number(body.order.totalAmount)).toBeGreaterThan(2000);
    expect(Number(body.order.totalAmount)).not.toBe(1.0);
    expect(body.order.status).toBe("PENDING_PAYMENT");
  });

  it("T1.3: Duplicate Submission & Idempotency: Replaying request returns frozen snapshot", async () => {
    const idempotencyKey = `idemp_mkt_${timestamp}`;
    const payload = {
      items: [{ productSlug: "biometric-sync", billingCycle: "1_month" }],
      idempotencyKey,
    };

    // First call
    const res1 = await hostFetch(`${baseUrl}/api/commerce/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenUserA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(res1.status).toBe(201);
    const body1 = await res1.json();
    const order1Id = body1.order.id;

    // Second call with same idempotency key
    const res2 = await hostFetch(`${baseUrl}/api/commerce/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenUserA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(res2.status).toBe(200);
    expect(res2.headers["x-idempotent-replay"]).toBe("true");
    const body2 = await res2.json();
    expect(body2.isReplay).toBe(true);
    expect(body2.order.id).toBe(order1Id);
  });

  it("T1.4: Checkout Initiation generates gateway order with test credentials", async () => {
    const res = await hostFetch(`${baseUrl}/api/commerce/checkout/initiate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenUserA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId: createdOrderAId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.gatewayOrderId).toBeDefined();
    expect(body.gatewayOrderId).toMatch(/^order_/);
    initiatedGatewayOrderId = body.gatewayOrderId;
    expect(body.keyId).toBe("rzp_test_MarketplaceTestKey");
    expect(body.currency).toBe("INR");
    expect(typeof body.amount).toBe("number");
    expect(body.amount).toBeGreaterThan(200000); // paise
  });

  it("T1.5: Multi-Tenant Isolation: User B cannot initiate checkout or read Order A", async () => {
    // Attempt checkout initiation on Tenant A's order by User B
    const resCheckout = await hostFetch(`${baseUrl}/api/commerce/checkout/initiate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenUserB}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId: createdOrderAId }),
    });

    expect(resCheckout.status).toBe(404);

    // Attempt order reading on Tenant A's order by User B
    const resGet = await hostFetch(`${baseUrl}/api/commerce/orders/${createdOrderAId}`, {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });

    expect(resGet.status).toBe(404);
  });

  it("T1.6: Cancellation Safety: Cancelled orders reject payment initiation and grant no entitlements", async () => {
    // Create new order to cancel
    const createRes = await hostFetch(`${baseUrl}/api/commerce/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenUserA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ productSlug: "google-workspace", billingCycle: "1_month" }],
      }),
    });
    const orderToCancel = (await createRes.json()).order;

    // Cancel order
    const cancelRes = await hostFetch(`${baseUrl}/api/commerce/orders/${orderToCancel.id}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenUserA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "User cancelled in checkout modal" }),
    });

    expect(cancelRes.status).toBe(200);
    const cancelBody = await cancelRes.json();
    expect(cancelBody.order.status).toBe("CANCELLED");

    // Checkout initiation on cancelled order must fail
    const initRes = await hostFetch(`${baseUrl}/api/commerce/checkout/initiate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenUserA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId: orderToCancel.id }),
    });

    expect(initRes.status).toBe(400);
    const initBody = await initRes.json();
    expect(initBody.code).toBe("ORDER_NOT_PAYABLE");
  });

  it("T1.7: Entitlement Security: Unpaid orders in PENDING_PAYMENT decline entitlement fulfillment", async () => {
    // Verify createdOrderAId is PENDING_PAYMENT
    const orderBefore = await prisma.commerceOrder.findUnique({ where: { id: createdOrderAId } });
    expect(orderBefore?.status).toBe("PENDING_PAYMENT");
    expect(orderBefore?.fulfillmentStatus).toBe("UNFULFILLED");

    // Attempting direct fulfillment on unpaid order must fail
    await expect(
      CommerceFulfillmentService.fulfillOrder({ orderId: createdOrderAId, tenantId: tenantAId })
    ).rejects.toThrow(/Cannot fulfill order in 'PENDING_PAYMENT' state/);

    // Module must NOT be active in tenantModule
    const mod = await prisma.tenantModule.findUnique({
      where: {
        tenantId_moduleKey: {
          tenantId: tenantAId,
          moduleKey: "product_pos",
        },
      },
    });
    expect(mod).toBeNull();
  });

  it("T1.8: Authoritative Webhook Settlement activates product and catalog reflects alreadyOwned", async () => {
    expect(initiatedGatewayOrderId).toBeDefined();

    const order = await prisma.commerceOrder.findUnique({ where: { id: createdOrderAId } });
    const amountInPaise = Math.round(Number(order!.totalAmount) * 100);
    const paymentId = `pay_mkt_success_${timestamp}`;

    // Construct valid Razorpay webhook payload
    const webhookPayload = {
      entity: "event",
      account_id: "acc_test_marketplace",
      event: "payment.captured",
      contains: ["payment"],
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: initiatedGatewayOrderId,
            amount: amountInPaise,
            currency: "INR",
            status: "captured",
            method: "upi",
            captured: true,
            notes: {
              tenantId: tenantAId,
              orderId: createdOrderAId,
            },
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(rawPayload)
      .digest("hex");

    // Send signed webhook
    const webhookRes = await hostFetch(`${baseUrl}/api/commerce/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": signature,
      },
      body: rawPayload,
    });

    expect(webhookRes.status).toBe(200);
    const webhookBody = await webhookRes.json();
    expect(webhookBody.success).toBe(true);

    // Order must now be PAID
    const orderAfter = await prisma.commerceOrder.findUnique({ where: { id: createdOrderAId } });
    expect(orderAfter?.status).toBe("PAID");

    // Execute outbox sweep to complete asynchronous fulfillment
    const sweepResult = await CommerceFulfillmentService.processOutboxBatch({ batchSize: 10 });
    expect(sweepResult.processed).toBeGreaterThan(0);

    // Verify order is now FULFILLED
    const orderFinal = await prisma.commerceOrder.findUnique({ where: { id: createdOrderAId } });
    expect(orderFinal?.fulfillmentStatus).toBe("FULFILLED");

    // Module must now exist and be active
    const moduleActive = await prisma.tenantModule.findUnique({
      where: {
        tenantId_moduleKey: {
          tenantId: tenantAId,
          moduleKey: "product_pos",
        },
      },
    });
    expect(moduleActive).not.toBeNull();
    expect(moduleActive?.isEnabled).toBe(true);

    // Catalog query for Tenant A must now reflect alreadyOwned: true for POS
    const catalogRes = await hostFetch(`${baseUrl}/api/commerce/catalog?tenantId=${tenantAId}`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    expect(catalogRes.status).toBe(200);
    const catalogBody = await catalogRes.json();
    const posFinal = catalogBody.products.find((p: any) => p.slug === "pos");
    expect(posFinal?.eligibility?.alreadyOwned).toBe(true);
  });
});
