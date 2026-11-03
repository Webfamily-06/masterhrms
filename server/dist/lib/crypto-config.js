"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_DEFAULT_SEED_JWT = exports.CryptoConfigurationError = void 0;
exports.timingSafeEqualString = timingSafeEqualString;
exports.timingSafeEqualHex = timingSafeEqualHex;
exports.getJwtSecret = getJwtSecret;
exports.getFileSigningSecret = getFileSigningSecret;
exports.getLegacyFileSigningSecrets = getLegacyFileSigningSecrets;
exports.getStorageEncryptionKeys = getStorageEncryptionKeys;
exports.getStorageDecryptionKeys = getStorageDecryptionKeys;
exports.getConnectorEncryptionKeys = getConnectorEncryptionKeys;
exports.getEmailCryptoKeys = getEmailCryptoKeys;
exports.getSettingsEncryptionKeys = getSettingsEncryptionKeys;
exports.getAiEncryptionKeys = getAiEncryptionKeys;
exports.validateStartupCryptoConfig = validateStartupCryptoConfig;
const crypto_1 = __importDefault(require("crypto"));
/**
 * MASTERHRMS — Centralized Cryptographic Configuration & Key Management
 *
 * Implements strict, fail-closed production key management for authentication,
 * data storage, credential encryption, and file signing, with zero-downtime backward
 * compatibility for existing encrypted records and storage objects.
 */
class CryptoConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = "CryptoConfigurationError";
    }
}
exports.CryptoConfigurationError = CryptoConfigurationError;
const isProduction = () => process.env.NODE_ENV === "production";
const isTest = () => process.env.NODE_ENV === "test";
let devJwtWarningShown = false;
/**
 * Initial historical seed template secret from earlier deployment cycles.
 * Retained strictly as candidate fallback for decrypting historical records.
 */
exports.LEGACY_DEFAULT_SEED_JWT = "master-hrms-jwt-super-secret-key-change-this-in-production";
/**
 * Constant-time string / buffer equality comparison helper.
 * Prevents timing attacks while safely handling unequal lengths without throwing.
 */
function timingSafeEqualString(a, b) {
    if (typeof a !== "string" || typeof b !== "string") {
        return false;
    }
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length || bufA.length === 0) {
        return false;
    }
    return crypto_1.default.timingSafeEqual(bufA, bufB);
}
/**
 * Constant-time hex string equality comparison helper.
 */
function timingSafeEqualHex(a, b) {
    if (typeof a !== "string" || typeof b !== "string") {
        return false;
    }
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length || bufA.length === 0) {
        return false;
    }
    return crypto_1.default.timingSafeEqual(bufA, bufB);
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
function getJwtSecret() {
    const secret = process.env.JWT_SECRET?.trim();
    if (isProduction()) {
        if (!secret) {
            throw new CryptoConfigurationError("[CRITICAL SECURITY] Production environment requires a non-empty JWT_SECRET. Server refused to start.");
        }
        if (secret.length < 32) {
            throw new CryptoConfigurationError(`[CRITICAL SECURITY] Production JWT_SECRET must have at least 32 characters of entropy (current length: ${secret.length}).`);
        }
        return secret;
    }
    if (secret) {
        return secret;
    }
    if (!devJwtWarningShown && !isTest()) {
        console.warn("⚠️ [SECURITY WARNING] Missing JWT_SECRET in development mode. Using non-production local development secret. DO NOT deploy this configuration to production.");
        devJwtWarningShown = true;
    }
    return "masterhrms-local-dev-jwt-secret-do-not-use-in-production";
}
/**
 * Resolves the dedicated secret used for signing and verifying file upload/download URLs.
 *
 * In production:
 * - Requires explicit dedicated FILE_SIGNING_SECRET with at least 32 characters.
 * - Fallback to JWT_SECRET or static strings is prohibited for active signing operations.
 *
 * In development / test:
 * - Returns FILE_SIGNING_SECRET if set, then JWT_SECRET, then a local dev fallback.
 */
function getFileSigningSecret() {
    const fileSecret = process.env.FILE_SIGNING_SECRET?.trim();
    if (isProduction()) {
        if (!fileSecret) {
            throw new CryptoConfigurationError("[CRITICAL SECURITY] Production environment requires a dedicated FILE_SIGNING_SECRET (at least 32 characters) for signed file operations. Derivation from JWT_SECRET is prohibited for new signatures.");
        }
        if (fileSecret.length < 32) {
            throw new CryptoConfigurationError(`[CRITICAL SECURITY] Production FILE_SIGNING_SECRET must have at least 32 characters of entropy (current length: ${fileSecret.length}).`);
        }
        return fileSecret;
    }
    if (fileSecret) {
        return fileSecret;
    }
    const legacySecret = process.env.JWT_SECRET?.trim();
    if (legacySecret) {
        return legacySecret;
    }
    return "masterhrms-local-dev-file-signing-secret";
}
/**
 * Returns legacy secrets for validating in-flight signed URLs during secret rotation.
 * In-flight download/preview URLs signed with older keys continue to verify until expiration.
 */
