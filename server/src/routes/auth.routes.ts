import {
  sendTwoFactorOtpEmail,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendTwoFactorSecurityEmail,
  sendTrialActivatedEmail,
} from "../lib/email";
import { EmailOutboxService } from "../services/email-outbox.service";
import { createOrReplaceOtp, verifyOtpCode, checkResendEligibility, maskEmail } from "../lib/otp";
import { ERP_MODULES } from "../lib/erp-modules";
import { Router, Request, Response } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { getUploadsRoot } from "../services/media/media.service";
import { z } from "zod";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const prisma = rawPrisma || proxiedPrisma;
import { generateToken, generateMfaToken, verifyMfaToken } from "../lib/jwt";
import { recordLoginHistory } from "../services/login-history.service";
import { checkTenantIpAccess } from "../services/tenant-ip-restriction.service";
import { createDeviceSession, getActiveSessions, revokeSession, revokeAllSessions, hashRefreshToken, rotateRefreshToken } from "../services/device-session.service";
import { provisionTenantWithTrial } from "../lib/tenant-provisioning";
import {
  resolveHostContext,
  validateWorkspaceSlug,
  suggestWorkspaceSlug,
  getWorkspaceUrl,
  getCustomDomainUrl,
  getBaseDomain,
  getEffectiveRequestHost,
} from "../lib/workspace-host";
import { requireAuth, requireSuperAdmin, AuthRequest, invalidateAuthCache } from "../middleware/auth";
import { invalidateChatProfileCache } from "./chat.routes";
import { SettingsService } from "../services/settings/settings.service";
import { OAuthFactory } from "../services/factories/oauth.factory";
import { TwoFactorService, generateRandomBackupCodes } from "../modules/two-factor-auth/two-factor.service";
import { requireTurnstile } from "../middleware/turnstile.middleware";
import { PushSubscriptionStore } from "../services/push-subscription.store";
import { sensitiveEndpointLimiter } from "../middleware/security-hardening.middleware";

export { OAuthFactory };
export const authRouter = Router();

// SEC-005: Re-export cryptographically secure backup code generator (uses crypto.randomInt)
export const generateBackupCodes = generateRandomBackupCodes;

export async function resolveEffectiveUserRoles(
  user: { id: string; email: string; roles: any[]; profile?: { fullName?: string | null; tenantId?: string | null } | null },
  tenantId?: string | null
): Promise<string[]> {
  const baseRoles = (user.roles || []).map((r: any) => String(r.role || r));
  if (baseRoles.includes("super_admin")) return baseRoles;

  let isWorkspaceAdmin = false;
  const effectiveTenantId = tenantId || user.profile?.tenantId;
  if (effectiveTenantId) {
    const assignment = await prisma.userRoleAssignment.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: effectiveTenantId,
        },
      },
      include: { role: true },
    });
    const roleName = assignment?.role?.name?.toLowerCase();
    if (roleName === "workspace admin" || roleName === "tenant admin" || roleName === "admin") {
      isWorkspaceAdmin = true;
    }
  }

  if (isWorkspaceAdmin || baseRoles.includes("tenant_admin") || baseRoles.includes("workspace_admin")) {
    const effective = baseRoles.filter((r) => r !== "hr_admin");
    if (!effective.includes("tenant_admin")) effective.push("tenant_admin");
    if (!effective.includes("admin")) effective.push("admin");
    if (!effective.includes("workspace_admin")) effective.push("workspace_admin");
    return effective;
  }

  return baseRoles;
}

const registerSchema = z.object({
  email: z.string().email("Please enter a valid work email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string().optional(),
  fullName: z.string().optional(),
  companyName: z.string().optional(),
  country: z.string().optional().default("India"),
  workspaceSlug: z.string().optional(),
  termsAccepted: z.boolean().optional(),
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
  code: z.string().optional(),
  token: z.string().optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters long"),
}).refine((data) => Boolean(data.code || data.token), {
  message: "Either verification code or reset token is required",
});

const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().optional(),
  token: z.string().optional(),
  companyName: z.string().optional(),
  slug: z.string().optional(),
}).refine((data) => Boolean(data.code || data.token), {
  message: "Either 6-digit verification code or verification token is required",
});

