"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.twoFactorRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const tenant_context_middleware_1 = require("../../middleware/tenant-context.middleware");
const entitlements_1 = require("../../middleware/entitlements");
const two_factor_service_1 = require("./two-factor.service");
exports.twoFactorRouter = (0, express_1.Router)();
// Standard middleware chain: auth -> tenant resolution -> entitlement check
exports.twoFactorRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, entitlements_1.requireEntitlement)("two-factor-auth"));
/**
 * GET /api/two-factor-auth/status
 * Get the current 2FA status and method for the authenticated user.
 */
exports.twoFactorRouter.get("/status", async (req, res) => {
    try {
        const userId = req.user.userId;
        const status = await two_factor_service_1.TwoFactorService.getStatus(userId);
        return res.json(status);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to retrieve 2FA status." });
    }
});
/**
 * POST /api/two-factor-auth/setup
 * Initiates TOTP setup, generating QR code, secret, and backup codes.
 */
exports.twoFactorRouter.post("/setup", async (req, res) => {
    try {
        const userId = req.user.userId;
        const tenantId = req.user?.tenantId || req.tenantId;
        const result = await two_factor_service_1.TwoFactorService.initiateTotpSetup(userId, tenantId, {
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
        });
        return res.json({
            success: true,
            ...result,
            message: "Scan the QR code with your authenticator app and save your backup codes in a secure place.",
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to initiate 2FA setup." });
    }
});
/**
 * POST /api/two-factor-auth/confirm
 * Confirms setup with initial 6-digit TOTP code and activates 2FA.
 */
exports.twoFactorRouter.post("/confirm", async (req, res) => {
    try {
        const rawCode = req.body?.code ?? req.body?.token;
        if (!rawCode) {
            return res.status(400).json({ error: "Verification code is required." });
        }
        const code = String(rawCode).trim();
        const userId = req.user.userId;
        const tenantId = req.user?.tenantId || req.tenantId;
        const result = await two_factor_service_1.TwoFactorService.confirmTotpSetup(userId, code, tenantId, {
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
        });
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        return res.json({
            success: true,
            twoFactorEnabled: true,
            message: "Two-Factor Authentication is now enabled on your account.",
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to confirm 2FA setup." });
    }
});
/**
 * POST /api/two-factor-auth/verify
 * Validates a TOTP or backup code for session challenge / step-up auth.
 */
exports.twoFactorRouter.post("/verify", async (req, res) => {
    try {
        const rawCode = req.body?.code ?? req.body?.token;
        if (!rawCode) {
            return res.status(400).json({ error: "Verification code or backup code is required." });
        }
        const code = String(rawCode).trim();
        const userId = req.user.userId;
        const tenantId = req.user?.tenantId || req.tenantId;
        const result = await two_factor_service_1.TwoFactorService.verifyTotpOrBackup(userId, code, tenantId, {
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
        });
        if (!result.valid) {
            const status = result.rateLimited ? 429 : 400;
            return res.status(status).json({
                valid: false,
                error: result.error,
                rateLimited: result.rateLimited,
                secondsRemaining: result.secondsRemaining,
            });
        }
        return res.json({
            valid: true,
            method: result.method,
            remainingBackupCodes: result.remainingBackupCodes,
            message: "Verification successful.",
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to verify code." });
    }
});
/**
 * POST /api/two-factor-auth/backup-codes/regenerate
 * Regenerates 8 fresh backup recovery codes. Requires current TOTP code.
 */
exports.twoFactorRouter.post("/backup-codes/regenerate", async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: "Current TOTP code is required to regenerate backup codes." });
        }
        const userId = req.user.userId;
        const tenantId = req.user?.tenantId || req.tenantId;
        const result = await two_factor_service_1.TwoFactorService.regenerateBackupCodes(userId, String(code), tenantId, {
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
        });
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        return res.json({
            success: true,
            backupCodes: result.backupCodes,
            message: "New backup codes generated. Old backup codes have been invalidated.",
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to regenerate backup codes." });
    }
});
/**
 * POST /api/two-factor-auth/disable
 * Disables 2FA on the account. Requires current TOTP code.
 */
exports.twoFactorRouter.post("/disable", async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: "Current TOTP code is required to disable 2FA." });
        }
        const userId = req.user.userId;
        const tenantId = req.user?.tenantId || req.tenantId;
        const result = await two_factor_service_1.TwoFactorService.disableTwoFactor(userId, String(code), tenantId, {
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
        });
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        return res.json({
            success: true,
            twoFactorEnabled: false,
            message: "Two-Factor Authentication has been disabled.",
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to disable 2FA." });
    }
});
