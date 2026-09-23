import { sendTwoFactorOtpEmail } from "../lib/email";
import { createOrReplaceOtp, verifyOtpCode, checkResendEligibility, maskEmail } from "../lib/otp";
import { ERP_MODULES } from "../lib/erp-modules";
import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { prisma } from "../prisma";
import { generateToken, generateMfaToken, verifyMfaToken } from "../lib/jwt";
import { requireAuth, requireSuperAdmin, AuthRequest } from "../middleware/auth";

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

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(10),
  newPassword: z.string().min(6),
});

const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(10),
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
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Internal server error" });
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

    if (!user) return res.status(401).json({ error: "Invalid email or password." });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    // Optional: Allow disabling mandatory 2FA via environment variable (e.g. for staging or when SMTP is in maintenance)
    const is2faDisabled = process.env.ENABLE_2FA === "false" || process.env.MANDATORY_2FA === "false";
    if (is2faDisabled) {
      const roles = user.roles.map((r) => r.role);
      const token = generateToken({
        userId: user.id,
        email: user.email,
        tenantId: user.profile?.tenantId,
        roles,
      });
      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          profile: user.profile,
          roles,
        },
        roles,
        message: "Signed in successfully!",
      });
    }

    // Mandatory Email OTP Two-Factor Authentication on EVERY login
    const isSetup = !user.twoFactorEnabled;
    const { otp } = await createOrReplaceOtp(user.id);

    const emailResult = await sendTwoFactorOtpEmail({
      toEmail: user.email,
      otp,
      fullName: user.profile?.fullName || undefined,
      isSetup,
    });

    if (!emailResult.success) {
      console.warn(`⚠️ [2FA OTP] Email dispatch to ${user.email} failed: ${emailResult.error}`);
      console.log(`🔑 [2FA LOGIN CODE] Use this code to sign in for ${user.email}: [${otp}]`);
    }

    const mfaToken = generateMfaToken({ userId: user.id, email: user.email });

    // Return temporary 2FA state - NO full session token issued before OTP verification
    return res.json({
      requires2FA: true,
      isSetup,
      mfaToken,
      email: user.email,
      maskedEmail: maskEmail(user.email),
      twoFactorMethod: "EMAIL_OTP",
      emailSent: emailResult.success,
      emailError: emailResult.error || undefined,
      devOtp: !emailResult.success || process.env.NODE_ENV !== "production" ? otp : undefined,
      message: emailResult.success
        ? (isSetup
            ? "2FA Setup Required: A 6-digit verification code has been sent to your registered email."
            : "A 6-digit verification code has been sent to your registered email.")
        : `Verification code generated, but email delivery encountered an issue (${emailResult.error}). Please check server logs or SMTP settings.`,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/auth/forgot-password
authRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });

    if (!user) {
      return res.json({
        success: true,
        message: "If an account exists with this email, a password reset code has been sent.",
        maskedEmail: maskEmail(normalizedEmail),
      });
    }

    const { otp } = await createOrReplaceOtp(user.id);
    const emailResult = await sendTwoFactorOtpEmail({
      toEmail: user.email,
      otp,
      fullName: user.profile?.fullName || undefined,
      isSetup: false,
    });

    if (!emailResult.success) {
      console.log(`🔑 [PASSWORD RESET CODE] Reset OTP for ${user.email}: [${otp}]`);
    }

    return res.json({
      success: true,
      message: "Password reset code sent to your email.",
      maskedEmail: maskEmail(user.email),
      ...(process.env.NODE_ENV === "development" || !emailResult.success ? { previewCode: otp } : {}),
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(500).json({ error: err.message || "Failed to process forgot password request." });
  }
});

// POST /api/auth/reset-password
authRouter.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = resetPasswordSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid password reset request." });
    }

    const verification = await verifyOtpCode(user.id, code);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.error || "Invalid or expired reset code." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return res.json({
      success: true,
      message: "Password has been successfully updated. You can now sign in with your new credentials.",
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(500).json({ error: err.message || "Failed to reset password." });
  }
});

