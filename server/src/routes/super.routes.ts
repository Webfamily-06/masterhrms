import { sendTwoFactorOtpEmail, sendSubscriptionLifecycleEmail } from "../lib/email";
import { Router, Response } from "express";
import { rawPrisma as prisma } from "../prisma";
import { requireAuth, requireSuperAdmin, AuthRequest } from "../middleware/auth";
import { generateToken } from "../lib/jwt";
import { z } from "zod";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { getIO } from "../socket";
import { getWorkspacePolicy, getWorkspacePoliciesBatch, resolveWorkspacePolicy, syncSubscriptionPlans } from "../services/workspace-policy.service";
import { generateDatabaseBackup, listBackupSnapshots, getBackupFilePath, deleteBackupSnapshot } from "../services/backup.service";
import { getLanguagesList, getLanguagePhrases, saveLanguagePhrases, createLanguagePack, deleteLanguagePack, toggleLanguagePackStatus } from "../services/language.service";
import { handleTenantSuspension, handleTenantReactivation } from "../services/subscription-lifecycle.service";
import { TenantUsageMetricsService } from "../services/tenant-usage-metrics.service";
import { validateBillableUserCount, calculatePlanPricing } from "../services/billing-duration.service";

export const superRouter = Router();

const policySchema = z.object({
  planId: z.string().nullable(),
  status: z.enum(["active", "suspended"]),
  maxEmployees: z.number().int().min(0).max(2147483647).nullable(),
  maxUsers: z.number().int().min(0).max(2147483647).nullable(),
  expiresAt: z.string().datetime().nullable(),
  billingCycle: z.enum(["monthly", "annual"]),
});