function getLegacyFileSigningSecrets() {
    const secrets = [];
    const activeSecret = process.env.FILE_SIGNING_SECRET?.trim();
    const jwt = process.env.JWT_SECRET?.trim();
    if (jwt && jwt !== activeSecret) {
        secrets.push(jwt);
    }
    secrets.push("local-storage-secret-signing-key");
    secrets.push("masterhrms-file-download-secret-signing-key");
    return Array.from(new Set(secrets));
}
/**
 * Resolves encryption keys for local encrypted disk storage.
 *
 * Active Encryption Key:
 * - In production: Must be configured via STORAGE_ENCRYPTION_KEY (64-character hex or >= 32-character passphrase).
 *   Fails closed and throws CryptoConfigurationError if missing or insufficient entropy.
 * - In dev/test: Falls back to non-production scrypt derivation from JWT_SECRET or local dev salt.
 *
 * Legacy Decryption Keys:
 * - Supports STORAGE_ENCRYPTION_KEY_RING for key rotation.
 * - Retains historical derivation keys (JWT_SECRET derived and legacy static salt) strictly in the legacy list
 *   to ensure zero data loss and transparent reading of historical files.
 */
function getStorageEncryptionKeys() {
    const customKey = process.env.STORAGE_ENCRYPTION_KEY?.trim();
    let active;
    if (isProduction()) {
        if (!customKey) {
            throw new CryptoConfigurationError("[CRITICAL SECURITY] Production environment requires a dedicated STORAGE_ENCRYPTION_KEY (64-character hex or >= 32-character passphrase) for local encrypted storage. Fallback to JWT_SECRET or static keys is strictly prohibited.");
        }
        if (customKey.length !== 64 && customKey.length < 32) {
            throw new CryptoConfigurationError(`[CRITICAL SECURITY] Production STORAGE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes) or a passphrase of at least 32 characters (current length: ${customKey.length}).`);
        }
        if (customKey.length === 64 && /^[0-9a-fA-F]{64}$/.test(customKey)) {
            active = Buffer.from(customKey, "hex");
        }
        else {
            active = crypto_1.default.scryptSync(customKey, "master-hrms-storage-salt-v1", 32);
        }
    }
    else {
        if (customKey && customKey.length === 64 && /^[0-9a-fA-F]{64}$/.test(customKey)) {
            active = Buffer.from(customKey, "hex");
        }
        else if (customKey) {
            active = crypto_1.default.scryptSync(customKey, "master-hrms-storage-salt-v1", 32);
        }
        else {
            const secret = process.env.JWT_SECRET || "master-hrms-default-storage-encryption-key-salt";
            active = crypto_1.default.scryptSync(secret, "master-hrms-storage-salt-v1", 32);
        }
    }
    const legacy = [];
    // Key ring support for rotation
    const ring = process.env.STORAGE_ENCRYPTION_KEY_RING;
    if (ring) {
        const hexKeys = ring.split(",").map((k) => k.trim()).filter((k) => k.length === 64 && /^[0-9a-fA-F]{64}$/.test(k));
        for (const hex of hexKeys) {
            const keyBuf = Buffer.from(hex, "hex");
            if (!active.equals(keyBuf) && !legacy.some((k) => k.equals(keyBuf))) {
                legacy.push(keyBuf);
            }
        }
    }
    // Include historical JWT_SECRET derived key if set and different from active
    const jwt = process.env.JWT_SECRET?.trim();
    if (jwt) {
        const legacyDerived = crypto_1.default.scryptSync(jwt, "master-hrms-storage-salt-v1", 32);
        if (!active.equals(legacyDerived) && !legacy.some((k) => k.equals(legacyDerived))) {
            legacy.push(legacyDerived);
        }
    }
    // Include initial default seed template key
    const templateDerived = crypto_1.default.scryptSync(exports.LEGACY_DEFAULT_SEED_JWT, "master-hrms-storage-salt-v1", 32);
    if (!active.equals(templateDerived) && !legacy.some((k) => k.equals(templateDerived))) {
        legacy.push(templateDerived);
    }
    // Include static fallback key for non-production compatibility
    const staticFallback = crypto_1.default.scryptSync("master-hrms-default-storage-encryption-key-salt", "master-hrms-storage-salt-v1", 32);
    if (!active.equals(staticFallback) && !legacy.some((k) => k.equals(staticFallback))) {
        legacy.push(staticFallback);
    }
    return { active, legacy };
}
/**
 * Returns candidate decryption keys for storage files, even if active encryption key
 * cannot be resolved in a read-only or recovery scenario.
 */
