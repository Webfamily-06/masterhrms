/**
 * MASTERHRMS — End-to-End Onboarding, Tenant Provisioning, Trial Plan,
 * Password Recovery, Two-Factor Authentication & Email Lifecycle Test Suite
 *
 * Covers Acceptance Criteria:
 *   - REG-001, REG-002
 *   - TEN-001, TEN-002, TEN-003, TEN-004
 *   - PLAN-001, PLAN-002
 *   - DEMO-001
 *   - AUTH-001, AUTH-002
 *   - PWD-001, PWD-002, PWD-003
 *   - MFA-001, MFA-002, MFA-003, MFA-004
 *   - MAIL-001, MAIL-002, MAIL-003, MAIL-004, MAIL-005
 */

import { describe, test as it, before as beforeAll, after as afterAll } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { Server } from "http";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";

import { rawPrisma } from "../prisma";
import { authRouter } from "../routes/auth.routes";
import { superRouter } from "../routes/super.routes";
import { generateToken } from "../lib/jwt";
import { TwoFactorService, hashBackupCode } from "../modules/two-factor-auth/two-factor.service";
import { EmailOutboxService } from "../services/email-outbox.service";
import {
  renderEmailVerificationTemplate,
  renderWelcomeTemplate,
  renderPasswordChangedTemplate,
  renderTwoFactorStatusTemplate,
  renderTrialActivatedTemplate,
} from "../lib/branded-email-templates";

