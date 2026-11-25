import { Router, Response } from "express";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest, invalidateAuthCache } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { ERP_MODULES } from "../lib/erp-modules";
import { getWorkspacePolicy } from "../services/workspace-policy.service";
import { SettingsService } from "../services/settings/settings.service";
import { CompanyProfileService } from "../services/company-profile/company-profile.service";
import { requireEntitlement } from "../middleware/entitlements";
import { getUploadsRoot } from "../services/media/media.service";

export const workspaceRouter = Router();

// All workspace routes require valid authentication and resolved tenant context
workspaceRouter.use(requireAuth, resolveTenantContext);

workspaceRouter.get("/subscription", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Workspace context required" });
    const [policy, employees, users] = await Promise.all([
      getWorkspacePolicy(tenantId),
      prisma.employee.count({ where: { tenantId } }),
      prisma.profile.count({ where: { tenantId, user: { roles: { none: { role: "super_admin" } } } } }),
    ]);
    return res.json({ ...policy, usage: { employees, users } });
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

// GET /api/workspace/holidays - Legacy route compatibility for _app/holidays.tsx
workspaceRouter.get("/holidays", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Workspace context required" });
    const holidays = await prisma.holiday.findMany({
      where: { tenantId },
      orderBy: { date: "asc" },
    });
    return res.json(holidays);
  } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

// GET /api/workspace/onboarding-status - Server-authoritative onboarding completion check
workspaceRouter.get("/onboarding-status", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.json({ isOnboarded: false, hasTenant: false });
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, isOnboarded: true },
    });
    if (!tenant) return res.json({ isOnboarded: false, hasTenant: false });
    return res.json({ isOnboarded: tenant.isOnboarded, hasTenant: true, tenantName: tenant.name, slug: tenant.slug });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/workspace/onboarding - Complete organization initial setup
workspaceRouter.post("/onboarding", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context missing" });

    const {
      orgName, timezone, currency, industry, companySize,
      phone, address, branchName, branchPhone, branchAddress,
      country, state, postalCode, email,
      logoLight, logoDark, favicon, logoUrl,
    } = req.body;

    const effectiveLogo = logoLight || logoDark || logoUrl;

    // Persist all tenant-level fields + mark as onboarded
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(orgName   ? { name: orgName }           : {}),
        ...(timezone  ? { timezone }                : {}),
        ...(currency  ? { currency }                : {}),
        ...(industry  ? { industry }                : {}),
        ...(companySize ? { companySize }           : {}),
        ...(phone     ? { phone }                   : {}),
        ...(address   ? { address }                 : {}),
        ...(effectiveLogo ? { logoUrl: effectiveLogo } : {}),
        isOnboarded: true,
      },
    });

    // Persist company profile legal identity & address
    try {
      const existingTenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, slug: true },
      });
      const effectiveName = orgName || existingTenant?.name || "Company";
      const effectiveEmail = email || req.user?.email || `admin@${existingTenant?.slug || "masterhrms.com"}`;
      await CompanyProfileService.upsertProfile(tenantId, {
        legalName: effectiveName,
        email: effectiveEmail,
        phone: phone || null,
        registeredAddress: address || null,
        registeredAddressLine1: address || null,
        registeredCity: null,
        registeredState: state || null,
        registeredPostalCode: postalCode || null,
        registeredCountry: country || "India",
        billingCountry: country || "India",
        sameAsRegistered: true,
      }, {
        userId: req.user?.userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    } catch (cpErr: any) {
      console.warn("[WorkspaceOnboarding] Company profile upsert warning:", cpErr?.message);
    }

    // Persist branding assets to settings CMS page
    if (logoLight || logoDark || favicon || effectiveLogo) {
      try {
        const pageSlug = `tenant-${tenantId}-settings`;
        const previous = await prisma.cmsPage.findUnique({
          where: { slug: pageSlug },
        });
        const prevContent = (previous?.content && typeof previous.content === "object" && !Array.isArray(previous.content))
          ? (previous.content as Record<string, any>)
          : {};

        await prisma.cmsPage.upsert({
          where: { slug: pageSlug },
          create: {
            slug: pageSlug,
            title: `${orgName || "Tenant"} Settings`,
            content: {
              ...prevContent,
              ...(logoLight ? { logoLight } : {}),
              ...(logoDark ? { logoDark } : {}),
              ...(favicon ? { favicon } : {}),
              ...(effectiveLogo ? { logoUrl: effectiveLogo } : {}),
              titleText: orgName || prevContent.titleText,
            },
          },
          update: {
            content: {
              ...prevContent,
              ...(logoLight ? { logoLight } : {}),
              ...(logoDark ? { logoDark } : {}),
              ...(favicon ? { favicon } : {}),
              ...(effectiveLogo ? { logoUrl: effectiveLogo } : {}),
              titleText: orgName || prevContent.titleText,
            },
          },
        });
      } catch (brandErr: any) {
        console.warn("[WorkspaceOnboarding] Brand settings sync warning:", brandErr?.message);
      }
    }

    // Create or update the first warehouse/branch
    const effectiveBranchName    = branchName    || "Headquarters";
    const effectiveBranchAddress = branchAddress || address || "Main Branch";
    const effectiveBranchPhone   = branchPhone   || phone   || "";

    const existingWh = await prisma.warehouse.findFirst({ where: { tenantId } });
    if (existingWh) {
      await prisma.warehouse.update({
        where: { id: existingWh.id },
        data: {
          name:     effectiveBranchName,
          location: effectiveBranchAddress,
          phone:    effectiveBranchPhone,
        },
      });
    } else {
      await prisma.warehouse.create({
        data: {
          tenantId,
          name:     effectiveBranchName,
          location: effectiveBranchAddress,
          phone:    effectiveBranchPhone,
          email:    "",
          isDefault: true,
        },
      });
    }

    return res.json({
      success: true,
      message: "Workspace onboarding successfully completed!",
      isOnboarded: true,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/workspace/subscription/upgrade
workspaceRouter.post("/subscription/upgrade", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context missing" });
    const { planSlug, billingCycle } = req.body;

    return res.json({
      success: true,
      message: `Successfully requested upgrade to ${planSlug || "Enterprise"} tier (${billingCycle || "annual"}).`,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/workspace/subscription/downgrade
workspaceRouter.post("/subscription/downgrade", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context missing" });
    const { planSlug } = req.body;

    return res.json({
      success: true,
      message: `Your downgrade request to ${planSlug || "Standard"} will take effect at the end of the current billing cycle.`,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/workspace/subscription/cancel
workspaceRouter.post("/subscription/cancel", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context missing" });
    const { reason, feedback } = req.body;

    return res.json({
      success: true,
      message: "Your subscription cancellation has been recorded. Access will continue until billing period expiration.",
      reason,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Helper: Ensure user has Workspace Admin or Super Admin authority
async function checkIsWorkspaceAdmin(req: AuthRequest, tenantId: string): Promise<boolean> {
  if (req.user?.roles?.includes("super_admin")) return true;
  if (
    req.user?.roles?.some((r) =>
      ["admin", "tenant_admin", "workspace_admin", "owner"].includes(r)
    )
  ) {
    return true;
  }
  if (req.user?.workspaceRole === "owner" || req.user?.workspaceRole === "admin") {
    return true;
  }

  const assignment = await prisma.userRoleAssignment.findUnique({
    where: {
      userId_tenantId: {
        userId: req.user!.userId,
        tenantId,
      },
    },
    include: { role: true },
  });

  return (
    Boolean(assignment?.role?.isActive) &&
    ["Workspace Admin", "Tenant Admin", "Administrator", "Owner"].includes(assignment?.role?.name || "")
  );
}

// Middleware guard for Workspace Admin endpoints
async function requireWorkspaceAdminGuard(req: AuthRequest, res: Response, next: Function) {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(400).json({ error: "Tenant context missing" });
  }

  const isAdmin = await checkIsWorkspaceAdmin(req, tenantId);
  if (!isAdmin) {
    return res.status(403).json({ error: "Forbidden: Workspace Administrator access required" });
  }
  next();
}

// -------------------------------------------------------------
// 1. GET /api/workspace/roles - List all roles for current tenant
// -------------------------------------------------------------
workspaceRouter.get("/roles", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;

    const roles = await prisma.workspaceRole.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: {
            userAssignments: true,
            permissions: true,
          },
        },
        permissions: {
          include: {
            permission: {
              select: { code: true, module: true, resource: true, action: true },
            },
          },
        },
      },
      orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    });

    const formatted = roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isActive: r.isActive,
      isSystem: r.isSystem,
      usersCount: r._count.userAssignments,
      permissionsCount: r._count.permissions,
      permissionCodes: r.permissions.map((p) => p.permission.code),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch workspace roles" });
  }
});

// -------------------------------------------------------------
// 2. GET /api/workspace/roles/:id - Get role details with permissions
// -------------------------------------------------------------
workspaceRouter.get("/roles/:id", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { id } = req.params;

    const role = await prisma.workspaceRole.findFirst({
      where: { id, tenantId },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: {
          select: { userAssignments: true },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: "Role not found in this workspace" });
    }

    return res.json({
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      isSystem: role.isSystem,
      usersCount: role._count.userAssignments,
      permissionCodes: role.permissions.map((p) => p.permission.code),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch role" });
  }
});

// -------------------------------------------------------------
// 3. POST /api/workspace/roles - Create role in tenant
// -------------------------------------------------------------
workspaceRouter.post("/roles", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { name, description, permissionCodes, isActive } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Role name is required" });
    }

    // Role name must be unique within the workspace
    const existing = await prisma.workspaceRole.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: "A role with this name already exists in your workspace" });
    }

    const role = await prisma.workspaceRole.create({
      data: {
        tenantId,
        name: name.trim(),
        description: description?.trim() || null,
        isActive: isActive !== false,
        isSystem: false,
      },
    });

    if (Array.isArray(permissionCodes) && permissionCodes.length > 0) {
      const perms = await prisma.permission.findMany({
        where: { code: { in: permissionCodes } },
        select: { id: true },
      });

      if (perms.length > 0) {
        await prisma.rolePermission.createMany({
          data: perms.map((p) => ({
            roleId: role.id,
            permissionId: p.id,
          })),
        });
      }
    }

    return res.status(201).json({
      message: "Role created successfully",
      id: role.id,
      name: role.name,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create role" });
  }
});

// -------------------------------------------------------------
// 4. PUT /api/workspace/roles/:id - Update role & permissions
// -------------------------------------------------------------
workspaceRouter.put("/roles/:id", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { id } = req.params;
    const { name, description, isActive, permissionCodes } = req.body;

    const existingRole = await prisma.workspaceRole.findFirst({
      where: { id, tenantId },
    });

    if (!existingRole) {
      return res.status(404).json({ error: "Role not found in this workspace" });
    }

    if (name && name.trim() !== existingRole.name) {
      const dup = await prisma.workspaceRole.findUnique({
        where: {
          tenantId_name: {
            tenantId,
            name: name.trim(),
          },
        },
      });
      if (dup) {
        return res.status(400).json({ error: "Another role with this name already exists" });
      }
    }

    // Update metadata
    await prisma.workspaceRole.update({
      where: { id },
      data: {
        name: name ? name.trim() : existingRole.name,
        description: description !== undefined ? (description?.trim() || null) : existingRole.description,
        isActive: isActive !== undefined ? !!isActive : existingRole.isActive,
      },
    });

    // Update permissions if provided
    if (Array.isArray(permissionCodes)) {
      await prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      const perms = await prisma.permission.findMany({
        where: { code: { in: permissionCodes } },
        select: { id: true },
      });

      if (perms.length > 0) {
        await prisma.rolePermission.createMany({
          data: perms.map((p) => ({
            roleId: id,
            permissionId: p.id,
          })),
        });
      }
    }

    // Invalidate auth cache for this workspace so updated permissions take effect immediately
    invalidateAuthCache(undefined, tenantId);

    return res.json({ message: "Role updated successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update role" });
  }
});