// POST /api/auth/verify-email
authRouter.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = verifyEmailSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(404).json({ error: "User account not found." });
    }

    const verification = await verifyOtpCode(user.id, code);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.error || "Invalid or expired verification code." });
    }

    return res.json({
      success: true,
      message: "Email address verified successfully!",
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(500).json({ error: err.message || "Failed to verify email." });
  }
});

// POST /api/auth/resend-verification
authRouter.post("/resend-verification", async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User account not found." });
    }

    const { otp } = await createOrReplaceOtp(user.id);
    const emailResult = await sendTwoFactorOtpEmail({
      toEmail: user.email,
      otp,
      fullName: user.profile?.fullName || undefined,
      isSetup: false,
    });

    return res.json({
      success: true,
      message: "New verification code has been dispatched.",
      maskedEmail: maskEmail(user.email),
      ...(process.env.NODE_ENV === "development" || !emailResult.success ? { previewCode: otp } : {}),
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(500).json({ error: err.message || "Failed to resend verification code." });
  }
});

/**
 * -------------------------------------------------------------
 * 2FA ENDPOINTS (EMAIL OTP & SECURITY)
 * -------------------------------------------------------------
 */

// POST /api/auth/2fa/verify-login
authRouter.post("/2fa/verify-login", async (req, res) => {
  try {
    const { mfaToken, code } = req.body;

    if (!mfaToken || !code) {
      return res.status(400).json({ error: "MFA session token and 6-digit verification code are required." });
    }

    let payload: any;
    try {
      payload = verifyMfaToken(mfaToken);
    } catch {
      return res.status(401).json({ error: "2FA session has expired. Please sign in again." });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        profile: {
          include: {
            tenant: true,
          },
        },
        roles: true,
        employees: true,
      },
    });

    if (!user) {
      return res.status(400).json({ error: "User account not found." });
    }

    // Verify submitted 6-digit Email OTP against database hash
    const verification = await verifyOtpCode(user.id, String(code));
    if (!verification.valid) {
      return res.status(400).json({ error: verification.error || "Invalid verification code." });
    }

    // If first-time 2FA setup, mark enabled and record confirmation timestamp
    const wasSetup = !user.twoFactorEnabled;
    if (wasSetup) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: true,
          twoFactorConfirmedAt: new Date(),
        },
      });
    }

    // Create full authenticated session token
    const roles = user.roles.map((r) => r.role);
    const token = generateToken({
      userId: user.id,
      email: user.email,
      tenantId: user.profile?.tenantId,
      roles,
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
        roles,
        twoFactorEnabled: true,
      },
      roles,
      token,
      message: wasSetup
        ? "Two-Factor Authentication setup complete. Welcome to your workspace!"
        : "Verification successful. Welcome back!",
    });
  } catch (err: any) {
    console.error("[2fa/verify-login] error:", err);
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Failed to verify 2FA code." });
  }
});

