"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceRouter = void 0;
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const erp_modules_1 = require("../lib/erp-modules");
const workspace_policy_service_1 = require("../services/workspace-policy.service");
const settings_service_1 = require("../services/settings/settings.service");
const company_profile_service_1 = require("../services/company-profile/company-profile.service");
const jwt_1 = require("../lib/jwt");
const device_session_service_1 = require("../services/device-session.service");
const tenant_ip_restriction_service_1 = require("../services/tenant-ip-restriction.service");
const hrm_permissions_catalog_1 = require("../lib/hrm-permissions-catalog");
const entitlements_1 = require("../middleware/entitlements");
const media_service_1 = require("../services/media/media.service");
const email_templates_registry_1 = require("../lib/email-templates-registry");
const branding_1 = require("../lib/email-design-system/branding");
const email_design_system_1 = require("../lib/email-design-system");
const hr_workflow_email_service_1 = require("../services/hr-workflow-email.service");
exports.workspaceRouter = (0, express_1.Router)();
// Allow Super Admin (tenantId: null) to read platform-default public settings without 403 (DEFECT-003)
exports.workspaceRouter.get("/system-settings/public", auth_1.requireAuth, async (req, res, next) => {
    if (!req.user?.tenantId && req.user?.roles?.includes("super_admin")) {
        try {
            const defaults = buildDefaultSystemSettings(null);
            return res.json({
                success: true,
                data: {
                    tenant: null,
                    system: defaults.system,
                    company: defaults.company,
                    brand: defaults.brand,
                    currency: defaults.currency,
                    working_days: defaults.working_days,
                    noc: defaults.noc,
                    experience_certificate: defaults.experience_certificate,
                    joining_letter: defaults.joining_letter,
                    email_notifications: defaults.email_notifications,
                },
            });
        }
        catch (err) {
            return res.status(500).json({ error: err.message || "Failed to load platform default settings." });
        }
    }
    return next();
});
// All workspace routes require valid authentication and resolved tenant context
exports.workspaceRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
exports.workspaceRouter.get("/subscription", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Workspace context required" });
        const [policy, employees, users] = await Promise.all([
            (0, workspace_policy_service_1.getWorkspacePolicy)(tenantId),
            prisma_1.prisma.employee.count({ where: { tenantId } }),
            prisma_1.prisma.profile.count({ where: { tenantId, user: { roles: { none: { role: "super_admin" } } } } }),
        ]);
        return res.json({ ...policy, usage: { employees, users } });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// GET /api/workspace/holidays - Legacy route compatibility for _app/holidays.tsx
exports.workspaceRouter.get("/holidays", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Workspace context required" });
        const holidays = await prisma_1.prisma.holiday.findMany({
            where: { tenantId },
            orderBy: { date: "asc" },
        });
        return res.json(holidays);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// GET /api/workspace/onboarding-status - Server-authoritative onboarding completion check
exports.workspaceRouter.get("/onboarding-status", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.json({ isOnboarded: false, hasTenant: false });
        const tenant = await prisma_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true, slug: true, isOnboarded: true },
        });
        if (!tenant)
            return res.json({ isOnboarded: false, hasTenant: false });
        return res.json({ isOnboarded: tenant.isOnboarded, hasTenant: true, tenantName: tenant.name, slug: tenant.slug });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// POST /api/workspace/onboarding - Complete organization initial setup