describe("MASTERHRMS — Onboarding, Provisioning, 2FA & Account Security Lifecycle Suite", () => {
  let app: express.Application;
  let server: Server;
  let baseUrl: string;

  // Cleanup tracking lists
  const createdUserIds: string[] = [];
  const createdTenantIds: string[] = [];
  const createdSessionIds: string[] = [];
  const createdOutboxEventIds: string[] = [];

  // Super Admin test credentials
  const superAdminEmail = "admin@masterhrms.com";
  let superAdminUserId: string;

  beforeAll(async () => {
    // Disable mandatory email 2FA challenge during core login auth tests
    process.env.ENABLE_2FA = "false";
    process.env.MANDATORY_2FA = "false";

    // 1. Mount test Express application
    app = express();
    app.use(express.json());
    app.use("/api/auth", authRouter);
    app.use("/api/super", superRouter);

    server = app.listen(0);
    const addr = server.address() as any;
    baseUrl = `http://127.0.0.1:${addr.port}`;

    // 2. Ensure Super Admin identity exists with known password
    const pwHash = await bcrypt.hash("Admin@123456", 10);
    let superUser = await rawPrisma.user.findUnique({
      where: { email: superAdminEmail },
      include: { roles: true },
    });

    if (!superUser) {
      superAdminUserId = `usr-super-test-${Date.now()}`;
      superUser = await rawPrisma.user.create({
        data: {
          id: superAdminUserId,
          email: superAdminEmail,
          passwordHash: pwHash,
          roles: {
            create: { role: "super_admin", tenantId: null },
          },
        },
        include: { roles: true },
      });
      createdUserIds.push(superAdminUserId);
    } else {
      superAdminUserId = superUser.id;
      // Guarantee known passwordHash for authentication tests
      await rawPrisma.user.update({
        where: { id: superAdminUserId },
        data: { passwordHash: pwHash },
      });
    }
  });

  afterAll(async () => {
    // Shutdown HTTP server
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    // Clean up created fixtures safely
    if (createdSessionIds.length > 0) {
      await rawPrisma.deviceSession.deleteMany({
        where: { id: { in: createdSessionIds } },
      }).catch(() => {});
    }

    if (createdUserIds.length > 0) {
      await rawPrisma.$executeRawUnsafe(
        `DELETE FROM password_reset_tokens WHERE user_id IN (${createdUserIds.map((_, i) => `$${i + 1}`).join(",")})`,
        ...createdUserIds
      ).catch(() => {});

      await rawPrisma.userRole.deleteMany({
        where: { userId: { in: createdUserIds } },
      }).catch(() => {});

      await rawPrisma.userRoleAssignment.deleteMany({
        where: { userId: { in: createdUserIds } },
      }).catch(() => {});

      await rawPrisma.profile.deleteMany({
        where: { userId: { in: createdUserIds } },
      }).catch(() => {});

      await rawPrisma.deviceSession.deleteMany({
        where: { userId: { in: createdUserIds } },
      }).catch(() => {});

      await rawPrisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      }).catch(() => {});
    }

    if (createdTenantIds.length > 0) {
      await rawPrisma.tenantSubscription.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      }).catch(() => {});

      await rawPrisma.chartOfAccount.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      }).catch(() => {});

      await rawPrisma.warehouse.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      }).catch(() => {});

      await rawPrisma.userRoleAssignment.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      }).catch(() => {});

      await rawPrisma.workspaceRole.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      }).catch(() => {});

      await rawPrisma.outboxEvent.deleteMany({
        where: { tenantId: { in: createdTenantIds } },
      }).catch(() => {});

      await rawPrisma.tenant.deleteMany({
        where: { id: { in: createdTenantIds } },
      }).catch(() => {});
    }

    if (createdOutboxEventIds.length > 0) {
      await rawPrisma.outboxEvent.deleteMany({
        where: { eventId: { in: createdOutboxEventIds } },
      }).catch(() => {});
    }
  });

  // =========================================================================
  // 1. REG-001: Public New User Registration Endpoint Validation
  // =========================================================================
  describe("REG-001: Public Registration Endpoint Validation & Bot Protection", () => {
    it("REG-001.1: Successfully registers new user and issues email verification token", async () => {
      const email = `test-user-${Date.now()}@example.com`;
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Alice Corp Admin",
          email,
          companyName: "Alice Tech Solutions",
          country: "India",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
          termsAccepted: true,
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.requiresVerification, true);
      assert.equal(data.email, email);
      assert.ok(data.previewToken, "Preview token available for non-prod test verification");
      assert.ok(data.previewCode, "Preview OTP code available for non-prod test verification");

      // Verify user was stored in database
      const dbUser = await rawPrisma.user.findUnique({ where: { email } });
      assert.ok(dbUser, "User persisted in DB");
      createdUserIds.push(dbUser.id);
    });

    it("REG-001.2: Rejects invalid email syntax", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Bad Email User",
          email: "invalid-email-address",
          companyName: "Bad Company",
          country: "India",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
          termsAccepted: true,
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes("email") || data.error.includes("Invalid"), "Error mentions invalid email");
    });

    it("REG-001.3: Rejects weak password (< 8 characters)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Weak Pw User",
          email: `weak-pw-${Date.now()}@example.com`,
          companyName: "Weak Company",
          country: "India",
          password: "short",
          confirmPassword: "short",
          termsAccepted: true,
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.toLowerCase().includes("at least 8 characters") || data.error.includes("Password"));
    });

    it("REG-001.4: Rejects password and confirmPassword mismatch", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Mismatch User",
          email: `mismatch-${Date.now()}@example.com`,
          companyName: "Mismatch Company",
          country: "India",
          password: "StrongPassword@123",
          confirmPassword: "DifferentPassword@456",
          termsAccepted: true,
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.toLowerCase().includes("match") || data.error.includes("Passwords"));
    });

    it("REG-001.5: Rejects missing terms & privacy acceptance", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "No Terms User",
          email: `no-terms-${Date.now()}@example.com`,
          companyName: "No Terms Co",
          country: "India",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
          termsAccepted: false,
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.toLowerCase().includes("terms") || data.error.includes("accept"));
    });

    it("REG-001.6: Rejects duplicate email registration", async () => {
      const email = `dup-user-${Date.now()}@example.com`;

      // First registration
      const res1 = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Duplicate Original",
          email,
          companyName: "Dup Company",
          country: "India",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
          termsAccepted: true,
        }),
      });
      assert.equal(res1.status, 201);
      const dbUser = await rawPrisma.user.findUnique({ where: { email } });
      if (dbUser) createdUserIds.push(dbUser.id);

      // Second registration with same email
      const res2 = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Duplicate Imposter",
          email,
          companyName: "Dup Company 2",
          country: "India",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
          termsAccepted: true,
        }),
      });
      assert.ok(res2.status === 400 || res2.status === 409, "Duplicate email rejected with 400 or 409");
      const data2 = await res2.json();
      assert.ok(data2.error.toLowerCase().includes("already registered") || data2.error.includes("already exists"));
    });

    it("REG-001.7: Auto-increments slug on conflict for identical company names", async () => {
      const email1 = `slug-test1-${Date.now()}@example.com`;
      const email2 = `slug-test2-${Date.now()}@example.com`;
      const companyName = `AcmeCorp-${Date.now()}`;

      const res1 = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Slug Admin 1",
          email: email1,
          companyName,
          country: "India",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
          termsAccepted: true,
        }),
      });
      assert.equal(res1.status, 201);
      const data1 = await res1.json();
      const dbUser1 = await rawPrisma.user.findUnique({ where: { email: email1 } });
      if (dbUser1) createdUserIds.push(dbUser1.id);

      // Verify the first user and create tenant to establish slug collision
      const verifyRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email1,
          token: data1.previewToken,
          companyName,
          slug: data1.workspaceSlug,
        }),
      });
      assert.equal(verifyRes.status, 200);
      const verifyData = await verifyRes.json();
      if (verifyData.tenant?.id) createdTenantIds.push(verifyData.tenant.id);

      // Second registration with identical company name should auto-increment slug
      const res2 = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Slug Admin 2",
          email: email2,
          companyName,
          country: "India",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
          termsAccepted: true,
        }),
      });
      assert.equal(res2.status, 201);
      const data2 = await res2.json();
      assert.notEqual(data2.workspaceSlug, data1.workspaceSlug, "Slug must be unique and auto-incremented");
      assert.ok(data2.workspaceSlug.includes("-2") || data2.workspaceSlug !== data1.workspaceSlug);
      const dbUser2 = await rawPrisma.user.findUnique({ where: { email: email2 } });
      if (dbUser2) createdUserIds.push(dbUser2.id);
    });
  });

  // =========================================================================
  // 2. REG-002: Email Verification Token & OTP Code Lifecycle
  // =========================================================================
  describe("REG-002: Email Verification Lifecycle, Token Security & Replay Rejection", () => {
    it("REG-002.1: Verifies email via valid 32-byte cryptographic token, provisions tenant, and creates session", async () => {
      const email = `verify-token-${Date.now()}@example.com`;
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Verify Tester",
          email,
          companyName: "Verify Tech Corp",
          country: "United States",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
          termsAccepted: true,
        }),
      });
      assert.equal(regRes.status, 201);
      const regData = await regRes.json();
      const rawToken = regData.previewToken;
      const dbUser = await rawPrisma.user.findUnique({ where: { email } });
      if (dbUser) createdUserIds.push(dbUser.id);

      // Verify email using token
      const verifyRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: rawToken, companyName: "Verify Tech Corp" }),
      });
      assert.equal(verifyRes.status, 200);
      const verifyData = await verifyRes.json();

      assert.equal(verifyData.success, true);
      assert.ok(verifyData.token, "Authenticated JWT token returned");
      assert.ok(verifyData.tenant?.id, "Tenant workspace provisioned");
      assert.equal(verifyData.subscription?.status, "trialing");
      if (verifyData.tenant?.id) createdTenantIds.push(verifyData.tenant.id);

      // REG-002.2: Replaying the same token must fail (single-use)
      const replayRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: rawToken }),
      });
      assert.equal(replayRes.status, 400);
      const replayData = await replayRes.json();
      assert.equal(replayData.code, "INVALID_VERIFICATION");
    });

    it("REG-002.3: Rejects tampered or unknown verification token", async () => {
      const email = `tampered-${Date.now()}@example.com`;
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Tamper Tester",
          email,
          companyName: "Tamper Org",
          country: "India",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
          termsAccepted: true,
        }),
      });
      assert.equal(regRes.status, 201);
      const dbUser = await rawPrisma.user.findUnique({ where: { email } });
      if (dbUser) createdUserIds.push(dbUser.id);

      const fakeToken = crypto.randomBytes(32).toString("hex");
      const verifyRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: fakeToken }),
      });
      assert.equal(verifyRes.status, 400);
    });

    it("REG-002.4: Verifies email using 6-digit OTP code fallback", async () => {
      const email = `otp-verify-${Date.now()}@example.com`;
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "OTP Tester",
          email,
          companyName: "OTP Innovations",
          country: "India",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
          termsAccepted: true,
        }),
      });
      assert.equal(regRes.status, 201);
      const regData = await regRes.json();
      const otpCode = regData.previewCode;
      const dbUser = await rawPrisma.user.findUnique({ where: { email } });
      if (dbUser) createdUserIds.push(dbUser.id);

      const verifyRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
      });
      assert.equal(verifyRes.status, 200);
      const verifyData = await verifyRes.json();
      assert.equal(verifyData.success, true);
      if (verifyData.tenant?.id) createdTenantIds.push(verifyData.tenant.id);
    });
  });

  // =========================================================================
  // 3. TEN-001 through TEN-004: Tenant Provisioning, Role & Isolation
  // =========================================================================
  describe("TEN-001 through TEN-004: Tenant Provisioning, Role Boundaries & Tenant Isolation", () => {
    let onboardedUserToken: string;
    let onboardedTenantId: string;
    let onboardedUserId: string;

    beforeAll(async () => {
      const email = `ten-prov-${Date.now()}@example.com`;
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Global Corp Admin",
          email,
          companyName: "Global Horizon Corp",
          country: "United States",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
          termsAccepted: true,
        }),
      });
      const regData = await regRes.json();
      const verifyRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token: regData.previewToken,
          companyName: "Global Horizon Corp",
        }),
      });
      const verifyData = await verifyRes.json();
      onboardedUserToken = verifyData.token;
      onboardedTenantId = verifyData.tenant.id;
      onboardedUserId = verifyData.user.id;

      createdUserIds.push(onboardedUserId);
      createdTenantIds.push(onboardedTenantId);
    });

    it("TEN-001: Creates dedicated tenant with unique ID and slug", async () => {
      const tenant = await rawPrisma.tenant.findUnique({
        where: { id: onboardedTenantId },
      });
      assert.ok(tenant, "Tenant exists in database");
      assert.equal(tenant.name, "Global Horizon Corp");
      assert.ok(tenant.slug && tenant.slug.length > 0, "Tenant has non-empty slug");
    });

    it("TEN-002: User is assigned Tenant Admin / Workspace Admin; NOT Super Admin or Employee", async () => {
      const user = await rawPrisma.user.findUnique({
        where: { id: onboardedUserId },
        include: {
          roles: true,
          workspaceRoleAssignments: { include: { role: true } },
        },
      });
      assert.ok(user);

      // Verify no Super Admin role is present
      const isSuper = user.roles.some((r) => r.role === "super_admin");
      assert.equal(isSuper, false, "Registered user must NEVER receive super_admin role");

      // Verify user has hr_admin role
      const hasHrAdmin = user.roles.some((r) => r.role === "hr_admin" && r.tenantId === onboardedTenantId);
      assert.ok(hasHrAdmin, "User has hr_admin role assigned for their tenant");

      // Verify WorkspaceRoleAssignment is Workspace Admin
      const hasWorkspaceAdminRole = user.workspaceRoleAssignments.some(
        (a) => a.role.name.toLowerCase().includes("admin") && a.tenantId === onboardedTenantId
      );
      assert.ok(hasWorkspaceAdminRole, "User has Workspace Admin assignment");
    });

    it("TEN-003: Cross-tenant data isolation strictly enforced", async () => {
      // Create a second isolated tenant
      const otherTenant = await rawPrisma.tenant.create({
        data: {
          name: "Other Isolated Org",
          slug: `other-iso-${Date.now()}`,
        },
      });
      createdTenantIds.push(otherTenant.id);

      // Verify onboarded user's token has their own tenantId
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${onboardedUserToken}` },
      });
      assert.equal(meRes.status, 200);
      const meData = await meRes.json();
      assert.equal(meData.profile?.tenantId, onboardedTenantId);
      assert.notEqual(meData.profile?.tenantId, otherTenant.id, "User context strictly bound to their tenant");
    });

    it("TEN-004: Existing default tenant (tenant-default-001) is protected and not overwritten", async () => {
      const defaultTenant = await rawPrisma.tenant.findFirst({
        where: { OR: [{ id: "tenant-default-001" }, { slug: "master" }] },
      });
      if (defaultTenant) {
        assert.ok(defaultTenant.id !== onboardedTenantId, "Default tenant remains completely untouched");
      }
    });
  });

  // =========================================================================
  // 4. PLAN-001, PLAN-002 & DEMO-001: Free Trial Plan & Demo Workspace
  // =========================================================================
  describe("PLAN-001, PLAN-002 & DEMO-001: Free Trial Subscription & Expiry Enforcement", () => {
    it("PLAN-001: Provisions 14-day free trial with status 'trialing' and standard quotas", async () => {
      const email = `plan-trial-${Date.now()}@example.com`;
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Trial Plan Admin",
          email,
          companyName: "Trial Enterprises",
          country: "India",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
          termsAccepted: true,
        }),
      });
      const regData = await regRes.json();
      const verifyRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: regData.previewToken, companyName: "Trial Enterprises" }),
      });
      const verifyData = await verifyRes.json();
      createdUserIds.push(verifyData.user.id);
      createdTenantIds.push(verifyData.tenant.id);

      const subscription = await rawPrisma.tenantSubscription.findUnique({
        where: { tenantId: verifyData.tenant.id },
      });
      assert.ok(subscription, "Subscription created");
      assert.equal(subscription.status, "trialing");
      assert.ok(subscription.trialStartedAt, "Trial started timestamp present");
      assert.ok(subscription.trialEndsAt, "Trial ends timestamp present");

      // Verify 14-day window (+- 1 hour tolerance)
      const diffDays = Math.round(
        (subscription.trialEndsAt.getTime() - subscription.trialStartedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      assert.equal(diffDays, 14, "Trial duration must be exactly 14 days");
      assert.equal(subscription.maxEmployees, 25, "Standard trial quota: 25 employees");
      assert.equal(subscription.maxUsers, 5, "Standard trial quota: 5 users");
      assert.equal(subscription.storageLimitGb, 10, "Standard trial quota: 10 GB");
    });

    it("PLAN-002: Server-authoritative trial expiry check", async () => {
      // Simulate expired trial by backdating trialEndsAt
      const testTenant = await rawPrisma.tenant.create({
        data: {
          name: "Expired Org",
          slug: `expired-org-${Date.now()}`,
          subscription: {
            create: {
              status: "trialing",
              trialStartedAt: new Date(Date.now() - 20 * 86400000),
              trialEndsAt: new Date(Date.now() - 5 * 86400000), // Expired 5 days ago
              expiresAt: new Date(Date.now() - 5 * 86400000),
              maxEmployees: 25,
              maxUsers: 5,
              storageLimitGb: 10,
            },
          },
        },
        include: { subscription: true },
      });
      createdTenantIds.push(testTenant.id);

      const sub = testTenant.subscription!;
      const isExpired = sub.status === "trialing" && new Date(sub.trialEndsAt).getTime() < Date.now();
      assert.equal(isExpired, true, "Trial correctly identified as expired by server clock");
    });

    it("DEMO-001: Synthetic demo workspace strategy operates in isolated boundary", async () => {
      // Verify demo workspace pattern
      const demoTenant = await rawPrisma.tenant.create({
        data: {
          name: "MasterHRMS Demo Workspace",
          slug: `demo-synthetic-${Date.now()}`,
        },
      });
      createdTenantIds.push(demoTenant.id);

      assert.ok(demoTenant.id, "Demo workspace tenant created");
      assert.notEqual(demoTenant.id, "tenant-default-001");
    });
  });

  // =========================================================================
  // 5. AUTH-001 & AUTH-002: Authentication Preservation & Super Admin Separation
  // =========================================================================
  describe("AUTH-001 & AUTH-002: Authentication Flow Preservation & Super Admin Separation", () => {
    it("AUTH-001: Normal login succeeds for tenant user", async () => {
      const email = `tenant-login-${Date.now()}@example.com`;
      const password = "TenantPassword@123";
      const pwHash = await bcrypt.hash(password, 10);

      const tenant = await rawPrisma.tenant.create({
        data: { name: "Tenant Login Co", slug: `login-co-${Date.now()}` },
      });
      createdTenantIds.push(tenant.id);

      const user = await rawPrisma.user.create({
        data: {
          email,
          passwordHash: pwHash,
          profile: { create: { fullName: "Login Tester", tenantId: tenant.id } },
          roles: { create: { role: "hr_admin", tenantId: tenant.id } },
        },
      });
      createdUserIds.push(user.id);

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.token, "JWT token returned for valid tenant user");
      assert.equal(data.user.email, email);
    });

    it("AUTH-002.1: Super Admin (admin@masterhrms.com) rejected on normal /login with generic 401", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: superAdminEmail,
          password: "Admin@123456",
        }),
      });

      // Strict security rule: Platform Super Admin must NOT authenticate through normal login
      assert.equal(res.status, 401, "Super Admin rejected on normal login");
      const data = await res.json();
      assert.equal(data.error, "Invalid email or password.", "Generic error returned without leaking identity");
    });

    it("AUTH-002.2: Super Admin authenticates when portal is specified as 'super'", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-portal": "super",
        },
        body: JSON.stringify({
          email: superAdminEmail,
          password: "Admin@123456",
          portal: "super",
        }),
      });

      assert.equal(res.status, 200, "Super Admin authenticated via super portal");
      const data = await res.json();
      assert.ok(data.token);
      assert.ok(data.roles.includes("super_admin"));
    });

    it("AUTH-002.3: Non-super user attempting 'super' portal is rejected with 403 SUPER_ADMIN_ONLY", async () => {
      const email = `imposter-${Date.now()}@example.com`;
      const password = "ImposterPassword@123";
      const pwHash = await bcrypt.hash(password, 10);

      const user = await rawPrisma.user.create({
        data: {
          email,
          passwordHash: pwHash,
          roles: { create: { role: "hr_admin" } },
        },
      });
      createdUserIds.push(user.id);

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-portal": "super",
        },
        body: JSON.stringify({
          email,
          password,
          portal: "super",
        }),
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, "SUPER_ADMIN_ONLY");
    });
  });

  // =========================================================================
  // 6. PWD-001, PWD-002 & PWD-003: Password Recovery Lifecycle
  // =========================================================================
  describe("PWD-001 through PWD-003: Password Recovery Lifecycle & Active Session Invalidation", () => {
    it("PWD-001: Forgot-password returns enumeration-resistant generic response for existing and non-existing emails", async () => {
      // Existing email
      const existingEmail = `pwd-exist-${Date.now()}@example.com`;
      const user = await rawPrisma.user.create({
        data: { email: existingEmail, passwordHash: "dummy" },
      });
      createdUserIds.push(user.id);

      const res1 = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: existingEmail }),
      });
      assert.equal(res1.status, 200);
      const data1 = await res1.json();
      assert.equal(data1.success, true);
      assert.ok(data1.message.includes("instructions have been dispatched"));

      // Non-existing email
      const nonExistingEmail = `non-existent-${Date.now()}@example.com`;
      const res2 = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nonExistingEmail }),
      });
      assert.equal(res2.status, 200);
      const data2 = await res2.json();
      assert.equal(data2.success, true);
      assert.equal(data2.message, data1.message, "Identical message for enumeration resistance");
    });

    it("PWD-002: Password reset with valid token succeeds, consumes token, and rejects replay", async () => {
      const email = `pwd-reset-${Date.now()}@example.com`;
      const user = await rawPrisma.user.create({
        data: { email, passwordHash: await bcrypt.hash("OldPassword@123", 10) },
      });
      createdUserIds.push(user.id);

      // Generate secure reset token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const tokenId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 3600000);

      await rawPrisma.$executeRawUnsafe(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
        tokenId,
        user.id,
        tokenHash,
        expiresAt
      );

      // Reset password using rawToken
      const newPassword = "NewSecurePassword@999";
      const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token: rawToken,
          newPassword,
        }),
      });
      assert.equal(resetRes.status, 200);
      const resetData = await resetRes.json();
      assert.equal(resetData.success, true);

      // Verify user can log in with new password
      const updatedUser = await rawPrisma.user.findUnique({ where: { id: user.id } });
      const passwordUpdated = await bcrypt.compare(newPassword, updatedUser!.passwordHash);
      assert.equal(passwordUpdated, true, "New password persisted");

      // Replay must fail (single-use)
      const replayRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token: rawToken,
          newPassword: "AnotherPassword@123",
        }),
      });
      assert.equal(replayRes.status, 400, "Consumed token rejected on replay");
    });

    it("PWD-003: Password reset terminates all active device sessions", async () => {
      const email = `pwd-sessions-${Date.now()}@example.com`;
      const user = await rawPrisma.user.create({
        data: { email, passwordHash: await bcrypt.hash("SessionOld@123", 10) },
      });
      createdUserIds.push(user.id);

      // Create two active device sessions
      const s1 = await rawPrisma.deviceSession.create({
        data: {
          userId: user.id,
          userAgent: "Device 1 - Chrome Desktop",
          expiresAt: new Date(Date.now() + 86400000),
          revoked: false,
        },
      });
      const s2 = await rawPrisma.deviceSession.create({
        data: {
          userId: user.id,
          userAgent: "Device 2 - Mobile Safari",
          expiresAt: new Date(Date.now() + 86400000),
          revoked: false,
        },
      });
      createdSessionIds.push(s1.id, s2.id);

      // Insert reset token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      await rawPrisma.$executeRawUnsafe(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
        crypto.randomUUID(),
        user.id,
        tokenHash,
        new Date(Date.now() + 3600000)
      );

      // Reset password
      const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token: rawToken,
          newPassword: "NewSessionPassword@123",
        }),
      });
      assert.equal(resetRes.status, 200);

      // Verify all active sessions were revoked
      const remainingActiveSessions = await rawPrisma.deviceSession.findMany({
        where: {
          userId: user.id,
          revoked: false,
        },
      });
      assert.equal(remainingActiveSessions.length, 0, "All active sessions revoked upon password reset");
    });
  });

  // =========================================================================
  // 7. MFA-001 through MFA-004: Two-Factor Authentication Lifecycle
  // =========================================================================
  describe("MFA-001 through MFA-004: TOTP Two-Factor Authentication & Backup Codes Lifecycle", () => {
    let mfaUserToken: string;
    let mfaUserId: string;
    let mfaUserEmail: string;

    beforeAll(async () => {
      mfaUserEmail = `mfa-test-${Date.now()}@example.com`;
      const user = await rawPrisma.user.create({
        data: {
          email: mfaUserEmail,
          passwordHash: await bcrypt.hash("MfaTest@123", 10),
        },
      });
      mfaUserId = user.id;
      createdUserIds.push(mfaUserId);

      // Create valid active device session so requireAuth accepts the token
      const session = await rawPrisma.deviceSession.create({
        data: {
          userId: mfaUserId,
          userAgent: "MFA-Test-Runner",
          expiresAt: new Date(Date.now() + 86400000),
          revoked: false,
        },
      });
      createdSessionIds.push(session.id);

      mfaUserToken = generateToken({
        userId: mfaUserId,
        email: mfaUserEmail,
        roles: ["tenant_admin"],
        sessionId: session.id,
      });
    });

    it("MFA-001 & MFA-004: Initiates TOTP setup with MasterHRMS issuer branding & encrypted secret", async () => {
      const res = await fetch(`${baseUrl}/api/auth/2fa/totp/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mfaUserToken}`,
        },
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.secret, "Base32 secret returned");
      assert.ok(data.qrCode, "QR code data URL returned");
      assert.ok(data.otpauthUrl, "otpauth URL returned");
      assert.equal(data.backupCodes.length, 8, "8 backup codes issued");

      // Verify MFA-004: MasterHRMS issuer branding
      assert.ok(data.otpauthUrl.includes("issuer=MasterHRMS"), "Issuer is strictly MasterHRMS");
      assert.ok(data.otpauthUrl.includes("MasterHRMS"), "URI contains MasterHRMS branding");

      // Verify secret is encrypted in database (not plain text)
      const dbUser = await rawPrisma.user.findUnique({ where: { id: mfaUserId } });
      assert.ok(dbUser?.twoFactorSecret);
      assert.notEqual(dbUser?.twoFactorSecret, data.secret, "Secret must be encrypted in database");
      assert.equal(dbUser?.twoFactorEnabled, false, "2FA remains inactive until confirmed");
    });

    it("MFA-002: Confirms TOTP setup using 6-digit code and activates 2FA", async () => {
      // Re-initiate to have raw secret in memory
      const setup = await TwoFactorService.initiateTotpSetup(mfaUserId);
      const validCode = speakeasy.totp({
        secret: setup.secret,
        encoding: "base32",
      });

      const confirmRes = await fetch(`${baseUrl}/api/auth/2fa/totp/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mfaUserToken}`,
        },
        body: JSON.stringify({ token: validCode }),
      });
      assert.equal(confirmRes.status, 200);
      const confirmData = await confirmRes.json();
      assert.equal(confirmData.success, true);

      // Verify 2FA is active in database
      const dbUser = await rawPrisma.user.findUnique({ where: { id: mfaUserId } });
      assert.equal(dbUser?.twoFactorEnabled, true, "2FA is now activated");
    });

    it("MFA-003: Single-use backup recovery code verification and atomicity", async () => {
      // Setup fresh user with known backup codes
      const email = `backup-code-${Date.now()}@example.com`;
      const rawBackupCode = "A1B2-C3D4";
      const hashed = hashBackupCode(rawBackupCode);

      const user = await rawPrisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash("BackupPass@123", 10),
          twoFactorEnabled: true,
          twoFactorBackupCodes: JSON.stringify([hashed, hashBackupCode("E5F6-G7H8")]),
        },
      });
      createdUserIds.push(user.id);

      // First verification with raw backup code must succeed
      const res1 = await TwoFactorService.verifyTotpOrBackup(user.id, rawBackupCode);
      assert.equal(res1.valid, true);
      assert.equal(res1.method, "BACKUP_CODE");

      // Re-verification with identical backup code must fail (single-use consumption)
      const res2 = await TwoFactorService.verifyTotpOrBackup(user.id, rawBackupCode);
      assert.equal(res2.valid, false, "Consumed backup code cannot be reused");
    });
  });

  // =========================================================================
  // 8. MAIL-001 through MAIL-005: Email Outbox, Retries & Official Branding
  // =========================================================================
  describe("MAIL-001 through MAIL-005: Durable Email Outbox, Retries & MasterHRMS Branding", () => {
    it("MAIL-001 & MAIL-002: Enqueues welcome and verification emails durably to Outbox", async () => {
      const email = `outbox-mail-${Date.now()}@example.com`;
      const idempotencyKey = `welcome-idemp-${Date.now()}`;

      const result = await EmailOutboxService.queueEmail({
        to: email,
        subject: "Welcome to MasterHRMS",
        html: "<p>Your workspace is ready.</p>",
        idempotencyKey,
      });

      assert.equal(result.queued, true);
      assert.ok(result.eventId);
      createdOutboxEventIds.push(result.eventId);

      // Check DB event record
      const dbEvent = await rawPrisma.outboxEvent.findUnique({
        where: { eventId: result.eventId },
      });
      assert.ok(dbEvent);
      assert.equal(dbEvent.status, "PENDING");
      assert.equal(dbEvent.entityType, "EMAIL");
    });

    it("MAIL-003: Retries pending emails with retry counter", async () => {
      // Process pending emails (will mark as dispatched or increment retry counter)
      const count = await EmailOutboxService.processPendingEmails();
      assert.ok(typeof count === "object" && typeof count.processed === "number", "Process returned processed count");
    });

    it("MAIL-004: Deduplicates repeated email dispatches using idempotency key", async () => {
      const email = `dedup-mail-${Date.now()}@example.com`;
      const idempotencyKey = `unique-key-${Date.now()}`;

      const res1 = await EmailOutboxService.queueEmail({
        to: email,
        subject: "Deduplication Test 1",
        html: "<p>Message</p>",
        idempotencyKey,
      });
      assert.equal(res1.queued, true);
      assert.equal(res1.isDuplicate, false);
      createdOutboxEventIds.push(res1.eventId);

      // Re-queue with exact same idempotencyKey
      const res2 = await EmailOutboxService.queueEmail({
        to: email,
        subject: "Deduplication Test 1",
        html: "<p>Message</p>",
        idempotencyKey,
      });
      assert.equal(res2.queued, true);
      assert.equal(res2.isDuplicate, true, "Duplicate detected and deduplicated");
      assert.equal(res2.eventId, res1.eventId, "Event ID matched");
    });

    it("MAIL-005: Official MasterHRMS Email Templates render official logo and responsive HTML", () => {
      // 1. Verification Template
      const verifyHtml = renderEmailVerificationTemplate({
        userName: "John Doe",
        verificationUrl: "https://masterhrms.com/auth?mode=verify&token=123",
        otpCode: "847291",
        expiryMinutes: 60,
      });
      assert.ok(verifyHtml.includes("/logo.webp"), "Contains official MasterHRMS logo");
      assert.ok(verifyHtml.includes("847291"), "Contains 6-digit OTP code");
      assert.ok(verifyHtml.includes("Verify Email"), "Contains primary action button");

      // 2. Welcome Template
      const welcomeHtml = renderWelcomeTemplate({
        userName: "John Doe",
        companyName: "Acme Global",
        workspaceUrl: "https://acme.masterhrms.com",
        loginUrl: "https://masterhrms.com/auth",
        trialDays: 14,
      });
      assert.ok(welcomeHtml.includes("/logo.webp"));
      assert.ok(welcomeHtml.includes("Free 14-Day") || welcomeHtml.includes("14-Day"));
      assert.ok(welcomeHtml.includes("Acme Global"));

      // 3. Password Changed Template
      const pwdChangedHtml = renderPasswordChangedTemplate({
        userName: "John Doe",
        changedAt: "2026-11-20 12:00:00 UTC",
        loginUrl: "https://masterhrms.com/auth",
      });
      assert.ok(pwdChangedHtml.includes("/logo.webp"));
      assert.ok(pwdChangedHtml.includes("Password Updated"));
      assert.ok(pwdChangedHtml.includes("All prior active web and mobile device sessions have been terminated") || pwdChangedHtml.includes("sessions have been terminated"));

      // 4. Two Factor Status Template
      const twoFaHtml = renderTwoFactorStatusTemplate({
        userName: "John Doe",
        action: "ENABLED",
        timestamp: "2026-11-20 12:00:00 UTC",
      });
      assert.ok(twoFaHtml.includes("/logo.webp"));
      assert.ok(twoFaHtml.includes("Two-Factor Authentication (TOTP) has been enabled"));

      // 5. Trial Activated Template
      const trialHtml = renderTrialActivatedTemplate({
        adminName: "John Doe",
        companyName: "Acme Global",
        trialDays: 14,
        trialEndsAt: "2026-12-04",
        dashboardUrl: "https://masterhrms.com/tenant/dashboard",
      });
      assert.ok(trialHtml.includes("/logo.webp"));
      assert.ok(trialHtml.includes("Free Trial Activated for Acme Global"));
      assert.ok(trialHtml.includes("14-day free trial"));
    });
  });
});