// GET /api/auth/public/tenant/resolve
authRouter.get("/public/tenant/resolve", async (req, res) => {
  try {
    const rawHost = getEffectiveRequestHost(req.headers);
    const hostContext = (req as any).hostContext || resolveHostContext(rawHost);
    const requestedSlug = (req.query.slug as string) || (req.headers["x-tenant-slug"] as string) || (req.headers["x-tenant-id"] as string);

    let tenant: any = null;
    if (hostContext.type === "tenant") {
      tenant = (req as any).resolvedTenant || await prisma.tenant.findUnique({
        where: { slug: hostContext.slug.toLowerCase() },
        include: { subscription: { include: { plan: true } } }
      });
    } else if (requestedSlug) {
      tenant = await prisma.tenant.findFirst({
        where: {
          OR: [{ slug: requestedSlug.toLowerCase() }, { id: requestedSlug }]
        },
        include: { subscription: { include: { plan: true } } }
      });
    }

    if (!tenant) {
      return res.json({
        resolved: false,
        name: "Master ERP & HRMS",
        slug: "default",
        logoUrl: "/logo.webp",
        logoDark: "/white-logo.webp",
        faviconUrl: "/favicon.webp",
        primaryColor: "#FF6B00",
        timezone: "Asia/Kolkata",
        isWhiteLabeled: false,
      });
    }

    return res.json({
      resolved: true,
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl || "/logo.webp",
      logoDark: "/white-logo.webp",
      faviconUrl: tenant.faviconUrl || "/favicon.webp",
      primaryColor: tenant.primaryColor || "#FF6B00",
      timezone: tenant.timezone || "Asia/Kolkata",
      isWhiteLabeled: true,
      subscription: {
        planName: tenant.subscription?.plan?.name || "Active Plan",
        status: tenant.subscription?.status || "active",
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/public/tenant-branding (alias for convenience)
authRouter.get("/public/tenant-branding", async (req, res) => {
  return res.redirect("/api/auth/public/tenant/resolve");
});

// GET /api/auth/public/tenant/credentials
// SEC-004: Secured public tenant metadata endpoint.
// Never exposes administrator, HR, or employee email addresses or personal details publicly.
authRouter.get("/public/tenant/credentials", sensitiveEndpointLimiter, async (req, res) => {
  try {
    const rawHost = getEffectiveRequestHost(req.headers);
    const hostContext = (req as any).hostContext || resolveHostContext(rawHost);
    const requestedSlug = (req.query.slug as string) || (req.headers["x-tenant-slug"] as string) || (req.headers["x-tenant-id"] as string);

    let tenant: any = null;
    if (hostContext.type === "tenant") {
      tenant = (req as any).resolvedTenant || await prisma.tenant.findUnique({
        where: { slug: hostContext.slug.toLowerCase() },
        select: { id: true, name: true, slug: true },
      });
    } else if (requestedSlug) {
      tenant = await prisma.tenant.findFirst({
        where: {
          OR: [{ slug: requestedSlug.toLowerCase() }, { id: requestedSlug }],
        },
        select: { id: true, name: true, slug: true },
      });
    }

    return res.json({
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
          }
        : null,
      credentials: {
        tenantAdmin: null,
        hrAdmin: null,
        employee: null,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to resolve tenant metadata." });
  }
});

// POST /api/auth/register
authRouter.post("/register", requireTurnstile("signup"), async (req, res) => {
  try {
    const {
      email,
      password,
      confirmPassword,
      fullName,
      companyName,
      country,
      workspaceSlug,
      termsAccepted,
    } = registerSchema.parse(req.body);

    if (termsAccepted === false) {
      return res.status(400).json({
        error: "You must accept the MasterHRMS Terms of Service and Privacy Policy to register.",
        code: "TERMS_NOT_ACCEPTED",
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        error: "Passwords do not match.",
        code: "PASSWORD_MISMATCH",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({
        error: "An account with this email address already exists. Please sign in or use another email.",
        code: "EMAIL_TAKEN",
      });
    }

    // Determine and validate workspace slug (Flow 1: 3-30 chars, lowercase, RFC)
    let finalSlug = "";
    if (workspaceSlug) {
      const trimmedSlug = workspaceSlug.trim().toLowerCase();
      const validation = validateWorkspaceSlug(trimmedSlug);
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.reason === "reserved"
            ? `Workspace name '${trimmedSlug}' is reserved by the platform. Please choose another.`
            : `Invalid workspace name: ${validation.reason}`,
          code: validation.reason === "reserved" ? "RESERVED_SLUG" : "INVALID_SLUG",
          reason: validation.reason,
        });
      }
      finalSlug = trimmedSlug;

      // Check if slug taken
      const existingTenant = await prisma.tenant.findUnique({ where: { slug: finalSlug } });
      const activeRedirect = await (prisma as any).workspaceSlugRedirect.findFirst({
        where: { oldSlug: finalSlug, redirectUntil: { gte: new Date() } },
      });
      if (existingTenant || activeRedirect) {
        return res.status(409).json({
          error: "This workspace address is already taken. Please choose another.",
          code: "SLUG_TAKEN",
        });
      }
    } else {
      finalSlug = suggestWorkspaceSlug(companyName || fullName || normalizedEmail.split("@")[0]);
      let candidate = finalSlug;
      let counter = 2;
      while (
        (await prisma.tenant.findUnique({ where: { slug: candidate } })) ||
        (await (prisma as any).workspaceSlugRedirect.findFirst({ where: { oldSlug: candidate, redirectUntil: { gte: new Date() } } }))
      ) {
        candidate = `${finalSlug.substring(0, 26)}-${counter++}`;
      }
      finalSlug = candidate;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        profile: {
          create: {
            fullName: fullName || normalizedEmail.split("@")[0],
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // Generate cryptographic random email verification token & OTP code
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const verificationKey = `verify:${tokenHash}`;
    const tokenId = crypto.randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    await prisma.$executeRawUnsafe(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
      tokenId,
      user.id,
      verificationKey,
      tokenExpiresAt
    ).catch((dbErr: any) => {
      console.warn("[Register] verification token persistence:", dbErr.message);
    });

    const { otp } = await createOrReplaceOtp(user.id);

    const origin =
      req.headers.origin ||
      (req.headers.referer ? new URL(req.headers.referer).origin : "") ||
      `http://${getEffectiveRequestHost(req)}`;
    const verificationUrl = `${origin}/auth?mode=verify&token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    // Dispatch verification email
    await sendEmailVerificationEmail({
      toEmail: user.email,
      userName: fullName || user.email.split("@")[0],
      verificationUrl,
      otpCode: otp,
      expiryMinutes: 60,
    }).catch((emailErr) => {
      console.warn("[Register] verification email dispatch:", emailErr.message);
    });

    // SEC-003: Never allow client-controlled autoVerify bypass.
    // Only trusted server-side configuration in non-production environments may skip email verification.
    const shouldAutoVerify =
      process.env.NODE_ENV !== "production" &&
      process.env.REQUIRE_EMAIL_VERIFICATION === "false";

    if (shouldAutoVerify) {
      // SaaS Lifecycle: Provision Tenant, admin User, TenantSubscription(status=trialing), seed accounts
      const provisionResult = await provisionTenantWithTrial({
        name: companyName?.trim() || (fullName ? `${fullName}'s Organization` : `${normalizedEmail.split("@")[0]}'s Org`),
        adminEmail: normalizedEmail,
        adminFullName: fullName,
        userId: user.id,
        slug: finalSlug,
        currency: country === "United States" ? "USD" : "INR",
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          profile: true,
          roles: true,
        },
      });

      const roles = await resolveEffectiveUserRoles(updatedUser || { ...user, roles: [] }, provisionResult.tenant.id);

      let sessionResult: { sessionId: string; refreshToken: string } | null = null;
      try {
        const rawIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
        const clientIp = rawIp.split(",")[0].trim().replace(/^::ffff:/, "");
        sessionResult = await createDeviceSession({
          userId: user.id,
          tenantId: provisionResult.tenant.id,
          ipAddress: clientIp,
          userAgent: req.headers["user-agent"] as string,
        });
      } catch (err: any) {
        console.warn("[Register] Device session create failure:", err?.message);
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        tenantId: provisionResult.tenant.id,
        roles,
        sessionId: sessionResult?.sessionId,
      });

      await sendWelcomeEmail({
        toEmail: user.email,
        userName: fullName || user.email.split("@")[0],
        companyName: provisionResult.tenant.name,
        workspaceUrl: getWorkspaceUrl(provisionResult.tenant.slug),
        loginUrl: `${origin}/auth`,
        trialDays: 14,
        tenantId: provisionResult.tenant.id,
      }).catch((wErr) => console.warn("[Register] welcome mail dispatch:", wErr.message));

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          profile: updatedUser?.profile,
          roles,
        },
        tenant: {
          id: provisionResult.tenant.id,
          name: provisionResult.tenant.name,
          slug: provisionResult.tenant.slug,
        },
        workspaceUrl: getWorkspaceUrl(provisionResult.tenant.slug),
        subscription: {
          status: provisionResult.subscription.status,
          trialEndsAt: provisionResult.trialEndsAt,
        },
        token,
      });
    }

    // Standard secure flow: Return pending verification state
    return res.status(201).json({
      requiresVerification: true,
      email: user.email,
      maskedEmail: maskEmail(user.email),
      message: "Registration successful. A verification code and activation link have been dispatched to your email.",
      workspaceSlug: finalSlug,
      companyName: companyName?.trim() || `${user.email.split("@")[0]}'s Org`,
      previewToken: process.env.NODE_ENV !== "production" ? rawToken : undefined,
      previewCode: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/auth/unlock
// Unlocks a session locked due to inactivity
const unlockSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(1),
});

authRouter.post("/unlock", async (req, res) => {
  try {
    const { email, password } = unlockSchema.parse(req.body);
    let userEmail = email?.toLowerCase().trim();

    if (!userEmail && req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace("Bearer ", "");
        const parts = token.split(".");
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
          userEmail = payload.email?.toLowerCase().trim();
        }
      } catch { }
    }

    if (!userEmail) {
      return res.status(400).json({ error: "Email is required to unlock session." });
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        profile: true,
        roles: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const roles = await resolveEffectiveUserRoles(user, user.profile?.tenantId);
    let sessionResult: { sessionId: string; refreshToken: string } | null = null;
    try {
      const rawIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const clientIp = rawIp.split(",")[0].trim().replace(/^::ffff:/, "");
      sessionResult = await createDeviceSession({
        userId: user.id,
        tenantId: user.profile?.tenantId || null,
        ipAddress: clientIp,
        userAgent: req.headers["user-agent"] as string,
      });
    } catch (err: any) {
      console.warn("[SuperLogin] Device session create failure:", err?.message);
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      tenantId: user.profile?.tenantId,
      roles,
      sessionId: sessionResult?.sessionId,
    });
    await recordLoginHistory(req, user.id, user.id);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
        roles,
      },
      roles,
      message: "Session unlocked successfully!",
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(500).json({ error: err.message || "Failed to unlock session." });
  }
});

const loginHandler = async (req: any, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    let normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail === "tenentadmin@masterhrms.com") {
      normalizedEmail = "tenantadmin@masterhrms.com";
    }

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: true,
        roles: true,
        employees: {
          select: {
            id: true,
            tenantId: true,
            status: true,
            position: true,
            designation: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        },
        workspaceRoleAssignments: {
          include: {
            role: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) return res.status(401).json({ error: "Invalid email or password." });

    const rawHost = getEffectiveRequestHost(req.headers);
    const hostContext = (req as any).hostContext || resolveHostContext(rawHost);

    // 1. Super Admin Host/Portal isolation:
    // If a request originating from a tenant host or custom domain attempts to use the super portal, return 404 NOT_FOUND.
    if (hostContext.type === "tenant" || hostContext.type === "custom_domain") {
      const hasSuperPortalSignal =
        req.headers["x-auth-portal"] === "super" || req.body.portal === "super";
      if (hasSuperPortalSignal) {
        return res.status(404).json({
          error: "Not Found",
          code: "NOT_FOUND",
        });
      }
    }

    const isSuperPortal =
      hostContext.type === "super" ||
      req.headers["x-auth-portal"] === "super" ||
      req.body.portal === "super";

    // Enforcement of Super Admin / Tenant Login Separation:
    if (!isSuperPortal) {
      const isPlatformSuperAdmin = user.roles.some((r: any) => r.role === "super_admin" && !r.tenantId);
      if (isPlatformSuperAdmin) {
        // Platform Super Admin must NOT authenticate via normal /login endpoint.
        // Return generic 401 without leaking identity or super admin existence.
        return res.status(401).json({ error: "Invalid email or password." });
      }
    }

    if (isSuperPortal) {
      const isSuper = user.roles.some((r: any) => r.role === "super_admin");
      if (!isSuper) {
        return res.status(403).json({
          error: "Access denied. Only Super Administrators can log in through this portal.",
          code: "SUPER_ADMIN_ONLY",
        });
      }
    }

    // SEC-001: Strictly verify password against stored bcrypt hash. No hardcoded bypasses allowed.
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // DEFECT-016: Block unverified self-registered users (unconsumed verify:* token and no provisioned tenant)
    const isSuperUser = user.roles.some((r: any) => r.role === "super_admin");
    if (!isSuperUser && !user.profile?.tenantId) {
      try {
        const pendingVerify: any[] = await prisma.$queryRawUnsafe(
          `SELECT id FROM password_reset_tokens WHERE user_id = $1 AND token_hash LIKE 'verify:%' AND used_at IS NULL LIMIT 1`,
          user.id
        );
        if (pendingVerify && pendingVerify.length > 0) {
          return res.status(403).json({
            error: "Please verify your email address before signing in.",
            code: "EMAIL_NOT_VERIFIED",
            requiresVerification: true,
            email: user.email,
          });
        }
      } catch {}
    }

    // ── Mobile App Persona Restriction ────────────────────────────
    // The mobile application is exclusively for Employee, HR, and Tenant Administrator roles.
    // Super Administrator accounts are strictly forbidden from logging in via the mobile application.
    const userAgent = (req.headers["user-agent"] as string) || "";
    const isMobileClient =
      req.headers["x-client-platform"] === "mobile" ||
      req.headers["x-mobile-app"] === "true" ||
      userAgent.includes("MasterHRMS-Mobile") ||
      userAgent.includes("Expo");

    if (isMobileClient) {
      const hasSuperAdminRole = user.roles.some((r: any) => r.role === "super_admin");
      if (hasSuperAdminRole) {
        return res.status(403).json({
          error: "Access denied. Super Administrator accounts cannot log in to the mobile application. This mobile app is exclusively for Employees, HR, and Tenant Administrators. Please use the Web Super Admin portal.",
          code: "SUPER_ADMIN_MOBILE_ACCESS_DENIED",
        });
      }

      // Check if user has at least one tenant-level role (employee, hr_admin, hr, manager, tenant_admin, admin)
      const allowedMobileRoles = [
        "employee",
        "staff",
        "hr_admin",
        "hr",
        "hr_manager",
        "manager",
        "team_lead",
        "tenant_admin",
        "workspace_admin",
        "admin",
      ];
      const hasAllowedRole =
        user.roles.some((r: any) => allowedMobileRoles.includes(r.role?.toLowerCase())) ||
        (user.workspaceRoleAssignments &&
          user.workspaceRoleAssignments.some((a: any) =>
            allowedMobileRoles.includes(a.role?.toLowerCase())
          )) ||
        (user.employees && user.employees.length > 0);

      if (!hasAllowedRole) {
        return res.status(403).json({
          error: "Access denied. Your account does not have an active Employee, HR, or Tenant Administrator role.",
          code: "MOBILE_ROLE_NOT_AUTHORIZED",
        });
      }
    }

    // 2. Tenant Workspace Host / Custom Domain isolation: user MUST belong to this specific workspace
    if (hostContext.type === "tenant" || hostContext.type === "custom_domain") {
      let resolvedTenant = (req as any).resolvedTenant;
      if (!resolvedTenant && hostContext.type === "tenant") {
        const found = await prisma.tenant.findUnique({
          where: { slug: hostContext.slug.toLowerCase() },
          select: { id: true, name: true, slug: true },
        });
        if (found) resolvedTenant = found;
      } else if (!resolvedTenant && hostContext.type === "custom_domain") {
        const foundDomain = await prisma.tenantDomain.findUnique({
          where: { domain: hostContext.domain },
          include: { tenant: { select: { id: true, name: true, slug: true } } },
        });
        if (foundDomain && foundDomain.status === "approved" && foundDomain.dnsStatus === "verified") {
          resolvedTenant = foundDomain.tenant;
        }
      }

      if (!resolvedTenant) {
        return res.status(404).json({
          error: "Workspace not found.",
          code: "WORKSPACE_NOT_FOUND",
        });
      }

      const userTenantId =
        user.profile?.tenantId ||
        user.roles.find((r: any) => r.tenantId === resolvedTenant.id)?.tenantId ||
        user.workspaceRoleAssignments?.find((a: any) => a.tenantId === resolvedTenant.id)?.tenantId;
      if (userTenantId !== resolvedTenant.id) {
        return res.status(403).json({
          error: "This account does not belong to this workspace.",
          code: "TENANT_MISMATCH",
        });
      }

      // Check if employee's employment in this workspace is terminated
      const matchingEmployee = user.employees?.find((e: any) => e.tenantId === resolvedTenant.id);
      if (matchingEmployee && matchingEmployee.status === "terminated") {
        return res.status(403).json({
          error: "Your employment has been terminated. Login access is disabled.",
          code: "EMPLOYMENT_TERMINATED",
        });
      }

      // Check if employee account access is deactivated in this workspace
      const isSuperUser = user.roles.some((r: any) => r.role === "super_admin");
      const hasTenantRole =
        user.roles.some((r: any) => r.tenantId === resolvedTenant.id || r.tenantId === null) ||
        (user.workspaceRoleAssignments && user.workspaceRoleAssignments.some((a: any) => a.tenantId === resolvedTenant.id));
      if (!isSuperUser && !hasTenantRole) {
        return res.status(403).json({
          error: "Your login account for this workspace has been deactivated. Please contact your administrator.",
          code: "ACCOUNT_DEACTIVATED",
        });
      }
    }

    // Tenant-Scoped IP Restriction Check on Login (Applies ONLY to this user's tenant; Super Admins & other tenants unaffected)
    const loginIsSuper = user.roles.some((r: any) => r.role === "super_admin");
    const loginTenantId = (req as any).resolvedTenant?.id || user.profile?.tenantId || null;
    if (!loginIsSuper && loginTenantId) {
      const ipCheck = await checkTenantIpAccess(loginTenantId, req, loginIsSuper);
      if (!ipCheck.allowed) {
        return res.status(403).json({
          error: ipCheck.reason || "Login blocked by your organization's IP Restriction policy.",
          code: "TENANT_IP_RESTRICTED",
          clientIp: ipCheck.clientIp,
        });
      }
    }

    // ── 2FA Authentication Flow ──────────────────────────────────
    // 1. If user has explicitly enrolled in TOTP 2FA (Authenticator App):
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const mfaToken = generateMfaToken({ userId: user.id, email: user.email });
      return res.json({
        requires2FA: true,
        isSetup: false,
        twoFactorMethod: "TOTP",
        mfaToken,
        email: user.email,
        maskedEmail: maskEmail(user.email),
        message: "Two-Factor Authentication is active. Please enter the 6-digit code from your authenticator app or backup code.",
      });
    }

    // 2. If user has explicitly enabled Email OTP 2FA:
    if (user.twoFactorEnabled) {
      const { otp } = await createOrReplaceOtp(user.id);
      const emailResult = await sendTwoFactorOtpEmail({
        toEmail: user.email,
        otp,
        fullName: user.profile?.fullName || undefined,
        isSetup: false,
      });

      if (!emailResult.success) {
        console.warn(`⚠️ [2FA OTP] Email dispatch to ${user.email} failed: ${emailResult.error}`);
        console.log(`🔑 [2FA LOGIN CODE] Use this code to sign in for ${user.email}: [${otp}]`);
      }

      const mfaToken = generateMfaToken({ userId: user.id, email: user.email });
      return res.json({
        requires2FA: true,
        isSetup: false,
        twoFactorMethod: "EMAIL_OTP",
        mfaToken,
        email: user.email,
        maskedEmail: maskEmail(user.email),
        message: "A 6-digit verification code has been sent to your email.",
        devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
      });
    }

    // 3. User does NOT have 2FA enabled. Check if mandatory 2FA is bypassed via env (e.g. staging or SMTP disabled)
    const is2faDisabled = process.env.ENABLE_2FA === "false" || process.env.MANDATORY_2FA === "false";
    if (is2faDisabled) {
      const userTenantId = user.profile?.tenantId || user.roles.find((r: any) => r.tenantId)?.tenantId;
      const roles = await resolveEffectiveUserRoles(user, userTenantId);

      // Generate device session and refresh token
      let sessionResult: { sessionId: string; refreshToken: string } | null = null;
      try {
        const rawIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
        const clientIp = rawIp.split(",")[0].trim().replace(/^::ffff:/, "");
        sessionResult = await createDeviceSession({
          userId: user.id,
          tenantId: userTenantId || null,
          ipAddress: clientIp,
          userAgent: req.headers["user-agent"] as string,
        });
      } catch (err: any) {
        console.warn("[DeviceSession] Non-fatal session create failure:", err.message);
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        tenantId: user.profile?.tenantId,
        roles,
        sessionId: sessionResult?.sessionId,
      });
      await recordLoginHistory(req, user.id, user.id);

      if (sessionResult?.refreshToken) {
        res.cookie("hrms_refresh_token", sessionResult.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/api/auth",
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });
      }

      // Resolve user's tenant for post-login workspace redirection (Flow 1 & Flow 2)
      // Super admin users MUST stay on root platform domain and never be redirected to tenant subdomains
      let workspaceUrl: string | undefined;
      let tenantSlug: string | undefined;
      const isSuperAdminUser = roles.includes("super_admin") || Boolean(isSuperPortal);
      const effectiveTenantId = !isSuperAdminUser ? userTenantId : undefined;
      if (effectiveTenantId) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: effectiveTenantId },
          select: { id: true, slug: true, name: true },
        });
        if (tenant?.slug) {
          tenantSlug = tenant.slug;
          // If login occurred on an active custom domain host, retain custom domain URL
          if (hostContext?.type === "custom_domain" && (hostContext as any).domain) {
            workspaceUrl = getCustomDomainUrl((hostContext as any).domain);
          } else {
            // Check if tenant has an active primary custom domain
            const primaryCustomDomain = await prisma.tenantDomain.findFirst({
              where: {
                tenantId: effectiveTenantId,
                status: "approved",
                dnsStatus: "verified",
                isPrimary: true,
              },
              select: { domain: true },
            });
            if (primaryCustomDomain?.domain) {
              workspaceUrl = getCustomDomainUrl(primaryCustomDomain.domain);
            } else {
              const reqHost = getEffectiveRequestHost(req).split(":")[0].toLowerCase();
              const derivedBase =
                !process.env.BASE_DOMAIN &&
                reqHost &&
                reqHost !== "localhost" &&
                reqHost !== "127.0.0.1" &&
                !reqHost.endsWith(".vercel.app")
                  ? reqHost.startsWith("www.")
                    ? reqHost.slice(4)
                    : reqHost.split(".").length >= 3
                      ? reqHost.split(".").slice(1).join(".")
                      : reqHost
                  : undefined;
              workspaceUrl = getWorkspaceUrl(tenant.slug, undefined, derivedBase);
            }
          }
        }
      }

      const matchingEmployee = user.employees?.find((e: any) => e.tenantId === effectiveTenantId) || user.employees?.[0];
      const matchingAssignment = user.workspaceRoleAssignments?.find((a: any) => a.tenantId === effectiveTenantId) || user.workspaceRoleAssignments?.[0];
      const resolvedDesignation =
        matchingEmployee?.designation?.name ||
        matchingEmployee?.position ||
        matchingAssignment?.role?.name ||
        (roles.includes("hr_admin")
          ? "HR Administrator"
          : roles.includes("tenant_admin")
            ? "Organization Administrator"
            : roles.includes("manager")
              ? "Team Manager"
              : "Employee");

      const enhancedProfile = {
        ...user.profile,
        designation: resolvedDesignation,
        position: matchingEmployee?.position || resolvedDesignation,
        department: matchingEmployee?.department?.name || null,
      };

      return res.json({
        token,
        refreshToken: sessionResult?.refreshToken,
        sessionId: sessionResult?.sessionId,
        user: {
          id: user.id,
          email: user.email,
          profile: enhancedProfile,
          designation: resolvedDesignation,
          roles,
        },
        roles,
        tenantSlug,
        workspaceUrl,
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
      console.warn(`âš ï¸ [2FA OTP] Email dispatch to ${user.email} failed: ${emailResult.error}`);
      console.log(`ðŸ”‘ [2FA LOGIN CODE] Use this code to sign in for ${user.email}: [${otp}]`);
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
};

// POST /api/auth/login
authRouter.post(
  "/login",
  requireTurnstile((req) =>
    req.body?.portal === "super" || req.headers["x-auth-portal"] === "super"
      ? "super_login"
      : "login"
  ),
  loginHandler
);

// POST /api/auth/super-login (Dedicated Super Admin entry point)
authRouter.post(
  "/super-login",
  (req, _res, next) => {
    req.body = req.body || {};
    req.body.portal = "super";
    next();
  },
  requireTurnstile("super_login"),
  loginHandler
);

// POST /api/auth/forgot-password
authRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true, roles: true },
    });

    // PWD-001 & Enumeration Resistance: Return generic success response even if user is not found
    if (!user) {
      return res.json({
        success: true,
        message: "If an account with that email exists, password reset instructions have been dispatched.",
        maskedEmail: maskEmail(normalizedEmail),
      });
    }

    let tenantName: string | undefined;
    if (user.profile?.tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: user.profile.tenantId } });
      tenantName = tenant?.name;
    }

    // Generate secure cryptographically random one-time token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenId = crypto.randomUUID();
    const expiryMinutes = 60;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Invalidate existing unused tokens for this user and store new token in DB
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
        user.id
      );
      await prisma.$executeRawUnsafe(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
        tokenId,
        user.id,
        tokenHash,
        expiresAt
      );
    } catch (dbErr: any) {
      console.error("âš ï¸ Failed to store reset token in password_reset_tokens table:", dbErr);
    }

    // Also generate backup OTP for backward compatibility with 6-digit code UI
    const { otp } = await createOrReplaceOtp(user.id);

    // Determine reset link destination based on portal context and role
    const origin =
      req.headers.origin ||
      (req.headers.referer ? new URL(req.headers.referer).origin : "") ||
      `http://${getEffectiveRequestHost(req)}`;
    const isSuperPortal = Boolean(
      (req.headers.referer && req.headers.referer.includes("/super06")) ||
      user.roles?.some((r: any) => r.role === "super_admin" || r.role === "SUPER_ADMIN")
    );
    const resetBasePath = isSuperPortal ? "/super06" : "/auth";
    const resetUrl = `${origin}${resetBasePath}?mode=reset&token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    // Dispatch email loading PASSWORD_RESET template with OTP & reset link
    const emailResult = await sendPasswordResetEmail({
      toEmail: user.email,
      userName: user.profile?.fullName || user.email.split("@")[0],
      resetUrl,
      otp,
      expiryMinutes,
      tenantId: user.profile?.tenantId ?? undefined,
      companyName: tenantName,
      scope: isSuperPortal ? "PLATFORM" : user.profile?.tenantId ? "TENANT" : "PLATFORM",
    });

    console.log(`[PASSWORD RESET LINK] Generated for ${user.email}: ${resetUrl}`);
    console.log(`[PASSWORD RESET CODE] OTP for ${user.email}: [${otp}]`);

    return res.json({
      success: true,
      message: "If an account with that email exists, password reset instructions have been dispatched.",
      maskedEmail: maskEmail(user.email),
      resetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined,
      previewCode: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(500).json({ error: err.message || "Failed to process forgot password request." });
  }
});

const verifyResetOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(10),
});

// POST /api/auth/verify-reset-otp
authRouter.post("/verify-reset-otp", async (req, res) => {
  try {
    const { email, code } = verifyResetOtpSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(404).json({
        error: "No account found with this email address.",
        code: "USER_NOT_FOUND",
      });
    }

    const verification = await verifyOtpCode(user.id, code);
    if (!verification.valid) {
      return res.status(400).json({
        error: verification.error || "Invalid or expired verification code. Please check and try again.",
        code: "INVALID_OTP",
      });
    }

    // Generate verified one-time reset token valid for 15 minutes
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
        tokenId,
        user.id,
        tokenHash,
        expiresAt
      );
    } catch (err: any) {
      console.error("Failed to insert verified reset token:", err);
    }

    return res.json({
      success: true,
      valid: true,
      resetToken: rawToken,
      message: "Verification code verified successfully. Please set your new password.",
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(500).json({ error: err.message || "Failed to verify reset code." });
  }
});

// POST /api/auth/reset-password
authRouter.post("/reset-password", async (req, res) => {
  try {
    const { email, code, token, newPassword } = resetPasswordSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid password reset request." });
    }

    // Token-based validation (primary) or OTP code validation (fallback)
    if (token) {
      const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");
      const tokenRecords: any[] = await prisma.$queryRawUnsafe(
        `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1 AND user_id = $2 AND used_at IS NULL AND expires_at > NOW() LIMIT 1`,
        tokenHash,
        user.id
      );

      if (!tokenRecords || tokenRecords.length === 0) {
        return res.status(400).json({
          error: "This password reset link is invalid, expired, or has already been used. Please request a new link.",
        });
      }

      // Consume token immediately (one-time use)
      await prisma.$executeRawUnsafe(
        `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
        tokenRecords[0].id
      );
    } else if (code) {
      const verification = await verifyOtpCode(user.id, code);
      if (!verification.valid) {
        return res.status(400).json({ error: verification.error || "Invalid or expired reset code." });
      }
    } else {
      return res.status(400).json({ error: "Either a valid reset token or verification code is required." });
    }

    // Invalidate any other active reset tokens for this user
    await prisma.$executeRawUnsafe(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
      user.id
    ).catch(() => { });

    // Update password hash
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // PWD-003: Invalidate ALL active device sessions for this user
    await revokeAllSessions(user.id).catch((revErr) => {
      console.warn("[ResetPassword] revokeAllSessions warning:", revErr.message);
    });

    // Send Password Changed confirmation notification email
    const origin =
      req.headers.origin ||
      (req.headers.referer ? new URL(req.headers.referer).origin : "") ||
      `http://${getEffectiveRequestHost(req)}`;

    await sendPasswordChangedEmail({
      toEmail: user.email,
      userName: (user as any).profile?.fullName || user.email.split("@")[0],
      changedAt: new Date().toUTCString(),
      loginUrl: `${origin}/auth`,
    }).catch((emailErr) => {
      console.warn("[ResetPassword] password changed email warning:", emailErr.message);
    });

    return res.json({
      success: true,
      message: "Password has been successfully updated. All active sessions have been terminated. You can now sign in with your new credentials.",
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
    const { email, code, token, companyName, slug } = verifyEmailSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: { include: { tenant: { include: { subscription: true } } } },
        roles: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User account not found." });
    }

    // 1. Verify token or code
    let isVerified = false;
    if (token) {
      const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");
      const verificationKey = `verify:${tokenHash}`;
      const tokenRecords: any[] = await prisma.$queryRawUnsafe(
        `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1 AND user_id = $2 AND used_at IS NULL AND expires_at > NOW() LIMIT 1`,
        verificationKey,
        user.id
      );

      if (tokenRecords && tokenRecords.length > 0) {
        await prisma.$executeRawUnsafe(
          `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
          tokenRecords[0].id
        );
        isVerified = true;
      }
    }

    if (!isVerified && code) {
      const verification = await verifyOtpCode(user.id, code);
      if (verification.valid) {
        isVerified = true;
        await prisma.$executeRawUnsafe(
          `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND token_hash LIKE 'verify:%' AND used_at IS NULL`,
          user.id
        ).catch(() => {});
      } else if (!token) {
        return res.status(400).json({ error: verification.error || "Invalid or expired verification code." });
      }
    }

    if (!isVerified) {
      return res.status(400).json({
        error: "This email verification link or code is invalid, expired, or has already been used.",
        code: "INVALID_VERIFICATION",
      });
    }

    // 2. Ensure tenant workspace & free trial are provisioned
    let tenantId = user.profile?.tenantId;
    let provisionResult: any = null;

    if (!tenantId || !user.profile?.tenant) {
      const targetSlug = slug || suggestWorkspaceSlug(companyName || user.profile?.fullName || normalizedEmail.split("@")[0]);
      const orgName = companyName?.trim() || (user.profile?.fullName ? `${user.profile.fullName}'s Organization` : `${normalizedEmail.split("@")[0]}'s Org`);
      provisionResult = await provisionTenantWithTrial({
        name: orgName,
        adminEmail: user.email,
        adminFullName: user.profile?.fullName || undefined,
        userId: user.id,
        slug: targetSlug,
      });
      tenantId = provisionResult.tenant.id;
    } else {
      provisionResult = {
        tenant: user.profile.tenant,
        subscription: user.profile.tenant.subscription,
        trialEndsAt: user.profile.tenant.subscription?.trialEndsAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      };
    }

    const roles = await resolveEffectiveUserRoles(user, tenantId);

    // 3. Issue authenticated session
    let sessionResult: { sessionId: string; refreshToken: string } | null = null;
    try {
      const rawIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const clientIp = rawIp.split(",")[0].trim().replace(/^::ffff:/, "");
      sessionResult = await createDeviceSession({
        userId: user.id,
        tenantId,
        ipAddress: clientIp,
        userAgent: req.headers["user-agent"] as string,
      });
    } catch (err: any) {
      console.warn("[VerifyEmail] Device session create warning:", err.message);
    }

    const authToken = generateToken({
      userId: user.id,
      email: user.email,
      tenantId,
      roles,
      sessionId: sessionResult?.sessionId,
    });

    const origin =
      req.headers.origin ||
      (req.headers.referer ? new URL(req.headers.referer).origin : "") ||
      `http://${getEffectiveRequestHost(req)}`;

    // 4. Dispatch Welcome and Trial Activated emails
    await sendWelcomeEmail({
      toEmail: user.email,
      userName: user.profile?.fullName || user.email.split("@")[0],
      companyName: provisionResult.tenant.name,
      workspaceUrl: getWorkspaceUrl(provisionResult.tenant.slug),
      loginUrl: `${origin}/auth`,
      trialDays: 14,
      tenantId,
    }).catch((wErr) => console.warn("[VerifyEmail] welcome mail warning:", wErr.message));

    await sendTrialActivatedEmail({
      toEmail: user.email,
      adminName: user.profile?.fullName || user.email.split("@")[0],
      companyName: provisionResult.tenant.name,
      trialEndsAt: provisionResult.trialEndsAt.toISOString(),
      trialDays: 14,
      dashboardUrl: `${getWorkspaceUrl(provisionResult.tenant.slug)}/tenant/dashboard`,
      tenantId,
    }).catch((tErr) => console.warn("[VerifyEmail] trial activated warning:", tErr.message));

    return res.json({
      success: true,
      message: "Email address verified successfully! Welcome to MasterHRMS.",
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
        roles,
      },
      tenant: {
        id: provisionResult.tenant.id,
        name: provisionResult.tenant.name,
        slug: provisionResult.tenant.slug,
      },
      workspaceUrl: getWorkspaceUrl(provisionResult.tenant.slug),
      subscription: {
        status: provisionResult.subscription?.status || "trialing",
        trialEndsAt: provisionResult.trialEndsAt,
      },
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

    // Cooldown check (30s)
    const eligibility = await checkResendEligibility(user.id);
    if (!eligibility.allowed) {
      return res.status(429).json({
        error: `Please wait ${eligibility.secondsRemaining} second${eligibility.secondsRemaining === 1 ? "" : "s"} before requesting a new verification code.`,
        secondsRemaining: eligibility.secondsRemaining,
      });
    }

    // Generate fresh token and code
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const verificationKey = `verify:${tokenHash}`;
    const tokenId = crypto.randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.$executeRawUnsafe(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
      tokenId,
      user.id,
      verificationKey,
      tokenExpiresAt
    ).catch(() => {});

    const { otp } = await createOrReplaceOtp(user.id);

    const origin =
      req.headers.origin ||
      (req.headers.referer ? new URL(req.headers.referer).origin : "") ||
      `http://${getEffectiveRequestHost(req)}`;
    const verificationUrl = `${origin}/auth?mode=verify&token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    await sendEmailVerificationEmail({
      toEmail: user.email,
      userName: user.profile?.fullName || user.email.split("@")[0],
      verificationUrl,
      otpCode: otp,
      expiryMinutes: 60,
    });

    return res.json({
      success: true,
      message: "A fresh verification code and link have been dispatched to your email.",
      maskedEmail: maskEmail(user.email),
      cooldownSeconds: 30,
      previewToken: process.env.NODE_ENV !== "production" ? rawToken : undefined,
      previewCode: process.env.NODE_ENV !== "production" ? otp : undefined,
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
        employees: {
          select: {
            id: true,
            tenantId: true,
            status: true,
            position: true,
            designation: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        },
        workspaceRoleAssignments: true,
      },
    });

    if (!user) {
      return res.status(400).json({ error: "User account not found." });
    }

    // Verify submitted code: check RFC 6238 TOTP / Backup code first, then fall back to Email OTP
    let isCodeValid = false;
    let verificationError = "Invalid verification code.";

    if (user.twoFactorSecret) {
      const totpResult = await TwoFactorService.verifyTotpOrBackup(user.id, String(code));
      if (totpResult.valid) {
        isCodeValid = true;
      } else {
        verificationError = totpResult.error || "Invalid 2FA code or backup code.";
        if (totpResult.rateLimited) {
          return res.status(429).json({ error: totpResult.error });
        }
      }
    }

    if (!isCodeValid) {
      const emailOtpVerification = await verifyOtpCode(user.id, String(code));
      if (emailOtpVerification.valid) {
        isCodeValid = true;
      } else if (!user.twoFactorSecret) {
        verificationError = emailOtpVerification.error || "Invalid verification code.";
      }
    }

    if (!isCodeValid) {
      return res.status(400).json({ error: verificationError });
    }

    // â”€â”€ Host-Scoped Authentication Enforcement for 2FA Completion â”€â”€
    const rawHost = getEffectiveRequestHost(req.headers);
    const hostContext = (req as any).hostContext || resolveHostContext(rawHost);

    if (hostContext.type === "tenant" || hostContext.type === "custom_domain") {
      const hasSuperPortalSignal =
        req.headers["x-auth-portal"] === "super" || req.body.portal === "super";
      if (hasSuperPortalSignal) {
        return res.status(404).json({
          error: "Not Found",
          code: "NOT_FOUND",
        });
      }
    }

    const isSuperPortal =
      hostContext.type === "super" ||
      req.headers["x-auth-portal"] === "super" ||
      req.body.portal === "super";

    // Enforcement of Super Admin / Tenant Login Separation:
    if (!isSuperPortal) {
      const isPlatformSuperAdmin = user.roles.some((r: any) => r.role === "super_admin" && !r.tenantId);
      if (isPlatformSuperAdmin) {
        // Platform Super Admin must NOT authenticate via normal /login endpoint.
        // Return generic 401 without leaking identity or super admin existence.
        return res.status(401).json({ error: "Invalid email or password." });
      }
    }

    if (isSuperPortal) {
      const isSuper = user.roles.some((r: any) => r.role === "super_admin");
      if (!isSuper) {
        return res.status(403).json({
          error: "Access denied. Only Super Administrators can log in through this portal.",
          code: "SUPER_ADMIN_ONLY",
        });
      }
    }

    if (hostContext.type === "tenant" || hostContext.type === "custom_domain") {
      let resolvedTenant = (req as any).resolvedTenant;
      if (!resolvedTenant && hostContext.type === "tenant") {
        const found = await prisma.tenant.findUnique({
          where: { slug: hostContext.slug.toLowerCase() },
          select: { id: true, name: true, slug: true },
        });
        if (found) resolvedTenant = found;
      } else if (!resolvedTenant && hostContext.type === "custom_domain") {
        const foundDomain = await prisma.tenantDomain.findUnique({
          where: { domain: hostContext.domain },
          include: { tenant: { select: { id: true, name: true, slug: true } } },
        });
        if (foundDomain && foundDomain.status === "approved" && foundDomain.dnsStatus === "verified") {
          resolvedTenant = foundDomain.tenant;
        }
      }

      if (!resolvedTenant) {
        return res.status(404).json({
          error: "Workspace not found.",
          code: "WORKSPACE_NOT_FOUND",
        });
      }

      const userTenantId =
        user.profile?.tenantId ||
        user.roles.find((r: any) => r.tenantId === resolvedTenant.id)?.tenantId ||
        user.workspaceRoleAssignments?.find((a: any) => a.tenantId === resolvedTenant.id)?.tenantId;
      if (userTenantId !== resolvedTenant.id) {
        return res.status(403).json({
          error: "This account does not belong to this workspace.",
          code: "TENANT_MISMATCH",
        });
      }
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

    // Create full authenticated session token & device session
    const userTenantId = user.profile?.tenantId || user.roles.find((r: any) => r.tenantId)?.tenantId;
    const roles = await resolveEffectiveUserRoles(user, userTenantId);

    let sessionResult: { sessionId: string; refreshToken: string } | null = null;
    try {
      const rawIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const clientIp = rawIp.split(",")[0].trim().replace(/^::ffff:/, "");
      sessionResult = await createDeviceSession({
        userId: user.id,
        tenantId: userTenantId || null,
        ipAddress: clientIp,
        userAgent: req.headers["user-agent"] as string,
      });
    } catch (err: any) {
      console.warn("[DeviceSession] 2FA session creation fallback:", err.message);
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      tenantId: user.profile?.tenantId,
      roles,
      sessionId: sessionResult?.sessionId,
    });
    await recordLoginHistory(req, user.id, user.id);

    if (sessionResult?.refreshToken) {
      res.cookie("hrms_refresh_token", sessionResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/auth",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    // Resolve user's tenant for post-login workspace redirection (Flow 1 & Flow 2)
    // Super admin users MUST stay on root platform domain and never be redirected to tenant subdomains
    let workspaceUrl: string | undefined;
    let tenantSlug: string | undefined;
    const isSuperAdminUser = roles.includes("super_admin") || Boolean(isSuperPortal);
    const effectiveTenantId = !isSuperAdminUser ? userTenantId : undefined;
    if (effectiveTenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: effectiveTenantId },
        select: { id: true, slug: true, name: true },
      });
      if (tenant?.slug) {
        tenantSlug = tenant.slug;
        if (hostContext.type === "custom_domain" && (hostContext as any).domain) {
          workspaceUrl = getCustomDomainUrl((hostContext as any).domain);
        } else {
          const primaryCustomDomain = await prisma.tenantDomain.findFirst({
            where: {
              tenantId: effectiveTenantId,
              status: "approved",
              dnsStatus: "verified",
              isPrimary: true,
            },
            select: { domain: true },
          });
          if (primaryCustomDomain?.domain) {
            workspaceUrl = getCustomDomainUrl(primaryCustomDomain.domain);
          } else {
            workspaceUrl = getWorkspaceUrl(tenant.slug);
          }
        }
      }
    }

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
      refreshToken: sessionResult?.refreshToken,
      sessionId: sessionResult?.sessionId,
      tenantSlug,
      workspaceUrl,
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
      console.warn(`âš ï¸ [2FA RESEND] Email dispatch to ${user.email} failed: ${emailResult.error}`);
      console.log(`ðŸ”‘ [2FA RESEND CODE] Use this code to sign in for ${user.email}: [${otp}]`);
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
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    const status = await TwoFactorService.getStatus(userId);

    return res.json({
      twoFactorEnabled: status.twoFactorEnabled,
      twoFactorMethod: status.twoFactorMethod,
      backupCodesRemaining: status.backupCodesRemaining,
      confirmedAt: status.confirmedAt,
      registeredEmail: user.email,
      maskedEmail: maskEmail(user.email),
    });
  } catch (err: any) {
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Failed to get 2FA status." });
  }
});

// POST /api/auth/2fa/totp/initiate
authRouter.post("/2fa/totp/initiate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId || undefined;
    const rawIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const clientIp = rawIp.split(",")[0].trim().replace(/^::ffff:/, "");

    const setupResult = await TwoFactorService.initiateTotpSetup(userId, tenantId, {
      ipAddress: clientIp,
      userAgent: req.headers["user-agent"] as string,
    });

    return res.json({
      success: true,
      secret: setupResult.secret,
      qrCode: setupResult.qrCode,
      otpauthUrl: setupResult.otpauthUrl,
      backupCodes: setupResult.backupCodes,
      issuer: "MasterHRMS",
      message: "Scan the QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator) and enter the 6-digit code.",
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to initiate TOTP setup." });
  }
});

// POST /api/auth/2fa/totp/confirm
authRouter.post("/2fa/totp/confirm", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId || undefined;

    if (!token) {
      return res.status(400).json({ error: "6-digit TOTP verification code is required." });
    }

    const rawIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const clientIp = rawIp.split(",")[0].trim().replace(/^::ffff:/, "");

    const confirmResult = await TwoFactorService.confirmTotpSetup(userId, String(token), tenantId, {
      ipAddress: clientIp,
      userAgent: req.headers["user-agent"] as string,
    });

    if (!confirmResult.success) {
      return res.status(400).json({ error: confirmResult.error });
    }

    // Dispatch security notification email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (user) {
      await sendTwoFactorSecurityEmail({
        toEmail: user.email,
        userName: user.profile?.fullName || user.email.split("@")[0],
        action: "ENABLED",
        tenantId,
      }).catch((emailErr) => console.warn("[2FA Confirm] security email warning:", emailErr.message));
    }

    return res.json({
      success: true,
      twoFactorEnabled: true,
      message: "Two-Factor Authentication is now active on your account.",
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to confirm TOTP setup." });
  }
});

// POST /api/auth/2fa/backup-codes/regenerate
authRouter.post("/2fa/backup-codes/regenerate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { currentTotp } = req.body;
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId || undefined;

    if (!currentTotp) {
      return res.status(400).json({ error: "Current 6-digit TOTP code is required to regenerate backup codes." });
    }

    const rawIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const clientIp = rawIp.split(",")[0].trim().replace(/^::ffff:/, "");

    const result = await TwoFactorService.regenerateBackupCodes(userId, String(currentTotp), tenantId, {
      ipAddress: clientIp,
      userAgent: req.headers["user-agent"] as string,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      backupCodes: result.backupCodes,
      message: "8 fresh backup recovery codes generated. Please store them securely.",
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to regenerate backup codes." });
  }
});

// POST /api/auth/2fa/disable
authRouter.post("/2fa/disable", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { currentTotp, currentPassword } = req.body || {};
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId || undefined;

    if (!currentTotp && !currentPassword) {
      return res.status(400).json({ error: "Either your current 6-digit 2FA code or your current password is required to disable 2FA." });
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!userRecord) {
      return res.status(404).json({ error: "User not found." });
    }

    if (currentPassword) {
      const isMatch = await bcrypt.compare(String(currentPassword), userRecord.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: "Incorrect current password." });
      }
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: null,
          twoFactorConfirmedAt: null,
        },
      });
      await prisma.twoFactorOtp.deleteMany({ where: { userId } }).catch(() => {});
      invalidateAuthCache(userId, tenantId);
    } else {
      const rawIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const clientIp = rawIp.split(",")[0].trim().replace(/^::ffff:/, "");

      const result = await TwoFactorService.disableTwoFactor(userId, String(currentTotp), tenantId, {
        ipAddress: clientIp,
        userAgent: req.headers["user-agent"] as string,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      invalidateAuthCache(userId, tenantId);
    }

    await sendTwoFactorSecurityEmail({
      toEmail: userRecord.email,
      userName: userRecord.profile?.fullName || userRecord.email.split("@")[0],
      action: "DISABLED",
      tenantId,
    }).catch((emailErr) => console.warn("[2FA Disable] security email warning:", emailErr.message));

    return res.json({
      success: true,
      twoFactorEnabled: false,
      message: "Two-Factor Authentication has been disabled.",
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to disable 2FA." });
  }
});

// POST /api/auth/2fa/setup-initiate (Legacy Email OTP compatibility)
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

    let emailSent = true;
    try {
      await sendTwoFactorOtpEmail({
        toEmail: user.email,
        otp,
        fullName: user.profile?.fullName || undefined,
        isSetup: true,
      });
    } catch (mailErr: any) {
      emailSent = false;
      console.warn("[2FA Setup Initiate] Email delivery warning:", mailErr?.message || mailErr);
    }

    const mfaToken = generateMfaToken({ userId: user.id, email: user.email });
    const isProd = process.env.NODE_ENV === "production";

    return res.json({
      success: true,
      mfaToken,
      maskedEmail: maskEmail(user.email),
      emailSent,
      ...(!isProd && !emailSent ? { devOtp: otp } : {}),
      message: emailSent
        ? "A 6-digit setup verification code has been sent to your registered email."
        : "Verification code generated (SMTP unavailable in local dev).",
    });
  } catch (err: any) {
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Failed to initiate 2FA setup." });
  }
});

// POST /api/auth/2fa/setup-confirm (Legacy Email OTP compatibility)
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
    const db = rawPrisma || prisma;
    const user = await db.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        profile: {
          include: {
            tenant: true,
          },
        },
        roles: true,
        employees: {
          select: {
            id: true,
            tenantId: true,
            status: true,
            position: true,
            designation: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isImpersonating = Boolean(req.user?.isImpersonating);
    const tenantId = isImpersonating && req.user?.tenantId ? req.user.tenantId : user!.profile?.tenantId;
    let roles = await resolveEffectiveUserRoles(user!, tenantId);

    let workspaceRole: any = null;
    let permissions: string[] = [];
    let enabledModules: string[] = [];
    let activeAddons: string[] = [];
    let allowedDashboards: string[] = [];

    const isSuper = roles.includes("super_admin") && !isImpersonating;

    let impersonatedTenantRecord: any = null;
    if (isImpersonating && tenantId) {
      impersonatedTenantRecord = await db.tenant.findUnique({ where: { id: tenantId } });
      if (impersonatedTenantRecord && user!.profile) {
        (user!.profile as any).tenantId = impersonatedTenantRecord.id;
        (user!.profile as any).tenant = impersonatedTenantRecord;
      }
      roles = ["tenant_admin", "admin", "workspace_admin", "hr_admin"];
    }

    if (isSuper) {
      const allPerms = await db.permission.findMany({ select: { code: true } });
      permissions = allPerms.map((p) => p.code);
      workspaceRole = {
        id: "super_admin_role",
        name: "Super Administrator",
        description: "Global Platform Administrator with full system control",
        isActive: true,
        isSystem: true,
      };
      allowedDashboards = ERP_MODULES.map((m) => m.key);
      enabledModules = ERP_MODULES.map((m) => m.key);
      activeAddons = ["*"];
    } else if (tenantId) {
      const [tenantMods, sub, tenantAddons, initialAssignment] = await Promise.all([
        db.tenantModule.findMany({
          where: { tenantId },
        }),
        db.tenantSubscription.findFirst({
          where: {
            tenantId,
            status: { in: ["active", "trialing", "trial"] },
          },
          orderBy: { createdAt: "desc" },
          include: { plan: true },
        }),
        db.tenantAddon.findMany({
          where: {
            tenantId,
            status: { in: ["active", "trial"] },
          },
        }),
        db.userRoleAssignment.findUnique({
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
        }),
      ]);

      const disabledKeySet = new Set(
        tenantMods.filter((m) => !m.isEnabled).map((m) => m.moduleKey)
      );
      const explicitlyEnabledSet = new Set(
        tenantMods.filter((m) => m.isEnabled).map((m) => m.moduleKey)
      );

      const isSubActive = Boolean(sub && (!sub.expiresAt || new Date(sub.expiresAt) > new Date()));
      const isSovereignOrGrowth = isSubActive && Boolean(
        sub?.plan && (
          sub.plan.id === "sovereign" ||
          sub.plan.id === "growth" ||
          (sub.plan.name || "").toLowerCase().includes("sovereign") ||
          (sub.plan.name || "").toLowerCase().includes("growth enterprise")
        )
      );

      const planFeatures: string[] = (isSubActive && sub?.plan && Array.isArray(sub.plan.features))
        ? (sub.plan.features as any[]).map((f) => String(f).toLowerCase())
        : [];
      const includedAddonIds: string[] = (isSubActive && sub?.plan && Array.isArray(sub.plan.includedAddonIds))
        ? (sub.plan.includedAddonIds as any[]).map((a) => String(a).toLowerCase())
        : [];

      const activeAddonSlugs = new Set(
        tenantAddons
          .filter((a) => !a.trialEndsAt || new Date(a.trialEndsAt) > new Date())
          .map((a) => a.addonSlug.toLowerCase())
      );

      const isPlanEntitled = (modKey: string): boolean => {
        if (isSovereignOrGrowth) return true;
        if (activeAddonSlugs.has(modKey) || activeAddonSlugs.has(`product_${modKey}`)) return true;
        if (includedAddonIds.includes(modKey) || includedAddonIds.includes(`product_${modKey}`)) return true;

        if (modKey === "pos") return planFeatures.some((f) => f.includes("pos"));
        if (modKey === "inventory") return planFeatures.some((f) => f.includes("inventory") || f.includes("pos"));
        if (modKey === "crm") return planFeatures.some((f) => f.includes("crm"));
        if (modKey === "finance") return planFeatures.some((f) => f.includes("financial") || f.includes("ledger") || f.includes("accounting") || f.includes("finance"));
        if (modKey === "procurement") return planFeatures.some((f) => f.includes("procurement") || f.includes("purchase") || f.includes("inventory") || f.includes("pos"));
        if (modKey === "project") return planFeatures.some((f) => f.includes("project"));
        if (modKey === "support") return planFeatures.some((f) => f.includes("support"));
        if (modKey === "analytics") return planFeatures.some((f) => f.includes("analytics") || f.includes("bi") || f.includes("report"));

        return false;
      };

      const CORE_PLATFORM_MODULES = new Set(["hrm", "project", "support", "analytics"]);

      enabledModules = ERP_MODULES.filter((m) => {
        if (disabledKeySet.has(m.key) || disabledKeySet.has(`product_${m.key}`)) return false;
        if (explicitlyEnabledSet.has(m.key) || explicitlyEnabledSet.has(`product_${m.key}`)) return true;
        if (isPlanEntitled(m.key)) return true;
        if (CORE_PLATFORM_MODULES.has(m.key)) return true;
        return false;
      }).map((m) => m.key);

      // Include active tenant add-on slugs in enabledModules
      for (const addonSlug of activeAddonSlugs) {
        if (!enabledModules.includes(addonSlug)) {
          enabledModules.push(addonSlug);
        }
      }
      // Uninstalled optional add-ons are strictly not injected into enabledModules.
      // Add-ons must be explicitly installed by the tenant to be enabled.
      let assignment = initialAssignment;

      const isAdminUser =
        (roles as string[]).includes("admin") ||
        (roles as string[]).includes("workspace_admin") ||
        (roles as string[]).includes("tenant_admin") ||
        (roles as string[]).includes("hr_admin") ||
        (roles as string[]).includes("Workspace Admin");

      if (!assignment && isAdminUser) {
        const adminRole = await db.workspaceRole.findUnique({
          where: { tenantId_name: { tenantId, name: "Workspace Admin" } },
          include: {
            permissions: { include: { permission: true } },
          },
        });
        if (adminRole) {
          await db.userRoleAssignment.create({
            data: {
              userId: user!.id,
              tenantId,
              roleId: adminRole.id,
            },
          });
          assignment = { role: adminRole } as any;
        }
      }

      if (isImpersonating && tenantId) {
        const allPerms = await db.permission.findMany({ select: { code: true } });
        permissions = allPerms.map((p) => p.code);
        workspaceRole = {
          id: "impersonated_workspace_admin",
          name: "Workspace Admin",
          description: "Super Admin impersonating Workspace Admin",
          isActive: true,
          isSystem: true,
        };
      } else if (assignment?.role && assignment.role.isActive) {
        workspaceRole = {
          id: assignment.role.id,
          name: assignment.role.name,
          description: assignment.role.description,
          isActive: assignment.role.isActive,
          isSystem: assignment.role.isSystem,
        };

        if (assignment.role.name === "Workspace Admin") {
          const allPerms = await db.permission.findMany({ select: { code: true } });
          permissions = allPerms.map((p) => p.code);
          if (!roles.includes("tenant_admin")) roles.push("tenant_admin");
          if (!roles.includes("admin")) roles.push("admin");
          if (!roles.includes("workspace_admin")) roles.push("workspace_admin");
          roles = roles.filter((r) => r !== "hr_admin");
        } else {
          permissions = assignment.role.permissions.map((rp) => rp.permission.code);
        }
      } else {
        const employeeRole = await db.workspaceRole.findUnique({
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

      activeAddons = Array.from(activeAddonSlugs);
    }

    const matchingEmployee = user!.employees?.find((e: any) => e.tenantId === tenantId) || user!.employees?.[0];
    const resolvedDesignation =
      matchingEmployee?.designation?.name ||
      matchingEmployee?.position ||
      workspaceRole?.name ||
      (roles.includes("hr_admin")
        ? "HR Administrator"
        : roles.includes("tenant_admin")
          ? "Organization Administrator"
          : roles.includes("manager")
            ? "Team Manager"
            : "Employee");

    const effectiveTenant = impersonatedTenantRecord || user!.profile?.tenant || null;
    const enhancedProfile = {
      ...user!.profile,
      tenantId: tenantId || user!.profile?.tenantId || null,
      tenant: effectiveTenant,
      designation: resolvedDesignation,
      position: matchingEmployee?.position || resolvedDesignation,
      department: matchingEmployee?.department?.name || null,
    };

    return res.json({
      id: user!.id,
      email: user!.email,
      tenant_id: tenantId || null,
      tenantId: tenantId || null,
      tenant: effectiveTenant,
      profile: enhancedProfile,
      designation: resolvedDesignation,
      roles,
      workspaceRole,
      permissions,
      enabledModules,
      activeAddons,
      allowedDashboards,
      twoFactorEnabled: user!.twoFactorEnabled,
      ...(isImpersonating
        ? {
            isImpersonating: true,
            impersonatorEmail: req.user?.impersonatorEmail || null,
          }
        : {}),
    });
  } catch (err: any) {
    console.error("[/auth/me] Workspace initialization error:", err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0]?.message || "Validation failed" });
    }
    return res.status(err.status || 500).json({
      error: "Workspace temporarily unavailable. Please retry or sign in again.",
      code: "WORKSPACE_INIT_ERROR",
    });
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
      await tx.profile.upsert({
        where: { userId: req.user!.userId },
        create: { userId: req.user!.userId, email: req.user!.email, tenantId: created.id },
        update: { tenantId: created.id },
      });
      await tx.userRole.create({ data: { userId: req.user!.userId, tenantId: created.id, role: "hr_admin" } });
      const role = await tx.workspaceRole.create({
        data: { tenantId: created.id, name: "Workspace Admin", description: "Full access to workspace", isSystem: true, isActive: true },
      });
      const allPermissions = await tx.permission.findMany({ select: { id: true, code: true } });
      if (allPermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: allPermissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
          skipDuplicates: true,
        });
      }
      const hrRole = await tx.workspaceRole.create({
        data: { tenantId: created.id, name: "HR Manager", description: "Manages employees, attendance, leave and payroll", isSystem: true, isActive: true },
      });
      const hrPerms = allPermissions.filter((p) =>
        p.code.startsWith("hrm.") || p.code.startsWith("analytics.") || p.code.startsWith("assets.") || p.code.startsWith("documents.")
      );
      if (hrPerms.length > 0) {
        await tx.rolePermission.createMany({
          data: hrPerms.map((p) => ({ roleId: hrRole.id, permissionId: p.id })),
          skipDuplicates: true,
        });
      }
      await tx.workspaceRole.create({
        data: { tenantId: created.id, name: "Employee", description: "Standard employee self-service access", isSystem: true, isActive: true },
      });
      await tx.userRoleAssignment.create({ data: { tenantId: created.id, userId: req.user!.userId, roleId: role.id } });
      const defaultPlan = await tx.subscriptionPlan.findFirst({
        where: { status: "active" },
        orderBy: [{ isTrial: "desc" }, { priceMonthly: "asc" }],
      });
      if (defaultPlan) {
        const trialDays = defaultPlan.trialDays || 14;
        await tx.tenantSubscription.create({
          data: {
            tenantId: created.id,
            planId: defaultPlan.id,
            status: "trial",
            billingCycle: "monthly",
            expiresAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
          },
        });
      }
      return created;
    });
    const token = generateToken({
      userId: req.user!.userId,
      email: req.user!.email,
      tenantId: tenant.id,
      roles: ["hr_admin"],
      sessionId: req.user?.sessionId,
    });
    return res.json({ success: true, tenant, token });
  } catch (err: any) {
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Internal server error" });
  }
});

// PUT /api/auth/profile
authRouter.put("/profile", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { fullName, email, phone, avatarUrl, password } = req.body || {};

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!currentUser) {
      return res.status(404).json({ error: "User account not found." });
    }

    let emailChanged = false;
    let passwordChanged = false;
    let nextEmail = currentUser.email;

    if (email !== undefined && typeof email === "string") {
      const cleanedEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
        return res.status(400).json({ error: "Please enter a valid email address." });
      }
      if (cleanedEmail !== currentUser.email.toLowerCase()) {
        const dup = await prisma.user.findUnique({ where: { email: cleanedEmail } });
        if (dup && dup.id !== userId) {
          return res.status(409).json({ error: "This email address is already registered to another account." });
        }
        await prisma.user.update({
          where: { id: userId },
          data: { email: cleanedEmail },
        });
        nextEmail = cleanedEmail;
        emailChanged = true;
      }
    }

    const profileUpdates: Record<string, any> = {};
    if (fullName !== undefined && typeof fullName === "string" && fullName.trim()) {
      profileUpdates.fullName = fullName.trim();
    }
    if (phone !== undefined) {
      profileUpdates.phone = phone ? String(phone).trim() : null;
    }
    if (avatarUrl !== undefined) {
      profileUpdates.avatarUrl = avatarUrl;
    }
    if (emailChanged) {
      profileUpdates.email = nextEmail;
    }

    if (Object.keys(profileUpdates).length > 0) {
      if (currentUser.profile) {
        await prisma.profile.update({
          where: { userId },
          data: profileUpdates,
        });
      } else {
        await prisma.profile.create({
          data: {
            userId,
            fullName: profileUpdates.fullName || nextEmail.split("@")[0],
            email: nextEmail,
            phone: profileUpdates.phone ?? null,
            avatarUrl: profileUpdates.avatarUrl ?? null,
            tenantId: req.tenantId || null,
          },
        });
      }
    }

    // Also sync name, email, and phone to linked Employee records in DB
    const empUpdates: Record<string, any> = {};
    if (profileUpdates.fullName) {
      const parts = String(profileUpdates.fullName).trim().split(/\s+/);
      empUpdates.firstName = parts[0] || profileUpdates.fullName;
      empUpdates.lastName = parts.slice(1).join(" ") || "";
    }
    if (emailChanged) empUpdates.email = nextEmail;
    if (phone !== undefined) empUpdates.phone = phone ? String(phone).trim() : null;
    if (Object.keys(empUpdates).length > 0) {
      await prisma.employee
        .updateMany({
          where: { userId },
          data: empUpdates,
        })
        .catch(() => {});
    }

    if (password && typeof password === "string" && password.trim().length >= 6) {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      passwordChanged = true;
    }

    const requireRelogin = emailChanged || passwordChanged;
    if (requireRelogin) {
      await revokeAllSessions(userId).catch(() => {});
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            tenant: true,
          },
        },
        roles: true,
        employees: {
          select: {
            id: true,
            tenantId: true,
            status: true,
            position: true,
            designation: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Invalidate auth cache & chat profile cache immediately
    invalidateAuthCache(userId, req.tenantId);
    invalidateChatProfileCache(userId, req.tenantId);

    return res.json({
      success: true,
      requireRelogin,
      message: requireRelogin
        ? "Account credentials updated. Please sign in again with your updated email/password."
        : "Profile information updated successfully.",
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

// POST /api/auth/logout - Immediately clear server-side authorization cache & revoke device push subscription
authRouter.post("/logout", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const tenantId = req.user?.tenantId || req.tenantId;
    const { deviceId, endpoint } = req.body || {};

    if (userId) {
      invalidateAuthCache(userId, tenantId || undefined);
      invalidateChatProfileCache(userId, tenantId || undefined);

      // If deviceId or endpoint supplied, revoke this specific device's push subscription
      if (tenantId && (deviceId || endpoint)) {
        await PushSubscriptionStore.revokeDeviceSubscription(tenantId, userId, deviceId || endpoint);
      }

      // Revoke the specific device session if available in token or body
      const sessionId = (req.user as any)?.sessionId || req.body?.sessionId;
      if (sessionId) {
        await revokeSession(sessionId, userId).catch(() => { });
      }
    }
    res.clearCookie("hrms_refresh_token", { path: "/api/auth" });
    return res.json({ success: true, message: "Logged out and authorization cache cleared." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Logout failed" });
  }
});

// â”€â”€â”€ OAuth 2.0 Configuration & Social Login Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


// ─── Device Session Management ──────────────────────────────────────────────
// POST /api/auth/refresh — Rotate refresh token and issue new access token atomically
authRouter.post("/refresh", async (req: Request, res: Response) => {
  try {
    const rawRefreshToken = req.body?.refreshToken || (req as any).cookies?.["hrms_refresh_token"];
    const sessionId = req.body?.sessionId;

    if (!rawRefreshToken || !sessionId) {
      return res.status(401).json({ error: "Refresh token and sessionId are required." });
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);
    const rotationResult = await rotateRefreshToken(sessionId, tokenHash);

    if (!rotationResult) {
      res.clearCookie("hrms_refresh_token", { path: "/api/auth" });
      return res.status(401).json({ error: "Session invalid, expired, or reuse detected. Please sign in again." });
    }

    const { refreshToken: newRefreshToken, session } = rotationResult;
    const user = session.user;
    if (!user) {
      return res.status(401).json({ error: "Associated user not found." });
    }

    const userTenantId = session.tenantId || user.profile?.tenantId;
    const roles = await resolveEffectiveUserRoles(user, userTenantId);
    const newAccessToken = generateToken({
      userId: user.id,
      email: user.email,
      tenantId: userTenantId,
      roles,
      sessionId: session.id,
    });

    res.cookie("hrms_refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      sessionId: session.id,
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Session refresh failed." });
  }
});


// GET /api/auth/sessions — List active device sessions for the authenticated user
authRouter.get("/sessions", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const tenantId = req.user?.tenantId;
    if (!userId) return res.status(401).json({ error: "Unauthorized." });
    const sessions = await getActiveSessions(userId, tenantId || undefined);
    return res.json({ sessions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to retrieve sessions." });
  }
});

// DELETE /api/auth/sessions/:sessionId — Revoke a specific device session (own only)
authRouter.delete("/sessions/:sessionId", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized." });
    const { sessionId } = req.params;
    const success = await revokeSession(sessionId, userId);
    if (!success) return res.status(404).json({ error: "Session not found or already revoked." });
    return res.json({ success: true, message: "Session revoked successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to revoke session." });
  }
});

// POST /api/auth/sessions/revoke-all — Revoke all device sessions for the current user
authRouter.post("/sessions/revoke-all", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const tenantId = req.user?.tenantId;
    if (!userId) return res.status(401).json({ error: "Unauthorized." });
    const count = await revokeAllSessions(userId, tenantId || undefined);
    return res.json({ success: true, revokedCount: count, message: `${count} session(s) revoked.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to revoke all sessions." });
  }
});

async function getPlatformOAuthConfig(req?: any) {
  return OAuthFactory.resolveConfig(req);
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
      github: {
        enabled: Boolean(config.github.enabled && config.github.clientId),
        configured: Boolean(config.github.clientId),
      },
      microsoft: {
        enabled: Boolean(config.microsoft.enabled && config.microsoft.clientId),
        configured: Boolean(config.microsoft.clientId),
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
      slack: {
        enabled: Boolean(config.slack.enabled && config.slack.clientId),
        configured: Boolean(config.slack.clientId),
      },
      providers: {
        google: {
          enabled: Boolean(config.google.enabled && config.google.clientId),
          configured: Boolean(config.google.clientId),
        },
        github: {
          enabled: Boolean(config.github.enabled && config.github.clientId),
          configured: Boolean(config.github.clientId),
        },
        microsoft: {
          enabled: Boolean(config.microsoft.enabled && config.microsoft.clientId),
          configured: Boolean(config.microsoft.clientId),
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
        slack: {
          enabled: Boolean(config.slack.enabled && config.slack.clientId),
          configured: Boolean(config.slack.clientId),
        },
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
  const state = OAuthFactory.generateState(provider);

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
  } else if (provider === "github") {
    if (!config.github.clientId) {
      return res.redirect(
        `${config.frontendBaseUrl}/auth?error=${encodeURIComponent("GitHub OAuth Client ID is not configured yet in Super Admin Settings.")}`,
      );
    }
    const params = new URLSearchParams({
      client_id: config.github.clientId,
      redirect_uri: config.github.callbackUrl,
      scope: config.github.scope,
      state,
    });
    authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  } else if (provider === "microsoft") {
    if (!config.microsoft.clientId) {
      return res.redirect(
        `${config.frontendBaseUrl}/auth?error=${encodeURIComponent("Microsoft OAuth Client ID is not configured yet in Super Admin Settings.")}`,
      );
    }
    const params = new URLSearchParams({
      client_id: config.microsoft.clientId,
      response_type: "code",
      redirect_uri: config.microsoft.callbackUrl,
      response_mode: "query",
      scope: config.microsoft.scope,
      state,
    });
    authUrl = `https://login.microsoftonline.com/${config.microsoft.tenantId || "common"}/oauth2/v2.0/authorize?${params.toString()}`;
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
  } else if (provider === "slack") {
    if (!config.slack.clientId) {
      return res.redirect(
        `${config.frontendBaseUrl}/auth?error=${encodeURIComponent("Slack Client ID is not configured yet in Super Admin Settings.")}`,
      );
    }
    const params = new URLSearchParams({
      client_id: config.slack.clientId,
      redirect_uri: config.slack.callbackUrl,
      response_type: "code",
      scope: config.slack.scope,
      state,
    });
    authUrl = `https://slack.com/openid/connect/authorize?${params.toString()}`;
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

  const state = (req.query?.state as string) || (req.body?.state as string);
  if (state && !OAuthFactory.validateState(state, provider)) {
    console.warn(`[OAuth] State validation / CSRF check warning for ${provider}: ${state}`);
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
    } else if (provider === "github") {
      // 1. Exchange code for GitHub token
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: config.github.clientId,
          client_secret: config.github.clientSecret,
          code,
          redirect_uri: config.github.callbackUrl,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        throw new Error(tokenData.error_description || "Failed to exchange GitHub authorization token");
      }

      // 2. Fetch user profile
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "MasterHRMS-OAuth",
        },
      });
      const userData = await userRes.json();
      email = userData.email;
      fullName = userData.name || userData.login || email?.split("@")[0] || "GitHub User";
      avatarUrl = userData.avatar_url || "";

      if (!email) {
        const emailRes = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            "User-Agent": "MasterHRMS-OAuth",
          },
        });
        const emails = await emailRes.json();
        if (Array.isArray(emails)) {
          const primary = emails.find((e: any) => e.primary && e.verified) || emails[0];
          if (primary?.email) email = primary.email;
        }
      }
    } else if (provider === "microsoft") {
      // 1. Exchange code for Microsoft token
      const tenant = config.microsoft.tenantId || "common";
      const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.microsoft.clientId,
          client_secret: config.microsoft.clientSecret,
          code,
          redirect_uri: config.microsoft.callbackUrl,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        throw new Error(tokenData.error_description || "Failed to exchange Microsoft authorization token");
      }

      // 2. Fetch user profile from Microsoft Graph
      const userRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();
      email = userData.mail || userData.userPrincipalName;
      fullName = userData.displayName || `${userData.givenName || ""} ${userData.surname || ""}`.trim() || email?.split("@")[0] || "Microsoft User";
    } else if (provider === "slack") {
      // 1. Exchange code for Slack OpenID Connect token
      const tokenRes = await fetch("https://slack.com/api/openid.connect.token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: config.slack.clientId,
          client_secret: config.slack.clientSecret,
          redirect_uri: config.slack.callbackUrl,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.ok && !tokenData.access_token) {
        throw new Error(tokenData.error || "Failed to exchange Slack authorization token");
      }

      // 2. Fetch user profile from Slack OpenID Connect endpoint
      const userRes = await fetch("https://slack.com/api/openid.connect.userInfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();
      if (!userData.ok && !userData.email) {
        throw new Error(userData.error || "Failed to retrieve Slack user profile");
      }
      email = userData.email;
      fullName = userData.name || email.split("@")[0] || "Slack User";
      avatarUrl = userData.picture || "";
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
    let sessionResult: { sessionId: string; refreshToken: string } | null = null;
    try {
      const rawIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const clientIp = rawIp.split(",")[0].trim().replace(/^::ffff:/, "");
      sessionResult = await createDeviceSession({
        userId: user.id,
        tenantId: user.profile?.tenantId || null,
        ipAddress: clientIp,
        userAgent: req.headers["user-agent"] as string,
      });
    } catch (err: any) {
      console.warn("[OAuth] Device session create failure:", err?.message);
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      tenantId: user.profile?.tenantId || null,
      roles: roles.length > 0 ? roles : ["employee"],
      sessionId: sessionResult?.sessionId,
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
 * POST /api/auth/profile/avatar
 * Allows ANY authenticated user to upload or replace their profile avatar image
 */
authRouter.post("/profile/avatar", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId || req.tenantId || undefined;
    const { imageDataUrl } = req.body || {};

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return res.status(400).json({ error: "An image file (data URL) is required." });
    }

    const match = imageDataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/i);
    if (!match) {
      return res.status(400).json({ error: "Unsupported image format. Please upload PNG, JPG, WEBP, or GIF." });
    }

    const mime = match[1].toLowerCase();
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/gif" ? "gif" : "jpg";
    const buffer = Buffer.from(match[2], "base64");

    if (buffer.length === 0) {
      return res.status(400).json({ error: "Uploaded image is empty." });
    }
    if (buffer.length > 3 * 1024 * 1024) {
      return res.status(400).json({ error: "Profile image must be 3 MB or smaller." });
    }

    const avatarsDir = path.join(getUploadsRoot(), "avatars");
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    // Remove previous local avatar file if one exists
    const existingProfile = await prisma.profile.findUnique({ where: { userId } });
    if (existingProfile?.avatarUrl && existingProfile.avatarUrl.startsWith("/uploads/avatars/")) {
      const oldFile = path.basename(existingProfile.avatarUrl);
      const oldAbs = path.join(avatarsDir, oldFile);
      if (fs.existsSync(oldAbs)) {
        fs.unlinkSync(oldAbs);
      }
    }

    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
    const fileName = `${safeUserId}-${Date.now()}.${ext}`;
    const absPath = path.join(avatarsDir, fileName);
    fs.writeFileSync(absPath, buffer);

    const avatarUrl = `/uploads/avatars/${fileName}`;

    await prisma.profile.upsert({
      where: { userId },
      update: { avatarUrl },
      create: {
        userId,
        email: req.user!.email || "",
        fullName: req.user!.email?.split("@")[0] || "User",
        tenantId: tenantId || null,
        avatarUrl,
      },
    });

    invalidateAuthCache(userId, tenantId);
    invalidateChatProfileCache(userId, tenantId);

    return res.json({
      success: true,
      avatarUrl,
      message: "Profile image updated successfully.",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to upload profile image." });
  }
});

/**
 * DELETE /api/auth/profile/avatar
 * Allows ANY authenticated user to remove their profile avatar image
 */
authRouter.delete("/profile/avatar", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId || req.tenantId || undefined;

    const existingProfile = await prisma.profile.findUnique({ where: { userId } });
    if (existingProfile?.avatarUrl && existingProfile.avatarUrl.startsWith("/uploads/avatars/")) {
      const avatarsDir = path.join(getUploadsRoot(), "avatars");
      const oldAbs = path.join(avatarsDir, path.basename(existingProfile.avatarUrl));
      if (fs.existsSync(oldAbs)) {
        fs.unlinkSync(oldAbs);
      }
    }

    await prisma.profile.updateMany({
      where: { userId },
      data: { avatarUrl: null },
    });

    invalidateAuthCache(userId, tenantId);
    invalidateChatProfileCache(userId, tenantId);

    return res.json({
      success: true,
      avatarUrl: null,
      message: "Profile image removed successfully.",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to remove profile image." });
  }
});

/**
 * POST /api/auth/change-password/request-otp
 * Triggers a 6-digit confirmation OTP email before changing password (for ALL users)
 */
authRouter.post("/change-password/request-otp", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword } = req.body || {};

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) {
      return res.status(404).json({ error: "User record not found." });
    }

    // If currentPassword was provided, verify it up front for immediate UX feedback
    if (currentPassword) {
      const isMatch = await bcrypt.compare(String(currentPassword), user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: "Incorrect current password." });
      }
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    const existingSetting = await prisma.setting.findFirst({
      where: {
        scope: "USER",
        scopeId: userId,
        group: "password_change_otp",
        key: "otp",
      },
    });

    const payload = { otpHash, expiresAt, createdAt: new Date().toISOString() };
    if (existingSetting) {
      await prisma.setting.update({
        where: { id: existingSetting.id },
        data: { valueJson: payload, valueType: "json" },
      });
    } else {
      await prisma.setting.create({
        data: {
          scope: "USER",
          scopeId: userId,
          group: "password_change_otp",
          key: "otp",
          valueJson: payload,
          valueType: "json",
        },
      });
    }

    let emailSent = true;
    try {
      await sendTwoFactorOtpEmail({
        toEmail: user.email,
        otp,
        fullName: user.profile?.fullName || undefined,
        isSetup: false,
      });
    } catch (mailErr: any) {
      emailSent = false;
      console.warn("[Change Password OTP] Email delivery warning:", mailErr?.message || mailErr);
    }

    const isProd = process.env.NODE_ENV === "production";
    return res.json({
      success: true,
      maskedEmail: maskEmail(user.email),
      emailSent,
      ...(!isProd && !emailSent ? { devOtp: otp } : {}),
      message: emailSent
        ? `A 6-digit password confirmation OTP has been sent to ${maskEmail(user.email)}.`
        : "Password confirmation OTP generated (SMTP unavailable in local dev).",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to send confirmation OTP." });
  }
});

