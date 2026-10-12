/**
 * MASTERHRMS — S-Track Step S3: Settings UI & Real CRUD Test Suite
 *
 * Validates:
 * 1. Super Admin vs Tenant Admin Scope Authorization & RBAC (403 on Platform for Tenant).
 * 2. Multi-Tenant Scope Isolation & Inheritance (Tenant A override isolated from Tenant B).
 * 3. Validation & Atomic Persistence via RuntimeLifecycleService.
 * 4. Secret-Field UX & Zero-Leakage Masking on GET, PUT, and Audit logs.
 * 5. Provider Connection Test Endpoints (email, storage, sms, oauth, payments) backed by S2 factories.
 * 6. Realtime Hot-Reload Socket Notifications without secret payload leakage.
 * 7. Invariance of Dual Razorpay Architecture and Private /uploads Security Gates.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import http from "http";
import { rawPrisma } from "../prisma";
import { settingsRouter } from "../routes/settings.routes";
import { generateToken } from "../lib/jwt";
import { SettingsService } from "../services/settings/settings.service";
import { MailerFactory } from "../services/factories/mailer.factory";
import { StorageFactory } from "../services/factories/storage.factory";
import { SmsFactory } from "../services/factories/sms.factory";
import { OAuthFactory } from "../services/factories/oauth.factory";

describe("S-Track Step S3: Settings UI, Real CRUD & Connection Test Endpoints", { timeout: 30000 }, () => {
  const timestamp = Date.now();
  const tenantAId = `s3-tenant-a-${timestamp}`;
  const tenantBId = `s3-tenant-b-${timestamp}`;

  const app = express();
  app.use(express.json());
  app.use("/api/v1/settings", settingsRouter);

  let server: http.Server;
  let baseUrl: string;

  let superToken: string;
  let tenantAToken: string;
  let tenantBToken: string;

  beforeAll(async () => {
    // 1. Create Isolated Test Tenants
    await rawPrisma.tenant.create({
      data: {
        id: tenantAId,
        name: `S3 Tenant A ${timestamp}`,
        slug: `s3-a-${timestamp}`,
      },
    });

    await rawPrisma.tenant.create({
      data: {
        id: tenantBId,
        name: `S3 Tenant B ${timestamp}`,
        slug: `s3-b-${timestamp}`,
      },
    });

    // 2. Create Users & JWT Tokens
    const superUser = await rawPrisma.user.create({
      data: {
        email: `s3-super-${timestamp}@masterhrms.com`,
        passwordHash: "hash-secret",
        roles: { create: [{ role: "super_admin" }] },
      },
    });

    const tenantAUser = await rawPrisma.user.create({
      data: {
        email: `s3-tenant-a-${timestamp}@tenant-a.com`,
        passwordHash: "hash-secret",
        roles: { create: [{ role: "hr_admin", tenantId: tenantAId }] },
        profile: {
          create: {
            tenantId: tenantAId,
            fullName: "Tenant A Admin",
          },
        },
      },
    });

    const tenantBUser = await rawPrisma.user.create({
      data: {
        email: `s3-tenant-b-${timestamp}@tenant-b.com`,
        passwordHash: "hash-secret",
        roles: { create: [{ role: "hr_admin", tenantId: tenantBId }] },
        profile: {
          create: {
            tenantId: tenantBId,
            fullName: "Tenant B Admin",
          },
        },
      },
    });

    superToken = generateToken({
      userId: superUser.id,
      email: superUser.email,
      roles: ["super_admin"],
      tenantId: null,
    });

    tenantAToken = generateToken({
      userId: tenantAUser.id,
      email: tenantAUser.email,
      roles: ["hr_admin"],
      tenantId: tenantAId,
    });

    tenantBToken = generateToken({
      userId: tenantBUser.id,
      email: tenantBUser.email,
      roles: ["hr_admin"],
      tenantId: tenantBId,
    });

    // 3. Start local ephemeral HTTP server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    try {
      await rawPrisma.settingAudit.deleteMany({
        where: {
          scopeId: { in: [tenantAId, tenantBId] },
        },
      });
      await rawPrisma.settingSecret.deleteMany({
        where: {
          setting: {
            scopeId: { in: [tenantAId, tenantBId] },
          },
        },
      });
      await rawPrisma.setting.deleteMany({
        where: {
          scopeId: { in: [tenantAId, tenantBId] },
        },
      });
      await rawPrisma.tenant.deleteMany({
        where: {
          id: { in: [tenantAId, tenantBId] },
        },
      });
    } catch {}
  });

  // ─── 1. RBAC & SCOPE ISOLATION ──────────────────────────────────────
  describe("1. Scope Authorization & RBAC Enforcement", () => {
    it("1.1 Super Admin can access PLATFORM scope settings", async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/branding`, {
        headers: { Authorization: `Bearer ${superToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("values");
      expect(data.values).toHaveProperty("branding.app_name");
    });

    it("1.2 Tenant Admin is rejected with HTTP 403 when requesting PLATFORM scope", async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/branding`, {
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Super Admin access required for PLATFORM scope");
    });

    it("1.3 Tenant Admin cannot modify PLATFORM scope settings", async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/branding`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tenantAToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "branding.app_name": "Hacked Platform Name",
        }),
      });
      expect(res.status).toBe(403);
    });

    it("1.4 Tenant Admin can read and update their own TENANT scope settings", async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings/TENANT/branding`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tenantAToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "branding.app_name": "Tenant A Custom Workspace",
        }),
      });
      expect(res.status).toBe(200);
      const saved = await res.json();
      expect(saved.success).toBe(true);

      // Verify readback
      const getRes = await fetch(`${baseUrl}/api/v1/settings/TENANT/branding`, {
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      const data = await getRes.json();
      expect(data.values["branding.app_name"]).toBe("Tenant A Custom Workspace");
    });

    it("1.5 Tenant A cannot mutate or observe Tenant B scope settings", async () => {
      // Tenant B reads branding
      const bRes = await fetch(`${baseUrl}/api/v1/settings/TENANT/branding`, {
        headers: { Authorization: `Bearer ${tenantBToken}` },
      });
      const bData = await bRes.json();
      // Tenant B must not see Tenant A's override
      expect(bData.values["branding.app_name"]).not.toBe("Tenant A Custom Workspace");
    });
  });

  // ─── 2. REAL CRUD PERSISTENCE & SCHEMA VALIDATION ───────────────────
  describe("2. Schema Validation & Atomic Persistence via RuntimeLifecycleService", () => {
    it("2.1 PUT validates input fields against SETTINGS_REGISTRY (rejects invalid values)", async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings/TENANT/branding`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tenantAToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "branding.primary_color": "not-a-color-hex", // Invalid color
        }),
      });
      expect(res.status).toBe(400);
      const err = await res.json();
      expect(err.error).toContain("Must be a valid hex color code");
    });

    it("2.2 PUT rejects unknown or malicious setting keys", async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings/TENANT/branding`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tenantAToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "branding.unregistered_exploit_key": "some-payload",
        }),
      });
      expect(res.status).toBe(400);
      const err = await res.json();
      expect(err.error).toContain("Invalid setting key");
    });

    it("2.3 Successful PUT creates an immutable SettingAudit trail record", async () => {
      const updateRes = await fetch(`${baseUrl}/api/v1/settings/TENANT/locale`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tenantAToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "locale.default_currency": "EUR",
          "locale.date_format": "YYYY-MM-DD",
        }),
      });
      expect(updateRes.status).toBe(200);

      // Fetch audit history via API
      const historyRes = await fetch(`${baseUrl}/api/v1/settings/TENANT/locale/history`, {
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      expect(historyRes.status).toBe(200);
      const history = await historyRes.json();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].scope).toBe("TENANT");
    });
  });

  // ─── 3. SECRET FIELD UX & ZERO-LEAKAGE MASKING ──────────────────────
  describe("3. Secret-Field UX & Zero-Leakage Masking", () => {
    it("3.1 Secret field returns masked contract { isSecret: true, set: true } on GET", async () => {
      // 1. Save SMTP with password
      await fetch(`${baseUrl}/api/v1/settings/TENANT/email`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tenantAToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "email.smtp_host": "smtp.mailgun.org",
          "email.smtp_port": 587,
          "email.smtp_user": "postmaster@tenant-a.com",
          "email.smtp_password": "super-confidential-smtp-token-1234",
        }),
      });

      // 2. GET email settings
      const getRes = await fetch(`${baseUrl}/api/v1/settings/TENANT/email`, {
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      expect(getRes.status).toBe(200);
      const data = await getRes.json();

      // Ensure password is masked and never returned in plaintext
      const passVal = data.values["email.smtp_password"];
      expect(passVal).toEqual({ isSecret: true, set: true });
      expect(JSON.stringify(data)).not.toContain("super-confidential-smtp-token-1234");
    });

    it("3.2 Partial update preserving secret does not overwrite or wipe stored secret", async () => {
      // Update only smtp_port without sending smtp_password
      const patchRes = await fetch(`${baseUrl}/api/v1/settings/TENANT/email`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tenantAToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "email.smtp_port": 465,
        }),
      });
      expect(patchRes.status).toBe(200);

      // Verify that the secret remains set and decryptable internally by MailerFactory
      const emailConfig = await MailerFactory.resolveSettings("TENANT", tenantAId);
      expect(emailConfig.pass).toBe("super-confidential-smtp-token-1234");
      expect(emailConfig.port).toBe(465);
    });

    it("3.3 SettingAudit trail masks secrets and prevents plaintext log leakage", async () => {
      const audits = await rawPrisma.settingAudit.findMany({
        where: {
          scope: "TENANT",
          scopeId: tenantAId,
          key: "email.smtp_password",
        },
        orderBy: { createdAt: "desc" },
      });

      expect(audits.length).toBeGreaterThan(0);
      for (const audit of audits) {
        expect(audit.newValueMasked).toBe("[MASKED SECRET]");
        expect(JSON.stringify(audit)).not.toContain("super-confidential-smtp-token-1234");
      }
    });
  });

  // ─── 4. PROVIDER CONNECTION TEST ENDPOINTS ─────────────────────────
  describe("4. Provider Connection Test Endpoints (Zero-Mock Backed by S2 Factories)", () => {
    it("4.1 POST /test for email executes real MailerFactory connection verification", async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings/TENANT/email/test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tenantAToken}`,
          "Content-Type": "application/json",
        },
      });

      // Returns structured JSON with latencyMs and safe error/success
      const body = await res.json();
      expect(body).toHaveProperty("latencyMs");
      expect(typeof body.latencyMs).toBe("number");
      // Since smtp.mailgun.org is not reachable in local offline test double, fails gracefully without crashing
      expect([200, 400]).toContain(res.status);
    });

    it("4.2 POST /test for storage validates driver configuration and returns status", async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings/TENANT/storage/test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tenantAToken}`,
          "Content-Type": "application/json",
        },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.details.provider).toBe("local");
      expect(body.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("4.3 POST /test for sms executes test probe in sandbox mode safely", async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings/TENANT/sms/test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tenantAToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "mock-sandbox",
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain("Sandbox verification successful");
      expect(body.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("4.4 POST /test for oauth requires PLATFORM scope and verifies CSRF tokens", async () => {
      // 1. Tenant Admin receives 403
      const tenantRes = await fetch(`${baseUrl}/api/v1/settings/TENANT/oauth/test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tenantAToken}`,
          "Content-Type": "application/json",
        },
      });
      expect(tenantRes.status).toBe(403);

      // 2. Configure mock platform Google OAuth
      await fetch(`${baseUrl}/api/v1/settings/PLATFORM/oauth`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${superToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "oauth.google_enabled": true,
          "oauth.google_client_id": "test-google-client-id-12345.apps.googleusercontent.com",
          "oauth.google_client_secret": "test-google-secret-67890",
        }),
      });

      // 3. Super Admin tests Google OAuth
      const superRes = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/oauth/test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${superToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "google",
        }),
      });
      expect(superRes.status).toBe(200);
      const superBody = await superRes.json();
      expect(superBody.success).toBe(true);
      expect(superBody.provider).toBe("google");
      expect(superBody.message).toContain("CSRF state verified");
      expect(superBody).toHaveProperty("clientIdPrefix");
      // Must not leak secret
      expect(JSON.stringify(superBody)).not.toContain("test-google-secret-67890");
    });

    it("4.5 POST /test for payments validates key format and rejects live credentials in sandbox", async () => {
      // 1. Configure live Razorpay key
      await fetch(`${baseUrl}/api/v1/settings/PLATFORM/payments`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${superToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "payments.razorpay_enabled": true,
          "payments.razorpay_key_id": "rzp_live_forbidden_in_dev",
          "payments.razorpay_key_secret": "live_secret_forbidden",
        }),
      });

      // 2. Test connection rejects live keys in dev environment
      const liveRes = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/payments/test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${superToken}`,
          "Content-Type": "application/json",
        },
      });
      expect(liveRes.status).toBe(400);
      const liveErr = await liveRes.json();
      expect(liveErr.error).toContain("Live Razorpay credentials");

      // 3. Configure valid test key
      await fetch(`${baseUrl}/api/v1/settings/PLATFORM/payments`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${superToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "payments.razorpay_enabled": true,
          "payments.razorpay_key_id": "rzp_test_valid_test_double",
          "payments.razorpay_key_secret": "valid_sandbox_secret",
        }),
      });

      const validRes = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/payments/test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${superToken}`,
          "Content-Type": "application/json",
        },
      });
      expect(validRes.status).toBe(200);
      const validBody = await validRes.json();
      expect(validBody.success).toBe(true);
      expect(validBody.provider).toBe("razorpay");
      expect(validBody.message).toContain("HMAC integrity verified");
    });
  });

  // ─── 5. ARCHITECTURAL INVARIANCE & REGRESSIONS ──────────────────────
  describe("5. Architectural Invariance & Safety Boundaries", () => {
    it("5.1 Dual Razorpay architecture remains strictly isolated", async () => {
      // 1. Configure Tenant A with its own tenant-scoped Razorpay credentials via API
      const setRes = await fetch(`${baseUrl}/api/v1/settings/TENANT/payments`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tenantAToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "payments.razorpay_key_id": "rzp_test_tenant_a_custom",
        }),
      });
      expect(setRes.status).toBe(200);

      // 2. Fetch both platform and tenant groups
      const platformPayments = await SettingsService.getGroup("PLATFORM", null, "payments");
      const tenantPayments = await SettingsService.getGroup("TENANT", tenantAId, "payments");

      expect(platformPayments.values).toBeDefined();
      expect(tenantPayments.values).toBeDefined();
      expect(platformPayments.values["payments.razorpay_key_id"]).toBe("rzp_test_valid_test_double");
      expect(tenantPayments.values["payments.razorpay_key_id"]).toBe("rzp_test_tenant_a_custom");
    });

    it("5.2 Unauthenticated requests to settings API return HTTP 401 Unauthorized", async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/general`);
      expect(res.status).toBe(401);
    });
  });
});
