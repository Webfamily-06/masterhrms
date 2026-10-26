"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDerivedEncryptionKey = getDerivedEncryptionKey;
exports.encryptEmailSecret = encryptEmailSecret;
exports.decryptEmailSecret = decryptEmailSecret;
exports.isPrivateIp = isPrivateIp;
exports.validateHostForSsrf = validateHostForSsrf;
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("dns/promises"));
// ─── AES-256-GCM Secret Encryption Engine ────────────────────────
const ENCRYPTION_SALT = "master-hrms-user-email-secret-salt-v1";
function getDerivedEncryptionKey() {
    const rawKeyMaterial = process.env.ENCRYPTION_KEY ||
        process.env.JWT_SECRET ||
        "master-hrms-32-char-encryption-key-phrase!";
    return crypto_1.default.scryptSync(rawKeyMaterial, ENCRYPTION_SALT, 32);
}
function encryptEmailSecret(plaintext) {
    if (typeof plaintext !== "string") {
        throw new Error("Secret plaintext must be a string");
    }
    const key = getDerivedEncryptionKey();
    const iv = crypto_1.default.randomBytes(12); // Standard 96-bit IV for GCM
    const cipher = crypto_1.default.createCipheriv("aes-256-gcm", key, iv);
    let ciphertext = cipher.update(plaintext, "utf8", "hex");
    ciphertext += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return {
        ciphertext,
        iv: iv.toString("hex"),
        authTag,
    };
}
function decryptEmailSecret(encrypted) {
    if (!encrypted.ciphertext || !encrypted.iv || !encrypted.authTag) {
        throw new Error("Missing ciphertext, IV, or authentication tag for decryption");
    }
    const key = getDerivedEncryptionKey();
    const iv = Buffer.from(encrypted.iv, "hex");
    const authTag = Buffer.from(encrypted.authTag, "hex");
    if (iv.length !== 12) {
        throw new Error(`Invalid IV length: expected 12 bytes, got ${iv.length}`);
    }
    if (authTag.length !== 16) {
        throw new Error(`Invalid auth tag length: expected 16 bytes, got ${authTag.length}`);
    }
    const decipher = crypto_1.default.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    let plaintext = decipher.update(encrypted.ciphertext, "hex", "utf8");
    plaintext += decipher.final("utf8");
    return plaintext;
}
// ─── SSRF Protection & Host Validation ─────────────────────────────
const BLOCKED_HOST_PATTERNS = [
    /^localhost$/i,
    /^127\./,
    /^0\.0\.0\.0$/,
    /^::1$/,
    /^169\.254\./, // AWS/Cloud metadata & link-local
    /^10\./, // Private RFC1918 Class A
    /^192\.168\./, // Private RFC1918 Class C
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private RFC1918 Class B
    /^fc00:/i, // IPv6 Unique Local Address
    /^fe80:/i, // IPv6 Link-Local
];
function isPrivateIp(ip) {
    return BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(ip));
}
async function validateHostForSsrf(hostname) {
    const trimmed = hostname.trim();
    if (!trimmed) {
        return { valid: false, reason: "Hostname cannot be empty" };
    }
    // Check static disallowed names
    if (BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(trimmed))) {
        return { valid: false, reason: `Host ${trimmed} is a private, loopback, or metadata address (SSRF prohibited)` };
    }
    // Resolve hostname to IP to catch DNS rebinding or internal aliases
    try {
        const addresses = await promises_1.default.lookup(trimmed, { all: true });
        for (const record of addresses) {
            if (isPrivateIp(record.address)) {
                return {
                    valid: false,
                    reason: `Host ${trimmed} resolves to restricted IP ${record.address} (SSRF prohibited)`,
                };
            }
        }
    }
    catch (err) {
        // DNS resolution failure
        return { valid: false, reason: `Cannot resolve hostname ${trimmed}: ${err.message}` };
    }
    return { valid: true };
}
