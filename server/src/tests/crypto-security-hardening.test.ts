import assert from "assert";
import crypto from "crypto";
import {
  getJwtSecret,
  getFileSigningSecret,
  timingSafeEqualHex,
  timingSafeEqualString,
  getStorageEncryptionKeys,
  getConnectorEncryptionKeys,
  getEmailCryptoKeys,
  getSettingsEncryptionKeys,
  getAiEncryptionKeys,
  validateStartupCryptoConfig,
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

function runTest(suite: string, name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          report.push({ suite, name, status: "PASS" });
          console.log(`  ✓ [${suite}] ${name}`);
        })
        .catch((err) => {
          report.push({ suite, name, status: "FAIL", error: err?.message || String(err) });
          console.error(`  ✗ [${suite}] ${name}:`, err?.message);
        });
    }
    report.push({ suite, name, status: "PASS" });
    console.log(`  ✓ [${suite}] ${name}`);
  } catch (err: any) {
    report.push({ suite, name, status: "FAIL", error: err?.message || String(err) });
    console.error(`  ✗ [${suite}] ${name}:`, err?.message);
  }
}

async function main() {
  console.log("================================================================================");
  console.log("MASTERHRMS — Cryptographic Key Management & Security Hardening Unit Test Suite");
  console.log("================================================================================");

  // 1. Timing Safe Equality
  runTest("TimingSafety", "timingSafeEqualString accepts matching strings", () => {
    assert.strictEqual(timingSafeEqualString("hello-world-123", "hello-world-123"), true);
  });

  runTest("TimingSafety", "timingSafeEqualString rejects different strings of same length", () => {
    assert.strictEqual(timingSafeEqualString("hello-world-123", "hello-world-456"), false);
  });

  runTest("TimingSafety", "timingSafeEqualString safely rejects different lengths without throwing", () => {
    assert.strictEqual(timingSafeEqualString("short", "much-longer-string"), false);
  });

  runTest("TimingSafety", "timingSafeEqualHex accepts identical hex strings", () => {
    const hex = crypto.randomBytes(32).toString("hex");
    assert.strictEqual(timingSafeEqualHex(hex, hex), true);
  });

  runTest("TimingSafety", "timingSafeEqualHex safely rejects malformed or different length hex", () => {
    assert.strictEqual(timingSafeEqualHex("abcd", "abcdef"), false);
  });

  // 2. JWT Production Hardening & Fail-Closed Behavior
  runTest("JwtSecurity", "Generates and verifies authentic user JWT payload", () => {
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

  runTest("JwtSecurity", "Generates and verifies temporary MFA pending tokens", () => {
    const mfaToken = generateMfaToken({ userId: "user-mfa-01", email: "mfa@masterhrms.com" });
    const verifiedMfa = verifyMfaToken(mfaToken);
    assert.strictEqual(verifiedMfa.userId, "user-mfa-01");
    assert.strictEqual(verifiedMfa.mfaPending, true);
  });

  runTest("JwtSecurity", "Rejects forged or tampered JWT signatures", () => {
    const token = generateToken({ userId: "u1", email: "u1@test.com", roles: ["EMPLOYEE"] });
    const parts = token.split(".");
    // Tamper payload
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: "hacker", roles: ["SUPER_ADMIN"] })).toString("base64url");
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    assert.throws(() => verifyToken(tamperedToken));
  });

  runTest("JwtSecurity", "Fails closed in production if JWT_SECRET is unset or empty", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.JWT_SECRET;
      assert.throws(() => getJwtSecret(), /Production environment requires a non-empty JWT_SECRET/);
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalSecret) process.env.JWT_SECRET = originalSecret;
    }
  });

  runTest("JwtSecurity", "Fails closed in production if JWT_SECRET is shorter than 32 characters", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "short-insecure-secret";
      assert.throws(() => getJwtSecret(), /at least 32 characters of entropy/);
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalSecret) process.env.JWT_SECRET = originalSecret;
    }
  });

  // 3. Signed URLs & Storage Provider
  await (async () => {
    const provider = new LocalStorageProvider();
    const testKey = "tenant_test/files/avatar.png";

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

    await runTest("SignedUrl", "verifySignature rejects cross-type signature (preview sig on download)", async () => {
      const exp = Date.now() + 60000;
      const previewUrl = await provider.getSignedPreviewUrl(testKey, "image/png", 60);
      const url = new URL(previewUrl, "http://localhost:4000");
      const sig = url.searchParams.get("sig") || "";

      // Check preview sig on preview -> valid
      assert.strictEqual(provider.verifySignature("preview", testKey, exp, sig), true);
      // Check preview sig on download -> rejected
      assert.strictEqual(provider.verifySignature("download", testKey, exp, sig), false);
    });
  })();

  // 4. External Connectors Token Encryption & Backward Compatibility
  runTest("ConnectorsCrypto", "encryptToken and decryptToken round-trip", () => {
    const rawOAuthToken = "ya29.a0AfH6SMD_SampleGoogleOAuthTokenPayload1234567890";
    const encrypted = ExternalConnectorsService.encryptToken(rawOAuthToken);
    assert(encrypted.includes(":"), "Encrypted token must have IV:Tag:Ciphertext format");
    const decrypted = ExternalConnectorsService.decryptToken(encrypted);
    assert.strictEqual(decrypted, rawOAuthToken);
  });

  runTest("ConnectorsCrypto", "decryptToken falls back gracefully to decrypt legacy tokens", () => {
    const rawLegacyToken = "legacy-token-secret-from-old-deployment-1234";
    // Encrypt using legacy salt and legacy fallback key
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

  runTest("ConnectorsCrypto", "decryptToken throws when ciphertext is tampered across all keys", () => {
    const encrypted = ExternalConnectorsService.encryptToken("valid-token");
    const parts = encrypted.split(":");
    const tampered = `${parts[0]}:${parts[1]}:deadbeef${parts[2].slice(8)}`;
    assert.throws(() => ExternalConnectorsService.decryptToken(tampered));
  });

  // 5. User Email SMTP/IMAP Crypto & Backward Compatibility
  runTest("EmailCrypto", "encryptEmailSecret and decryptEmailSecret round-trip", () => {
    const secretPassword = "SuperSecretSmtpPassword!#2026";
    const encrypted = encryptEmailSecret(secretPassword);
    assert(encrypted.ciphertext && encrypted.iv && encrypted.authTag);
    const decrypted = decryptEmailSecret(encrypted);
    assert.strictEqual(decrypted, secretPassword);
  });

  runTest("EmailCrypto", "decryptEmailSecret transparently decrypts legacy credentials", () => {
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

  runTest("EmailCrypto", "decryptEmailSecret rejects corrupted auth tag", () => {
    const encrypted = encryptEmailSecret("test-password");
    assert.throws(() =>
      decryptEmailSecret({
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: "0".repeat(32),
      })
    );
  });

  // 6. Settings Secret Encryption & Backward Compatibility
  runTest("SettingsCrypto", "encryptSecret and decryptSecret round-trip", () => {
    const rawSetting = "rzp_live_secret_key_production_value_99999";
    const enc = encryptSecret(rawSetting);
    const dec = decryptSecret(enc.ciphertext, enc.iv, enc.authTag);
    assert.strictEqual(dec, rawSetting);
  });

  runTest("SettingsCrypto", "decryptSecret supports legacy setting decryption", () => {
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

  // 7. Startup Configuration Validation
  runTest("StartupValidation", "validateStartupCryptoConfig passes in development", () => {
    const check = validateStartupCryptoConfig();
    assert.strictEqual(check.valid, true);
    assert.strictEqual(check.errors.length, 0);
  });

  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${report.filter((r) => r.status === "PASS").length}/${report.length} PASSED`);
  console.log("================================================================================");

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
