import { sendTwoFactorOtpEmail } from "../lib/email";
import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireSuperAdmin, AuthRequest } from "../middleware/auth";
import { generateToken } from "../lib/jwt";
import { z } from "zod";
import { getIO } from "../socket";
import { getWorkspacePolicy, resolveWorkspacePolicy, syncSubscriptionPlans } from "../services/workspace-policy.service";

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

    return res.json({
      success: true,
      message: `Test 2FA verification email with OTP [${testOtp}] dispatched to ${toEmail}.`,
      otp: testOtp,
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

    // Generate fresh token with super admin & tenant admin roles for this workspace
    const roles = ["super_admin", "admin", "hr_admin"];
    const token = generateToken({
      userId: req.user!.userId,
      email: req.user!.email,
      tenantId: tenant.id,
      roles,
    });

    return res.json({
      success: true,
      message: `Entering ${tenant.name} workspace`,
      token,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      roles,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
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
    const policies = await Promise.all(tenants.map((t) => getWorkspacePolicy(t.id)));
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

// GET /api/super/tenants
superRouter.get("/tenants", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            employees: true,
            departments: true,
            profiles: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(await Promise.all(tenants.map(async (tenant) => ({ ...tenant, policy: await getWorkspacePolicy(tenant.id) }))));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/super/tenants
superRouter.post("/tenants", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, logoUrl } = req.body;
    const finalSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
        "-" +
        Math.random().toString(36).slice(2, 6);

    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug: finalSlug,
        logoUrl: logoUrl || null,
      },
    });

    return res.status(201).json(tenant);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// PUT /api/super/tenants/:id
superRouter.put("/tenants/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, logoUrl, logo_url } = req.body;

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        logoUrl: logoUrl !== undefined ? logoUrl : logo_url,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// DELETE /api/super/tenants/:id
superRouter.delete("/tenants/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.tenant.delete({ where: { id } });
    return res.json({ success: true, message: "Tenant deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/super/users
superRouter.get("/users", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const profiles = await prisma.profile.findMany({
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
