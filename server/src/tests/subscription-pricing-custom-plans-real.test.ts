import { rawPrisma as prisma } from "../prisma";
import {
  calculateTrialEndDate,
  validateBillableUserCount,
  calculatePlanPricing,
  addBillingMonths,
  calculateSubscriptionPeriod,
  toRazorpayPaise,
} from "../services/billing-duration.service";

async function runSubscriptionPricingTests() {
  console.log("\n==================================================================");
  console.log("🧪 TESTING SUBSCRIPTION PRICING, CUSTOM PLANS & 3-DAY TRIALS (LIVE DB)");
  console.log("==================================================================\n");

  const timestamp = Date.now();
  const createdPlanIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // Test 1: Exact 3-Day Trial Expiry Calculation
    // -------------------------------------------------------------------------
    console.log("▶ [Test 1] 3-Day Free Trial Duration & Expiry Calculation:");
    const trialStart = new Date("2026-10-03T10:00:00.000Z");
    const trialEnd = calculateTrialEndDate(trialStart, 3);
    const diffMs = trialEnd.getTime() - trialStart.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays !== 3) {
      throw new Error(`Trial duration mismatch: expected exactly 3 days, got ${diffDays}`);
    }
    console.log("  ✔ Trial expiry is calculated as exactly 3 days from trial start date");
    console.log(`    Start: ${trialStart.toISOString()} -> End: ${trialEnd.toISOString()} (${diffDays} days)`);

    // -------------------------------------------------------------------------
    // Test 2: Standard Plan with Original Price vs Selling Price
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 2] Standard Plan Original & Selling Price Calculations:");
    const testStandardPlan = {
      planType: "standard",
      pricingModel: "fixed",
      priceMonthly: 799,
      priceMonthlyOriginal: 999,
      priceAnnual: 7499,
      priceAnnualOriginal: 9999,
    };

    const monthlyCalc = calculatePlanPricing(testStandardPlan, "1_month");
    if (monthlyCalc.sellingPrice !== 799) throw new Error(`Expected monthly selling price 799, got ${monthlyCalc.sellingPrice}`);
    if (monthlyCalc.originalPrice !== 999) throw new Error(`Expected monthly original price 999, got ${monthlyCalc.originalPrice}`);
    if (monthlyCalc.discountAmount !== 200) throw new Error(`Expected discount 200, got ${monthlyCalc.discountAmount}`);
    if (monthlyCalc.discountPercentage !== 20) throw new Error(`Expected 20% discount, got ${monthlyCalc.discountPercentage}%`);
    if (!monthlyCalc.hasDiscount) throw new Error("Expected hasDiscount to be true");

    console.log("  ✔ Monthly pricing correctly resolves: Original ₹999 -> Selling ₹799 (Save ₹200 / 20% off)");

    const annualCalc = calculatePlanPricing(testStandardPlan, "1_year");
    if (annualCalc.sellingPrice !== 7499) throw new Error(`Expected annual selling price 7499, got ${annualCalc.sellingPrice}`);
    if (annualCalc.originalPrice !== 9999) throw new Error(`Expected annual original price 9999, got ${annualCalc.originalPrice}`);
    if (annualCalc.discountAmount !== 2500) throw new Error(`Expected discount 2500, got ${annualCalc.discountAmount}`);
    if (annualCalc.discountPercentage !== 25) throw new Error(`Expected 25% discount, got ${annualCalc.discountPercentage}%`);

    console.log("  ✔ Annual pricing correctly resolves: Original ₹9999 -> Selling ₹7499 (Save ₹2500 / 25% off)");

    // -------------------------------------------------------------------------
    // Test 3: Custom Per-User Plan Calculations for 1, 25, and 99,999 Users
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 3] Custom Per-User Plan Calculations:");
    const testPerUserPlan = {
      planType: "custom",
      pricingModel: "per_user",
      pricePerUser: 100,
      pricePerUserOriginal: 125,
      billableUsers: 25,
    };

    // Case 3a: 1 user
    const calc1User = calculatePlanPricing(testPerUserPlan, "1_month", 1);
    if (calc1User.sellingPrice !== 100) throw new Error(`Expected ₹100 for 1 user, got ${calc1User.sellingPrice}`);
    if (calc1User.originalPrice !== 125) throw new Error(`Expected ₹125 original for 1 user, got ${calc1User.originalPrice}`);
    if (calc1User.discountPercentage !== 20) throw new Error(`Expected 20% off, got ${calc1User.discountPercentage}%`);
    console.log("  ✔ 1 User: ₹100/mo (Original: ₹125/mo, Save 20%)");

    // Case 3b: 25 users
    const calc25Users = calculatePlanPricing(testPerUserPlan, "1_month", 25);
    if (calc25Users.sellingPrice !== 2500) throw new Error(`Expected ₹2500 for 25 users, got ${calc25Users.sellingPrice}`);
    if (calc25Users.originalPrice !== 3125) throw new Error(`Expected ₹3125 original for 25 users, got ${calc25Users.originalPrice}`);
    console.log("  ✔ 25 Users: ₹2,500/mo (Original: ₹3,125/mo, Save ₹625 / 20% off)");

    // Case 3c: 99,999 users (Maximum bound)
    const calc99999Users = calculatePlanPricing(testPerUserPlan, "1_month", 99999);
    const expectedSellingMax = 100 * 99999;
    if (calc99999Users.sellingPrice !== expectedSellingMax) {
      throw new Error(`Expected ₹${expectedSellingMax} for 99,999 users, got ${calc99999Users.sellingPrice}`);
    }
    console.log(`  ✔ 99,999 Users (Max limit): ₹${expectedSellingMax.toLocaleString("en-IN")}/mo correctly calculated`);

    // -------------------------------------------------------------------------
    // Test 4: Strict User Count Validation (Min 1, Max 99,999, Integer only)
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 4] Validation of User Count Constraints:");
    const testZero = validateBillableUserCount(0);
    if (testZero.valid) throw new Error("0 users should be rejected");
    console.log("  ✔ Rejected 0 users:", testZero.error);

    const testNegative = validateBillableUserCount(-5);
    if (testNegative.valid) throw new Error("Negative users should be rejected");
    console.log("  ✔ Rejected negative user count:", testNegative.error);

    const testFraction = validateBillableUserCount(2.5);
    if (testFraction.valid) throw new Error("Fractional user count 2.5 should be rejected");
    console.log("  ✔ Rejected fractional user count:", testFraction.error);

    const testAboveMax = validateBillableUserCount(100000);
    if (testAboveMax.valid) throw new Error("User count 100,000 should be rejected");
    console.log("  ✔ Rejected above-99,999 count (100,000):", testAboveMax.error);

    const testValid = validateBillableUserCount(50);
    if (!testValid.valid || testValid.userCount !== 50) throw new Error("Valid count 50 was rejected");
    console.log("  ✔ Valid user count (50) correctly accepted");

    // -------------------------------------------------------------------------
    // Test 5: Razorpay INR Paise Precision
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 5] Razorpay INR Paise Conversion:");
    const paise1 = toRazorpayPaise(799);
    if (paise1 !== 79900) throw new Error(`Expected 79900 paise, got ${paise1}`);

    const paise2 = toRazorpayPaise(2500.50);
    if (paise2 !== 250050) throw new Error(`Expected 250050 paise, got ${paise2}`);
    console.log("  ✔ INR ₹799 -> 79,900 paise & ₹2,500.50 -> 250,050 paise conversion verified");

    // -------------------------------------------------------------------------
    // Test 6: Live Supabase DB Persistence for Standard & Custom Plans
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 6] Live Supabase PostgreSQL CRUD for Custom & Standard Plans:");

    // Create Custom Per-User Plan in Live DB
    const dbPerUserPlan = await prisma.subscriptionPlan.create({
      data: {
        name: `Custom Test Plan ${timestamp}`,
        description: "Automated test plan with per-user dynamic pricing",
        planType: "custom",
        pricingModel: "per_user",
        currency: "INR",
        pricePerUser: 120,
        pricePerUserOriginal: 150,
        billableUsers: 15,
        priceMonthly: 0,
        priceAnnual: 0,
        isTrial: true,
        trialDays: 3, // Exactly 3-day trial
        isPublic: true,
        features: ["Unlimited Modules", "Dedicated Account Executive", "Biometric Sync"],
      },
    });
    createdPlanIds.push(dbPerUserPlan.id);

    console.log(`  ✔ Created custom per-user plan in database (ID: ${dbPerUserPlan.id})`);
    if (dbPerUserPlan.planType !== "custom") throw new Error("planType was not saved as custom");
    if (dbPerUserPlan.pricingModel !== "per_user") throw new Error("pricingModel was not saved as per_user");
    if (dbPerUserPlan.trialDays !== 3) throw new Error(`Expected trialDays = 3, got ${dbPerUserPlan.trialDays}`);

    // Update plan in DB
    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id: dbPerUserPlan.id },
      data: {
        pricePerUser: 110,
        billableUsers: 30,
      },
    });
    if (Number(updatedPlan.pricePerUser) !== 110) throw new Error("Price per user update failed");
    if (updatedPlan.billableUsers !== 30) throw new Error("Billable users update failed");
    console.log("  ✔ Successfully updated custom plan in database (Price/user: ₹110, Users: 30)");

    // -------------------------------------------------------------------------
    // Test 7: Month-End Clamping Verification
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 7] Date Clamping Engine Verification:");
    const jan31 = new Date("2026-01-31T00:00:00.000Z");
    const febEnd = addBillingMonths(jan31, 1);
    if (febEnd.getUTCMonth() !== 1 || febEnd.getUTCDate() !== 28) {
      throw new Error(`Expected Feb 28, 2026, got ${febEnd.toISOString()}`);
    }
    console.log(`  ✔ Jan 31 + 1 month correctly clamped to Feb 28 (${febEnd.toISOString()})`);

    console.log("\n==================================================================");
    console.log("🎉 ALL SUBSCRIPTION PRICING & CUSTOM PLAN TESTS PASSED (100%)!");
    console.log("==================================================================\n");
  } finally {
    // Teardown created records
    if (createdPlanIds.length > 0) {
      await prisma.subscriptionPlan.deleteMany({
        where: { id: { in: createdPlanIds } },
      });
      console.log(`🧹 Teardown: Cleaned up ${createdPlanIds.length} test plan records.`);
    }
  }
}

runSubscriptionPricingTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
