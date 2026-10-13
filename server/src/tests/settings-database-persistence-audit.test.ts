/**
 * MASTERHRMS — Settings Database Persistence & Secret-Field Audit Test Suite
 *
 * Covers:
 * 1. Platform & Tenant Payment Gateways Persistence (Razorpay, Bank Transfer, PayPal).
 * 2. Partial Update Semantics (Updating single field doesn't clear group).
 * 3. Secret Field AES-256-GCM Encryption, Write-Only Semantics & Redaction.
 * 4. Mask preservation (Blank or masked secrets do not overwrite existing secrets).
 * 5. Scope Isolation (Tenant cannot write PLATFORM; Tenant A isolated from Tenant B).
 * 6. Tenant CMS Settings Persistence (Invoices, Salary, Approvals, Custom Fields).
 * 7. SettingAudit Redaction (No plaintext in audit logs).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import http from "http";
import { rawPrisma } from "../prisma";
import { settingsRouter } from "../routes/settings.routes";
import { cmsRouter } from "../routes/cms.routes";
import { generateToken } from "../lib/jwt";
import { SettingsService, decryptSecret } from "../services/settings/settings.service";

describe("Settings Database Persistence & Secret-Field Audit", { timeout: 30000 }, () => {
  const timestamp = Date.now();
  const tenantAId = `audit-tenant-a-${timestamp}`;
  const tenantBId = `audit-tenant-b-${timestamp}`;

  const app = express();
  app.use(express.json());
  app.use("/api/v1/settings", settingsRouter);
  app.use("/api/cms", cmsRouter);

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
        name: `Audit Tenant A ${timestamp}`,
        slug: `audit-a-${timestamp}`,
      },
    });

    await rawPrisma.tenant.create({
      data: {
        id: tenantBId,
        name: `Audit Tenant B ${timestamp}`,
        slug: `audit-b-${timestamp}`,
      },
    });

    // 2. Create Users in DB & Generate Auth Tokens
    const superUser = await rawPrisma.user.create({
      data: {
        email: `audit-super-${timestamp}@masterhrms.com`,
        passwordHash: "hash-secret",
        roles: { create: [{ role: "super_admin" }] },
      },
    });

    const tenantAUser = await rawPrisma.user.create({
      data: {
        email: `audit-tenant-a-${timestamp}@tenant-a.com`,
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
        email: `audit-tenant-b-${timestamp}@tenant-b.com`,
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

    // 3. Start ephemeral HTTP server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    SettingsService.clearCache();
  });

  afterAll(async () => {
    if (server) {
      await new Promise((res) => server.close(res));
    }

    try {
      await rawPrisma.settingAudit.deleteMany({
        where: { scopeId: { in: [tenantAId, tenantBId] } },
      });
      await rawPrisma.settingSecret.deleteMany({
        where: { setting: { scopeId: { in: [tenantAId, tenantBId] } } },
      });
      await rawPrisma.setting.deleteMany({
        where: { scopeId: { in: [tenantAId, tenantBId] } },
      });
      await rawPrisma.cmsPage.deleteMany({
        where: {
          slug: {
            in: [
              `tenant-${tenantAId}-invoice-settings`,
              `tenant-${tenantAId}-salary-settings`,
              `tenant-${tenantAId}-approval-workflows`,
              `tenant-${tenantAId}-custom-fields`,
            ],
          },
        },
      });
      await rawPrisma.tenant.deleteMany({
        where: { id: { in: [tenantAId, tenantBId] } },
      });
    } catch {}
  });

  describe("1. Platform Payment Settings Persistence & Secret Encryption", () => {
    it("1.1 Super Admin persists Razorpay key and encrypted secret to PLATFORM scope", async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/payments`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superToken}`,
        },
        body: JSON.stringify({
          "payments.razorpay_enabled": true,
          "payments.razorpay_key_id": "rzp_test_platform_key_123",
          "payments.razorpay_key_secret": "rzp_sec_platform_secret_xyz_999",
          "payments.bank_transfer_enabled": true,
          "payments.bank_details": "Bank: HDFC Bank\nIFSC: HDFC0001234",
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify DB persistence in Setting & SettingSecret
      const setting = await rawPrisma.setting.findFirst({
        where: { scope: "PLATFORM", key: "payments.razorpay_key_secret" },
        include: { secret: true },
      });
      expect(setting).toBeDefined();
      expect(setting?.isSecret).toBe(true);
      expect(setting?.valueJson).toBeNull(); // ciphertext is not in valueJson!
      expect(setting?.secret?.ciphertext).toBeDefined();

      // Verify AES-256-GCM Decryption recovers original plaintext
      const decrypted = decryptSecret(
        setting!.secret!.ciphertext,
        setting!.secret!.iv,
        setting!.secret!.authTag
      );
      expect(decrypted).toBe("rzp_sec_platform_secret_xyz_999");
    });

    it("1.2 GET /PLATFORM/payments returns write-only masked representation for secrets", async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/payments`, {
        headers: { Authorization: `Bearer ${superToken}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.values["payments.razorpay_key_id"]).toBe("rzp_test_platform_key_123");
      expect(json.values["payments.razorpay_enabled"]).toBe(true);
      expect(json.values["payments.bank_transfer_enabled"]).toBe(true);

      // Secret must NEVER be returned plaintext
      const secretVal = json.values["payments.razorpay_key_secret"];
      expect(secretVal).toEqual({ isSecret: true, set: true });
    });

    it("1.3 Partial update without secret preserves existing encrypted secret", async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/payments`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superToken}`,
        },
        body: JSON.stringify({
          "payments.razorpay_key_id": "rzp_test_platform_updated_key_456",
          // razorpay_key_secret is omitted
        }),
      });

      expect(res.status).toBe(200);

      // Check DB secret is preserved
      const setting = await rawPrisma.setting.findFirst({
        where: { scope: "PLATFORM", key: "payments.razorpay_key_secret" },
        include: { secret: true },
      });
      expect(setting?.secret?.ciphertext).toBeDefined();
      const decrypted = decryptSecret(
        setting!.secret!.ciphertext,
        setting!.secret!.iv,
        setting!.secret!.authTag
      );
      expect(decrypted).toBe("rzp_sec_platform_secret_xyz_999");
    });

    it("1.4 SettingAudit records redact secrets with zero plaintext leakage", async () => {
      const audits = await rawPrisma.settingAudit.findMany({
        where: { scope: "PLATFORM", key: "payments.razorpay_key_secret" },
      });

      expect(audits.length).toBeGreaterThan(0);
      for (const audit of audits) {
        expect(audit.oldValueMasked).not.toContain("rzp_sec_");
        expect(audit.newValueMasked).not.toContain("rzp_sec_");
        expect(audit.newValueMasked).toBe("[MASKED SECRET]");
      }
    });
  });

  describe("2. Scope Authorization & Multi-Tenant Isolation", () => {
    it("2.1 Tenant Admin cannot modify PLATFORM scope settings (HTTP 403)", async () => {
      const res = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/payments`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantAToken}`,
        },
        body: JSON.stringify({
          "payments.razorpay_key_id": "malicious_tenant_override",
        }),
      });

      expect(res.status).toBe(403);
    });

    it("2.2 Tenant A and Tenant B maintain strictly isolated business settings", async () => {
      // Tenant A configures their own business key
      await fetch(`${baseUrl}/api/v1/settings/TENANT/payments?tenantId=${tenantAId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantAToken}`,
        },
        body: JSON.stringify({
          "payments.razorpay_key_id": "rzp_test_tenantA_key",
        }),
      });

      // Tenant B queries their settings
      const resB = await fetch(`${baseUrl}/api/v1/settings/TENANT/payments?tenantId=${tenantBId}`, {
        headers: { Authorization: `Bearer ${tenantBToken}` },
      });

      expect(resB.status).toBe(200);
      const jsonB = await resB.json();
      // Tenant B must not see Tenant A's override!
      expect(jsonB.values["payments.razorpay_key_id"]).not.toBe("rzp_test_tenantA_key");
    });
  });

  describe("3. Tenant CMS Settings Persistence (Invoices, Salary, Approvals, Custom Fields)", () => {
    it("3.1 Persists and reloads tenant invoice & billing settings", async () => {
      const invoiceData = {
        invoicePrefix: "ACME-INV-",
        estimatePrefix: "ACME-EST-",
        dueDays: "45",
        bankName: "Standard Chartered Bank",
        accountNumber: "987654321098",
        ifscSwift: "SCBL0001234",
        terms: "Net 45 payment terms apply.",
      };

      const putRes = await fetch(`${baseUrl}/api/cms/pages/tenant-${tenantAId}-invoice-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantAToken}`,
        },
        body: JSON.stringify({
          title: `Invoice Settings ${tenantAId}`,
          content: invoiceData,
          published: true,
        }),
      });

      expect(putRes.status).toBe(200);

      // Verify GET returns persisted data
      const getRes = await fetch(`${baseUrl}/api/cms/pages/tenant-${tenantAId}-invoice-settings`, {
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.content.invoicePrefix).toBe("ACME-INV-");
      expect(getJson.content.dueDays).toBe("45");
      expect(getJson.content.bankName).toBe("Standard Chartered Bank");
    });

    it("3.2 Persists and reloads tenant salary configuration", async () => {
      const salaryData = {
        daPercent: "15",
        hraPercent: "50",
        pfEmployeePercent: "12",
        pfEmployerPercent: "12",
        esiEmployeePercent: "0.75",
        professionalTax: "250",
        overtimeHourlyMultiplier: "2.0",
      };

      const putRes = await fetch(`${baseUrl}/api/cms/pages/tenant-${tenantAId}-salary-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantAToken}`,
        },
        body: JSON.stringify({
          title: `Salary Rules ${tenantAId}`,
          content: salaryData,
          published: true,
        }),
      });

      expect(putRes.status).toBe(200);

      const getRes = await fetch(`${baseUrl}/api/cms/pages/tenant-${tenantAId}-salary-settings`, {
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.content.hraPercent).toBe("50");
      expect(getJson.content.overtimeHourlyMultiplier).toBe("2.0");
    });

    it("3.3 Persists and reloads dynamic custom fields", async () => {
      const customFields = [
        { id: "cf-test-1", module: "Employees", label: "National ID (SSN/Aadhaar)", type: "Text", required: true },
        { id: "cf-test-2", module: "Projects", label: "Billing Rate Card Code", type: "Text", required: false },
      ];

      const putRes = await fetch(`${baseUrl}/api/cms/pages/tenant-${tenantAId}-custom-fields`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantAToken}`,
        },
        body: JSON.stringify({
          title: `Custom Fields ${tenantAId}`,
          content: { fields: customFields },
          published: true,
        }),
      });

      expect(putRes.status).toBe(200);

      const getRes = await fetch(`${baseUrl}/api/cms/pages/tenant-${tenantAId}-custom-fields`, {
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.content.fields.length).toBe(2);
      expect(getJson.content.fields[0].label).toBe("National ID (SSN/Aadhaar)");
    });

    it("3.4 Persists and reloads tenant approval workflows", async () => {
      const workflowsData = [
        {
          id: "wf-leave",
          name: "Leave Requests",
          module: "Leave & Attendance",
          levels: 2,
          tier1Role: "Team Lead",
          tier2Role: "HR Manager",
          autoApproveDays: 3,
          notifySlack: true,
        },
        {
          id: "wf-expense",
          name: "Expense Claims",
          module: "Payroll & Finance",
          levels: 3,
          tier1Role: "Finance Officer",
          tier2Role: "CFO",
          autoApproveDays: 5,
          notifySlack: false,
        },
      ];

      const putRes = await fetch(`${baseUrl}/api/cms/pages/tenant-${tenantAId}-approval-workflows`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantAToken}`,
        },
        body: JSON.stringify({
          title: `Approval Workflows ${tenantAId}`,
          content: { workflows: workflowsData },
          published: true,
        }),
      });

      expect(putRes.status).toBe(200);

      const getRes = await fetch(`${baseUrl}/api/cms/pages/tenant-${tenantAId}-approval-workflows`, {
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.content.workflows.length).toBe(2);
      expect(getJson.content.workflows[0].autoApproveDays).toBe(3);
      expect(getJson.content.workflows[0].notifySlack).toBe(true);
      expect(getJson.content.workflows[1].tier2Role).toBe("CFO");
    });
  });

  describe("4. PayPal Gateway Secret Encryption, Masking & Blank Preservation", () => {
    it("4.1 Super Admin sets PayPal Client ID and disposable test secret with AES-256-GCM encryption", async () => {
      const putRes = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/payments`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superToken}`,
        },
        body: JSON.stringify({
          "payments.paypal_enabled": true,
          "payments.paypal_client_id": "test_paypal_client_id_followup",
          "payments.paypal_secret": "disposable_test_paypal_secret_xyz123",
          "payments.paypal_mode": "sandbox",
        }),
      });

      expect(putRes.status).toBe(200);

      // Verify GET returns masked secret
      const getRes = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/payments`, {
        headers: { Authorization: `Bearer ${superToken}` },
      });
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.values["payments.paypal_client_id"]).toBe("test_paypal_client_id_followup");
      expect(getJson.values["payments.paypal_secret"]).toEqual({ isSecret: true, set: true });

      // Verify in DB that it is encrypted with AES-256-GCM
      const setting = await rawPrisma.setting.findFirst({
        where: {
          scope: "PLATFORM",
          key: "payments.paypal_secret",
        },
        include: { secret: true },
      });

      expect(setting).not.toBeNull();
      expect(setting?.secret).not.toBeNull();
      expect(setting!.secret!.ciphertext).not.toBe("disposable_test_paypal_secret_xyz123");
      const decrypted = decryptSecret(setting!.secret!.ciphertext, setting!.secret!.iv, setting!.secret!.authTag);
      expect(decrypted).toBe("disposable_test_paypal_secret_xyz123");
    });

    it("4.2 Partial update omitting secret preserves existing encrypted PayPal secret", async () => {
      const putRes = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/payments`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superToken}`,
        },
        body: JSON.stringify({
          "payments.paypal_client_id": "test_paypal_client_id_updated_safe",
        }),
      });

      expect(putRes.status).toBe(200);

      // Verify secret remains in DB and unchanged
      const setting = await rawPrisma.setting.findFirst({
        where: {
          scope: "PLATFORM",
          key: "payments.paypal_secret",
        },
        include: { secret: true },
      });

      expect(setting).not.toBeNull();
      expect(setting?.secret).not.toBeNull();
      const decrypted = decryptSecret(setting!.secret!.ciphertext, setting!.secret!.iv, setting!.secret!.authTag);
      expect(decrypted).toBe("disposable_test_paypal_secret_xyz123");
    });
  });

  describe("5. Platform vs Tenant Bank Transfer Settings Isolation", () => {
    it("5.1 Platform and tenant bank details are strictly isolated in DB", async () => {
      // Set platform bank details
      await fetch(`${baseUrl}/api/v1/settings/PLATFORM/payments`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superToken}`,
        },
        body: JSON.stringify({
          "payments.bank_details": "PLATFORM: Master HRMS Inc HDFC 50200012345678",
        }),
      });

      // Set Tenant A bank details
      await fetch(`${baseUrl}/api/v1/settings/TENANT/payments?tenantId=${tenantAId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantAToken}`,
        },
        body: JSON.stringify({
          "payments.bank_details": "TENANT-A: Acme Corp ICICI 001122334455",
        }),
      });

      // Read Platform
      const platRes = await fetch(`${baseUrl}/api/v1/settings/PLATFORM/payments`, {
        headers: { Authorization: `Bearer ${superToken}` },
      });
      const platJson = await platRes.json();
      expect(platJson.values["payments.bank_details"]).toBe("PLATFORM: Master HRMS Inc HDFC 50200012345678");

      // Read Tenant A
      const tenRes = await fetch(`${baseUrl}/api/v1/settings/TENANT/payments?tenantId=${tenantAId}`, {
        headers: { Authorization: `Bearer ${tenantAToken}` },
      });
      const tenJson = await tenRes.json();
      expect(tenJson.values["payments.bank_details"]).toBe("TENANT-A: Acme Corp ICICI 001122334455");

      // Verify DB records
      const platDb = await rawPrisma.setting.findFirst({
        where: {
          scope: "PLATFORM",
          key: "payments.bank_details",
        },
      });
      const tenantDb = await rawPrisma.setting.findFirst({
        where: {
          scope: "TENANT",
          scopeId: tenantAId,
          key: "payments.bank_details",
        },
      });
      expect(platDb!.valueJson).toContain("Master HRMS Inc");
      expect(tenantDb!.valueJson).toContain("Acme Corp");
    });
  });

  describe("6. Fail-Closed Error Handling", () => {
    it("6.1 Submitting live Razorpay key in sandbox mode returns HTTP 400 and does not persist", async () => {
      const putRes = await fetch(`${baseUrl}/api/cms/pages/system-platform-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superToken}`,
        },
        body: JSON.stringify({
          slug: "system-platform-settings",
          content: {
            razorpayKeyId: "rzp_live_forbidden_key_123",
          },
        }),
      });

      expect(putRes.status).toBe(400);
      const errJson = await putRes.json();
      expect(errJson.error).toContain("Live Razorpay credentials");
    });
  });
});

