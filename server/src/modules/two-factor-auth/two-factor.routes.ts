import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import { resolveTenantContext } from "../../middleware/tenant-context.middleware";
import { requireEntitlement } from "../../middleware/entitlements";
import { TwoFactorService } from "./two-factor.service";

export const twoFactorRouter = Router();

// Standard middleware chain: auth -> tenant resolution -> entitlement check
twoFactorRouter.use(requireAuth, resolveTenantContext, requireEntitlement("two-factor-auth"));

/**
 * GET /api/two-factor-auth/status
 * Get the current 2FA status and method for the authenticated user.
 */
twoFactorRouter.get("/status", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const status = await TwoFactorService.getStatus(userId);
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to retrieve 2FA status." });
  }
});

/**
 * POST /api/two-factor-auth/setup
 * Initiates TOTP setup, generating QR code, secret, and backup codes.
 */
twoFactorRouter.post("/setup", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const tenantId = req.user?.tenantId || (req as any).tenantId;
    const result = await TwoFactorService.initiateTotpSetup(userId, tenantId, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.json({
      success: true,
      ...result,
      message: "Scan the QR code with your authenticator app and save your backup codes in a secure place.",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to initiate 2FA setup." });
  }
});

/**
 * POST /api/two-factor-auth/confirm
 * Confirms setup with initial 6-digit TOTP code and activates 2FA.
 */
twoFactorRouter.post("/confirm", async (req: AuthRequest, res: Response) => {
  try {
    const rawCode = req.body?.code ?? req.body?.token;
    if (!rawCode) {
      return res.status(400).json({ error: "Verification code is required." });
    }
    const code = String(rawCode).trim();
    const userId = req.user!.userId;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const result = await TwoFactorService.confirmTotpSetup(userId, code, tenantId, {
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to confirm 2FA setup." });
  }
});

/**
 * POST /api/two-factor-auth/verify
 * Validates a TOTP or backup code for session challenge / step-up auth.
 */
twoFactorRouter.post("/verify", async (req: AuthRequest, res: Response) => {
  try {
    const rawCode = req.body?.code ?? req.body?.token;
    if (!rawCode) {
      return res.status(400).json({ error: "Verification code or backup code is required." });
    }
    const code = String(rawCode).trim();
    const userId = req.user!.userId;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const result = await TwoFactorService.verifyTotpOrBackup(userId, code, tenantId, {
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to verify code." });
  }
});

/**
 * POST /api/two-factor-auth/backup-codes/regenerate
 * Regenerates 8 fresh backup recovery codes. Requires current TOTP code.
 */
twoFactorRouter.post("/backup-codes/regenerate", async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Current TOTP code is required to regenerate backup codes." });
    }
    const userId = req.user!.userId;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const result = await TwoFactorService.regenerateBackupCodes(userId, String(code), tenantId, {
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to regenerate backup codes." });
  }
});

/**
 * POST /api/two-factor-auth/disable
 * Disables 2FA on the account. Requires current TOTP code.
 */
twoFactorRouter.post("/disable", async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Current TOTP code is required to disable 2FA." });
    }
    const userId = req.user!.userId;
    const tenantId = req.user?.tenantId || (req as any).tenantId;

    const result = await TwoFactorService.disableTwoFactor(userId, String(code), tenantId, {
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to disable 2FA." });
  }
});