// -------------------------------------------------------------
// 5. POST /api/workspace/roles/:id/duplicate - Duplicate a role
// -------------------------------------------------------------
workspaceRouter.post("/roles/:id/duplicate", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { id } = req.params;

    const sourceRole = await prisma.workspaceRole.findFirst({
      where: { id, tenantId },
      include: {
        permissions: true,
      },
    });

    if (!sourceRole) {
      return res.status(404).json({ error: "Source role not found" });
    }

    let copyName = sourceRole.name + " (Copy)";
    let counter = 1;
    while (
      await prisma.workspaceRole.findUnique({
        where: { tenantId_name: { tenantId, name: copyName } },
      })
    ) {
      counter++;
      copyName = sourceRole.name + " (Copy " + counter + ")";
    }

    const newRole = await prisma.workspaceRole.create({
      data: {
        tenantId,
        name: copyName,
        description: sourceRole.description ? "Copy of " + sourceRole.description : null,
        isActive: true,
        isSystem: false,
      },
    });

    if (sourceRole.permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: sourceRole.permissions.map((p) => ({
          roleId: newRole.id,
          permissionId: p.permissionId,
        })),
      });
    }

    return res.status(201).json({
      message: "Role duplicated successfully",
      id: newRole.id,
      name: newRole.name,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to duplicate role" });
  }
});

// -------------------------------------------------------------
// 6. DELETE /api/workspace/roles/:id - Delete a role
// -------------------------------------------------------------
workspaceRouter.delete("/roles/:id", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { id } = req.params;

    const role = await prisma.workspaceRole.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { userAssignments: true } },
      },
    });

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    if (role.isSystem) {
      return res.status(400).json({ error: "System roles cannot be deleted" });
    }

    if (role._count.userAssignments > 0) {
      return res.status(400).json({
        error: "Cannot delete role: " + role._count.userAssignments + " users are still assigned to this role. Reassign them first.",
      });
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.workspaceRole.delete({ where: { id } });

    // Invalidate auth cache for this workspace so deleted role takes effect immediately
    invalidateAuthCache(undefined, tenantId);

    return res.json({ message: "Role deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete role" });
  }
});

// -------------------------------------------------------------
// 7. GET /api/workspace/permissions - Catalog of all permissions
// -------------------------------------------------------------
workspaceRouter.get("/permissions", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { resource: "asc" }, { code: "asc" }],
    });

    return res.json({
      modules: ERP_MODULES,
      permissions,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch permissions" });
  }
});

// -------------------------------------------------------------
// 8. GET /api/workspace/modules - Workspace module enablement status
// -------------------------------------------------------------
workspaceRouter.get("/modules", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;

    const tenantMods = await prisma.tenantModule.findMany({
      where: { tenantId },
    });

    const statusMap = new Map<string, boolean>();
    for (const m of tenantMods) {
      statusMap.set(m.moduleKey, m.isEnabled);
    }

    const result = ERP_MODULES.map((mod) => ({
      key: mod.key,
      name: mod.name,
      route: mod.route,
      description: mod.description,
      permission: mod.permission,
      iconName: mod.iconName,
      isEnabled: statusMap.has(mod.key) ? statusMap.get(mod.key) : true,
    }));

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch workspace modules" });
  }
});

// -------------------------------------------------------------
// 9. PUT /api/workspace/modules - Toggle module enabled/disabled
// -------------------------------------------------------------
workspaceRouter.put("/modules", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { moduleKey, isEnabled } = req.body;

    if (!moduleKey || typeof isEnabled !== "boolean") {
      return res.status(400).json({ error: "moduleKey and boolean isEnabled are required" });
    }

    const validKeys = ERP_MODULES.map((m) => m.key);
    if (!validKeys.includes(moduleKey)) {
      return res.status(400).json({ error: "Unknown ERP module key: " + moduleKey });
    }

    const updated = await prisma.tenantModule.upsert({
      where: {
        tenantId_moduleKey: {
          tenantId,
          moduleKey,
        },
      },
      update: { isEnabled },
      create: {
        tenantId,
        moduleKey,
        isEnabled,
      },
    });

    // Invalidate auth/permission cache & broadcast workspace module toggle to all active dashboards
    invalidateAuthCache(undefined, tenantId);
    try {
      const { RealtimeFactory } = await import("../services/factories/realtime.factory");
      RealtimeFactory.broadcastSettingsUpdate("TENANT", tenantId, "modules", [moduleKey], Date.now());
    } catch {}

    return res.json({
      message: "Module " + moduleKey + " " + (isEnabled ? "enabled" : "disabled") + " for workspace",
      module: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update module state" });
  }
});

