import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { prisma } from "../prisma";
import { generateToken, generateMfaToken, verifyMfaToken } from "../lib/jwt";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const authRouter = Router();

function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const part1 = Math.floor(1000 + Math.random() * 9000);
    const part2 = Math.floor(1000 + Math.random() * 9000);
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/register
authRouter.post("/register", async (req, res) => {
  try {
    const { email, password, fullName } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "User with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: {
          create: {
            id: crypto.randomUUID(),
            email,
            fullName: fullName || email.split("@")[0],
          },
        },
      },
      include: {
        profile: true,
        roles: true,
      },
    });

    const roles = user.roles.map((r) => r.role);
    const token = generateToken({
      userId: user.id,
      email: user.email,
      tenantId: user.profile?.tenantId,
      roles,
    });

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
        roles,
      },
      token,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: true,
        roles: true,
        employees: true,
      },
    });

    if (!user) {
      // Check if an employee exists with this email who hasn't had their user account initialized yet
      const employee = await prisma.employee.findFirst({
        where: { email: normalizedEmail },
      });

      if (employee) {
        // If employee logs in with initial default password "Password@123"
        if (password === "Password@123") {
          const passwordHash = await bcrypt.hash(password, 10);
          user = await prisma.user.create({
            data: {
              email: normalizedEmail,
              passwordHash,
              profile: {
                create: {
                  fullName: `${employee.firstName} ${employee.lastName}`.trim() || normalizedEmail,
                  email: normalizedEmail,
                  phone: employee.phone || null,
                  tenantId: employee.tenantId,
                },
              },
              roles: {
                create: {
                  role: "employee",
                  tenantId: employee.tenantId,
                },
              },
            },
            include: {
              profile: true,
              roles: true,
              employees: true,
            },
          });

          await prisma.employee.update({
            where: { id: employee.id },
            data: { userId: user.id },
          });
        } else {
          return res.status(400).json({
            error:
              "Invalid email or password. Default initial employee password is Password@123.",
          });
        }
      } else {
        return res.status(400).json({ error: "Invalid email or password." });
      }
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    // 2-Step Authenticator (2FA) Check
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const mfaToken = generateMfaToken({ userId: user.id, email: user.email });
      return res.json({
        requires2FA: true,
        mfaToken,
        email: user.email,
        message: "Two-factor authentication code required.",
      });
    }

    const roles =
      user.roles && user.roles.length > 0
        ? user.roles.map((r) => r.role)
        : ["employee"];
    const tenantId =
      user.profile?.tenantId || (user.employees && user.employees[0]?.tenantId) || null;

    const token = generateToken({
      userId: user.id,
      email: user.email,
      tenantId,
      roles,
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
        roles,
      },
      roles,
      token,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

/**
 * -------------------------------------------------------------
 * 2FA ENDPOINTS (TOTP + BACKUP CODES)
 * -------------------------------------------------------------
 */

// POST /api/auth/2fa/verify-login
authRouter.post("/2fa/verify-login", async (req, res) => {
  try {
    const { mfaToken, code } = req.body;

    if (!mfaToken || !code) {
      return res.status(400).json({ error: "MFA session token and authentication code are required." });
    }

    let payload: any;
    try {
      payload = verifyMfaToken(mfaToken);
    } catch {
      return res.status(401).json({ error: "2FA session expired. Please sign in again." });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        profile: true,
        roles: true,
      },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ error: "Invalid user or 2FA is not enabled." });
    }

    const cleanCode = String(code).trim().replace(/\s+/g, "");
    let isValid = false;

    // 1. Verify standard 6-digit TOTP token
    if (/^\d{6}$/.test(cleanCode)) {
      isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: cleanCode,
        window: 1, // +/- 30 seconds clock drift allowance
      });
    }

    // 2. Check emergency backup code if TOTP failed
    if (!isValid && user.twoFactorBackupCodes) {
      try {
        const backupCodes: string[] = JSON.parse(user.twoFactorBackupCodes);
        const index = backupCodes.indexOf(cleanCode);
        if (index !== -1) {
          isValid = true;
          // Consume and remove the used backup code
          backupCodes.splice(index, 1);
          await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorBackupCodes: JSON.stringify(backupCodes) },
          });
        }
      } catch (e) {
        console.error("Backup code parse error:", e);
      }
    }

    if (!isValid) {
      return res.status(400).json({ error: "Invalid 6-digit authenticator code or emergency backup code." });
    }

    const roles = user.roles.map((r) => r.role);
    const token = generateToken({
      userId: user.id,
      email: user.email,
      tenantId: user.profile?.tenantId,
      roles,
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
        roles,
      },
      roles,
      token,
      message: "Two-step verification succeeded.",
    });
  } catch (err: any) {
    console.error("[2fa/verify-login] error:", err);
    return res.status(500).json({ error: err.message || "Failed to verify 2FA code." });
  }
});