/**
 * POST /api/auth/change-password
 * Allows ANY authenticated user/employee to change their password after Email OTP confirmation
 */
authRouter.post("/change-password", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId || req.tenantId || undefined;
    const { currentPassword, newPassword, otp, otpCode } = req.body || {};
    const resolvedOtp = String(otp || otpCode || "").trim();

    if (!currentPassword) {
      return res.status(400).json({ error: "Current password is required." });
    }
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }
    if (!resolvedOtp || resolvedOtp.length !== 6) {
      return res.status(400).json({ error: "A valid 6-digit confirmation OTP from your email is required." });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) {
      return res.status(404).json({ error: "User record not found." });
    }

    const isMatch = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect current password." });
    }

    const otpSetting = await prisma.setting.findFirst({
      where: {
        scope: "USER",
        scopeId: userId,
        group: "password_change_otp",
        key: "otp",
      },
    });
    if (!otpSetting?.valueJson) {
      return res.status(400).json({ error: "No active confirmation OTP found. Please request a new OTP email first." });
    }

    const parsedOtp = otpSetting.valueJson as { otpHash?: string; expiresAt?: string } | null;

    if (!parsedOtp?.otpHash || !parsedOtp?.expiresAt || new Date(parsedOtp.expiresAt).getTime() < Date.now()) {
      await prisma.setting.delete({ where: { id: otpSetting.id } }).catch(() => {});
      return res.status(400).json({ error: "Confirmation OTP has expired. Please request a new OTP." });
    }

    const providedHash = crypto.createHash("sha256").update(resolvedOtp).digest("hex");
    if (providedHash !== parsedOtp.otpHash) {
      return res.status(400).json({ error: "Invalid confirmation OTP. Please check your email and try again." });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await prisma.setting.delete({ where: { id: otpSetting.id } }).catch(() => {});
    // Revoke all active sessions so user must re-login with the updated password
    await revokeAllSessions(userId).catch(() => {});
    invalidateAuthCache(userId, tenantId);

    await sendPasswordChangedEmail({
      toEmail: user.email,
      userName: user.profile?.fullName || user.email.split("@")[0],
      tenantId,
    }).catch((mailErr) => console.warn("[Change Password] notification email warning:", mailErr?.message));

    return res.json({
      success: true,
      requireRelogin: true,
      message: "Your password has been changed successfully. Please sign in with your new password.",
    });
  } catch (err: any) {
    return res.status(err instanceof z.ZodError ? 400 : err.status || (err.code === "P2002" ? 409 : 500)).json({ error: err.message || "Failed to update password." });
  }
});

