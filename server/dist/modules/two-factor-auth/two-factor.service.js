"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFactorService = void 0;
exports.hashBackupCode = hashBackupCode;
exports.generateRandomBackupCodes = generateRandomBackupCodes;
exports.createHashedBackupCodeEntries = createHashedBackupCodeEntries;
const crypto_1 = __importDefault(require("crypto"));
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
const prisma_1 = require("../../prisma");
const settings_service_1 = require("../../services/settings/settings.service");
const audit_service_1 = require("../../services/audit.service");
const outbox_service_1 = require("../../services/outbox.service");
// In-memory replay cache: Map<`${userId}:${token}`, expiresAtTimestamp>
const replayCache = new Map();
// In-memory brute force tracker: Map<userId, { count: number; lockedUntil: number }>
const failureTracker = new Map();
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout
// Clean expired cache entries every 5 minutes
const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, expiresAt] of replayCache.entries()) {
        if (expiresAt <= now) {
            replayCache.delete(key);
        }
    }
    for (const [userId, state] of failureTracker.entries()) {
        if (state.lockedUntil <= now && state.count >= MAX_FAILURES) {
            failureTracker.delete(userId);
        }
    }
}, 5 * 60 * 1000);
if (cleanupTimer.unref) {
    cleanupTimer.unref();
}
const BACKUP_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 unambiguous chars (5 bits/char)
const DEFAULT_BACKUP_CODE_TTL_DAYS = Number(process.env.BACKUP_CODE_TTL_DAYS || 365);
function hashBackupCode(rawCode) {
    const normalized = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    return crypto_1.default.createHash("sha256").update(normalized).digest("hex");
}
/**
 * SEC-005: Cryptographically secure backup code generator using crypto.randomInt().
 * Generates 8-character codes (XXXX-XXXX) with 40 bits of entropy from an unambiguous alphabet.
 */