// GET /api/auth/2fa/status
authRouter.get("/2fa/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        twoFactorEnabled: true,
        twoFactorConfirmedAt: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    let remainingBackupCodesCount = 0;
    if (user.twoFactorBackupCodes) {
      try {
        const codes = JSON.parse(user.twoFactorBackupCodes);
        remainingBackupCodesCount = Array.isArray(codes) ? codes.length : 0;
      } catch {}
    }

    return res.json({
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      confirmedAt: user.twoFactorConfirmedAt,
      remainingBackupCodesCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to get 2FA status." });
  }
});

// POST /api/auth/2fa/generate
authRouter.post("/2fa/generate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Generate RFC 6238 Base32 Secret Key
    const secret = speakeasy.generateSecret({
      name: `Master HRMS (${user.email})`,
      issuer: "Master HRMS",
      length: 20,
    });

    // Generate standard QR code data URI for mobile camera scan
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url || "");

    // Temporarily persist unconfirmed secret
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret.base32 },
    });

    return res.json({
      secret: secret.base32,
      qrCodeDataUrl,
      otpauthUrl: secret.otpauth_url,
    });
  } catch (err: any) {
    console.error("[2fa/generate] error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate 2FA secret." });
  }
});

// POST /api/auth/2fa/enable
authRouter.post("/2fa/enable", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Current password and 6-digit TOTP code are required." });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: "Please generate a 2FA QR code before enabling." });
    }

    // 1. Verify account password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Incorrect account password." });
    }

    // 2. Verify 6-digit TOTP token
    const cleanToken = String(token).trim();
    const isTokenValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: cleanToken,
      window: 1,
    });

    if (!isTokenValid) {
      return res.status(400).json({ error: "Invalid 6-digit code. Please check your Authenticator app clock." });
    }

    // 3. Generate 8 single-use recovery backup codes
    const backupCodes = generateBackupCodes(8);

    // 4. Activate 2FA on user account
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(backupCodes),
        twoFactorConfirmedAt: new Date(),
      },
    });

    return res.json({
      message: "Two-Factor Authentication is now enabled!",
      backupCodes,
      twoFactorEnabled: true,
    });
  } catch (err: any) {
    console.error("[2fa/enable] error:", err);
    return res.status(500).json({ error: err.message || "Failed to enable 2FA." });
  }
});

// POST /api/auth/2fa/disable
authRouter.post("/2fa/disable", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { password, token } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Account password is required to disable 2FA." });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // 1. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Incorrect account password." });
    }

    // 2. Verify TOTP or backup code if token provided
    if (token && user.twoFactorSecret) {
      const cleanToken = String(token).trim();
      let isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: cleanToken,
        window: 1,
      });

      if (!isValid && user.twoFactorBackupCodes) {
        try {
          const backupCodes: string[] = JSON.parse(user.twoFactorBackupCodes);
          isValid = backupCodes.includes(cleanToken);
        } catch {}
      }

      if (!isValid) {
        return res.status(400).json({ error: "Invalid authenticator or backup code." });
      }
    }

    // 3. Disable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        twoFactorConfirmedAt: null,
      },
    });

    return res.json({
      message: "Two-Factor Authentication has been disabled.",
      twoFactorEnabled: false,
    });
  } catch (err: any) {
    console.error("[2fa/disable] error:", err);
    return res.status(500).json({ error: err.message || "Failed to disable 2FA." });
  }
});

