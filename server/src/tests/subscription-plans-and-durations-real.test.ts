import assert from "node:assert/strict";
import { prisma, rawPrisma } from "../prisma";
import {
  addBillingMonths,
  calculateSubscriptionPeriod,
  calculateRemainingDays,
  resolvePlanPriceForDuration,
  calculateTrialEndDate,
  toRazorpayPaise,
} from "../services/billing-duration.service";
import {
  validateCoupon,
  recordCouponRedemption,
} from "../services/coupon.service";

async function runTests() {
  const db = rawPrisma || prisma;
  console.log("==================================================================");
  console.log("🧪 TESTING BILLING DURATION ENGINE, COUPONS & LIVE PLAN APIS");
  console.log("==================================================================\n");

  const testTenantId = `test_tenant_plans_${Date.now()}`;
  const testPlanId = `test_plan_${Date.now()}`;
  const testCouponCode = `TESTDISC_${Date.now().toString().slice(-6)}`;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Authority Date Engine & Month-End Clamping
    // -------------------------------------------------------------------------
    console.log("▶ [Test 1] Billing Duration Engine Month-End Clamping:");

    // 1.1 Jan 31, 2026 + 1 month -> Feb 28, 2026 (non-leap year)
    const jan31 = new Date(Date.UTC(2026, 0, 31, 10, 0, 0));
    const febEnd = addBillingMonths(jan31, 1);
    assert.equal(febEnd.getUTCFullYear(), 2026, "Year must remain 2026");
    assert.equal(febEnd.getUTCMonth(), 1, "Month must be February (1)");
    assert.equal(febEnd.getUTCDate(), 28, "Day must clamp to last day of February (28)");
    console.log("  ✔ Jan 31 + 1 month correctly clamped to Feb 28, 2026");

    // 1.2 Jan 31, 2024 + 1 month -> Feb 29, 2024 (leap year)
    const jan31_2024 = new Date(Date.UTC(2024, 0, 31, 10, 0, 0));
    const febEnd_2024 = addBillingMonths(jan31_2024, 1);
    assert.equal(febEnd_2024.getUTCDate(), 29, "Day must clamp to 29 in leap year 2024");
    console.log("  ✔ Jan 31, 2024 + 1 month correctly clamped to Feb 29, 2024");

    // 1.3 Aug 31 + 3 months -> Nov 30 (Nov has 30 days)
    const aug31 = new Date(Date.UTC(2026, 7, 31, 12, 0, 0));
    const novEnd = addBillingMonths(aug31, 3);
    assert.equal(novEnd.getUTCMonth(), 10, "Month must be November (10)");
    assert.equal(novEnd.getUTCDate(), 30, "Day must clamp to Nov 30");
    console.log("  ✔ Aug 31 + 3 months correctly clamped to Nov 30");

    // 1.4 Oct 3, 2026 + 6 months -> April 3, 2027
    const oct3 = new Date(Date.UTC(2026, 9, 3, 0, 0, 0));
    const apr3 = addBillingMonths(oct3, 6);
    assert.equal(apr3.getUTCFullYear(), 2027, "Year must roll over to 2027");
    assert.equal(apr3.getUTCMonth(), 3, "Month must be April (3)");
    assert.equal(apr3.getUTCDate(), 3, "Day must remain 3");
    console.log("  ✔ Oct 3, 2026 + 6 months correctly yields April 3, 2027");

    // 1.5 Oct 3, 2026 + 1 year (12 months) -> Oct 3, 2027
    const oct3_1y = addBillingMonths(oct3, 12);
    assert.equal(oct3_1y.getUTCFullYear(), 2027);
    assert.equal(oct3_1y.getUTCMonth(), 9);
    assert.equal(oct3_1y.getUTCDate(), 3);
    console.log("  ✔ Oct 3, 2026 + 1 year correctly yields Oct 3, 2027");

    // -------------------------------------------------------------------------
    // TEST 2: Subscription Period Calculation & Remaining Days
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 2] Subscription Period Calculation & Renewal Policy:");

    // 2.1 Fresh subscription starting from confirmed billing date
    const startNow = new Date("2026-10-03T10:00:00.000Z");
    const period3m = calculateSubscriptionPeriod("3_months", startNow);
    assert.equal(period3m.periodStart.toISOString(), startNow.toISOString());
    assert.equal(period3m.intervalCount, 3);
    assert.equal(period3m.interval, "month");

    // 2.2 Remaining days calculation (non-calendar-boundary, Math.ceil for active day coverage)
    const futureExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 3600000); // 10 days 1 hour
    const remDays = calculateRemainingDays(futureExpiry);
    assert.equal(remDays, 11, "Must calculate remaining calendar days using Math.ceil for partial day service coverage");
    console.log(`  ✔ Remaining days calculation: ${remDays} days remaining (including active fractional day)`);

    // 2.3 Early renewal policy: Extending period from existing expiry date
    const existingEnd = new Date("2026-11-03T10:00:00.000Z");
    const renewal1y = calculateSubscriptionPeriod("1_year", startNow, existingEnd);
    assert.equal(renewal1y.periodStart.toISOString(), existingEnd.toISOString(), "Must preserve remaining paid time");
    assert.equal(renewal1y.periodEnd.getUTCFullYear(), 2027);
    assert.equal(renewal1y.periodEnd.getUTCMonth(), 10); // Nov
    assert.equal(renewal1y.periodEnd.getUTCDate(), 3);
    console.log("  ✔ Early renewal successfully preserves remaining paid time and extends from existing period end");

    // 2.4 Trial period calculation
    const trialEnd = calculateTrialEndDate(14, startNow);
    const diffDays = Math.round((trialEnd.getTime() - startNow.getTime()) / (24 * 60 * 60 * 1000));
    assert.equal(diffDays, 14, "Trial must be exactly 14 calendar days");
    console.log("  ✔ Trial end date calculation matches configured trial days");

    // -------------------------------------------------------------------------
    // TEST 3: Razorpay Currency Conversion (INR Paise)
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 3] Razorpay Currency & Smallest Unit Handling:");

    assert.equal(toRazorpayPaise(199), 19900, "₹199 must convert to 19900 paise");
    assert.equal(toRazorpayPaise(549.50), 54950, "₹549.50 must convert to 54950 paise");
    assert.equal(toRazorpayPaise(1899), 189900, "₹1899 must convert to 189900 paise");
    console.log("  ✔ Razorpay INR smallest unit (paise) conversions verified");

    // -------------------------------------------------------------------------
    // TEST 4: Price Resolution Across 4 Durations
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 4] Discrete Duration Price Resolution:");

    const samplePlan = {
      priceMonthly: 199,
      priceQuarterly: 549,
      priceSemiAnnual: 999,
      priceAnnual: 1899,
      durationPrices: {
        "1_month": 199,
        "3_months": 549,
        "6_months": 999,
        "1_year": 1899,
      },
    };

    assert.equal(resolvePlanPriceForDuration(samplePlan, "1_month").price, 199);
    assert.equal(resolvePlanPriceForDuration(samplePlan, "3_months").price, 549);
    assert.equal(resolvePlanPriceForDuration(samplePlan, "6_months").price, 999);
    assert.equal(resolvePlanPriceForDuration(samplePlan, "1_year").price, 1899);
    console.log("  ✔ All 4 billing durations resolve distinct non-multiplied configured prices");

    // -------------------------------------------------------------------------
    // TEST 5: Coupon Validation & Redemption Engine
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 5] Coupon Validation & Idempotent Redemption in DB:");

    // Provision test tenant
    await db.tenant.create({
      data: {
        id: testTenantId,
        name: "Coupon Verification Tenant",
        slug: `coupon-tenant-${Date.now()}`,
      },
    });

    // Create test coupon: 20% off, max 5 redemptions, max 1 per tenant
    const coupon = await db.coupon.create({
      data: {
        id: `cpn_${Date.now()}`,
        code: testCouponCode,
        discountType: "percentage",
        discountValue: 20,
        maxRedemptions: 5,
        perTenantLimit: 1,
        minPurchaseAmount: 500,
        status: "active",
      },
    });

    // 5.1 Validation: Subtotal below minimum
    const belowMinRes = await validateCoupon(testCouponCode, 400, testTenantId);
    assert.equal(belowMinRes.valid, false);
    assert.match(belowMinRes.reason || "", /Minimum purchase/);
    console.log("  ✔ Subtotal below minimum purchase correctly rejected");

    // 5.2 Validation: Valid subtotal ₹1000
    const validRes = await validateCoupon(testCouponCode, 1000, testTenantId);
    assert.equal(validRes.valid, true);
    assert.equal(validRes.discountAmount, 200, "20% of 1000 is 200");
    assert.equal(validRes.payableAmount, 800, "Payable amount is 800");
    console.log("  ✔ 20% discount correctly computed: ₹1000 -> ₹200 off, ₹800 payable");

    // 5.3 Record Redemption
    const invoiceId = `inv_test_${Date.now()}`;
    const redemption = await recordCouponRedemption(
      coupon.id,
      testTenantId,
      invoiceId,
      200,
      testCouponCode
    );
    assert.ok(redemption.id);
    assert.equal(Number(redemption.discountApplied), 200);

    // 5.4 Check Per-Tenant limit reached
    const secondTry = await validateCoupon(testCouponCode, 1000, testTenantId);
    assert.equal(secondTry.valid, false);
    assert.match(secondTry.reason || "", /maximum allowed times|already/i);
    console.log("  ✔ Per-tenant redemption limit strictly enforced");

    // -------------------------------------------------------------------------
    // TEST 6: Live Plan CRUD & Duration Schema in Supabase DB
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 6] Live SubscriptionPlan CRUD with 4 Durations in DB:");

    // 6.1 Create Plan with 4 duration prices & trial configuration
    const createdPlan = await db.subscriptionPlan.create({
      data: {
        id: testPlanId,
        name: "Automated Test Suite Plan",
        description: "Created to empirically verify multi-duration SaaS pricing schema.",
        priceMonthly: 299,
        priceQuarterly: 799,
        priceSemiAnnual: 1499,
        priceAnnual: 2799,
        durationPrices: {
          "1_month": 299,
          "3_months": 799,
          "6_months": 1499,
          "1_year": 2799,
        },
        isTrial: true,
        trialDays: 21,
        maxEmployees: 75,
        maxUsers: 15,
        storageLimitGb: 20,
        features: ["Automated Payroll", "Biometrics", "Audit Log"],
        sortOrder: 99,
        isPublic: true,
      },
    });

    assert.equal(createdPlan.id, testPlanId);
    assert.equal(Number(createdPlan.priceQuarterly), 799);
    assert.equal(Number(createdPlan.priceSemiAnnual), 1499);
    assert.equal(createdPlan.isTrial, true);
    assert.equal(createdPlan.trialDays, 21);
    console.log("  ✔ SubscriptionPlan created with all 4 durations and trial configuration");

    // 6.2 Update Plan prices
    const updatedPlan = await db.subscriptionPlan.update({
      where: { id: testPlanId },
      data: {
        priceQuarterly: 749,
        trialDays: 30,
      },
    });
    assert.equal(Number(updatedPlan.priceQuarterly), 749);
    assert.equal(updatedPlan.trialDays, 30);
    console.log("  ✔ SubscriptionPlan successfully updated in database");

    // 6.3 Cleanup test plan & coupon
    await db.couponRedemption.deleteMany({ where: { couponId: coupon.id } });
    await db.coupon.delete({ where: { id: coupon.id } });
    await db.subscriptionPlan.delete({ where: { id: testPlanId } });
    await db.tenant.delete({ where: { id: testTenantId } });
    console.log("  ✔ Teardown cleaned up test records");

    console.log("\n==================================================================");
    console.log("🎉 ALL BILLING DURATION, COUPON & PLAN TESTS PASSED WITH 100% SUCCESS!");
    console.log("==================================================================\n");
  } catch (err) {
    console.error("❌ TEST FAILED:", err);
    throw err;
  }
}

runTests().catch(() => process.exit(1));