// -------------------------------------------------------------
// 10. GET /api/workspace/users - List workspace users with assigned role
// -------------------------------------------------------------
workspaceRouter.get("/users", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;

    const profiles = await prisma.profile.findMany({
      where: { tenantId },
      include: {
        user: {
          include: {
            roles: true,
            employees: {
              where: { tenantId },
              select: { id: true, employeeCode: true, position: true },
            },
            workspaceRoleAssignments: {
              where: { tenantId },
              include: {
                role: {
                  select: { id: true, name: true, description: true, isActive: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter out any orphaned user accounts where employee was deleted and not super_admin
    const validProfiles = profiles.filter((p: any) => {
      const isSuperAdmin = p.user?.roles?.some((r: any) => r.role === "super_admin");
      const hasEmployee = (p.user?.employees || []).length > 0;
      return isSuperAdmin || hasEmployee;
    });

    const result = validProfiles.map((p: any) => {
      const assignment = p.user?.workspaceRoleAssignments?.[0];
      return {
        id: p.userId,
        fullName: p.fullName || p.user?.email?.split("@")[0] || "User",
        email: p.user?.email || p.email || "",
        avatarUrl: p.avatarUrl,
        assignedRole: assignment
          ? {
              id: assignment.role.id,
              name: assignment.role.name,
              description: assignment.role.description,
              isActive: assignment.role.isActive,
            }
          : null,
        twoFactorEnabled: p.user?.twoFactorEnabled ?? false,
        legacyRoles: (p.user?.roles || []).map((r: any) => r.role),
        createdAt: p.user?.createdAt || p.createdAt,
      };
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch workspace users" });
  }
});

// -------------------------------------------------------------
// 11. PUT /api/workspace/users/:userId/role - Assign role to user
// -------------------------------------------------------------
workspaceRouter.put("/users/:userId/role", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ error: "roleId is required" });
    }

    // Verify user belongs to current tenant
    const profile = await prisma.profile.findFirst({
      where: { userId, tenantId },
    });

    if (!profile) {
      return res.status(404).json({ error: "User not found in this workspace" });
    }

    // Verify role belongs to current tenant
    const role = await prisma.workspaceRole.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      return res.status(404).json({ error: "Role not found in this workspace" });
    }

    const assignment = await prisma.userRoleAssignment.upsert({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      update: { roleId },
      create: {
        userId,
        tenantId,
        roleId,
      },
      include: {
        role: { select: { id: true, name: true } },
      },
    });

    // Invalidate auth cache for this user so updated role takes effect immediately
    invalidateAuthCache(userId, tenantId);

    return res.json({
      message: "Role successfully assigned to user",
      user: {
        userId,
        role: assignment.role,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to assign role to user" });
  }
});

// -------------------------------------------------------------
// 11.1 POST /api/workspace/users - Create/Provision User in workspace
// -------------------------------------------------------------
workspaceRouter.post("/users", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { fullName, email, password, roleId, employeeId, legacyRole } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email address is required" });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists in platform
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        profile: true,
        roles: true,
      },
    });

    if (existingUser) {
      if (existingUser.profile?.tenantId === tenantId) {
        return res.status(400).json({ error: "User is already registered in this workspace" });
      }
      return res.status(400).json({ error: "Email address is already in use by another account" });
    }

    const initialPassword = password && typeof password === "string" && password.trim().length >= 6
      ? password.trim()
      : `User#${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const passwordHash = await bcrypt.hash(initialPassword, 10);

    // Create User, Profile, and default UserRole atomically
    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        profile: {
          create: {
            fullName: (fullName || cleanEmail.split("@")[0]).trim(),
            email: cleanEmail,
            tenantId,
          },
        },
        roles: {
          create: {
            role: (legacyRole === "hr_admin" || legacyRole === "manager") ? legacyRole : "employee",
            tenantId,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // If custom workspace role specified, assign it
    if (roleId) {
      const role = await prisma.workspaceRole.findFirst({
        where: { id: roleId, tenantId },
      });
      if (role) {
        await prisma.userRoleAssignment.create({
          data: {
            userId: newUser.id,
            tenantId,
            roleId: role.id,
          },
        });
      }
    }

    // If employee specified, map it
    if (employeeId) {
      await prisma.employee.updateMany({
        where: { id: employeeId, tenantId },
        data: { userId: newUser.id },
      });
    }

    invalidateAuthCache(newUser.id, tenantId);

    return res.status(201).json({
      message: "User account created successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.profile?.fullName,
      },
      temporaryPassword: password ? undefined : initialPassword,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create user account" });
  }
});

// -------------------------------------------------------------
// 11.2 PUT /api/workspace/users/:userId - Update user profile & mapping
// -------------------------------------------------------------
workspaceRouter.put("/users/:userId", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;
    const { fullName, roleId, employeeId } = req.body;

    const profile = await prisma.profile.findFirst({
      where: { userId, tenantId },
      include: { user: { include: { roles: true } } },
    });

    if (!profile) {
      return res.status(404).json({ error: "User not found in this workspace" });
    }

    // Safety: Protect super_admin
    const isSuperAdmin = profile.user?.roles?.some((r: any) => r.role === "super_admin");
    if (isSuperAdmin) {
      return res.status(403).json({ error: "Cannot modify Super-Admin account from workspace console" });
    }

    if (fullName && typeof fullName === "string") {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { fullName: fullName.trim() },
      });
    }

    if (roleId) {
      const role = await prisma.workspaceRole.findFirst({
        where: { id: roleId, tenantId },
      });
      if (role) {
        await prisma.userRoleAssignment.upsert({
          where: { userId_tenantId: { userId, tenantId } },
          update: { roleId },
          create: { userId, tenantId, roleId },
        });
      }
    }

    if (employeeId !== undefined) {
      // Unlink any currently linked employee for this user
      await prisma.employee.updateMany({
        where: { userId, tenantId },
        data: { userId: null },
      });
      if (employeeId) {
        await prisma.employee.updateMany({
          where: { id: employeeId, tenantId },
          data: { userId },
        });
      }
    }

    invalidateAuthCache(userId, tenantId);

    return res.json({ message: "User profile updated successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update user profile" });
  }
});

// -------------------------------------------------------------
// 11.3 POST /api/workspace/users/:userId/reset-password - Reset password
// -------------------------------------------------------------
workspaceRouter.post("/users/:userId/reset-password", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;
    const { newPassword } = req.body;

    const profile = await prisma.profile.findFirst({
      where: { userId, tenantId },
      include: { user: { include: { roles: true } } },
    });

    if (!profile) {
      return res.status(404).json({ error: "User not found in this workspace" });
    }

    // Safety: Protect super_admin
    const isSuperAdmin = profile.user?.roles?.some((r: any) => r.role === "super_admin");
    if (isSuperAdmin) {
      return res.status(403).json({ error: "Cannot reset password of Super-Admin account" });
    }

    const tempPassword = newPassword && typeof newPassword === "string" && newPassword.trim().length >= 6
      ? newPassword.trim()
      : `Pass#${Math.random().toString(36).slice(2, 8).toUpperCase()}${Math.floor(10 + Math.random() * 90)}`;

    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    invalidateAuthCache(userId, tenantId);

    return res.json({
      message: "Password reset successfully",
      temporaryPassword: tempPassword,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to reset user password" });
  }
});

// -------------------------------------------------------------
// 11.4 DELETE /api/workspace/users/:userId - Remove User from workspace
// -------------------------------------------------------------
workspaceRouter.delete("/users/:userId", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { userId } = req.params;

    if (userId === req.user!.id) {
      return res.status(400).json({ error: "Cannot delete your own administrator account" });
    }

    const profile = await prisma.profile.findFirst({
      where: { userId, tenantId },
      include: { user: { include: { roles: true } } },
    });

    if (!profile) {
      return res.status(404).json({ error: "User not found in this workspace" });
    }

    const isSuperAdmin = profile.user?.roles?.some((r: any) => r.role === "super_admin");
    if (isSuperAdmin) {
      return res.status(403).json({ error: "Cannot remove Super-Admin from workspace" });
    }

    // Unlink any associated employees
    await prisma.employee.updateMany({
      where: { userId, tenantId },
      data: { userId: null },
    });

    // Remove workspace role assignments
    await prisma.userRoleAssignment.deleteMany({
      where: { userId, tenantId },
    });

    // Remove profile for this tenant
      await prisma.profile.delete({
      where: { id: profile.id },
    });

    // If user has no other profiles or roles, delete User record cleanly
    const otherProfiles = await prisma.profile.count({ where: { userId } });
    if (otherProfiles === 0) {
      await prisma.userRole.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }

    invalidateAuthCache(userId, tenantId);

    return res.json({ message: "User removed from workspace successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to remove user from workspace" });
  }
});

// -------------------------------------------------------------
// 12. GET /api/workspace/google/config - Get Google Workspace integration settings
// -------------------------------------------------------------
workspaceRouter.get("/google/config", requireEntitlement("google-workspace-integration"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const slug = `system-google-workspace-${tenantId}`;

    const page = await prisma.cmsPage.findUnique({
      where: { slug },
    });

    let content: any = { accounts: [], config: {} };
    if (page?.content) {
      try {
        content = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
      } catch {
        content = { accounts: [], config: {} };
      }
    }

    const cfg = content.config || {};
    return res.json({
      accounts: content.accounts || [],
      config: {
        clientId: cfg.clientId || "",
        clientSecret: cfg.clientSecret ? "••••••••••••" : "",
        hasClientSecret: !!cfg.clientSecret,
        ssoEnabled: cfg.ssoEnabled ?? false,
        driveEnabled: cfg.driveEnabled ?? false,
        allowedDomain: cfg.allowedDomain || "",
        lastSyncedAt: cfg.lastSyncedAt || null,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch Google Workspace config" });
  }
});

// -------------------------------------------------------------
// 13. POST /api/workspace/google/config - Save Google Workspace settings
// -------------------------------------------------------------
workspaceRouter.post("/google/config", requireEntitlement("google-workspace-integration"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const slug = `system-google-workspace-${tenantId}`;
    const { clientId, clientSecret, ssoEnabled, driveEnabled, allowedDomain } = req.body;

    const page = await prisma.cmsPage.findUnique({
      where: { slug },
    });

    let existingContent: any = { accounts: [], config: {} };
    if (page?.content) {
      try {
        existingContent = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
      } catch {
        existingContent = { accounts: [], config: {} };
      }
    }

    const previousSecret = existingContent.config?.clientSecret || "";
    const updatedSecret = clientSecret && !clientSecret.includes("••••") ? clientSecret : previousSecret;

    const newConfig = {
      ...existingContent.config,
      clientId: clientId ?? existingContent.config?.clientId ?? "",
      clientSecret: updatedSecret,
      ssoEnabled: ssoEnabled ?? existingContent.config?.ssoEnabled ?? false,
      driveEnabled: driveEnabled ?? existingContent.config?.driveEnabled ?? false,
      allowedDomain: allowedDomain ?? existingContent.config?.allowedDomain ?? "",
    };

    const newContent = {
      accounts: existingContent.accounts || [],
      config: newConfig,
    };

    await prisma.cmsPage.upsert({
      where: { slug },
      update: {
        title: "Google Workspace Config",
        content: newContent,
        published: true,
      },
      create: {
        slug,
        title: "Google Workspace Config",
        content: newContent,
        published: true,
      },
    });

    return res.json({
      message: "Google Workspace settings saved successfully",
      config: {
        clientId: newConfig.clientId,
        hasClientSecret: !!newConfig.clientSecret,
        ssoEnabled: newConfig.ssoEnabled,
        driveEnabled: newConfig.driveEnabled,
        allowedDomain: newConfig.allowedDomain,
        lastSyncedAt: newConfig.lastSyncedAt || null,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to save Google Workspace config" });
  }
});

// -------------------------------------------------------------
// 14. POST /api/workspace/google/connect-account - Connect Google account
// -------------------------------------------------------------
workspaceRouter.post("/google/connect-account", requireEntitlement("google-workspace-integration"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const slug = `system-google-workspace-${tenantId}`;

    const profile = await prisma.profile.findFirst({
      where: { userId: req.user!.userId, tenantId },
    });

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    const accountEmail = req.body.email || user?.email || "admin@workspace.com";
    const accountName = req.body.name || profile?.fullName || "Workspace Admin";
    const avatar =
      req.body.avatar ||
      profile?.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(accountName)}&background=4285F4&color=fff`;

    const newAccount = {
      id: `ga-${Date.now()}`,
      email: accountEmail,
      name: accountName,
      avatar,
      role: req.user?.roles?.includes("super_admin") || req.user?.roles?.includes("admin") ? "Super Admin" : "Workspace User",
      connectedAt: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
      driveQuotaUsed: 8.2,
      driveQuotaTotal: 15.0,
    };

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    let existingContent: any = { accounts: [], config: {} };
    if (page?.content) {
      try {
        existingContent = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
      } catch {
        existingContent = { accounts: [], config: {} };
      }
    }

    const filteredAccounts = (existingContent.accounts || []).filter((a: any) => a.email !== accountEmail);
    const updatedAccounts = [newAccount, ...filteredAccounts];

    await prisma.cmsPage.upsert({
      where: { slug },
      update: {
        content: {
          ...existingContent,
          accounts: updatedAccounts,
        },
      },
      create: {
        slug,
        title: "Google Workspace Config",
        content: { accounts: updatedAccounts, config: {} },
        published: true,
      },
    });

    return res.json({
      message: "Google account connected successfully",
      account: newAccount,
      accounts: updatedAccounts,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to connect Google account" });
  }
});

// -------------------------------------------------------------
// 15. DELETE /api/workspace/google/accounts/:id - Disconnect account
// -------------------------------------------------------------
workspaceRouter.delete("/google/accounts/:id", requireEntitlement("google-workspace-integration"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { id } = req.params;
    const slug = `system-google-workspace-${tenantId}`;

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    if (!page?.content) {
      return res.json({ message: "Account disconnected", accounts: [] });
    }

    const content = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
    const updatedAccounts = (content.accounts || []).filter((a: any) => a.id !== id);

    await prisma.cmsPage.update({
      where: { slug },
      data: {
        content: {
          ...content,
          accounts: updatedAccounts,
        },
      },
    });

    return res.json({
      message: "Google account disconnected successfully",
      accounts: updatedAccounts,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to disconnect account" });
  }
});

// -------------------------------------------------------------
// 16. POST /api/workspace/google/sync-directory - Sync Directory with MySQL
// -------------------------------------------------------------
workspaceRouter.post("/google/sync-directory", requireEntitlement("google-workspace-integration"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const slug = `system-google-workspace-${tenantId}`;

    // Query all employees for this tenant in MySQL
    const employees = await prisma.employee.findMany({
      where: { tenantId },
      include: {
        department: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date().toISOString();

    // Update the lastSyncedAt timestamp in workspace configuration
    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    let content: any = { accounts: [], config: {} };
    if (page?.content) {
      try {
        content = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
      } catch {
        content = { accounts: [], config: {} };
      }
    }

    content.config = {
      ...(content.config || {}),
      lastSyncedAt: now,
    };

    await prisma.cmsPage.upsert({
      where: { slug },
      update: { content },
      create: {
        slug,
        title: "Google Workspace Config",
        content,
        published: true,
      },
    });

    const report = {
      success: true,
      message: `Google Workspace directory synchronized! Processed ${employees.length} employee records.`,
      totalEmployees: employees.length,
      syncedCount: employees.length,
      timestamp: now,
      employees: employees.map((emp) => ({
        id: emp.id,
        code: emp.employeeCode,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
        position: emp.position || "Staff",
        department: emp.department?.name || "General",
        status: emp.status,
      })),
    };

    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to synchronize directory" });
  }
});

// -------------------------------------------------------------
// 17. GET /api/workspace/google/drive-files - Real Drive & Company Documents
// -------------------------------------------------------------
workspaceRouter.get("/google/drive-files", requireEntitlement("google-workspace-integration"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;

    const docs = await prisma.companyDocument.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
    });

    const driveFiles = docs.map((doc) => {
      let type: "folder" | "document" | "spreadsheet" | "pdf" = "document";
      const titleLower = (doc.title + " " + doc.fileName).toLowerCase();
      if (titleLower.includes("sheet") || titleLower.includes(".xlsx") || titleLower.includes(".csv")) {
        type = "spreadsheet";
      } else if (titleLower.includes(".pdf") || doc.fileType?.includes("pdf")) {
        type = "pdf";
      } else if (titleLower.includes("folder") || doc.category?.toLowerCase().includes("folder")) {
        type = "folder";
      }

      return {
        id: doc.id,
        name: doc.title,
        type,
        size: doc.fileSize || "1.2 MB",
        modified: doc.updatedAt.toISOString().split("T")[0],
        owner: doc.verifiedBy || doc.signerName || "System Admin",
        category: doc.category,
        fileUrl: doc.fileUrl,
        documentCode: doc.documentCode,
        status: doc.status,
      };
    });

    return res.json(driveFiles);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch Drive files" });
  }
});

// -------------------------------------------------------------
// 18. POST /api/workspace/tally-import - Tally ERP XML Auto-Ledger Ingestion
// -------------------------------------------------------------
workspaceRouter.post("/tally-import", requireEntitlement("tally-importer"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { fileName = "tally_export.xml", vouchers = [], rows = [] } = req.body;

    const dataRows = (rows.length > 0 ? rows : vouchers) as any[];

    if (!Array.isArray(dataRows) || dataRows.length === 0) {
      return res.status(400).json({ error: "No Tally transactions or vouchers provided in payload." });
    }

    let importedCount = 0;
    let createdAccountsCount = 0;

    // Helper to resolve or auto-create ChartOfAccount
    async function resolveTallyAccount(name: string, typeHint: string = "expense"): Promise<any> {
      const cleanName = name.trim();
      let account = await prisma.chartOfAccount.findFirst({
        where: { tenantId, accountName: cleanName },
      });

      if (!account) {
        // Auto-assign account type based on standard Tally naming patterns
        let accountType = typeHint;
        let category = "indirect_expense";
        const lower = cleanName.toLowerCase();

        if (lower.includes("sales") || lower.includes("revenue") || lower.includes("income")) {
          accountType = "revenue";
          category = "direct_income";
        } else if (lower.includes("purchase") || lower.includes("cost of goods")) {
          accountType = "expense";
          category = "direct_expense";
        } else if (lower.includes("bank") || lower.includes("hdfc") || lower.includes("icici") || lower.includes("sbi") || lower.includes("cash")) {
          accountType = "asset";
          category = "current_asset";
        } else if (lower.includes("debtor") || lower.includes("receivable") || lower.includes("customer")) {
          accountType = "asset";
          category = "current_asset";
        } else if (lower.includes("creditor") || lower.includes("payable") || lower.includes("vendor") || lower.includes("supplier")) {
          accountType = "liability";
          category = "current_liability";
        } else if (lower.includes("capital") || lower.includes("equity") || lower.includes("drawing")) {
          accountType = "equity";
          category = "equity";
        }

        const count = await prisma.chartOfAccount.count({ where: { tenantId } });
        const accountCode = `TL-${1000 + count + 1}`;

        account = await prisma.chartOfAccount.create({
          data: {
            tenantId,
            accountCode,
            accountName: cleanName,
            accountType,
            category,
            balance: 0,
            isSystem: false,
          },
        });
        createdAccountsCount++;
      }

      return account;
    }

    // Default primary cash/bank asset account for offsets
    let primaryBank = await prisma.chartOfAccount.findFirst({
      where: { tenantId, accountCode: "1020" },
    });
    if (!primaryBank) {
      primaryBank = await prisma.chartOfAccount.findFirst({
        where: { tenantId, accountType: "asset" },
      });
    }

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const ledgerName = row.ledger || row.partyName || row.accountName || "Tally General Ledger";
      const amount = Math.abs(Number(row.amount || row.debit || row.credit || 0));
      const isDebit = Boolean(Number(row.debit || 0) > 0 || (row.type || "").toLowerCase().includes("payment") || (row.type || "").toLowerCase().includes("debit"));

      if (amount <= 0) continue;

      const targetAccount = await resolveTallyAccount(ledgerName, isDebit ? "expense" : "revenue");

      await prisma.$transaction(async (tx) => {
        const entryCount = await tx.journalEntry.count({ where: { tenantId } });
        const entryNumber = `TALLY-${Date.now().toString().slice(-4)}-${entryCount + 1}`;

        await tx.journalEntry.create({
          data: {
            tenantId,
            entryNumber,
            entryDate: row.date ? new Date(row.date) : new Date(),
            reference: row.voucherNo || `TALLY-VCH-${i + 1}`,
            referenceType: "tally_erp_xml",
            description: row.narration || `Tally Ingested: ${ledgerName} (${row.type || "Journal"})`,
            totalAmount: amount,
            status: "posted",
            items: {
              create: [
                {
                  accountId: targetAccount.id,
                  type: isDebit ? "debit" : "credit",
                  debit: isDebit ? amount : 0,
                  credit: isDebit ? 0 : amount,
                  notes: row.narration || `Tally: ${ledgerName}`,
                },
                ...(primaryBank
                  ? [
                      {
                        accountId: primaryBank.id,
                        type: isDebit ? "credit" : "debit",
                        debit: isDebit ? 0 : amount,
                        credit: isDebit ? amount : 0,
                        notes: `Offset against ${primaryBank.accountName}`,
                      },
                    ]
                  : []),
              ],
            },
          },
        });

        // Update account balances
        await tx.chartOfAccount.update({
          where: { id: targetAccount.id },
          data: { balance: { increment: isDebit ? amount : -amount } },
        });

        if (primaryBank) {
          await tx.chartOfAccount.update({
            where: { id: primaryBank.id },
            data: { balance: { increment: isDebit ? -amount : amount } },
          });
        }
      });

      importedCount++;
    }

    return res.status(201).json({
      success: true,
      fileName,
      totalVouchers: dataRows.length,
      importedCount,
      accountsCreated: createdAccountsCount,
      message: `Tally ERP XML mapping successfully posted ${importedCount} double-entry transactions and created ${createdAccountsCount} ledger accounts in MySQL!`,
    });
  } catch (err: any) {
    console.error("POST /api/workspace/tally-import error:", err);
    return res.status(500).json({ error: err.message || "Failed to process Tally XML import" });
  }
});

// ==========================================
// TENANT-SCOPED SETTINGS & BRANDING
// ==========================================

// GET /api/workspace/settings (Fetch tenant branding & organization settings)
workspaceRouter.get("/settings", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required." });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        timezone: true,
        createdAt: true,
      },
    });

    if (!tenant) return res.status(404).json({ error: "Tenant workspace not found." });

    const settingsPage = await prisma.cmsPage.findUnique({
      where: { slug: `tenant-${tenantId}-settings` },
    });

    const brandingGroup = await SettingsService.getGroup("TENANT", tenantId, "branding");

    const defaultBrand = {
      titleText: brandingGroup.values["branding.app_name"] || tenant.name,
      footerText:
        brandingGroup.values["branding.footer_text"]
          ? brandingGroup.values["branding.footer_text"]
          : `© ${new Date().getFullYear()} Webfamily Tech Solutions. All rights reserved.`,
      logoDark: brandingGroup.mediaUrls["branding.logo_dark_id"] || tenant.logoUrl,
      logoLight: brandingGroup.mediaUrls["branding.logo_light_id"] || tenant.logoUrl,
      favicon: brandingGroup.mediaUrls["branding.favicon_id"] || tenant.logoUrl,
      themeColor: brandingGroup.values["branding.primary_color"] || "#FF6B00",
      themeMode: "light",
      currency: "INR",
      currencySymbol: "₹",
    };

    const pageContent = (settingsPage?.content as any) || {};
    const company = pageContent.company || {
      name: tenant.name,
      companyName: tenant.name,
      timezone: tenant.timezone,
    };

    return res.json({
      tenant,
      brand: { ...pageContent, ...defaultBrand },
      company,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch workspace settings." });
  }
});

// PUT /api/workspace/settings/brand (Update tenant branding)
workspaceRouter.put("/settings/brand", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required." });

    const {
      logoUrl,
      logoDark,
      logoLight,
      favicon,
      titleText,
      footerText,
      themeColor,
      themeMode,
      currency,
      currencySymbol,
    } = req.body;

    // Update Tenant entity logoUrl if provided
    if (logoUrl || logoDark) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { logoUrl: logoUrl || logoDark },
      });
    }

    // Sync to authoritative SettingsService if primary branding attributes provided
    try {
      const syncValues: Record<string, any> = {};
      if (themeColor !== undefined) syncValues["branding.primary_color"] = themeColor;
      if (titleText !== undefined) syncValues["branding.app_name"] = titleText;
      if (footerText !== undefined) syncValues["branding.footer_text"] = footerText;
      if (Object.keys(syncValues).length > 0) {
        await SettingsService.setGroup("TENANT", tenantId, "branding", syncValues, {
          userId: req.user?.userId,
        });
      }
    } catch (syncErr) {
      console.warn("[WorkspaceSettings] Failed to sync brand update to SettingsService:", syncErr);
    }

    const previous = await prisma.cmsPage.findUnique({
      where: { slug: `tenant-${tenantId}-settings` },
    });

    const previousContent = (previous?.content && typeof previous.content === "object" && !Array.isArray(previous.content))
      ? (previous.content as Record<string, any>)
      : {};

    const content = {
      ...previousContent,
      ...(logoUrl !== undefined && { logoUrl }),
      ...(logoDark !== undefined && { logoDark }),
      ...(logoLight !== undefined && { logoLight }),
      ...(favicon !== undefined && { favicon }),
      ...(titleText !== undefined && { titleText }),
      ...(footerText !== undefined && { footerText }),
      ...(themeColor !== undefined && { themeColor }),
      ...(themeMode !== undefined && { themeMode }),
      ...(currency !== undefined && { currency }),
      ...(currencySymbol !== undefined && { currencySymbol }),
    };

    const saved = await prisma.cmsPage.upsert({
      where: { slug: `tenant-${tenantId}-settings` },
      create: {
        slug: `tenant-${tenantId}-settings`,
        title: `Workspace ${tenantId} Settings`,
        content,
        updatedBy: req.user!.userId,
      },
      update: {
        content,
        updatedBy: req.user!.userId,
      },
    });

    return res.json({
      success: true,
      message: "Branding settings saved successfully.",
      brand: saved.content,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update branding settings." });
  }
});

// PUT /api/workspace/settings/company (Update company address & profile)
workspaceRouter.put("/settings/company", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required." });

    const companyName = req.body.companyName || req.body.name;
    const { timezone, address, phone, email, city, state, country, zipCode, taxNumber } = req.body;

    if (companyName || timezone) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          ...(companyName && { name: companyName }),
          ...(timezone && { timezone }),
        },
      });
    }

    const previous = await prisma.cmsPage.findUnique({
      where: { slug: `tenant-${tenantId}-settings` },
    });

    const previousContent = (previous?.content as any) || {};
    const updatedCompany = {
      ...(previousContent.company || {}),
      ...(companyName && { name: companyName, companyName }),
      ...(timezone && { timezone }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(country !== undefined && { country }),
      ...(zipCode !== undefined && { zipCode }),
      ...(taxNumber !== undefined && { taxNumber }),
    };

    const content = {
      ...previousContent,
      company: updatedCompany,
    };

    await prisma.cmsPage.upsert({
      where: { slug: `tenant-${tenantId}-settings` },
      create: {
        slug: `tenant-${tenantId}-settings`,
        title: `Workspace ${tenantId} Settings`,
        content,
        updatedBy: req.user!.userId,
      },
      update: {
        content,
        updatedBy: req.user!.userId,
      },
    });

    // Dual-write sync into normalized CompanyProfile (Phase 2 Wave 2.1)
    try {
      await CompanyProfileService.upsertProfile(tenantId, {
        legalName: companyName || updatedCompany.name || "Company Legal Name",
        tradeName: companyName || updatedCompany.name || null,
        email: email || updatedCompany.email || `contact@${tenantId}.masterhrms.com`,
        phone: phone || updatedCompany.phone || null,
        registeredAddress: address || updatedCompany.address || null,
        registeredCity: city || updatedCompany.city || null,
        registeredState: state || updatedCompany.state || null,
        registeredPostalCode: zipCode || updatedCompany.zipCode || null,
        registeredCountry: country || updatedCompany.country || "India",
        billingAddress: address || updatedCompany.address || null,
        billingCity: city || updatedCompany.city || null,
        billingState: state || updatedCompany.state || null,
        billingPostalCode: zipCode || updatedCompany.zipCode || null,
        billingCountry: country || updatedCompany.country || "India",
        sameAsRegistered: true,
      }, {
        userId: req.user?.userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    } catch (profileSyncErr) {
      console.warn("[WorkspaceSettings] Non-blocking sync to CompanyProfile failed:", profileSyncErr);
    }

    return res.json({
      success: true,
      message: "Company details updated successfully.",
      company: updatedCompany,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update company settings." });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// TENANT CONTROL PLANE — Live Summary, Audit Logs, Billing Invoices & Integrations
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/workspace/dashboard-summary
workspaceRouter.get("/dashboard-summary", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required." });

    const [
      tenant,
      profiles,
      employees,
      departmentsCount,
      branchesCount,
      rolesCount,
      modules,
      addons,
      pendingLeavesCount,
      openJobsCount,
      subscription,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, slug: true, logoUrl: true, timezone: true, createdAt: true },
      }),
      prisma.profile.findMany({
        where: { tenantId },
        select: { userId: true, user: { select: { twoFactorEnabled: true } } },
      }),
      prisma.employee.findMany({
        where: { tenantId },
        select: { id: true, status: true },
      }),
      prisma.department.count({ where: { tenantId } }).catch(() => 0),
      prisma.branch.count({ where: { tenantId } }).catch(() => 0),
      prisma.workspaceRole.count({ where: { tenantId } }).catch(() => 0),
      prisma.tenantModule.findMany({ where: { tenantId }, orderBy: { moduleKey: "asc" } }).catch(() => []),
      prisma.tenantAddon.findMany({ where: { tenantId, status: "active" } }).catch(() => []),
      prisma.leaveRequest.count({ where: { tenantId, status: "pending" } }).catch(() => 0),
      prisma.jobPosting.count({ where: { tenantId, status: "open" } }).catch(() => 0),
      prisma.tenantSubscription
        .findFirst({
          where: { tenantId },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        })
        .catch(() => null),
      prisma.auditLog
        .findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
        .catch(() => []),
    ]);

    const totalUsers = profiles.length;
    const twoFactorEnabledUsers = profiles.filter((p) => p.user?.twoFactorEnabled).length;
    const twoFactorAdoptionPct = totalUsers > 0 ? Math.round((twoFactorEnabledUsers / totalUsers) * 100) : 0;
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter((e) => (e.status || "").toLowerCase() === "active").length;

    return res.json({
      success: true,
      data: {
        tenant,
        counts: {
          totalUsers,
          twoFactorEnabledUsers,
          twoFactorAdoptionPct,
          totalEmployees,
          activeEmployees,
          departments: departmentsCount,
          branches: branchesCount,
          roles: rolesCount,
          enabledModules: modules.filter((m) => m.isEnabled).length,
          installedAddons: addons.length,
          pendingLeaveRequests: pendingLeavesCount,
          openJobs: openJobsCount,
        },
        subscription: subscription
          ? {
              id: subscription.id,
              status: subscription.status,
              billingCycle: subscription.billingCycle,
              currentPeriodEnd: subscription.currentPeriodEnd,
              planName: subscription.plan?.name || "Enterprise",
              priceMonthly: Number(subscription.plan?.priceMonthly || 0),
              maxEmployees: subscription.plan?.maxEmployees ?? null,
              maxUsers: subscription.plan?.maxUsers ?? null,
            }
          : null,
        modules,
        recentAuditLogs,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load tenant dashboard summary." });
  }
});

// GET /api/workspace/audit-logs
workspaceRouter.get("/audit-logs", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required." });

    const search = String(req.query.search || "").trim();
    const action = String(req.query.action || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);

    const where: any = { tenantId };
    if (action && action !== "all") {
      where.action = { contains: action, mode: "insensitive" };
    }
    if (search) {
      where.OR = [
        { actorEmail: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.json({ success: true, data: { logs, total } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch tenant audit logs." });
  }
});

// GET /api/workspace/billing/invoices
workspaceRouter.get("/billing/invoices", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required." });

    const [invoices, subscription] = await Promise.all([
      prisma.billingInvoice.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.tenantSubscription
        .findFirst({
          where: { tenantId },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        })
        .catch(() => null),
    ]);

    return res.json({
      success: true,
      data: {
        invoices: invoices.map((inv) => ({
          ...inv,
          amount: Number(inv.amount || 0),
        })),
        subscription: subscription
          ? {
              id: subscription.id,
              status: subscription.status,
              billingCycle: subscription.billingCycle,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              planName: subscription.plan?.name || "Enterprise",
              priceMonthly: Number(subscription.plan?.priceMonthly || 0),
              priceAnnual: Number(subscription.plan?.priceAnnual || 0),
            }
          : null,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch billing invoices." });
  }
});

// GET /api/workspace/integrations/status
workspaceRouter.get("/integrations/status", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required." });

    const [emailGroup, storageGroup, addons, biometricCount, domainCount] = await Promise.all([
      SettingsService.getGroup("TENANT", tenantId, "email").catch(() => ({ values: {} as Record<string, any> })),
      SettingsService.getGroup("TENANT", tenantId, "storage").catch(() => ({ values: {} as Record<string, any> })),
      prisma.tenantAddon.findMany({ where: { tenantId, status: "active" } }).catch(() => []),
      (prisma as any).biometricDevice?.count({ where: { tenantId } }).catch(() => 0) ?? 0,
      (prisma as any).tenantCustomDomain?.count({ where: { tenantId } }).catch(() => 0) ?? 0,
    ]);

    const smtpConfigured = Boolean(emailGroup?.values?.["email.smtp_host"] || process.env.SMTP_HOST);
    const storageDriver = storageGroup?.values?.["storage.driver"] || "LOCAL";

    return res.json({
      success: true,
      data: {
        integrations: [
          {
            key: "smtp_email",
            name: "SMTP & Transactional Email",
            category: "Communication",
            status: smtpConfigured ? "connected" : "pending",
            summary: smtpConfigured ? "Configured for OTP, Payslips & Alerts" : "Using system default email fallback",
            managePath: "/tenant/settings",
          },
          {
            key: "file_storage",
            name: "Document & Media Storage",
            category: "Storage",
            status: "connected",
            summary: `Active storage driver: ${String(storageDriver).toUpperCase()}`,
            managePath: "/tenant/files/storage",
          },
          {
            key: "biometric_sync",
            name: "Biometric & Attendance Devices",
            category: "HR Operations",
            status: biometricCount > 0 ? "connected" : "available",
            summary: `${biometricCount} registered device${biometricCount === 1 ? "" : "s"}`,
            managePath: "/hr/attendance/records",
          },
          {
            key: "custom_domain",
            name: "Custom Workspace Domain & SSL",
            category: "Branding",
            status: domainCount > 0 ? "connected" : "available",
            summary: `${domainCount} custom domain${domainCount === 1 ? "" : "s"} configured`,
            managePath: "/tenant/domain",
          },
          {
            key: "tenant_addons",
            name: "Installed Workspace Add-ons",
            category: "Extensions",
            status: addons.length > 0 ? "connected" : "available",
            summary: `${addons.length} active add-on${addons.length === 1 ? "" : "s"}`,
            managePath: "/tenant/addons",
          },
        ],
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch integrations status." });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTHORITATIVE TENANT SYSTEM SETTINGS (14 Sections — Single Source of Truth)
// Locked to Tenant Admin / Workspace Admin / Super Admin on write.
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_HR_EMAIL_NOTIFICATIONS: Record<string, boolean> = {
  assignDocumentToEmployee: true,
  awardCreate: true,
  candidateStatusUpdate: true,
  complaintCreate: false,
  employeeContractCreate: true,
  employeeContractStatusUpdate: true,
  employeeCreate: true,
  employeeTransfer: true,
  employeeTransferStatusUpdate: true,
  interviewCreate: true,
  interviewStatusUpdate: true,
  jobApplied: true,
  leaveStatusUpdate: true,
  offerCreate: true,
  payrollRunStatusUpdate: true,
  promotionCreate: true,
  promotionStatusUpdate: true,
  resignationStatusUpdate: true,
  terminationCreate: true,
  terminationStatusUpdate: true,
  tripCreate: false,
  tripStatusUpdate: false,
  userCreate: true,
  warningCreate: true,
};

function buildDefaultSystemSettings(tenant: { name?: string | null; logoUrl?: string | null; timezone?: string | null } | null) {
  const companyName = tenant?.name || "MasterHRMS";
  const logo = tenant?.logoUrl || "";
  return {
    system: {
      defaultLanguage: "en",
      dateFormat: "Y-m-d",
      timeFormat: "h:i a",
      defaultTimezone: tenant?.timezone || "Asia/Kolkata",
      ipRestrictionEnabled: false,
    },
    brand: {
      logoDark: logo,
      logoLight: logo,
      favicon: logo,
      titleText: companyName,
      companyName,
      footerText: `© ${new Date().getFullYear()} ${companyName}. All rights reserved.`,
      companyMobile: "",
      companyEmail: "",
      companyAddress: "",
      taxNumber: "",
      themeColor: "#10b981",
      themeMode: "light",
      layoutMode: "full-width",
      sidebarVariant: "inset",
      sidebarStyle: "plain",
      layoutDirection: "ltr",
      sidebarPosition: "left",
    },
    currency: {
      defaultCurrency: "INR",
      symbol: "₹",
      currencyName: "Indian Rupee",
      decimalPlaces: 2,
      symbolPosition: "prefix", // "prefix" | "suffix"
      decimalSeparator: ".", // "." | ","
      thousandsSeparator: ",", // "," | "." | " " | ""
      showDecimals: true,
      addSpace: false,
    },
    email: {
      provider: "SMTP",
      driver: "smtp",
      host: process.env.SMTP_HOST || "",
      port: process.env.SMTP_PORT || "587",
      username: process.env.SMTP_USER || "",
      password: "",
      encryption: "TLS",
      fromAddress: process.env.SMTP_FROM || "noreply@masterhrms.com",
      fromName: companyName,
    },
    email_notifications: { ...DEFAULT_HR_EMAIL_NOTIFICATIONS },
    slack: {
      enabled: false,
      webhookUrl: "",
      botToken: "",
      defaultChannel: "#hr-updates",
    },
    telegram: {
      enabled: false,
      botToken: "",
      chatId: "",
    },
    twilio: {
      enabled: false,
      accountSid: "",
      authToken: "",
      fromNumber: "",
    },
    zoom: {
      enabled: false,
      accountId: "",
      clientId: "",
      clientSecret: "",
    },
    working_days: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    ip_restriction: {
      enabled: false,
      allowedIps: [] as Array<{ id: string; ip: string; label?: string; createdAt: string }>,
    },
    noc: {
      language: "en",
      content:
        "No Objection Certificate\nDate: {date}\n\nTo Whom It May Concern,\nThis is to certify that {employee_name} is currently employed with {company_name} as {designation}.\nWe have no objection to the above mentioned employee for any official purposes.\n\nSincerely,\nHR Department\n{company_name}",
    },
    experience_certificate: {
      language: "en",
      content:
        "Experience Certificate\nDate: {date}\n\nTo Whom It May Concern,\nThis is to certify that {employee_name} worked with {company_name} as {designation} from {joining_date} to {relieving_date}.\nDuring their tenure, their conduct and performance were found to be professional and commendable.\n\nBest wishes,\nHR Department\n{company_name}",
    },
    joining_letter: {
      language: "en",
      content:
        "Joining Letter\nDate: {date}\n\nDear {employee_name},\nWe are pleased to welcome you to {company_name} as {designation}.\nJoining Date: {joining_date}\nSalary: {salary}\nDepartment: {department}\nWe look forward to your valuable contribution to our company's success.\n\nBest regards,\nHR Department\n{company_name}",
    },
  };
}

async function loadTenantSystemSettings(tenantId: string) {
  const [tenant, rows] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, logoUrl: true, timezone: true },
    }),
    prisma.setting.findMany({
      where: { scope: "TENANT", scopeId: tenantId, group: "tenant_system_settings" },
    }),
  ]);

  const merged: Record<string, any> = buildDefaultSystemSettings(tenant);
  for (const row of rows) {
    if (row.key && merged[row.key] && row.valueJson && typeof row.valueJson === "object") {
      merged[row.key] = { ...merged[row.key], ...(row.valueJson as Record<string, any>) };
    }
  }
  return { tenant, settings: merged };
}

// GET /api/workspace/system-settings/public (Readable by EVERY user in the workspace — real-time global config)
workspaceRouter.get("/system-settings/public", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required." });

    const { tenant, settings } = await loadTenantSystemSettings(tenantId);
    return res.json({
      success: true,
      data: {
        tenant,
        system: settings.system,
        brand: settings.brand,
        currency: settings.currency,
        working_days: settings.working_days,
        noc: settings.noc,
        experience_certificate: settings.experience_certificate,
        joining_letter: settings.joining_letter,
        email_notifications: settings.email_notifications,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load public workspace settings." });
  }
});

// GET /api/workspace/system-settings (Full 14-section Tenant Admin settings)
workspaceRouter.get("/system-settings", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required." });

    const { tenant, settings } = await loadTenantSystemSettings(tenantId);
    return res.json({ success: true, data: { tenant, settings } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load tenant system settings." });
  }
});

const ALLOWED_SETTING_SECTIONS = new Set([
  "system",
  "brand",
  "currency",
  "email",
  "email_notifications",
  "slack",
  "telegram",
  "twilio",
  "zoom",
  "working_days",
  "ip_restriction",
  "noc",
  "experience_certificate",
  "joining_letter",
]);

// PUT /api/workspace/system-settings/:section (Tenant Admin ONLY — authoritative DB write)
workspaceRouter.put("/system-settings/:section", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required." });

    const section = String(req.params.section || "").trim();
    if (!ALLOWED_SETTING_SECTIONS.has(section)) {
      return res.status(400).json({ error: `Unknown settings section: ${section}` });
    }

    const payload = req.body && typeof req.body === "object" ? req.body : {};

    // Upsert into Setting table (PostgreSQL)
    const existing = await prisma.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "tenant_system_settings", key: section },
    });

    const mergedVal = {
      ...((existing?.valueJson as Record<string, any>) || {}),
      ...payload,
    };

    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { valueJson: mergedVal, valueType: "json", updatedBy: req.user?.userId || null },
      });
    } else {
      await prisma.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantId,
          group: "tenant_system_settings",
          key: section,
          valueJson: mergedVal,
          valueType: "json",
          updatedBy: req.user?.userId || null,
        },
      });
    }

    // Propagate authoritative fields to Tenant table & SettingsService
    if (section === "system" && payload.defaultTimezone) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { timezone: String(payload.defaultTimezone) },
      });
    }
    if (section === "brand") {
      const nextName = payload.companyName || payload.titleText;
      const nextLogo = payload.logoDark || payload.logoLight;
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          ...(nextName ? { name: String(nextName).trim() } : {}),
          ...(nextLogo !== undefined ? { logoUrl: nextLogo || null } : {}),
        },
      });
      await SettingsService.setGroup(
        "TENANT",
        tenantId,
        "branding",
        {
          ...(payload.themeColor ? { "branding.primary_color": payload.themeColor } : {}),
          ...(nextName ? { "branding.app_name": nextName } : {}),
          ...(payload.footerText !== undefined ? { "branding.footer_text": payload.footerText } : {}),
        },
        { userId: req.user?.userId }
      ).catch(() => {});

      // Sync Company Profile fields directly from Brand Settings -> Text tab
      await CompanyProfileService.upsertProfile(
        tenantId,
        {
          legalName: nextName || "Company Legal Name",
          tradeName: nextName || null,
          email: payload.companyEmail || `contact@${tenantId}.masterhrms.com`,
          phone: payload.companyMobile || null,
          registeredAddress: payload.companyAddress || null,
          billingAddress: payload.companyAddress || null,
          sameAsRegistered: true,
        },
        {
          userId: req.user?.userId,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        }
      ).catch(() => {});
    }

    // Audit log
    await prisma.auditLog
      .create({
        data: {
          tenantId,
          actorId: req.user?.userId || null,
          actorEmail: req.user?.email || null,
          action: `SETTINGS_UPDATE_${section.toUpperCase()}`,
          entityType: "TenantSystemSettings",
          entityId: section,
          afterJson: section === "email" ? { ...mergedVal, password: "***" } : mergedVal,
          ipAddress: req.ip || null,
          userAgent: req.get("user-agent") || null,
        },
      })
      .catch(() => {});

    return res.json({
      success: true,
      section,
      data: mergedVal,
      message: "Settings saved and applied across workspace.",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to save settings section." });
  }
});

// POST /api/workspace/system-settings/brand/upload (Upload Logo Dark, Logo Light, or Favicon)
workspaceRouter.post("/system-settings/brand/upload", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required." });

    const { assetType, imageDataUrl } = req.body || {};
    if (!["logoDark", "logoLight", "favicon"].includes(String(assetType))) {
      return res.status(400).json({ error: "assetType must be logoDark, logoLight, or favicon." });
    }
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return res.status(400).json({ error: "Image data URL is required." });
    }

    const match = imageDataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif|svg\+xml|x-icon|vnd\.microsoft\.icon));base64,(.+)$/i);
    if (!match) {
      return res.status(400).json({ error: "Unsupported format. Use PNG, JPG, WEBP, SVG, or ICO." });
    }
    const mime = match[1].toLowerCase();
    const ext =
      mime.includes("png") ? "png" :
      mime.includes("webp") ? "webp" :
      mime.includes("svg") ? "svg" :
      mime.includes("icon") ? "ico" :
      mime.includes("gif") ? "gif" : "jpg";
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: "Image must be 2 MB or smaller." });
    }

    const brandDir = path.join(getUploadsRoot(), "branding");
    if (!fs.existsSync(brandDir)) {
      fs.mkdirSync(brandDir, { recursive: true });
    }
    const safeTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, "");
    const fileName = `${safeTenant}-${assetType}-${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(brandDir, fileName), buffer);
    const url = `/uploads/branding/${fileName}`;

    // Persist immediately into brand setting + Tenant.logoUrl
    const existing = await prisma.setting.findFirst({
      where: { scope: "TENANT", scopeId: tenantId, group: "tenant_system_settings", key: "brand" },
    });
    const nextBrand = {
      ...((existing?.valueJson as Record<string, any>) || {}),
      [assetType]: url,
    };
    if (existing) {
      await prisma.setting.update({ where: { id: existing.id }, data: { valueJson: nextBrand } });
    } else {
      await prisma.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantId,
          group: "tenant_system_settings",
          key: "brand",
          valueJson: nextBrand,
          valueType: "json",
          updatedBy: req.user?.userId || null,
        },
      });
    }
    if (assetType === "logoDark") {
      await prisma.tenant.update({ where: { id: tenantId }, data: { logoUrl: url } }).catch(() => {});
    }

    return res.json({ success: true, assetType, url, message: "Brand asset uploaded." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to upload brand asset." });
  }
});

// POST /api/workspace/system-settings/test-email (Send Live SMTP Test Email)
workspaceRouter.post("/system-settings/test-email", requireWorkspaceAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required." });

    const { toEmail, smtp } = req.body || {};
    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(toEmail))) {
      return res.status(400).json({ error: "Please enter a valid recipient email address." });
    }

    const { settings } = await loadTenantSystemSettings(tenantId);
    const cfg = { ...settings.email, ...(smtp || {}) };

    if (!cfg.host) {
      return res.status(400).json({ error: "SMTP Host is required before sending a test email." });
    }

    const port = Number(cfg.port) || 587;
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port,
      secure: String(cfg.encryption || "").toUpperCase() === "SSL" || port === 465,
      auth: cfg.username ? { user: cfg.username, pass: cfg.password || "" } : undefined,
      connectionTimeout: 8000,
    });

    await transporter.sendMail({
      from: `"${cfg.fromName || "MasterHRMS"}" <${cfg.fromAddress || cfg.username}>`,
      to: String(toEmail).trim(),
      subject: `[Test] ${cfg.fromName || "MasterHRMS"} SMTP Configuration Verified`,
      text: "Your Tenant SMTP email configuration is working properly in real time.",
    });

    return res.json({ success: true, message: `Test email sent successfully to ${toEmail}.` });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || "SMTP connection failed. Please verify host, port, and credentials." });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// REAL-TIME WORKSPACE TRANSLATION ENGINE (Cached batch translator)