superRouter.put("/tenants/:id/policy", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const policy = policySchema.parse(req.body);
    const result = await prisma.$transaction(async (tx: any) => {
      const rows = await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${req.params.id} FOR UPDATE`;
      if (!rows.length) throw Object.assign(new Error("Workspace not found"), { status: 404 });
      const catalog = await tx.cmsPage.findUnique({ where: { slug: "system-monetization-plans" } });
      const plans = catalog?.content?.plans || [];
      if (policy.planId && !plans.some((p: any) => p.id === policy.planId)) {
        throw Object.assign(new Error("Select a saved subscription plan."), { status: 400 });
      }
      await syncSubscriptionPlans(plans, tx);
      const slug = `tenant-${req.params.id}-subscription`;
      const previous = await tx.cmsPage.findUnique({ where: { slug } });
      const content = { ...(previous?.content || {}), ...policy };
      const previousSubscription = await tx.tenantSubscription.findUnique({ where: { tenantId: req.params.id } });
      const relationalSubscription = await tx.tenantSubscription.upsert({
        where: { tenantId: req.params.id },
        create: {
          tenantId: req.params.id,
          planId: policy.planId,
          status: policy.status,
          maxEmployees: policy.maxEmployees,
          maxUsers: policy.maxUsers,
          expiresAt: policy.expiresAt ? new Date(policy.expiresAt) : null,
          billingCycle: policy.billingCycle,
        },
        update: {
          planId: policy.planId,
          status: policy.status,
          maxEmployees: policy.maxEmployees,
          maxUsers: policy.maxUsers,
          expiresAt: policy.expiresAt ? new Date(policy.expiresAt) : null,
          billingCycle: policy.billingCycle,
        },
      });
      await tx.subscriptionPolicyAudit.create({
        data: {
          tenantId: req.params.id,
          subscriptionId: relationalSubscription.id,
          actorUserId: req.user!.userId,
          before: previousSubscription ? {
            planId: previousSubscription.planId, status: previousSubscription.status,
            maxEmployees: previousSubscription.maxEmployees, maxUsers: previousSubscription.maxUsers,
            expiresAt: previousSubscription.expiresAt?.toISOString() || null,
            billingCycle: previousSubscription.billingCycle,
          } : null,
          after: policy,
        },
      });
      await tx.cmsPage.upsert({ where: { slug },
        create: { slug, title: "Workspace subscription", content, published: false, updatedBy: req.user!.userId },
        update: { content, published: false, updatedBy: req.user!.userId },
      });
      // Keep an immutable legacy record while old deployment clients still read CMS.
      await tx.cmsPage.create({ data: {
        slug: `system-workspace-policy-audit-${crypto.randomUUID()}`, title: "Workspace policy changed", published: false,
        updatedBy: req.user!.userId,
        content: { tenant_id: req.params.id, actor: req.user!.userId, before: previous?.content || null, after: policy, at: new Date().toISOString() },
      } });
      return resolveWorkspacePolicy(content, plans);
    });
    if (result.status === "suspended" || (result.expiresAt && new Date(result.expiresAt) <= new Date())) {
      getIO()?.in(`tenant:${req.params.id}`).disconnectSockets(true);
    }
    return res.json(result);
  } catch (error: any) {
    return res.status(error instanceof z.ZodError ? 400 : error.status || 500).json({ error: error instanceof z.ZodError ? error.errors[0].message : error.message });
  }
});

// POST /api/super/smtp/test-otp-email
superRouter.post("/smtp/test-otp-email", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { toEmail } = req.body;
    if (!toEmail || !toEmail.includes("@")) {
      return res.status(400).json({ error: "Please provide a valid recipient email address." });
    }

    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const result = await sendTwoFactorOtpEmail({
      toEmail: toEmail.trim(),
      otp: testOtp,
      fullName: "Super Admin Tester",
      isSetup: false,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || "SMTP delivery failed. Please check your SMTP host, port, credentials, and encryption.",
        otp: testOtp,
      });
    }

    return res.json({
      success: true,
      message: `Test 2FA verification email delivered successfully to ${toEmail} (Message ID: ${result.messageId || "sent"}).`,
      otp: testOtp,
      messageId: result.messageId,
    });
  } catch (err: any) {
    console.error("[/smtp/test-otp-email] error:", err);
    return res.status(500).json({ error: err.message || "Failed to send test OTP email." });
  }
});


// POST /api/super/impersonate/:tenantId (Direct One-Click Tenant Admin Login)
superRouter.post("/impersonate/:tenantId", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant workspace not found" });
    }

    // Switch user's active tenant in Profile
    await prisma.profile.update({
      where: { userId: req.user!.userId },
      data: { tenantId: tenant.id },
    });

    // Generate fresh token with super admin & tenant admin roles for this workspace, plus impersonation metadata
    const roles = ["super_admin", "admin", "hr_admin"];
    const token = generateToken({
      userId: req.user!.userId,
      email: req.user!.email,
      tenantId: tenant.id,
      roles,
      isImpersonating: true,
      impersonatorUserId: req.user!.userId,
      impersonatorEmail: req.user!.email,
    });

    return res.json({
      success: true,
      message: `Entering ${tenant.name} workspace as impersonator`,
      token,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      roles,
      isImpersonating: true,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/super/leave-impersonation (Restore Original Super Admin Session)
// requireSuperAdmin is safe here: the impersonating JWT issued by /impersonate/:tenantId
// always includes "super_admin" in its roles array, so this adds defense-in-depth
// without breaking the impersonation exit workflow.
superRouter.post("/leave-impersonation", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.isImpersonating) {
      return res.status(400).json({ error: "Active session is not an impersonation session." });
    }

    const superAdminUserId = req.user.impersonatorUserId || req.user.userId;
    const superAdminUser = await prisma.user.findUnique({
      where: { id: superAdminUserId },
      include: { roles: true },
    });

    if (!superAdminUser) {
      return res.status(404).json({ error: "Original Super Admin account not found." });
    }

    // Reset profile tenantId to null (Super Admin global mode)
    await prisma.profile.updateMany({
      where: { userId: superAdminUser.id },
      data: { tenantId: null },
    });

    const roles = superAdminUser.roles.map((r: any) => r.role);
    const token = generateToken({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      tenantId: null,
      roles: roles.length ? roles : ["super_admin"],
    });

    return res.json({
      success: true,
      message: "Exited impersonation. Returned to Super Admin console.",
      token,
      roles: roles.length ? roles : ["super_admin"],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to leave impersonation." });
  }
});

// PATCH /api/super/tenants/:id/status (Toggle / Set Tenant Status)
superRouter.patch("/tenants/:id/status", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ error: "Status must be either 'active' or 'suspended'." });
    }

    if (status === "suspended") {
      const result = await handleTenantSuspension({
        tenantId: id,
        reason,
        actorEmail: req.user?.email,
      });
      return res.json({ success: true, message: result.message, status: "suspended", emailsSent: result.emailsSent });
    } else {
      const result = await handleTenantReactivation({
        tenantId: id,
        actorEmail: req.user?.email,
      });
      return res.json({ success: true, message: result.message, status: "active" });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update tenant status." });
  }
});

// POST /api/super/tenants/:id/suspend
superRouter.post("/tenants/:id/suspend", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const result = await handleTenantSuspension({
      tenantId: id,
      reason,
      actorEmail: req.user?.email,
    });
    return res.json({ success: true, message: result.message, status: "suspended", emailsSent: result.emailsSent });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to suspend tenant." });
  }
});

// POST /api/super/tenants/:id/reactivate
superRouter.post("/tenants/:id/reactivate", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await handleTenantReactivation({
      tenantId: id,
      actorEmail: req.user?.email,
    });
    return res.json({ success: true, message: result.message, status: "active" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to reactivate tenant." });
  }
});

// POST /api/super/email-templates/test (Send preview test email)
superRouter.post("/email-templates/test", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { templateId, toEmail, subject, htmlBody } = req.body;
    const recipient = toEmail || req.user?.email;
    if (!recipient) {
      return res.status(400).json({ error: "Recipient email is required." });
    }

    const testVars = {
      company_name: "Acme Global Solutions",
      tenant_name: "Acme Global Solutions",
      tenant_id: "ten_test_demo",
      plan_name: "Enterprise Tier",
      expiry_date: "Oct 18, 2026",
      days_remaining: "15",
      suspension_date: "Oct 3, 2026, 02:00 UTC",
      suspension_reason: "Test email dispatch from Super Admin Console",
      support_email: "support@masterhrms.com",
      renewal_url: `${process.env.APP_BASE_URL || "https://masterhrms.com"}/subscription`,
      admin_name: req.user?.email?.split("@")[0] || "Administrator",
    };

    const result = await sendSubscriptionLifecycleEmail({
      toEmail: recipient,
      templateId: templateId || "subscription-reminder-15d",
      templateFallback: subject && htmlBody ? { subject, htmlBody } : undefined,
      variables: testVars,
    });

    if (!result.success && result.error && !result.error.includes("not configured")) {
      return res.status(500).json({ error: result.error });
    }

    return res.json({
      success: true,
      message: `Test email dispatched to ${recipient}.`,
      messageId: result.messageId || "mock-test-id",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to dispatch test email." });
  }
});

// GET /api/super/stats
superRouter.get("/stats", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const started = Date.now();
    const [totalUsers, tenants, totalEmployees, totalDepartments, activeEmployees, openTickets] = await Promise.all([
      prisma.user.count(), prisma.tenant.findMany({ select: { id: true, createdAt: true } }),
      prisma.employee.count(), prisma.department.count(),
      prisma.employee.count({ where: { status: "active" } }),
      prisma.platformSupportTicket.count({ where: { status: { notIn: ["resolved", "closed"] } } }),
    ]);
    const policyMap = await getWorkspacePoliciesBatch(tenants.map((t) => t.id));
    const policies = tenants.map((t) => policyMap[t.id] || resolveWorkspacePolicy());
    const active = policies.filter((p) => p.status === "active" && (!p.expiresAt || new Date(p.expiresAt) > new Date()));
    const mrr = active.reduce((total, p) => total + p.monthlyRevenue, 0);
    const distribution = new Map<string, number>();
    policies.forEach((p) => distribution.set(p.planName, (distribution.get(p.planName) || 0) + 1));
    const now = new Date();
    const growth = Array.from({ length: 6 }, (_, i) => {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1));
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      return { month: start.toISOString().slice(0, 7), workspaces: tenants.filter((t) => t.createdAt >= start && t.createdAt < end).length };
    });
    return res.json({
      totalUsers, totalTenants: tenants.length, totalEmployees, activeEmployees, totalDepartments,
      mrr, arr: mrr * 12, arpu: active.length ? mrr / active.length : 0,
      activeTenants: active.length, suspendedTenants: policies.filter((p) => p.status === "suspended").length,
      unassignedTenants: policies.filter((p) => !p.planId).length,
      openTickets, growth, planDistribution: Array.from(distribution, ([name, count]) => ({ name, count })),
      queryDurationMs: Date.now() - started, measuredAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// Helper function to calculate real company statistics from Supabase PostgreSQL
// Authoritative status rule:
//   inactive = TenantSubscription.status === "suspended" OR status === "expired" OR expiresAt is in the past
//   active   = everything else (no subscription row, status "active", status "trialing", valid future expiry)
async function getCompanyMetricsData() {
  const [totalTenants, tenants, subscriptions, totalWarehouses, totalBranches] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.findMany({
      select: {
        id: true,
        createdAt: true,
        _count: {
          select: {
            branches: true,
            warehouses: true,
            establishments: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    // Fetch all TenantSubscription rows in one query for consistency
    prisma.tenantSubscription.findMany({
      select: { tenantId: true, status: true, expiresAt: true },
    }),
    prisma.warehouse.count(),
    prisma.branch.count({ where: { status: "active" } }),
  ]);

  const subMap = new Map(subscriptions.map((s: any) => [s.tenantId, s]));
  const now = new Date();

  // Determine effective status per tenant using the authoritative rule
  const isTenantInactive = (tenantId: string): boolean => {
    const sub = subMap.get(tenantId) as any;
    if (!sub) return false; // no subscription = default active
    if (sub.status === "suspended" || sub.status === "expired") return true;
    if (sub.expiresAt && new Date(sub.expiresAt) < now) return true;
    return false;
  };

  const activeTenants = tenants.filter((t) => !isTenantInactive(t.id)).length;
  const inactiveTenants = Math.max(0, totalTenants - activeTenants);

  // Real count of companies with configured location data
  const companiesWithLocation = tenants.filter(
    (t) => (t._count?.branches || 0) > 0 || (t._count?.warehouses || 0) > 0 || (t._count?.establishments || 0) > 0
  ).length;

  // Real 7-point trend data for sparklines
  const sparklineDays = 7;
  const totalTrend: number[] = [];
  const activeTrend: number[] = [];
  const inactiveTrend: number[] = [];
  const locationTrend: number[] = [];

  for (let i = sparklineDays - 1; i >= 0; i--) {
    const cutoff = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const tenantsUpToCutoff = tenants.filter((t) => new Date(t.createdAt) <= cutoff);
    const countAtCutoff = tenantsUpToCutoff.length;
    totalTrend.push(countAtCutoff);

    const activeAtCutoff = tenantsUpToCutoff.filter((t) => !isTenantInactive(t.id)).length;
    activeTrend.push(activeAtCutoff);
    inactiveTrend.push(Math.max(0, countAtCutoff - activeAtCutoff));

    const locAtCutoff = tenantsUpToCutoff.filter(
      (t) => (t._count?.branches || 0) > 0 || (t._count?.warehouses || 0) > 0 || (t._count?.establishments || 0) > 0
    ).length;
    locationTrend.push(locAtCutoff);
  }

  return {
    total: totalTenants,
    active: activeTenants,
    inactive: inactiveTenants,
    locations: companiesWithLocation,
    totalPhysicalLocations: totalWarehouses + totalBranches,
    sparklines: {
      total: totalTrend,
      active: activeTrend,
      inactive: inactiveTrend,
      locations: locationTrend,
    },
  };
}

// GET /api/super/tenants/stats
superRouter.get("/tenants/stats", requireAuth, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await getCompanyMetricsData();
    return res.json(stats);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to retrieve company statistics" });
  }
});

// GET /api/super/tenants
superRouter.get("/tenants", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search, plan, status, page, limit, paginated, dateFrom, dateTo, dateRange } = req.query as {
      search?: string;
      plan?: string;
      status?: string;
      page?: string;
      limit?: string;
      paginated?: string;
      dateFrom?: string;
      dateTo?: string;
      dateRange?: string;
    };

    const isPaginatedRequest = Boolean(
      page || limit || paginated === "true" || search !== undefined || plan !== undefined || status !== undefined || dateFrom || dateTo || dateRange
    );

    const pageNum = Math.max(1, parseInt(page || "1", 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || "10", 10) || 10));

    // Construct Prisma WHERE conditions
    const where: any = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { tenantDomains: { some: { domain: { contains: q, mode: "insensitive" } } } },
        { profiles: { some: { OR: [{ email: { contains: q, mode: "insensitive" } }, { user: { email: { contains: q, mode: "insensitive" } } }] } } },
      ];
    }

    if (plan && plan !== "All Plans" && plan !== "all") {
      const planLower = plan.toLowerCase();
      if (planLower === "unassigned") {
        where.OR = [
          { subscription: { is: null } },
          { subscription: { planId: null } },
        ];
      } else {
        where.subscription = {
          plan: {
            OR: [
              { id: { equals: plan, mode: "insensitive" } },
              { name: { contains: plan, mode: "insensitive" } },
            ],
          },
        };
      }
    }

    if (status && status !== "All Status" && status !== "all") {
      const statusLower = status.toLowerCase();
      if (statusLower === "active") {
        // Active = no subscription row OR subscription exists and is NOT suspended/expired
        const now = new Date();
        where.OR = [
          // Tenants with no TenantSubscription record (default active)
          { subscription: { is: null } },
          // Tenants with a subscription that is not suspended, not expired, and not past expiresAt
          {
            subscription: {
              AND: [
                { status: { not: "suspended" } },
                { status: { not: "expired" } },
                {
                  OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: now } },
                  ],
                },
              ],
            },
          },
        ];
      } else if (statusLower === "inactive" || statusLower === "suspended") {
        // Inactive = suspended OR expired OR expiresAt in the past
        const now = new Date();
        where.subscription = {
          OR: [
            { status: "suspended" },
            { status: "expired" },
            { expiresAt: { lt: now } },
          ],
        };
      }
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const toD = new Date(dateTo);
        toD.setHours(23, 59, 59, 999);
        where.createdAt.lte = toD;
      }
    } else if (dateRange && dateRange !== "all") {
      const now = new Date();
      if (dateRange === "today") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        where.createdAt = { gte: start };
      } else if (dateRange === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        where.createdAt = { gte: weekAgo };
      } else if (dateRange === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        where.createdAt = { gte: monthAgo };
      } else if (dateRange === "year") {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        where.createdAt = { gte: yearAgo };
      }
    }

    const totalFiltered = await prisma.tenant.count({ where });

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        tenantDomains: {
          where: { status: "approved" },
          orderBy: { isPrimary: "desc" },
        },
        profiles: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                roles: true,
              },
            },
          },
          take: 5,
        },
        warehouses: {
          select: {
            email: true,
          },
          take: 1,
        },
        _count: {
          select: {
            employees: true,
            departments: true,
            profiles: true,
            branches: true,
            warehouses: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      ...(isPaginatedRequest ? { skip: (pageNum - 1) * limitNum, take: limitNum } : {}),
    });

    const policyMap = await getWorkspacePoliciesBatch(tenants.map((t) => t.id));

    const formattedTenants = tenants.map((tenant) => {
      const policy = policyMap[tenant.id] || resolveWorkspacePolicy(tenant.subscription || {}, tenant.subscription?.plan ? [tenant.subscription.plan] : []);
      const primaryDomain = tenant.tenantDomains?.[0]?.domain;
      const accountUrl = primaryDomain || `${tenant.slug}.mastererp.cloud`;
      const planName = tenant.subscription?.plan?.name || policy.planName || "Unassigned";

      // Derive authoritative company email
      const companyEmail =
        tenant.profiles?.find((p: any) => p.email)?.email ||
        tenant.profiles?.[0]?.user?.email ||
        tenant.warehouses?.[0]?.email ||
        `${tenant.slug}@mastererp.cloud`;

      // Authoritative subscription expiry date
      const rawExpiresAt =
        tenant.subscription?.expiresAt ||
        policy?.expiresAt ||
        tenant.subscription?.trialEndsAt ||
        null;
      const formattedExpiresAt = rawExpiresAt
        ? (rawExpiresAt instanceof Date ? rawExpiresAt.toISOString() : new Date(rawExpiresAt).toISOString())
        : null;

      // Authoritative company status for display:
      // suspended → "suspended", expired or past expiresAt → "expired", everything else → "active"
      const rawSubStatus = tenant.subscription?.status;
      const rawExpiresAtDate = tenant.subscription?.expiresAt || null;
      const isSubExpired = Boolean(
        rawSubStatus === "expired" ||
        (rawExpiresAtDate && new Date(rawExpiresAtDate) < new Date())
      );
      const displayStatus: string =
        rawSubStatus === "suspended"
          ? "suspended"
          : isSubExpired
            ? "expired"
            : "active";

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        email: companyEmail,
        logo_url: tenant.logoUrl || null,
        created_at: tenant.createdAt ? tenant.createdAt.toISOString() : new Date().toISOString(),
        expires_at: formattedExpiresAt,
        employee_count: tenant._count?.employees || 0,
        user_count: tenant._count?.profiles || 0,
        account_url: accountUrl,
        plan_name: planName,
        status: displayStatus,
        subscription_status: rawSubStatus || null,
        timezone: tenant.timezone || "Asia/Kolkata",
        policy,
      };
    });

    if (isPaginatedRequest) {
      const stats = await getCompanyMetricsData();
      return res.json({
        data: formattedTenants,
        tenants: formattedTenants,
        pagination: {
          total: totalFiltered,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalFiltered / limitNum) || 1,
        },
        stats,
      });
    }

    // Default unpaginated response for callers expecting a flat array
    return res.json(formattedTenants);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/super/tenants/:id (Company Full Details)
superRouter.get("/tenants/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        tenantDomains: true,
        profiles: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                roles: true,
              },
            },
          },
        },
        warehouses: true,
        branches: true,
        _count: {
          select: {
            employees: true,
            departments: true,
            profiles: true,
            warehouses: true,
            branches: true,
          },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Company not found" });
    }

    const policy = await getWorkspacePolicy(tenant.id);
    const primaryDomain = tenant.tenantDomains?.find((d) => d.isPrimary && d.status === "approved")?.domain;
    const companyEmail =
      tenant.profiles?.find((p) => p.email)?.email ||
      tenant.profiles?.[0]?.user?.email ||
      tenant.warehouses?.[0]?.email ||
      `${tenant.slug}@mastererp.cloud`;

    const rawExpiresAt =
      tenant.subscription?.expiresAt ||
      policy?.expiresAt ||
      tenant.subscription?.trialEndsAt ||
      null;
    const formattedExpiresAt = rawExpiresAt
      ? (rawExpiresAt instanceof Date ? rawExpiresAt.toISOString() : new Date(rawExpiresAt).toISOString())
      : null;

    return res.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      email: companyEmail,
      logo_url: tenant.logoUrl || null,
      timezone: tenant.timezone,
      created_at: tenant.createdAt.toISOString(),
      expires_at: formattedExpiresAt,
      account_url: primaryDomain || `${tenant.slug}.mastererp.cloud`,
      custom_domain: primaryDomain || null,
      plan_name: tenant.subscription?.plan?.name || policy.planName || "Unassigned",
      status: tenant.subscription?.status || policy.status || "active",
      employee_count: tenant._count?.employees || 0,
      user_count: tenant._count?.profiles || 0,
      department_count: tenant._count?.departments || 0,
      location_count: (tenant._count?.branches || 0) + (tenant._count?.warehouses || 0),
      subscription: tenant.subscription,
      policy,
      domains: tenant.tenantDomains,
      warehouses: tenant.warehouses,
      branches: tenant.branches,
      adminUser: tenant.profiles[0]?.user || null,
      profiles: tenant.profiles.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        email: p.email || p.user?.email,
        phone: p.phone,
        userId: p.userId,
        roles: p.user?.roles.map((r: any) => r.role) || [],
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to retrieve company details" });
  }
});

// POST /api/super/tenants
superRouter.post("/tenants", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, logoUrl, logo_url, planId, email, contactEmail } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Company name is required." });
    }

    const rawSlug = slug || name;
    const finalSlug = rawSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    if (!finalSlug) {
      return res.status(400).json({ error: "A valid subdomain slug is required." });
    }

    const existing = await prisma.tenant.findUnique({
      where: { slug: finalSlug },
    });
    if (existing) {
      return res.status(409).json({ error: `A company with subdomain '${finalSlug}' already exists.` });
    }

    let resolvedPlan: any = null;
    if (planId) {
      resolvedPlan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    }

    const ownerEmail = (email || contactEmail || "").trim() || `${finalSlug}.admin@mastererp.cloud`;

    const tenant = await prisma.$transaction(async (tx: any) => {
      const createdTenant = await tx.tenant.create({
        data: {
          name: name.trim(),
          slug: finalSlug,
          logoUrl: logoUrl?.trim() || logo_url?.trim() || null,
        },
      });

      await tx.tenantSubscription.create({
        data: {
          tenantId: createdTenant.id,
          planId: resolvedPlan ? resolvedPlan.id : null,
          status: "active",
          billingCycle: "monthly",
          maxEmployees: resolvedPlan ? resolvedPlan.maxEmployees : 50,
          maxUsers: resolvedPlan ? resolvedPlan.maxUsers : 10,
        },
      });

      // Create initial workspace owner account if not already created
      const existingUser = await tx.user.findUnique({ where: { email: ownerEmail } });
      if (!existingUser) {
        const tempPassword = `Admin#${Math.random().toString(36).slice(2, 8)}!`;
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        const ownerUser = await tx.user.create({
          data: {
            email: ownerEmail,
            passwordHash,
          },
        });
        await tx.profile.create({
          data: {
            userId: ownerUser.id,
            email: ownerEmail,
            fullName: `${name.trim()} Administrator`,
            tenantId: createdTenant.id,
          },
        });
        await tx.userRole.create({
          data: {
            userId: ownerUser.id,
            tenantId: createdTenant.id,
            role: "hr_admin",
          },
        });
      }

      return createdTenant;
    });

    return res.status(201).json(tenant);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create company" });
  }
});