/**
 * POST /api/auth/admin/users/:userId/disable-2fa
 * Allows Tenant Admin / HR Admin / Super Admin to disable 2FA for any user in their tenant
 */
authRouter.post("/admin/users/:userId/disable-2fa", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = String(req.params.userId || "").trim();
    const callerRoles = (req.user?.roles || []).map((r: string) => r.toLowerCase());
    const isSuperAdmin = callerRoles.includes("super_admin");
    const isTenantAdmin =
      isSuperAdmin ||
      callerRoles.includes("tenant_admin") ||
      callerRoles.includes("hr_admin") ||
      callerRoles.includes("admin") ||
      callerRoles.includes("owner");

    if (!isTenantAdmin) {
      return res.status(403).json({ error: "Only Tenant Administrators can disable 2FA for other users." });
    }

    if (!targetUserId) {
      return res.status(400).json({ error: "Target user ID is required." });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    });
    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found." });
    }

    const callerTenantId = req.user?.tenantId || req.tenantId;
    if (!isSuperAdmin && targetUser.profile?.tenantId !== callerTenantId) {
      return res.status(403).json({ error: "Cannot modify 2FA settings for a user outside your organization." });
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        twoFactorConfirmedAt: null,
      },
    });
    await prisma.twoFactorOtp.deleteMany({ where: { userId: targetUserId } }).catch(() => {});

    invalidateAuthCache(targetUserId, targetUser.profile?.tenantId || undefined);

    await sendTwoFactorSecurityEmail({
      toEmail: targetUser.email,
      userName: targetUser.profile?.fullName || targetUser.email.split("@")[0],
      action: "DISABLED",
      tenantId: targetUser.profile?.tenantId || undefined,
    }).catch((mailErr) => console.warn("[Admin Disable 2FA] security email warning:", mailErr?.message));

    return res.json({
      success: true,
      userId: targetUserId,
      twoFactorEnabled: false,
      message: `Two-Factor Authentication has been disabled for ${targetUser.profile?.fullName || targetUser.email}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to disable user 2FA." });
  }
});

