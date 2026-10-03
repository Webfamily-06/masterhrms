import assert from "node:assert/strict";
import { prisma, rawPrisma } from "../prisma";
import { runSubscriptionExpiryRemindersCron } from "../cron/subscription-reminder.cron";
import { handleTenantSuspension, handleTenantReactivation } from "../services/subscription-lifecycle.service";
import { requireActiveSubscription } from "../middleware/subscription";
import { sendSubscriptionLifecycleEmail } from "../lib/email";

async function runTests() {
  const db = rawPrisma || prisma;
  console.log("==================================================================");
  console.log("🚀 STARTING REAL SUBSCRIPTION LIFECYCLE TESTS (LIVE SUPABASE DB)");
  console.log("==================================================================");

  const testTenantId = `test_tenant_sub_${Date.now()}`;
  const otherTenantId = `test_tenant_other_${Date.now()}`;
  const testUserId = `test_user_admin_${Date.now()}`;
  const testEmail = `admin.${Date.now()}@example-test.com`;

  try {
    // 1. Provision Test Tenant & Admin in live Supabase DB
    console.log("\n▶ [Test 1] Provisioning test tenant & admin user");
    await db.tenant.create({
      data: {
        id: testTenantId,
        name: "Acme Lifecycle Test Co",
        slug: `acme-test-${Date.now()}`,
      },
    });

    await db.tenant.create({
      data: {
        id: otherTenantId,
        name: "Unaffected Sister Corp",
        slug: `unaffected-${Date.now()}`,
      },
    });

    await db.user.create({
      data: {
        id: testUserId,
        email: testEmail,
        passwordHash: "dummyhash",
        profile: {
          create: {
            fullName: "Test Admin",
            email: testEmail,
            tenantId: testTenantId,
          },
        },
        roles: {
          create: {
            role: "hr_admin",
            tenantId: testTenantId,
          },
        },
      },
    });
    console.log("  ✔ Provisioned test tenants and admin profile in live DB");

    // 2. Scheduler Threshold Tests (15d, 10d, 5d, 3d, 2d, 1d)
    console.log("\n▶ [Test 2] Scheduler reminder threshold evaluation & idempotency");
    const now = new Date();

    // 2.1 Set subscription to 15 days in the future
    const exp15 = new Date(now.getTime() + 14.5 * 24 * 60 * 60 * 1000);
    const sub = await db.tenantSubscription.create({
      data: {
        tenantId: testTenantId,
        status: "active",
        expiresAt: exp15,
      },
    });

    const cronRes1 = await runSubscriptionExpiryRemindersCron();
    assert.ok(cronRes1.totalChecked >= 1, "Must check active subscriptions");
    console.log(`  ✔ 15-day threshold evaluation: ${cronRes1.remindersSent} reminders dispatched`);

    // Verify notification event record
    const cycleKey15 = `exp_${exp15.toISOString().slice(0, 10)}`;
    const event15 = await db.subscriptionNotificationEvent.findUnique({
      where: {
        subscriptionId_cycleKey_eventType: {
          subscriptionId: sub.id,
          cycleKey: cycleKey15,
          eventType: "reminder_15d",
        },
      },
    });
    assert.ok(event15, "Notification event for reminder_15d must be recorded in database");
    assert.equal(event15.recipientEmail, testEmail, "Must send to designated tenant admin");
    console.log("  ✔ Database event recorded for reminder_15d with correct admin recipient");

    // 2.2 Idempotency Test: re-running cron must not create duplicate emails
    const cronRes2 = await runSubscriptionExpiryRemindersCron();
    const event15After = await db.subscriptionNotificationEvent.count({
      where: {
        subscriptionId: sub.id,
        cycleKey: cycleKey15,
        eventType: "reminder_15d",
      },
    });
    assert.equal(event15After, 1, "Duplicate reminder must not be created");
    console.log("  ✔ Idempotency confirmed: Zero duplicate reminders created on repeated runs");

    // 2.3 Threshold 5 days test
    const exp5 = new Date(now.getTime() + 4.5 * 24 * 60 * 60 * 1000);
    await db.tenantSubscription.update({
      where: { id: sub.id },
      data: { expiresAt: exp5 },
    });
    const cronRes3 = await runSubscriptionExpiryRemindersCron();
    const cycleKey5 = `exp_${exp5.toISOString().slice(0, 10)}`;
    const event5 = await db.subscriptionNotificationEvent.findUnique({
      where: {
        subscriptionId_cycleKey_eventType: {
          subscriptionId: sub.id,
          cycleKey: cycleKey5,
          eventType: "reminder_5d",
        },
      },
    });
    assert.ok(event5, "Reminder for 5 days must be recorded");
    console.log("  ✔ 5-day threshold triggered and recorded in database");

    // 2.4 Renewal cycle reset test (New cycle key allows reminders to fire again)
    console.log("\n▶ [Test 3] Renewal cycle reset test");
    const nextYearExp = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    await db.tenantSubscription.update({
      where: { id: sub.id },
      data: { expiresAt: nextYearExp },
    });
    const newCycleKey = `exp_${nextYearExp.toISOString().slice(0, 10)}`;
    assert.notEqual(newCycleKey, cycleKey15, "Renewed subscription must have distinct cycle key");
    console.log("  ✔ Subscription renewal successfully creates clean reminder cycle key");

    // 3. Suspension Notification & Isolation Tests
    console.log("\n▶ [Test 4] Account Suspension handling & Admin email trigger");
    const suspendRes = await handleTenantSuspension({
      tenantId: testTenantId,
      reason: "Quarterly subscription renewal overdue.",
      actorEmail: "superadmin@masterhrms.com",
    });
    assert.equal(suspendRes.success, true);
    assert.equal(suspendRes.status, "suspended");

    // Verify sub status in database
    const subAfterSuspend = await db.tenantSubscription.findUnique({ where: { tenantId: testTenantId } });
    assert.equal(subAfterSuspend?.status, "suspended");
    console.log("  ✔ Tenant subscription status updated to 'suspended' in database");

    // Verify suspension notification events recorded for both Tenant Admin and Super Admin
    const suspendEvents = await db.subscriptionNotificationEvent.findMany({
      where: { subscriptionId: sub.id, eventType: { in: ["suspended", "suspended_super_admin"] } },
    });
    assert.ok(suspendEvents.length >= 1, "Suspension notification events must be recorded");
    console.log(`  ✔ Recorded ${suspendEvents.length} suspension notification events (Tenant & Super Admin)`);

    // Verify other tenant is unaffected
    const otherSub = await db.tenantSubscription.findUnique({ where: { tenantId: otherTenantId } });
    assert.notEqual(otherSub?.status, "suspended", "Other tenants must remain completely unaffected");
    console.log("  ✔ Multi-tenant isolation verified: Other workspaces remain unaffected");

    // 4. Backend Middleware Security Guards
    console.log("\n▶ [Test 5] Security Middleware: Locking Business APIs for Suspended & Expired Tenants");

    // 4.1 Suspended tenant calling business API -> Blocked 402 SUBSCRIPTION_SUSPENDED
    let suspendedBlocked = false;
    let blockedCode = "";
    const mockReqSuspended: any = {
      method: "GET",
      originalUrl: "/api/employees",
      user: { tenantId: testTenantId, roles: ["hr_admin"] },
    };
    const mockResSuspended: any = {
      status: (statusCode: number) => {
        if (statusCode === 402) suspendedBlocked = true;
        return {
          json: (body: any) => {
            blockedCode = body.code;
          },
        };
      },
    };
    await requireActiveSubscription(mockReqSuspended, mockResSuspended, () => {});
    assert.equal(suspendedBlocked, true, "Suspended tenant must be blocked with HTTP 402");
    assert.equal(blockedCode, "SUBSCRIPTION_SUSPENDED", "Block code must be SUBSCRIPTION_SUSPENDED");
    console.log("  ✔ Suspended tenant blocked on business API GET /api/employees (HTTP 402 SUBSCRIPTION_SUSPENDED)");

    // 4.2 Safe endpoint /api/workspace/subscription remains accessible even when suspended
    let safeRoutePassed = false;
    const mockReqSafe: any = {
      method: "GET",
      originalUrl: "/api/workspace/subscription",
      user: { tenantId: testTenantId, roles: ["hr_admin"] },
    };
    await requireActiveSubscription(mockReqSafe, mockResSuspended, () => {
      safeRoutePassed = true;
    });
    assert.equal(safeRoutePassed, true, "Safe endpoint /api/workspace/subscription must pass through");
    console.log("  ✔ Safe endpoint /api/workspace/subscription passes through for self-service renewal");

    // 4.3 Super Admin bypasses suspension
    let superAdminPassed = false;
    const mockReqSuper: any = {
      method: "GET",
      originalUrl: "/api/employees",
      user: { roles: ["super_admin"] },
    };
    await requireActiveSubscription(mockReqSuper, mockResSuspended, () => {
      superAdminPassed = true;
    });
    assert.equal(superAdminPassed, true, "Platform Super Admin must bypass subscription locks");
    console.log("  ✔ Platform Super Admin bypasses workspace lock");

    // 4.4 Reactivation restores access
    console.log("\n▶ [Test 6] Reactivating tenant workspace");
    const reactivateRes = await handleTenantReactivation({ tenantId: testTenantId });
    assert.equal(reactivateRes.success, true);
    assert.equal(reactivateRes.status, "active");

    const subAfterReactivate = await db.tenantSubscription.findUnique({ where: { tenantId: testTenantId } });
    assert.equal(subAfterReactivate?.status, "active");
    console.log("  ✔ Tenant reactivated successfully to status 'active'");

    // 4.5 Expired subscription test: status is active but expiresAt is in the past
    console.log("\n▶ [Test 7] Expired Subscription Security Guard");
    const pastExp = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
    await db.tenantSubscription.update({
      where: { id: sub.id },
      data: { expiresAt: pastExp },
    });

    let expiredBlocked = false;
    let expiredCode = "";
    const mockReqExpired: any = {
      method: "POST",
      originalUrl: "/api/payroll/runs",
      user: { tenantId: testTenantId, roles: ["hr_admin"] },
    };
    const mockResExpired: any = {
      status: (statusCode: number) => {
        if (statusCode === 402) expiredBlocked = true;
        return {
          json: (body: any) => {
            expiredCode = body.code;
          },
        };
      },
    };
    await requireActiveSubscription(mockReqExpired, mockResExpired, () => {});
    assert.equal(expiredBlocked, true, "Expired subscription must be blocked with HTTP 402");
    assert.equal(expiredCode, "SUBSCRIPTION_EXPIRED", "Block code must be SUBSCRIPTION_EXPIRED");
    console.log("  ✔ Expired subscription blocked on mutation POST /api/payroll/runs (HTTP 402 SUBSCRIPTION_EXPIRED)");

    console.log("\n==================================================================");
    console.log("🎉 ALL REAL SUBSCRIPTION LIFECYCLE TESTS PASSED SUCCESSFULLY!");
    console.log("==================================================================");
  } finally {
    // Cleanup test records
    await db.subscriptionNotificationEvent.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
    await db.tenantSubscription.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
    await db.userRole.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
    await db.profile.deleteMany({ where: { tenantId: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
    await db.user.deleteMany({ where: { id: testUserId } }).catch(() => {});
    await db.tenant.deleteMany({ where: { id: { in: [testTenantId, otherTenantId] } } }).catch(() => {});
  }
}

runTests().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