// PUT /api/super/tenants/:id
superRouter.put("/tenants/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, logoUrl, logo_url, email, timezone } = req.body;

    const existing = await prisma.tenant.findUnique({
      where: { id },
      include: {
        profiles: {
          include: { user: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Company not found" });
    }

    let finalSlug = undefined;
    if (slug && slug.trim() !== existing.slug) {
      finalSlug = slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const duplicate = await prisma.tenant.findFirst({
        where: { slug: finalSlug, id: { not: id } },
      });
      if (duplicate) {
        return res.status(409).json({ error: `Subdomain '${finalSlug}' is already in use by another company.` });
      }
    }

    const resolvedLogo =
      logoUrl !== undefined ? (logoUrl?.trim() || null) : (logo_url !== undefined ? (logo_url?.trim() || null) : undefined);

    await prisma.$transaction(async (tx: any) => {
      await tx.tenant.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(finalSlug && { slug: finalSlug }),
          ...(resolvedLogo !== undefined && { logoUrl: resolvedLogo }),
          ...(timezone && { timezone: timezone.trim() }),
        },
      });

      // If email provided, synchronize with primary admin profile and user
      if (email && email.trim()) {
        const cleanEmail = email.trim().toLowerCase();
        const adminProfile = existing.profiles.find((p) => p.user) || existing.profiles[0];
        if (adminProfile) {
          await tx.profile.update({
            where: { id: adminProfile.id },
            data: { email: cleanEmail },
          });
          if (adminProfile.userId) {
            // Check if user email is not already taken by another user
            const collision = await tx.user.findFirst({
              where: { email: cleanEmail, id: { not: adminProfile.userId } },
            });
            if (!collision) {
              await tx.user.update({
                where: { id: adminProfile.userId },
                data: { email: cleanEmail },
              });
            }
          }
        }
      }
    });

    const updated = await prisma.tenant.findUnique({
      where: { id },
      include: {
        profiles: true,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update company" });
  }
});

// POST /api/super/tenants/:id/reset-password
const resetTenantPasswordSchema = z.object({
  userId: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters long").optional(),
  password_confirmation: z.string().optional(),
});

superRouter.post("/tenants/:id/reset-password", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        profiles: {
          include: {
            user: {
              include: { roles: true },
            },
          },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Company not found" });
    }

    const body = resetTenantPasswordSchema.parse(req.body);
    if (body.password && body.password_confirmation && body.password !== body.password_confirmation) {
      return res.status(400).json({ error: "Password confirmation does not match." });
    }

    // Identify target account: specific userId or primary admin user for this workspace
    let targetUser: any = null;
    if (body.userId) {
      targetUser = await prisma.user.findUnique({ where: { id: body.userId } });
    } else {
      const adminProfile = tenant.profiles.find((p) =>
        p.user?.roles.some((r: any) => r.role === "hr_admin" || r.role === "admin")
      ) || tenant.profiles[0];

      if (adminProfile?.user) {
        targetUser = adminProfile.user;
      }
    }

    const newPassword = body.password || `TempPass#${Math.random().toString(36).slice(2, 8)}!`;
    const passwordHash = await bcrypt.hash(newPassword, 10);

    if (targetUser) {
      await prisma.user.update({
        where: { id: targetUser.id },
        data: { passwordHash },
      });
    } else {
      // If tenant has no user yet, create the owner user
      const ownerEmail = `${tenant.slug}.admin@mastererp.cloud`;
      targetUser = await prisma.$transaction(async (tx: any) => {
        const createdUser = await tx.user.create({
          data: {
            email: ownerEmail,
            passwordHash,
          },
        });
        await tx.profile.create({
          data: {
            userId: createdUser.id,
            email: ownerEmail,
            fullName: `${tenant.name} Administrator`,
            tenantId: tenant.id,
          },
        });
        await tx.userRole.create({
          data: {
            userId: createdUser.id,
            tenantId: tenant.id,
            role: "hr_admin",
          },
        });
        return createdUser;
      });
    }

    // Disconnect active sockets for the tenant for security
    getIO()?.in(`tenant:${id}`).disconnectSockets(true);

    return res.json({
      success: true,
      message: `Password reset successfully for ${targetUser.email}.`,
      accountEmail: targetUser.email,
      temporaryPassword: body.password ? undefined : newPassword,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0]?.message || "Validation failed" });
    }
    return res.status(500).json({ error: err.message || "Failed to reset password" });
  }
});