// POST /api/auth/2fa/resend
authRouter.post("/2fa/resend", async (req, res) => {
  try {
    const { mfaToken } = req.body;

    if (!mfaToken) {
      return res.status(400).json({ error: "MFA session token is required to resend verification code." });
    }

    let payload: any;
    try {
      payload = verifyMfaToken(mfaToken);
    } catch {
      return res.status(401).json({ error: "2FA session has expired. Please sign in again." });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Enforce 30-second resend cooldown
    const eligibility = await checkResendEligibility(user.id);
    if (!eligibility.allowed) {
      return res.status(429).json({
        error: `Please wait ${eligibility.secondsRemaining} second${eligibility.secondsRemaining === 1 ? "" : "s"} before requesting a new code.`,
        secondsRemaining: eligibility.secondsRemaining,
      });
    }

    // Invalidate prior unused OTP and generate a fresh one
    const { otp } = await createOrReplaceOtp(user.id);

    // Send fresh OTP email
    const emailResult = await sendTwoFactorOtpEmail({
      toEmail: user.email,
      otp,
      fullName: user.profile?.fullName || undefined,
      isSetup: !user.twoFactorEnabled,
    });

    if (!emailResult.success) {
      console.warn(`⚠️ [2FA RESEND] Email dispatch to ${user.email} failed: ${emailResult.error}`);
      console.log(`🔑 [2FA RESEND CODE] Use this code to sign in for ${user.email}: [${otp}]`);
    }

    return res.json({
      success: true,
      emailSent: emailResult.success,
      emailError: emailResult.error || undefined,
      devOtp: !emailResult.success || process.env.NODE_ENV !== "production" ? otp : undefined,
      message: emailResult.success
        ? "A fresh 6-digit verification code has been sent to your registered email."
        : `Fresh code generated, but email delivery encountered an issue (${emailResult.error}).`,
      maskedEmail: maskEmail(user.email),
      cooldownSeconds: 30,
    });
  } catch (err: any) {
    console.error("[2fa/resend] error:", err);
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Failed to resend verification code." });
  }
});

// GET /api/auth/2fa/status
authRouter.get("/2fa/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true,
        twoFactorConfirmedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json({
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      twoFactorMethod: "EMAIL_OTP",
      confirmedAt: user.twoFactorConfirmedAt,
      registeredEmail: user.email,
      maskedEmail: maskEmail(user.email),
    });
  } catch (err: any) {
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Failed to get 2FA status." });
  }
});

// POST /api/auth/2fa/setup-initiate
authRouter.post("/2fa/setup-initiate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const eligibility = await checkResendEligibility(user.id);
    if (!eligibility.allowed) {
      return res.status(429).json({
        error: `Please wait ${eligibility.secondsRemaining} seconds before requesting a new code.`,
        secondsRemaining: eligibility.secondsRemaining,
      });
    }

    const { otp } = await createOrReplaceOtp(user.id);

    await sendTwoFactorOtpEmail({
      toEmail: user.email,
      otp,
      fullName: user.profile?.fullName || undefined,
      isSetup: true,
    });

    const mfaToken = generateMfaToken({ userId: user.id, email: user.email });

    return res.json({
      success: true,
      mfaToken,
      maskedEmail: maskEmail(user.email),
      message: "A 6-digit setup verification code has been sent to your registered email.",
    });
  } catch (err: any) {
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Failed to initiate 2FA setup." });
  }
});

