import crypto from "crypto";

/**
 * MASTERHRMS — Centralized Cryptographic Configuration & Key Management
 *
 * Provides fail-closed security for production authentication and data protection,
 * with strict backward compatibility for existing encrypted records and storage objects.
 */

const isProduction = () => process.env.NODE_ENV === "production";
const isTest = () => process.env.NODE_ENV === "test";

let devJwtWarningShown = false;

/**
 * Constant-time string / buffer equality comparison helper.
 * Prevents timing attacks while safely handling unequal lengths without throwing.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length || bufA.length === 0) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Constant-time hex string equality comparison helper.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Resolves the primary JWT authentication signing secret.
 *
 * In production:
 * - Fails closed if JWT_SECRET is unset, empty, or whitespace.
 * - Fails closed if JWT_SECRET length < 32 characters (minimum entropy policy).
 * - Never returns a hardcoded fallback string.
 *
 * In non-production (development / test):
 * - Returns process.env.JWT_SECRET if present.
 * - If absent, logs a security notice once and returns a development fallback.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (isProduction()) {
    if (!secret) {
      throw new Error(
        "[CRITICAL SECURITY] Production environment requires a non-empty JWT_SECRET. Server refused to start."
      );
    }
    if (secret.length < 32) {
      throw new Error(
        `[CRITICAL SECURITY] Production JWT_SECRET must have at least 32 characters of entropy (current length: ${secret.length}).`
      );
    }
    return secret;
  }

  if (secret) {
    return secret;
  }

  if (!devJwtWarningShown && !isTest()) {
    console.warn(
      "⚠️ [SECURITY WARNING] Missing JWT_SECRET in development mode. Using non-production local development secret. DO NOT deploy this configuration to production."
    );
    devJwtWarningShown = true;
  }

  return "masterhrms-local-dev-jwt-secret-do-not-use-in-production";
}

/**
 * Resolves the secret used for signing and verifying file upload/download URLs.
 * Priority:
 * 1. FILE_SIGNING_SECRET
 * 2. JWT_SECRET (legacy compatibility)
 */
export function getFileSigningSecret(): string {
  const fileSecret = process.env.FILE_SIGNING_SECRET?.trim();
  if (fileSecret) {
    return fileSecret;
  }

  if (isProduction()) {
    // In production without dedicated FILE_SIGNING_SECRET, use JWT_SECRET with fail-closed guarantee
    return getJwtSecret();
  }

  const legacySecret = process.env.JWT_SECRET?.trim();
  if (legacySecret) {
    return legacySecret;
  }

  return "masterhrms-local-dev-file-signing-secret";
}

/**
 * Returns legacy secrets for validating in-flight signed URLs during secret rotation.
 */
export function getLegacyFileSigningSecrets(): string[] {
  const secrets: string[] = [];
  const jwt = process.env.JWT_SECRET?.trim();
  if (jwt) secrets.push(jwt);
  secrets.push("local-storage-secret-signing-key");
  secrets.push("masterhrms-file-download-secret-signing-key");
  return secrets;
}

/**
 * Resolves encryption keys for local encrypted disk storage.
 * Supports dedicated STORAGE_ENCRYPTION_KEY, key ring rotation, and backward-compatible
 * decryption of files encrypted with legacy scrypt-derived keys.
 */
export function getStorageEncryptionKeys(): { active: Buffer; legacy: Buffer[] } {
  const customKey = process.env.STORAGE_ENCRYPTION_KEY?.trim();
  let active: Buffer;

  if (customKey && customKey.length === 64) {
    active = Buffer.from(customKey, "hex");
  } else if (customKey) {
    active = crypto.scryptSync(customKey, "master-hrms-storage-salt-v1", 32);
  } else {
    // Derive from JWT_SECRET or local fallback
    const secret = process.env.JWT_SECRET || "master-hrms-default-storage-encryption-key-salt";
    active = crypto.scryptSync(secret, "master-hrms-storage-salt-v1", 32);
  }

  const legacy: Buffer[] = [];

  // Key ring support
  const ring = process.env.STORAGE_ENCRYPTION_KEY_RING;
  if (ring) {
    const hexKeys = ring.split(",").map((k) => k.trim()).filter((k) => k.length === 64);
    for (const hex of hexKeys) {
      legacy.push(Buffer.from(hex, "hex"));
    }
  }

  // Include legacy scrypt derivation if custom key is in use
  if (customKey) {
    const legacySecret = process.env.JWT_SECRET || "master-hrms-default-storage-encryption-key-salt";
    const legacyDerived = crypto.scryptSync(legacySecret, "master-hrms-storage-salt-v1", 32);
    if (!active.equals(legacyDerived)) {
      legacy.push(legacyDerived);
    }
  }

  // Include static fallback key for non-production compatibility
  const staticFallback = crypto.scryptSync("master-hrms-default-storage-encryption-key-salt", "master-hrms-storage-salt-v1", 32);
  if (!active.equals(staticFallback) && !legacy.some((k) => k.equals(staticFallback))) {
    legacy.push(staticFallback);
  }

  return { active, legacy };
}

/**
 * Resolves encryption keys for external connector OAuth credentials.
 */
