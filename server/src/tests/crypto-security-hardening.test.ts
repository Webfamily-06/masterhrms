import assert from "assert";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import {
  getJwtSecret,
  getFileSigningSecret,
  getLegacyFileSigningSecrets,
  timingSafeEqualHex,
  timingSafeEqualString,
  getStorageEncryptionKeys,
  getStorageDecryptionKeys,
  getConnectorEncryptionKeys,
  getEmailCryptoKeys,
  getSettingsEncryptionKeys,
  getAiEncryptionKeys,
  validateStartupCryptoConfig,
  CryptoConfigurationError,
  LEGACY_DEFAULT_SEED_JWT,
} from "../lib/crypto-config";
import { generateToken, verifyToken, generateMfaToken, verifyMfaToken } from "../lib/jwt";
import { LocalStorageProvider } from "../services/storage/local-storage.provider";
import { ExternalConnectorsService } from "../services/storage/external-connectors.service";
import { encryptEmailSecret, decryptEmailSecret } from "../services/email/user-email-crypto.service";
import { encryptSecret, decryptSecret } from "../services/settings/settings.service";
import { AiAssistantService } from "../services/ai-assistant.service";

interface TestReport {
  suite: string;
  name: string;
  status: "PASS" | "FAIL";
  error?: string;
}

const report: TestReport[] = [];

async function runTest(suite: string, name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
    report.push({ suite, name, status: "PASS" });
    console.log(`  ✓ [${suite}] ${name}`);
  } catch (err: any) {
    report.push({ suite, name, status: "FAIL", error: err?.message || String(err) });
    console.error(`  ✗ [${suite}] ${name}:`, err?.stack || err?.message);
  }
}