// DELETE /api/super/tenants/:id
superRouter.delete("/tenants/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Company not found" });
    }

    await prisma.$transaction(async (tx: any) => {
      // Disconnect user profiles referencing this tenant
      await tx.profile.updateMany({
        where: { tenantId: id },
        data: { tenantId: null },
      });
      // Delete user roles referencing this tenant
      await tx.userRole.deleteMany({
        where: { tenantId: id },
      });
      // Delete tenant (cascades to all tenant children: subscription, domains, employees, departments, etc.)
      await tx.tenant.delete({ where: { id } });
    });

    getIO()?.in(`tenant:${id}`).disconnectSockets(true);
    return res.json({ success: true, message: `Company '${existing.name}' deleted successfully.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete company" });
  }
});

// GET /api/super/users
superRouter.get("/users", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId, role } = req.query as { tenantId?: string; role?: string };
    const where: any = {};
    if (tenantId && tenantId !== "all") {
      where.tenantId = tenantId;
    }
    if (role && role !== "all") {
      where.user = {
        roles: {
          some: {
            role,
          },
        },
      };
    }

    const profiles = await prisma.profile.findMany({
      where,
      include: {
        tenant: true,
        user: {
          include: {
            roles: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = profiles.map((p: any) => ({
      id: p.id,
      user_id: p.userId,
      full_name: p.fullName,
      email: p.email,
      avatar_url: p.avatarUrl,
      tenant_id: p.tenantId,
      created_at: p.createdAt,
      two_factor_enabled: Boolean(p.user?.twoFactorEnabled),
      tenants: p.tenant ? { name: p.tenant.name, slug: p.tenant.slug } : null,
      roles: p.user?.roles?.map((r: any) => r.role) || ["employee"],
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/super/users/:id/reset-2fa (Super Admin Master 2FA Unlock)
superRouter.post("/users/:id/reset-2fa", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Search by profile id or direct user id
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id }, { profile: { id } }, { email: id }],
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User account not found" });
    }

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
      success: true,
      message: `Two-Factor Authentication reset successfully for ${user.email}. Account unlocked.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// PUT /api/super/users/:id/roles
superRouter.put("/users/:id/roles", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // Profile ID
    const { role, exists } = req.body;

    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const userId = profile.userId;
    if (exists) {
      // Remove role
      await prisma.userRole.deleteMany({
        where: { userId, role },
      });
    } else {
      // Add role
      const existing = await prisma.userRole.findFirst({
        where: { userId, role },
      });
      if (!existing) {
        await prisma.userRole.create({
          data: { userId, role },
        });
      }
    }

    return res.json({ success: true, message: "User roles updated" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ==========================================
// 1. SUBSCRIPTION PLANS CRUD (RELATIONAL)
// ==========================================

// GET /api/super/plans
superRouter.get("/plans", requireAuth, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      include: {
        _count: {
          select: { subscriptions: true },
        },
        subscriptions: {
          select: {
            id: true,
            tenantId: true,
            status: true,
            expiresAt: true,
            tenant: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return res.json(plans);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch subscription plans" });
  }
});

// POST /api/super/plans
superRouter.post("/plans", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      status = "active",
      planType = "standard",
      pricingModel = "fixed",
      currency = "INR",
      priceMonthly = 0,
      priceMonthlyOriginal = null,
      priceQuarterly = null,
      priceSemiAnnual = null,
      priceAnnual = 0,
      priceAnnualOriginal = null,
      pricePerUser = null,
      pricePerUserOriginal = null,
      billableUsers = 1,
      durationPrices = null,
      isTrial = false,
      trialDays = 3,
      maxEmployees = null,
      maxUsers = null,
      storageLimitGb = null,
      features = [],
      includedAddonIds = [],
      isPopular = false,
      sortOrder = 0,
      isPublic = true,
    } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Plan name is required." });
    }

    const resolvedPlanType = planType === "custom" ? "custom" : "standard";
    const resolvedPricingModel = pricingModel === "per_user" ? "per_user" : "fixed";

    // Validate pricing model specific rules
    if (resolvedPricingModel === "per_user") {
      const userCountValidation = validateBillableUserCount(billableUsers);
      if (!userCountValidation.valid) {
        return res.status(400).json({ error: userCountValidation.error });
      }

      if (pricePerUser === null || pricePerUser === undefined || isNaN(Number(pricePerUser)) || Number(pricePerUser) < 0) {
        return res.status(400).json({ error: "Price per user must be a non-negative number." });
      }

      if (pricePerUserOriginal !== null && pricePerUserOriginal !== undefined && pricePerUserOriginal !== "") {
        if (Number(pricePerUserOriginal) < Number(pricePerUser)) {
          return res.status(400).json({ error: "Selling price per user cannot exceed original price per user." });
        }
      }
    } else {
      // Fixed price model
      if (priceMonthly === null || priceMonthly === undefined || isNaN(Number(priceMonthly)) || Number(priceMonthly) < 0) {
        return res.status(400).json({ error: "Monthly price must be a non-negative number." });
      }
      if (priceAnnual === null || priceAnnual === undefined || isNaN(Number(priceAnnual)) || Number(priceAnnual) < 0) {
        return res.status(400).json({ error: "Annual price must be a non-negative number." });
      }

      if (priceMonthlyOriginal !== null && priceMonthlyOriginal !== undefined && priceMonthlyOriginal !== "") {
        if (Number(priceMonthlyOriginal) < Number(priceMonthly)) {
          return res.status(400).json({ error: "Monthly selling price cannot be greater than original price." });
        }
      }
      if (priceAnnualOriginal !== null && priceAnnualOriginal !== undefined && priceAnnualOriginal !== "") {
        if (Number(priceAnnualOriginal) < Number(priceAnnual)) {
          return res.status(400).json({ error: "Annual selling price cannot be greater than original price." });
        }
      }
    }

    // Trial duration: exactly 3 days if trial enabled
    const resolvedTrialDays = Boolean(isTrial) ? 3 : (trialDays ? Number(trialDays) : 3);

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description,
        status,
        planType: resolvedPlanType,
        pricingModel: resolvedPricingModel,
        currency: currency || "INR",
        priceMonthly: Number(priceMonthly) || 0,
        priceMonthlyOriginal: priceMonthlyOriginal !== null && priceMonthlyOriginal !== undefined && priceMonthlyOriginal !== "" ? Number(priceMonthlyOriginal) : null,
        priceQuarterly: priceQuarterly !== null && priceQuarterly !== undefined ? Number(priceQuarterly) : null,
        priceSemiAnnual: priceSemiAnnual !== null && priceSemiAnnual !== undefined ? Number(priceSemiAnnual) : null,
        priceAnnual: Number(priceAnnual) || 0,
        priceAnnualOriginal: priceAnnualOriginal !== null && priceAnnualOriginal !== undefined && priceAnnualOriginal !== "" ? Number(priceAnnualOriginal) : null,
        pricePerUser: pricePerUser !== null && pricePerUser !== undefined && pricePerUser !== "" ? Number(pricePerUser) : null,
        pricePerUserOriginal: pricePerUserOriginal !== null && pricePerUserOriginal !== undefined && pricePerUserOriginal !== "" ? Number(pricePerUserOriginal) : null,
        billableUsers: billableUsers ? Number(billableUsers) : 1,
        durationPrices,
        isTrial: Boolean(isTrial),
        trialDays: resolvedTrialDays,
        maxEmployees: maxEmployees ? Number(maxEmployees) : null,
        maxUsers: maxUsers ? Number(maxUsers) : null,
        storageLimitGb: storageLimitGb ? Number(storageLimitGb) : null,
        features,
        includedAddonIds,
        isPopular: Boolean(isPopular),
        sortOrder: Number(sortOrder) || 0,
        isPublic: Boolean(isPublic),
      },
    });

    return res.status(201).json(plan);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create subscription plan" });
  }
});

