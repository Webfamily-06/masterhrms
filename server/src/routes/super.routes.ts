import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireSuperAdmin, AuthRequest } from "../middleware/auth";
import { generateToken } from "../lib/jwt";

export const superRouter = Router();

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
    const [totalUsers, totalTenants, totalEmployees, totalDepartments] = await Promise.all([
      prisma.user.count(),
      prisma.tenant.count(),
      prisma.employee.count(),
      prisma.department.count(),
    ]);

    const activeEmployees = await prisma.employee.count({ where: { status: "active" } });

    return res.json({
      totalUsers,
      totalTenants,
      totalEmployees,
      activeEmployees,
      totalDepartments,
      mrr: totalTenants * 4999, // Dynamic estimation
      systemStatus: "Healthy",
      activeNodes: 1,
      database: "MySQL 8.0 (Local)",
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

    return res.json(tenants);
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