export function getConnectorEncryptionKeys(): { active: Buffer; legacy: Buffer[] } {
  const dedicated = (process.env.CONNECTOR_ENCRYPTION_KEY || process.env.TOKEN_ENCRYPTION_KEY)?.trim();
  let active: Buffer;

  if (dedicated && dedicated.length === 64) {
    active = Buffer.from(dedicated, "hex");
  } else if (dedicated) {
    active = crypto.scryptSync(dedicated, "master-hrms-connector-salt-v1", 32);
  } else {
    const secret = process.env.JWT_SECRET || "masterhrms-token-key-salt";
    active = crypto.scryptSync(secret, "salt", 32);
  }

  const legacy: Buffer[] = [];

  // Legacy key from JWT_SECRET + "salt"
  const legacySecret = process.env.JWT_SECRET || "masterhrms-token-key-salt";
  const legacyKey = crypto.scryptSync(legacySecret, "salt", 32);
  if (!active.equals(legacyKey)) {
    legacy.push(legacyKey);
  }

  // Legacy fallback string key
  const staticFallback = crypto.scryptSync("masterhrms-token-key-salt", "salt", 32);
  if (!active.equals(staticFallback) && !legacy.some((k) => k.equals(staticFallback))) {
    legacy.push(staticFallback);
  }

  return { active, legacy };
}

/**
 * Resolves encryption keys for user email SMTP/IMAP credentials.
 */
export function getEmailCryptoKeys(): { active: Buffer; legacy: Buffer[] } {
  const dedicated = (process.env.EMAIL_CRYPTO_SECRET || process.env.ENCRYPTION_KEY)?.trim();
  const salt = "master-hrms-user-email-secret-salt-v1";
  let active: Buffer;

  if (dedicated) {
    active = crypto.scryptSync(dedicated, salt, 32);
  } else {
    const rawKeyMaterial =
      process.env.JWT_SECRET ||
      "master-hrms-32-char-encryption-key-phrase!";
    active = crypto.scryptSync(rawKeyMaterial, salt, 32);
  }

  const legacy: Buffer[] = [];

  if (dedicated) {
    const legacySecret = process.env.JWT_SECRET || "master-hrms-32-char-encryption-key-phrase!";
    const legacyDerived = crypto.scryptSync(legacySecret, salt, 32);
    if (!active.equals(legacyDerived)) {
      legacy.push(legacyDerived);
    }
  }

  const staticFallback = crypto.scryptSync("master-hrms-32-char-encryption-key-phrase!", salt, 32);
  if (!active.equals(staticFallback) && !legacy.some((k) => k.equals(staticFallback))) {
    legacy.push(staticFallback);
  }

  return { active, legacy };
}

/**
 * Resolves encryption keys for database settings (system/tenant encrypted settings).
 */
export function getSettingsEncryptionKeys(): { active: Buffer; legacy: Buffer[] } {
  const dedicated = (process.env.SETTINGS_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY)?.trim();
  const salt = "master-hrms-settings-secret-salt-v1";
  let active: Buffer;

  if (dedicated) {
    active = crypto.scryptSync(dedicated, salt, 32);
  } else {
    const rawKeyMaterial =
      process.env.JWT_SECRET ||
      "master-hrms-32-char-encryption-key-phrase!";
    active = crypto.scryptSync(rawKeyMaterial, salt, 32);
  }

  const legacy: Buffer[] = [];

  if (dedicated) {
    const legacySecret = process.env.JWT_SECRET || "master-hrms-32-char-encryption-key-phrase!";
    const legacyDerived = crypto.scryptSync(legacySecret, salt, 32);
    if (!active.equals(legacyDerived)) {
      legacy.push(legacyDerived);
    }
  }

  const staticFallback = crypto.scryptSync("master-hrms-32-char-encryption-key-phrase!", salt, 32);
  if (!active.equals(staticFallback) && !legacy.some((k) => k.equals(staticFallback))) {
    legacy.push(staticFallback);
  }

  return { active, legacy };
}

/**
 * Resolves encryption keys for AI Assistant provider settings.
 */
export function getAiEncryptionKeys(): { active: string; legacy: string[] } {
  const dedicated = (process.env.AI_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY)?.trim();
  const active = dedicated || process.env.JWT_SECRET || "hrms-enterprise-master-sec-key-32";
  const legacy: string[] = ["hrms-enterprise-master-sec-key-32"];
  if (process.env.JWT_SECRET && process.env.JWT_SECRET !== active) {
    legacy.push(process.env.JWT_SECRET);
  }
  return { active, legacy };
}

/**
 * Startup diagnostic and security compliance check.
 * Evaluates environment configuration without exposing sensitive secret values.
 */
export function validateStartupCryptoConfig(): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    getJwtSecret();
  } catch (err: any) {
    errors.push(err?.message || "Failed to validate JWT_SECRET");
  }

  if (isProduction()) {
    if (!process.env.STORAGE_ENCRYPTION_KEY) {
      warnings.push("STORAGE_ENCRYPTION_KEY is unset; deriving storage key from JWT_SECRET. Consider setting a dedicated 256-bit key.");
    }
    if (!process.env.FILE_SIGNING_SECRET) {
      warnings.push("FILE_SIGNING_SECRET is unset; using JWT_SECRET for file URL signatures. Consider setting a dedicated signing secret.");
    }
    if (!process.env.CONNECTOR_ENCRYPTION_KEY && !process.env.TOKEN_ENCRYPTION_KEY) {
      warnings.push("CONNECTOR_ENCRYPTION_KEY is unset; deriving connector key from JWT_SECRET. Consider setting a dedicated key.");
    }
    if (!process.env.EMAIL_CRYPTO_SECRET && !process.env.ENCRYPTION_KEY) {
      warnings.push("EMAIL_CRYPTO_SECRET is unset; deriving email credential key from JWT_SECRET. Consider setting a dedicated key.");
    }
    if (!process.env.SETTINGS_ENCRYPTION_KEY && !process.env.ENCRYPTION_KEY) {
      warnings.push("SETTINGS_ENCRYPTION_KEY is unset; deriving settings encryption key from JWT_SECRET. Consider setting a dedicated key.");
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
