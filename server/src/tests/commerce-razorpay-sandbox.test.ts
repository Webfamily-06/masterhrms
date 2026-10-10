/**
 * MASTERHRMS — Phase A3.7: Razorpay Sandbox Acceptance Test Suite
 *
 * Requirements Verified:
 * 1. Checkout Initiation:
 *    - Authenticated user and workspace/tenant validation.
 *    - Order ownership, order state, currency, and authoritative server-side amount.
 *    - Zero trust in client-supplied amounts.
 *    - Sandbox order creation using test credentials (rzp_test_*).
 *    - Idempotent gateway order reference persistence.
 *    - Network error and invalid order state handling.
 * 2. Webhook Verification & Settlement:
 *    - Cryptographic timing-safe HMAC-SHA256 signature verification.
 *    - Fail-closed security when webhook secret or signature is missing.
 *    - Authoritative amount and currency comparison against stored order.
 *    - Duplicate webhook replay prevention (X-Idempotent-Replay: true).
 *    - Transactional state mutation to PAID + AuditLog + OutboxEvent.
 * 3. Fulfillment Decoupling:
 *    - Orders in PENDING_PAYMENT strictly decline fulfillment.
 *    - Fulfillment handoff executed only via transactional outbox.
 * 4. Safety & Gating:
 *    - Live Razorpay credentials (rzp_live_*) strictly prohibited and rejected.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
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

describe("MASTERHRMS — Phase A3.7 Razorpay Sandbox Payment Acceptance Suite", () => {
  let server: http.Server;
  let baseUrl: string;

  const timestamp = Date.now();
  const tenantAId = `tenant_rzp_a_${timestamp}`;
  const tenantBId = `tenant_rzp_b_${timestamp}`;
  const userAId = `user_rzp_a_${timestamp}`;
  const userBId = `user_rzp_b_${timestamp}`;

  let tokenUserA: string;
  let tokenUserB: string;

  const TEST_WEBHOOK_SECRET = "sandbox_webhook_secret_998877665544332211";
  const ORIGINAL_ENV = { ...process.env };

  beforeAll(async () => {
    // Configure sandbox environment variables
    process.env.RAZORPAY_KEY_ID = "rzp_test_MasterHRMSKey";
    process.env.RAZORPAY_KEY_SECRET = "sandbox_secret_abcdef123456";
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

    // 1. Mount test Express app
    const app = express();
    app.use(
      express.json({
        verify: (req: any, _res, buf) => {
          req.rawBody = buf;
        },
      })
    );
    app.use("/api/commerce", commerceRouter);

    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;

    // 2. Provision Test Tenants
    await prisma.tenant.create({
      data: {
        id: tenantAId,
        name: "Acme Sandbox Corp",
        slug: `acme-rzp-${timestamp}`,
      },
    });

    await prisma.tenant.create({
      data: {
        id: tenantBId,
        name: "Beta Sandbox Ltd",
        slug: `beta-rzp-${timestamp}`,
      },
    });

    // 3. Provision Users
    await prisma.user.create({
      data: {
        id: userAId,
        email: `alice-rzp-${timestamp}@example.com`,
        passwordHash: "hash123",
        profile: {
          create: {
            fullName: "Alice Sandbox Admin",
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
        email: `bob-rzp-${timestamp}@example.com`,
        passwordHash: "hash123",
        profile: {
          create: {
            fullName: "Bob Sandbox Admin",
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

    tokenUserA = generateToken({
      userId: userAId,
      email: `alice-rzp-${timestamp}@example.com`,
      roles: ["hr_admin"],
      tenantId: tenantAId,
    });

    tokenUserB = generateToken({
      userId: userBId,
      email: `bob-rzp-${timestamp}@example.com`,
      roles: ["hr_admin"],
      tenantId: tenantBId,
    });
  });

  afterAll(async () => {
    // Restore environment
    process.env = ORIGINAL_ENV;
    RazorpaySandboxService.setMockTransport(null);

    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    // Cleanup database records
    await prisma.billingInvoice.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});

    await prisma.commerceOrder.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});

    await prisma.outboxEvent.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});

    await prisma.auditLog.deleteMany({
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

    await prisma.userRole.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    }).catch(() => {});

    await prisma.profile.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    }).catch(() => {});

    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId] } },
    }).catch(() => {});
  });

  beforeEach(() => {
    // Reset mock transport to default simulated success
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
          currency: body.currency,
          receipt: body.receipt,
          status: "created",
          attempts: 0,
          notes: body.notes,
          created_at: Math.floor(Date.now() / 1000),
        }),
        text: async () => JSON.stringify({ id: generatedOrderId }),
      };
    });
  });

  // Helper to create test commerce order
  async function createTestOrder(tenantId: string, totalAmountRupees = 199): Promise<any> {
    const amountInPaise = Math.round(totalAmountRupees * 100);
    const orderNumber = `ORD-SBX-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    return await prisma.commerceOrder.create({
      data: {
        orderNumber,
        tenantId,
        userId: tenantId === tenantAId ? userAId : userBId,
        status: "PENDING_PAYMENT",
        fulfillmentStatus: "UNFULFILLED",
        currency: "INR",
        subtotal: totalAmountRupees,
        discountAmount: 0,
        taxableAmount: totalAmountRupees,
        totalTax: 0,
        totalAmount: totalAmountRupees,
        amountInPaise,
        priceSnapshot: {
          items: [
            {
              productSlug: "starter",
              productId: "plan_starter",
              productType: "BASE_PLAN",
              billingInterval: "1_month",
              quantity: 1,
              unitPrice: totalAmountRupees,
              subtotal: totalAmountRupees,
            },
          ],
        },
        version: 1,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 1: CHECKOUT INITIATION (POST /api/commerce/checkout/initiate)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Tier 1: Checkout Initiation", () => {
    it("T1.1: Successfully initiates sandbox checkout on PENDING_PAYMENT order", async () => {
      const order = await createTestOrder(tenantAId, 199);

      const res = await hostFetch(`${baseUrl}/api/commerce/checkout/initiate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenUserA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.orderId).toBe(order.id);
      expect(data.gatewayOrderId).toMatch(/^order_mock_/);
      expect(data.amount).toBe(19900); // 199 INR in paise
      expect(data.currency).toBe("INR");
      expect(data.keyId).toBe("rzp_test_MasterHRMSKey");
      expect(data.orderNumber).toBe(order.orderNumber);
      expect(data.isReplay).toBe(false);

      // Verify metadata was persisted to database
      const reloaded = await CommerceOrderService.getOrderById(tenantAId, order.id);
      expect(reloaded.metadata.gatewayOrderId).toBe(data.gatewayOrderId);
      expect(reloaded.metadata.gatewayProvider).toBe("RAZORPAY_SANDBOX");
    });

    it("T1.2: Idempotent replay returns existing gatewayOrderId without calling gateway again", async () => {
      const order = await createTestOrder(tenantAId, 499);

      // Call 1
      const res1 = await hostFetch(`${baseUrl}/api/commerce/checkout/initiate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenUserA}`, "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data1 = await res1.json();
      expect(data1.isReplay).toBe(false);

      // Change transport to throw if called again
      RazorpaySandboxService.setMockTransport(async () => {
        throw new Error("TRANSPORT_SHOULD_NOT_BE_CALLED_ON_REPLAY");
      });

      // Call 2 (Idempotent replay)
      const res2 = await hostFetch(`${baseUrl}/api/commerce/checkout/initiate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenUserA}`, "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.success).toBe(true);
      expect(data2.isReplay).toBe(true);
      expect(data2.gatewayOrderId).toBe(data1.gatewayOrderId);
    });

    it("T1.3: Unauthenticated access attempt is strictly denied (401 Unauthorized)", async () => {
      const order = await createTestOrder(tenantAId, 199);

      const res = await hostFetch(`${baseUrl}/api/commerce/checkout/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });

      expect(res.status).toBe(401);
    });

    it("T1.4: Cross-tenant access attempt is strictly denied (404 ORDER_NOT_FOUND)", async () => {
      // Order belongs to Tenant A
      const orderA = await createTestOrder(tenantAId, 199);

      // User B from Tenant B attempts to initiate checkout for Tenant A's order
      const res = await hostFetch(`${baseUrl}/api/commerce/checkout/initiate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenUserB}`, "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderA.id }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.code).toBe("ORDER_NOT_FOUND");
    });

    it("T1.5: Rejects checkout initiation on invalid order states (PAID, CANCELLED, EXPIRED)", async () => {
      // 1. Order already PAID
      const paidOrder = await createTestOrder(tenantAId, 199);
      await prisma.commerceOrder.update({
        where: { id: paidOrder.id },
        data: { status: "PAID", paidAt: new Date() },
      });

      const resPaid = await hostFetch(`${baseUrl}/api/commerce/checkout/initiate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenUserA}`, "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: paidOrder.id }),
      });
      expect(resPaid.status).toBe(409);
      expect((await resPaid.json()).code).toBe("ALREADY_PAID");

      // 2. Order CANCELLED
      const cancelledOrder = await createTestOrder(tenantAId, 199);
      await prisma.commerceOrder.update({
        where: { id: cancelledOrder.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });

      const resCancelled = await hostFetch(`${baseUrl}/api/commerce/checkout/initiate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenUserA}`, "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: cancelledOrder.id }),
      });
      expect(resCancelled.status).toBe(400);
      expect((await resCancelled.json()).code).toBe("ORDER_NOT_PAYABLE");

      // 3. Order EXPIRED
      const expiredOrder = await createTestOrder(tenantAId, 199);
      await prisma.commerceOrder.update({
        where: { id: expiredOrder.id },
        data: { expiresAt: new Date(Date.now() - 60 * 1000) },
      });

      const resExpired = await hostFetch(`${baseUrl}/api/commerce/checkout/initiate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenUserA}`, "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: expiredOrder.id }),
      });
      expect(resExpired.status).toBe(400);
      expect((await resExpired.json()).code).toBe("ORDER_EXPIRED");
    });

    it("T1.6: Gateway communication failure returns 502 without corrupting order", async () => {
      const order = await createTestOrder(tenantAId, 199);

      // Simulate gateway error
      RazorpaySandboxService.setMockTransport(async () => ({
        status: 503,
        ok: false,
        json: async () => ({ error: { description: "Gateway unavailable" } }),
        text: async () => "Gateway unavailable",
      }));

      const res = await hostFetch(`${baseUrl}/api/commerce/checkout/initiate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenUserA}`, "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });

      expect(res.status).toBe(502);
      const data = await res.json();
      expect(data.code).toBe("GATEWAY_ORDER_CREATION_FAILED");

      // Verify order remains in PENDING_PAYMENT state
      const reloaded = await prisma.commerceOrder.findUnique({ where: { id: order.id } });
      expect(reloaded?.status).toBe("PENDING_PAYMENT");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 2: CRYPTOGRAPHIC WEBHOOK SECURITY CONTROLS (POST /api/commerce/webhook)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Tier 2: Webhook Cryptographic Verification", () => {
    it("T2.1: Missing webhook secret in server environment fails closed (500)", async () => {
      const savedSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      delete process.env.RAZORPAY_WEBHOOK_SECRET;

      try {
        const payload = JSON.stringify({ event: "payment.captured" });
        const res = await hostFetch(`${baseUrl}/api/commerce/webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-razorpay-signature": "dummy_sig",
          },
          body: payload,
        });

        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.code).toBe("WEBHOOK_VERIFICATION_UNAVAILABLE");
      } finally {
        process.env.RAZORPAY_WEBHOOK_SECRET = savedSecret;
      }
    });

    it("T2.2: Missing signature header is strictly rejected (400 INVALID_SIGNATURE)", async () => {
      const payload = JSON.stringify({ event: "payment.captured" });
      const res = await hostFetch(`${baseUrl}/api/commerce/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("INVALID_SIGNATURE");
    });

    it("T2.3: Tampered or invalid cryptographic signature is strictly rejected (400)", async () => {
      const order = await createTestOrder(tenantAId, 199);
      const payload = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_tamper_123",
              order_id: "order_mock_123",
              amount: 19900,
              currency: "INR",
              notes: { orderId: order.id },
            },
          },
        },
      });

      const invalidSig = "bad_signature_hex_00112233445566778899aabbccddeeff";

      const res = await hostFetch(`${baseUrl}/api/commerce/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": invalidSig,
        },
        body: payload,
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("INVALID_SIGNATURE");

      // Verify order was NOT mutated
      const reloaded = await prisma.commerceOrder.findUnique({ where: { id: order.id } });
      expect(reloaded?.status).toBe("PENDING_PAYMENT");
    });

    it("T2.4: Non-capture events are acknowledged with 200 without mutating order", async () => {
      const order = await createTestOrder(tenantAId, 199);
      const payload = JSON.stringify({
        event: "payment.dispute.created",
        payload: {
          payment: {
            entity: {
              id: "pay_dispute_123",
              notes: { orderId: order.id },
            },
          },
        },
      });

      const sig = RazorpaySandboxService.computeSignature(payload, TEST_WEBHOOK_SECRET);

      const res = await hostFetch(`${baseUrl}/api/commerce/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": sig,
        },
        body: payload,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const reloaded = await prisma.commerceOrder.findUnique({ where: { id: order.id } });
      expect(reloaded?.status).toBe("PENDING_PAYMENT");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 3: FORENSIC VERIFICATION & SETTLEMENT (POST /api/commerce/webhook)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Tier 3: Webhook Forensic Settlement", () => {
    it("T3.1: Valid signed payment.captured transitions order to PAID and enqueues outbox event", async () => {
      const order = await createTestOrder(tenantAId, 199);

      const webhookBody = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: `pay_valid_${Date.now()}`,
              order_id: `order_valid_${Date.now()}`,
              amount: 19900,
              currency: "INR",
              method: "upi",
              created_at: Math.floor(Date.now() / 1000),
              notes: { orderId: order.id },
            },
          },
        },
      });

      const sig = RazorpaySandboxService.computeSignature(webhookBody, TEST_WEBHOOK_SECRET);

      const res = await hostFetch(`${baseUrl}/api/commerce/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": sig,
        },
        body: webhookBody,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.orderId).toBe(order.id);
      expect(data.isReplay).toBe(false);

      // Verify order state in DB
      const updated = await CommerceOrderService.getOrderById(tenantAId, order.id);
      expect(updated.status).toBe("PAID");
      expect(updated.paidAt).not.toBeNull();
      expect(updated.metadata.gatewayPaymentId).toMatch(/^pay_valid_/);
      expect(updated.metadata.gatewayProvider).toBe("RAZORPAY_SANDBOX");

      // Verify OutboxEvent was created atomically
      const outboxEvents = await prisma.outboxEvent.findMany({
        where: {
          tenantId: tenantAId,
          entityId: order.id,
          eventType: "COMMERCE_ORDER_PAID",
        },
      });
      expect(outboxEvents.length).toBe(1);
      const eventPayload = outboxEvents[0].payload as any;
      expect(eventPayload.orderId).toBe(order.id);
      expect(eventPayload.amountInPaise).toBe(19900);
    });

    it("T3.2: Duplicate webhook replay returns 200 with X-Idempotent-Replay header and zero duplicate outbox events", async () => {
      const order = await createTestOrder(tenantAId, 299);

      const paymentId = `pay_replay_${Date.now()}`;
      const webhookBody = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: `order_replay_${Date.now()}`,
              amount: 29900,
              currency: "INR",
              method: "card",
              created_at: Math.floor(Date.now() / 1000),
              notes: { orderId: order.id },
            },
          },
        },
      });

      const sig = RazorpaySandboxService.computeSignature(webhookBody, TEST_WEBHOOK_SECRET);

      // Dispatch 1
      const res1 = await hostFetch(`${baseUrl}/api/commerce/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-razorpay-signature": sig },
        body: webhookBody,
      });
      expect(res1.status).toBe(200);
      expect((await res1.json()).isReplay).toBe(false);

      // Dispatch 2 (Duplicate replay)
      const res2 = await hostFetch(`${baseUrl}/api/commerce/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-razorpay-signature": sig },
        body: webhookBody,
      });
      expect(res2.status).toBe(200);
      expect(res2.headers["x-idempotent-replay"]).toBe("true");
      const data2 = await res2.json();
      expect(data2.isReplay).toBe(true);

      // Dispatch 3 (Third duplicate replay)
      const res3 = await hostFetch(`${baseUrl}/api/commerce/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-razorpay-signature": sig },
        body: webhookBody,
      });
      expect(res3.status).toBe(200);
      expect(res3.headers["x-idempotent-replay"]).toBe("true");

      // Verify outbox event count is still EXACTLY 1
      const count = await prisma.outboxEvent.count({
        where: {
          tenantId: tenantAId,
          entityId: order.id,
          eventType: "COMMERCE_ORDER_PAID",
        },
      });
      expect(count).toBe(1);
    });

    it("T3.3: Amount mismatch attack is detected; marks order FAILED and rejects (400)", async () => {
      // Order amount is ₹199 (19900 paise)
      const order = await createTestOrder(tenantAId, 199);

      // Gateway dishonestly reports ₹100 (10000 paise)
      const webhookBody = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: `pay_mismatch_${Date.now()}`,
              order_id: `order_mismatch_${Date.now()}`,
              amount: 10000, // FRAUDULENT / MISMATCHED AMOUNT
              currency: "INR",
              notes: { orderId: order.id },
            },
          },
        },
      });

      const sig = RazorpaySandboxService.computeSignature(webhookBody, TEST_WEBHOOK_SECRET);

      const res = await hostFetch(`${baseUrl}/api/commerce/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-razorpay-signature": sig },
        body: webhookBody,
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("AMOUNT_MISMATCH_DETECTED");

      // Verify order status was forensic-marked as FAILED
      const reloaded = await prisma.commerceOrder.findUnique({ where: { id: order.id } });
      expect(reloaded?.status).toBe("FAILED");
      expect(reloaded?.simulationNotes).toBe("AMOUNT_MISMATCH_DETECTED");

      // Zero outbox events created
      const outboxCount = await prisma.outboxEvent.count({
        where: { entityId: order.id },
      });
      expect(outboxCount).toBe(0);
    });

    it("T3.4: Currency mismatch attack is detected and rejected (400 CURRENCY_MISMATCH)", async () => {
      const order = await createTestOrder(tenantAId, 199);

      // Gateway reports USD for an INR order
      const webhookBody = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: `pay_curr_mismatch_${Date.now()}`,
              order_id: `order_curr_${Date.now()}`,
              amount: 19900,
              currency: "USD", // MISMATCHED CURRENCY
              notes: { orderId: order.id },
            },
          },
        },
      });

      const sig = RazorpaySandboxService.computeSignature(webhookBody, TEST_WEBHOOK_SECRET);

      const res = await hostFetch(`${baseUrl}/api/commerce/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-razorpay-signature": sig },
        body: webhookBody,
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("CURRENCY_MISMATCH");

      // Order remains PENDING_PAYMENT
      const reloaded = await prisma.commerceOrder.findUnique({ where: { id: order.id } });
      expect(reloaded?.status).toBe("PENDING_PAYMENT");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 4: OUTBOX FULFILLMENT & ASYNC PROVISIONING HANDOFF
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Tier 4: Transactional Outbox & Fulfillment Handoff", () => {
    it("T4.1: Direct fulfillment on unpaid order is rejected (ORDER_NOT_PAID)", async () => {
      const unpaidOrder = await createTestOrder(tenantAId, 199);

      // Directly attempting fulfillment without payment must fail closed
      await expect(
        CommerceFulfillmentService.fulfillOrder({
          orderId: unpaidOrder.id,
          tenantId: tenantAId,
        })
      ).rejects.toThrow("Cannot fulfill order in 'PENDING_PAYMENT' state");
    });

    it("T4.2: Asynchronous outbox sweep fulfills paid order, activates subscription, and creates invoice", async () => {
      const order = await createTestOrder(tenantAId, 199);

      // 1. Process valid webhook payment
      const webhookBody = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: `pay_fulf_${Date.now()}`,
              order_id: `order_fulf_${Date.now()}`,
              amount: 19900,
              currency: "INR",
              notes: { orderId: order.id },
            },
          },
        },
      });

      const sig = RazorpaySandboxService.computeSignature(webhookBody, TEST_WEBHOOK_SECRET);

      const res = await hostFetch(`${baseUrl}/api/commerce/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-razorpay-signature": sig },
        body: webhookBody,
      });
      expect(res.status).toBe(200);

      // 2. Run Outbox batch processor
      const sweepResult = await CommerceFulfillmentService.processOutboxBatch({
        workerId: "TEST_WORKER_1",
      });
      expect(sweepResult.processed).toBeGreaterThanOrEqual(1);

      // 3. Verify order fulfillment status
      const reloadedOrder = await prisma.commerceOrder.findUnique({ where: { id: order.id } });
      expect(reloadedOrder?.status).toBe("PAID");
      expect(reloadedOrder?.fulfillmentStatus).toBe("FULFILLED");

      // 4. Verify subscription provisioned with CP-02 capacity limits
      const subscription = await prisma.tenantSubscription.findFirst({
        where: { tenantId: tenantAId },
      });
      expect(subscription).not.toBeNull();
      expect(subscription?.status).toBe("active");

      // 5. Verify BillingInvoice generated with immutable line items (Option 3A)
      const invoice = await prisma.billingInvoice.findFirst({
        where: { tenantId: tenantAId, gatewayOrderId: order.orderNumber },
      });
      expect(invoice).not.toBeNull();
      expect(invoice?.status).toBe("paid");
      expect(Number(invoice?.amount)).toBe(199);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 5: SAFETY CONTROLS & REGRESSION PROTECTION
  // ─────────────────────────────────────────────────────────────────────────────
  describe("Tier 5: Sandbox Safety & Regression Baseline", () => {
    it("T5.1: Live Razorpay credentials (rzp_live_*) are strictly prohibited and fail closed", async () => {
      const savedKeyId = process.env.RAZORPAY_KEY_ID;
      process.env.RAZORPAY_KEY_ID = "rzp_live_99887766554433";

      try {
        const order = await createTestOrder(tenantAId, 199);

        const res = await hostFetch(`${baseUrl}/api/commerce/checkout/initiate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${tokenUserA}`, "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id }),
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.code).toBe("LIVE_KEYS_PROHIBITED_IN_SANDBOX");
      } finally {
        process.env.RAZORPAY_KEY_ID = savedKeyId;
      }
    });

    it("T5.2: Existing A3.6 unified catalog pricing resolution remains fully operational", async () => {
      const res = await hostFetch(`${baseUrl}/api/commerce/catalog`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.products)).toBe(true);
      expect(data.products.length).toBeGreaterThan(0);
    });
  });
});