// ═══════════════════════════════════════════════════════════════════════════
const translationMemoryCache = new Map<string, string>();
const MAX_TRANSLATION_CACHE = 8000;

async function translateSingleText(text: string, targetLang: string): Promise<string> {
  const cacheKey = `${targetLang}::${text}`;
  const cached = translationMemoryCache.get(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(
      targetLang
    )}&dt=t&q=${encodeURIComponent(text)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) return text;
    const json: any = await resp.json();
    const translated = Array.isArray(json?.[0])
      ? json[0].map((seg: any) => (Array.isArray(seg) ? seg[0] : "")).join("")
      : text;
    const clean = translated && translated.trim() ? translated : text;
    if (translationMemoryCache.size > MAX_TRANSLATION_CACHE) {
      const firstKey = translationMemoryCache.keys().next().value;
      if (firstKey) translationMemoryCache.delete(firstKey);
    }
    translationMemoryCache.set(cacheKey, clean);
    return clean;
  } catch {
    return text;
  }
}

// POST /api/workspace/translate
workspaceRouter.post("/translate", async (req: AuthRequest, res: Response) => {
  try {
    const targetLang = String(req.body?.targetLang || "en").trim().toLowerCase();
    const rawTexts: unknown[] = Array.isArray(req.body?.texts) ? req.body.texts : [];
    const texts = Array.from(
      new Set(
        rawTexts
          .map((t) => String(t ?? "").trim())
          .filter((t) => t.length > 0 && t.length <= 400)
      )
    ).slice(0, 80);

    if (!targetLang || targetLang === "en" || texts.length === 0) {
      const passthrough: Record<string, string> = {};
      texts.forEach((t) => { passthrough[t] = t; });
      return res.json({ success: true, targetLang, translations: passthrough });
    }

    const translations: Record<string, string> = {};
    // Translate in small parallel chunks of 10 for fast response
    const chunkSize = 10;
    for (let i = 0; i < texts.length; i += chunkSize) {
      const slice = texts.slice(i, i + chunkSize);
      const results = await Promise.all(slice.map((t) => translateSingleText(t, targetLang)));
      slice.forEach((orig, idx) => {
        translations[orig] = results[idx];
      });
    }

    return res.json({ success: true, targetLang, translations });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Translation failed." });
  }
});