function getStorageDecryptionKeys() {
    try {
        const { active, legacy } = getStorageEncryptionKeys();
        return [active, ...legacy];
    }
    catch {
        const fallbackList = [];
        const jwt = process.env.JWT_SECRET?.trim();
        if (jwt) {
            fallbackList.push(crypto_1.default.scryptSync(jwt, "master-hrms-storage-salt-v1", 32));
        }
        fallbackList.push(crypto_1.default.scryptSync(exports.LEGACY_DEFAULT_SEED_JWT, "master-hrms-storage-salt-v1", 32));
        fallbackList.push(crypto_1.default.scryptSync("master-hrms-default-storage-encryption-key-salt", "master-hrms-storage-salt-v1", 32));
        return fallbackList;
    }
}
/**
 * Resolves encryption keys for external connector OAuth credentials.
 *
 * In production:
 * - Requires dedicated CONNECTOR_ENCRYPTION_KEY (or TOKEN_ENCRYPTION_KEY).
 * - Fails closed if missing or < 32 characters.
 *
 * Legacy Decryption:
 * - Candidate keys retain historical scrypt derivation from JWT_SECRET and legacy salt "salt".
 */
function getConnectorEncryptionKeys() {
    const dedicated = (process.env.CONNECTOR_ENCRYPTION_KEY || process.env.TOKEN_ENCRYPTION_KEY)?.trim();
    let active;
    if (isProduction()) {
        if (!dedicated) {
            throw new CryptoConfigurationError("[CRITICAL SECURITY] Production environment requires a dedicated CONNECTOR_ENCRYPTION_KEY (64-character hex or >= 32-character passphrase) for external OAuth connector credentials. Silent fallback to JWT_SECRET is prohibited.");
        }
        if (dedicated.length !== 64 && dedicated.length < 32) {
            throw new CryptoConfigurationError(`[CRITICAL SECURITY] Production CONNECTOR_ENCRYPTION_KEY must be a 64-character hex string (32 bytes) or at least 32 characters in length (current length: ${dedicated.length}).`);
        }
        if (dedicated.length === 64 && /^[0-9a-fA-F]{64}$/.test(dedicated)) {
            active = Buffer.from(dedicated, "hex");
        }
        else {
            active = crypto_1.default.scryptSync(dedicated, "master-hrms-connector-salt-v1", 32);
        }
    }
    else {
        if (dedicated && dedicated.length === 64 && /^[0-9a-fA-F]{64}$/.test(dedicated)) {
            active = Buffer.from(dedicated, "hex");
        }
        else if (dedicated) {
            active = crypto_1.default.scryptSync(dedicated, "master-hrms-connector-salt-v1", 32);
        }
        else {
            const secret = process.env.JWT_SECRET || "masterhrms-token-key-salt";
            active = crypto_1.default.scryptSync(secret, "salt", 32);
        }
    }
    const legacy = [];
    // Historical derivation from JWT_SECRET with legacy salt "salt"
    const jwt = process.env.JWT_SECRET?.trim();
    if (jwt) {
        const legacyJwtKey = crypto_1.default.scryptSync(jwt, "salt", 32);
        if (!active.equals(legacyJwtKey)) {
            legacy.push(legacyJwtKey);
        }
    }
    // Include initial default seed template key with salt "salt" and connector salt
    const templateDerived = crypto_1.default.scryptSync(exports.LEGACY_DEFAULT_SEED_JWT, "salt", 32);
    if (!active.equals(templateDerived) && !legacy.some((k) => k.equals(templateDerived))) {
        legacy.push(templateDerived);
    }
    const templateConnectorSalt = crypto_1.default.scryptSync(exports.LEGACY_DEFAULT_SEED_JWT, "master-hrms-connector-salt-v1", 32);
    if (!active.equals(templateConnectorSalt) && !legacy.some((k) => k.equals(templateConnectorSalt))) {
        legacy.push(templateConnectorSalt);
    }
    // Legacy fallback string key with salt "salt"
    const staticFallback = crypto_1.default.scryptSync("masterhrms-token-key-salt", "salt", 32);
    if (!active.equals(staticFallback) && !legacy.some((k) => k.equals(staticFallback))) {
        legacy.push(staticFallback);
    }
    return { active, legacy };
}
/**
 * Resolves encryption keys for user email SMTP/IMAP credentials.
 *
 * In production:
 * - Requires dedicated EMAIL_CRYPTO_SECRET (or ENCRYPTION_KEY).
 * - Fails closed if missing or < 32 characters.
 *
 * Legacy Decryption:
 * - Retains historical scrypt derivation from JWT_SECRET and legacy static phrase.
 */