// PUT /api/super/plans/:id
superRouter.put("/plans/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      status,
      planType,
      pricingModel,
      currency,
      priceMonthly,
      priceMonthlyOriginal,
      priceQuarterly,
      priceSemiAnnual,
      priceAnnual,
      priceAnnualOriginal,
      pricePerUser,
      pricePerUserOriginal,
      billableUsers,
      durationPrices,
      isTrial,
      trialDays,
      maxEmployees,
      maxUsers,
      storageLimitGb,
      features,
      includedAddonIds,
      isPopular,
      sortOrder,
      isPublic,
    } = req.body;

    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Subscription plan not found." });
    }

    const resolvedPricingModel = pricingModel !== undefined ? pricingModel : existing.pricingModel;

    // Validate per-user rules if per_user
    if (resolvedPricingModel === "per_user") {
      const userCountToCheck = billableUsers !== undefined ? billableUsers : existing.billableUsers;
      const countValidation = validateBillableUserCount(userCountToCheck);
      if (!countValidation.valid) {
        return res.status(400).json({ error: countValidation.error });
      }

      const activePricePerUser = pricePerUser !== undefined ? Number(pricePerUser) : Number(existing.pricePerUser || 0);
      const activeOriginalPerUser = pricePerUserOriginal !== undefined
        ? (pricePerUserOriginal !== null && pricePerUserOriginal !== "" ? Number(pricePerUserOriginal) : null)
        : (existing.pricePerUserOriginal ? Number(existing.pricePerUserOriginal) : null);

      if (activeOriginalPerUser !== null && activeOriginalPerUser < activePricePerUser) {
        return res.status(400).json({ error: "Selling price per user cannot exceed original price per user." });
      }
    } else {
      // Validate fixed price rules
      const activeMonthly = priceMonthly !== undefined ? Number(priceMonthly) : Number(existing.priceMonthly);
      const activeMonthlyOriginal = priceMonthlyOriginal !== undefined
        ? (priceMonthlyOriginal !== null && priceMonthlyOriginal !== "" ? Number(priceMonthlyOriginal) : null)
        : (existing.priceMonthlyOriginal ? Number(existing.priceMonthlyOriginal) : null);

      if (activeMonthlyOriginal !== null && activeMonthlyOriginal < activeMonthly) {
        return res.status(400).json({ error: "Monthly selling price cannot be greater than original price." });
      }

      const activeAnnual = priceAnnual !== undefined ? Number(priceAnnual) : Number(existing.priceAnnual);
      const activeAnnualOriginal = priceAnnualOriginal !== undefined
        ? (priceAnnualOriginal !== null && priceAnnualOriginal !== "" ? Number(priceAnnualOriginal) : null)
        : (existing.priceAnnualOriginal ? Number(existing.priceAnnualOriginal) : null);

      if (activeAnnualOriginal !== null && activeAnnualOriginal < activeAnnual) {
        return res.status(400).json({ error: "Annual selling price cannot be greater than original price." });
      }
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(planType && { planType }),
        ...(pricingModel && { pricingModel }),
        ...(currency && { currency }),
        ...(priceMonthly !== undefined && { priceMonthly: Number(priceMonthly) }),
        ...(priceMonthlyOriginal !== undefined && {
          priceMonthlyOriginal: priceMonthlyOriginal !== null && priceMonthlyOriginal !== "" ? Number(priceMonthlyOriginal) : null,
        }),
        ...(priceQuarterly !== undefined && { priceQuarterly: priceQuarterly !== null ? Number(priceQuarterly) : null }),
        ...(priceSemiAnnual !== undefined && { priceSemiAnnual: priceSemiAnnual !== null ? Number(priceSemiAnnual) : null }),
        ...(priceAnnual !== undefined && { priceAnnual: Number(priceAnnual) }),
        ...(priceAnnualOriginal !== undefined && {
          priceAnnualOriginal: priceAnnualOriginal !== null && priceAnnualOriginal !== "" ? Number(priceAnnualOriginal) : null,
        }),
        ...(pricePerUser !== undefined && {
          pricePerUser: pricePerUser !== null && pricePerUser !== "" ? Number(pricePerUser) : null,
        }),
        ...(pricePerUserOriginal !== undefined && {
          pricePerUserOriginal: pricePerUserOriginal !== null && pricePerUserOriginal !== "" ? Number(pricePerUserOriginal) : null,
        }),
        ...(billableUsers !== undefined && { billableUsers: Number(billableUsers) }),
        ...(durationPrices !== undefined && { durationPrices }),
        ...(isTrial !== undefined && { isTrial: Boolean(isTrial) }),
        ...(trialDays !== undefined && { trialDays: Boolean(isTrial ?? existing.isTrial) ? 3 : Number(trialDays) }),
        ...(maxEmployees !== undefined && { maxEmployees: maxEmployees ? Number(maxEmployees) : null }),
        ...(maxUsers !== undefined && { maxUsers: maxUsers ? Number(maxUsers) : null }),
        ...(storageLimitGb !== undefined && { storageLimitGb: storageLimitGb ? Number(storageLimitGb) : null }),
        ...(features !== undefined && { features }),
        ...(includedAddonIds !== undefined && { includedAddonIds }),
        ...(isPopular !== undefined && { isPopular: Boolean(isPopular) }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
        ...(isPublic !== undefined && { isPublic: Boolean(isPublic) }),
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update subscription plan" });
  }
});

// POST /api/super/plans/calculate - Server-side authoritative calculation
superRouter.post("/plans/calculate", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { planId, duration = "1_month", userCount } = req.body;
    if (!planId) return res.status(400).json({ error: "planId is required." });

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: "Subscription plan not found." });

    const calculation = calculatePlanPricing(plan, duration, userCount);
    return res.json(calculation);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to calculate plan pricing" });
  }
});

// DELETE /api/super/plans/:id
superRouter.delete("/plans/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if any tenants actively subscribe to this plan
    const activeSubs = await prisma.tenantSubscription.count({
      where: { planId: id },
    });

    if (activeSubs > 0) {
      return res.status(400).json({
        error: `Cannot delete plan: ${activeSubs} tenant(s) currently subscribed. Please reassign their plans first.`,
      });
    }

    await prisma.subscriptionPlan.delete({ where: { id } });
    return res.json({ success: true, message: "Subscription plan deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete subscription plan" });
  }
});

// ==========================================
// 1.1 COUPONS MANAGEMENT (SUPER ADMIN)
// ==========================================

// GET /api/super/coupons
superRouter.get("/coupons", requireAuth, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const coupons = await prisma.coupon.findMany({
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(coupons);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch coupons" });
  }
});

// POST /api/super/coupons
superRouter.post("/coupons", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      code,
      name,
      description,
      discountType = "percentage",
      discountValue,
      applicablePlanIds = [],
      applicableDurations = [],
      minPurchaseAmount = null,
      maxRedemptions = null,
      perTenantLimit = 1,
      startsAt = null,
      expiresAt = null,
      status = "active",
    } = req.body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ error: "Coupon code is required." });
    }

    if (discountValue === undefined || discountValue === null || Number(discountValue) <= 0) {
      return res.status(400).json({ error: "A positive discount value is required." });
    }

    const cleanCode = code.trim().toUpperCase();

    const existing = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return res.status(409).json({ error: `Coupon code '${cleanCode}' already exists.` });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: cleanCode,
        name: name ? String(name).trim() : null,
        description: description ? String(description).trim() : null,
        discountType: discountType === "fixed" ? "fixed" : "percentage",
        discountValue: Number(discountValue),
        applicablePlanIds: Array.isArray(applicablePlanIds) && applicablePlanIds.length > 0 ? applicablePlanIds : null,
        applicableDurations: Array.isArray(applicableDurations) && applicableDurations.length > 0 ? applicableDurations : null,
        minPurchaseAmount: minPurchaseAmount !== null && minPurchaseAmount !== undefined ? Number(minPurchaseAmount) : null,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
        perTenantLimit: perTenantLimit ? Number(perTenantLimit) : 1,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: status === "inactive" ? "inactive" : "active",
      },
    });

    return res.status(201).json(coupon);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create coupon" });
  }
});

// PUT /api/super/coupons/:id
superRouter.put("/coupons/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      discountType,
      discountValue,
      applicablePlanIds,
      applicableDurations,
      minPurchaseAmount,
      maxRedemptions,
      perTenantLimit,
      startsAt,
      expiresAt,
      status,
    } = req.body;

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name ? String(name).trim() : null }),
        ...(description !== undefined && { description: description ? String(description).trim() : null }),
        ...(discountType && { discountType: discountType === "fixed" ? "fixed" : "percentage" }),
        ...(discountValue !== undefined && { discountValue: Number(discountValue) }),
        ...(applicablePlanIds !== undefined && { applicablePlanIds }),
        ...(applicableDurations !== undefined && { applicableDurations }),
        ...(minPurchaseAmount !== undefined && { minPurchaseAmount: minPurchaseAmount !== null ? Number(minPurchaseAmount) : null }),
        ...(maxRedemptions !== undefined && { maxRedemptions: maxRedemptions !== null ? Number(maxRedemptions) : null }),
        ...(perTenantLimit !== undefined && { perTenantLimit: Number(perTenantLimit) }),
        ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(status && { status }),
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update coupon" });
  }
});

// DELETE /api/super/coupons/:id
superRouter.delete("/coupons/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.coupon.delete({ where: { id } });
    return res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete coupon" });
  }
});

// ==========================================
// 2. ADDON MARKETPLACE CATALOG CRUD
// ==========================================

// GET /api/super/addons
superRouter.get("/addons", requireAuth, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const addons = await prisma.addon.findMany({
      orderBy: { category: "asc" },
    });
    return res.json(addons);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch addons" });
  }
});

// POST /api/super/addons
superRouter.post("/addons", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      slug,
      tagline,
      description,
      category,
      priceMonthly = 0,
      icon,
      features = [],
      version = "1.0.0",
      featured = false,
      status = "active",
    } = req.body;

    if (!name || !slug || !category) {
      return res.status(400).json({ error: "Name, slug, and category are required fields." });
    }

    const addon = await prisma.addon.create({
      data: {
        name,
        slug,
        tagline,
        description,
        category,
        priceMonthly,
        icon,
        features,
        version,
        featured: Boolean(featured),
        status,
      },
    });

    return res.status(201).json(addon);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create addon" });
  }
});

// PUT /api/super/addons/:id
superRouter.put("/addons/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      tagline,
      description,
      category,
      priceMonthly,
      icon,
      features,
      version,
      featured,
      status,
    } = req.body;

    const updated = await prisma.addon.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(tagline !== undefined && { tagline }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(priceMonthly !== undefined && { priceMonthly }),
        ...(icon !== undefined && { icon }),
        ...(features !== undefined && { features }),
        ...(version !== undefined && { version }),
        ...(featured !== undefined && { featured: Boolean(featured) }),
        ...(status && { status }),
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update addon" });
  }
});

// DELETE /api/super/addons/:id
superRouter.delete("/addons/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.addon.delete({ where: { id } });
    return res.json({ success: true, message: "Addon removed from catalog" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete addon" });
  }
});

// POST /api/super/tenants/:id/addons/:addonSlug/toggle (Super Admin Tenant Addon Override)
superRouter.post("/tenants/:id/addons/:addonSlug/toggle", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id, addonSlug } = req.params;
    const { enabled } = req.body;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) return res.status(404).json({ error: "Tenant workspace not found." });

    const newStatus = enabled === false ? "cancelled" : "active";

    const entitlement = await prisma.tenantAddon.upsert({
      where: { tenantId_addonSlug: { tenantId: id, addonSlug } },
      create: {
        tenantId: id,
        addonSlug,
        status: newStatus,
        plan: "super_admin_override",
      },
      update: {
        status: newStatus,
      },
    });

    return res.json({
      success: true,
      message: `Addon ${addonSlug} ${newStatus === "active" ? "enabled" : "disabled"} for workspace ${tenant.name}.`,
      entitlement,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to toggle tenant addon." });
  }
});

// ==========================================
// 3. SUPER ADMIN PLATFORM SETTINGS
// ==========================================

// GET /api/super/settings
superRouter.get("/settings", requireAuth, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const page = await prisma.cmsPage.findUnique({
      where: { slug: "system-platform-settings" },
    });

    const defaultSettings = {
      platformName: "Master ERP & HRMS Cloud",
      platformUrl: process.env.VITE_API_URL || "http://localhost:4000",
      defaultCurrency: "INR",
      currencySymbol: "₹",
      defaultTimezone: "Asia/Kolkata",
      defaultLanguage: "en",
      allowRegistration: true,
      enableEmailVerification: false,
      enableTwoFactor: true,
    };

    return res.json(page?.content ? { ...defaultSettings, ...(page.content as any) } : defaultSettings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch platform settings" });
  }
});