// POST /api/auth/2fa/backup-codes/regenerate
authRouter.post("/2fa/backup-codes/regenerate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { password, token } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ error: "2FA is not enabled on this account." });
    }

    // Verify password
    if (password) {
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(400).json({ error: "Incorrect password." });
      }
    }

    // Verify TOTP token
    if (token) {
      const cleanToken = String(token).trim();
      const isTokenValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: cleanToken,
        window: 1,
      });
      if (!isTokenValid) {
        return res.status(400).json({ error: "Invalid 6-digit authenticator code." });
      }
    }

    const backupCodes = generateBackupCodes(8);
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorBackupCodes: JSON.stringify(backupCodes) },
    });

    return res.json({
      message: "New recovery backup codes generated.",
      backupCodes,
    });
  } catch (err: any) {
    console.error("[2fa/backup-codes:regenerate] error:", err);
    return res.status(500).json({ error: err.message || "Failed to regenerate backup codes." });
  }
});

// GET /api/auth/me
authRouter.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        profile: {
          include: {
            tenant: true,
          },
        },
        roles: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.profile) {
      let defaultTenant = await prisma.tenant.findFirst({
        where: { slug: "default-workspace" },
      });
      if (!defaultTenant) {
        defaultTenant = await prisma.tenant.create({
          data: {
            name: "Master Workspace",
            slug: "default-workspace",
          },
        });
      }

      await prisma.profile.create({
        data: {
          userId: user.id,
          email: user.email,
          fullName: user.email.split("@")[0],
          tenantId: defaultTenant.id,
        },
      });

      user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        include: {
          profile: {
            include: {
              tenant: true,
            },
          },
          roles: true,
        },
      });
    } else if (!user.profile.tenantId) {
      let defaultTenant = await prisma.tenant.findFirst({
        where: { slug: "default-workspace" },
      });
      if (!defaultTenant) {
        defaultTenant = await prisma.tenant.create({
          data: {
            name: "Master Workspace",
            slug: "default-workspace",
          },
        });
      }

      await prisma.profile.update({
        where: { userId: user.id },
        data: { tenantId: defaultTenant.id },
      });

      user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        include: {
          profile: {
            include: {
              tenant: true,
            },
          },
          roles: true,
        },
      });
    }

    const roles = user!.roles.map((r) => r.role);

    return res.json({
      id: user!.id,
      email: user!.email,
      profile: user!.profile,
      roles,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/auth/claim-super-admin
authRouter.post("/claim-super-admin", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const existingSuper = await prisma.userRole.findFirst({
      where: { role: "super_admin" },
    });

    if (existingSuper) {
      return res.status(400).json({
        success: false,
        error: "A super admin already exists. Ask them to promote your account.",
      });
    }

    await prisma.userRole.create({
      data: {
        id: crypto.randomUUID(),
        userId: req.user!.userId,
        role: "super_admin",
      },
    });

    return res.json({ success: true, message: "Super admin claimed successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/auth/bootstrap-tenant
authRouter.post("/bootstrap-tenant", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug } = req.body;
    const finalName = name || "Primary Workspace";
    const finalSlug =
      slug ||
      finalName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
        "-" +
        Math.random().toString(36).slice(2, 6);

    const tenant = await prisma.tenant.create({
      data: {
        name: finalName,
        slug: finalSlug,
      },
    });

    // Link profile to tenant
    await prisma.profile.update({
      where: { userId: req.user!.userId },
      data: { tenantId: tenant.id },
    });

    // Assign hr_admin role
    await prisma.userRole.upsert({
      where: {
        userId_role_tenantId: {
          userId: req.user!.userId,
          role: "hr_admin",
          tenantId: tenant.id,
        },
      },
      update: {},
      create: {
        id: crypto.randomUUID(),
        userId: req.user!.userId,
        role: "hr_admin",
        tenantId: tenant.id,
      },
    });

    return res.json({ success: true, tenant });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// PUT /api/auth/profile
authRouter.put("/profile", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, avatarUrl, password } = req.body;

    if (fullName !== undefined || avatarUrl !== undefined) {
      await prisma.profile.update({
        where: { userId: req.user!.userId },
        data: {
          ...(fullName !== undefined ? { fullName } : {}),
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        },
      });
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { passwordHash },
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        profile: {
          include: {
            tenant: true,
          },
        },
        roles: true,
      },
    });

    return res.json({
      success: true,
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        profile: updatedUser!.profile,
        roles: updatedUser!.roles.map((r) => r.role),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ─── OAuth 2.0 Configuration & Social Login Handlers ─────────────────────────

async function getPlatformOAuthConfig(req?: any) {
  try {
    const page = await prisma.cmsPage.findUnique({
      where: { slug: "system-platform-settings" },
    });
    const c = (page?.content as any) || {};

    // Dynamic Host Resolution: If custom domain configured, use it; otherwise detect from request headers
    const reqHost = req ? `${req.protocol}://${req.get("host")}` : "http://localhost:4000";
    const oauthBaseUrl = (c.oauthBaseUrl || reqHost || "http://localhost:4000").replace(/\/+$/, "");
    const frontendBaseUrl = (c.frontendBaseUrl || (req ? `${req.protocol}://${req.hostname}:8080` : "http://localhost:8080")).replace(/\/+$/, "");

    return {
      oauthBaseUrl,
      frontendBaseUrl,
      google: {
        enabled: c.googleEnabled ?? true,
        clientId: c.googleClientId || process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: c.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || "",
        callbackUrl: c.googleCallbackUrl || `${oauthBaseUrl}/api/auth/oauth/google/callback`,
        scope: c.googleScope || "openid email profile",
      },
      apple: {
        enabled: c.appleEnabled ?? true,
        clientId: c.appleClientId || process.env.APPLE_CLIENT_ID || "",
        teamId: c.appleTeamId || "",
        keyId: c.appleKeyId || "",
        privateKey: c.applePrivateKey || "",
        callbackUrl: c.appleCallbackUrl || `${oauthBaseUrl}/api/auth/oauth/apple/callback`,
      },
      linkedin: {
        enabled: c.linkedinEnabled ?? true,
        clientId: c.linkedinClientId || process.env.LINKEDIN_CLIENT_ID || "",
        clientSecret: c.linkedinClientSecret || process.env.LINKEDIN_CLIENT_SECRET || "",
        callbackUrl: c.linkedinCallbackUrl || `${oauthBaseUrl}/api/auth/oauth/linkedin/callback`,
        scope: c.linkedinScope || "openid profile email",
      },
      facebook: {
        enabled: c.facebookEnabled ?? true,
        appId: c.facebookAppId || process.env.FACEBOOK_APP_ID || "",
        appSecret: c.facebookAppSecret || process.env.FACEBOOK_APP_SECRET || "",
        callbackUrl: c.facebookCallbackUrl || `${oauthBaseUrl}/api/auth/oauth/facebook/callback`,
        scope: c.facebookScope || "email,public_profile",
      },
    };
  } catch {
    const defaultBase = req ? `${req.protocol}://${req.get("host")}` : "http://localhost:4000";
    return {
      oauthBaseUrl: defaultBase,
      frontendBaseUrl: "http://localhost:8080",
      google: { enabled: true, clientId: "", clientSecret: "", callbackUrl: `${defaultBase}/api/auth/oauth/google/callback`, scope: "openid email profile" },
      apple: { enabled: true, clientId: "", teamId: "", keyId: "", privateKey: "", callbackUrl: `${defaultBase}/api/auth/oauth/apple/callback` },
      linkedin: { enabled: true, clientId: "", clientSecret: "", callbackUrl: `${defaultBase}/api/auth/oauth/linkedin/callback`, scope: "openid profile email" },
      facebook: { enabled: true, appId: "", appSecret: "", callbackUrl: `${defaultBase}/api/auth/oauth/facebook/callback`, scope: "email,public_profile" },
    };
  }
}

// GET /api/auth/oauth/config (Public endpoint for frontend auth buttons)
authRouter.get("/oauth/config", async (req, res) => {
  try {
    const config = await getPlatformOAuthConfig(req);
    return res.json({
      oauthBaseUrl: config.oauthBaseUrl,
      google: {
        enabled: Boolean(config.google.enabled && config.google.clientId),
        configured: Boolean(config.google.clientId),
      },
      apple: {
        enabled: Boolean(config.apple.enabled && config.apple.clientId),
        configured: Boolean(config.apple.clientId),
      },
      linkedin: {
        enabled: Boolean(config.linkedin.enabled && config.linkedin.clientId),
        configured: Boolean(config.linkedin.clientId),
      },
      facebook: {
        enabled: Boolean(config.facebook.enabled && config.facebook.appId),
        configured: Boolean(config.facebook.appId),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch OAuth config" });
  }
});

// GET /api/auth/oauth/:provider (Initiates OAuth redirect to provider)
authRouter.get("/oauth/:provider", async (req, res) => {
  const { provider } = req.params;
  const config = await getPlatformOAuthConfig(req);
  const state = crypto.randomUUID();

  let authUrl = "";

  if (provider === "google") {
    if (!config.google.clientId) {
      return res.redirect(
        `${config.frontendBaseUrl}/auth?error=${encodeURIComponent("Google OAuth is not configured yet in Super Admin Settings.")}`,
      );
    }
    const params = new URLSearchParams({
      client_id: config.google.clientId,
      redirect_uri: config.google.callbackUrl,
      response_type: "code",
      scope: config.google.scope,
      access_type: "offline",
      prompt: "select_account",
      state,
    });
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  } else if (provider === "apple") {
    if (!config.apple.clientId) {
      return res.redirect(
        `${config.frontendBaseUrl}/auth?error=${encodeURIComponent("Apple Services ID is not configured yet in Super Admin Settings.")}`,
      );
    }
    const params = new URLSearchParams({
      client_id: config.apple.clientId,
      redirect_uri: config.apple.callbackUrl,
      response_type: "code",
      response_mode: "form_post",
      scope: "name email",
      state,
    });
    authUrl = `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  } else if (provider === "linkedin") {
    if (!config.linkedin.clientId) {
      return res.redirect(
        `${config.frontendBaseUrl}/auth?error=${encodeURIComponent("LinkedIn Client ID is not configured yet in Super Admin Settings.")}`,
      );
    }
    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.linkedin.clientId,
      redirect_uri: config.linkedin.callbackUrl,
      scope: config.linkedin.scope,
      state,
    });
    authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  } else if (provider === "facebook") {
    if (!config.facebook.appId) {
      return res.redirect(
        `${config.frontendBaseUrl}/auth?error=${encodeURIComponent("Facebook App ID is not configured yet in Super Admin Settings.")}`,
      );
    }
    const params = new URLSearchParams({
      client_id: config.facebook.appId,
      redirect_uri: config.facebook.callbackUrl,
      scope: config.facebook.scope,
      state,
    });
    authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  } else {
    return res.status(400).json({ error: "Unsupported OAuth provider" });
  }

  return res.redirect(authUrl);
});

// GET & POST /api/auth/oauth/:provider/callback (Exchange code, fetch profile, upsert user & issue JWT)
async function handleOAuthCallback(req: any, res: Response) {
  const { provider } = req.params;
  const config = await getPlatformOAuthConfig();
  const code = (req.query?.code as string) || (req.body?.code as string);
  const error = (req.query?.error_description as string) || (req.query?.error as string);

  if (error) {
    return res.redirect(
      `${config.frontendBaseUrl}/auth?error=${encodeURIComponent(`${provider.toUpperCase()} Login cancelled or failed: ${error}`)}`,
    );
  }

  if (!code) {
    return res.redirect(
      `${config.frontendBaseUrl}/auth?error=${encodeURIComponent(`Missing authorization code from ${provider}`)}`,
    );
  }

  try {
    let email = "";
    let fullName = "";
    let avatarUrl = "";

    if (provider === "google") {
      // 1. Exchange code for access token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: config.google.clientId,
          client_secret: config.google.clientSecret,
          redirect_uri: config.google.callbackUrl,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        throw new Error(tokenData.error_description || "Failed to exchange Google authorization token");
      }

      // 2. Fetch user profile
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();
      email = userData.email;
      fullName = userData.name || userData.given_name || email.split("@")[0];
      avatarUrl = userData.picture || "";
    } else if (provider === "linkedin") {
      // 1. Exchange code for LinkedIn access token
      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: config.linkedin.clientId,
          client_secret: config.linkedin.clientSecret,
          redirect_uri: config.linkedin.callbackUrl,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        throw new Error(tokenData.error_description || "Failed to exchange LinkedIn authorization token");
      }

      // 2. Fetch userinfo from OpenID endpoint
      const userRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();
      email = userData.email;
      fullName = userData.name || `${userData.given_name || ""} ${userData.family_name || ""}`.trim() || email.split("@")[0];
      avatarUrl = userData.picture || "";
    } else if (provider === "facebook") {
      // 1. Exchange code for Facebook token
      const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${config.facebook.appId}&client_secret=${config.facebook.appSecret}&redirect_uri=${encodeURIComponent(config.facebook.callbackUrl)}&code=${code}`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (!tokenData.access_token) {
        throw new Error(tokenData.error?.message || "Failed to exchange Facebook authorization token");
      }

      // 2. Fetch user info
      const userRes = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${tokenData.access_token}`,
      );
      const userData = await userRes.json();
      email = userData.email || `${userData.id}@facebook.user`;
      fullName = userData.name || email.split("@")[0];
      avatarUrl = userData.picture?.data?.url || "";
    } else if (provider === "apple") {
      // Apple handles email on first authorization
      email = req.body?.user ? JSON.parse(req.body.user).email : `apple_${Date.now()}@privaterelay.appleid.com`;
      fullName = "Apple User";
    }

    if (!email) {
      throw new Error(`Could not retrieve verified email address from ${provider}`);
    }

    // 3. Find or Create User in MySQL database
    let user: any = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: { include: { tenant: true } },
        roles: true,
      },
    });

    if (!user) {
      // Get or create default workspace tenant
      let defaultTenant = await prisma.tenant.findFirst({
        where: { slug: "default-workspace" },
      });
      if (!defaultTenant) {
        defaultTenant = await prisma.tenant.create({
          data: { name: "Master Workspace", slug: "default-workspace" },
        });
      }

      const randomPassword = await bcrypt.hash(crypto.randomUUID(), 10);

      user = await prisma.user.create({
        data: {
          email,
          passwordHash: randomPassword,
          profile: {
            create: {
              id: crypto.randomUUID(),
              email,
              fullName: fullName || email.split("@")[0],
              avatarUrl: avatarUrl || null,
              tenantId: defaultTenant.id,
            },
          },
          roles: {
            create: {
              id: crypto.randomUUID(),
              role: "employee",
              tenantId: defaultTenant.id,
            },
          },
        },
        include: {
          profile: { include: { tenant: true } },
          roles: true,
        },
      });
    }

    if (!user) {
      throw new Error("Failed to create or retrieve user account.");
    }

    const roles = user.roles ? user.roles.map((r: any) => r.role) : ["employee"];
    const token = generateToken({
      userId: user.id,
      email: user.email,
      tenantId: user.profile?.tenantId || null,
      roles: roles.length > 0 ? roles : ["employee"],
    });

    return res.redirect(
      `${config.frontendBaseUrl}/auth?token=${token}&provider=${provider}`,
    );
  } catch (err: any) {
    console.error(`OAuth Callback Error (${provider}):`, err);
    return res.redirect(
      `${config.frontendBaseUrl}/auth?error=${encodeURIComponent(err.message || `OAuth authentication failed with ${provider}`)}`,
    );
  }
}

authRouter.get("/oauth/:provider/callback", handleOAuthCallback);
authRouter.post("/oauth/:provider/callback", handleOAuthCallback);

/**
 * PUT /api/auth/tenant
 * Updates organization details (name, logoUrl) for current tenant
 */
authRouter.put("/tenant", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { name, logoUrl } = req.body;
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(logoUrl !== undefined && { logoUrl }),
      },
    });

    return res.json({ success: true, tenant: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update tenant organization." });
  }
});

/**
 * POST /api/auth/change-password
 * Allows any authenticated user/employee to change their password
 */
authRouter.post("/change-password", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User record not found." });
    }

    // Check current password if provided
    if (currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: "Incorrect current password." });
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return res.json({ success: true, message: "Your password has been changed successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update password." });
  }
});