function getEmailCryptoKeys() {
    const dedicated = (process.env.EMAIL_CRYPTO_SECRET || process.env.ENCRYPTION_KEY)?.trim();
    const salt = "master-hrms-user-email-secret-salt-v1";
    let active;
    if (isProduction()) {
        if (!dedicated) {
            throw new CryptoConfigurationError("[CRITICAL SECURITY] Production environment requires a dedicated EMAIL_CRYPTO_SECRET (at least 32 characters) for user SMTP/IMAP mailbox credentials.");
        }
        if (dedicated.length < 32) {
            throw new CryptoConfigurationError(`[CRITICAL SECURITY] Production EMAIL_CRYPTO_SECRET must have at least 32 characters of entropy (current length: ${dedicated.length}).`);
        }
        active = crypto_1.default.scryptSync(dedicated, salt, 32);
    }
    else {
        if (dedicated) {
            active = crypto_1.default.scryptSync(dedicated, salt, 32);
        }
        else {
            const rawKeyMaterial = process.env.JWT_SECRET || "master-hrms-32-char-encryption-key-phrase!";
            active = crypto_1.default.scryptSync(rawKeyMaterial, salt, 32);
        }
    }
    const legacy = [];
    const jwt = process.env.JWT_SECRET?.trim();
    if (jwt) {
        const legacyJwtKey = crypto_1.default.scryptSync(jwt, salt, 32);
        if (!active.equals(legacyJwtKey)) {
            legacy.push(legacyJwtKey);
        }
    }
    // Include initial default seed template key
    const templateDerived = crypto_1.default.scryptSync(exports.LEGACY_DEFAULT_SEED_JWT, salt, 32);
    if (!active.equals(templateDerived) && !legacy.some((k) => k.equals(templateDerived))) {
        legacy.push(templateDerived);
    }
    const staticFallback = crypto_1.default.scryptSync("master-hrms-32-char-encryption-key-phrase!", salt, 32);
    if (!active.equals(staticFallback) && !legacy.some((k) => k.equals(staticFallback))) {
        legacy.push(staticFallback);
    }
    return { active, legacy };
}
/**
 * Resolves encryption keys for database settings (system/tenant encrypted settings).
 *
 * In production:
 * - Requires dedicated SETTINGS_ENCRYPTION_KEY (or ENCRYPTION_KEY).
 * - Fails closed if missing or < 32 characters.
 *
 * Legacy Decryption:
 * - Retains historical scrypt derivation from JWT_SECRET and legacy static phrase.
 */
function getSettingsEncryptionKeys() {
    const dedicated = (process.env.SETTINGS_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY)?.trim();
    const salt = "master-hrms-settings-secret-salt-v1";
    let active;
    if (isProduction()) {
        if (!dedicated) {
            throw new CryptoConfigurationError("[CRITICAL SECURITY] Production environment requires a dedicated SETTINGS_ENCRYPTION_KEY (at least 32 characters) for system and tenant encrypted settings.");
        }
        if (dedicated.length < 32) {
            throw new CryptoConfigurationError(`[CRITICAL SECURITY] Production SETTINGS_ENCRYPTION_KEY must have at least 32 characters of entropy (current length: ${dedicated.length}).`);
        }
        active = crypto_1.default.scryptSync(dedicated, salt, 32);
    }
    else {
        if (dedicated) {
            active = crypto_1.default.scryptSync(dedicated, salt, 32);
        }
        else {
            const rawKeyMaterial = process.env.JWT_SECRET || "master-hrms-32-char-encryption-key-phrase!";
            active = crypto_1.default.scryptSync(rawKeyMaterial, salt, 32);
        }
    }
    const legacy = [];
    const jwt = process.env.JWT_SECRET?.trim();
    if (jwt) {
        const legacyJwtKey = crypto_1.default.scryptSync(jwt, salt, 32);
        if (!active.equals(legacyJwtKey)) {
            legacy.push(legacyJwtKey);
        }
    }
    // Include initial default seed template key
    const templateDerived = crypto_1.default.scryptSync(exports.LEGACY_DEFAULT_SEED_JWT, salt, 32);
    if (!active.equals(templateDerived) && !legacy.some((k) => k.equals(templateDerived))) {
        legacy.push(templateDerived);
    }
    const staticFallback = crypto_1.default.scryptSync("master-hrms-32-char-encryption-key-phrase!", salt, 32);
    if (!active.equals(staticFallback) && !legacy.some((k) => k.equals(staticFallback))) {
        legacy.push(staticFallback);
    }
    return { active, legacy };
}
/**
 * Resolves encryption keys for AI Assistant provider settings.
 *
 * In production:
 * - Requires dedicated AI_ENCRYPTION_KEY (or ENCRYPTION_KEY).
 * - Fails closed if missing or < 32 characters.
 *
 * Legacy Decryption:
 * - Retains historical fallback key and JWT_SECRET candidates.
 */
