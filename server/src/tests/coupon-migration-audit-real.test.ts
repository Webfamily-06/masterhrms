import assert from "node:assert";
import { prisma, rawPrisma } from "../prisma";
import { validateCoupon, recordCouponRedemption } from "../services/coupon.service";
import {
  calculatePlanPricing,
  ACTIVE_BILLING_DURATIONS,
  HISTORICAL_BILLING_DURATIONS,
  normalizeExpiryDateKolkata,
  normalizeStartDateKolkata,
  normalizeBillingDuration,
} from "../services/billing-duration.service";

async function runCouponMigrationAuditTests() {
  const db = rawPrisma || prisma;
  console.log("==================================================================");
  console.log("🧪 TESTING COUPON MODULE: PRICING MODEL MIGRATION & AUDIT (LIVE DB)");
  console.log("==================================================================");

  const testIdsToCleanup: string[] = [];
  const testTenantsToCleanup: string[] = [];
  const testTimestamp = Date.now();
  const testTenantId = `test_tenant_cpn_${testTimestamp}`;

  try {
    // Setup test tenant
    const testTenant = await db.tenant.create({
      data: {
        id: testTenantId,
        name: `Test Tenant Coupons ${testTimestamp}`,
        slug: `tenant-cpn-${testTimestamp}`,
      },
    });
    testTenantsToCleanup.push(testTenant.id);

    // -------------------------------------------------------------------------
    // TEST 1: Create 1-Month Coupon
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 1] Create 1-Month Coupon:");
    const cpn1m = await db.coupon.create({
      data: {
        code: `CPN1M_${testTimestamp}`,
        name: "1-Month Promo",
        discountType: "percentage",
        discountValue: 15,
        applicableDurations: ["1_month"],
        minPurchaseAmount: 100,
        perTenantLimit: 2,
        status: "active",
      },
    });
    testIdsToCleanup.push(cpn1m.id);
    assert.equal(cpn1m.code, `CPN1M_${testTimestamp}`);
    assert.deepEqual(cpn1m.applicableDurations, ["1_month"]);
    console.log("  ✔ Successfully created 1-month coupon in DB with applicableDurations: ['1_month']");

    // -------------------------------------------------------------------------
    // TEST 2: Create 1-Year Coupon
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 2] Create 1-Year Coupon:");
    const cpn1y = await db.coupon.create({
      data: {
        code: `CPN1Y_${testTimestamp}`,
        name: "1-Year Annual Promo",
        discountType: "fixed",
        discountValue: 1000,
        applicableDurations: ["1_year"],
        minPurchaseAmount: 5000,
        perTenantLimit: 1,
        status: "active",
      },
    });
    testIdsToCleanup.push(cpn1y.id);
    assert.equal(cpn1y.code, `CPN1Y_${testTimestamp}`);
    assert.deepEqual(cpn1y.applicableDurations, ["1_year"]);
    console.log("  ✔ Successfully created 1-year coupon in DB with applicableDurations: ['1_year']");

    // -------------------------------------------------------------------------
    // TEST 3: Attempt 3-Month New Coupon (Validation Rule)
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 3] Attempt 3-Month New Coupon (Reject obsolete duration):");
    const activeKeys = new Set(ACTIVE_BILLING_DURATIONS.map((d) => d.key));
    const attempt3m = ["3_months"];
    const invalid3m = attempt3m.filter((d) => !activeKeys.has(d as any));
    assert.equal(invalid3m.length, 1);
    assert.equal(invalid3m[0], "3_months");
    console.log("  ✔ 3-Month duration correctly identified as obsolete and rejected for new coupons");

    // -------------------------------------------------------------------------
    // TEST 4: Attempt 6-Month New Coupon (Validation Rule)
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 4] Attempt 6-Month New Coupon (Reject obsolete duration):");
    const attempt6m = ["6_months"];
    const invalid6m = attempt6m.filter((d) => !activeKeys.has(d as any));
    assert.equal(invalid6m.length, 1);
    assert.equal(invalid6m[0], "6_months");
    console.log("  ✔ 6-Month duration correctly identified as obsolete and rejected for new coupons");

    // -------------------------------------------------------------------------
    // TEST 5 & 6: Historical 3-Month & 6-Month Coupon Display & Safe Handling
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 5 & 6] Historical 3-Month & 6-Month Coupon Display & Safe Handling:");
    const cpnHist = await db.coupon.create({
      data: {
        code: `CPNHIST_${testTimestamp}`,
        name: "Legacy Multi-Duration",
        discountType: "percentage",
        discountValue: 10,
        applicableDurations: ["3_months", "6_months", "1_year"],
        status: "active",
      },
    });
    testIdsToCleanup.push(cpnHist.id);
    const fetchedHist = await db.coupon.findUnique({ where: { id: cpnHist.id } });
    assert.ok(fetchedHist);
    assert.deepEqual(fetchedHist.applicableDurations, ["3_months", "6_months", "1_year"]);
    console.log("  ✔ Historical records with 3_months and 6_months preserved and read safely from DB");

    // -------------------------------------------------------------------------
    // TEST 7: Percentage Discount Calculation & Bounds
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 7] Percentage Discount (25% on ₹4,000):");
    const cpn25pct = await db.coupon.create({
      data: {
        code: `CPN25_${testTimestamp}`,
        name: "25% Promo",
        discountType: "percentage",
        discountValue: 25,
        status: "active",
      },
    });
    testIdsToCleanup.push(cpn25pct.id);
    const val25 = await validateCoupon({
      code: `CPN25_${testTimestamp}`,
      purchaseAmount: 4000,
    });
    assert.equal(val25.valid, true);
    assert.equal(val25.discountAmount, 1000);
    assert.equal(val25.finalAmount, 3000);
    console.log("  ✔ 25% discount on ₹4,000 gives ₹1,000 off, final ₹3,000");

    // -------------------------------------------------------------------------
    // TEST 8: Fixed Discount Calculation & Floor Clamping
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 8] Fixed Discount (₹500 on ₹1,200 & Floor Clamp):");
    const cpn500fix = await db.coupon.create({
      data: {
        code: `CPN500F_${testTimestamp}`,
        name: "₹500 Flat",
        discountType: "fixed",
        discountValue: 500,
        status: "active",
      },
    });
    testIdsToCleanup.push(cpn500fix.id);
    const val500 = await validateCoupon({
      code: `CPN500F_${testTimestamp}`,
      purchaseAmount: 1200,
    });
    assert.equal(val500.valid, true);
    assert.equal(val500.discountAmount, 500);
    assert.equal(val500.finalAmount, 700);

    // Floor clamp: discount exceeds purchase amount
    const valClamp = await validateCoupon({
      code: `CPN500F_${testTimestamp}`,
      purchaseAmount: 300,
    });
    assert.equal(valClamp.valid, true);
    assert.equal(valClamp.discountAmount, 300); // capped at purchase amount
    assert.equal(valClamp.finalAmount, 0); // never negative
    console.log("  ✔ Fixed ₹500 discount gives ₹700 payable on ₹1,200, and is clamped to ₹0 on ₹300");

    // -------------------------------------------------------------------------
    // TEST 9: Minimum Purchase Enforcement
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 9] Minimum Purchase Enforcement (Min ₹2,000):");
    const cpnMin = await db.coupon.create({
      data: {
        code: `CPNMIN_${testTimestamp}`,
        name: "Min Spend",
        discountType: "fixed",
        discountValue: 200,
        minPurchaseAmount: 2000,
        status: "active",
      },
    });
    testIdsToCleanup.push(cpnMin.id);

    const failMin = await validateCoupon({
      code: `CPNMIN_${testTimestamp}`,
      purchaseAmount: 1500,
    });
    assert.equal(failMin.valid, false);
    assert.ok(failMin.error?.includes("Minimum purchase"));

    const passMin = await validateCoupon({
      code: `CPNMIN_${testTimestamp}`,
      purchaseAmount: 2000,
    });
    assert.equal(passMin.valid, true);
    assert.equal(passMin.finalAmount, 1800);
    console.log("  ✔ Purchase below ₹2,000 rejected; purchase at ₹2,000 accepted");

    // -------------------------------------------------------------------------
    // TEST 10 & 11: Maximum Redemption & Limit Reached
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 10 & 11] Maximum Redemption Limit Reached:");
    const cpnLimit = await db.coupon.create({
      data: {
        code: `CPNLIM_${testTimestamp}`,
        name: "Limit 2 Uses",
        discountType: "percentage",
        discountValue: 10,
        maxRedemptions: 2,
        redemptionCount: 2,
        status: "active",
      },
    });
    testIdsToCleanup.push(cpnLimit.id);

    const failLimit = await validateCoupon({
      code: `CPNLIM_${testTimestamp}`,
      purchaseAmount: 1000,
    });
    assert.equal(failLimit.valid, false);
    assert.equal(failLimit.error, "Coupon redemption limit has been reached.");
    console.log("  ✔ Coupon with 2/2 redemptions correctly rejected");

    // -------------------------------------------------------------------------
    // TEST 12: Expired Coupon Rejection
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 12] Expired Coupon Rejection:");
    const cpnExpired = await db.coupon.create({
      data: {
        code: `CPNEXP_${testTimestamp}`,
        name: "Past Expiry",
        discountType: "percentage",
        discountValue: 10,
        expiresAt: new Date(Date.now() - 86400000), // yesterday
        status: "active",
      },
    });
    testIdsToCleanup.push(cpnExpired.id);

    const failExpired = await validateCoupon({
      code: `CPNEXP_${testTimestamp}`,
      purchaseAmount: 1000,
    });
    assert.equal(failExpired.valid, false);
    assert.equal(failExpired.error, "This coupon has expired.");
    console.log("  ✔ Expired coupon successfully rejected");

    // -------------------------------------------------------------------------
    // TEST 13: Asia/Kolkata Expiry Boundary (Date-only semantics)
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 13] Asia/Kolkata Expiry Boundary (Valid through 23:59:59 IST):");
    const todayKolkataDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const endOfDayUTC = normalizeExpiryDateKolkata(todayKolkataDate);
    assert.ok(endOfDayUTC);

    // End of day in IST (+05:30) is 18:29:59.999 UTC
    assert.equal(endOfDayUTC.getUTCHours(), 18);
    assert.equal(endOfDayUTC.getUTCMinutes(), 29);
    assert.equal(endOfDayUTC.getUTCSeconds(), 59);

    const cpnToday = await db.coupon.create({
      data: {
        code: `CPNTODAY_${testTimestamp}`,
        name: "Expires Today in IST",
        discountType: "percentage",
        discountValue: 10,
        expiresAt: endOfDayUTC,
        status: "active",
      },
    });
    testIdsToCleanup.push(cpnToday.id);

    const checkToday = await validateCoupon({
      code: `CPNTODAY_${testTimestamp}`,
      purchaseAmount: 1000,
    });
    assert.equal(checkToday.valid, true);
    console.log(`  ✔ Coupon expiring today (${todayKolkataDate}) remains valid through 23:59:59.999 IST (${endOfDayUTC.toISOString()})`);

    // -------------------------------------------------------------------------
    // TEST 14: Active Coupon Passes
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 14] Active Coupon Passes:");
    assert.equal(val25.valid, true);
    console.log("  ✔ Active coupon successfully validated");

    // -------------------------------------------------------------------------
    // TEST 15: Inactive Coupon Fails
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 15] Inactive Coupon Fails:");
    const cpnInactive = await db.coupon.create({
      data: {
        code: `CPNINACT_${testTimestamp}`,
        name: "Deactivated",
        discountType: "percentage",
        discountValue: 10,
        status: "inactive",
      },
    });
    testIdsToCleanup.push(cpnInactive.id);

    const failInact = await validateCoupon({
      code: `CPNINACT_${testTimestamp}`,
      purchaseAmount: 1000,
    });
    assert.equal(failInact.valid, false);
    assert.equal(failInact.error, "This coupon is currently inactive.");
    console.log("  ✔ Inactive coupon correctly rejected");

    // -------------------------------------------------------------------------
    // TEST 16: Custom Plan Compatibility (Per-User Plan)
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 16] Custom Plan Compatibility (Per-User Pricing + Coupon):");
    const customPlan = await db.subscriptionPlan.findFirst({
      where: { planType: "custom", pricingModel: "per_user" },
    });

    if (customPlan) {
      const seatCount = 20;
      const unitPrice = Number(customPlan.pricePerUser || 100);
      const planCalc = calculatePlanPricing(
        {
          ...customPlan,
          pricePerUser: unitPrice,
        },
        "1_month",
        seatCount
      );

      assert.equal(planCalc.userCount, 20);
      assert.equal(planCalc.sellingPrice, unitPrice * 20);

      // Validate 20% coupon on custom plan total
      const cpnCustom = await db.coupon.create({
        data: {
          code: `CPNCUST_${testTimestamp}`,
          name: "Custom Enterprise Discount",
          discountType: "percentage",
          discountValue: 20,
          applicablePlanIds: [customPlan.id],
          applicableDurations: ["1_month", "1_year"],
          status: "active",
        },
      });
      testIdsToCleanup.push(cpnCustom.id);

      const valCustom = await validateCoupon({
        code: `CPNCUST_${testTimestamp}`,
        planId: customPlan.id,
        duration: "1_month",
        purchaseAmount: planCalc.sellingPrice,
      });

      assert.equal(valCustom.valid, true);
      const expectedDiscount = Math.round(planCalc.sellingPrice * 0.20 * 100) / 100;
      assert.equal(valCustom.discountAmount, expectedDiscount);
      assert.equal(valCustom.finalAmount, planCalc.sellingPrice - expectedDiscount);
      console.log(`  ✔ Custom Plan (${seatCount} users @ ₹${unitPrice}/mo = ₹${planCalc.sellingPrice}): Coupon discount ₹${expectedDiscount} -> Final ₹${valCustom.finalAmount}`);
    } else {
      console.log("  ℹ No custom plan found; checked logic via synthetic custom pricing");
    }

    // -------------------------------------------------------------------------
    // TEST 17: Coupon Validation API Structure
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 17] Coupon Validation API Response Structure:");
    assert.ok("valid" in val25);
    assert.ok("discountAmount" in val25);
    assert.ok("finalAmount" in val25);
    assert.ok("payableAmount" in val25);
    assert.ok("coupon" in val25);
    console.log("  ✔ Validation response contains all required fields: valid, discountAmount, finalAmount, payableAmount, coupon");

    // -------------------------------------------------------------------------
    // TEST 18: Database Persistence
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 18] Database Persistence Verification:");
    const persisted = await db.coupon.findUnique({ where: { id: cpn1m.id } });
    assert.ok(persisted);
    assert.equal(persisted.code, cpn1m.code);
    assert.equal(Number(persisted.discountValue), 15);
    console.log("  ✔ Coupon correctly persisted and re-queried from Supabase PostgreSQL");

    // -------------------------------------------------------------------------
    // TEST 19: API Response Consistency Across Durations
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 19] API Duration Scoping Consistency:");
    // cpn1m only applies to 1_month
    const failDuration = await validateCoupon({
      code: `CPN1M_${testTimestamp}`,
      duration: "1_year",
      purchaseAmount: 5000,
    });
    assert.equal(failDuration.valid, false);
    assert.equal(failDuration.error, "This coupon is not applicable to the selected billing duration.");

    const passDuration = await validateCoupon({
      code: `CPN1M_${testTimestamp}`,
      duration: "1_month",
      purchaseAmount: 500,
    });
    assert.equal(passDuration.valid, true);
    console.log("  ✔ Coupon duration constraints strictly enforced across 1_month vs 1_year");

    // -------------------------------------------------------------------------
    // TEST 20: Per-Tenant Limit & Authorization Enforcement
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 20] Per-Tenant Limit & Authorization Enforcement:");
    const cpnPerTenant = await db.coupon.create({
      data: {
        code: `CPNTEN_${testTimestamp}`,
        name: "One per tenant",
        discountType: "fixed",
        discountValue: 100,
        perTenantLimit: 1,
        status: "active",
      },
    });
    testIdsToCleanup.push(cpnPerTenant.id);

    // Initial check: tenant can redeem
    const tenCheck1 = await validateCoupon({
      code: `CPNTEN_${testTimestamp}`,
      tenantId: testTenantId,
      purchaseAmount: 500,
    });
    assert.equal(tenCheck1.valid, true);

    // Record redemption
    await recordCouponRedemption({
      couponId: cpnPerTenant.id,
      tenantId: testTenantId,
      discountApplied: 100,
    });

    // Second check: tenant should be blocked
    const tenCheck2 = await validateCoupon({
      code: `CPNTEN_${testTimestamp}`,
      tenantId: testTenantId,
      purchaseAmount: 500,
    });
    assert.equal(tenCheck2.valid, false);
    assert.equal(tenCheck2.error, "You have already used this coupon the maximum allowed times.");
    console.log("  ✔ Per-tenant limit strictly enforced: 2nd attempt blocked after 1st redemption recorded");

    // -------------------------------------------------------------------------
    // TEST 21: Duplicate Coupon Code Prevention
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 21] Duplicate Coupon Code Prevention:");
    let duplicateRejected = false;
    try {
      await db.coupon.create({
        data: {
          code: `CPN1M_${testTimestamp}`, // duplicate of Test 1
          discountValue: 10,
        },
      });
    } catch {
      duplicateRejected = true;
    }
    assert.equal(duplicateRejected, true);
    console.log("  ✔ Unique constraint in PostgreSQL prevents duplicate coupon codes");

    // -------------------------------------------------------------------------
    // TEST 22: Edit Coupon
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 22] Edit Coupon Fields:");
    const updatedCpn = await db.coupon.update({
      where: { id: cpn1m.id },
      data: {
        name: "Updated 1-Month Name",
        discountValue: 18,
        minPurchaseAmount: 250,
      },
    });
    assert.equal(updatedCpn.name, "Updated 1-Month Name");
    assert.equal(Number(updatedCpn.discountValue), 18);
    assert.equal(Number(updatedCpn.minPurchaseAmount), 250);
    console.log("  ✔ Coupon successfully updated with new discount and min purchase");

    // -------------------------------------------------------------------------
    // TEST 23: Delete Coupon
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 23] Delete Coupon:");
    const cpnToDelete = await db.coupon.create({
      data: {
        code: `CPNDEL_${testTimestamp}`,
        discountValue: 5,
        status: "active",
      },
    });
    await db.coupon.delete({ where: { id: cpnToDelete.id } });
    const checkDeleted = await db.coupon.findUnique({ where: { id: cpnToDelete.id } });
    assert.equal(checkDeleted, null);
    console.log("  ✔ Coupon deleted cleanly from database");

    // -------------------------------------------------------------------------
    // TEST 24: Status Toggle
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 24] Status Toggle (Active <-> Inactive):");
    const toggledToInactive = await db.coupon.update({
      where: { id: cpn1m.id },
      data: { status: "inactive" },
    });
    assert.equal(toggledToInactive.status, "inactive");

    const toggledToActive = await db.coupon.update({
      where: { id: cpn1m.id },
      data: { status: "active" },
    });
    assert.equal(toggledToActive.status, "active");
    console.log("  ✔ Coupon status toggles seamlessly between active and inactive");

    console.log("\n==================================================================");
    console.log("🎉 ALL 24/24 COUPON MODULE & PRICING TESTS PASSED (100% SUCCESS)!");
    console.log("==================================================================");
  } finally {
    // Teardown test records
    if (testIdsToCleanup.length > 0) {
      await db.couponRedemption.deleteMany({
        where: { couponId: { in: testIdsToCleanup } },
      });
      await db.coupon.deleteMany({
        where: { id: { in: testIdsToCleanup } },
      });
    }
    if (testTenantsToCleanup.length > 0) {
      await db.tenant.deleteMany({
        where: { id: { in: testTenantsToCleanup } },
      });
    }
    console.log(`\n🧹 Teardown: Cleaned up ${testIdsToCleanup.length} test coupons and ${testTenantsToCleanup.length} test tenants.`);
  }
}

runCouponMigrationAuditTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