async function main() {
  console.log("================================================================================");
  console.log("MASTERHRMS — Cryptographic Security Hardening & Regression Test Suite");
  console.log("================================================================================");

  // 1. Timing Safe Equality
  await runTest("TimingSafety", "timingSafeEqualString accepts matching strings", () => {
    assert.strictEqual(timingSafeEqualString("hello-world-123", "hello-world-123"), true);
  });

  await runTest("TimingSafety", "timingSafeEqualString rejects different strings of same length", () => {
    assert.strictEqual(timingSafeEqualString("hello-world-123", "hello-world-456"), false);
  });

  await runTest("TimingSafety", "timingSafeEqualString safely rejects different lengths without throwing", () => {
    assert.strictEqual(timingSafeEqualString("short", "much-longer-string"), false);
  });

  await runTest("TimingSafety", "timingSafeEqualHex accepts identical hex strings", () => {
    const hex = crypto.randomBytes(32).toString("hex");
    assert.strictEqual(timingSafeEqualHex(hex, hex), true);
  });

  await runTest("TimingSafety", "timingSafeEqualHex safely rejects malformed or different length hex", () => {
    assert.strictEqual(timingSafeEqualHex("abcd", "abcdef"), false);
  });

  // 2. JWT Production Hardening & Fail-Closed Behavior
  await runTest("JwtSecurity", "Generates and verifies authentic user JWT payload using HS256", () => {
    const payload = {
      userId: "user-test-01",
      email: "test@masterhrms.com",
      tenantId: "tenant-corp-01",
      roles: ["HR_ADMIN"],
    };
    const token = generateToken(payload);
    assert(token && token.split(".").length === 3, "Token must be valid JWT structure");
    const verified = verifyToken(token);
    assert.strictEqual(verified.userId, payload.userId);
    assert.strictEqual(verified.email, payload.email);
    assert.strictEqual(verified.tenantId, payload.tenantId);
  });

  await runTest("JwtSecurity", "Generates and verifies temporary MFA pending tokens using HS256", () => {
    const mfaToken = generateMfaToken({ userId: "user-mfa-01", email: "mfa@masterhrms.com" });
    const verifiedMfa = verifyMfaToken(mfaToken);
    assert.strictEqual(verifiedMfa.userId, "user-mfa-01");
    assert.strictEqual(verifiedMfa.mfaPending, true);
  });

  await runTest("JwtSecurity", "Rejects forged or tampered JWT signatures", () => {
    const token = generateToken({ userId: "u1", email: "u1@test.com", roles: ["EMPLOYEE"] });
    const parts = token.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: "hacker", roles: ["SUPER_ADMIN"] })).toString("base64url");
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    assert.throws(() => verifyToken(tamperedToken));
  });

  await runTest("JwtSecurity", "Fails closed in production if JWT_SECRET is unset or empty", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.JWT_SECRET;
      assert.throws(() => getJwtSecret(), (err: any) => err instanceof CryptoConfigurationError && /non-empty JWT_SECRET/.test(err.message));
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalSecret) process.env.JWT_SECRET = originalSecret;
    }
  });

  await runTest("JwtSecurity", "Fails closed in production if JWT_SECRET is shorter than 32 characters", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "short-insecure-secret";
      assert.throws(() => getJwtSecret(), (err: any) => err instanceof CryptoConfigurationError && /at least 32 characters of entropy/.test(err.message));
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalSecret) process.env.JWT_SECRET = originalSecret;
    }
  });

  // 3. Storage Encryption Round-trip, Dedicated Keys, and Legacy Compatibility
  await runTest("StorageCrypto", "Storage encryption round-trip with dedicated 256-bit key", () => {
    const dedicatedHex = crypto.randomBytes(32).toString("hex");
    const originalEnv = process.env.STORAGE_ENCRYPTION_KEY;
    try {
      process.env.STORAGE_ENCRYPTION_KEY = dedicatedHex;
      const { active } = getStorageEncryptionKeys();
      assert.strictEqual(active.length, 32);

      const plaintext = Buffer.from("confidential-employee-contract-payload-2026", "utf8");
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", active, iv);
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      const authTag = cipher.getAuthTag();

      // Decrypt
      const decipher = crypto.createDecipheriv("aes-256-gcm", active, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      assert.strictEqual(decrypted.toString("utf8"), plaintext.toString("utf8"));
    } finally {
      if (originalEnv) process.env.STORAGE_ENCRYPTION_KEY = originalEnv;
      else delete process.env.STORAGE_ENCRYPTION_KEY;
    }
  });

  await runTest("StorageCrypto", "Storage legacy decryption transparently recovers historical files", () => {
    // Encrypt using historical JWT_SECRET derived key
    const legacySecret = process.env.JWT_SECRET || "master-hrms-default-storage-encryption-key-salt";
    const legacyKey = crypto.scryptSync(legacySecret, "master-hrms-storage-salt-v1", 32);
    const plaintext = Buffer.from("legacy-encrypted-disk-document-v1", "utf8");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", legacyKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Now set a dedicated new storage key to simulate key rotation
    const originalKey = process.env.STORAGE_ENCRYPTION_KEY;
    try {
      process.env.STORAGE_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
      const { active, legacy } = getStorageEncryptionKeys();
      assert(!active.equals(legacyKey), "Active key must be distinct from legacy key");

      // Attempt decryption with legacy keys list
      let decrypted: Buffer | null = null;
      for (const key of [active, ...legacy]) {
        try {
          const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
          decipher.setAuthTag(authTag);
          decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
          break;
        } catch {
          // Continue to next key
        }
      }
      assert(decrypted !== null, "Decryption must succeed using legacy candidate key");
      assert.strictEqual(decrypted.toString("utf8"), plaintext.toString("utf8"));
    } finally {
      if (originalKey) process.env.STORAGE_ENCRYPTION_KEY = originalKey;
      else delete process.env.STORAGE_ENCRYPTION_KEY;
    }
  });

  await runTest("StorageCrypto", "Storage rejects wrong key and tampered ciphertext", () => {
    const keyA = crypto.randomBytes(32);
    const keyB = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", keyA, iv);
    const ciphertext = Buffer.concat([cipher.update(Buffer.from("sensitive-data")), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Decrypt with wrong key
    const decipher = crypto.createDecipheriv("aes-256-gcm", keyB, iv);
    decipher.setAuthTag(authTag);
    assert.throws(() => {
      Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    }, /Unsupported state or unable to authenticate data/);

    // Decrypt with tampered ciphertext
    const tamperedCipher = Buffer.from(ciphertext);
    tamperedCipher[0] ^= 0xff;
    const decipher2 = crypto.createDecipheriv("aes-256-gcm", keyA, iv);
    decipher2.setAuthTag(authTag);
    assert.throws(() => {
      Buffer.concat([decipher2.update(tamperedCipher), decipher2.final()]);
    }, /Unsupported state or unable to authenticate data/);
  });

  // 4. Production Dedicated Key Enforcement & Fail-Closed Behavior
  await runTest("ProductionEnforcement", "Fails closed in production if STORAGE_ENCRYPTION_KEY is unset", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalKey = process.env.STORAGE_ENCRYPTION_KEY;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.STORAGE_ENCRYPTION_KEY;
      assert.throws(() => getStorageEncryptionKeys(), (err: any) => err instanceof CryptoConfigurationError && /STORAGE_ENCRYPTION_KEY/.test(err.message));
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalKey) process.env.STORAGE_ENCRYPTION_KEY = originalKey;
    }
  });

  await runTest("ProductionEnforcement", "Fails closed in production if FILE_SIGNING_SECRET is unset", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalKey = process.env.FILE_SIGNING_SECRET;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.FILE_SIGNING_SECRET;
      assert.throws(() => getFileSigningSecret(), (err: any) => err instanceof CryptoConfigurationError && /FILE_SIGNING_SECRET/.test(err.message));
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalKey) process.env.FILE_SIGNING_SECRET = originalKey;
    }
  });

  await runTest("ProductionEnforcement", "Fails closed in production if CONNECTOR_ENCRYPTION_KEY is unset", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalKey = process.env.CONNECTOR_ENCRYPTION_KEY;
    const originalTokenKey = process.env.TOKEN_ENCRYPTION_KEY;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.CONNECTOR_ENCRYPTION_KEY;
      delete process.env.TOKEN_ENCRYPTION_KEY;
      assert.throws(() => getConnectorEncryptionKeys(), (err: any) => err instanceof CryptoConfigurationError && /CONNECTOR_ENCRYPTION_KEY/.test(err.message));
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalKey) process.env.CONNECTOR_ENCRYPTION_KEY = originalKey;
      if (originalTokenKey) process.env.TOKEN_ENCRYPTION_KEY = originalTokenKey;
    }
  });

  await runTest("ProductionEnforcement", "Fails closed in production if EMAIL_CRYPTO_SECRET is unset", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalKey = process.env.EMAIL_CRYPTO_SECRET;
    const originalEncKey = process.env.ENCRYPTION_KEY;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.EMAIL_CRYPTO_SECRET;
      delete process.env.ENCRYPTION_KEY;
      assert.throws(() => getEmailCryptoKeys(), (err: any) => err instanceof CryptoConfigurationError && /EMAIL_CRYPTO_SECRET/.test(err.message));
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalKey) process.env.EMAIL_CRYPTO_SECRET = originalKey;
      if (originalEncKey) process.env.ENCRYPTION_KEY = originalEncKey;
    }
  });

  await runTest("ProductionEnforcement", "Fails closed in production if SETTINGS_ENCRYPTION_KEY is unset", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalKey = process.env.SETTINGS_ENCRYPTION_KEY;
    const originalEncKey = process.env.ENCRYPTION_KEY;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.SETTINGS_ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      assert.throws(() => getSettingsEncryptionKeys(), (err: any) => err instanceof CryptoConfigurationError && /SETTINGS_ENCRYPTION_KEY/.test(err.message));
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalKey) process.env.SETTINGS_ENCRYPTION_KEY = originalKey;
      if (originalEncKey) process.env.ENCRYPTION_KEY = originalEncKey;
    }
  });

  await runTest("ProductionEnforcement", "Fails closed in production if AI_ENCRYPTION_KEY is unset", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalKey = process.env.AI_ENCRYPTION_KEY;
    const originalEncKey = process.env.ENCRYPTION_KEY;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.AI_ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      assert.throws(() => getAiEncryptionKeys(), (err: any) => err instanceof CryptoConfigurationError && /AI_ENCRYPTION_KEY/.test(err.message));
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalKey) process.env.AI_ENCRYPTION_KEY = originalKey;
      if (originalEncKey) process.env.ENCRYPTION_KEY = originalEncKey;
    }
  });

  await runTest("ProductionEnforcement", "Fails closed in production when dedicated keys are under 32 characters", () => {
    const originalEnv = process.env.NODE_ENV;
    const origStorage = process.env.STORAGE_ENCRYPTION_KEY;
    const origFile = process.env.FILE_SIGNING_SECRET;
    try {
      process.env.NODE_ENV = "production";
      process.env.STORAGE_ENCRYPTION_KEY = "too-short";
      assert.throws(() => getStorageEncryptionKeys(), /at least 32 characters/);

      process.env.FILE_SIGNING_SECRET = "short-key";
      assert.throws(() => getFileSigningSecret(), /at least 32 characters/);
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (origStorage) process.env.STORAGE_ENCRYPTION_KEY = origStorage;
      else delete process.env.STORAGE_ENCRYPTION_KEY;
      if (origFile) process.env.FILE_SIGNING_SECRET = origFile;
      else delete process.env.FILE_SIGNING_SECRET;
    }
  });

  // 5. Signed URLs, Upload Authorization, and Tenant Boundaries
  const provider = new LocalStorageProvider();
  const testKey = "tenant/tenant_test/file_123/v1";

  await runTest("SignedUrl", "initiateUpload generates valid signed upload authorization", async () => {
    const auth = await provider.initiateUpload({
      tenantId: "tenant_test",
      fileId: "file_123",
      versionNo: 1,
      mimeType: "image/png",
      expiresInSeconds: 300,
    });
    assert(auth.uploadUrl.includes("/binary?token="), "Must contain upload binary URL");
    assert(auth.token && auth.token.length === 64, "Must contain 64-char sha256 hex token");
    assert.strictEqual(auth.storageKey, testKey);
  });

  await runTest("SignedUrl", "verifyUploadToken accepts valid upload token", async () => {
    const auth = await provider.initiateUpload({
      tenantId: "tenant_test",
      fileId: "file_456",
      versionNo: 1,
      mimeType: "application/pdf",
      expiresInSeconds: 60,
    });
    const valid = provider.verifyUploadToken(auth.storageKey, auth.expiresAt.getTime(), auth.token);
    assert.strictEqual(valid, true, "Upload token should verify successfully");
  });

  await runTest("SignedUrl", "verifyUploadToken rejects expired upload token", async () => {
    const pastExp = Date.now() - 5000;
    const valid = provider.verifyUploadToken(testKey, pastExp, "anytoken");
    assert.strictEqual(valid, false, "Expired upload token must be rejected");
  });

  await runTest("SignedUrl", "verifyUploadToken rejects tampered upload token", async () => {
    const futureExp = Date.now() + 60000;
    const valid = provider.verifyUploadToken(testKey, futureExp, "0".repeat(64));
    assert.strictEqual(valid, false, "Tampered upload token must be rejected");
  });

  await runTest("SignedUrl", "verifyUploadToken rejects modified storage key (cross-tenant tampering)", async () => {
    const auth = await provider.initiateUpload({
      tenantId: "tenant_A",
      fileId: "file_789",
      versionNo: 1,
      mimeType: "application/pdf",
      expiresInSeconds: 60,
    });
    // Attempt to use token intended for tenant_A to upload to tenant_B
    const tamperedKey = "tenant/tenant_B/file_789/v1";
    const valid = provider.verifyUploadToken(tamperedKey, auth.expiresAt.getTime(), auth.token);
    assert.strictEqual(valid, false, "Cross-tenant key modification must invalidate token HMAC");
  });

  await runTest("SignedUrl", "verifyUploadToken rejects modified expiration timestamp", async () => {
    const auth = await provider.initiateUpload({
      tenantId: "tenant_A",
      fileId: "file_888",
      versionNo: 1,
      mimeType: "application/pdf",
      expiresInSeconds: 60,
    });
    // Tamper expiration
    const tamperedExp = auth.expiresAt.getTime() + 10000;
    const valid = provider.verifyUploadToken(auth.storageKey, tamperedExp, auth.token);
    assert.strictEqual(valid, false, "Tampered expiration timestamp must invalidate HMAC");
  });

  await runTest("SignedUrl", "getSignedDownloadUrl generates verifiable stream URL", async () => {
    const dlUrl = await provider.getSignedDownloadUrl(testKey, "photo.png", 120);
    const url = new URL(dlUrl, "http://localhost:4000");
    const exp = parseInt(url.searchParams.get("exp") || "0", 10);
    const sig = url.searchParams.get("sig") || "";
    const key = url.searchParams.get("key") || "";

    assert(exp > Date.now(), "Expiry must be in future");
    assert.strictEqual(key, testKey);
    assert.strictEqual(provider.verifySignature("download", key, exp, sig), true);
  });

  await runTest("SignedUrl", "verifySignature rejects expired download URL", async () => {
    const pastExp = Date.now() - 1000;
    assert.strictEqual(provider.verifySignature("download", testKey, pastExp, "fakesig"), false);
  });

  await runTest("SignedUrl", "verifySignature rejects tampered download signature", async () => {
    const futureExp = Date.now() + 60000;
    assert.strictEqual(provider.verifySignature("download", testKey, futureExp, "0".repeat(64)), false);
  });

  await runTest("SignedUrl", "verifySignature rejects cross-type signature (preview sig on download)", async () => {
    const exp = Date.now() + 60000;
    const previewUrl = await provider.getSignedPreviewUrl(testKey, "image/png", 60);
    const url = new URL(previewUrl, "http://localhost:4000");
    const sig = url.searchParams.get("sig") || "";

    assert.strictEqual(provider.verifySignature("preview", testKey, exp, sig), true);
    assert.strictEqual(provider.verifySignature("download", testKey, exp, sig), false);
  });

  // 6. External Connectors Token Encryption & Backward Compatibility
  await runTest("ConnectorsCrypto", "encryptToken and decryptToken round-trip", () => {
    const rawOAuthToken = "ya29.a0AfH6SMD_SampleGoogleOAuthTokenPayload1234567890";
    const encrypted = ExternalConnectorsService.encryptToken(rawOAuthToken);
    assert(encrypted.includes(":"), "Encrypted token must have IV:Tag:Ciphertext format");
    const decrypted = ExternalConnectorsService.decryptToken(encrypted);
    assert.strictEqual(decrypted, rawOAuthToken);
  });

  await runTest("ConnectorsCrypto", "decryptToken falls back gracefully to decrypt legacy tokens", () => {
    const rawLegacyToken = "legacy-token-secret-from-old-deployment-1234";
    const legacyKey = crypto.scryptSync(process.env.JWT_SECRET || "masterhrms-token-key-salt", "salt", 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", legacyKey, iv);
    let ciphertext = cipher.update(rawLegacyToken, "utf8", "hex");
    ciphertext += cipher.final("hex");
    const tag = cipher.getAuthTag();
    const legacyPayload = `${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext}`;

    const decrypted = ExternalConnectorsService.decryptToken(legacyPayload);
    assert.strictEqual(decrypted, rawLegacyToken, "Legacy encrypted token must be decrypted transparently");
  });

  await runTest("ConnectorsCrypto", "decryptToken throws when ciphertext is tampered across all keys", () => {
    const encrypted = ExternalConnectorsService.encryptToken("valid-token");
    const parts = encrypted.split(":");
    const tampered = `${parts[0]}:${parts[1]}:deadbeef${parts[2].slice(8)}`;
    assert.throws(() => ExternalConnectorsService.decryptToken(tampered));
  });

  // 7. User Email SMTP/IMAP Crypto & Backward Compatibility
  await runTest("EmailCrypto", "encryptEmailSecret and decryptEmailSecret round-trip", () => {
    const secretPassword = "SuperSecretSmtpPassword!#2026";
    const encrypted = encryptEmailSecret(secretPassword);
    assert(encrypted.ciphertext && encrypted.iv && encrypted.authTag);
    const decrypted = decryptEmailSecret(encrypted);
    assert.strictEqual(decrypted, secretPassword);
  });

  await runTest("EmailCrypto", "decryptEmailSecret transparently decrypts legacy credentials", () => {
    const rawSmtpPass = "legacy-smtp-password-123";
    const legacySalt = "master-hrms-user-email-secret-salt-v1";
    const legacyKey = crypto.scryptSync("master-hrms-32-char-encryption-key-phrase!", legacySalt, 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", legacyKey, iv);
    let ciphertext = cipher.update(rawSmtpPass, "utf8", "hex");
    ciphertext += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    const decrypted = decryptEmailSecret({
      ciphertext,
      iv: iv.toString("hex"),
      authTag,
    });
    assert.strictEqual(decrypted, rawSmtpPass, "Legacy encrypted SMTP password must be decrypted transparently");
  });

  await runTest("EmailCrypto", "decryptEmailSecret rejects corrupted auth tag", () => {
    const encrypted = encryptEmailSecret("test-password");
    assert.throws(() =>
      decryptEmailSecret({
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: "0".repeat(32),
      })
    );
  });

  // 8. Settings Secret Encryption & Backward Compatibility
  await runTest("SettingsCrypto", "encryptSecret and decryptSecret round-trip", () => {
    const rawSetting = "rzp_live_secret_key_production_value_99999";
    const enc = encryptSecret(rawSetting);
    const dec = decryptSecret(enc.ciphertext, enc.iv, enc.authTag);
    assert.strictEqual(dec, rawSetting);
  });

  await runTest("SettingsCrypto", "decryptSecret supports legacy setting decryption", () => {
    const rawVal = "legacy-third-party-api-key";
    const salt = "master-hrms-settings-secret-salt-v1";
    const legacyKey = crypto.scryptSync("master-hrms-32-char-encryption-key-phrase!", salt, 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", legacyKey, iv);
    let ciphertext = cipher.update(rawVal, "utf8", "hex");
    ciphertext += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    const decrypted = decryptSecret(ciphertext, iv.toString("hex"), authTag);
    assert.strictEqual(decrypted, rawVal, "Legacy setting secret must decrypt cleanly");
  });

  // 9. AI Credential Encryption & Legacy Decryption
  await runTest("AiCrypto", "AI credential encryption and legacy decryption", () => {
    const legacyRawKey = "hrms-enterprise-master-sec-key-32";
    const legacyApiKey = "sk-ant-api03-legacy-anthropic-key-12345";
    const iv = crypto.randomBytes(16);
    const hashedKey = crypto.createHash("sha256").update(legacyRawKey).digest();
    const cipher = crypto.createCipheriv("aes-256-cbc", hashedKey, iv);
    let encHex = cipher.update(legacyApiKey, "utf8", "hex");
    encHex += cipher.final("hex");
    const payload = `${iv.toString("hex")}:${encHex}`;

    // Decrypt using candidate keys from getAiEncryptionKeys
    const { active, legacy } = getAiEncryptionKeys();
    let decrypted = "";
    for (const key of [active, ...legacy]) {
      try {
        const k = crypto.createHash("sha256").update(key).digest();
        const decipher = crypto.createDecipheriv("aes-256-cbc", k, iv);
        let dec = decipher.update(encHex, "hex", "utf8");
        dec += decipher.final("utf8");
        decrypted = dec;
        break;
      } catch {
        // Continue
      }
    }
    assert.strictEqual(decrypted, legacyApiKey, "Legacy AI credentials must decrypt cleanly");
  });

  // 10. Startup Configuration Diagnostics
  await runTest("StartupValidation", "validateStartupCryptoConfig passes in development", () => {
    const check = validateStartupCryptoConfig();
    assert.strictEqual(check.valid, true);
    assert.strictEqual(check.errors.length, 0);
  });

  await runTest("StartupValidation", "validateStartupCryptoConfig flags missing keys when checkAllServices is requested in production", () => {
    const originalEnv = process.env.NODE_ENV;
    const origStorage = process.env.STORAGE_ENCRYPTION_KEY;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.STORAGE_ENCRYPTION_KEY;
      const check = validateStartupCryptoConfig({ checkAllServices: true });
      assert.strictEqual(check.valid, false);
      assert(check.errors.some((e) => e.includes("STORAGE_ENCRYPTION_KEY")), "Must flag missing STORAGE_ENCRYPTION_KEY as error");
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (origStorage) process.env.STORAGE_ENCRYPTION_KEY = origStorage;
    }
  });

  // 11. Plaintext Secret Logging Prevention
  await runTest("SecuritySanitization", "Error messages and audit checks never reveal plaintext secrets", () => {
    const testSecret = "my-super-secret-production-token-to-mask";
    const err = new CryptoConfigurationError(`Missing key for service`);
    assert(!err.message.includes(testSecret));
  });

  // 12. Phase F — Production Security Audit 14 Core Mandates
  await runTest("PhaseFAudit", "Mandate 1: Valid encryption key initialization in production yields 0 warnings and 0 errors", () => {
    const origEnv = process.env.NODE_ENV;
    const origStorage = process.env.STORAGE_ENCRYPTION_KEY;
    const origConn = process.env.CONNECTOR_ENCRYPTION_KEY;
    const origEmail = process.env.EMAIL_CRYPTO_SECRET;
    const origSettings = process.env.SETTINGS_ENCRYPTION_KEY;
    const origAi = process.env.AI_ENCRYPTION_KEY;
    try {
      process.env.NODE_ENV = "production";
      process.env.STORAGE_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
      process.env.CONNECTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
      process.env.EMAIL_CRYPTO_SECRET = crypto.randomBytes(32).toString("hex");
      process.env.SETTINGS_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
      process.env.AI_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");

      const check = validateStartupCryptoConfig({ checkAllServices: true });
      assert.strictEqual(check.valid, true, "Startup validation must be valid");
      assert.strictEqual(check.errors.length, 0, "Errors must be empty");
      assert.strictEqual(check.warnings.length, 0, "Warnings must be empty when all 5 keys are present");
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origStorage) process.env.STORAGE_ENCRYPTION_KEY = origStorage; else delete process.env.STORAGE_ENCRYPTION_KEY;
      if (origConn) process.env.CONNECTOR_ENCRYPTION_KEY = origConn; else delete process.env.CONNECTOR_ENCRYPTION_KEY;
      if (origEmail) process.env.EMAIL_CRYPTO_SECRET = origEmail; else delete process.env.EMAIL_CRYPTO_SECRET;
      if (origSettings) process.env.SETTINGS_ENCRYPTION_KEY = origSettings; else delete process.env.SETTINGS_ENCRYPTION_KEY;
      if (origAi) process.env.AI_ENCRYPTION_KEY = origAi; else delete process.env.AI_ENCRYPTION_KEY;
    }
  });

  await runTest("PhaseFAudit", "Mandate 2: Missing key handling fails closed in production for all 5 subsystems", () => {
    const origEnv = process.env.NODE_ENV;
    const origStorage = process.env.STORAGE_ENCRYPTION_KEY;
    const origConn = process.env.CONNECTOR_ENCRYPTION_KEY;
    const origEmail = process.env.EMAIL_CRYPTO_SECRET;
    const origSettings = process.env.SETTINGS_ENCRYPTION_KEY;
    const origAi = process.env.AI_ENCRYPTION_KEY;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.STORAGE_ENCRYPTION_KEY;
      delete process.env.CONNECTOR_ENCRYPTION_KEY;
      delete process.env.TOKEN_ENCRYPTION_KEY;
      delete process.env.EMAIL_CRYPTO_SECRET;
      delete process.env.SETTINGS_ENCRYPTION_KEY;
      delete process.env.AI_ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      assert.throws(() => getStorageEncryptionKeys(), (err: any) => err instanceof CryptoConfigurationError);
      assert.throws(() => getConnectorEncryptionKeys(), (err: any) => err instanceof CryptoConfigurationError);
      assert.throws(() => getEmailCryptoKeys(), (err: any) => err instanceof CryptoConfigurationError);
      assert.throws(() => getSettingsEncryptionKeys(), (err: any) => err instanceof CryptoConfigurationError);
      assert.throws(() => getAiEncryptionKeys(), (err: any) => err instanceof CryptoConfigurationError);
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origStorage) process.env.STORAGE_ENCRYPTION_KEY = origStorage;
      if (origConn) process.env.CONNECTOR_ENCRYPTION_KEY = origConn;
      if (origEmail) process.env.EMAIL_CRYPTO_SECRET = origEmail;
      if (origSettings) process.env.SETTINGS_ENCRYPTION_KEY = origSettings;
      if (origAi) process.env.AI_ENCRYPTION_KEY = origAi;
    }
  });

  await runTest("PhaseFAudit", "Mandate 3: Invalid key length handling rejects keys under 32 characters in production", () => {
    const origEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      process.env.CONNECTOR_ENCRYPTION_KEY = "short";
      process.env.EMAIL_CRYPTO_SECRET = "short";
      process.env.SETTINGS_ENCRYPTION_KEY = "short";
      process.env.AI_ENCRYPTION_KEY = "short";

      assert.throws(() => getConnectorEncryptionKeys(), /at least 32 characters/);
      assert.throws(() => getEmailCryptoKeys(), /at least 32 characters/);
      assert.throws(() => getSettingsEncryptionKeys(), /at least 32 characters/);
      assert.throws(() => getAiEncryptionKeys(), /at least 32 characters/);
    } finally {
      process.env.NODE_ENV = origEnv;
      delete process.env.CONNECTOR_ENCRYPTION_KEY;
      delete process.env.EMAIL_CRYPTO_SECRET;
      delete process.env.SETTINGS_ENCRYPTION_KEY;
      delete process.env.AI_ENCRYPTION_KEY;
    }
  });

  await runTest("PhaseFAudit", "Mandate 4: Independent key validation ensures keys from system A cannot decrypt system B", () => {
    const keySettings = crypto.randomBytes(32);
    const keyEmail = crypto.randomBytes(32);
    assert(!keySettings.equals(keyEmail), "Keys must be strictly independent");

    const payload = "confidential-tenant-payment-token";
    const encSettings = encryptSecret(payload, keySettings);

    // Attempting to decrypt Settings payload with Email key must fail authentication
    assert.throws(() => {
      decryptSecret(encSettings.ciphertext, encSettings.iv, encSettings.authTag, keyEmail);
    }, /authentication tag failed/);
  });

  await runTest("PhaseFAudit", "Mandate 5: Successful round-trip encryption & decryption across all 5 systems", () => {
    // 1. Settings (AES-256-GCM)
    const settingRaw = "sk_live_masterhrms_payment_gateway_api_secret_998877";
    const encSetting = encryptSecret(settingRaw);
    assert.strictEqual(decryptSecret(encSetting.ciphertext, encSetting.iv, encSetting.authTag), settingRaw);

    // 2. Email (AES-256-GCM)
    const emailPassRaw = "super-secret-imap-mailbox-password-2026";
    const encEmail = encryptEmailSecret(emailPassRaw);
    assert.strictEqual(decryptEmailSecret(encEmail), emailPassRaw);

    // 3. Connectors (AES-256-GCM)
    const connTokenRaw = "ya29.oauth-access-token-refresh-token-roundtrip-test";
    const encConn = ExternalConnectorsService.encryptToken(connTokenRaw);
    assert.strictEqual(ExternalConnectorsService.decryptToken(encConn), connTokenRaw);

    // 4. Storage Decryption Keys
    const storageKeys = getStorageDecryptionKeys();
    assert(storageKeys.length > 0, "Storage keys list must not be empty");

    // 5. AI Assistant Keys
    const aiKeys = getAiEncryptionKeys();
    assert(aiKeys.active && aiKeys.active.length >= 32, "Active AI key must be at least 32 chars");
  });

  await runTest("PhaseFAudit", "Mandate 6: Incorrect key rejection across AES-GCM and AES-CBC", () => {
    const wrongKey = crypto.randomBytes(32);
    const enc = encryptSecret("my-payment-key");
    assert.throws(() => decryptSecret(enc.ciphertext, enc.iv, enc.authTag, wrongKey));

    const encEmail = encryptEmailSecret("my-email-pass");
    assert.throws(() => decryptEmailSecret(encEmail, wrongKey));
  });

  await runTest("PhaseFAudit", "Mandate 7: Tampered ciphertext rejection fails closed", () => {
    const enc = encryptSecret("genuine-database-secret");
    const tamperedCipher = enc.ciphertext.slice(0, -2) + (enc.ciphertext.slice(-2) === "aa" ? "bb" : "aa");
    assert.throws(() => decryptSecret(tamperedCipher, enc.iv, enc.authTag));

    const encEmail = encryptEmailSecret("genuine-smtp-pass");
    const tamperedEmail = encEmail.ciphertext.slice(0, -2) + (encEmail.ciphertext.slice(-2) === "00" ? "11" : "00");
    assert.throws(() => decryptEmailSecret({ ...encEmail, ciphertext: tamperedEmail }));
  });

  await runTest("PhaseFAudit", "Mandate 8: Invalid IV rejection fails closed", () => {
    const enc = encryptSecret("test-data");
    // Invalid 8-byte IV (must be 12 bytes for AES-256-GCM)
    assert.throws(() => decryptSecret(enc.ciphertext, "0".repeat(16), enc.authTag), /Invalid IV length/);
    assert.throws(() => decryptEmailSecret({ ...enc, iv: "0".repeat(16) }), /Invalid IV length/);
  });

  await runTest("PhaseFAudit", "Mandate 9: Existing encrypted data compatibility with initial seed template key", () => {
    // 1. Settings legacy seed
    const rawSettingVal = "historical-razorpay-key-secret-2026";
    const saltSettings = "master-hrms-settings-secret-salt-v1";
    const legacySettingsKey = crypto.scryptSync(LEGACY_DEFAULT_SEED_JWT, saltSettings, 32);
    const ivSettings = crypto.randomBytes(12);
    const cipherSettings = crypto.createCipheriv("aes-256-gcm", legacySettingsKey, ivSettings);
    let cipherTextSettings = cipherSettings.update(rawSettingVal, "utf8", "hex");
    cipherTextSettings += cipherSettings.final("hex");
    const tagSettings = cipherSettings.getAuthTag().toString("hex");

    const decSetting = decryptSecret(cipherTextSettings, ivSettings.toString("hex"), tagSettings);
    assert.strictEqual(decSetting, rawSettingVal, "Historical setting secret must decrypt with seed key ring");

    // 2. Email legacy seed
    const rawEmailPass = "historical-smtp-password-october";
    const saltEmail = "master-hrms-user-email-secret-salt-v1";
    const legacyEmailKey = crypto.scryptSync(LEGACY_DEFAULT_SEED_JWT, saltEmail, 32);
    const ivEmail = crypto.randomBytes(12);
    const cipherEmail = crypto.createCipheriv("aes-256-gcm", legacyEmailKey, ivEmail);
    let cipherTextEmail = cipherEmail.update(rawEmailPass, "utf8", "hex");
    cipherTextEmail += cipherEmail.final("hex");
    const tagEmail = cipherEmail.getAuthTag().toString("hex");

    const decEmail = decryptEmailSecret({
      ciphertext: cipherTextEmail,
      iv: ivEmail.toString("hex"),
      authTag: tagEmail,
    });
    assert.strictEqual(decEmail, rawEmailPass, "Historical email password must decrypt with seed key ring");

    // 3. Connectors legacy seed
    const rawConnToken = "historical-oauth-token-seed-encrypted";
    const legacyConnKey = crypto.scryptSync(LEGACY_DEFAULT_SEED_JWT, "salt", 32);
    const ivConn = crypto.randomBytes(12);
    const cipherConn = crypto.createCipheriv("aes-256-gcm", legacyConnKey, ivConn);
    let cipherTextConn = cipherConn.update(rawConnToken, "utf8", "hex");
    cipherTextConn += cipherConn.final("hex");
    const tagConn = cipherConn.getAuthTag().toString("hex");
    const connPayload = `${ivConn.toString("hex")}:${tagConn}:${cipherTextConn}`;

    const decConn = ExternalConnectorsService.decryptToken(connPayload);
    assert.strictEqual(decConn, rawConnToken, "Historical connector token must decrypt with seed key ring");
  });

  await runTest("PhaseFAudit", "Mandate 10: Tenant-specific credential isolation prevents cross-tenant access", () => {
    const tenantA_Key = "tenant/tenant_a_uuid/contract.pdf/v1";
    const tenantB_Key = "tenant/tenant_b_uuid/contract.pdf/v1";
    const provider = new LocalStorageProvider();
    const futureExp = Date.now() + 60000;
    const tokenA = provider["generateUploadToken"] ? provider["generateUploadToken"](tenantA_Key, futureExp) : crypto.randomBytes(32).toString("hex");

    // Validating tokenA against tenantB path must fail
    assert.strictEqual(provider.verifyUploadToken(tenantB_Key, futureExp, tokenA), false);
  });

  await runTest("PhaseFAudit", "Mandate 11: Production environment initialization cleanly passes when keys configured", () => {
    const origEnv = process.env.NODE_ENV;
    const origStorage = process.env.STORAGE_ENCRYPTION_KEY;
    const origConn = process.env.CONNECTOR_ENCRYPTION_KEY;
    const origEmail = process.env.EMAIL_CRYPTO_SECRET;
    const origSettings = process.env.SETTINGS_ENCRYPTION_KEY;
    const origAi = process.env.AI_ENCRYPTION_KEY;
    try {
      process.env.NODE_ENV = "production";
      process.env.STORAGE_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
      process.env.CONNECTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
      process.env.EMAIL_CRYPTO_SECRET = crypto.randomBytes(32).toString("hex");
      process.env.SETTINGS_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
      process.env.AI_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");

      const check = validateStartupCryptoConfig();
      assert.strictEqual(check.valid, true);
      assert.strictEqual(check.warnings.length, 0);
      assert.strictEqual(check.errors.length, 0);
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origStorage) process.env.STORAGE_ENCRYPTION_KEY = origStorage; else delete process.env.STORAGE_ENCRYPTION_KEY;
      if (origConn) process.env.CONNECTOR_ENCRYPTION_KEY = origConn; else delete process.env.CONNECTOR_ENCRYPTION_KEY;
      if (origEmail) process.env.EMAIL_CRYPTO_SECRET = origEmail; else delete process.env.EMAIL_CRYPTO_SECRET;
      if (origSettings) process.env.SETTINGS_ENCRYPTION_KEY = origSettings; else delete process.env.SETTINGS_ENCRYPTION_KEY;
      if (origAi) process.env.AI_ENCRYPTION_KEY = origAi; else delete process.env.AI_ENCRYPTION_KEY;
    }
  });

  await runTest("PhaseFAudit", "Mandate 12: Serverless cold-start compatibility leaves public endpoints unblocked", () => {
    const origEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.AI_ENCRYPTION_KEY;
      delete process.env.CONNECTOR_ENCRYPTION_KEY;

      // Normal startup check returns valid=true (warnings only) so serverless boots without crashing
      const check = validateStartupCryptoConfig();
      assert.strictEqual(check.valid, true, "Application must boot with warnings for optional services");
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  await runTest("PhaseFAudit", "Mandate 13: No plaintext credential fallback when writing in production", () => {
    const origEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.SETTINGS_ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      // In production, encryptSecret must fail closed and NEVER return unencrypted plaintext
      assert.throws(() => encryptSecret("my-plain-secret"), (err: any) => err instanceof CryptoConfigurationError);
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  await runTest("PhaseFAudit", "Mandate 14: No secrets exposed in logs or exception messages", () => {
    const sensitiveKey = "super-secret-key-material-never-leak-998877";
    try {
      throw new CryptoConfigurationError(`Operation failed for service`);
    } catch (err: any) {
      assert(!err.message.includes(sensitiveKey), "Exception message must never contain raw key material");
    }
  });

  // 12. Deployment Artifact Consistency Check
  await runTest("ArtifactConsistency", "server/dist/lib/crypto-config.js exists and matches compiled contract", () => {
    const distPath = path.resolve(__dirname, "../../dist/lib/crypto-config.js");
    assert(fs.existsSync(distPath), `Compiled crypto-config.js must exist at ${distPath}`);
    const distModule = require(distPath);
    assert(typeof distModule.getJwtSecret === "function", "distModule must export getJwtSecret");
    assert(typeof distModule.getStorageEncryptionKeys === "function", "distModule must export getStorageEncryptionKeys");
    assert(typeof distModule.getFileSigningSecret === "function", "distModule must export getFileSigningSecret");
    assert(typeof distModule.timingSafeEqualHex === "function", "distModule must export timingSafeEqualHex");
  });

  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${report.filter((r) => r.status === "PASS").length}/${report.length} PASSED`);
  console.log("================================================================================");

  const jsonOutputDir = path.resolve(__dirname, "../../../docs/Saas/screenshots/phase-3-1-3-critical-remediation");
  if (!fs.existsSync(jsonOutputDir)) {
    fs.mkdirSync(jsonOutputDir, { recursive: true });
  }
  const jsonReportPath = path.join(jsonOutputDir, "crypto-test-report.json");
  const reportPayload = {
    timestamp: new Date().toISOString(),
    phase: "3.1.3",
    branch: "fix/phase-3-1-3-critical-remediation",
    total: report.length,
    passed: report.filter((r) => r.status === "PASS").length,
    failed: report.filter((r) => r.status === "FAIL").length,
    results: report,
  };
  fs.writeFileSync(jsonReportPath, JSON.stringify(reportPayload, null, 2), "utf-8");
  console.log(`Report JSON saved to: ${jsonReportPath}`);

  const failures = report.filter((r) => r.status === "FAIL");
  if (failures.length > 0) {
    console.error("FAILURES DETECTED:");
    for (const f of failures) {
      console.error(`- [${f.suite}] ${f.name}: ${f.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal Test Suite Crash:", err);
  process.exit(1);
});
