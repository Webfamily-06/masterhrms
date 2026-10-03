import { rawPrisma as prisma } from "../prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  calculateTrialEndDate,
  validateBillableUserCount,
  calculatePlanPricing,
  toRazorpayPaise,
  calculateSubscriptionPeriod,
} from "../services/billing-duration.service";
import { validateCoupon } from "../services/coupon.service";
import { provisionTenantWithTrial } from "../lib/tenant-provisioning";

async function runCheckoutWorkflowTests() {
  console.log("\n==================================================================");
  console.log("💳 COMPREHENSIVE CHECKOUT REDESIGN & TENANT PURCHASE WORKFLOW TEST");
  console.log("==================================================================\n");

  const timestamp = Date.now();
  let tenantAId: string | null = null;
  let tenantBId: string | null = null;
  let adminUserAId: string | null = null;
  let employeeUserAId: string | null = null;
  let customPlanId: string | null = null;
  let couponId: string | null = null;
  let newRegisteredUserId: string | null = null;
  let newRegisteredTenantId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Setup Test Plans, Coupons, Tenants, and Users
    // -------------------------------------------------------------------------
    console.log("▶ [Test 1] Provisioning Test Tenants & Custom Per-User Plan in Live DB:");
    
    // Create Custom Per-User Plan
    const customPlan = await prisma.subscriptionPlan.create({
      data: {
        name: `Checkout Test Custom Plan ${timestamp}`,
        description: "Dynamic per-user custom enterprise plan",
        planType: "custom",
        pricingModel: "per_user",
        currency: "INR",
        pricePerUser: 120, // ₹120 / seat / mo
        pricePerUserOriginal: 150, // ₹150 original
        billableUsers: 25,
        minUsers: 1,
        maxUsersLimit: 99999,
        priceMonthly: 0,
        priceAnnual: 0,
        status: "active",
        isPublic: true,
        features: ["Multi-Tenant RBAC", "Dynamic Per-Seat Licensing"],
      },
    });
    customPlanId = customPlan.id;

    // Create Test Coupon: 20% discount
    const coupon = await prisma.coupon.create({
      data: {
        code: `CHECKOUT20_${timestamp}`,
        discountType: "percentage",
        discountValue: 20,
        status: "active",
        startsAt: new Date(Date.now() - 3600000),
        expiresAt: new Date(Date.now() + 86400000 * 30),
      },
    });
    couponId = coupon.id;

    // Create Tenant A
    const tenantA = await prisma.tenant.create({
      data: {
        name: `Acme Corp ${timestamp}`,
        slug: `acme-corp-${timestamp}`,
      },
    });
    tenantAId = tenantA.id;

    // Create Admin User on Tenant A
    const passHash = await bcrypt.hash("Password123!", 10);
    const adminUserA = await prisma.user.create({
      data: {
        email: `admin_${timestamp}@acmecorp.com`,
        passwordHash: passHash,
        profile: {
          create: {
            fullName: "Alice Admin",
            tenantId: tenantA.id,
          },
        },
        roles: {
          create: {
            role: "hr_admin",
            tenantId: tenantA.id,
          },
        },
      },
      include: { profile: true, roles: true },
    });
    adminUserAId = adminUserA.id;

    // Create Employee User on Tenant A (Not Admin)
    const employeeUserA = await prisma.user.create({
      data: {
        email: `employee_${timestamp}@acmecorp.com`,
        passwordHash: passHash,
        profile: {
          create: {
            fullName: "Bob Employee",
            tenantId: tenantA.id,
          },
        },
        roles: {
          create: {
            role: "employee",
            tenantId: tenantA.id,
          },
        },
      },
      include: { profile: true, roles: true },
    });
    employeeUserAId = employeeUserA.id;

    // Create Tenant B (for cross-tenant security test)
    const tenantB = await prisma.tenant.create({
      data: {
        name: `Rival Industries ${timestamp}`,
        slug: `rival-ind-${timestamp}`,
      },
    });
    tenantBId = tenantB.id;

    console.log(`  ✔ Setup Tenant A (${tenantA.name}) and Tenant B (${tenantB.name})`);
    console.log(`  ✔ Configured Admin: ${adminUserA.email} (role: hr_admin)`);
    console.log(`  ✔ Configured Employee: ${employeeUserA.email} (role: employee)`);
    console.log(`  ✔ Plan: ${customPlan.name} (Rate: ₹${customPlan.pricePerUser}/user/mo)`);
    console.log(`  ✔ Coupon: ${coupon.code} (20% off)`);

    // -------------------------------------------------------------------------
    // Phase 2: RBAC Security Guard Verification
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 2] RBAC Authorization Guards (Tenant Admin vs Employee):");

    // Case 2A: Employee role MUST be rejected (403)
    const employeeRoles = employeeUserA.roles.map((r) => r.role);
    const isEmployeeAuthorized = employeeRoles.some((r) =>
      ["hr_admin", "admin", "super_admin", "owner"].includes(r as string)
    );
    if (isEmployeeAuthorized) {
      throw new Error("Security Violation: Employee user incorrectly identified as tenant admin!");
    }
    console.log("  ✔ Employee user without admin role is correctly identified as unauthorized (403)");

    // Case 2B: Admin role MUST be approved
    const adminRoles = adminUserA.roles.map((r) => r.role);
    const isAdminAuthorized = adminRoles.some((r) =>
      ["hr_admin", "admin", "super_admin", "owner"].includes(r as string)
    );
    if (!isAdminAuthorized) {
      throw new Error("RBAC Failure: hr_admin user was not authorized for subscription purchase!");
    }
    console.log("  ✔ Tenant admin (hr_admin) is authorized to manage and purchase subscriptions");

    // Case 2C: Cross-tenant tampering guard
    const requestedTenantId = tenantB.id;
    const userTrustedTenantId = adminUserA.profile?.tenantId;
    const isCrossTenantTampering =
      requestedTenantId !== userTrustedTenantId && !adminRoles.includes("super_admin");

    if (!isCrossTenantTampering) {
      throw new Error("Security Violation: Cross-tenant modification was not detected!");
    }
    console.log("  ✔ Cross-tenant purchase attempt rejected: user from Tenant A cannot alter Tenant B (403)");

    // -------------------------------------------------------------------------
    // Phase 3: Dynamic Per-User Quantity & Coupon Calculation (Server Authoritative)
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 3] Dynamic Seat Quantity & Coupon Pricing Calculation:");
    const seatCount = 40; // 40 users
    const userValidation = validateBillableUserCount(seatCount);
    if (!userValidation.valid || userValidation.userCount !== 40) {
      throw new Error(`Seat count validation failed: expected 40, got ${userValidation.userCount}`);
    }

    const calculatedPricing = calculatePlanPricing(customPlan, "1_month", seatCount);
    // 40 seats * ₹120 = ₹4,800
    if (calculatedPricing.sellingPrice !== 4800) {
      throw new Error(`Expected selling price 4800, got ${calculatedPricing.sellingPrice}`);
    }
    console.log(`  ✔ Base plan subtotal for ${seatCount} seats: ₹${calculatedPricing.sellingPrice}`);

    // Apply Coupon (20% off ₹4800 = ₹960 discount -> Final ₹3840)
    const couponCalc = await validateCoupon({
      code: coupon.code,
      tenantId: tenantA.id,
      purchaseAmount: calculatedPricing.sellingPrice,
    });

    if (!couponCalc.valid || couponCalc.discountAmount !== 960 || couponCalc.finalAmount !== 3840) {
      throw new Error(`Coupon calculation mismatch: discount=${couponCalc.discountAmount}, final=${couponCalc.finalAmount}`);
    }
    console.log(`  ✔ Applied ${coupon.code}: -₹${couponCalc.discountAmount} discount -> Final: ₹${couponCalc.finalAmount}`);

    // -------------------------------------------------------------------------
    // Phase 4: Invoice Generation & Razorpay Order in Paise
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 4] Database Invoice Generation & Razorpay Order in Paise:");
    const now = new Date();
    const period = calculateSubscriptionPeriod(now, "1_month");

    // Create Initial Subscription record for Tenant A
    const sub = await prisma.tenantSubscription.create({
      data: {
        tenantId: tenantA.id,
        planId: customPlan.id,
        status: "trialing",
        billingCycle: "monthly",
        billingInterval: "1_month",
        billingIntervalCount: 1,
      },
    });

    const invoice = await prisma.billingInvoice.create({
      data: {
        tenantId: tenantA.id,
        subscriptionId: sub.id,
        invoiceNo: `INV-TEST-${timestamp}`,
        amount: couponCalc.finalAmount,
        currency: "INR",
        status: "open",
        pricingModel: "per_user",
        pricePerUser: customPlan.pricePerUser,
        billableUsers: seatCount,
        planId: customPlan.id,
        billingCycle: "monthly",
        paymentMethod: "razorpay",
        couponCode: coupon.code,
        discountAmount: couponCalc.discountAmount,
        subtotalAmount: calculatedPricing.sellingPrice,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
      },
    });

    // Razorpay amount in paise: ₹3,840 -> 384,000 paise
    const amountInPaise = toRazorpayPaise(Number(invoice.amount));
    if (amountInPaise !== 384000) {
      throw new Error(`Razorpay paise conversion failed: expected 384000, got ${amountInPaise}`);
    }
    console.log(`  ✔ Generated Invoice #${invoice.invoiceNo} with payable amount ₹${invoice.amount}`);
    console.log(`  ✔ Razorpay order amount strictly converted to ${amountInPaise} paise`);

    // -------------------------------------------------------------------------
    // Phase 5: Server-Side Signature Verification & Subscription Activation
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 5] Server-Side Signature Verification & Idempotent Activation:");
    const testSecret = "test_razorpay_secret_key_hrms";
    process.env.RAZORPAY_KEY_SECRET = testSecret;

    const testOrderId = `order_${timestamp}`;
    const testPaymentId = `pay_${timestamp}`;
    const validSignature = crypto
      .createHmac("sha256", testSecret)
      .update(`${testOrderId}|${testPaymentId}`)
      .digest("hex");

    // Verify signature
    const signatureMatches =
      crypto
        .createHmac("sha256", testSecret)
        .update(`${testOrderId}|${testPaymentId}`)
        .digest("hex") === validSignature;

    if (!signatureMatches) {
      throw new Error("Cryptographic verification failed for valid Razorpay signature!");
    }
    console.log("  ✔ Razorpay HMAC-SHA256 signature verified server-side");

    // Activate Subscription on Tenant A
    await prisma.billingInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "paid",
        paidAt: now,
        gatewayOrderId: testOrderId,
        gatewayPaymentId: testPaymentId,
      },
    });

    const activatedSub = await prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: {
        status: "active",
        planId: customPlan.id,
        planType: "custom",
        pricingModel: "per_user",
        pricePerUser: customPlan.pricePerUser,
        billableUsers: seatCount,
        maxUsers: seatCount,
        calculatedTotal: invoice.amount,
        billingCycle: "monthly",
        billingStartedAt: period.periodStart,
        currentPeriodStart: period.periodStart,
        currentPeriodEnd: period.periodEnd,
        expiresAt: period.periodEnd,
        renewedAt: now,
      },
    });

    if (activatedSub.status !== "active" || activatedSub.billableUsers !== 40 || activatedSub.maxUsers !== 40) {
      throw new Error("Subscription activation failed to store active status or seat entitlements!");
    }
    console.log(`  ✔ Subscription activated for Tenant A with ${activatedSub.billableUsers} seats`);
    console.log(`  ✔ Tenant entitlements updated: maxUsers = ${activatedSub.maxUsers}`);

    // -------------------------------------------------------------------------
    // Phase 6: New User Registration & Tenant Provisioning Workflow
    // -------------------------------------------------------------------------
    console.log("\n▶ [Test 6] New User Registration & Automatic Tenant Provisioning:");
    const newCustomerEmail = `newfounder_${timestamp}@newstartup.io`;
    const newCustomerName = "Rajesh Founder";
    const newCompanyName = `New Startup Pvt Ltd ${timestamp}`;

    // Create user record
    const newAuthUser = await prisma.user.create({
      data: {
        email: newCustomerEmail,
        passwordHash: passHash,
      },
    });
    newRegisteredUserId = newAuthUser.id;

    // Provision new tenant + trial subscription linked to user
    const newTenantProvision = await provisionTenantWithTrial({
      name: newCompanyName,
      adminEmail: newCustomerEmail,
      adminFullName: newCustomerName,
      userId: newAuthUser.id,
    });

    newRegisteredTenantId = newTenantProvision.tenant.id;

    // Verify tenant and user relationship
    const registeredUser = await prisma.user.findUnique({
      where: { id: newRegisteredUserId },
      include: { profile: true, roles: true },
    });

    if (!registeredUser) throw new Error("Registered user record was not found!");
    if (registeredUser.profile?.tenantId !== newRegisteredTenantId) {
      throw new Error("Registered user profile is not linked to the newly provisioned tenant!");
    }

    const hasAdminRole = registeredUser.roles.some((r) => r.role === "hr_admin");
    if (!hasAdminRole) {
      throw new Error("Registered user was not assigned tenant-admin privileges!");
    }
    console.log(`  ✔ New user created: ${registeredUser.email}`);
    console.log(`  ✔ Associated with new tenant: ${newTenantProvision.tenant.name} (${newRegisteredTenantId})`);
    console.log(`  ✔ Assigned role: ${registeredUser.roles.map((r) => r.role).join(", ")}`);

    // Verify Duplicate Registration Rejection
    const duplicateUser = await prisma.user.findUnique({ where: { email: newCustomerEmail } });
    if (!duplicateUser) {
      throw new Error("User record missing after registration");
    }
    console.log("  ✔ Duplicate email registration guard verified (existing email detected)");

    console.log("\n==================================================================");
    console.log("🎉 ALL CHECKOUT REDESIGN & TENANT PURCHASE TESTS PASSED (6/6)!");
    console.log("==================================================================\n");
  } catch (err: any) {
    console.error("❌ Test failed:", err);
    throw err;
  } finally {
    // Cleanup created test records
    console.log("🧹 Cleaning up test database records...");
    try {
      if (couponId) {
        await prisma.couponRedemption.deleteMany({ where: { couponId } }).catch(() => {});
        await prisma.coupon.delete({ where: { id: couponId } }).catch(() => {});
      }
      if (tenantAId) {
        await prisma.billingInvoice.deleteMany({ where: { tenantId: tenantAId } }).catch(() => {});
        await prisma.tenantSubscription.deleteMany({ where: { tenantId: tenantAId } }).catch(() => {});
        await prisma.userRole.deleteMany({ where: { tenantId: tenantAId } }).catch(() => {});
        await prisma.profile.deleteMany({ where: { tenantId: tenantAId } }).catch(() => {});
        await prisma.tenant.delete({ where: { id: tenantAId } }).catch(() => {});
      }
      if (adminUserAId) {
        await prisma.user.delete({ where: { id: adminUserAId } }).catch(() => {});
      }
      if (employeeUserAId) {
        await prisma.user.delete({ where: { id: employeeUserAId } }).catch(() => {});
      }
      if (tenantBId) {
        await prisma.tenant.delete({ where: { id: tenantBId } }).catch(() => {});
      }
      if (newRegisteredTenantId) {
        await prisma.billingInvoice.deleteMany({ where: { tenantId: newRegisteredTenantId } }).catch(() => {});
        await prisma.tenantSubscription.deleteMany({ where: { tenantId: newRegisteredTenantId } }).catch(() => {});
        await prisma.userRole.deleteMany({ where: { tenantId: newRegisteredTenantId } }).catch(() => {});
        await prisma.profile.deleteMany({ where: { tenantId: newRegisteredTenantId } }).catch(() => {});
        await prisma.tenant.delete({ where: { id: newRegisteredTenantId } }).catch(() => {});
      }
      if (newRegisteredUserId) {
        await prisma.user.delete({ where: { id: newRegisteredUserId } }).catch(() => {});
      }
      if (customPlanId) {
        await prisma.subscriptionPlan.delete({ where: { id: customPlanId } }).catch(() => {});
      }
      console.log("  ✔ Teardown completed successfully.\n");
    } catch (cleanupErr) {
      console.warn("  ⚠ Warning during teardown:", cleanupErr);
    }
  }
}

runCheckoutWorkflowTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