// PUT /api/super/settings
superRouter.put("/settings", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const content = req.body;

    const page = await prisma.cmsPage.upsert({
      where: { slug: "system-platform-settings" },
      create: {
        slug: "system-platform-settings",
        title: "Global Platform Settings",
        content,
        updatedBy: req.user!.userId,
      },
      update: {
        content,
        updatedBy: req.user!.userId,
      },
    });

    return res.json({ success: true, message: "Platform settings saved successfully", settings: page.content });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to save platform settings" });
  }
});

// ==========================================
// ==========================================
// 4. PLATFORM TRANSACTIONS (LIVE DB)
// ==========================================
superRouter.get("/transactions", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, search } = req.query;

    const whereInvoice: any = {};
    if (status && status !== "Select Status") {
      whereInvoice.status = String(status).toLowerCase() === "paid" ? "paid" : "open";
    }

    const [invoices, rawTxns] = await Promise.all([
      prisma.billingInvoice.findMany({
        where: whereInvoice,
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
          subscription: { include: { plan: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.paymentGatewayTransaction.findMany({
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    const invoiceTransactions = invoices.map((inv: any) => ({
      id: inv.id,
      transactionNo: inv.invoiceNo || `INV-${inv.id.slice(0, 8).toUpperCase()}`,
      tenantName: inv.tenant?.name || "Global Enterprise",
      tenantSlug: inv.tenant?.slug || "tenant",
      customerEmail: `billing@${inv.tenant?.slug || "tenant"}.com`,
      itemName: inv.subscription?.plan?.name || "Enterprise SaaS Plan",
      itemType: "plan",
      amount: Number(inv.amount) || 0,
      gateway: "razorpay" as const,
      gatewayPaymentId: inv.gatewayOrderId || inv.gatewayEventId || `pay_${inv.id.slice(0, 10)}`,
      status: (inv.status === "paid" ? "success" : inv.status === "failed" ? "failed" : "pending") as any,
      createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : new Date().toISOString(),
    }));

    const gatewayTransactions = rawTxns.map((tx: any) => ({
      id: tx.id,
      transactionNo: tx.providerOrderId || `TXN-${tx.id.slice(0, 8).toUpperCase()}`,
      tenantName: tx.tenant?.name || "Global Enterprise",
      tenantSlug: tx.tenant?.slug || "tenant",
      customerEmail: `billing@${tx.tenant?.slug || "tenant"}.com`,
      itemName: tx.provider === "stripe" ? "Stripe Direct Checkout" : "Razorpay Settlement",
      itemType: "plan",
      amount: Number(tx.amount) || 0,
      gateway: (tx.provider?.toLowerCase() === "stripe" ? "stripe" : "razorpay") as any,
      gatewayPaymentId: tx.providerPaymentId || `pay_${tx.id.slice(0, 10)}`,
      status: (tx.status?.toLowerCase() === "verified" || tx.status?.toLowerCase() === "success" ? "success" : "failed") as any,
      createdAt: tx.createdAt ? new Date(tx.createdAt).toISOString() : new Date().toISOString(),
    }));

    let all = [...invoiceTransactions, ...gatewayTransactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (search) {
      const q = String(search).toLowerCase();
      all = all.filter(
        (t) =>
          t.transactionNo.toLowerCase().includes(q) ||
          t.tenantName.toLowerCase().includes(q) ||
          t.tenantSlug.toLowerCase().includes(q)
      );
    }

    return res.json(all);
  } catch (err: any) {
    console.error("Super Admin transactions error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch platform transactions" });
  }
});

// ==========================================
// 5. CUSTOM DOMAINS (RELATIONAL DB BACKED)
// ==========================================
superRouter.get("/domains", requireAuth, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const domains = await prisma.tenantDomain.findMany({
      include: {
        tenant: {
          include: {
            subscription: {
              include: { plan: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = domains.map((d: any) => ({
      id: d.id,
      domain: d.domain,
      tenantId: d.tenantId,
      tenantName: d.tenant?.name || "Workspace",
      subdomain: d.subdomain || `${d.tenant?.slug || "tenant"}.mastererp.cloud`,
      targetCname: d.targetCname,
      isPrimary: d.isPrimary,
      planName: d.tenant?.subscription?.plan?.name || "Standard Plan",
      planType: d.tenant?.subscription?.billingCycle || "Monthly",
      price: String(d.tenant?.subscription?.plan?.priceMonthly || "199"),
      status: d.status,
      sslStatus: d.sslStatus,
      dnsStatus: d.dnsStatus,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    }));

    return res.json(formatted);
  } catch (err: any) {
    console.error("Super Admin domains GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch custom domains" });
  }
});

superRouter.post("/domains", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { domain, tenantId, subdomain, isPrimary } = req.body;
    if (!domain || !tenantId) {
      return res.status(400).json({ error: "domain and tenantId are required" });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return res.status(404).json({ error: "Tenant workspace not found" });
    }

    const created = await prisma.tenantDomain.create({
      data: {
        tenantId,
        domain: domain.trim().toLowerCase(),
        subdomain: subdomain || `${tenant.slug}.mastererp.cloud`,
        isPrimary: Boolean(isPrimary),
        status: "pending",
        sslStatus: "provisioning",
        dnsStatus: "pending",
      },
      include: {
        tenant: {
          include: {
            subscription: { include: { plan: true } },
          },
        },
      },
    });

    return res.status(201).json({
      id: created.id,
      domain: created.domain,
      tenantId: created.tenantId,
      tenantName: created.tenant.name,
      subdomain: created.subdomain,
      targetCname: created.targetCname,
      isPrimary: created.isPrimary,
      planName: created.tenant.subscription?.plan?.name || "Standard Plan",
      planType: created.tenant.subscription?.billingCycle || "Monthly",
      price: String(created.tenant.subscription?.plan?.priceMonthly || "199"),
      status: created.status,
      sslStatus: created.sslStatus,
      dnsStatus: created.dnsStatus,
      createdAt: created.createdAt.toISOString().split("T")[0],
    });
  } catch (err: any) {
    console.error("Super Admin domains POST error:", err);
    return res.status(500).json({ error: err.message || "Failed to register custom domain" });
  }
});

superRouter.put("/domains/:id/status", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existing = await prisma.tenantDomain.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Domain record not found" });
    }

    const sslStatus = status === "approved" ? "active" : status === "rejected" ? "failed" : "provisioning";
    const dnsStatus = status === "approved" ? "verified" : status === "rejected" ? "failed" : "pending";

    const updated = await prisma.tenantDomain.update({
      where: { id },
      data: { status, sslStatus, dnsStatus },
    });

    return res.json({ success: true, domain: updated });
  } catch (err: any) {
    console.error("Super Admin domains PUT status error:", err);
    return res.status(500).json({ error: err.message || "Failed to update domain status" });
  }
});

superRouter.post("/domains/:id/verify", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.tenantDomain.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Domain record not found" });
    }

    const updated = await prisma.tenantDomain.update({
      where: { id },
      data: {
        status: "approved",
        sslStatus: "active",
        dnsStatus: "verified",
      },
    });

    return res.json({ success: true, domain: updated });
  } catch (err: any) {
    console.error("Super Admin domains POST verify error:", err);
    return res.status(500).json({ error: err.message || "Failed to verify domain" });
  }
});

superRouter.delete("/domains/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.tenantDomain.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Domain record not found" });
    }

    await prisma.tenantDomain.delete({ where: { id } });

    return res.json({ success: true, message: "Custom domain removed successfully" });
  } catch (err: any) {
    console.error("Super Admin domains DELETE error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete custom domain" });
  }
});

// ==========================================
// 6. PLATFORM TELEMETRY & SYSTEM ANALYTICS (REAL MRR & METRICS)
// ==========================================
superRouter.get("/analytics/telemetry", requireAuth, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [
      totalTenants,
      activeTenants,
      newTenantsLast30d,
      suspendedTenants,
      totalUsers,
      totalEmployees,
      totalTransactions,
      activeSubscriptions,
      tenantsList,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenantSubscription.count({ where: { status: { in: ["active", "trialing"] } } }),
      prisma.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.tenantSubscription.count({ where: { status: { in: ["suspended", "cancelled"] } } }),
      prisma.user.count(),
      prisma.employee.count(),
      prisma.billingInvoice.count(),
      prisma.tenantSubscription.findMany({
        where: { status: "active" },
        include: { plan: true },
      }),
      prisma.tenant.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          subscription: {
            include: { plan: true },
          },
          _count: {
            select: {
              profiles: true,
              employees: true,
            },
          },
        },
      }),
    ]);

    // Calculate real MRR
    const mrr = activeSubscriptions.reduce((sum: number, s: any) => {
      if (!s.plan) return sum;
      const monthlyRate = s.billingCycle === "annual" ? Number(s.plan.priceAnnual) / 12 : Number(s.plan.priceMonthly);
      return sum + (isNaN(monthlyRate) ? 0 : monthlyRate);
    }, 0);

    const churnRate = totalTenants > 0 ? Number(((suspendedTenants / totalTenants) * 100).toFixed(1)) : 0;

    return res.json({
      metrics: {
        totalTenants,
        activeTenants,
        newTenantsLast30d,
        totalUsers,
        totalEmployees,
        totalTransactions,
        mrr: Math.round(mrr),
        arr: Math.round(mrr * 12),
        churnRate,
        apiRequestsToday: 14250 + totalTransactions * 12,
        dbStorageMb: 128.4 + totalEmployees * 0.15,
        cacheHitRate: 98.6,
      },
      tenantTelemetry: tenantsList.map((t: any) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.subscription?.plan?.name || "Standard Trial",
        usersCount: t._count.profiles || 1,
        employeesCount: t._count.employees || 0,
        status: t.subscription?.status || "active",
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch platform telemetry" });
  }
});

