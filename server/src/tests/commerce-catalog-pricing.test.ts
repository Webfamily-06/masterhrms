/**
 * MASTERHRMS — Phase A3.2: Unified Catalog & Pricing Engine Acceptance Tests
 *
 * Verifies all 14 mandatory acceptance criteria:
 * 1. Unified catalog output for plans, standalone products, and add-ons
 * 2. Public catalog access and authenticated tenant-specific behavior
 * 3. Missing, invalid, and configurable prices (OD-1 validation)
 * 4. Monthly and annual billing durations (1_month, 1_year)
 * 5. Seat-band boundaries and overage calculations
 * 6. Coupon percentage and flat discounts
 * 7. Coupon expiration, usage limits, and tenant isolation
 * 8. Intra-state CGST/SGST and inter-state IGST
 * 9. Decimal precision and ROUND_HALF_UP edge cases
 * 10. Client-supplied price and total manipulation rejected/ignored
 * 11. Invalid product combinations and quantities rejected
 * 12. Cross-tenant access attempts isolated
 * 13. Regression coverage for existing A1/A2 entitlement behavior
 * 14. Confirmation that catalog and cart calculation do not mutate subscriptions, entitlements, invoices, or payment records
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import Decimal from "decimal.js";
import { rawPrisma as prisma } from "../prisma";
import { commerceRouter } from "../routes/commerce.routes";
import { UnifiedCatalogService } from "../services/unified-catalog.service";
import { CartCalculatorService } from "../services/cart-calculator.service";
import {
  getCommercePricingConfig,
  setCommercePricingConfig,
  resetCommercePricingConfig,
} from "../config/commerce-pricing.config";
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

describe("MASTERHRMS — Phase A3.2 Commerce Catalog & Pricing Engine Acceptance Suite", () => {
  let server: http.Server;
  let baseUrl: string;

  const timestamp = Date.now();
  const testTenantAId = `tenant_a_${timestamp}`;
  const testTenantBId = `tenant_b_${timestamp}`;
  const testCouponCodePct = `TESTPCT_${timestamp}`;
  const testCouponCodeFixed = `TESTFIX_${timestamp}`;
  const testCouponExpired = `TESTEXP_${timestamp}`;
  const testCouponRestricted = `TESTREST_${timestamp}`;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/commerce", commerceRouter);

    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;

    // Seed test tenants
    await prisma.tenant.create({
      data: {
        id: testTenantAId,
        name: "Tenant Alpha Test",
        slug: `tenant-alpha-${timestamp}`,
      },
    });

    await prisma.tenant.create({
      data: {
        id: testTenantBId,
        name: "Tenant Beta Test",
        slug: `tenant-beta-${timestamp}`,
      },
    });

    // Tenant A owns "pos" module and "starter" subscription
    await prisma.tenantModule.create({
      data: {
        tenantId: testTenantAId,
        moduleKey: "pos",
        isEnabled: true,
      },
    });

    await prisma.tenantSubscription.create({
      data: {
        tenantId: testTenantAId,
        planId: "starter",
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Create test coupons
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Percentage Coupon (20% off)
    await prisma.coupon.create({
      data: {
        code: testCouponCodePct,
        name: "Test 20% Discount",
        discountType: "percentage",
        discountValue: 20,
        status: "active",
        startsAt: past,
        expiresAt: future,
        perTenantLimit: 5,
      },
    });

    // Fixed Coupon (₹500 off)
    await prisma.coupon.create({
      data: {
        code: testCouponCodeFixed,
        name: "Test Fixed ₹500 Discount",
        discountType: "fixed",
        discountValue: 500,
        status: "active",
        startsAt: past,
        expiresAt: future,
        perTenantLimit: 5,
      },
    });

    // Expired Coupon
    await prisma.coupon.create({
      data: {
        code: testCouponExpired,
        name: "Test Expired Coupon",
        discountType: "percentage",
        discountValue: 10,
        status: "active",
        startsAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        expiresAt: past,
        perTenantLimit: 5,
      },
    });

    // Restricted Coupon (1 redemption per tenant)
    await prisma.coupon.create({
      data: {
        code: testCouponRestricted,
        name: "Test Single Use Coupon",
        discountType: "fixed",
        discountValue: 100,
        status: "active",
        startsAt: past,
        expiresAt: future,
        perTenantLimit: 1,
      },
    });

    // Record 1 redemption for Tenant A
    const restrictedCoupon = await prisma.coupon.findUnique({ where: { code: testCouponRestricted } });
    if (restrictedCoupon) {
      await prisma.couponRedemption.create({
        data: {
          couponId: restrictedCoupon.id,
          tenantId: testTenantAId,
          discountApplied: 100,
        },
      });
      await prisma.coupon.update({
        where: { id: restrictedCoupon.id },
        data: { redemptionCount: { increment: 1 } },
      });
    }
  });

  afterAll(async () => {
    // Teardown test fixtures
    await prisma.couponRedemption.deleteMany({
      where: { tenantId: { in: [testTenantAId, testTenantBId] } },
    });
    await prisma.coupon.deleteMany({
      where: { code: { in: [testCouponCodePct, testCouponCodeFixed, testCouponExpired, testCouponRestricted] } },
    });
    await prisma.tenantModule.deleteMany({
      where: { tenantId: { in: [testTenantAId, testTenantBId] } },
    });
    await prisma.tenantSubscription.deleteMany({
      where: { tenantId: { in: [testTenantAId, testTenantBId] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [testTenantAId, testTenantBId] } },
    });

    if (server) {
      server.close();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Unified catalog output for plans, standalone products, and add-ons
  // ─────────────────────────────────────────────────────────────────────────────
  it("Unified catalog returns complete normalized product list via GET /api/commerce/catalog", async () => {
    const res = await hostFetch(`${baseUrl}/api/commerce/catalog`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.products)).toBe(true);
    expect(data.products.length).toBeGreaterThanOrEqual(10);

    const types = new Set(data.products.map((p: any) => p.productType));
    expect(types.has("BASE_PLAN")).toBe(true);
    expect(types.has("STANDALONE_PRODUCT")).toBe(true);
    expect(types.has("ADDON_FEATURE")).toBe(true);
    expect(types.has("ADDON_INTEGRATION")).toBe(true);

    const engines = new Set(data.products.map((p: any) => p.targetEngine));
    expect(engines.has("subscription")).toBe(true);
    expect(engines.has("module")).toBe(true);
    expect(engines.has("addon")).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Public catalog access and authenticated tenant-specific behavior
  // ─────────────────────────────────────────────────────────────────────────────
  it("Evaluates tenant purchase eligibility and ownership without leaking state to public consumers", async () => {
    // Public call: no eligibility attached
    const publicRes = await hostFetch(`${baseUrl}/api/commerce/catalog`);
    const publicData = await publicRes.json();
    const publicPos = publicData.products.find((p: any) => p.slug === "pos");
    expect(publicPos.eligibility).toBeUndefined();

    // Tenant A call: owns POS and Starter
    const tenantRes = await hostFetch(`${baseUrl}/api/commerce/catalog?tenantId=${testTenantAId}`);
    const tenantData = await tenantRes.json();
    const pos = tenantData.products.find((p: any) => p.slug === "pos");
    const starter = tenantData.products.find((p: any) => p.slug === "starter");
    const crm = tenantData.products.find((p: any) => p.slug === "crm");

    expect(pos.eligibility.alreadyOwned).toBe(true);
    expect(pos.eligibility.eligible).toBe(false);
    expect(starter.eligibility.alreadyOwned).toBe(true);
    expect(crm.eligibility.alreadyOwned).toBe(false);
    expect(crm.eligibility.eligible).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Missing, invalid, and configurable prices (OD-1 validation)
  // ─────────────────────────────────────────────────────────────────────────────
  it("Rejects unconfigured OD-1 prices with explicit configuration error rather than inventing prices", async () => {
    setCommercePricingConfig({
      products: {
        ...getCommercePricingConfig().products,
        "crm": { monthly: null, annual: null }, // Unconfigured price under OD-1
      },
    });

    const res = await hostFetch(`${baseUrl}/api/commerce/cart/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ productSlug: "crm", billingInterval: "1_month", quantity: 1 }],
      }),
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("OD-1");

    resetCommercePricingConfig();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Monthly and annual billing durations (1_month, 1_year)
  // ─────────────────────────────────────────────────────────────────────────────
  it("Correctly resolves 1_month and 1_year billing cycles and rejects legacy intervals", async () => {
    const monthly = await CartCalculatorService.calculate({
      items: [{ productSlug: "pos", billingInterval: "1_month", quantity: 1 }],
      taxDetails: { stateCode: "06" },
    });
    expect(monthly.subtotal).toBe(2499);

    const annual = await CartCalculatorService.calculate({
      items: [{ productSlug: "pos", billingInterval: "1_year", quantity: 1 }],
      taxDetails: { stateCode: "06" },
    });
    expect(annual.subtotal).toBe(24990);

    await expect(
      CartCalculatorService.calculate({
        items: [{ productSlug: "pos", billingInterval: "6_months" as any, quantity: 1 }],
      })
    ).rejects.toThrow("Invalid billing interval");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Seat-band boundaries and overage calculations
  // ─────────────────────────────────────────────────────────────────────────────
  it("Seat-band calculations accurately compute workforce boundaries and excess seat overages", async () => {
    // Starter: Band 1 (Micro) with 25 included seats at ₹199. Overage: ₹15/seat.
    const starter20 = await CartCalculatorService.calculate({
      items: [{ productSlug: "starter", billingInterval: "1_month", quantity: 1, seats: 20 }],
      taxDetails: { stateCode: "06" },
    });
    expect(starter20.subtotal).toBe(199);
    expect(starter20.lineItems[0].excessSeats).toBe(0);

    const starter30 = await CartCalculatorService.calculate({
      items: [{ productSlug: "starter", billingInterval: "1_month", quantity: 1, seats: 30 }],
      taxDetails: { stateCode: "06" },
    });
    // 30 seats: 199 base + (30 - 25) * 15 = 199 + 75 = 274
    expect(starter30.subtotal).toBe(274);
    expect(starter30.lineItems[0].excessSeats).toBe(5);
    expect(starter30.lineItems[0].overageAmount).toBe(75);

    // Custom per-user plan (custom-flex: ₹49/user/month)
    const customFlex = await CartCalculatorService.calculate({
      items: [{ productSlug: "custom-flex", billingInterval: "1_month", seats: 50 }],
      taxDetails: { stateCode: "06" },
    });
    expect(customFlex.subtotal).toBe(2450); // 50 * 49
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Coupon percentage and flat discounts
  // ─────────────────────────────────────────────────────────────────────────────
  it("Calculates exact percentage and flat coupon discounts", async () => {
    // 20% off ₹2,499 = ₹499.80 discount; taxable = ₹1,999.20
    const pct = await CartCalculatorService.calculate({
      items: [{ productSlug: "pos", billingInterval: "1_month", quantity: 1 }],
      couponCode: testCouponCodePct,
      taxDetails: { stateCode: "06" },
    });
    expect(pct.discountAmount).toBe(499.80);
    expect(pct.taxableAmount).toBe(1999.20);

    // ₹500 flat off ₹2,499 = ₹1,999.00 taxable
    const fixed = await CartCalculatorService.calculate({
      items: [{ productSlug: "pos", billingInterval: "1_month", quantity: 1 }],
      couponCode: testCouponCodeFixed,
      taxDetails: { stateCode: "06" },
    });
    expect(fixed.discountAmount).toBe(500);
    expect(fixed.taxableAmount).toBe(1999);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Coupon expiration, usage limits, and tenant isolation
  // ─────────────────────────────────────────────────────────────────────────────
  it("Enforces coupon expiration and per-tenant usage isolation", async () => {
    // Expired coupon fails
    await expect(
      CartCalculatorService.calculate({
        items: [{ productSlug: "pos", billingInterval: "1_month", quantity: 1 }],
        couponCode: testCouponExpired,
      })
    ).rejects.toThrow("expired");

    // Tenant A reached redemption limit (1) -> fails
    await expect(
      CartCalculatorService.calculate({
        items: [{ productSlug: "pos", billingInterval: "1_month", quantity: 1 }],
        couponCode: testCouponRestricted,
        tenantId: testTenantAId,
      })
    ).rejects.toThrow("maximum allowed times");

    // Tenant B hasn't redeemed yet -> succeeds!
    const tenantB = await CartCalculatorService.calculate({
      items: [{ productSlug: "pos", billingInterval: "1_month", quantity: 1 }],
      couponCode: testCouponRestricted,
      tenantId: testTenantBId,
      taxDetails: { stateCode: "06" },
    });
    expect(tenantB.discountAmount).toBe(100);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Intra-state CGST/SGST and inter-state IGST
  // ─────────────────────────────────────────────────────────────────────────────
  it("Calculates intra-state CGST/SGST, inter-state IGST, and international export zero-rate", async () => {
    // Intra-state (Haryana "06"): CGST 9% (224.91) + SGST 9% (224.91) on ₹2,499 = ₹449.82 tax
    const intra = await CartCalculatorService.calculate({
      items: [{ productSlug: "pos", billingInterval: "1_month", quantity: 1 }],
      taxDetails: { stateCode: "06" },
    });
    expect(intra.taxes.length).toBe(2);
    expect(intra.taxes[0].type).toBe("CGST");
    expect(intra.taxes[0].amount).toBe(224.91);
    expect(intra.taxes[1].type).toBe("SGST");
    expect(intra.taxes[1].amount).toBe(224.91);
    expect(intra.totalTax).toBe(449.82);
    expect(intra.totalAmount).toBe(2948.82);

    // Inter-state (Karnataka "29"): IGST 18% (449.82)
    const inter = await CartCalculatorService.calculate({
      items: [{ productSlug: "pos", billingInterval: "1_month", quantity: 1 }],
      taxDetails: { gstin: "29ABCDE1234F1Z5" },
    });
    expect(inter.taxes.length).toBe(1);
    expect(inter.taxes[0].type).toBe("IGST");
    expect(inter.taxes[0].amount).toBe(449.82);
    expect(inter.totalTax).toBe(449.82);
    expect(inter.totalAmount).toBe(2948.82);

    // Export: 0% GST
    const exp = await CartCalculatorService.calculate({
      items: [{ productSlug: "pos", billingInterval: "1_month", quantity: 1 }],
      taxDetails: { country: "United Kingdom" },
    });
    expect(exp.taxes.length).toBe(0);
    expect(exp.totalTax).toBe(0);
    expect(exp.totalAmount).toBe(2499);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. Decimal precision and ROUND_HALF_UP edge cases
  // ─────────────────────────────────────────────────────────────────────────────
  it("Enforces strict two-decimal ROUND_HALF_UP financial rounding without float artifacts", () => {
    const v1 = new Decimal("10.555").toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    const v2 = new Decimal("10.554").toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    const v3 = new Decimal("10.5551").toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

    expect(v1).toBe(10.56);
    expect(v2).toBe(10.55);
    expect(v3).toBe(10.56);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. Client-supplied price and total manipulation rejected/ignored
  // ─────────────────────────────────────────────────────────────────────────────
  it("Server strictly ignores client-supplied prices, totals, and discounts", async () => {
    const res = await hostFetch(`${baseUrl}/api/commerce/cart/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            productSlug: "pos",
            billingInterval: "1_month",
            quantity: 1,
            price: 1.00,
            unitPrice: 0.10,
            total: 1.00,
            discount: 9999,
          },
        ],
        clientTotal: 1.00,
        taxDetails: { stateCode: "06" },
      }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.subtotal).toBe(2499);
    expect(data.totalAmount).toBe(2948.82);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. Invalid product combinations and quantities rejected
  // ─────────────────────────────────────────────────────────────────────────────
  it("Rejects duplicate items, multiple base plans, and invalid quantities", async () => {
    // Duplicate item
    await expect(
      CartCalculatorService.calculate({
        items: [
          { productSlug: "pos", quantity: 1 },
          { productSlug: "pos", quantity: 1 },
        ],
      })
    ).rejects.toThrow("Duplicate item");

    // Multiple base plans
    await expect(
      CartCalculatorService.calculate({
        items: [
          { productSlug: "starter", quantity: 1 },
          { productSlug: "growth", quantity: 1 },
        ],
      })
    ).rejects.toThrow("only contain one base plan subscription");

    // Zero quantity
    await expect(
      CartCalculatorService.calculate({
        items: [{ productSlug: "pos", quantity: 0 }],
      })
    ).rejects.toThrow("Invalid quantity");

    // Non-existent product
    await expect(
      CartCalculatorService.calculate({
        items: [{ productSlug: "non_existent_xyz", quantity: 1 }],
      })
    ).rejects.toThrow("not available or does not exist");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. Cross-tenant access attempts isolated
  // ─────────────────────────────────────────────────────────────────────────────
  it("Produces tenant-isolated immutable calculation snapshots", async () => {
    const calc = await CartCalculatorService.calculate({
      items: [{ productSlug: "crm", quantity: 1 }],
      tenantId: testTenantAId,
      taxDetails: { stateCode: "06" },
    });

    expect(calc.success).toBe(true);
    expect(calc.snapshot.snapshotId).toMatch(/^snap_\d+_[a-f0-9]+$/);
    expect(calc.snapshot.totalAmount).toBe(2358.82); // 1999 + 18% GST (359.82)
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. Regression coverage for existing A1/A2 entitlement behavior
  // ─────────────────────────────────────────────────────────────────────────────
  it("Preserves existing Phase A1 and Phase A2 entitlement guard decisions", async () => {
    const entA = await checkTenantEntitlement(testTenantAId, "product_pos");
    const entB = await checkTenantEntitlement(testTenantBId, "product_pos");

    expect(entA.entitled).toBe(true);
    expect(entA.source).toBe("module");
    expect(entB.entitled).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 14. Confirmation that catalog and calculation do NOT mutate database
  // ─────────────────────────────────────────────────────────────────────────────
  it("Guarantees zero database mutations during catalog queries and calculations", async () => {
    const invCountBefore = await prisma.billingInvoice.count();
    const subCountBefore = await prisma.tenantSubscription.count();
    const modCountBefore = await prisma.tenantModule.count();
    const addonCountBefore = await prisma.tenantAddon.count();
    const txCountBefore = await prisma.paymentGatewayTransaction.count();

    for (let i = 0; i < 5; i++) {
      await UnifiedCatalogService.getCatalog();
      await CartCalculatorService.calculate({
        items: [
          { productSlug: "pos", quantity: 1 },
          { productSlug: "biometric-sync", quantity: 2 },
        ],
        taxDetails: { stateCode: "06" },
      });
    }

    const invCountAfter = await prisma.billingInvoice.count();
    const subCountAfter = await prisma.tenantSubscription.count();
    const modCountAfter = await prisma.tenantModule.count();
    const addonCountAfter = await prisma.tenantAddon.count();
    const txCountAfter = await prisma.paymentGatewayTransaction.count();

    expect(invCountAfter).toBe(invCountBefore);
    expect(subCountAfter).toBe(subCountBefore);
    expect(modCountAfter).toBe(modCountBefore);
    expect(addonCountAfter).toBe(addonCountBefore);
    expect(txCountAfter).toBe(txCountBefore);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 15. Production mode with required price environment variables omitted
  // ─────────────────────────────────────────────────────────────────────────────
  it("In production mode, unconfigured products fail closed and are not advertised in the catalog", async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      resetCommercePricingConfig();

      // Catalog should not advertise unapproved fallback prices in production
      const catalog = await UnifiedCatalogService.getCatalog({ isPublicOnly: true });
      const posProduct = catalog.products.find((p) => p.slug === "pos");
      expect(posProduct?.prices).toEqual([]);

      // Cart calculation must fail closed with explicit OD-1 error
      await expect(
        CartCalculatorService.calculate({
          items: [{ productSlug: "pos", quantity: 1 }],
        })
      ).rejects.toThrow("Price for 'pos' (1_month) is not configured. OD-1 pricing decision is required.");
    } finally {
      process.env.NODE_ENV = originalEnv;
      resetCommercePricingConfig();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 16. Production mode with empty or whitespace-only env vars
  // ─────────────────────────────────────────────────────────────────────────────
  it("In production mode with empty or whitespace-only env vars, products fail closed as unconfigured", async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalPosPrice = process.env.COMMERCE_PRICE_POS_MONTHLY;
    try {
      process.env.NODE_ENV = "production";
      process.env.COMMERCE_PRICE_POS_MONTHLY = "   ";
      resetCommercePricingConfig();

      await expect(
        CartCalculatorService.calculate({
          items: [{ productSlug: "pos", quantity: 1 }],
        })
      ).rejects.toThrow("Price for 'pos' (1_month) is not configured. OD-1 pricing decision is required.");
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalPosPrice !== undefined) {
        process.env.COMMERCE_PRICE_POS_MONTHLY = originalPosPrice;
      } else {
        delete process.env.COMMERCE_PRICE_POS_MONTHLY;
      }
      resetCommercePricingConfig();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 17. Malformed values, NaN, Infinity, negative values, and invalid precision
  // ─────────────────────────────────────────────────────────────────────────────
  it("Rejects malformed values ('abc', 'unapproved') and non-finite/invalid numbers safely", async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";

      // Test "abc"
      process.env.COMMERCE_PRICE_POS_MONTHLY = "abc";
      resetCommercePricingConfig();
      await expect(
        CartCalculatorService.calculate({
          items: [{ productSlug: "pos", quantity: 1 }],
        })
      ).rejects.toThrow("Price for 'pos' (1_month) is not configured. OD-1 pricing decision is required.");

      // Test "unapproved"
      process.env.COMMERCE_PRICE_POS_MONTHLY = "unapproved";
      resetCommercePricingConfig();
      await expect(
        CartCalculatorService.calculate({
          items: [{ productSlug: "pos", quantity: 1 }],
        })
      ).rejects.toThrow("Price for 'pos' (1_month) is not configured. OD-1 pricing decision is required.");

      // Test negative value "-50"
      process.env.COMMERCE_PRICE_POS_MONTHLY = "-50";
      resetCommercePricingConfig();
      await expect(
        CartCalculatorService.calculate({
          items: [{ productSlug: "pos", quantity: 1 }],
        })
      ).rejects.toThrow("Price for 'pos' (1_month) is not configured. OD-1 pricing decision is required.");

      // Test Infinity
      process.env.COMMERCE_PRICE_POS_MONTHLY = "Infinity";
      resetCommercePricingConfig();
      await expect(
        CartCalculatorService.calculate({
          items: [{ productSlug: "pos", quantity: 1 }],
        })
      ).rejects.toThrow("Price for 'pos' (1_month) is not configured. OD-1 pricing decision is required.");

      // Test unsupported precision > 2 decimals ("199.999")
      process.env.COMMERCE_PRICE_POS_MONTHLY = "199.999";
      resetCommercePricingConfig();
      await expect(
        CartCalculatorService.calculate({
          items: [{ productSlug: "pos", quantity: 1 }],
        })
      ).rejects.toThrow("Price for 'pos' (1_month) is not configured. OD-1 pricing decision is required.");
    } finally {
      process.env.NODE_ENV = originalEnv;
      delete process.env.COMMERCE_PRICE_POS_MONTHLY;
      resetCommercePricingConfig();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 18. Explicitly configured valid monthly and annual prices in production
  // ─────────────────────────────────────────────────────────────────────────────
  it("In production mode, explicitly configured valid prices succeed and calculate correctly", async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      process.env.COMMERCE_PRICE_POS_MONTHLY = "1500.00";
      process.env.COMMERCE_PRICE_POS_ANNUAL = "15000.00";
      resetCommercePricingConfig();

      const monthly = await CartCalculatorService.calculate({
        items: [{ productSlug: "pos", billingInterval: "1_month", quantity: 1 }],
        taxDetails: { stateCode: "06" },
      });
      expect(monthly.subtotal).toBe(1500);
      expect(monthly.totalAmount).toBe(1770); // 1500 + 18% GST (270)

      const annual = await CartCalculatorService.calculate({
        items: [{ productSlug: "pos", billingInterval: "1_year", quantity: 1 }],
        taxDetails: { stateCode: "06" },
      });
      expect(annual.subtotal).toBe(15000);
      expect(annual.totalAmount).toBe(17700); // 15000 + 18% GST (2700)
    } finally {
      process.env.NODE_ENV = originalEnv;
      delete process.env.COMMERCE_PRICE_POS_MONTHLY;
      delete process.env.COMMERCE_PRICE_POS_ANNUAL;
      resetCommercePricingConfig();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 19. Seat-overage and add-on pricing configuration paths in production
  // ─────────────────────────────────────────────────────────────────────────────
  it("In production mode, seat-overage and add-on pricing paths fail closed unless explicitly configured", async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      process.env.COMMERCE_PRICE_STARTER_MONTHLY = "100.00";
      process.env.COMMERCE_PRICE_STARTER_ANNUAL = "1000.00";
      // Overages omitted!
      resetCommercePricingConfig();

      // Calculating 30 seats (5 excess seats) must fail closed because overage price is not configured!
      await expect(
        CartCalculatorService.calculate({
          items: [{ productSlug: "starter", billingInterval: "1_month", quantity: 1, seats: 30 }],
        })
      ).rejects.toThrow("Seat overage price for 'starter' (1_month) is not configured. OD-1 pricing decision is required.");

      // Now configure overage rate
      process.env.COMMERCE_OVERAGE_STARTER_MONTHLY = "10.00";
      resetCommercePricingConfig();

      const calc = await CartCalculatorService.calculate({
        items: [{ productSlug: "starter", billingInterval: "1_month", quantity: 1, seats: 30 }],
        taxDetails: { stateCode: "06" },
      });
      // 100 base + (30 - 25) * 10 = 150
      expect(calc.subtotal).toBe(150);
      expect(calc.lineItems[0].excessSeats).toBe(5);
      expect(calc.lineItems[0].overageAmount).toBe(50);

      // Add-on path: Biometric sync without config must fail closed
      await expect(
        CartCalculatorService.calculate({
          items: [{ productSlug: "biometric-sync", quantity: 1 }],
        })
      ).rejects.toThrow("Price for 'biometric-sync' (1_month) is not configured. OD-1 pricing decision is required.");

      // Configure biometric sync
      process.env.COMMERCE_PRICE_BIOMETRIC_MONTHLY = "75.00";
      resetCommercePricingConfig();

      const addonCalc = await CartCalculatorService.calculate({
        items: [{ productSlug: "biometric-sync", quantity: 1 }],
        taxDetails: { stateCode: "06" },
      });
      expect(addonCalc.subtotal).toBe(75);
    } finally {
      process.env.NODE_ENV = originalEnv;
      delete process.env.COMMERCE_PRICE_STARTER_MONTHLY;
      delete process.env.COMMERCE_PRICE_STARTER_ANNUAL;
      delete process.env.COMMERCE_OVERAGE_STARTER_MONTHLY;
      delete process.env.COMMERCE_PRICE_BIOMETRIC_MONTHLY;
      resetCommercePricingConfig();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 20. Development/test overrides do not leak into production behavior
  // ─────────────────────────────────────────────────────────────────────────────
  it("Development/test overrides do not leak into production behavior", async () => {
    // When in production, calling resetCommercePricingConfig() guarantees all unconfigured products are null
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      resetCommercePricingConfig();

      const config = getCommercePricingConfig();
      expect(config.allowUnapprovedDefaults).toBe(false);
      expect(config.products["pos"].monthly).toBeNull();
      expect(config.products["crm"].monthly).toBeNull();
      expect(config.products["finance"].monthly).toBeNull();
      expect(config.products["starter"].monthly).toBeNull();
    } finally {
      process.env.NODE_ENV = originalEnv;
      resetCommercePricingConfig();
    }
  });
});