// POST /api/auth/2fa/setup-confirm
authRouter.post("/2fa/setup-confirm", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.user!.userId;

    if (!code) {
      return res.status(400).json({ error: "Verification code is required." });
    }

    const verification = await verifyOtpCode(userId, String(code));
    if (!verification.valid) {
      return res.status(400).json({ error: verification.error || "Invalid verification code." });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorConfirmedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      twoFactorEnabled: true,
      message: "Two-Factor Authentication is now enabled on your account.",
    });
  } catch (err: any) {
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Failed to confirm 2FA setup." });
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

    const roles = user!.roles.map((r) => r.role);
    const tenantId = user!.profile?.tenantId;

    let workspaceRole: any = null;
    let permissions: string[] = [];
    let enabledModules: string[] = [];
    let allowedDashboards: string[] = [];

    if (tenantId) {
      const tenantMods = await prisma.tenantModule.findMany({
        where: { tenantId },
      });
      const disabledKeySet = new Set(
        tenantMods.filter((m) => !m.isEnabled).map((m) => m.moduleKey)
      );
      enabledModules = ERP_MODULES.filter((m) => !disabledKeySet.has(m.key)).map((m) => m.key);

      const isSuper = roles.includes("super_admin");

      if (isSuper) {
        const allPerms = await prisma.permission.findMany({ select: { code: true } });
        permissions = allPerms.map((p) => p.code);
        workspaceRole = {
          id: "super_admin_role",
          name: "Super Administrator",
          description: "Global Platform Administrator with full system control",
          isActive: true,
          isSystem: true,
        };
        allowedDashboards = ERP_MODULES.map((m) => m.key);
      } else {
        let assignment = await prisma.userRoleAssignment.findUnique({
          where: {
            userId_tenantId: {
              userId: user!.id,
              tenantId,
            },
          },
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        });

        if (!assignment && ((roles as string[]).includes("admin") || (roles as string[]).includes("workspace_admin"))) {
          const adminRole = await prisma.workspaceRole.findUnique({
            where: { tenantId_name: { tenantId, name: "Workspace Admin" } },
            include: {
              permissions: { include: { permission: true } },
            },
          });
          if (adminRole) {
            await prisma.userRoleAssignment.create({
              data: {
                userId: user!.id,
                tenantId,
                roleId: adminRole.id,
              },
            });
            assignment = { role: adminRole } as any;
          }
        }

        if (assignment?.role && assignment.role.isActive) {
          workspaceRole = {
            id: assignment.role.id,
            name: assignment.role.name,
            description: assignment.role.description,
            isActive: assignment.role.isActive,
            isSystem: assignment.role.isSystem,
          };

          if (assignment.role.name === "Workspace Admin") {
            const allPerms = await prisma.permission.findMany({ select: { code: true } });
            permissions = allPerms.map((p) => p.code);
          } else {
            permissions = assignment.role.permissions.map((rp) => rp.permission.code);
          }
        } else {
          const employeeRole = await prisma.workspaceRole.findUnique({
            where: { tenantId_name: { tenantId, name: "Employee" } },
            include: {
              permissions: { include: { permission: true } },
            },
          });
          if (employeeRole && employeeRole.isActive) {
            workspaceRole = {
              id: employeeRole.id,
              name: employeeRole.name,
              description: employeeRole.description,
              isActive: employeeRole.isActive,
              isSystem: employeeRole.isSystem,
            };
            permissions = employeeRole.permissions.map((rp) => rp.permission.code);
          }
        }

        allowedDashboards = ERP_MODULES.filter((mod) => {
          const isModEnabled = enabledModules.includes(mod.key);
          const hasDashboardPerm =
            workspaceRole?.name === "Workspace Admin" ||
            permissions.includes(mod.permission);
          return isModEnabled && hasDashboardPerm;
        }).map((m) => m.key);
      }
    }

    return res.json({
      id: user!.id,
      email: user!.email,
      profile: user!.profile,
      roles,
      workspaceRole,
      permissions,
      enabledModules,
      allowedDashboards,
      twoFactorEnabled: user!.twoFactorEnabled,
    });
  } catch (err: any) {
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/auth/claim-super-admin
authRouter.post("/claim-super-admin", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
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
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/auth/bootstrap-tenant
authRouter.post("/bootstrap-tenant", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug } = z.object({ name: z.string().trim().min(1).max(255), slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) }).parse(req.body);
    const tenant = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${req.user!.userId} FOR UPDATE`;
      const profile = await tx.profile.findUnique({ where: { userId: req.user!.userId } });
      if (profile?.tenantId) throw Object.assign(new Error("Your account already belongs to a workspace."), { status: 409 });
      const created = await tx.tenant.create({ data: { name, slug } });
      await tx.profile.upsert({ where: { userId: req.user!.userId },
        create: { userId: req.user!.userId, email: req.user!.email, tenantId: created.id },
        update: { tenantId: created.id },
      });
      await tx.userRole.create({ data: { userId: req.user!.userId, tenantId: created.id, role: "hr_admin" } });
      const role = await tx.workspaceRole.create({ data: { tenantId: created.id, name: "Workspace Admin", isSystem: true, isActive: true } });
      await tx.userRoleAssignment.create({ data: { tenantId: created.id, userId: req.user!.userId, roleId: role.id } });
      return created;
    });
    const token = generateToken({ userId: req.user!.userId, email: req.user!.email, tenantId: tenant.id, roles: ["hr_admin"] });
    return res.json({ success: true, tenant, token });
  } catch (err: any) {
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Internal server error" });
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
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Internal server error" });
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
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Failed to fetch OAuth config" });
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

    const { name, logoUrl, timezone } = req.body;
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(timezone && { timezone: String(timezone).trim() }),
      },
    });

    return res.json({ success: true, tenant: updated });
  } catch (err: any) {
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Failed to update tenant organization." });
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
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Failed to update password." });
  }
});