function generateRandomBackupCodes(count = 8) {
    const codes = new Set();
    while (codes.size < count) {
        let part1 = "";
        let part2 = "";
        for (let j = 0; j < 4; j++) {
            part1 += BACKUP_CODE_ALPHABET[crypto_1.default.randomInt(0, BACKUP_CODE_ALPHABET.length)];
            part2 += BACKUP_CODE_ALPHABET[crypto_1.default.randomInt(0, BACKUP_CODE_ALPHABET.length)];
        }
        codes.add(`${part1}-${part2}`);
    }
    return Array.from(codes);
}
function createHashedBackupCodeEntries(rawCodes, ttlDays = DEFAULT_BACKUP_CODE_TTL_DAYS) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
    const createdAt = now.toISOString();
    return rawCodes.map((code) => ({
        hash: hashBackupCode(code),
        createdAt,
        expiresAt,
    }));
}
function timingSafeHexMatch(a, b) {
    if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length || a.length === 0) {
        return false;
    }
    try {
        return crypto_1.default.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
    }
    catch {
        return false;
    }
}
class TwoFactorService {
    static getDb() {
        return prisma_1.rawPrisma || prisma_1.prisma;
    }
    /**
     * Pack AES-256-GCM components into storage string: iv:authTag:ciphertext
     */
    static serializeEncryptedSecret(secretBase32) {
        const enc = (0, settings_service_1.encryptSecret)(secretBase32);
        return `${enc.iv}:${enc.authTag}:${enc.ciphertext}`;
    }
    /**
     * Unpack and decrypt stored secret
     */
    static deserializeEncryptedSecret(stored) {
        const parts = stored.split(":");
        if (parts.length !== 3) {
            throw new Error("Invalid encrypted secret format");
        }
        const [iv, authTag, ciphertext] = parts;
        return (0, settings_service_1.decryptSecret)(ciphertext, iv, authTag);
    }
    /**
     * Check if user is locked out due to excessive failed attempts
     */
    static isLockedOut(userId) {
        const state = failureTracker.get(userId);
        if (!state)
            return { locked: false, secondsRemaining: 0 };
        if (state.count >= MAX_FAILURES && Date.now() < state.lockedUntil) {
            const seconds = Math.ceil((state.lockedUntil - Date.now()) / 1000);
            return { locked: true, secondsRemaining: seconds };
        }
        return { locked: false, secondsRemaining: 0 };
    }
    /**
     * Record a failed attempt
     */
    static recordFailure(userId) {
        const now = Date.now();
        const state = failureTracker.get(userId) || { count: 0, lockedUntil: 0 };
        state.count += 1;
        if (state.count >= MAX_FAILURES) {
            state.lockedUntil = now + LOCKOUT_MS;
            failureTracker.set(userId, state);
            return { locked: true, attemptsLeft: 0 };
        }
        failureTracker.set(userId, state);
        return { locked: false, attemptsLeft: MAX_FAILURES - state.count };
    }
    /**
     * Clear failure tracker on successful verification
     */
    static clearFailures(userId) {
        failureTracker.delete(userId);
    }
    /**
     * Step 1: Initiate TOTP Enrollment
     * Generates a base32 secret, otpauth URL, QR Code Data URL, and 8 backup codes.
     * Encrypts the secret and saves encrypted secret + hashed backup codes.
     */
    static async initiateTotpSetup(userId, tenantId, actorContext) {
        const db = this.getDb();
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true },
        });
        if (!user) {
            throw new Error("User not found");
        }
        const secret = speakeasy_1.default.generateSecret({
            length: 20,
            name: `MasterHRMS (${user.email})`,
            issuer: "MasterHRMS",
        });
        const otpauthUrl = speakeasy_1.default.otpauthURL({
            secret: secret.base32,
            label: `MasterHRMS (${user.email})`,
            issuer: "MasterHRMS",
            encoding: "base32",
        });
        const qrCodeDataUrl = await qrcode_1.default.toDataURL(otpauthUrl);
        const rawBackupCodes = generateRandomBackupCodes(8);
        const hashedBackupCodes = createHashedBackupCodeEntries(rawBackupCodes);
        const encryptedSecretStr = this.serializeEncryptedSecret(secret.base32);
        // Save pending secret and backup codes in database (twoFactorEnabled remains false until verified)
        await db.user.update({
            where: { id: userId },
            data: {
                twoFactorSecret: encryptedSecretStr,
                twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
            },
        });
        if (tenantId) {
            await audit_service_1.AuditService.logMutation({
                tenantId,
                actorId: userId,
                actorEmail: user.email,
                action: "two_factor.setup_initiated",
                entityType: "User",
                entityId: userId,
                ipAddress: actorContext?.ipAddress,
                userAgent: actorContext?.userAgent,
                metadata: { method: "TOTP" },
            });
        }
        // Return the raw secret and backup codes ONLY during enrollment
        return {
            secret: secret.base32,
            qrCode: qrCodeDataUrl,
            otpauthUrl,
            backupCodes: rawBackupCodes,
        };
    }
    /**
     * Step 2: Confirm TOTP Setup
     * Verifies the submitted 6-digit code against the newly provisioned secret.
     * If valid, activates 2FA on the account.
     */
    static async confirmTotpSetup(userId, token, tenantId, actorContext) {
        const cleanToken = token.trim();
        if (!/^\d{6}$/.test(cleanToken)) {
            return { success: false, error: "Verification code must be 6 digits." };
        }
        const db = this.getDb();
        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                twoFactorSecret: true,
            },
        });
        if (!user || !user.twoFactorSecret) {
            return { success: false, error: "2FA setup has not been initiated." };
        }
        let decryptedSecret;
        try {
            decryptedSecret = this.deserializeEncryptedSecret(user.twoFactorSecret);
        }
        catch {
            return { success: false, error: "Failed to decrypt secret key." };
        }
        const isValid = speakeasy_1.default.totp.verify({
            secret: decryptedSecret,
            encoding: "base32",
            token: cleanToken,
            window: 1, // ±30s drift tolerance
        });
        if (!isValid) {
            return { success: false, error: "Invalid verification code. Please check your authenticator app." };
        }
        this.clearFailures(userId);
        const now = new Date();
        await db.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: true,
                twoFactorConfirmedAt: now,
            },
        });
        if (tenantId) {
            await audit_service_1.AuditService.logMutation({
                tenantId,
                actorId: userId,
                actorEmail: user.email,
                action: "two_factor.totp_enabled",
                entityType: "User",
                entityId: userId,
                ipAddress: actorContext?.ipAddress,
                userAgent: actorContext?.userAgent,
                metadata: { method: "TOTP", confirmedAt: now },
            });
            await outbox_service_1.OutboxService.createOutboxEvent({
                tenantId,
                eventType: "two_factor.totp_enabled",
                entityType: "User",
                entityId: userId,
                actorId: userId,
                payload: { userId, email: user.email, confirmedAt: now.toISOString() },
            });
        }
        return { success: true, twoFactorEnabled: true };
    }
    /**
     * Verify TOTP code or Backup recovery code during login or step-up challenge.
     */
    static async verifyTotpOrBackup(userId, codeOrToken, tenantId, actorContext) {
        const lockout = this.isLockedOut(userId);
        if (lockout.locked) {
            return {
                valid: false,
                rateLimited: true,
                secondsRemaining: lockout.secondsRemaining,
                error: `Too many failed attempts. Account temporarily locked for ${Math.ceil(lockout.secondsRemaining / 60)} minutes.`,
            };
        }
        const raw = (codeOrToken || "").trim();
        if (!raw) {
            return { valid: false, error: "Code is required." };
        }
        const db = this.getDb();
        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                twoFactorEnabled: true,
                twoFactorSecret: true,
                twoFactorBackupCodes: true,
            },
        });
        if (!user || !user.twoFactorEnabled) {
            return { valid: false, error: "Two-factor authentication is not active for this account." };
        }
        // 1. Check if it is a 6-digit TOTP token
        if (/^\d{6}$/.test(raw) && user.twoFactorSecret) {
            // Replay check
            const replayKey = `${userId}:${raw}`;
            const expiresAt = replayCache.get(replayKey);
            if (expiresAt && expiresAt > Date.now()) {
                return { valid: false, error: "Code has already been used. Please wait for the next TOTP code." };
            }
            let decryptedSecret;
            try {
                decryptedSecret = this.deserializeEncryptedSecret(user.twoFactorSecret);
            }
            catch {
                return { valid: false, error: "Corrupted 2FA configuration." };
            }
            const isValid = speakeasy_1.default.totp.verify({
                secret: decryptedSecret,
                encoding: "base32",
                token: raw,
                window: 1, // ±30s
            });
            if (isValid) {
                replayCache.set(replayKey, Date.now() + 90 * 1000);
                this.clearFailures(userId);
                return { valid: true, method: "TOTP" };
            }
        }
        // 2. Check if it is a valid backup code (supports both structured entries with expiry & legacy string[] hashes)
        if (user.twoFactorBackupCodes) {
            let storedEntries = [];
            try {
                const parsed = JSON.parse(user.twoFactorBackupCodes);
                storedEntries = Array.isArray(parsed) ? parsed : [];
            }
            catch {
                storedEntries = [];
            }
            const submittedHash = hashBackupCode(raw);
            const nowMs = Date.now();
            let matchIndex = -1;
            let matchedExpired = false;
            for (let i = 0; i < storedEntries.length; i++) {
                const entry = storedEntries[i];
                const entryHash = typeof entry === "string" ? entry : entry?.hash;
                if (entryHash && timingSafeHexMatch(entryHash, submittedHash)) {
                    if (typeof entry !== "string" && entry.expiresAt && new Date(entry.expiresAt).getTime() <= nowMs) {
                        matchedExpired = true;
                    }
                    else {
                        matchIndex = i;
                    }
                    break;
                }
            }
            if (matchedExpired) {
                return {
                    valid: false,
                    error: "This backup recovery code has expired. Please use your authenticator app or regenerate backup codes.",
                };
            }
            if (matchIndex !== -1) {
                // Consume the backup code atomically (single-use)
                storedEntries.splice(matchIndex, 1);
                await db.user.update({
                    where: { id: userId },
                    data: {
                        twoFactorBackupCodes: JSON.stringify(storedEntries),
                    },
                });
                this.clearFailures(userId);
                if (tenantId) {
                    await audit_service_1.AuditService.logMutation({
                        tenantId,
                        actorId: userId,
                        actorEmail: user.email,
                        action: "two_factor.backup_code_used",
                        entityType: "User",
                        entityId: userId,
                        ipAddress: actorContext?.ipAddress,
                        userAgent: actorContext?.userAgent,
                        metadata: { remaining: storedEntries.length },
                    });
                    await outbox_service_1.OutboxService.createOutboxEvent({
                        tenantId,
                        eventType: "two_factor.backup_code_used",
                        entityType: "User",
                        entityId: userId,
                        actorId: userId,
                        payload: { userId, remaining: storedEntries.length },
                    });
                }
                return {
                    valid: true,
                    method: "BACKUP_CODE",
                    remainingBackupCodes: storedEntries.length,
                };
            }
        }
        // Both checks failed: record failure
        const failureResult = this.recordFailure(userId);
        if (failureResult.locked) {
            return {
                valid: false,
                rateLimited: true,
                secondsRemaining: LOCKOUT_MS / 1000,
                error: "Too many failed attempts. Account temporarily locked for 15 minutes.",
            };
        }
        return {
            valid: false,
            error: `Invalid verification code or backup code. (${failureResult.attemptsLeft} attempts remaining)`,
        };
    }
    /**
     * Regenerate 8 fresh backup codes. Requires valid TOTP authentication.
     */
    static async regenerateBackupCodes(userId, currentTotp, tenantId, actorContext) {
        const verifyResult = await this.verifyTotpOrBackup(userId, currentTotp, tenantId, actorContext);
        if (!verifyResult.valid) {
            return { success: false, error: verifyResult.error || "Invalid 2FA code." };
        }
        const newCodes = generateRandomBackupCodes(8);
        const newHashes = createHashedBackupCodeEntries(newCodes);
        const db = this.getDb();
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true },
        });
        await db.user.update({
            where: { id: userId },
            data: {
                twoFactorBackupCodes: JSON.stringify(newHashes),
            },
        });
        if (tenantId) {
            await audit_service_1.AuditService.logMutation({
                tenantId,
                actorId: userId,
                actorEmail: user?.email,
                action: "two_factor.backup_codes_regenerated",
                entityType: "User",
                entityId: userId,
                ipAddress: actorContext?.ipAddress,
                userAgent: actorContext?.userAgent,
                metadata: { count: newCodes.length },
            });
        }
        return { success: true, backupCodes: newCodes };
    }
    /**
     * Disable 2FA on the user account. Requires valid TOTP authentication.
     */
    static async disableTwoFactor(userId, currentTotp, tenantId, actorContext) {
        const verifyResult = await this.verifyTotpOrBackup(userId, currentTotp, tenantId, actorContext);
        if (!verifyResult.valid) {
            return { success: false, error: verifyResult.error || "Invalid 2FA code." };
        }
        const db = this.getDb();
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true },
        });
        await db.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                twoFactorBackupCodes: null,
                twoFactorConfirmedAt: null,
            },
        });
        if (tenantId) {
            await audit_service_1.AuditService.logMutation({
                tenantId,
                actorId: userId,
                actorEmail: user?.email,
                action: "two_factor.disabled",
                entityType: "User",
                entityId: userId,
                ipAddress: actorContext?.ipAddress,
                userAgent: actorContext?.userAgent,
            });
            await outbox_service_1.OutboxService.createOutboxEvent({
                tenantId,
                eventType: "two_factor.disabled",
                entityType: "User",
                entityId: userId,
                actorId: userId,
                payload: { userId, disabledAt: new Date().toISOString() },
            });
        }
        return { success: true, twoFactorEnabled: false };
    }
    /**
     * Get 2FA configuration status for user
     */
    static async getStatus(userId) {
        const db = this.getDb();
        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                twoFactorEnabled: true,
                twoFactorSecret: true,
                twoFactorBackupCodes: true,
                twoFactorConfirmedAt: true,
            },
        });
        if (!user) {
            throw new Error("User not found");
        }
        let remainingCodes = 0;
        if (user.twoFactorBackupCodes) {
            try {
                const parsed = JSON.parse(user.twoFactorBackupCodes);
                if (Array.isArray(parsed))
                    remainingCodes = parsed.length;
            }
            catch {
                remainingCodes = 0;
            }
        }
        return {
            twoFactorEnabled: Boolean(user.twoFactorEnabled),
            twoFactorMethod: user.twoFactorSecret ? "TOTP" : (user.twoFactorEnabled ? "EMAIL_OTP" : "NONE"),
            backupCodesRemaining: remainingCodes,
            confirmedAt: user.twoFactorConfirmedAt,
        };
    }
}
exports.TwoFactorService = TwoFactorService;
