import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { Socket } from "node:net";
import crypto from "node:crypto";
import dotenv from "dotenv";

// Load env BEFORE dynamically importing server/index so NODE_ENV=test is honored prior to module evaluation
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });
process.env.NODE_ENV = "test";

import { Prisma } from "@prisma/client";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { createDeviceSession } from "../services/device-session.service";
import { invalidateAuthCache } from "../middleware/auth";
import { invalidateWorkspaceCache } from "../lib/workspace-host";
import { SettingsService } from "../services/settings/settings.service";
import { PusherService } from "../services/pusher.service";
import { updateEnvFileSafely } from "../services/settings/env-sync.service";
import { getAuthoritativeCustomerInfo } from "../services/invoice-engine.service";

const db = rawPrisma || proxiedPrisma;
let appInstance: any = null;

async function getApp() {
  if (!appInstance) {
    process.env.NODE_ENV = "test";
    const mod = await import("../index");
    appInstance = mod.app || mod.default;
  }
  return appInstance;
}

interface InvokeOptions {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

interface InvokeResponse {
  status: number;
  headers: Record<string, any>;
  body: any;
  rawText: string;
}

/**
 * Dispatches an HTTP request directly into the Express `app` in-memory without binding a TCP socket.
 */
async function invokeApp(opts: InvokeOptions): Promise<InvokeResponse> {
  const app = await getApp();
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const req = new http.IncomingMessage(socket);
    req.method = opts.method;
    req.url = opts.url;
    (req as any).originalUrl = opts.url;

    const payloadStr = opts.body !== undefined ? JSON.stringify(opts.body) : "";
    const normalizedHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(opts.headers || {})) {
      normalizedHeaders[k.toLowerCase()] = v;
    }
    if (!normalizedHeaders["host"]) {
      normalizedHeaders["host"] = "localhost:4000";
    }
    if (opts.body !== undefined) {
      normalizedHeaders["content-type"] = "application/json";
      normalizedHeaders["content-length"] = String(Buffer.byteLength(payloadStr));
    }
    req.headers = normalizedHeaders;

    const res = new http.ServerResponse(req);
    const chunks: Buffer[] = [];

    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);

    (res as any).write = (chunk: any, encoding?: any, cb?: any) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), typeof encoding === "string" ? (encoding as BufferEncoding) : "utf8"));
      }
      return origWrite(chunk, encoding, cb);
    };

    (res as any).end = (chunk?: any, encoding?: any, cb?: any) => {
      if (chunk && typeof chunk !== "function") {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), typeof encoding === "string" ? (encoding as BufferEncoding) : "utf8"));
      }
      origEnd(chunk, encoding, cb);
      const rawText = Buffer.concat(chunks).toString("utf8");
      let parsed: any = rawText;
      try {
        parsed = rawText ? JSON.parse(rawText) : null;
      } catch {
        // Non-JSON response
      }
      resolve({
        status: res.statusCode,
        headers: res.getHeaders() as Record<string, any>,
        body: parsed,
        rawText,
      });
      return res;
    };

    try {
      (app as any).handle(req, res, (err: any) => {
        if (err) reject(err);
      });
      if (payloadStr) {
        req.push(Buffer.from(payloadStr, "utf8"));
      }
      req.push(null);
    } catch (err) {
      reject(err);
    }
  });
}