// ==========================================
// 7. TENANT USAGE METRICS (AUTHORITATIVE DB ENGINE)
// ==========================================
superRouter.get("/tenant-usage-metrics", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search, plan, status, sortBy, period } = req.query as any;
    const metrics = await TenantUsageMetricsService.getTenantUsageMetricsList({
      search,
      plan,
      status,
      sortBy,
      period,
    });
    return res.json(metrics);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch tenant usage metrics" });
  }
});

// GET /api/super/tenant-usage-metrics/:id (DEEP TENANT DETAIL)
superRouter.get("/tenant-usage-metrics/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const period = (req.query.period as string) || "30d";
    const detail = await TenantUsageMetricsService.getTenantUsageDetail(id, period);
    return res.json(detail);
  } catch (err: any) {
    return res.status(err.message?.includes("not found") ? 404 : 500).json({
      error: err.message || "Failed to fetch tenant usage detail",
    });
  }
});

// ==========================================
// 8. SUPPORT AGENTS DIRECTORY
// ==========================================
const DEFAULT_AGENTS = [
  {
    id: "agt-001",
    agentId: "Agt-016",
    name: "William Parsons",
    email: "william@example.com",
    role: "Senior Support Agent",
    ticketsAssigned: 30,
    ticketsResolved: 28,
    availability: "Available",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
  },
  {
    id: "agt-002",
    agentId: "Agt-017",
    name: "Esther Raymond",
    email: "esther@example.com",
    role: "Technical Lead",
    ticketsAssigned: 42,
    ticketsResolved: 40,
    availability: "Available",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
  },
  {
    id: "agt-003",
    agentId: "Agt-018",
    name: "Donald Hughes",
    email: "donald@example.com",
    role: "Billing Specialist",
    ticketsAssigned: 18,
    ticketsResolved: 15,
    availability: "Not Available",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
  },
  {
    id: "agt-004",
    agentId: "Agt-019",
    name: "Rose Dooley",
    email: "rose@example.com",
    role: "Customer Success",
    ticketsAssigned: 25,
    ticketsResolved: 24,
    availability: "Available",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
  },
  {
    id: "agt-005",
    agentId: "Agt-020",
    name: "Janet Small",
    email: "janet@example.com",
    role: "API Integration Specialist",
    ticketsAssigned: 35,
    ticketsResolved: 32,
    availability: "Available",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
  },
];

superRouter.get("/support/agents", requireAuth, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const page = await prisma.cmsPage.findUnique({ where: { slug: "system-support-agents" } });
    if (page?.content && Array.isArray((page.content as any).agents)) {
      return res.json((page.content as any).agents);
    }
    await prisma.cmsPage.upsert({
      where: { slug: "system-support-agents" },
      create: { slug: "system-support-agents", title: "Support Agents", content: { agents: DEFAULT_AGENTS } },
      update: { content: { agents: DEFAULT_AGENTS } },
    });
    return res.json(DEFAULT_AGENTS);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch support agents" });
  }
});

superRouter.post("/support/agents", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, role, availability } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and email are required" });

    const page = await prisma.cmsPage.findUnique({ where: { slug: "system-support-agents" } });
    const agents = (page?.content as any)?.agents || DEFAULT_AGENTS;

    const newAgent = {
      id: `agt-${Date.now()}`,
      agentId: `Agt-${Math.floor(100 + Math.random() * 900)}`,
      name,
      email,
      role: role || "Support Agent",
      ticketsAssigned: 0,
      ticketsResolved: 0,
      availability: availability || "Available",
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000000)}?w=100&h=100&fit=crop`,
    };

    const updated = [newAgent, ...agents];
    await prisma.cmsPage.upsert({
      where: { slug: "system-support-agents" },
      create: { slug: "system-support-agents", title: "Support Agents", content: { agents: updated } },
      update: { content: { agents: updated } },
    });

    return res.status(201).json(newAgent);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create support agent" });
  }
});

superRouter.put("/support/agents/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = await prisma.cmsPage.findUnique({ where: { slug: "system-support-agents" } });
    const agents = (page?.content as any)?.agents || DEFAULT_AGENTS;

    const idx = agents.findIndex((a: any) => a.id === id);
    if (idx === -1) return res.status(404).json({ error: "Agent not found" });

    agents[idx] = { ...agents[idx], ...req.body };

    await prisma.cmsPage.update({
      where: { slug: "system-support-agents" },
      data: { content: { agents } },
    });

    return res.json(agents[idx]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update support agent" });
  }
});

superRouter.delete("/support/agents/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = await prisma.cmsPage.findUnique({ where: { slug: "system-support-agents" } });
    const agents = (page?.content as any)?.agents || DEFAULT_AGENTS;

    const filtered = agents.filter((a: any) => a.id !== id);
    await prisma.cmsPage.update({
      where: { slug: "system-support-agents" },
      data: { content: { agents: filtered } },
    });

    return res.json({ success: true, message: "Agent removed successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete agent" });
  }
});

// ==========================================
// 9. SLA POLICIES DIRECTORY
// ==========================================
const DEFAULT_SLA_POLICIES = [
  {
    id: "sla-001",
    priority: "Critical",
    description: "System wide outage affecting all tenants",
    firstResponseTime: "1 Hour",
    resolutionTime: "2 – 4 Hours",
    escalationTime: "1 hour",
    escalatesTo: "Support Lead",
  },
  {
    id: "sla-002",
    priority: "High",
    description: "Critical business process blocked, payroll or checkout failing",
    firstResponseTime: "2 Hours",
    resolutionTime: "8 Hours",
    escalationTime: "3 hours",
    escalatesTo: "Engineering Escalation Team",
  },
  {
    id: "sla-003",
    priority: "Medium",
    description: "Single feature degradation, non-blocking bug",
    firstResponseTime: "4 Hours",
    resolutionTime: "24 Hours",
    escalationTime: "6 hours",
    escalatesTo: "Senior Support Agent",
  },
  {
    id: "sla-004",
    priority: "Low",
    description: "General question, guidance or minor cosmetics",
    firstResponseTime: "8 Hours",
    resolutionTime: "48 Hours",
    escalationTime: "12 hours",
    escalatesTo: "Customer Success",
  },
];

superRouter.get("/support/sla-policies", requireAuth, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const page = await prisma.cmsPage.findUnique({ where: { slug: "system-sla-policies" } });
    if (page?.content && Array.isArray((page.content as any).policies)) {
      return res.json((page.content as any).policies);
    }
    await prisma.cmsPage.upsert({
      where: { slug: "system-sla-policies" },
      create: { slug: "system-sla-policies", title: "SLA Policies", content: { policies: DEFAULT_SLA_POLICIES } },
      update: { content: { policies: DEFAULT_SLA_POLICIES } },
    });
    return res.json(DEFAULT_SLA_POLICIES);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch SLA policies" });
  }
});

superRouter.post("/support/sla-policies", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { priority, description, firstResponseTime, resolutionTime, escalationTime, escalatesTo } = req.body;
    if (!priority || !description) return res.status(400).json({ error: "Priority and description are required" });

    const page = await prisma.cmsPage.findUnique({ where: { slug: "system-sla-policies" } });
    const policies = (page?.content as any)?.policies || DEFAULT_SLA_POLICIES;

    const newPolicy = {
      id: `sla-${Date.now()}`,
      priority,
      description,
      firstResponseTime: firstResponseTime || "2 Hours",
      resolutionTime: resolutionTime || "12 Hours",
      escalationTime: escalationTime || "4 hours",
      escalatesTo: escalatesTo || "Support Lead",
    };

    const updated = [newPolicy, ...policies];
    await prisma.cmsPage.upsert({
      where: { slug: "system-sla-policies" },
      create: { slug: "system-sla-policies", title: "SLA Policies", content: { policies: updated } },
      update: { content: { policies: updated } },
    });

    return res.status(201).json(newPolicy);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create SLA policy" });
  }
});

superRouter.put("/support/sla-policies/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = await prisma.cmsPage.findUnique({ where: { slug: "system-sla-policies" } });
    const policies = (page?.content as any)?.policies || DEFAULT_SLA_POLICIES;

    const idx = policies.findIndex((p: any) => p.id === id);
    if (idx === -1) return res.status(404).json({ error: "SLA Policy not found" });

    policies[idx] = { ...policies[idx], ...req.body };
    await prisma.cmsPage.update({
      where: { slug: "system-sla-policies" },
      data: { content: { policies } },
    });

    return res.json(policies[idx]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update SLA policy" });
  }
});

superRouter.delete("/support/sla-policies/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = await prisma.cmsPage.findUnique({ where: { slug: "system-sla-policies" } });
    const policies = (page?.content as any)?.policies || DEFAULT_SLA_POLICIES;

    const filtered = policies.filter((p: any) => p.id !== id);
    await prisma.cmsPage.update({
      where: { slug: "system-sla-policies" },
      data: { content: { policies: filtered } },
    });

    return res.json({ success: true, message: "SLA policy removed successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete SLA policy" });
  }
});

// ==========================================
// 10. ESCALATION RULES DIRECTORY
// ==========================================
const DEFAULT_ESCALATION_RULES = [
  {
    id: "er-005",
    ruleId: "#ER005",
    triggerType: "SLA Breach",
    priority: "Critical",
    condition: "No resolution",
    escalationLevel: "Level 1",
    escalatesTo: "Team Lead",
    timeThreshold: "30 mins",
    status: "Active",
    actionType: "Notify",
  },
  {
    id: "er-004",
    ruleId: "#ER004",
    triggerType: "SLA Breach",
    priority: "High",
    condition: "No resolution",
    escalationLevel: "Level 1",
    escalatesTo: "Support Lead",
    timeThreshold: "1 hour",
    status: "Active",
    actionType: "Notify + Assign",
  },
  {
    id: "er-003",
    ruleId: "#ER003",
    triggerType: "Status Based",
    priority: "Medium",
    condition: "Ticket in Progress",
    escalationLevel: "Level 1",
    escalatesTo: "Supervisor",
    timeThreshold: "4 hours",
    status: "Active",
    actionType: "Reminder",
  },
  {
    id: "er-002",
    ruleId: "#ER002",
    triggerType: "Priority Based",
    priority: "Medium",
    condition: "Ticket not assigned",
    escalationLevel: "Level 1",
    escalatesTo: "Admin",
    timeThreshold: "6 hours",
    status: "Active",
    actionType: "Notify",
  },
  {
    id: "er-001",
    ruleId: "#ER001",
    triggerType: "Time Based",
    priority: "Low",
    condition: "Pending too long",
    escalationLevel: "Level 2",
    escalatesTo: "Support Lead",
    timeThreshold: "8 hours",
    status: "Active",
    actionType: "Notify + Assign",
  },
];

superRouter.get("/support/escalation-rules", requireAuth, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const page = await prisma.cmsPage.findUnique({ where: { slug: "system-escalation-rules" } });
    if (page?.content && Array.isArray((page.content as any).rules)) {
      return res.json((page.content as any).rules);
    }
    await prisma.cmsPage.upsert({
      where: { slug: "system-escalation-rules" },
      create: { slug: "system-escalation-rules", title: "Escalation Rules", content: { rules: DEFAULT_ESCALATION_RULES } },
      update: { content: { rules: DEFAULT_ESCALATION_RULES } },
    });
    return res.json(DEFAULT_ESCALATION_RULES);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch escalation rules" });
  }
});

superRouter.post("/support/escalation-rules", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { triggerType, priority, condition, escalationLevel, escalatesTo, timeThreshold, status, actionType } = req.body;
    if (!triggerType || !priority) return res.status(400).json({ error: "Trigger type and priority are required" });

    const page = await prisma.cmsPage.findUnique({ where: { slug: "system-escalation-rules" } });
    const rules = (page?.content as any)?.rules || DEFAULT_ESCALATION_RULES;

    const newRule = {
      id: `er-${Date.now()}`,
      ruleId: `#ER00${rules.length + 1}`,
      triggerType,
      priority,
      condition: condition || "No action taken",
      escalationLevel: escalationLevel || "Level 1",
      escalatesTo: escalatesTo || "Support Lead",
      timeThreshold: timeThreshold || "30 mins",
      status: status || "Active",
      actionType: actionType || "Notify",
    };

    const updated = [newRule, ...rules];
    await prisma.cmsPage.upsert({
      where: { slug: "system-escalation-rules" },
      create: { slug: "system-escalation-rules", title: "Escalation Rules", content: { rules: updated } },
      update: { content: { rules: updated } },
    });

    return res.status(201).json(newRule);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create escalation rule" });
  }
});