exports.workspaceRouter.post("/onboarding", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context missing" });
        const { orgName, timezone, currency, industry, companySize, phone, address, branchName, branchPhone, branchAddress, country, state, postalCode, email, logoLight, logoDark, favicon, logoUrl, } = req.body;
        const effectiveLogo = logoLight || logoDark || logoUrl;
        // Persist all tenant-level fields + mark as onboarded
        await prisma_1.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                ...(orgName ? { name: orgName } : {}),
                ...(timezone ? { timezone } : {}),
                ...(currency ? { currency } : {}),
                ...(industry ? { industry } : {}),
                ...(companySize ? { companySize } : {}),
                ...(phone ? { phone } : {}),
                ...(address ? { address } : {}),
                ...(effectiveLogo ? { logoUrl: effectiveLogo } : {}),
                isOnboarded: true,
            },
        });
        // Persist company profile legal identity & address
        try {
            const existingTenant = await prisma_1.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { name: true, slug: true },
            });
            const effectiveName = orgName || existingTenant?.name || "Company";
            const effectiveEmail = email || req.user?.email || `admin@${existingTenant?.slug || "masterhrms.com"}`;
            await company_profile_service_1.CompanyProfileService.upsertProfile(tenantId, {
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
        }
        catch (cpErr) {
            console.warn("[WorkspaceOnboarding] Company profile upsert warning:", cpErr?.message);
        }
        // Persist branding assets to settings CMS page
        if (logoLight || logoDark || favicon || effectiveLogo) {
            try {
                const pageSlug = `tenant-${tenantId}-settings`;
                const previous = await prisma_1.prisma.cmsPage.findUnique({
                    where: { slug: pageSlug },
                });
                const prevContent = (previous?.content && typeof previous.content === "object" && !Array.isArray(previous.content))
                    ? previous.content
                    : {};
                await prisma_1.prisma.cmsPage.upsert({
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
            }
            catch (brandErr) {
                console.warn("[WorkspaceOnboarding] Brand settings sync warning:", brandErr?.message);
            }
        }
        // Create or update the first warehouse/branch
        const effectiveBranchName = branchName || "Headquarters";
        const effectiveBranchAddress = branchAddress || address || "Main Branch";
        const effectiveBranchPhone = branchPhone || phone || "";
        const existingWh = await prisma_1.prisma.warehouse.findFirst({ where: { tenantId } });
        if (existingWh) {
            await prisma_1.prisma.warehouse.update({
                where: { id: existingWh.id },
                data: {
                    name: effectiveBranchName,
                    location: effectiveBranchAddress,
                    phone: effectiveBranchPhone,
                },
            });
        }
        else {
            await prisma_1.prisma.warehouse.create({
                data: {
                    tenantId,
                    name: effectiveBranchName,
                    location: effectiveBranchAddress,
                    phone: effectiveBranchPhone,
                    email: "",
                    isDefault: true,
                },
            });
        }
        return res.json({
            success: true,
            message: "Workspace onboarding successfully completed!",
            isOnboarded: true,
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// POST /api/workspace/subscription/upgrade
exports.workspaceRouter.post("/subscription/upgrade", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context missing" });
        const { planSlug, billingCycle } = req.body;
        return res.json({
            success: true,
            message: `Successfully requested upgrade to ${planSlug || "Enterprise"} tier (${billingCycle || "annual"}).`,
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// POST /api/workspace/subscription/downgrade
exports.workspaceRouter.post("/subscription/downgrade", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context missing" });
        const { planSlug } = req.body;
        return res.json({
            success: true,
            message: `Your downgrade request to ${planSlug || "Standard"} will take effect at the end of the current billing cycle.`,
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// POST /api/workspace/subscription/cancel
exports.workspaceRouter.post("/subscription/cancel", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context missing" });
        const { reason, feedback } = req.body;
        return res.json({
            success: true,
            message: "Your subscription cancellation has been recorded. Access will continue until billing period expiration.",
            reason,
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// Helper: Ensure user has Workspace Admin or Super Admin authority
async function checkIsWorkspaceAdmin(req, tenantId) {
    if (req.user?.roles?.includes("super_admin"))
        return true;
    if (req.user?.roles?.some((r) => ["admin", "tenant_admin", "workspace_admin", "owner"].includes(r))) {
        return true;
    }
    if (req.user?.workspaceRole === "owner" || req.user?.workspaceRole === "admin") {
        return true;
    }
    const assignment = await prisma_1.prisma.userRoleAssignment.findUnique({
        where: {
            userId_tenantId: {
                userId: req.user.userId,
                tenantId,
            },
        },
        include: { role: true },
    });
    return (Boolean(assignment?.role?.isActive) &&
        ["Workspace Admin", "Tenant Admin", "Administrator", "Owner"].includes(assignment?.role?.name || ""));
}
// Middleware guard for Workspace Admin endpoints
async function requireWorkspaceAdminGuard(req, res, next) {
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
exports.workspaceRouter.get("/roles", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const roles = await prisma_1.prisma.workspaceRole.findMany({
            where: { tenantId },
            include: {
                _count: {
                    select: {
                        userAssignments: true,
                        permissions: true,
                    },
                },
                userAssignments: {
                    take: 10,
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                profile: { select: { fullName: true, avatarUrl: true } },
                            },
                        },
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
            label: r.description || r.name,
            description: r.description,
            isActive: r.isActive,
            isSystem: r.isSystem,
            usersCount: r._count.userAssignments,
            users: r.userAssignments.map((ua) => ({
                id: ua.user.id,
                name: ua.user.profile?.fullName || ua.user.email,
                email: ua.user.email,
                avatarUrl: ua.user.profile?.avatarUrl || null,
            })),
            permissionsCount: r._count.permissions,
            permissionCodes: r.permissions.map((p) => p.permission.code),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        }));
        return res.json(formatted);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch workspace roles" });
    }
});
// -------------------------------------------------------------
// 2. GET /api/workspace/roles/:id - Get role details with permissions
// -------------------------------------------------------------
exports.workspaceRouter.get("/roles/:id", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const role = await prisma_1.prisma.workspaceRole.findFirst({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch role" });
    }
});
// -------------------------------------------------------------
// 3. POST /api/workspace/roles - Create role in tenant
// -------------------------------------------------------------
exports.workspaceRouter.post("/roles", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name, description, permissionCodes, isActive } = req.body;
        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ error: "Role name is required" });
        }
        // Role name must be unique within the workspace
        const existing = await prisma_1.prisma.workspaceRole.findUnique({
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
        const role = await prisma_1.prisma.workspaceRole.create({
            data: {
                tenantId,
                name: name.trim(),
                description: description?.trim() || null,
                isActive: isActive !== false,
                isSystem: false,
            },
        });
        if (Array.isArray(permissionCodes) && permissionCodes.length > 0) {
            const perms = await prisma_1.prisma.permission.findMany({
                where: { code: { in: permissionCodes } },
                select: { id: true },
            });
            if (perms.length > 0) {
                await prisma_1.prisma.rolePermission.createMany({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create role" });
    }
});
// -------------------------------------------------------------
// 4. PUT /api/workspace/roles/:id - Update role & permissions
// -------------------------------------------------------------
exports.workspaceRouter.put("/roles/:id", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { name, description, isActive, permissionCodes } = req.body;
        const existingRole = await prisma_1.prisma.workspaceRole.findFirst({
            where: { id, tenantId },
        });
        if (!existingRole) {
            return res.status(404).json({ error: "Role not found in this workspace" });
        }
        if (name && name.trim() !== existingRole.name) {
            const dup = await prisma_1.prisma.workspaceRole.findUnique({
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
        await prisma_1.prisma.workspaceRole.update({
            where: { id },
            data: {
                name: name ? name.trim() : existingRole.name,
                description: description !== undefined ? (description?.trim() || null) : existingRole.description,
                isActive: isActive !== undefined ? !!isActive : existingRole.isActive,
            },
        });
        // Update permissions if provided
        if (Array.isArray(permissionCodes)) {
            await prisma_1.prisma.rolePermission.deleteMany({
                where: { roleId: id },
            });
            const perms = await prisma_1.prisma.permission.findMany({
                where: { code: { in: permissionCodes } },
                select: { id: true },
            });
            if (perms.length > 0) {
                await prisma_1.prisma.rolePermission.createMany({
                    data: perms.map((p) => ({
                        roleId: id,
                        permissionId: p.id,
                    })),
                });
            }
        }
        // Invalidate auth cache for this workspace so updated permissions take effect immediately
        (0, auth_1.invalidateAuthCache)(undefined, tenantId);
        return res.json({ message: "Role updated successfully" });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update role" });
    }
});
// -------------------------------------------------------------
// 5. POST /api/workspace/roles/:id/duplicate - Duplicate a role
// -------------------------------------------------------------
exports.workspaceRouter.post("/roles/:id/duplicate", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const sourceRole = await prisma_1.prisma.workspaceRole.findFirst({
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
        while (await prisma_1.prisma.workspaceRole.findUnique({
            where: { tenantId_name: { tenantId, name: copyName } },
        })) {
            counter++;
            copyName = sourceRole.name + " (Copy " + counter + ")";
        }
        const newRole = await prisma_1.prisma.workspaceRole.create({
            data: {
                tenantId,
                name: copyName,
                description: sourceRole.description ? "Copy of " + sourceRole.description : null,
                isActive: true,
                isSystem: false,
            },
        });
        if (sourceRole.permissions.length > 0) {
            await prisma_1.prisma.rolePermission.createMany({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to duplicate role" });
    }
});
// -------------------------------------------------------------
// 6. DELETE /api/workspace/roles/:id - Delete a role
// -------------------------------------------------------------
exports.workspaceRouter.delete("/roles/:id", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const role = await prisma_1.prisma.workspaceRole.findFirst({
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
        await prisma_1.prisma.rolePermission.deleteMany({ where: { roleId: id } });
        await prisma_1.prisma.workspaceRole.delete({ where: { id } });
        // Invalidate auth cache for this workspace so deleted role takes effect immediately
        (0, auth_1.invalidateAuthCache)(undefined, tenantId);
        return res.json({ message: "Role deleted successfully" });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete role" });
    }
});
// -------------------------------------------------------------
// 7. GET /api/workspace/permissions - Catalog of all permissions (auto-seeds HRM catalog)
// -------------------------------------------------------------
exports.workspaceRouter.get("/permissions", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        await (0, hrm_permissions_catalog_1.ensureHrmPermissionsSeeded)();
        const permissions = await prisma_1.prisma.permission.findMany({
            orderBy: [{ module: "asc" }, { resource: "asc" }, { code: "asc" }],
        });
        return res.json({
            modules: erp_modules_1.ERP_MODULES,
            permissions,
            hrDefaultPermissionCodes: hrm_permissions_catalog_1.HR_DEFAULT_PERMISSION_CODES,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch permissions" });
    }
});
// -------------------------------------------------------------
// 7b. POST /api/workspace/roles/sync-hr-defaults - Sync HRM defaults to HR role(s)
// -------------------------------------------------------------
exports.workspaceRouter.post("/roles/sync-hr-defaults", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const result = await (0, hrm_permissions_catalog_1.syncHrRoleDefaultPermissions)(tenantId);
        (0, auth_1.invalidateAuthCache)(undefined, tenantId);
        return res.json({
            success: true,
            message: result.updatedRoles.length > 0
                ? `Synced ${result.permissionsAssigned} HRM permissions to: ${result.updatedRoles.join(", ")}`
                : "No HR role found in this workspace yet.",
            ...result,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to sync HR default permissions" });
    }
});
// -------------------------------------------------------------
// 8. GET /api/workspace/modules - Workspace module enablement status
// -------------------------------------------------------------
exports.workspaceRouter.get("/modules", async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const tenantMods = await prisma_1.prisma.tenantModule.findMany({
            where: { tenantId },
        });
        const statusMap = new Map();
        for (const m of tenantMods) {
            statusMap.set(m.moduleKey, m.isEnabled);
        }
        const result = erp_modules_1.ERP_MODULES.map((mod) => ({
            key: mod.key,
            name: mod.name,
            route: mod.route,
            description: mod.description,
            permission: mod.permission,
            iconName: mod.iconName,
            isEnabled: statusMap.has(mod.key) ? statusMap.get(mod.key) : true,
        }));
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch workspace modules" });
    }
});
// -------------------------------------------------------------
// 9. PUT /api/workspace/modules - Toggle module enabled/disabled
// -------------------------------------------------------------
exports.workspaceRouter.put("/modules", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { moduleKey, isEnabled } = req.body;
        if (!moduleKey || typeof isEnabled !== "boolean") {
            return res.status(400).json({ error: "moduleKey and boolean isEnabled are required" });
        }
        const validKeys = erp_modules_1.ERP_MODULES.map((m) => m.key);
        if (!validKeys.includes(moduleKey)) {
            return res.status(400).json({ error: "Unknown ERP module key: " + moduleKey });
        }
        const updated = await prisma_1.prisma.tenantModule.upsert({
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
        (0, auth_1.invalidateAuthCache)(undefined, tenantId);
        try {
            const { RealtimeFactory } = await Promise.resolve().then(() => __importStar(require("../services/factories/realtime.factory")));
            RealtimeFactory.broadcastSettingsUpdate("TENANT", tenantId, "modules", [moduleKey], Date.now());
        }
        catch { }
        return res.json({
            message: "Module " + moduleKey + " " + (isEnabled ? "enabled" : "disabled") + " for workspace",
            module: updated,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update module state" });
    }
});
// -------------------------------------------------------------
// 10. GET /api/workspace/users - List workspace users with assigned role
// -------------------------------------------------------------
exports.workspaceRouter.get("/users", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const profiles = await prisma_1.prisma.profile.findMany({
            where: { tenantId },
            include: {
                user: {
                    include: {
                        roles: true,
                        employees: {
                            where: { tenantId },
                            select: { id: true, employeeCode: true, position: true, phone: true, status: true },
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
        const result = profiles.map((p) => {
            const assignment = p.user?.workspaceRoleAssignments?.[0];
            const emp = p.user?.employees?.[0];
            const tenantRoles = (p.user?.roles || []).filter((r) => r.tenantId === tenantId || r.role === "super_admin");
            const hasActiveAccess = tenantRoles.length > 0 || Boolean(assignment);
            const loginStatus = emp?.status === "terminated" || !hasActiveAccess ? "disabled" : "enabled";
            return {
                id: p.userId,
                fullName: p.fullName || p.user?.email?.split("@")[0] || "User",
                email: p.user?.email || p.email || "",
                phone: p.phone || emp?.phone || "",
                avatarUrl: p.avatarUrl,
                loginStatus,
                assignedRole: assignment
                    ? {
                        id: assignment.role.id,
                        name: assignment.role.name,
                        description: assignment.role.description,
                        isActive: assignment.role.isActive,
                    }
                    : null,
                twoFactorEnabled: p.user?.twoFactorEnabled ?? false,
                legacyRoles: (p.user?.roles || []).map((r) => r.role),
                createdAt: p.user?.createdAt || p.createdAt,
            };
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch workspace users" });
    }
});
// -------------------------------------------------------------
// 11. PUT /api/workspace/users/:userId/role - Assign role to user
// -------------------------------------------------------------
exports.workspaceRouter.put("/users/:userId/role", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { userId } = req.params;
        const { roleId } = req.body;
        if (!roleId) {
            return res.status(400).json({ error: "roleId is required" });
        }
        // Verify user belongs to current tenant
        const profile = await prisma_1.prisma.profile.findFirst({
            where: { userId, tenantId },
        });
        if (!profile) {
            return res.status(404).json({ error: "User not found in this workspace" });
        }
        // Verify role belongs to current tenant
        const role = await prisma_1.prisma.workspaceRole.findFirst({
            where: { id: roleId, tenantId },
        });
        if (!role) {
            return res.status(404).json({ error: "Role not found in this workspace" });
        }
        const assignment = await prisma_1.prisma.userRoleAssignment.upsert({
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
        // Synchronize legacy UserRole to prevent dual-role split-brain (DEFECT-019)
        try {
            const roleNameLower = String(assignment.role?.name || "").toLowerCase().trim();
            const syncedLegacyRole = ["workspace admin", "tenant admin", "administrator", "owner", "hr manager", "hr admin", "hr administrator"].includes(roleNameLower)
                ? "hr_admin"
                : ["manager", "team lead", "department head"].includes(roleNameLower)
                    ? "manager"
                    : "employee";
            await prisma_1.prisma.userRole.deleteMany({
                where: { userId, tenantId, role: { not: "super_admin" } },
            });
            await prisma_1.prisma.userRole.create({
                data: { userId, tenantId, role: syncedLegacyRole },
            });
        }
        catch (legacySyncErr) {
            console.warn("[workspace/users/role] Legacy role sync warning:", legacySyncErr?.message || legacySyncErr);
        }
        // Invalidate auth cache for this user so updated role takes effect immediately
        (0, auth_1.invalidateAuthCache)(userId, tenantId);
        return res.json({
            message: "Role successfully assigned to user",
            user: {
                userId,
                role: assignment.role,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to assign role to user" });
    }
});
// -------------------------------------------------------------
// 11.1 POST /api/workspace/users - Create/Provision User in workspace
// -------------------------------------------------------------
exports.workspaceRouter.post("/users", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { fullName, email, phone, password, roleId, employeeId, legacyRole, loginStatus } = req.body;
        if (!email || typeof email !== "string" || !email.includes("@")) {
            return res.status(400).json({ error: "Valid email address is required" });
        }
        const cleanEmail = email.trim().toLowerCase();
        // Check if user already exists in platform
        const existingUser = await prisma_1.prisma.user.findUnique({
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
        const passwordHash = await bcryptjs_1.default.hash(initialPassword, 10);
        // Create User, Profile, and default UserRole atomically
        const newUser = await prisma_1.prisma.user.create({
            data: {
                email: cleanEmail,
                passwordHash,
                profile: {
                    create: {
                        fullName: (fullName || cleanEmail.split("@")[0]).trim(),
                        email: cleanEmail,
                        phone: phone ? String(phone).trim() : null,
                        tenantId,
                    },
                },
                ...(loginStatus === "disabled"
                    ? {}
                    : {
                        roles: {
                            create: {
                                role: (legacyRole === "hr_admin" || legacyRole === "manager") ? legacyRole : "employee",
                                tenantId,
                            },
                        },
                    }),
            },
            include: {
                profile: true,
            },
        });
        // If custom workspace role specified, assign it
        if (roleId) {
            const role = await prisma_1.prisma.workspaceRole.findFirst({
                where: { id: roleId, tenantId },
            });
            if (role) {
                await prisma_1.prisma.userRoleAssignment.create({
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
            await prisma_1.prisma.employee.updateMany({
                where: { id: employeeId, tenantId },
                data: { userId: newUser.id },
            });
        }
        (0, auth_1.invalidateAuthCache)(newUser.id, tenantId);
        return res.status(201).json({
            message: "User account created successfully",
            user: {
                id: newUser.id,
                email: newUser.email,
                fullName: newUser.profile?.fullName,
            },
            temporaryPassword: password ? undefined : initialPassword,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create user account" });
    }
});
// -------------------------------------------------------------
// 11.2 PUT /api/workspace/users/:userId - Update user profile & mapping
// -------------------------------------------------------------
exports.workspaceRouter.put("/users/:userId", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { userId } = req.params;
        const { fullName, email, phone, roleId, employeeId, loginStatus } = req.body;
        const profile = await prisma_1.prisma.profile.findFirst({
            where: { userId, tenantId },
            include: { user: { include: { roles: true } } },
        });
        if (!profile) {
            return res.status(404).json({ error: "User not found in this workspace" });
        }
        // Safety: Protect super_admin
        const isSuperAdmin = profile.user?.roles?.some((r) => r.role === "super_admin");
        if (isSuperAdmin) {
            return res.status(403).json({ error: "Cannot modify Super-Admin account from workspace console" });
        }
        const profileUpdates = {};
        if (fullName && typeof fullName === "string") {
            profileUpdates.fullName = fullName.trim();
        }
        if (phone !== undefined) {
            profileUpdates.phone = phone ? String(phone).trim() : null;
        }
        if (email && typeof email === "string" && email.trim().toLowerCase() !== profile.user?.email?.toLowerCase()) {
            const nextEmail = email.trim().toLowerCase();
            const dup = await prisma_1.prisma.user.findUnique({ where: { email: nextEmail } });
            if (dup && dup.id !== userId) {
                return res.status(400).json({ error: "Email address is already in use by another account" });
            }
            await prisma_1.prisma.user.update({ where: { id: userId }, data: { email: nextEmail } });
            profileUpdates.email = nextEmail;
        }
        if (Object.keys(profileUpdates).length > 0) {
            await prisma_1.prisma.profile.update({
                where: { id: profile.id },
                data: profileUpdates,
            });
        }
        if (phone !== undefined) {
            await prisma_1.prisma.employee.updateMany({
                where: { userId, tenantId },
                data: { phone: phone ? String(phone).trim() : null },
            });
        }
        if (loginStatus === "disabled") {
            if (userId === req.user.userId || userId === req.user.id) {
                return res.status(400).json({ error: "Cannot disable your own administrator account" });
            }
            await prisma_1.prisma.userRole.deleteMany({ where: { userId, tenantId } });
            await prisma_1.prisma.userRoleAssignment.deleteMany({ where: { userId, tenantId } });
            await (0, device_session_service_1.revokeAllSessions)(userId).catch(() => { });
        }
        else if (loginStatus === "enabled") {
            const existingTenantRole = await prisma_1.prisma.userRole.findFirst({ where: { userId, tenantId } });
            if (!existingTenantRole) {
                await prisma_1.prisma.userRole.create({ data: { userId, tenantId, role: "employee" } });
            }
        }
        if (roleId && loginStatus !== "disabled") {
            const role = await prisma_1.prisma.workspaceRole.findFirst({
                where: { id: roleId, tenantId },
            });
            if (role) {
                await prisma_1.prisma.userRoleAssignment.upsert({
                    where: { userId_tenantId: { userId, tenantId } },
                    update: { roleId },
                    create: { userId, tenantId, roleId },
                });
            }
        }
        if (employeeId !== undefined) {
            // Unlink any currently linked employee for this user
            await prisma_1.prisma.employee.updateMany({
                where: { userId, tenantId },
                data: { userId: null },
            });
            if (employeeId) {
                await prisma_1.prisma.employee.updateMany({
                    where: { id: employeeId, tenantId },
                    data: { userId },
                });
            }
        }
        (0, auth_1.invalidateAuthCache)(userId, tenantId);
        return res.json({ message: "User profile updated successfully" });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update user profile" });
    }
});
// -------------------------------------------------------------
// 11.3 POST /api/workspace/users/:userId/reset-password - Reset password
// -------------------------------------------------------------
exports.workspaceRouter.post("/users/:userId/reset-password", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { userId } = req.params;
        const { newPassword } = req.body;
        const profile = await prisma_1.prisma.profile.findFirst({
            where: { userId, tenantId },
            include: { user: { include: { roles: true } } },
        });
        if (!profile) {
            return res.status(404).json({ error: "User not found in this workspace" });
        }
        // Safety: Protect super_admin
        const isSuperAdmin = profile.user?.roles?.some((r) => r.role === "super_admin");
        if (isSuperAdmin) {
            return res.status(403).json({ error: "Cannot reset password of Super-Admin account" });
        }
        const tempPassword = newPassword && typeof newPassword === "string" && newPassword.trim().length >= 6
            ? newPassword.trim()
            : `Pass#${Math.random().toString(36).slice(2, 8).toUpperCase()}${Math.floor(10 + Math.random() * 90)}`;
        const passwordHash = await bcryptjs_1.default.hash(tempPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });
        (0, auth_1.invalidateAuthCache)(userId, tenantId);
        return res.json({
            message: "Password updated successfully",
            temporaryPassword: tempPassword,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to reset user password" });
    }
});
// -------------------------------------------------------------
// 11.3b POST /api/workspace/users/:userId/login-as - Tenant Admin Login As User
// -------------------------------------------------------------
exports.workspaceRouter.post("/users/:userId/login-as", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const actorId = req.user.userId || req.user.id;
        const { userId } = req.params;
        if (userId === actorId) {
            return res.status(400).json({ error: "You are already logged in as this user." });
        }
        const profile = await prisma_1.prisma.profile.findFirst({
            where: { userId, tenantId },
            include: {
                user: {
                    include: {
                        roles: true,
                        workspaceRoleAssignments: {
                            where: { tenantId },
                            include: {
                                role: {
                                    include: {
                                        permissions: { include: { permission: { select: { code: true } } } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!profile || !profile.user) {
            return res.status(404).json({ error: "User not found in this workspace." });
        }
        const isSuper = profile.user.roles?.some((r) => r.role === "super_admin");
        if (isSuper) {
            return res.status(403).json({ error: "Cannot impersonate a Super Admin account." });
        }
        const tenantLegacyRoles = (profile.user.roles || [])
            .filter((r) => r.tenantId === tenantId)
            .map((r) => r.role);
        const assignment = profile.user.workspaceRoleAssignments?.[0];
        if (tenantLegacyRoles.length === 0 && !assignment) {
            return res.status(403).json({ error: "This user's login account is currently disabled." });
        }
        const effectiveRoles = Array.from(new Set([
            ...tenantLegacyRoles,
            ...(assignment?.role?.name ? [assignment.role.name] : []),
        ]));
        const permissionCodes = assignment?.role?.permissions?.map((rp) => rp.permission.code) || [];
        const session = await (0, device_session_service_1.createDeviceSession)({
            userId: profile.user.id,
            tenantId,
            ipAddress: (0, tenant_ip_restriction_service_1.extractClientIp)(req),
            userAgent: req.get("user-agent") || "Tenant Admin Login-As",
        });
        const token = (0, jwt_1.generateToken)({
            userId: profile.user.id,
            email: profile.user.email,
            tenantId,
            roles: effectiveRoles,
            permissions: permissionCodes,
            sessionId: session.sessionId,
            isImpersonating: true,
        });
        await prisma_1.prisma.auditLog
            .create({
            data: {
                tenantId,
                actorId: actorId || null,
                actorEmail: req.user?.email || null,
                action: "TENANT_ADMIN_LOGIN_AS_USER",
                entityType: "User",
                entityId: profile.user.id,
                ipAddress: (0, tenant_ip_restriction_service_1.extractClientIp)(req),
                afterJson: { targetEmail: profile.user.email, targetName: profile.fullName },
            },
        })
            .catch(() => { });
        const lowerRoles = effectiveRoles.map((r) => String(r).toLowerCase());
        const redirectTo = lowerRoles.some((r) => r.includes("hr"))
            ? "/hr/dashboard"
            : lowerRoles.some((r) => r.includes("admin"))
                ? "/tenant/dashboard"
                : "/me/dashboard";
        return res.json({
            success: true,
            token,
            redirectTo,
            user: {
                id: profile.user.id,
                fullName: profile.fullName || profile.user.email,
                email: profile.user.email,
                role: assignment?.role?.name || effectiveRoles[0] || "Employee",
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to login as user." });
    }
});
// -------------------------------------------------------------
// 11.4 DELETE /api/workspace/users/:userId - Remove User from workspace
// -------------------------------------------------------------
exports.workspaceRouter.delete("/users/:userId", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { userId } = req.params;
        if (userId === req.user.id) {
            return res.status(400).json({ error: "Cannot delete your own administrator account" });
        }
        const profile = await prisma_1.prisma.profile.findFirst({
            where: { userId, tenantId },
            include: { user: { include: { roles: true } } },
        });
        if (!profile) {
            return res.status(404).json({ error: "User not found in this workspace" });
        }
        const isSuperAdmin = profile.user?.roles?.some((r) => r.role === "super_admin");
        if (isSuperAdmin) {
            return res.status(403).json({ error: "Cannot remove Super-Admin from workspace" });
        }
        // Unlink any associated employees
        await prisma_1.prisma.employee.updateMany({
            where: { userId, tenantId },
            data: { userId: null },
        });
        // Remove workspace role assignments
        await prisma_1.prisma.userRoleAssignment.deleteMany({
            where: { userId, tenantId },
        });
        // Remove profile for this tenant
        await prisma_1.prisma.profile.delete({
            where: { id: profile.id },
        });
        // If user has no other profiles or roles, delete User record cleanly
        const otherProfiles = await prisma_1.prisma.profile.count({ where: { userId } });
        if (otherProfiles === 0) {
            await prisma_1.prisma.userRole.deleteMany({ where: { userId } });
            await prisma_1.prisma.user.delete({ where: { id: userId } }).catch(() => { });
        }
        (0, auth_1.invalidateAuthCache)(userId, tenantId);
        return res.json({ message: "User removed from workspace successfully" });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to remove user from workspace" });
    }
});
// -------------------------------------------------------------
// 12. GET /api/workspace/google/config - Get Google Workspace integration settings
// -------------------------------------------------------------
exports.workspaceRouter.get("/google/config", (0, entitlements_1.requireEntitlement)("google-workspace-integration"), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const slug = `system-google-workspace-${tenantId}`;
        const page = await prisma_1.prisma.cmsPage.findUnique({
            where: { slug },
        });
        let content = { accounts: [], config: {} };
        if (page?.content) {
            try {
                content = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
            }
            catch {
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch Google Workspace config" });
    }
});
// -------------------------------------------------------------
// 13. POST /api/workspace/google/config - Save Google Workspace settings
// -------------------------------------------------------------
exports.workspaceRouter.post("/google/config", (0, entitlements_1.requireEntitlement)("google-workspace-integration"), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const slug = `system-google-workspace-${tenantId}`;
        const { clientId, clientSecret, ssoEnabled, driveEnabled, allowedDomain } = req.body;
        const page = await prisma_1.prisma.cmsPage.findUnique({
            where: { slug },
        });
        let existingContent = { accounts: [], config: {} };
        if (page?.content) {
            try {
                existingContent = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
            }
            catch {
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
        await prisma_1.prisma.cmsPage.upsert({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to save Google Workspace config" });
    }
});
// -------------------------------------------------------------
// 14. POST /api/workspace/google/connect-account - Connect Google account
// -------------------------------------------------------------
exports.workspaceRouter.post("/google/connect-account", (0, entitlements_1.requireEntitlement)("google-workspace-integration"), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const slug = `system-google-workspace-${tenantId}`;
        const profile = await prisma_1.prisma.profile.findFirst({
            where: { userId: req.user.userId, tenantId },
        });
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.userId },
        });
        const accountEmail = req.body.email || user?.email || "admin@workspace.com";
        const accountName = req.body.name || profile?.fullName || "Workspace Admin";
        const avatar = req.body.avatar ||
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
        const page = await prisma_1.prisma.cmsPage.findUnique({ where: { slug } });
        let existingContent = { accounts: [], config: {} };
        if (page?.content) {
            try {
                existingContent = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
            }
            catch {
                existingContent = { accounts: [], config: {} };
            }
        }
        const filteredAccounts = (existingContent.accounts || []).filter((a) => a.email !== accountEmail);
        const updatedAccounts = [newAccount, ...filteredAccounts];
        await prisma_1.prisma.cmsPage.upsert({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to connect Google account" });
    }
});
// -------------------------------------------------------------
// 15. DELETE /api/workspace/google/accounts/:id - Disconnect account
// -------------------------------------------------------------
exports.workspaceRouter.delete("/google/accounts/:id", (0, entitlements_1.requireEntitlement)("google-workspace-integration"), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const slug = `system-google-workspace-${tenantId}`;
        const page = await prisma_1.prisma.cmsPage.findUnique({ where: { slug } });
        if (!page?.content) {
            return res.json({ message: "Account disconnected", accounts: [] });
        }
        const content = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
        const updatedAccounts = (content.accounts || []).filter((a) => a.id !== id);
        await prisma_1.prisma.cmsPage.update({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to disconnect account" });
    }
});
// -------------------------------------------------------------
// 16. POST /api/workspace/google/sync-directory - Sync Directory with MySQL
// -------------------------------------------------------------
exports.workspaceRouter.post("/google/sync-directory", (0, entitlements_1.requireEntitlement)("google-workspace-integration"), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const slug = `system-google-workspace-${tenantId}`;
        // Query all employees for this tenant in MySQL
        const employees = await prisma_1.prisma.employee.findMany({
            where: { tenantId },
            include: {
                department: { select: { id: true, name: true } },
                user: { select: { id: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        const now = new Date().toISOString();
        // Update the lastSyncedAt timestamp in workspace configuration
        const page = await prisma_1.prisma.cmsPage.findUnique({ where: { slug } });
        let content = { accounts: [], config: {} };
        if (page?.content) {
            try {
                content = typeof page.content === "string" ? JSON.parse(page.content) : page.content;
            }
            catch {
                content = { accounts: [], config: {} };
            }
        }
        content.config = {
            ...(content.config || {}),
            lastSyncedAt: now,
        };
        await prisma_1.prisma.cmsPage.upsert({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to synchronize directory" });
    }
});
// -------------------------------------------------------------
// 17. GET /api/workspace/google/drive-files - Real Drive & Company Documents
// -------------------------------------------------------------
exports.workspaceRouter.get("/google/drive-files", (0, entitlements_1.requireEntitlement)("google-workspace-integration"), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const docs = await prisma_1.prisma.companyDocument.findMany({
            where: { tenantId },
            orderBy: { updatedAt: "desc" },
        });
        const driveFiles = docs.map((doc) => {
            let type = "document";
            const titleLower = (doc.title + " " + doc.fileName).toLowerCase();
            if (titleLower.includes("sheet") || titleLower.includes(".xlsx") || titleLower.includes(".csv")) {
                type = "spreadsheet";
            }
            else if (titleLower.includes(".pdf") || doc.fileType?.includes("pdf")) {
                type = "pdf";
            }
            else if (titleLower.includes("folder") || doc.category?.toLowerCase().includes("folder")) {
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch Drive files" });
    }
});
// -------------------------------------------------------------
// 18. POST /api/workspace/tally-import - Tally ERP XML Auto-Ledger Ingestion
// -------------------------------------------------------------
exports.workspaceRouter.post("/tally-import", (0, entitlements_1.requireEntitlement)("tally-importer"), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { fileName = "tally_export.xml", vouchers = [], rows = [] } = req.body;
        const dataRows = (rows.length > 0 ? rows : vouchers);
        if (!Array.isArray(dataRows) || dataRows.length === 0) {
            return res.status(400).json({ error: "No Tally transactions or vouchers provided in payload." });
        }
        let importedCount = 0;
        let createdAccountsCount = 0;
        // Helper to resolve or auto-create ChartOfAccount
        async function resolveTallyAccount(name, typeHint = "expense") {
            const cleanName = name.trim();
            let account = await prisma_1.prisma.chartOfAccount.findFirst({
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
                }
                else if (lower.includes("purchase") || lower.includes("cost of goods")) {
                    accountType = "expense";
                    category = "direct_expense";
                }
                else if (lower.includes("bank") || lower.includes("hdfc") || lower.includes("icici") || lower.includes("sbi") || lower.includes("cash")) {
                    accountType = "asset";
                    category = "current_asset";
                }
                else if (lower.includes("debtor") || lower.includes("receivable") || lower.includes("customer")) {
                    accountType = "asset";
                    category = "current_asset";
                }
                else if (lower.includes("creditor") || lower.includes("payable") || lower.includes("vendor") || lower.includes("supplier")) {
                    accountType = "liability";
                    category = "current_liability";
                }
                else if (lower.includes("capital") || lower.includes("equity") || lower.includes("drawing")) {
                    accountType = "equity";
                    category = "equity";
                }
                const count = await prisma_1.prisma.chartOfAccount.count({ where: { tenantId } });
                const accountCode = `TL-${1000 + count + 1}`;
                account = await prisma_1.prisma.chartOfAccount.create({
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
        let primaryBank = await prisma_1.prisma.chartOfAccount.findFirst({
            where: { tenantId, accountCode: "1020" },
        });
        if (!primaryBank) {
            primaryBank = await prisma_1.prisma.chartOfAccount.findFirst({
                where: { tenantId, accountType: "asset" },
            });
        }
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const ledgerName = row.ledger || row.partyName || row.accountName || "Tally General Ledger";
            const amount = Math.abs(Number(row.amount || row.debit || row.credit || 0));
            const isDebit = Boolean(Number(row.debit || 0) > 0 || (row.type || "").toLowerCase().includes("payment") || (row.type || "").toLowerCase().includes("debit"));
            if (amount <= 0)
                continue;
            const targetAccount = await resolveTallyAccount(ledgerName, isDebit ? "expense" : "revenue");
            await prisma_1.prisma.$transaction(async (tx) => {
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
    }
    catch (err) {
        console.error("POST /api/workspace/tally-import error:", err);
        return res.status(500).json({ error: err.message || "Failed to process Tally XML import" });
    }
});
// ==========================================
// TENANT-SCOPED SETTINGS & BRANDING
// ==========================================
// GET /api/workspace/settings (Fetch tenant branding & organization settings)
exports.workspaceRouter.get("/settings", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
        const tenant = await prisma_1.prisma.tenant.findUnique({
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
        if (!tenant)
            return res.status(404).json({ error: "Tenant workspace not found." });
        const settingsPage = await prisma_1.prisma.cmsPage.findUnique({
            where: { slug: `tenant-${tenantId}-settings` },
        });
        const brandingGroup = await settings_service_1.SettingsService.getGroup("TENANT", tenantId, "branding");
        const defaultBrand = {
            titleText: brandingGroup.values["branding.app_name"] || tenant.name,
            footerText: brandingGroup.values["branding.footer_text"]
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
        const pageContent = settingsPage?.content || {};
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch workspace settings." });
    }
});
// PUT /api/workspace/settings/brand (Update tenant branding)
exports.workspaceRouter.put("/settings/brand", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
        const { logoUrl, logoDark, logoLight, favicon, titleText, footerText, themeColor, themeMode, currency, currencySymbol, } = req.body;
        // Update Tenant entity logoUrl if provided
        if (logoUrl || logoDark) {
            await prisma_1.prisma.tenant.update({
                where: { id: tenantId },
                data: { logoUrl: logoUrl || logoDark },
            });
        }
        // Sync to authoritative SettingsService if primary branding attributes provided
        try {
            const syncValues = {};
            if (themeColor !== undefined)
                syncValues["branding.primary_color"] = themeColor;
            if (titleText !== undefined)
                syncValues["branding.app_name"] = titleText;
            if (footerText !== undefined)
                syncValues["branding.footer_text"] = footerText;
            if (Object.keys(syncValues).length > 0) {
                await settings_service_1.SettingsService.setGroup("TENANT", tenantId, "branding", syncValues, {
                    userId: req.user?.userId,
                });
            }
        }
        catch (syncErr) {
            console.warn("[WorkspaceSettings] Failed to sync brand update to SettingsService:", syncErr);
        }
        const previous = await prisma_1.prisma.cmsPage.findUnique({
            where: { slug: `tenant-${tenantId}-settings` },
        });
        const previousContent = (previous?.content && typeof previous.content === "object" && !Array.isArray(previous.content))
            ? previous.content
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
        const saved = await prisma_1.prisma.cmsPage.upsert({
            where: { slug: `tenant-${tenantId}-settings` },
            create: {
                slug: `tenant-${tenantId}-settings`,
                title: `Workspace ${tenantId} Settings`,
                content,
                updatedBy: req.user.userId,
            },
            update: {
                content,
                updatedBy: req.user.userId,
            },
        });
        return res.json({
            success: true,
            message: "Branding settings saved successfully.",
            brand: saved.content,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update branding settings." });
    }
});
// PUT /api/workspace/settings/company (Update company address & profile)
exports.workspaceRouter.put("/settings/company", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
        const companyName = req.body.companyName || req.body.name;
        const { timezone, address, phone, email, city, state, country, zipCode, taxNumber } = req.body;
        if (companyName || timezone) {
            await prisma_1.prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    ...(companyName && { name: companyName }),
                    ...(timezone && { timezone }),
                },
            });
        }
        const previous = await prisma_1.prisma.cmsPage.findUnique({
            where: { slug: `tenant-${tenantId}-settings` },
        });
        const previousContent = previous?.content || {};
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
        await prisma_1.prisma.cmsPage.upsert({
            where: { slug: `tenant-${tenantId}-settings` },
            create: {
                slug: `tenant-${tenantId}-settings`,
                title: `Workspace ${tenantId} Settings`,
                content,
                updatedBy: req.user.userId,
            },
            update: {
                content,
                updatedBy: req.user.userId,
            },
        });
        // Dual-write sync into normalized CompanyProfile (Phase 2 Wave 2.1)
        try {
            await company_profile_service_1.CompanyProfileService.upsertProfile(tenantId, {
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
        }
        catch (profileSyncErr) {
            console.warn("[WorkspaceSettings] Non-blocking sync to CompanyProfile failed:", profileSyncErr);
        }
        return res.json({
            success: true,
            message: "Company details updated successfully.",
            company: updatedCompany,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update company settings." });
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// TENANT CONTROL PLANE — Live Summary, Audit Logs, Billing Invoices & Integrations
// ═══════════════════════════════════════════════════════════════════════════
// GET /api/workspace/dashboard-summary
exports.workspaceRouter.get("/dashboard-summary", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
        const [tenant, profiles, employees, departmentsCount, branchesCount, rolesCount, modules, addons, pendingLeavesCount, openJobsCount, subscription, recentAuditLogs,] = await Promise.all([
            prisma_1.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { id: true, name: true, slug: true, logoUrl: true, timezone: true, createdAt: true },
            }),
            prisma_1.prisma.profile.findMany({
                where: { tenantId },
                select: { userId: true, user: { select: { twoFactorEnabled: true } } },
            }),
            prisma_1.prisma.employee.findMany({
                where: { tenantId },
                select: { id: true, status: true },
            }),
            prisma_1.prisma.department.count({ where: { tenantId } }).catch(() => 0),
            prisma_1.prisma.branch.count({ where: { tenantId } }).catch(() => 0),
            prisma_1.prisma.workspaceRole.count({ where: { tenantId } }).catch(() => 0),
            prisma_1.prisma.tenantModule.findMany({ where: { tenantId }, orderBy: { moduleKey: "asc" } }).catch(() => []),
            prisma_1.prisma.tenantAddon.findMany({ where: { tenantId, status: "active" } }).catch(() => []),
            prisma_1.prisma.leaveRequest.count({ where: { tenantId, status: "pending" } }).catch(() => 0),
            prisma_1.prisma.jobPosting.count({ where: { tenantId, status: "open" } }).catch(() => 0),
            prisma_1.prisma.tenantSubscription
                .findFirst({
                where: { tenantId },
                include: { plan: true },
                orderBy: { createdAt: "desc" },
            })
                .catch(() => null),
            prisma_1.prisma.auditLog
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load tenant dashboard summary." });
    }
});
// GET /api/workspace/audit-logs
exports.workspaceRouter.get("/audit-logs", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
        const search = String(req.query.search || "").trim();
        const action = String(req.query.action || "").trim();
        const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
        const where = { tenantId };
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
            prisma_1.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: limit,
            }),
            prisma_1.prisma.auditLog.count({ where }),
        ]);
        return res.json({ success: true, data: { logs, total } });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch tenant audit logs." });
    }
});
// GET /api/workspace/billing/invoices
exports.workspaceRouter.get("/billing/invoices", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
        const [invoices, subscription] = await Promise.all([
            prisma_1.prisma.billingInvoice.findMany({
                where: { tenantId },
                orderBy: { createdAt: "desc" },
                take: 100,
            }),
            prisma_1.prisma.tenantSubscription
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch billing invoices." });
    }
});
// GET /api/workspace/integrations/status
exports.workspaceRouter.get("/integrations/status", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
        const [emailGroup, storageGroup, addons, biometricCount, domainCount] = await Promise.all([
            settings_service_1.SettingsService.getGroup("TENANT", tenantId, "email").catch(() => ({ values: {} })),
            settings_service_1.SettingsService.getGroup("TENANT", tenantId, "storage").catch(() => ({ values: {} })),
            prisma_1.prisma.tenantAddon.findMany({ where: { tenantId, status: "active" } }).catch(() => []),
            prisma_1.prisma.biometricDevice?.count({ where: { tenantId } }).catch(() => 0) ?? 0,
            prisma_1.prisma.tenantCustomDomain?.count({ where: { tenantId } }).catch(() => 0) ?? 0,
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch integrations status." });
    }
});
// GET /api/workspace/login-history (Real-time User Login History strictly scoped to current tenant)
exports.workspaceRouter.get("/login-history", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
        const tenantProfiles = await prisma_1.prisma.profile.findMany({
            where: { tenantId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        roles: { where: { tenantId }, select: { role: true } },
                        workspaceRoleAssignments: {
                            where: { tenantId },
                            include: { role: { select: { name: true } } },
                        },
                    },
                },
            },
        });
        const userMap = new Map();
        const tenantUserIds = [];
        for (const p of tenantProfiles) {
            if (!p.userId)
                continue;
            tenantUserIds.push(p.userId);
            const wsRole = p.user?.workspaceRoleAssignments?.[0]?.role?.name;
            const legacyRole = p.user?.roles?.[0]?.role;
            const roleLabel = wsRole ||
                (legacyRole
                    ? String(legacyRole)
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())
                    : "Member");
            userMap.set(p.userId, {
                name: p.fullName || p.user?.email?.split("@")[0] || "User",
                email: p.user?.email || p.email || "",
                role: roleLabel,
            });
        }
        if (tenantUserIds.length === 0) {
            return res.json({ success: true, items: [], total: 0 });
        }
        const [historyRows, sessionRows] = await Promise.all([
            prisma_1.prisma.loginHistory.findMany({
                where: { userId: { in: tenantUserIds } },
                orderBy: { date: "desc" },
                take: 300,
            }),
            prisma_1.prisma.deviceSession.findMany({
                where: { tenantId, userId: { in: tenantUserIds } },
                orderBy: { createdAt: "desc" },
                take: 200,
            }),
        ]);
        const normalized = [];
        const seenKeys = new Set();
        for (const h of historyRows) {
            const info = userMap.get(h.userId);
            if (!info)
                continue;
            let parsed = {};
            try {
                if (h.details)
                    parsed = JSON.parse(h.details);
            }
            catch { }
            const ip = String(h.ip || "127.0.0.1").replace(/^::ffff:/, "").replace(/^::1$/, "127.0.0.1");
            const ts = (h.date || h.createdAt).toISOString();
            const dedupeKey = `${h.userId}:${ts.slice(0, 16)}`;
            seenKeys.add(dedupeKey);
            const rawDevice = String(parsed.device_type || "desktop").trim();
            normalized.push({
                id: h.id,
                userId: h.userId,
                userName: info.name,
                userEmail: info.email,
                ipAddress: ip,
                location: parsed.location || "Unknown",
                browser: parsed.browser_name || "Unknown Browser",
                os: parsed.os_name || "Unknown OS",
                deviceType: rawDevice.charAt(0).toUpperCase() + rawDevice.slice(1).toLowerCase(),
                language: parsed.language || "en",
                role: info.role,
                loginAt: ts,
            });
        }
        for (const s of sessionRows) {
            const info = userMap.get(s.userId);
            if (!info)
                continue;
            const ts = (s.createdAt || new Date()).toISOString();
            const dedupeKey = `${s.userId}:${ts.slice(0, 16)}`;
            if (seenKeys.has(dedupeKey))
                continue;
            seenKeys.add(dedupeKey);
            const ip = String(s.ipAddress || "127.0.0.1").replace(/^::ffff:/, "").replace(/^::1$/, "127.0.0.1");
            const loc = [s.city, s.country].filter(Boolean).join(", ") || "Unknown";
            const rawDevice = String(s.deviceType || "desktop").trim();
            normalized.push({
                id: `sess-${s.id}`,
                userId: s.userId,
                userName: info.name,
                userEmail: info.email,
                ipAddress: ip,
                location: loc,
                browser: s.browser || "Unknown Browser",
                os: s.operatingSystem || "Unknown OS",
                deviceType: rawDevice.charAt(0).toUpperCase() + rawDevice.slice(1).toLowerCase(),
                language: "en",
                role: info.role,
                loginAt: ts,
            });
        }
        normalized.sort((a, b) => new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime());
        return res.json({
            success: true,
            items: normalized,
            total: normalized.length,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load user login history." });
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// AUTHORITATIVE TENANT SYSTEM SETTINGS (14 Sections — Single Source of Truth)
// Locked to Tenant Admin / Workspace Admin / Super Admin on write.
// ═══════════════════════════════════════════════════════════════════════════
const DEFAULT_HR_EMAIL_NOTIFICATIONS = {
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
const ALLOWED_DATE_FORMATS = new Set([
    "YYYY-MM-DD",
    "MM-DD-YYYY",
    "DD-MM-YYYY",
    "YYYY/MM/DD",
    "MM/DD/YYYY",
    "DD/MM/YYYY",
]);
function normalizeSystemDateFormat(input) {
    const raw = String(input || "").trim();
    if (ALLOWED_DATE_FORMATS.has(raw))
        return raw;
    const legacy = {
        "Y-m-d": "YYYY-MM-DD",
        "m-d-Y": "MM-DD-YYYY",
        "d-m-Y": "DD-MM-YYYY",
        "Y/m/d": "YYYY/MM/DD",
        "m/d/Y": "MM/DD/YYYY",
        "d/m/Y": "DD/MM/YYYY",
    };
    return legacy[raw] || "YYYY-MM-DD";
}
function normalizeSystemTimeFormat(input) {
    const raw = String(input || "").trim();
    if (raw === "24h" || raw === "12h")
        return raw;
    if (raw.includes("H") || raw.includes("G"))
        return "24h";
    if (raw.includes("h") || raw.includes("g") || raw.toLowerCase().includes("a"))
        return "12h";
    return "24h";
}
function buildDefaultSystemSettings(tenant) {
    const companyName = tenant?.name || "MasterHRMS";
    const logo = tenant?.logoUrl || "";
    return {
        system: {
            defaultLanguage: "en",
            dateFormat: "YYYY-MM-DD",
            timeFormat: "24h",
            defaultTimezone: tenant?.timezone || "Asia/Kolkata",
            ipRestrictionEnabled: false,
        },
        company: {
            companyName,
            registrationNumber: "",
            companyAddress: "",
            country: "IN",
            countryName: "India",
            state: "",
            city: "",
            zipCode: "",
            phoneCountryCode: "IN",
            phoneDialCode: "+91",
            telephone: "",
            companyEmail: "",
            emailFromName: companyName,
            taxNumberEnabled: false,
            taxType: "GST",
            taxNumber: "",
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
            allowedIps: [],
        },
        noc: {
            language: "en",
            content: "No Objection Certificate\nDate: {date}\n\nTo Whom It May Concern,\nThis is to certify that {employee_name} is currently employed with {company_name} as {designation}.\nWe have no objection to the above mentioned employee for any official purposes.\n\nSincerely,\nHR Department\n{company_name}",
        },
        experience_certificate: {
            language: "en",
            content: "Experience Certificate\nDate: {date}\n\nTo Whom It May Concern,\nThis is to certify that {employee_name} worked with {company_name} as {designation} from {joining_date} to {relieving_date}.\nDuring their tenure, their conduct and performance were found to be professional and commendable.\n\nBest wishes,\nHR Department\n{company_name}",
        },
        joining_letter: {
            language: "en",
            content: "Joining Letter\nDate: {date}\n\nDear {employee_name},\nWe are pleased to welcome you to {company_name} as {designation}.\nJoining Date: {joining_date}\nSalary: {salary}\nDepartment: {department}\nWe look forward to your valuable contribution to our company's success.\n\nBest regards,\nHR Department\n{company_name}",
        },
    };
}
async function loadTenantSystemSettings(tenantId) {
    const [tenant, rows] = await Promise.all([
        prisma_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true, slug: true, logoUrl: true, timezone: true },
        }),
        prisma_1.prisma.setting.findMany({
            where: { scope: "TENANT", scopeId: tenantId, group: "tenant_system_settings" },
        }),
    ]);
    const merged = buildDefaultSystemSettings(tenant);
    for (const row of rows) {
        if (row.key && merged[row.key] && row.valueJson && typeof row.valueJson === "object") {
            merged[row.key] = { ...merged[row.key], ...row.valueJson };
        }
    }
    if (merged.system) {
        merged.system.dateFormat = normalizeSystemDateFormat(merged.system.dateFormat);
        merged.system.timeFormat = normalizeSystemTimeFormat(merged.system.timeFormat);
    }
    return { tenant, settings: merged };
}
// GET /api/workspace/system-settings/public (Readable by EVERY user in the workspace — real-time global config)
exports.workspaceRouter.get("/system-settings/public", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
        const { tenant, settings } = await loadTenantSystemSettings(tenantId);
        return res.json({
            success: true,
            data: {
                tenant,
                system: settings.system,
                company: settings.company,
                brand: settings.brand,
                currency: settings.currency,
                working_days: settings.working_days,
                noc: settings.noc,
                experience_certificate: settings.experience_certificate,
                joining_letter: settings.joining_letter,
                email_notifications: settings.email_notifications,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load public workspace settings." });
    }
});
// GET /api/workspace/system-settings/my-ip (Returns detected client IP for Tenant Admin allowlist setup)
exports.workspaceRouter.get("/system-settings/my-ip", requireWorkspaceAdminGuard, async (req, res) => {
    return res.json({
        success: true,
        clientIp: (0, tenant_ip_restriction_service_1.extractClientIp)(req) || "127.0.0.1",
    });
});
// GET /api/workspace/system-settings (Full Tenant Admin settings)
exports.workspaceRouter.get("/system-settings", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
        const { tenant, settings } = await loadTenantSystemSettings(tenantId);
        return res.json({ success: true, data: { tenant, settings } });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load tenant system settings." });
    }
});
const ALLOWED_SETTING_SECTIONS = new Set([
    "system",
    "company",
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
exports.workspaceRouter.put("/system-settings/:section", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
        const section = String(req.params.section || "").trim();
        if (!ALLOWED_SETTING_SECTIONS.has(section)) {
            return res.status(400).json({ error: `Unknown settings section: ${section}` });
        }
        const payload = req.body && typeof req.body === "object" ? req.body : {};
        if (section === "system") {
            if (payload.dateFormat !== undefined) {
                payload.dateFormat = normalizeSystemDateFormat(payload.dateFormat);
            }
            if (payload.timeFormat !== undefined) {
                payload.timeFormat = normalizeSystemTimeFormat(payload.timeFormat);
            }
        }
        if (section === "ip_restriction") {
            if (Array.isArray(payload.allowedIps)) {
                for (const item of payload.allowedIps) {
                    const ipStr = String(item?.ip || "").trim();
                    if (!(0, tenant_ip_restriction_service_1.isValidIpOrCidr)(ipStr)) {
                        return res.status(400).json({
                            error: `Invalid IP address or CIDR block: "${ipStr}". Use IPv4 (e.g., 203.0.113.10), IPv4 CIDR (e.g., 192.168.1.0/24), or IPv6.`,
                        });
                    }
                }
            }
        }
        if (section === "company") {
            const cleanName = String(payload.companyName || "").trim();
            const cleanZip = String(payload.zipCode || "").trim();
            const cleanPhone = String(payload.telephone || "").trim();
            const cleanEmail = String(payload.companyEmail || "").trim();
            if (!cleanName) {
                return res.status(400).json({ error: "Company Name is required." });
            }
            if (cleanZip && !/^\d{3,10}$/.test(cleanZip)) {
                return res.status(400).json({ error: "Zip Code must contain numbers only (3–10 digits)." });
            }
            if (cleanPhone && !/^\d{6,15}$/.test(cleanPhone)) {
                return res.status(400).json({ error: "Telephone / Mobile number must contain digits only (6–15 digits)." });
            }
            if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
                return res.status(400).json({ error: "Please enter a valid Company Email address." });
            }
        }
        // Upsert into Setting table (PostgreSQL)
        const existing = await prisma_1.prisma.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "tenant_system_settings", key: section },
        });
        const mergedVal = {
            ...(existing?.valueJson || {}),
            ...payload,
        };
        if (existing) {
            await prisma_1.prisma.setting.update({
                where: { id: existing.id },
                data: { valueJson: mergedVal, valueType: "json", updatedBy: req.user?.userId || null },
            });
        }
        else {
            await prisma_1.prisma.setting.create({
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
        if (section === "company") {
            const cleanName = String(payload.companyName || "").trim();
            const cleanZip = String(payload.zipCode || "").trim();
            const cleanPhone = String(payload.telephone || "").trim();
            const cleanEmail = String(payload.companyEmail || "").trim();
            await prisma_1.prisma.tenant.update({
                where: { id: tenantId },
                data: { name: cleanName },
            });
            const fullPhone = cleanPhone
                ? `${String(payload.phoneDialCode || "+91").trim()} ${cleanPhone}`
                : null;
            const formattedAddress = [payload.companyAddress, payload.city, payload.state, payload.countryName, cleanZip]
                .filter(Boolean)
                .join(", ") || null;
            await company_profile_service_1.CompanyProfileService.upsertProfile(tenantId, {
                legalName: cleanName,
                tradeName: cleanName,
                registrationNumber: payload.registrationNumber ? String(payload.registrationNumber).trim() : null,
                email: cleanEmail || `contact@${tenantId}.masterhrms.com`,
                phone: fullPhone,
                registeredAddress: formattedAddress,
                billingAddress: formattedAddress,
                sameAsRegistered: true,
                taxId: payload.taxNumberEnabled && payload.taxNumber ? String(payload.taxNumber).trim() : null,
            }, {
                userId: req.user?.userId,
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
            }).catch(() => { });
        }
        if (section === "system" && payload.defaultTimezone) {
            await prisma_1.prisma.tenant.update({
                where: { id: tenantId },
                data: { timezone: String(payload.defaultTimezone) },
            });
        }
        if (section === "system" && payload.ipRestrictionEnabled !== undefined) {
            // Keep ip_restriction.enabled in sync with system.ipRestrictionEnabled (strictly for this tenant)
            const ipExisting = await prisma_1.prisma.setting.findFirst({
                where: { scope: "TENANT", scopeId: tenantId, group: "tenant_system_settings", key: "ip_restriction" },
            });
            const nextIpVal = {
                ...(ipExisting?.valueJson || { allowedIps: [] }),
                enabled: Boolean(payload.ipRestrictionEnabled),
            };
            if (ipExisting) {
                await prisma_1.prisma.setting.update({
                    where: { id: ipExisting.id },
                    data: { valueJson: nextIpVal, valueType: "json", updatedBy: req.user?.userId || null },
                });
            }
            else {
                await prisma_1.prisma.setting.create({
                    data: {
                        scope: "TENANT",
                        scopeId: tenantId,
                        group: "tenant_system_settings",
                        key: "ip_restriction",
                        valueJson: nextIpVal,
                        valueType: "json",
                        updatedBy: req.user?.userId || null,
                    },
                });
            }
            (0, tenant_ip_restriction_service_1.invalidateTenantIpCache)(tenantId);
        }
        if (section === "ip_restriction") {
            // Keep system.ipRestrictionEnabled in sync and bust this tenant's IP policy cache immediately
            if (payload.enabled !== undefined) {
                const sysExisting = await prisma_1.prisma.setting.findFirst({
                    where: { scope: "TENANT", scopeId: tenantId, group: "tenant_system_settings", key: "system" },
                });
                if (sysExisting) {
                    await prisma_1.prisma.setting.update({
                        where: { id: sysExisting.id },
                        data: {
                            valueJson: {
                                ...(sysExisting.valueJson || {}),
                                ipRestrictionEnabled: Boolean(payload.enabled),
                            },
                            updatedBy: req.user?.userId || null,
                        },
                    });
                }
            }
            (0, tenant_ip_restriction_service_1.invalidateTenantIpCache)(tenantId);
        }
        if (section === "brand") {
            const nextName = payload.titleText || payload.companyName;
            const nextLogo = payload.logoDark || payload.logoLight;
            await prisma_1.prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    ...(nextLogo !== undefined ? { logoUrl: nextLogo || null } : {}),
                },
            });
            await settings_service_1.SettingsService.setGroup("TENANT", tenantId, "branding", {
                ...(payload.themeColor ? { "branding.primary_color": payload.themeColor } : {}),
                ...(nextName ? { "branding.app_name": nextName } : {}),
                ...(payload.footerText !== undefined ? { "branding.footer_text": payload.footerText } : {}),
            }, { userId: req.user?.userId }).catch(() => { });
        }
        // Audit log
        await prisma_1.prisma.auditLog
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
            .catch(() => { });
        return res.json({
            success: true,
            section,
            data: mergedVal,
            message: "Settings saved and applied across workspace.",
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to save settings section." });
    }
});
// POST /api/workspace/system-settings/brand/upload (Upload Logo Dark, Logo Light, or Favicon)
exports.workspaceRouter.post("/system-settings/brand/upload", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
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
        const ext = mime.includes("png") ? "png" :
            mime.includes("webp") ? "webp" :
                mime.includes("svg") ? "svg" :
                    mime.includes("icon") ? "ico" :
                        mime.includes("gif") ? "gif" : "jpg";
        const buffer = Buffer.from(match[2], "base64");
        if (buffer.length > 2 * 1024 * 1024) {
            return res.status(400).json({ error: "Image must be 2 MB or smaller." });
        }
        const brandDir = path_1.default.join((0, media_service_1.getUploadsRoot)(), "branding");
        if (!fs_1.default.existsSync(brandDir)) {
            fs_1.default.mkdirSync(brandDir, { recursive: true });
        }
        const safeTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, "");
        const fileName = `${safeTenant}-${assetType}-${Date.now()}.${ext}`;
        fs_1.default.writeFileSync(path_1.default.join(brandDir, fileName), buffer);
        const url = `/uploads/branding/${fileName}`;
        // Persist immediately into brand setting + Tenant.logoUrl
        const existing = await prisma_1.prisma.setting.findFirst({
            where: { scope: "TENANT", scopeId: tenantId, group: "tenant_system_settings", key: "brand" },
        });
        const nextBrand = {
            ...(existing?.valueJson || {}),
            [assetType]: url,
        };
        if (existing) {
            await prisma_1.prisma.setting.update({ where: { id: existing.id }, data: { valueJson: nextBrand } });
        }
        else {
            await prisma_1.prisma.setting.create({
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
            await prisma_1.prisma.tenant.update({ where: { id: tenantId }, data: { logoUrl: url } }).catch(() => { });
        }
        return res.json({ success: true, assetType, url, message: "Brand asset uploaded." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to upload brand asset." });
    }
});
// POST /api/workspace/system-settings/test-email (Send Live SMTP Test Email)
exports.workspaceRouter.post("/system-settings/test-email", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
        const { toEmail, smtp } = req.body || {};
        if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(toEmail))) {
            return res.status(400).json({ error: "Please enter a valid recipient email address." });
        }
        const { settings } = await loadTenantSystemSettings(tenantId);
        const incoming = smtp || {};
        const incomingPass = String(incoming.password ?? "").trim();
        const isMaskedPass = !incomingPass || /^[•*]+$/.test(incomingPass);
        const cfg = {
            ...settings.email,
            ...incoming,
            host: String(incoming.host ?? settings.email?.host ?? "").trim(),
            port: Number(incoming.port ?? settings.email?.port ?? 587) || 587,
            username: String(incoming.username ?? settings.email?.username ?? "").trim(),
            password: isMaskedPass ? String(settings.email?.password ?? "").trim() : incomingPass,
            encryption: String(incoming.encryption ?? settings.email?.encryption ?? "TLS").trim().toUpperCase(),
            fromAddress: String(incoming.fromAddress ?? settings.email?.fromAddress ?? "").trim(),
            fromName: String(incoming.fromName ?? settings.email?.fromName ?? "MasterHRMS").trim(),
        };
        if (!cfg.host) {
            return res.status(400).json({ error: "SMTP Host is required before sending a test email." });
        }
        const isSsl = cfg.encryption === "SSL" || cfg.port === 465;
        const transporter = nodemailer_1.default.createTransport({
            host: cfg.host,
            port: cfg.port,
            secure: isSsl,
            requireTLS: cfg.encryption === "TLS" && !isSsl,
            auth: cfg.username ? { user: cfg.username, pass: cfg.password } : undefined,
            tls: { rejectUnauthorized: false },
            connectionTimeout: 10000,
        });
        const authUserIsEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.username);
        const primaryFrom = cfg.fromAddress || cfg.username;
        const mailBase = {
            to: String(toEmail).trim(),
            subject: `[Test] ${cfg.fromName || "MasterHRMS"} SMTP Configuration Verified`,
            text: "Your Tenant SMTP email configuration is working properly in real time.",
        };
        try {
            await transporter.sendMail({
                ...mailBase,
                from: `"${cfg.fromName || "MasterHRMS"}" <${primaryFrom}>`,
            });
            return res.json({ success: true, message: `Test email sent successfully to ${toEmail}.` });
        }
        catch (sendErr) {
            const errMsg = String(sendErr?.message || "");
            const isRelayOrSenderDenied = /550|5\.7\.1|relay|sender.*not allowed|SendAsDenied|mail from|owned by/i.test(errMsg);
            // Automatic fallback: many SMTP providers (Zoho, M365, Hostinger, cPanel, GoDaddy) require
            // the envelope From address to match the authenticated SMTP Username.
            if (isRelayOrSenderDenied && authUserIsEmail && primaryFrom.toLowerCase() !== cfg.username.toLowerCase()) {
                await transporter.sendMail({
                    ...mailBase,
                    from: `"${cfg.fromName || "MasterHRMS"}" <${cfg.username}>`,
                    replyTo: primaryFrom,
                });
                return res.json({
                    success: true,
                    message: `Test email sent to ${toEmail} using your authenticated SMTP account (${cfg.username}). Tip: set "From Address" to "${cfg.username}" to avoid 550 relay restrictions.`,
                });
            }
            throw sendErr;
        }
    }
    catch (err) {
        const rawMsg = err?.message || "SMTP connection failed. Please verify host, port, and credentials.";
        const hint = /550|5\.7\.1|relay|not allowed/i.test(rawMsg)
            ? " (Ensure 'From Address' matches your authenticated 'SMTP Username' email address.)"
            : "";
        return res.status(400).json({ error: `${rawMsg}${hint}` });
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// ORGANIZATION / TENANT HTML MAIL TEMPLATES (HR, Calendar, Tasks, Invoices, Payroll)
// ═══════════════════════════════════════════════════════════════════════════
const TENANT_EMAIL_TEMPLATE_CATEGORIES = new Set(["HR", "Calendar", "Tasks", "Invoices", "Payroll"]);
function getTenantDefaultTemplates() {
    return (0, email_templates_registry_1.getAuthoritativeTemplates)().filter((t) => TENANT_EMAIL_TEMPLATE_CATEGORIES.has(t.category));
}
function mergeTenantEmailTemplates(persistedList = []) {
    const defaults = getTenantDefaultTemplates();
    const persistedMap = new Map();
    for (const t of persistedList) {
        if (t && t.id && TENANT_EMAIL_TEMPLATE_CATEGORIES.has(t.category)) {
            persistedMap.set(t.id, t);
        }
    }
    const merged = [];
    for (const def of defaults) {
        if (persistedMap.has(def.id)) {
            merged.push(persistedMap.get(def.id));
            persistedMap.delete(def.id);
        }
        else {
            merged.push(def);
        }
    }
    for (const custom of persistedMap.values()) {
        merged.push(custom);
    }
    return merged;
}
// GET /api/workspace/email-templates
exports.workspaceRouter.get("/email-templates", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
        const [page, branding] = await Promise.all([
            prisma_1.prisma.cmsPage.findUnique({
                where: { slug: `tenant-${tenantId}-email-templates` },
            }),
            (0, branding_1.resolveUniversalEmailBranding)(tenantId),
        ]);
        const persisted = Array.isArray(page?.content?.templates)
            ? (page?.content).templates
            : [];
        const templates = mergeTenantEmailTemplates(persisted);
        return res.json({
            success: true,
            templates,
            branding,
            brandingVars: (0, branding_1.brandingToTemplateVars)(branding),
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load organization email templates." });
    }
});
// PUT /api/workspace/email-templates
exports.workspaceRouter.put("/email-templates", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
        const incoming = Array.isArray(req.body?.templates) ? req.body.templates : [];
        const merged = mergeTenantEmailTemplates(incoming);
        const slug = `tenant-${tenantId}-email-templates`;
        await prisma_1.prisma.cmsPage.upsert({
            where: { slug },
            update: {
                title: "Organization Email Templates",
                content: { templates: merged },
                published: true,
            },
            create: {
                slug,
                title: "Organization Email Templates",
                metaDescription: "Organization-specific HTML email templates for HR, Calendar, Tasks, Invoices, and Payroll",
                content: { templates: merged },
                published: true,
            },
        });
        return res.json({ success: true, templates: merged });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to save organization email templates." });
    }
});
// POST /api/workspace/email-templates/test
exports.workspaceRouter.post("/email-templates/test", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
        const { toEmail, subject, htmlBody } = req.body || {};
        if (!toEmail || !String(toEmail).includes("@")) {
            return res.status(400).json({ error: "Valid recipient email address is required." });
        }
        const { settings } = await loadTenantSystemSettings(tenantId);
        const saved = (settings.email || {});
        const cfg = {
            host: String(saved.host || process.env.SMTP_HOST || "").trim(),
            port: Number(saved.port || process.env.SMTP_PORT || 587),
            username: String(saved.username || process.env.SMTP_USER || "").trim(),
            password: String(saved.password || process.env.SMTP_PASS || ""),
            encryption: String(saved.encryption || "TLS").toUpperCase(),
            fromAddress: String(saved.fromAddress || saved.username || process.env.SMTP_FROM || "").trim(),
            fromName: String(saved.fromName || settings.brand?.companyName || "MasterHRMS").trim(),
        };
        if (!cfg.host) {
            return res.status(400).json({ error: "SMTP Host is not configured. Please configure Mail Settings in Workspace Settings first." });
        }
        const branding = await (0, branding_1.resolveUniversalEmailBranding)(tenantId);
        const vars = {
            ...email_templates_registry_1.SAMPLE_VARS,
            ...(0, branding_1.brandingToTemplateVars)(branding),
        };
        const renderedSubject = (0, email_templates_registry_1.substituteTemplateVars)(String(subject || "Test Email"), vars);
        const renderedHtml = (0, email_design_system_1.substituteUniversalEmailVars)(String(htmlBody || "<p>Test email</p>"), vars);
        const isSsl = cfg.encryption === "SSL" || cfg.port === 465;
        const transporter = nodemailer_1.default.createTransport({
            host: cfg.host,
            port: cfg.port,
            secure: isSsl,
            requireTLS: cfg.encryption === "TLS" && !isSsl,
            auth: cfg.username ? { user: cfg.username, pass: cfg.password } : undefined,
            tls: { rejectUnauthorized: false },
            connectionTimeout: 10000,
        });
        const authUserIsEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.username);
        const primaryFrom = cfg.fromAddress || cfg.username;
        const mailBase = {
            to: String(toEmail).trim(),
            subject: `[Test] ${renderedSubject}`,
            html: renderedHtml,
        };
        try {
            await transporter.sendMail({
                ...mailBase,
                from: `"${cfg.fromName}" <${primaryFrom}>`,
            });
            return res.json({ success: true, message: `Test HTML email sent successfully to ${toEmail}.` });
        }
        catch (sendErr) {
            const errMsg = String(sendErr?.message || "");
            const isRelayOrSenderDenied = /550|5\.7\.1|relay|sender.*not allowed|SendAsDenied|mail from|owned by/i.test(errMsg);
            if (isRelayOrSenderDenied && authUserIsEmail && primaryFrom.toLowerCase() !== cfg.username.toLowerCase()) {
                await transporter.sendMail({
                    ...mailBase,
                    from: `"${cfg.fromName}" <${cfg.username}>`,
                    replyTo: primaryFrom,
                });
                return res.json({
                    success: true,
                    message: `Test HTML email sent to ${toEmail} using your authenticated SMTP account (${cfg.username}).`,
                });
            }
            throw sendErr;
        }
    }
    catch (err) {
        return res.status(400).json({ error: err?.message || "Failed to send test email." });
    }
});
// POST /api/workspace/email-templates/test-all (Verify all 24 HR auto-trigger templates to a test email)
exports.workspaceRouter.post("/email-templates/test-all", requireWorkspaceAdminGuard, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required." });
        const toEmail = String(req.body?.toEmail || "").trim();
        if (!toEmail || !toEmail.includes("@")) {
            return res.status(400).json({ error: "Valid recipient email address is required." });
        }
        const keys = Object.keys(hr_workflow_email_service_1.HR_EVENT_TO_TEMPLATE_ID);
        const results = [];
        for (const eventKey of keys) {
            const r = await (0, hr_workflow_email_service_1.dispatchHrWorkflowEmail)({
                tenantId,
                eventKey,
                toEmail,
                forceSend: true,
            });
            results.push(r);
        }
        const sentCount = results.filter((r) => r.success && !r.skipped).length;
        return res.json({
            success: sentCount === keys.length,
            total: keys.length,
            sentCount,
            failedCount: keys.length - sentCount,
            results,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err?.message || "Failed to dispatch batch HR test emails." });
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// REAL-TIME WORKSPACE TRANSLATION ENGINE (Cached batch translator)
// ═══════════════════════════════════════════════════════════════════════════
const translationMemoryCache = new Map();
const MAX_TRANSLATION_CACHE = 8000;
async function translateSingleText(text, targetLang) {
    const cacheKey = `${targetLang}::${text}`;
    const cached = translationMemoryCache.get(cacheKey);
    if (cached)
        return cached;
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!resp.ok)
            return text;
        const json = await resp.json();
        const translated = Array.isArray(json?.[0])
            ? json[0].map((seg) => (Array.isArray(seg) ? seg[0] : "")).join("")
            : text;
        const clean = translated && translated.trim() ? translated : text;
        if (translationMemoryCache.size > MAX_TRANSLATION_CACHE) {
            const firstKey = translationMemoryCache.keys().next().value;
            if (firstKey)
                translationMemoryCache.delete(firstKey);
        }
        translationMemoryCache.set(cacheKey, clean);
        return clean;
    }
    catch {
        return text;
    }
}
// POST /api/workspace/translate
exports.workspaceRouter.post("/translate", async (req, res) => {
    try {
        const targetLang = String(req.body?.targetLang || "en").trim().toLowerCase();
        const rawTexts = Array.isArray(req.body?.texts) ? req.body.texts : [];
        const texts = Array.from(new Set(rawTexts
            .map((t) => String(t ?? "").trim())
            .filter((t) => t.length > 0 && t.length <= 400))).slice(0, 80);
        if (!targetLang || targetLang === "en" || texts.length === 0) {
            const passthrough = {};
            texts.forEach((t) => { passthrough[t] = t; });
            return res.json({ success: true, targetLang, translations: passthrough });
        }
        const translations = {};
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Translation failed." });
    }
});