function getAiEncryptionKeys() {
    const dedicated = (process.env.AI_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY)?.trim();
    let active;
    if (isProduction()) {
        if (!dedicated) {
            throw new CryptoConfigurationError("[CRITICAL SECURITY] Production environment requires a dedicated AI_ENCRYPTION_KEY (at least 32 characters) for AI provider credential encryption.");
        }
        if (dedicated.length < 32) {
            throw new CryptoConfigurationError(`[CRITICAL SECURITY] Production AI_ENCRYPTION_KEY must have at least 32 characters of entropy (current length: ${dedicated.length}).`);
        }
        active = dedicated;
    }
    else {
        active = dedicated || process.env.JWT_SECRET || "hrms-enterprise-master-sec-key-32";
    }
    const legacy = [
        "hrms-enterprise-master-sec-key-32",
        exports.LEGACY_DEFAULT_SEED_JWT,
    ];
    const jwt = process.env.JWT_SECRET?.trim();
    if (jwt && jwt !== active && !legacy.includes(jwt)) {
        legacy.push(jwt);
    }
    return { active, legacy };
}
/**
 * Startup diagnostic and security compliance check.
 * Evaluates environment configuration without exposing sensitive secret values.
 *
 * Differentiates:
 * - Mandatory startup secrets (JWT_SECRET): Failure halts application boot.
 * - Enabled service secrets (STORAGE, FILE_SIGNING, CONNECTORS, EMAIL, SETTINGS, AI):
 *   Reported as warnings or errors based on staging pre-flight options.
 */
function validateStartupCryptoConfig(options) {
    const warnings = [];
    const errors = [];
    // 1. Mandatory Core Authentication Secret
    try {
        getJwtSecret();
    }
    catch (err) {
        errors.push(err?.message || "Failed to validate mandatory JWT_SECRET.");
    }
    // 2. Service Keys Evaluation
    if (isProduction()) {
        const services = [
            {
                name: "STORAGE_ENCRYPTION_KEY",
                present: Boolean(process.env.STORAGE_ENCRYPTION_KEY?.trim()),
                desc: "Local encrypted storage key (64-char hex or >= 32 chars).",
            },
            {
                name: "FILE_SIGNING_SECRET",
                present: Boolean(process.env.FILE_SIGNING_SECRET?.trim()),
                desc: "Dedicated secret for file URL HMAC signatures (>= 32 chars).",
            },
            {
                name: "CONNECTOR_ENCRYPTION_KEY",
                present: Boolean((process.env.CONNECTOR_ENCRYPTION_KEY || process.env.TOKEN_ENCRYPTION_KEY)?.trim()),
                desc: "OAuth connector credentials key (64-char hex or >= 32 chars).",
            },
            {
                name: "EMAIL_CRYPTO_SECRET",
                present: Boolean((process.env.EMAIL_CRYPTO_SECRET || process.env.ENCRYPTION_KEY)?.trim()),
                desc: "Personal mailbox credentials key (>= 32 chars).",
            },
            {
                name: "SETTINGS_ENCRYPTION_KEY",
                present: Boolean((process.env.SETTINGS_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY)?.trim()),
                desc: "Tenant and system settings encryption key (>= 32 chars).",
            },
            {
                name: "AI_ENCRYPTION_KEY",
                present: Boolean((process.env.AI_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY)?.trim()),
                desc: "AI provider credential key (>= 32 chars).",
            },
        ];
        for (const s of services) {
            if (!s.present) {
                const msg = `${s.name} is unset in production. Required if ${s.desc} is enabled.`;
                if (options?.checkAllServices) {
                    errors.push(msg);
                }
                else {
                    warnings.push(msg);
                }
            }
        }
    }
    return {
        valid: errors.length === 0,
        warnings,
        errors,
    };
}