async function runCrossVerificationSuite() {
  console.log("================================================================================");
  console.log("🧪 MASTERHRMS — 7-SCENARIO SETTINGS E2E CROSS-VERIFICATION SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  async function step(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err?.message || err}`);
      failed++;
    }
  }

  const runId = crypto.randomUUID().slice(0, 8);
  const tenantId = crypto.randomUUID();
  const tenantSlug = `verify-${runId}`;
  const tenantHost = `${tenantSlug}.localhost:4000`;

  const superUserId = crypto.randomUUID();
  const tenantAdminId = crypto.randomUUID();
  const empAId = crypto.randomUUID();
  const empBId = crypto.randomUUID();

  let superToken = "";
  let tenantAdminToken = "";
  let empAToken = "";
  let empBToken = "";
  let createdRoleId: string | null = null;
  const tmpEnvFile = path.join(os.tmpdir(), `masterhrms-env-sync-${runId}.env`);

  // Snapshot PLATFORM settings & process.env before Scenario 6 so we restore 100% cleanly in finally
  const envBackup: Record<string, string | undefined> = {};
  const envKeysToSnapshot = [
    "PUSHER_ENABLED", "PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET", "PUSHER_CLUSTER",
    "VITE_PUSHER_ENABLED", "VITE_PUSHER_APP_ID", "VITE_PUSHER_KEY", "VITE_PUSHER_CLUSTER",
    "NEXT_PUBLIC_PUSHER_ENABLED", "NEXT_PUBLIC_PUSHER_KEY", "NEXT_PUBLIC_PUSHER_CLUSTER",
    "FIREBASE_ENABLED", "FIREBASE_API_KEY", "FIREBASE_PROJECT_ID", "FIREBASE_APP_ID",
    "FIREBASE_MESSAGING_SENDER_ID", "FIREBASE_VAPID_KEY", "FIREBASE_SERVICE_ACCOUNT_JSON",
    "VITE_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_PASSWORD",
  ];
  for (const k of envKeysToSnapshot) {
    envBackup[k] = process.env[k];
  }

  let originalPlatformPusherRows: any[] = [];
  let originalPlatformFirebaseRows: any[] = [];
  let platformBackupLoaded = false;

  try {
    // Backup existing PLATFORM pusher/firebase rows (if any) so production DB is untouched after test
    originalPlatformPusherRows = await db.setting.findMany({
      where: { scope: "PLATFORM", group: "pusher" },
      include: { secret: true },
    });
    originalPlatformFirebaseRows = await db.setting.findMany({
      where: { scope: "PLATFORM", group: "firebase" },
      include: { secret: true },
    });
    platformBackupLoaded = true;

    // ── Seed isolated test Tenant + Super Admin + Tenant Admin + Employee A + Employee B ──
    await db.tenant.create({
      data: {
        id: tenantId,
        name: `Verify Corp ${runId}`,
        slug: tenantSlug,
        timezone: "Asia/Kolkata",
        currency: "INR",
        isOnboarded: true,
      },
    });

    const wsAdminRole = await db.workspaceRole.create({
      data: {
        tenantId,
        name: "Workspace Admin",
        description: "Authoritative Tenant Workspace Administrator",
        isSystem: true,
      },
    });

    const createUserFixture = async (
      id: string,
      email: string,
      fullName: string,
      role: "super_admin" | "hr_admin" | "employee",
      assignedTenantId: string | null,
      assignWorkspaceAdminRole = false
    ) => {
      await db.user.create({
        data: {
          id,
          email,
          passwordHash: "$2a$10$abcdefghijklmnopqrstuv",
          profile: {
            create: {
              email,
              fullName,
              tenantId: assignedTenantId,
            },
          },
          roles: {
            create: {
              role: role as any,
              tenantId: assignedTenantId,
            },
          },
        },
      });
      if (assignWorkspaceAdminRole && assignedTenantId) {
        await db.userRoleAssignment.create({
          data: {
            userId: id,
            tenantId: assignedTenantId,
            roleId: wsAdminRole.id,
          },
        });
      }
      const session = await createDeviceSession({
        userId: id,
        tenantId: assignedTenantId,
        ipAddress: "127.0.0.1",
        userAgent: "CrossVerifySuite/1.0",
      });
      return generateToken({
        userId: id,
        email,
        tenantId: assignedTenantId,
        roles: [role],
        sessionId: session.sessionId,
      });
    };

    superToken = await createUserFixture(superUserId, `super-${runId}@test.local`, "Super Admin Test", "super_admin", null);
    tenantAdminToken = await createUserFixture(tenantAdminId, `tadmin-${runId}@test.local`, "Tenant Admin Test", "employee", tenantId, true);
    empAToken = await createUserFixture(empAId, `empa-${runId}@test.local`, "Employee A Test", "employee", tenantId);
    empBToken = await createUserFixture(empBId, `empb-${runId}@test.local`, "Employee B Test", "employee", tenantId);

    // =========================================================================
    // SCENARIO 1: Tenant Admin Roles, Modules & Organization Decision Authority + Dashboard Sync
    // =========================================================================
    console.log("--- Scenario 1: Tenant Admin Roles, Organization Decision Authority & Dashboard Sync ---");

    await step("Non-admin employee is strictly blocked (403) from mutating TENANT organization settings & roles", async () => {
      const settingsRes = await invokeApp({
        method: "PUT",
        url: "/api/v1/settings/TENANT/branding",
        headers: { Authorization: `Bearer ${empAToken}`, Host: tenantHost },
        body: { "branding.primary_color": "#000000" },
      });
      assert.strictEqual(settingsRes.status, 403, `Expected 403 for employee TENANT mutation, got ${settingsRes.status}`);

      const roleRes = await invokeApp({
        method: "POST",
        url: "/api/workspace/roles",
        headers: { Authorization: `Bearer ${empAToken}`, Host: tenantHost },
        body: { name: "Unauthorized Role", permissions: ["hrm.dashboard.view"] },
      });
      assert.strictEqual(roleRes.status, 403, `Expected 403 for employee role creation, got ${roleRes.status}`);
    });

    await step("Tenant Admin creates custom RBAC role, toggles workspace modules, updates org branding, and /dashboard/tenant reflects all live", async () => {
      const createRole = await invokeApp({
        method: "POST",
        url: "/api/workspace/roles",
        headers: { Authorization: `Bearer ${tenantAdminToken}`, Host: tenantHost },
        body: {
          name: `Regional HR Director ${runId}`,
          description: "Custom organization decision role",
          permissions: ["hrm.dashboard.view", "leave.manage", "attendance.view"],
        },
      });
      assert.ok(createRole.status === 200 || createRole.status === 201, `Role create failed: ${createRole.rawText}`);
      createdRoleId = createRole.body?.id || createRole.body?.role?.id || null;
      assert.ok(createdRoleId, "Created role must return DB id");

      const modToggle = await invokeApp({
        method: "PUT",
        url: "/api/workspace/modules",
        headers: { Authorization: `Bearer ${tenantAdminToken}`, Host: tenantHost },
        body: { module: "pos", isEnabled: false },
      });
      assert.strictEqual(modToggle.status, 200, `Module toggle failed: ${modToggle.rawText}`);

      const brandSave = await invokeApp({
        method: "PUT",
        url: "/api/v1/settings/TENANT/branding",
        headers: { Authorization: `Bearer ${tenantAdminToken}`, Host: tenantHost },
        body: {
          "branding.app_name": `Apex Global Workspace ${runId}`,
          "branding.primary_color": "#059669",
        },
      });
      assert.strictEqual(brandSave.status, 200, `Tenant branding save failed: ${brandSave.rawText}`);

      const dashRes = await invokeApp({
        method: "GET",
        url: "/api/dashboard/tenant",
        headers: { Authorization: `Bearer ${tenantAdminToken}`, Host: tenantHost },
      });
      assert.strictEqual(dashRes.status, 200, `Tenant dashboard failed: ${dashRes.rawText}`);
      assert.strictEqual(dashRes.body.tenantName, `Apex Global Workspace ${runId}`);
      assert.strictEqual(dashRes.body.primaryColor, "#059669");
      assert.ok(dashRes.body.rolesCount >= 1, "rolesCount must reflect DB roles");
      assert.ok(dashRes.body.disabledModulesCount >= 1, "disabledModulesCount must reflect disabled POS module");
    });

    // =========================================================================
    // SCENARIO 2: Per-Employee Theme Accent Color Isolation (USER Scope)
    // =========================================================================
    console.log("\n--- Scenario 2: Per-Employee Theme Color Isolation (Employee A vs Employee B) ---");

    await step("Employee A sets personal theme color (#E11D48) -> applies ONLY to Employee A while Employee B keeps Tenant color (#059669)", async () => {
      const saveEmpAColor = await invokeApp({
        method: "PUT",
        url: "/api/v1/settings/USER/user",
        headers: { Authorization: `Bearer ${empAToken}`, Host: tenantHost },
        body: { "user.primary_color": "#E11D48" },
      });
      assert.strictEqual(saveEmpAColor.status, 200, `Employee A theme color save failed: ${saveEmpAColor.rawText}`);

      // Employee A app-config (both tenant host and localhost SPA host!)
      const empAConfig = await invokeApp({
        method: "GET",
        url: "/api/v1/public/app-config",
        headers: { Authorization: `Bearer ${empAToken}`, Host: tenantHost },
      });
      assert.strictEqual(empAConfig.status, 200);
      assert.strictEqual(empAConfig.body.primaryColor, "#E11D48", "Employee A effective primaryColor must be #E11D48");
      assert.strictEqual(empAConfig.body.userPrimaryColor, "#E11D48", "Employee A userPrimaryColor must be #E11D48");
      assert.strictEqual(empAConfig.body.workspacePrimaryColor, "#059669", "Workspace brand color must remain #059669");

      // Employee B on the exact same workspace must NOT see Employee A's color!
      const empBConfig = await invokeApp({
        method: "GET",
        url: "/api/v1/public/app-config",
        headers: { Authorization: `Bearer ${empBToken}`, Host: tenantHost },
      });
      assert.strictEqual(empBConfig.status, 200);
      assert.strictEqual(empBConfig.body.primaryColor, "#059669", "Employee B must receive workspace color #059669");
      assert.strictEqual(empBConfig.body.userPrimaryColor, null, "Employee B must have null userPrimaryColor");
    });

    // =========================================================================
    // SCENARIO 3: Tenant Timezone Workspace-Wide Synchronization
    // =========================================================================
    console.log("\n--- Scenario 3: Tenant Timezone Workspace-Wide Synchronization ---");

    await step("Tenant Admin syncs timezone to America/New_York -> updates Tenant DB, public workspace, dashboards & all employees without personal override", async () => {
      const tzSave = await invokeApp({
        method: "PUT",
        url: "/api/v1/settings/TENANT/locale",
        headers: { Authorization: `Bearer ${tenantAdminToken}`, Host: tenantHost },
        body: { "locale.timezone": "America/New_York" },
      });
      assert.strictEqual(tzSave.status, 200, `Timezone save failed: ${tzSave.rawText}`);

      invalidateWorkspaceCache(tenantSlug);
      invalidateAuthCache(undefined, tenantId);

      const tenantRow = await db.tenant.findUnique({ where: { id: tenantId } });
      assert.strictEqual(tenantRow?.timezone, "America/New_York", "Tenant.timezone column must sync to America/New_York");

      const pubWs = await invokeApp({
        method: "GET",
        url: "/api/public/workspace",
        headers: { Host: tenantHost },
      });
      assert.strictEqual(pubWs.status, 200);
      assert.strictEqual(pubWs.body?.workspace?.timezone, "America/New_York", "/public/workspace must reflect America/New_York");

      // Employee B (default user.timezone = "") must inherit America/New_York!
      const empBConfig = await invokeApp({
        method: "GET",
        url: "/api/v1/public/app-config",
        headers: { Authorization: `Bearer ${empBToken}`, Host: tenantHost },
      });
      assert.strictEqual(empBConfig.body?.locale?.timezone, "America/New_York", "Employee B must inherit workspace timezone America/New_York");
      assert.strictEqual(empBConfig.body?.locale?.workspaceTimezone, "America/New_York");
    });

    // =========================================================================
    // SCENARIO 4: Tenant Currency Sync Across Application & Payment Gateways
    // =========================================================================
    console.log("\n--- Scenario 4: Tenant Currency Sync Across Application & Payment Gateways ---");

    await step("Tenant Admin sets workspace currency to USD ($) -> syncs Tenant.currency, app-config, payments.currency, Razorpay config & Subscription Billing preview", async () => {
      const currSave = await invokeApp({
        method: "PUT",
        url: "/api/v1/settings/TENANT/locale",
        headers: { Authorization: `Bearer ${tenantAdminToken}`, Host: tenantHost },
        body: {
          "locale.default_currency": "USD",
          "locale.currency_symbol": "$",
        },
      });
      assert.strictEqual(currSave.status, 200, `Currency save failed: ${currSave.rawText}`);

      const tenantRow = await db.tenant.findUnique({ where: { id: tenantId } });
      assert.strictEqual(tenantRow?.currency, "USD", "Tenant.currency DB column must sync to USD");

      const appCfg = await invokeApp({
        method: "GET",
        url: "/api/v1/public/app-config",
        headers: { Authorization: `Bearer ${tenantAdminToken}`, Host: tenantHost },
      });
      assert.strictEqual(appCfg.body?.currency?.defaultCurrency, "USD");
      assert.strictEqual(appCfg.body?.currency?.currencySymbol, "$");

      const rzpCfg = await invokeApp({
        method: "GET",
        url: "/api/payments/razorpay/config",
        headers: { Authorization: `Bearer ${tenantAdminToken}`, Host: tenantHost },
      });
      assert.strictEqual(rzpCfg.status, 200, `Razorpay config GET failed: ${rzpCfg.rawText}`);
      assert.strictEqual(rzpCfg.body?.config?.currency, "USD", "Payment Gateway config must dynamically resolve workspace currency USD");

      // Check subscription billing plan preview if at least one active plan exists in DB
      const anyPlan = await db.subscriptionPlan.findFirst({ where: { isActive: true } });
      if (anyPlan) {
        const previewRes = await invokeApp({
          method: "GET",
          url: `/api/billing/preview?planId=${encodeURIComponent(anyPlan.id)}&duration=1_month`,
          headers: { Authorization: `Bearer ${tenantAdminToken}`, Host: tenantHost },
        });
        assert.strictEqual(previewRes.status, 200, `Billing preview failed: ${previewRes.rawText}`);
        assert.strictEqual(previewRes.body?.currency, "USD", "Billing preview must dynamically reflect workspace currency USD");
      }
    });

    // =========================================================================
    // SCENARIO 5: Tenant Company Profile Reflected on Subscription Invoices
    // =========================================================================
    console.log("\n--- Scenario 5: Tenant Company Settings Reflected on Subscription Invoices ---");

    await step("Tenant Admin updates Company Profile (Legal Name, Billing Address, GSTIN, Billing Email) -> Subscription Invoice customer block reflects exact details", async () => {
      const profileSave = await invokeApp({
        method: "PUT",
        url: "/api/v1/company-profile",
        headers: { Authorization: `Bearer ${tenantAdminToken}`, Host: tenantHost },
        body: {
          legalName: `Apex Enterprise Holdings Pvt Ltd ${runId}`,
          tradeName: `Apex Global ${runId}`,
          businessType: "pvt_ltd",
          email: `billing-${runId}@apexglobal.test`,
          phone: "+1-555-0199",
          registeredAddressLine1: "742 Evergreen Terrace, Suite 900",
          registeredCity: "Bengaluru",
          registeredState: "Karnataka",
          registeredStateCode: "29",
          registeredPostalCode: "560001",
          registeredCountry: "India",
          sameAsRegisteredAddress: false,
          billingAddressLine1: "One World Trade Center, Floor 45",
          billingCity: "New York",
          billingState: "NY",
          billingPostalCode: "10007",
          billingCountry: "United States",
        },
      });
      assert.strictEqual(profileSave.status, 200, `Company profile save failed: ${profileSave.rawText}`);

      const gstSave = await invokeApp({
        method: "POST",
        url: "/api/v1/company-profile/gst",
        headers: { Authorization: `Bearer ${tenantAdminToken}`, Host: tenantHost },
        body: {
          gstin: "29ABCDE1234F1Z5",
          registrationType: "REGULAR",
          legalName: `Apex Enterprise Holdings Pvt Ltd ${runId}`,
          stateCode: "29",
          isPrimary: true,
        },
      });
      assert.ok(gstSave.status === 200 || gstSave.status === 201, `GST save failed: ${gstSave.rawText}`);

      const freshTenant = await db.tenant.findUnique({ where: { id: tenantId } });
      const invoiceCustomer = await getAuthoritativeCustomerInfo(tenantId, freshTenant);

      assert.strictEqual(invoiceCustomer.name, `Apex Enterprise Holdings Pvt Ltd ${runId}`);
      assert.strictEqual(invoiceCustomer.email, `billing-${runId}@apexglobal.test`);
      assert.strictEqual(invoiceCustomer.gstin, "29ABCDE1234F1Z5");
      assert.ok(
        invoiceCustomer.address.includes("One World Trade Center") && invoiceCustomer.address.includes("New York"),
        `Expected billing address on subscription invoice, got: ${invoiceCustomer.address}`
      );
    });

    // =========================================================================
    // SCENARIO 6: Super Admin Pusher, Firebase & SMTP -> Encrypted DB + Runtime & .env Sync
    // =========================================================================
    console.log("\n--- Scenario 6: Super Admin Pusher, Firebase & SMTP + Encrypted Vault & .env Sync ---");

    await step("Super Admin saves Pusher & Firebase in PLATFORM scope -> encrypts secrets in SettingSecret, overrides app-config & PusherService, updates process.env & syncs .env cleanly", async () => {
      const pusherSave = await invokeApp({
        method: "PUT",
        url: "/api/v1/settings/PLATFORM/pusher",
        headers: { Authorization: `Bearer ${superToken}` },
        body: {
          "pusher.enabled": true,
          "pusher.app_id": "998877",
          "pusher.key": `pk_live_${runId}`,
          "pusher.secret": `sk_live_secret_${runId}`,
          "pusher.cluster": "eu",
        },
      });
      assert.strictEqual(pusherSave.status, 200, `PLATFORM pusher save failed: ${pusherSave.rawText}`);

      const mockSaJson = JSON.stringify({
        type: "service_account",
        project_id: `hrms-firebase-${runId}`,
        client_email: `firebase-adminsdk@${runId}.iam.gserviceaccount.com`,
      });

      const fbSave = await invokeApp({
        method: "PUT",
        url: "/api/v1/settings/PLATFORM/firebase",
        headers: { Authorization: `Bearer ${superToken}` },
        body: {
          "firebase.enabled": true,
          "firebase.project_id": `hrms-firebase-${runId}`,
          "firebase.api_key": `AIzaSyTest_${runId}`,
          "firebase.auth_domain": `hrms-firebase-${runId}.firebaseapp.com`,
          "firebase.messaging_sender_id": "112233445566",
          "firebase.app_id": "1:112233445566:web:abcdef",
          "firebase.vapid_key": `BEl62iVapid_${runId}`,
          "firebase.service_account_json": mockSaJson,
        },
      });
      assert.strictEqual(fbSave.status, 200, `PLATFORM firebase save failed: ${fbSave.rawText}`);

      // 1. Verify secrets are NEVER stored in plaintext in Setting.valueJson, and ARE encrypted in SettingSecret
      const secretSettingRow = await db.setting.findFirst({
        where: { scope: "PLATFORM", key: "firebase.service_account_json" },
        include: { secret: true },
      });
      assert.strictEqual(secretSettingRow?.valueJson, null, "Plaintext valueJson must be null for secret setting");
      assert.ok(secretSettingRow?.secret?.ciphertext, "SettingSecret ciphertext must be populated");
      assert.ok(!secretSettingRow!.secret!.ciphertext.includes(runId), "Ciphertext must not contain plaintext");

      // 2. Verify PusherService.getConfig() resolves the updated DB credentials
      const pusherCfg = await PusherService.getConfig();
      assert.strictEqual(pusherCfg.appId, "998877");
      assert.strictEqual(pusherCfg.key, `pk_live_${runId}`);
      assert.strictEqual(pusherCfg.secret, `sk_live_secret_${runId}`);
      assert.strictEqual(pusherCfg.cluster, "eu");

      // 3. Verify public app-config serves public Pusher & Firebase config while NEVER leaking secrets
      const pubAppCfg = await invokeApp({
        method: "GET",
        url: "/api/v1/public/app-config",
      });
      assert.strictEqual(pubAppCfg.body?.pusher?.key, `pk_live_${runId}`);
      assert.strictEqual(pubAppCfg.body?.pusher?.cluster, "eu");
      assert.strictEqual(pubAppCfg.body?.pusher?.secret, undefined, "Public app-config must NEVER expose pusher.secret");
      assert.strictEqual(pubAppCfg.body?.firebase?.projectId, `hrms-firebase-${runId}`);
      assert.strictEqual(pubAppCfg.body?.firebase?.vapidKey, `BEl62iVapid_${runId}`);
      assert.strictEqual((pubAppCfg.body?.firebase as any)?.serviceAccountJson, undefined, "Public app-config must NEVER expose serviceAccountJson");

      // 4. Verify in-memory process.env was updated immediately by RuntimeLifecycleService -> EnvSyncService
      assert.strictEqual(process.env.PUSHER_KEY, `pk_live_${runId}`);
      assert.strictEqual(process.env.PUSHER_CLUSTER, "eu");
      assert.strictEqual(process.env.FIREBASE_PROJECT_ID, `hrms-firebase-${runId}`);

      // 5. Verify .env file writer safely updates keys & preserves comments/unrelated vars on an isolated temp file
      fs.writeFileSync(
        tmpEnvFile,
        `# Sample .env\nDATABASE_URL="postgresql://keep-untouched"\nPUSHER_KEY=old_key\n`,
        "utf8"
      );
      const wrote = updateEnvFileSafely(
        tmpEnvFile,
        {
          PUSHER_KEY: `pk_live_${runId}`,
          FIREBASE_PROJECT_ID: `hrms-firebase-${runId}`,
          FIREBASE_SERVICE_ACCOUNT_JSON: mockSaJson,
        },
        { forceWriteInTest: true }
      );
      assert.strictEqual(wrote, true, "updateEnvFileSafely must succeed on writable .env file");
      const updatedEnvContent = fs.readFileSync(tmpEnvFile, "utf8");
      assert.ok(updatedEnvContent.includes('DATABASE_URL="postgresql://keep-untouched"'), "Must preserve existing unrelated .env keys");
      assert.ok(updatedEnvContent.includes(`PUSHER_KEY=pk_live_${runId}`), "Must overwrite existing PUSHER_KEY in .env");
      assert.ok(updatedEnvContent.includes(`FIREBASE_PROJECT_ID=hrms-firebase-${runId}`), "Must append new FIREBASE_PROJECT_ID in .env");
      assert.ok(updatedEnvContent.includes("FIREBASE_SERVICE_ACCOUNT_JSON="), "Must write escaped JSON secret key in .env");
    });

    // =========================================================================
    // SCENARIO 7: All Settings UI Pages & Role Sidebars Alignment Across Both Frontends
    // =========================================================================
    console.log("\n--- Scenario 7: Settings UI Pages & Sidebar Navigation Reflection (TanStack + CMS) ---");

    await step("All 4 role settings pages + Tenant Roles/Modules/Company-Profile routes & sidebars are aligned in both src/ and CMS/", async () => {
      const repoRoot = path.resolve(__dirname, "../../..");
      const requiredFiles = [
        "src/routes/_authenticated/super/settings.tsx",
        "src/routes/_authenticated/tenant/settings.tsx",
        "src/routes/_authenticated/tenant/roles.tsx",
        "src/routes/_authenticated/tenant/modules.tsx",
        "src/routes/_authenticated/tenant/company-profile.tsx",
        "src/routes/_authenticated/hr/settings.tsx",
        "src/routes/_authenticated/me/settings.tsx",
        "CMS/src/app/super/settings/page.tsx",
        "CMS/src/app/(workspace)/tenant/settings/page.tsx",
        "CMS/src/app/(workspace)/tenant/roles/page.tsx",
        "CMS/src/app/(workspace)/tenant/modules/page.tsx",
        "CMS/src/app/(workspace)/tenant/company-profile/page.tsx",
        "CMS/src/app/(workspace)/hr/settings/page.tsx",
        "CMS/src/app/(workspace)/me/settings/page.tsx",
      ];

      for (const rel of requiredFiles) {
        assert.ok(fs.existsSync(path.join(repoRoot, rel)), `Missing route file: ${rel}`);
      }

      const cmsEmpSidebar = fs.readFileSync(path.join(repoRoot, "CMS/src/nav/employee-sidebar.ts"), "utf8");
      assert.ok(cmsEmpSidebar.includes('"/me/settings"'), "CMS employee-sidebar.ts must link /me/settings");

      const srcHrSidebar = fs.readFileSync(path.join(repoRoot, "src/nav/hr-sidebar.ts"), "utf8");
      const cmsHrSidebar = fs.readFileSync(path.join(repoRoot, "CMS/src/nav/hr-sidebar.ts"), "utf8");
      assert.ok(srcHrSidebar.includes('"/hr/settings"'), "src hr-sidebar.ts must link /hr/settings");
      assert.ok(cmsHrSidebar.includes('"/hr/settings"'), "CMS hr-sidebar.ts must link /hr/settings");

      const cmsDreamsSidebar = fs.readFileSync(path.join(repoRoot, "CMS/src/components/dreams-sidebar.tsx"), "utf8");
      assert.ok(cmsDreamsSidebar.includes('to="/tenant/settings"'), "CMS dreams-sidebar.tsx must link /tenant/settings");

      const srcNavReg = fs.readFileSync(path.join(repoRoot, "src/lib/navigation-registry.ts"), "utf8");
      const cmsNavReg = fs.readFileSync(path.join(repoRoot, "CMS/src/lib/navigation-registry.ts"), "utf8");
      for (const route of ["/super/settings", "/tenant/settings", "/hr/settings", "/me/settings", "/tenant/roles", "/tenant/modules", "/tenant/company-profile"]) {
        assert.ok(srcNavReg.includes(`"${route}"`), `src navigation-registry.ts missing ${route}`);
        assert.ok(cmsNavReg.includes(`"${route}"`), `CMS navigation-registry.ts missing ${route}`);
      }
    });
  } finally {
    // ── Clean up temporary test records & restore PLATFORM settings + process.env ──
    try {
      if (fs.existsSync(tmpEnvFile)) fs.unlinkSync(tmpEnvFile);
    } catch {}

    if (platformBackupLoaded) {
      try {
        // Restore PLATFORM pusher & firebase settings to exact pre-test state
        const currentPlatformRows = await db.setting.findMany({
          where: { scope: "PLATFORM", group: { in: ["pusher", "firebase"] } },
        });
        for (const r of currentPlatformRows) {
          await db.settingSecret.deleteMany({ where: { settingId: r.id } });
          await db.setting.delete({ where: { id: r.id } });
        }
        for (const orig of [...originalPlatformPusherRows, ...originalPlatformFirebaseRows]) {
          const recreated = await db.setting.create({
            data: {
              id: orig.id,
              scope: orig.scope,
              scopeId: orig.scopeId,
              group: orig.group,
              key: orig.key,
              valueJson: orig.valueJson === null ? Prisma.JsonNull : orig.valueJson,
              valueType: orig.valueType,
              isSecret: orig.isSecret,
              version: orig.version,
              updatedBy: orig.updatedBy,
            },
          });
          if (orig.secret) {
            await db.settingSecret.create({
              data: {
                settingId: recreated.id,
                ciphertext: orig.secret.ciphertext,
                iv: orig.secret.iv,
                authTag: orig.secret.authTag,
                keyVersion: orig.secret.keyVersion,
              },
            });
          }
        }
        await SettingsService.ensureDefaultSettings();
        SettingsService.clearCache();
        PusherService.resetInstance();
      } catch (cleanupErr: any) {
        console.warn("Warning restoring PLATFORM test rows:", cleanupErr?.message);
      }
    }

    for (const [k, v] of Object.entries(envBackup)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }

    try {
      const userIds = [superUserId, tenantAdminId, empAId, empBId];
      await db.setting.deleteMany({ where: { scope: "USER", scopeId: { in: userIds } } });
      await db.settingAudit.deleteMany({ where: { OR: [{ scopeId: tenantId }, { scopeId: { in: userIds } }, { changedBy: { in: userIds } }] } });
      const tenantSettings = await db.setting.findMany({ where: { scope: "TENANT", scopeId: tenantId } });
      for (const ts of tenantSettings) {
        await db.settingSecret.deleteMany({ where: { settingId: ts.id } });
      }
      await db.setting.deleteMany({ where: { scope: "TENANT", scopeId: tenantId } });
      await db.gSTRegistration.deleteMany({ where: { tenantId } });
      await db.companyProfile.deleteMany({ where: { tenantId } });
      await db.tenantModule.deleteMany({ where: { tenantId } });
      await db.userRoleAssignment.deleteMany({ where: { tenantId } });
      await db.workspaceRole.deleteMany({ where: { tenantId } });
      await db.auditLog.deleteMany({ where: { tenantId } });
      await db.deviceSession.deleteMany({ where: { userId: { in: userIds } } });
      await db.userRole.deleteMany({ where: { userId: { in: userIds } } });
      await db.profile.deleteMany({ where: { userId: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
      await db.tenant.deleteMany({ where: { id: tenantId } });
    } catch (cleanupErr: any) {
      console.warn("Warning cleaning up test tenant fixtures:", cleanupErr?.message);
    }

    await db.$disconnect().catch(() => {});
  }

  console.log("\n================================================================================");
  console.log(`📊 CROSS-VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runCrossVerificationSuite().catch((err) => {
  console.error("Fatal error in cross-verification suite:", err?.message || err);
  process.exit(1);
});
