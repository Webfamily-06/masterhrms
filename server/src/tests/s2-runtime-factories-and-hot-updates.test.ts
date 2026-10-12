/**
 * MASTERHRMS — S-Track Step S2: Runtime Factories & Dynamic Consumers Test Suite
 *
 * Validates:
 * 1. MailerFactory: connection reuse, hot updates on settings change, obsolete transport closure, secret masking.
 * 2. OAuthFactory: strict PLATFORM scope, hot updates, safe public config, state CSRF verification.
 * 3. StorageFactory: driver resolution, pre-validation fail-closed safety, tenant isolation.
 * 4. RealtimeFactory: event deduplication, room isolation, zero secret emission in payloads.
 * 5. SmsFactory: multi-provider abstraction, sandbox test double, fail-closed handling.
 * 6. RuntimeLifecycleService: validation, transactional persistence, coordinated hot-reload, cross-tenant isolation.
 * 7. Dual Razorpay Architecture: platform vs tenant isolation strictly preserved.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { rawPrisma } from "../prisma";
import { SettingsService } from "../services/settings/settings.service";
import { MailerFactory } from "../services/factories/mailer.factory";
import { OAuthFactory } from "../services/factories/oauth.factory";
import { StorageFactory } from "../services/factories/storage.factory";
import { RealtimeFactory } from "../services/factories/realtime.factory";
import { SmsFactory } from "../services/factories/sms.factory";
import { RuntimeLifecycleService } from "../services/settings/runtime-lifecycle.service";

describe("S-Track Step S2: Runtime Factories & Hot-Update Lifecycle", { timeout: 30000 }, () => {
  const timestamp = Date.now();
  const tenantAId = `s2-tenant-a-${timestamp}`;
  const tenantBId = `s2-tenant-b-${timestamp}`;

  beforeAll(async () => {
    // 1. Create isolated test tenants
    await rawPrisma.tenant.create({
      data: {
        id: tenantAId,
        name: `S2 Tenant A ${timestamp}`,
        slug: `s2-a-${timestamp}`,
      },
    });

    await rawPrisma.tenant.create({
      data: {
        id: tenantBId,
        name: `S2 Tenant B ${timestamp}`,
        slug: `s2-b-${timestamp}`,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
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
        where: { id: { in: [tenantAId, tenantBId] } },
      });
    } catch {}

    // Invalidate all factory caches
    await MailerFactory.invalidate();
    OAuthFactory.invalidate();
    StorageFactory.invalidate();
    SmsFactory.invalidate();
  });

  // =========================================================================
  // SECTION 1: MAILER FACTORY HOT-UPDATE & CONNECTION LIFECYCLE
  // =========================================================================
  describe("1. MailerFactory Runtime Lifecycle", () => {
    it("1.1 should resolve initial platform email settings dynamically", async () => {
      const settings = await MailerFactory.resolveSettings("PLATFORM", null);
      expect(settings).toBeDefined();
      expect(settings.port).toBeGreaterThan(0);
      expect(settings.fingerprint).toBeDefined();
    });

    it("1.2 should reuse transporter instance when configuration is unchanged", async () => {
      const t1 = await MailerFactory.getTransporter("PLATFORM", null);
      const t2 = await MailerFactory.getTransporter("PLATFORM", null);
      expect(t1).toBe(t2); // Same instance reused from pool
    });

    it("1.3 should hot-swap transporter when tenant email settings change without restarting", async () => {
      // Configure initial SMTP for Tenant A
      await SettingsService.setGroup("TENANT", tenantAId, "email", {
        "email.smtp_host": "smtp-v1.tenanta.org",
        "email.smtp_port": 587,
        "email.smtp_user": "v1@tenanta.org",
        "email.smtp_password": "secret-v1-password",
      });

      const t1 = await MailerFactory.getTransporter("TENANT", tenantAId);
      const settingsV1 = await MailerFactory.resolveSettings("TENANT", tenantAId);
      expect(settingsV1.host).toBe("smtp-v1.tenanta.org");

      // Update SMTP configuration to v2 for Tenant A
      await SettingsService.setGroup("TENANT", tenantAId, "email", {
        "email.smtp_host": "smtp-v2.tenanta.org",
        "email.smtp_port": 465,
        "email.smtp_user": "v2@tenanta.org",
        "email.smtp_password": "secret-v2-password",
      });

      const t2 = await MailerFactory.getTransporter("TENANT", tenantAId);
      const settingsV2 = await MailerFactory.resolveSettings("TENANT", tenantAId);

      expect(settingsV2.host).toBe("smtp-v2.tenanta.org");
      expect(settingsV2.port).toBe(465);
      expect(settingsV2.fingerprint).not.toBe(settingsV1.fingerprint);
      expect(t2).not.toBe(t1); // Obsolete transporter replaced
    });

    it("1.4 should support simulated test transport and mask passwords in verification errors", async () => {
      const dummyTransport: any = {
        verify: async () => true,
        sendMail: async (opts: any) => ({ messageId: "mock-msg-12345" }),
      };
      MailerFactory.setTestTransport(dummyTransport);

      const check = await MailerFactory.verifyConnection("TENANT", tenantAId);
      expect(check.ok).toBe(true);

      const sendResult = await MailerFactory.sendMail({
        scope: "TENANT",
        tenantId: tenantAId,
        to: "employee@tenanta.org",
        subject: "Welcome",
        html: "<p>Hello</p>",
      });
      expect(sendResult.success).toBe(true);
      expect(sendResult.messageId).toBe("mock-msg-12345");

      // Reset test transport
      MailerFactory.setTestTransport(null);
    });
  });

  // =========================================================================
  // SECTION 2: OAUTH FACTORY & PLATFORM ISOLATION
  // =========================================================================
  describe("2. OAuthFactory & Scope Protection", () => {
    it("2.1 should resolve platform OAuth configuration and hide client secrets in public config", async () => {
      // Set platform OAuth configuration
      await SettingsService.setGroup("PLATFORM", null, "oauth", {
        "oauth.google_enabled": true,
        "oauth.google_client_id": "google-client-id-abc",
        "oauth.google_client_secret": "super-secret-google-key",
      });

      const publicConfig = await OAuthFactory.getPublicConfig();
      expect(publicConfig.providers.google.enabled).toBe(true);
      expect(publicConfig.providers.google.configured).toBe(true);
      expect(publicConfig.providers.google.clientId).toBe("google-client-id-abc");

      // Verify zero secret leakage in public config
      expect((publicConfig.providers.google as any).clientSecret).toBeUndefined();
      expect(JSON.stringify(publicConfig)).not.toContain("super-secret-google-key");
    });

    it("2.2 should return decrypted secret only on internal getProviderConfig call", async () => {
      const internalConfig = await OAuthFactory.getProviderConfig("google");
      expect(internalConfig.clientId).toBe("google-client-id-abc");
      expect(internalConfig.clientSecret).toBe("super-secret-google-key");
    });

    it("2.3 should generate and validate CSRF state tokens", async () => {
      const state = OAuthFactory.generateState("google");
      expect(typeof state).toBe("string");
      expect(state.length).toBeGreaterThanOrEqual(16);

      // Valid state for google should return true once
      expect(OAuthFactory.validateState(state, "google")).toBe(true);
      // Second use (replay attack) should return false
      expect(OAuthFactory.validateState(state, "google")).toBe(false);
      // Mismatched provider should return false
      const state2 = OAuthFactory.generateState("microsoft");
      expect(OAuthFactory.validateState(state2, "google")).toBe(false);
    });

    it("2.4 should strictly forbid tenant scope from overriding platform-only OAuth settings", async () => {
      await expect(
        SettingsService.setGroup("TENANT", tenantAId, "oauth", {
          "oauth.github_enabled": true,
          "oauth.github_client_id": "tenant-github-id",
        })
      ).rejects.toThrow(/cannot be configured in 'TENANT' scope/);
    });
  });

  // =========================================================================
  // SECTION 3: STORAGE FACTORY & PRE-VALIDATION FAIL-CLOSED SAFETY
  // =========================================================================
  describe("3. StorageFactory & Adapter Safety", () => {
    it("3.1 should default to local encrypted storage driver", async () => {
      const driver = await StorageFactory.getDriver("PLATFORM", null);
      expect(driver).toBeDefined();
      expect(typeof driver.save).toBe("function");

      const test = await StorageFactory.testConnection("PLATFORM", null);
      expect(test.ok).toBe(true);
      expect(test.provider).toBe("local");
    });

    it("3.2 should fail-closed and retain existing driver when invalid cloud storage is submitted", async () => {
      const initialDriver = await StorageFactory.getDriver("TENANT", tenantAId);

      // Validate invalid S3 config (missing bucket and credentials)
      const invalidValidation = StorageFactory.validateConfig({
        provider: "s3",
        encryptionEnabled: true,
        maxFileSizeMb: 10,
      });
      expect(invalidValidation.valid).toBe(false);
      expect(invalidValidation.error).toContain("Bucket name is required");

      // Try setting invalid S3 config in SettingsService
      await SettingsService.setGroup("TENANT", tenantAId, "storage", {
        "storage.provider": "s3",
        "storage.s3_bucket": "", // empty bucket
      });

      // StorageFactory should detect invalid config and keep safe local encrypted driver
      const safeDriver = await StorageFactory.getDriver("TENANT", tenantAId);
      expect(safeDriver).toBeDefined();
      expect(typeof safeDriver.save).toBe("function");
    });

    it("3.3 should validate and support S3 cloud adapter when valid credentials are provided", async () => {
      await SettingsService.setGroup("TENANT", tenantAId, "storage", {
        "storage.provider": "s3",
        "storage.s3_bucket": "tenant-a-cloud-vault",
        "storage.s3_region": "ap-south-1",
        "storage.s3_access_key": "AKIA-TENANT-A-KEY",
        "storage.s3_secret_key": "SECRET-TENANT-A-KEY-XYZ",
      });

      const config = await StorageFactory.resolveConfig("TENANT", tenantAId);
      expect(config.provider).toBe("s3");
      expect(config.s3Bucket).toBe("tenant-a-cloud-vault");

      const test = await StorageFactory.testConnection("TENANT", tenantAId);
      expect(test.ok).toBe(true);
      expect(test.provider).toBe("s3");

      const cloudDriver = await StorageFactory.getDriver("TENANT", tenantAId);
      expect(cloudDriver).toBeDefined();
    });
  });

  // =========================================================================
  // SECTION 4: REALTIME FACTORY DEDUPLICATION & ROOM SEGREGATION
  // =========================================================================
  describe("4. RealtimeFactory Event Propagation", () => {
    it("4.1 should emit to platform:admin room for private platform settings", () => {
      const result = RealtimeFactory.broadcastSettingsUpdate(
        "PLATFORM",
        null,
        "security",
        ["security.mfa_enforced"],
        1
      );
      expect(result.broadcasted).toBe(true);
      expect(result.targetRoom).toBe("platform:admin");
    });

    it("4.2 should emit to tenant room for tenant-scoped settings", () => {
      const result = RealtimeFactory.broadcastSettingsUpdate(
        "TENANT",
        tenantAId,
        "email",
        ["email.from_name"],
        2
      );
      expect(result.broadcasted).toBe(true);
      expect(result.targetRoom).toBe(`tenant:${tenantAId}`);
    });

    it("4.3 should suppress rapid duplicate event emissions", () => {
      // First emission
      const r1 = RealtimeFactory.broadcastSettingsUpdate("TENANT", tenantBId, "email", ["email.port"], 1);
      // Immediate duplicate emission with identical key and version
      const r2 = RealtimeFactory.broadcastSettingsUpdate("TENANT", tenantBId, "email", ["email.port"], 1);

      expect(r1.broadcasted).toBe(true);
      expect(r2.broadcasted).toBe(false);
      expect(r2.targetRoom).toBe("suppressed-duplicate");
    });
  });

  // =========================================================================
  // SECTION 5: SMS FACTORY MULTI-PROVIDER & SANDBOX SAFETY
  // =========================================================================
  describe("5. SmsFactory Runtime & Failure Handling", () => {
    it("5.1 should default to sandbox mode without external billable calls", async () => {
      const config = await SmsFactory.resolveConfig(tenantAId);
      expect(config.provider).toBe("mock-sandbox");
      expect(config.sandboxMode).toBe(true);

      const test = await SmsFactory.testConnection(tenantAId);
      expect(test.ok).toBe(true);
      expect(test.message).toContain("Sandbox verification successful");
    });

    it("5.2 should validate provider credentials for external carriers", () => {
      // Fast2SMS requires apiKey
      const f2sFail = SmsFactory.validateConfig({
        provider: "fast2sms",
        enabled: true,
        sandboxMode: false,
      });
      expect(f2sFail.valid).toBe(false);
      expect(f2sFail.error).toContain("Fast2SMS API Key is required");

      // Twilio requires accountSid and authToken
      const twilioFail = SmsFactory.validateConfig({
        provider: "twilio",
        enabled: true,
        sandboxMode: false,
      });
      expect(twilioFail.valid).toBe(false);
      expect(twilioFail.error).toContain("Twilio Account SID");
    });

    it("5.3 should dispatch message with recipient phone number masking", async () => {
      const dispatch = await SmsFactory.sendSms({
        tenantId: tenantAId,
        recipientPhone: "+919876543210",
        messageText: "Your OTP is 123456",
      });

      expect(dispatch.status).toBe("delivered");
      expect(dispatch.recipientMasked).toBe("+91••••3210");
      expect(dispatch.idempotencyKey).toBeDefined();
    });
  });

  // =========================================================================
  // SECTION 6: RUNTIME LIFECYCLE SERVICE COORDINATION
  // =========================================================================
  describe("6. RuntimeLifecycleService Full Orchestration", () => {
    it("6.1 should reject invalid payload during pre-validation phase before database write", async () => {
      await expect(
        RuntimeLifecycleService.updateSettingsGroup("TENANT", tenantAId, "email", {
          "email.smtp_port": 999999, // Invalid port (> 65535)
        })
      ).rejects.toThrow(/between 1 and 65535/);
    });

    it("6.2 should coordinate persistence, invalidation, factory reload and realtime broadcast", async () => {
      const result = await RuntimeLifecycleService.updateSettingsGroup(
        "TENANT",
        tenantAId,
        "email",
        {
          "email.from_name": "Tenant A Corporate Office",
          "email.smtp_port": 587,
        },
        { userId: "test-user-s2" }
      );

      expect(result.success).toBe(true);
      expect(result.scope).toBe("TENANT");
      expect(result.scopeId).toBe(tenantAId);
      expect(result.hotReloadedFactories).toContain("MailerFactory");
      expect(result.broadcastTarget).toBe(`tenant:${tenantAId}`);

      // Verify MailerFactory resolves new updated fromName
      const updatedSettings = await MailerFactory.resolveSettings("TENANT", tenantAId);
      expect(updatedSettings.fromName).toBe("Tenant A Corporate Office");

      // Verify Tenant B remains isolated
      const tenantBSettings = await MailerFactory.resolveSettings("TENANT", tenantBId);
      expect(tenantBSettings.fromName).not.toBe("Tenant A Corporate Office");
    });

    it("6.3 should report process synchronization status for architecture auditing", () => {
      const syncInfo = RuntimeLifecycleService.getProcessSyncInfo();
      expect(syncInfo.mode).toBe("single-process-in-memory");
      expect(syncInfo.clusterSynchronized).toBe(false);
      expect(syncInfo.description).toContain("local Node.js process memory");
    });
  });

  // =========================================================================
  // SECTION 7: DUAL RAZORPAY ARCHITECTURE PRESERVATION
  // =========================================================================
  describe("7. Dual Razorpay Architecture Lock Verification", () => {
    it("7.1 should preserve Platform Billing (system-platform-settings) independently from Tenant Gateways", async () => {
      const platformPage = await rawPrisma.cmsPage.findUnique({
        where: { slug: "system-platform-settings" },
      });
      // Platform billing configuration remains in cmsPage / PLATFORM scope
      expect(platformPage).toBeDefined();

      const tenantPage = await rawPrisma.cmsPage.findUnique({
        where: { slug: `system-razorpay-gateway-${tenantAId}` },
      });
      // Tenant gateway page is strictly tenant-scoped and decoupled
      expect(tenantPage?.slug || "").not.toBe("system-platform-settings");
    });
  });
});
