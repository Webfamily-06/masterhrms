import assert from "node:assert";
import dotenv from "dotenv";
import path from "path";
import {
  SETTINGS_REGISTRY,
  getSettingDefinition,
  getGroupDefinitions,
  validateSettingValue,
} from "../services/settings/settings-registry";
import { encryptSecret, decryptSecret } from "../services/settings/settings.service";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

async function runSettingsPlatformVerification() {
  console.log("================================================================================");
  console.log("🧪 MASTERHRMS — SETTINGS PLATFORM VERIFICATION TEST SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err?.message || err}`);
      failed++;
    }
  }

  console.log("--- 1. SETTINGS_REGISTRY Validation & Schema Integrity ---");

  test("Should contain all 18 registered configuration groups (including pusher & firebase)", () => {
    const allGroups = new Set(Object.values(SETTINGS_REGISTRY).map((d) => d.group));
    const expectedGroups = [
      "branding",
      "locale",
      "user",
      "appearance",
      "seo",
      "invoicing",
      "ai",
      "email",
      "oauth",
      "storage",
      "security",
      "payments",
      "system",
      "hr",
      "integration",
      "messaging",
      "pusher",
      "firebase",
    ];

    for (const group of expectedGroups) {
      assert.strictEqual(allGroups.has(group), true, `Group '${group}' must be registered in SETTINGS_REGISTRY`);
    }
  });

  test("Should have at least 100 registered configuration keys", () => {
    const keys = Object.keys(SETTINGS_REGISTRY);
    assert.ok(keys.length >= 100, `Expected >= 100 keys, found ${keys.length}`);
  });

  test("Should enforce valid scope definitions on every registered key", () => {
    const validScopes = ["PLATFORM", "TENANT", "USER"];
    for (const [key, def] of Object.entries(SETTINGS_REGISTRY)) {
      assert.ok(def.scopes.length > 0, `Key '${key}' must define at least one scope`);
      for (const scope of def.scopes) {
        assert.ok(validScopes.includes(scope), `Key '${key}' contains invalid scope '${scope}'`);
      }
    }
  });

  test("Should enforce validation rules on user preference settings", () => {
    // Valid theme modes
    assert.strictEqual(validateSettingValue("user.theme_mode", "light", "USER").valid, true);
    assert.strictEqual(validateSettingValue("user.theme_mode", "dark", "USER").valid, true);
    assert.strictEqual(validateSettingValue("user.theme_mode", "system", "USER").valid, true);
    assert.strictEqual(validateSettingValue("user.theme_mode", "neon_blue", "USER").valid, false);

    // Calendar first day
    assert.strictEqual(validateSettingValue("user.calendar_first_day", 1, "USER").valid, true);
    assert.strictEqual(validateSettingValue("user.calendar_first_day", 0, "USER").valid, true);
    assert.strictEqual(validateSettingValue("user.calendar_first_day", 5, "USER").valid, false);

    // Date format
    assert.strictEqual(validateSettingValue("user.date_format", "YYYY-MM-DD", "USER").valid, true);
    assert.strictEqual(validateSettingValue("user.date_format", "INVALID_FORMAT", "USER").valid, false);
  });

  test("Should validate hex color formats for branding settings", () => {
    assert.strictEqual(validateSettingValue("branding.primary_color", "#2563EB", "PLATFORM").valid, true);
    assert.strictEqual(validateSettingValue("branding.primary_color", "#FFF", "PLATFORM").valid, true);
    assert.strictEqual(validateSettingValue("branding.primary_color", "rgb(255,0,0)", "PLATFORM").valid, false);
    assert.strictEqual(validateSettingValue("branding.primary_color", "invalid-color", "PLATFORM").valid, false);
  });

  test("Should validate email address formatting for support and communication", () => {
    assert.strictEqual(validateSettingValue("branding.support_email", "support@company.com", "PLATFORM").valid, true);
    assert.strictEqual(validateSettingValue("branding.support_email", "not-an-email", "PLATFORM").valid, false);
  });

  console.log("\n--- 2. Cryptographic Security & AES-256-GCM Integrity ---");

  const testSecret = "super-secret-smtp-password-12345!@#";

  test("Should encrypt plaintext into ciphertext, unique IV, and authentication tag", () => {
    const encrypted = encryptSecret(testSecret);
    assert.ok(encrypted, "Encryption result must exist");
    assert.strictEqual(typeof encrypted.ciphertext, "string", "Ciphertext must be a hex string");
    assert.ok(encrypted.ciphertext.length > 0, "Ciphertext cannot be empty");
    assert.strictEqual(typeof encrypted.iv, "string");
    assert.strictEqual(encrypted.iv.length, 24); // 12 bytes hex = 24 hex characters
    assert.strictEqual(typeof encrypted.authTag, "string");
    assert.strictEqual(encrypted.authTag.length, 32); // 16 bytes hex = 32 hex characters
  });

  test("Should produce different ciphertexts and IVs for identical plaintext (probabilistic encryption)", () => {
    const enc1 = encryptSecret(testSecret);
    const enc2 = encryptSecret(testSecret);
    assert.notStrictEqual(enc1.iv, enc2.iv, "IVs must be distinct per operation");
    assert.notStrictEqual(enc1.ciphertext, enc2.ciphertext, "Ciphertexts must be distinct");
  });

  test("Should correctly decrypt encrypted secrets back to exact plaintext", () => {
    const encrypted = encryptSecret(testSecret);
    const decrypted = decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
    assert.strictEqual(decrypted, testSecret, "Decrypted text must match original plaintext exactly");
  });

  test("Should fail decryption and reject tampered ciphertext or altered authentication tags", () => {
    const encrypted = encryptSecret(testSecret);

    // Tampered ciphertext
    const tamperedCiphertext = encrypted.ciphertext.slice(0, -2) + "ff";

    assert.throws(() => {
      decryptSecret(tamperedCiphertext, encrypted.iv, encrypted.authTag);
    }, "Tampered ciphertext must throw decryption authentication failure");

    // Tampered auth tag
    assert.throws(() => {
      decryptSecret(encrypted.ciphertext, encrypted.iv, "0".repeat(32));
    }, "Tampered auth tag must throw decryption authentication failure");
  });

  console.log("\n--- 3. Multi-Tier Scope Access & Privilege Isolation ---");

  test("Should permit USER scope only on user-level preferences", () => {
    const userThemeDef = getSettingDefinition("user.theme_mode");
    assert.ok(userThemeDef?.scopes.includes("USER"), "user.theme_mode must support USER scope");
    assert.ok(!userThemeDef?.scopes.includes("PLATFORM"), "user.theme_mode must not be PLATFORM scoped");

    const smtpPassDef = getSettingDefinition("email.smtp_password");
    assert.ok(!smtpPassDef?.scopes.includes("USER"), "email.smtp_password must not be accessible in USER scope");
    assert.strictEqual(validateSettingValue("email.smtp_password", "pw", "USER").valid, false);
  });

  test("Should permit PLATFORM scope only on platform governance settings", () => {
    const seoDef = getSettingDefinition("seo.meta_title");
    assert.ok(seoDef?.scopes.includes("PLATFORM"), "seo.meta_title must support PLATFORM scope");
    assert.ok(!seoDef?.scopes.includes("TENANT"), "seo.meta_title must not support TENANT scope");
    assert.ok(!seoDef?.scopes.includes("USER"), "seo.meta_title must not support USER scope");
    assert.strictEqual(validateSettingValue("seo.meta_title", "Custom Title", "TENANT").valid, false);
  });

  test("Should allow resetting to default in TENANT and USER scope when passing empty value", () => {
    assert.strictEqual(validateSettingValue("branding.primary_color", "", "TENANT").valid, true);
    assert.strictEqual(validateSettingValue("user.theme_mode", "", "USER").valid, true);
  });

  console.log("\n================================================================================");
  console.log(`📊 TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSettingsPlatformVerification().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