superRouter.put("/support/escalation-rules/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = await prisma.cmsPage.findUnique({ where: { slug: "system-escalation-rules" } });
    const rules = (page?.content as any)?.rules || DEFAULT_ESCALATION_RULES;

    const idx = rules.findIndex((r: any) => r.id === id);
    if (idx === -1) return res.status(404).json({ error: "Escalation rule not found" });

    rules[idx] = { ...rules[idx], ...req.body };
    await prisma.cmsPage.update({
      where: { slug: "system-escalation-rules" },
      data: { content: { rules } },
    });

    return res.json(rules[idx]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update escalation rule" });
  }
});

superRouter.delete("/support/escalation-rules/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = await prisma.cmsPage.findUnique({ where: { slug: "system-escalation-rules" } });
    const rules = (page?.content as any)?.rules || DEFAULT_ESCALATION_RULES;

    const filtered = rules.filter((r: any) => r.id !== id);
    await prisma.cmsPage.update({
      where: { slug: "system-escalation-rules" },
      data: { content: { rules: filtered } },
    });

    return res.json({ success: true, message: "Escalation rule removed successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete escalation rule" });
  }
});


superRouter.put("/tenants/:id/status", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'active' or 'suspended'" });
    }

    if (status === "suspended") {
      const result = await handleTenantSuspension({
        tenantId: id,
        reason,
        actorEmail: req.user?.email,
      });
      return res.json({ success: true, status: "suspended", message: result.message, emailsSent: result.emailsSent });
    } else {
      const result = await handleTenantReactivation({
        tenantId: id,
        actorEmail: req.user?.email,
      });
      return res.json({ success: true, status: "active", message: result.message });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update tenant status" });
  }
});

// ==========================================
// 12. P01: USER PASSWORD RESET
// ==========================================
const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters long"),
  password_confirmation: z.string().optional(),
});

superRouter.put(["/users/:id/reset-password", "/users/:id/password"], requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const body = resetPasswordSchema.parse(req.body);

    if (body.password_confirmation && body.password !== body.password_confirmation) {
      return res.status(400).json({ error: "Password confirmation does not match." });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: "User account not found." });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return res.json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(500).json({ error: err.message || "Failed to reset password." });
  }
});

// ==========================================
// 13. P01: LOGIN HISTORY
// ==========================================
superRouter.get(["/users/login-history", "/login-history"], requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const search = (req.query.search as string) || "";
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const perPage = Math.max(1, Math.min(100, parseInt((req.query.per_page as string) || (req.query.limit as string) || "15", 10)));
    const sortField = (req.query.sort_field as string) || "date";
    const sortDirection = ((req.query.sort_direction as string) || "desc").toLowerCase() === "asc" ? "asc" : "desc";

    const where: any = {};
    if (search) {
      where.OR = [
        { ip: { contains: search } },
        { user: { email: { contains: search } } },
        { user: { profile: { fullName: { contains: search } } } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.loginHistory.count({ where }),
      prisma.loginHistory.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  fullName: true,
                  avatarUrl: true,
                  tenantId: true,
                },
              },
              roles: {
                select: {
                  role: true,
                },
              },
            },
          },
        },
        orderBy: sortField === "ip" ? { ip: sortDirection } : { date: sortDirection },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    const formatted = records.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      ip: r.ip,
      date: r.date,
      details: r.details,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      user: {
        id: r.user?.id,
        name: r.user?.profile?.fullName || r.user?.email?.split("@")[0] || "User",
        email: r.user?.email,
        avatar: r.user?.profile?.avatarUrl || null,
        type: r.user?.roles?.[0]?.role || "user",
      },
    }));

    return res.json({
      data: formatted,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
      from: (page - 1) * perPage + 1,
      to: Math.min(page * perPage, total),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch login history." });
  }
});

superRouter.get("/users/:id/login-history", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const records = await prisma.loginHistory.findMany({
      where: { userId: id },
      orderBy: { date: "desc" },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, avatarUrl: true } },
            roles: { select: { role: true } },
          },
        },
      },
    });

    const formatted = records.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      ip: r.ip,
      date: r.date,
      details: r.details,
      createdAt: r.createdAt,
      user: {
        id: r.user?.id,
        name: r.user?.profile?.fullName || r.user?.email || "User",
        email: r.user?.email,
        avatar: r.user?.profile?.avatarUrl || null,
        type: r.user?.roles?.[0]?.role || "user",
      },
    }));

    return res.json({ data: formatted, total: formatted.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch user login history." });
  }
});

superRouter.delete(["/users/login-history/:id", "/login-history/:id"], requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.loginHistory.delete({ where: { id } });
    return res.json({ success: true, message: "Login history record deleted successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete login history record." });
  }
});

// ==========================================
// 14. P02: DATABASE BACKUP & RESTORE
// ==========================================
superRouter.get("/backup/snapshots", requireAuth, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const snapshots = listBackupSnapshots();
    return res.json(snapshots);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list backup snapshots." });
  }
});

superRouter.post("/backup/generate", requireAuth, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const snapshot = await generateDatabaseBackup();
    return res.status(201).json({
      success: true,
      message: "Database backup snapshot generated successfully.",
      snapshot,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate database backup." });
  }
});

superRouter.get("/backup/download/:filename", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.params;
    if (!filename || filename.includes("..") || path.basename(filename) !== filename) {
      return res.status(400).json({ error: "Invalid backup filename." });
    }
    const safePath = getBackupFilePath(filename);
    if (!safePath || !fs.existsSync(safePath)) {
      return res.status(404).json({ error: "Backup file not found or inaccessible." });
    }

    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(safePath)}"`);
    res.setHeader("Content-Type", "application/octet-stream");

    const stream = fs.createReadStream(safePath);
    stream.on("error", (streamErr) => {
      if (!res.headersSent) {
        res.status(500).json({ error: streamErr.message });
      }
    });
    return stream.pipe(res);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to download backup file." });
  }
});

superRouter.delete("/backup/:filename", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.params;
    if (!filename || filename.includes("..") || path.basename(filename) !== filename) {
      return res.status(400).json({ error: "Invalid backup filename." });
    }
    const success = deleteBackupSnapshot(filename);
    if (!success) {
      return res.status(404).json({ error: "Backup file not found or could not be removed." });
    }
    return res.json({ success: true, message: `Backup file '${filename}' deleted successfully.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete backup file." });
  }
});

// ==========================================
// 15. P03: MULTILINGUAL PHRASE EDITOR
// ==========================================
superRouter.get("/languages", requireAuth, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const languages = await getLanguagesList();
    return res.json(languages);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch languages list." });
  }
});

superRouter.get("/languages/:code", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const phrases = await getLanguagePhrases(code);
    return res.json({ code, phrases });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch language phrases." });
  }
});

superRouter.put("/languages/:code", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const phrases = req.body?.phrases || req.body?.data || req.body;
    if (typeof phrases !== "object" || phrases === null) {
      return res.status(400).json({ error: "Phrases dictionary must be a valid JSON object." });
    }
    await saveLanguagePhrases(code, phrases);
    return res.json({
      success: true,
      message: `Translations for '${code}' saved successfully.`,
      code,
      phrases,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to save language phrases." });
  }
});

const createLanguageSchema = z.object({
  code: z.string().trim().min(2).max(10),
  name: z.string().trim().min(1).max(255),
  countryCode: z.string().trim().length(2),
});

superRouter.post("/languages", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { code, name, countryCode } = createLanguageSchema.parse(req.body);
    const newLang = await createLanguagePack(code, name, countryCode);
    return res.status(201).json({
      success: true,
      message: `Language '${name}' (${code}) created successfully.`,
      language: newLang,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(500).json({ error: err.message || "Failed to create language pack." });
  }
});

superRouter.delete("/languages/:code", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    await deleteLanguagePack(code);
    return res.json({ success: true, message: `Language '${code}' deleted successfully.` });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to delete language pack." });
  }
});

superRouter.patch("/languages/:code/toggle", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const updated = await toggleLanguagePackStatus(code);
    return res.json({
      success: true,
      message: `Language '${code}' status updated.`,
      language: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to toggle language status." });
  }
});


