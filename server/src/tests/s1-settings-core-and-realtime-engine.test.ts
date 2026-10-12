import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "crypto";
import { rawPrisma } from "../prisma";
import {
  SettingsService,
  encryptSecret,
  decryptSecret,
  getDerivedEncryptionKey,
  CACHE_TTL_MS,
} from "../services/settings/settings.service";
import {
  SETTINGS_REGISTRY,
  getSettingDefinition,
  validateSettingValue,
} from "../services/settings/settings-registry";
import { getDynamicEmailConfig } from "../lib/email";

describe("S-Track Step S1: Settings Core, Dynamic Registry, AES-256-GCM & Real-time Engine", { timeout: 20000 }, () => {
  const timestamp = Date.now();
  const tenantAId = `s1-tenant-a-${timestamp}`;
  const tenantBId = `s1-tenant-b-${timestamp}`;

  beforeAll(async () => {
    // 1. Create isolated test tenants
    await rawPrisma.tenant.create({
      data: {
        id: tenantAId,
        name: `S1 Tenant A ${timestamp}`,
        slug: `s1-a-${timestamp}`,
      },
    });

    await rawPrisma.tenant.create({
      data: {
        id: tenantBId,
        name: `S1 Tenant B ${timestamp}`,
        slug: `s1-b-${timestamp}`,
      },
    });

    // Clear cache before starting
    SettingsService.clearCache();
  });

  afterAll(async () => {
    // Clean up test settings and tenants
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
      await rawPrisma.tenant.deleteMany({
        where: { id: { in: [tenantAId, tenantBId] } },
      });
    } catch {}
    SettingsService.clearCache();
  });

  // =========================================================================
  // SECTION 1: DYNAMIC SETTINGS REGISTRY SCHEMA VALIDATION & SCOPE CONSTRAINTS
  // =========================================================================
  describe("1. Dynamic Settings Registry & Scope Validation", () => {
    it("1.1 should have all newly registered schemas in SETTINGS_REGISTRY", () => {
      // Email
      expect(getSettingDefinition("email.provider_type")).toBeDefined();
      expect(getSettingDefinition("email.smtp_host")).toBeDefined();
      expect(getSettingDefinition("email.smtp_port")).toBeDefined();
      expect(getSettingDefinition("email.smtp_password")?.isSecret).toBe(true);

      // OAuth
      expect(getSettingDefinition("oauth.google_enabled")).toBeDefined();
      expect(getSettingDefinition("oauth.google_client_id")).toBeDefined();
      expect(getSettingDefinition("oauth.google_client_secret")?.isSecret).toBe(true);
      expect(getSettingDefinition("oauth.github_enabled")?.scopes).toEqual(["PLATFORM"]);

      // Storage
      expect(getSettingDefinition("storage.provider")).toBeDefined();
      expect(getSettingDefinition("storage.encryption_enabled")).toBeDefined();
      expect(getSettingDefinition("storage.max_file_size_mb")).toBeDefined();
      expect(getSettingDefinition("storage.s3_secret_key")?.isSecret).toBe(true);

      // Security
      expect(getSettingDefinition("security.mfa_enforced")).toBeDefined();
      expect(getSettingDefinition("security.session_timeout_minutes")).toBeDefined();
      expect(getSettingDefinition("security.password_min_length")).toBeDefined();
      expect(getSettingDefinition("security.rate_limit_rpm")?.scopes).toEqual(["PLATFORM"]);
    });

    it("1.2 should validate port boundaries (1-65535)", () => {
      expect(validateSettingValue("email.smtp_port", 587).valid).toBe(true);
      expect(validateSettingValue("email.smtp_port", 0).valid).toBe(false);
      expect(validateSettingValue("email.smtp_port", 70000).valid).toBe(false);
      expect(validateSettingValue("email.smtp_port", "not-a-number").valid).toBe(false);
    });

    it("1.3 should validate storage provider types", () => {
      expect(validateSettingValue("storage.provider", "local").valid).toBe(true);
      expect(validateSettingValue("storage.provider", "s3").valid).toBe(true);
      expect(validateSettingValue("storage.provider", "ftp").valid).toBe(false);
    });

    it("1.4 should validate password length constraints", () => {
      expect(validateSettingValue("security.password_min_length", 8).valid).toBe(true);
      expect(validateSettingValue("security.password_min_length", 4).valid).toBe(false);
      expect(validateSettingValue("security.password_min_length", 200).valid).toBe(false);
    });

    it("1.5 should reject tenant attempts to configure platform-only settings", () => {
      // oauth.github_enabled is PLATFORM only
      const res = validateSettingValue("oauth.github_enabled", true, "TENANT");
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/cannot be configured in 'TENANT' scope/i);

      // security.rate_limit_rpm is PLATFORM only
      const res2 = validateSettingValue("security.rate_limit_rpm", 50, "TENANT");
      expect(res2.valid).toBe(false);
    });
  });

  // =========================================================================
  // SECTION 2: PLATFORM VS TENANT ISOLATION & INHERITANCE
  // =========================================================================
  describe("2. Scope Isolation & Multi-Tenant Inheritance", () => {
    it("2.1 Tenant B should inherit platform setting when no tenant override exists", async () => {
      // 1. Tenant B has no override for email.smtp_host
      const tenantBVal = await SettingsService.get("TENANT", tenantBId, "email.smtp_port");
      // Should equal registry default (587)
      expect(tenantBVal).toBe(587);
    });

    it("2.2 Tenant A can override setting without affecting Tenant B or Platform", async () => {
      // Set override for Tenant A
      await SettingsService.setGroup("TENANT", tenantAId, "email", {
        "email.smtp_port": 2525,
        "email.smtp_host": "smtp.tenanta.com",
        "email.smtp_user": "user@tenanta.com",
      });

      // Tenant A reads overridden value
      const tenantAVal = await SettingsService.get("TENANT", tenantAId, "email.smtp_port");
      expect(tenantAVal).toBe(2525);

      // Tenant B still reads platform/default (587)
      const tenantBVal = await SettingsService.get("TENANT", tenantBId, "email.smtp_port");
      expect(tenantBVal).toBe(587);

      // Platform still reads default
      const platformVal = await SettingsService.get("PLATFORM", null, "email.smtp_port");
      expect(platformVal).toBe(587);
    });

    it("2.3 Setting null in Tenant scope should remove override and revert to fallback", async () => {
      // Reset Tenant A port override by setting null
      await SettingsService.setGroup("TENANT", tenantAId, "email", {
        "email.smtp_port": null,
      });

      const tenantAVal = await SettingsService.get("TENANT", tenantAId, "email.smtp_port");
      expect(tenantAVal).toBe(587);
    });
  });

  // =========================================================================
  // SECTION 3: IN-MEMORY TTL CACHE & DATABASE FALLBACK
  // =========================================================================
  describe("3. In-Memory TTL Cache Engine & Fallback", () => {
    it("3.1 should populate cache and return cached value on subsequent get", async () => {
      SettingsService.clearCache();
      expect(SettingsService.getCacheStats().size).toBe(0);

      // First read: cache miss, loads from DB/registry
      const val1 = await SettingsService.get("TENANT", tenantAId, "email.from_name");
      expect(val1).toBe("Master HRMS System");
      expect(SettingsService.getCacheStats().size).toBeGreaterThan(0);

      // Second read: cache hit
      const val2 = await SettingsService.get("TENANT", tenantAId, "email.from_name");
      expect(val2).toBe(val1);
    });

    it("3.2 should invalidate cache entries after setGroup", async () => {
      await SettingsService.setGroup("TENANT", tenantAId, "email", {
        "email.from_name": "Tenant A Custom HR",
      });

      // Newly fetched value must reflect updated data immediately
      const updatedVal = await SettingsService.get("TENANT", tenantAId, "email.from_name");
      expect(updatedVal).toBe("Tenant A Custom HR");
    });

    it("3.3 invalidateCache should selectively purge keys", () => {
      SettingsService.invalidateCache("TENANT", tenantAId, "email.from_name");
      // Cache size should reflect deletion
      const stats = SettingsService.getCacheStats();
      expect(stats.ttlMs).toBe(CACHE_TTL_MS);
    });

    it("3.4 clearCache should empty the entire store", () => {
      SettingsService.clearCache();
      expect(SettingsService.getCacheStats().size).toBe(0);
    });
  });

  // =========================================================================
  // SECTION 4: AES-256-GCM CREDENTIAL PROTECTION & SECRET MASKING
  // =========================================================================
  describe("4. AES-256-GCM Credential Protection & Secret Masking", () => {
    const rawSecret = "super-secret-api-key-xyz-12345!@#$%^&*()";

    it("4.1 should successfully encrypt and decrypt with valid key", () => {
      const encrypted = encryptSecret(rawSecret);
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toHaveLength(24); // 12 bytes = 24 hex chars
      expect(encrypted.authTag).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(encrypted.keyVersion).toBe(1);

      const decrypted = decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
      expect(decrypted).toBe(rawSecret);
    });

    it("4.2 should fail decryption when ciphertext is tampered (auth tag mismatch)", () => {
      const encrypted = encryptSecret(rawSecret);
      // Tamper ciphertext by flipping a character
      const tamperedCiphertext =
        encrypted.ciphertext.slice(0, -2) + (encrypted.ciphertext.endsWith("a") ? "b" : "a");

      expect(() => {
        decryptSecret(tamperedCiphertext, encrypted.iv, encrypted.authTag);
      }).toThrow();
    });

    it("4.3 should fail decryption when auth tag is tampered", () => {
      const encrypted = encryptSecret(rawSecret);
      const tamperedTag =
        encrypted.authTag.slice(0, -2) + (encrypted.authTag.endsWith("0") ? "1" : "0");

      expect(() => {
        decryptSecret(encrypted.ciphertext, encrypted.iv, tamperedTag);
      }).toThrow();
    });

    it("4.4 should fail decryption when wrong key is provided", () => {
      const encrypted = encryptSecret(rawSecret);
      const wrongKey = crypto.randomBytes(32);

      expect(() => {
        decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.authTag, wrongKey);
      }).toThrow();
    });

    it("4.5 should mask secrets in getGroup for UI clients", async () => {
      // Store secret SMTP password for Tenant A
      await SettingsService.setGroup("TENANT", tenantAId, "email", {
        "email.smtp_password": "super-confidential-password",
      });

      // Regular getGroup for UI
      const groupData = await SettingsService.getGroup("TENANT", tenantAId, "email");
      const secretField = groupData.values["email.smtp_password"];

      // Plaintext must NEVER be returned in standard values
      expect(secretField).toEqual({ isSecret: true, set: true });
      expect(JSON.stringify(groupData)).not.toContain("super-confidential-password");
    });

    it("4.6 should return decrypted secret only when explicitly requested by backend consumer", async () => {
      const decrypted = await SettingsService.get(
        "TENANT",
        tenantAId,
        "email.smtp_password",
        { decryptSecrets: true }
      );
      expect(decrypted).toBe("super-confidential-password");
    });

    it("4.7 should mask secrets in SettingAudit table", async () => {
      const audit = await rawPrisma.settingAudit.findFirst({
        where: {
          scopeId: tenantAId,
          key: "email.smtp_password",
        },
        orderBy: { createdAt: "desc" },
      });

      expect(audit).toBeDefined();
      expect(audit?.newValueMasked).toBe("[MASKED SECRET]");
      expect(audit?.oldValueMasked).toBe("[MASKED SECRET]");
    });
  });

  // =========================================================================
  // SECTION 5: RUNTIME CONSUMERS (EMAIL & OAUTH CONFIGURATION RESOLVERS)
  // =========================================================================
  describe("5. Runtime Consumers Integration", () => {
    it("5.1 getDynamicEmailConfig should resolve database-driven settings from SettingsService", async () => {
      // Configure custom SMTP for Tenant A
      await SettingsService.setGroup("TENANT", tenantAId, "email", {
        "email.smtp_host": "smtp.tenant-mail-service.com",
        "email.smtp_port": 587,
        "email.smtp_user": "tenant-api-user",
        "email.smtp_password": "tenant-vault-key-999",
        "email.smtp_encryption": "tls",
        "email.from_name": "Tenant A Payroll Dept",
        "email.from_email": "payroll@tenanta.com",
      });

      const config = await getDynamicEmailConfig({
        scope: "TENANT",
        tenantId: tenantAId,
      });

      expect(config.smtpHost).toBe("smtp.tenant-mail-service.com");
      expect(config.smtpPort).toBe(587);
      expect(config.smtpUser).toBe("tenant-api-user");
      expect(config.smtpPass).toBe("tenant-vault-key-999");
      expect(config.smtpFromName).toBe("Tenant A Payroll Dept");
      expect(config.smtpFromEmail).toBe("payroll@tenanta.com");
    });
  });
});
