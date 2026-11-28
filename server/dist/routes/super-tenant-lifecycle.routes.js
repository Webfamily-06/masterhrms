"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.superTenantLifecycleRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const super_audit_1 = require("../lib/super-audit");
const socket_1 = require("../socket");
exports.superTenantLifecycleRouter = (0, express_1.Router)();
exports.superTenantLifecycleRouter.use(auth_1.requireAuth, auth_1.requireSuperAdmin, (0, super_audit_1.superAuditMiddleware)("super-lifecycle"));
const offboardBodySchema = zod_1.z.object({
    graceDays: zod_1.z.coerce.number().int().min(7).max(90).optional().default(30),
    reason: zod_1.z.string().trim().max(500).optional(),
});
function maskLast4(value) {
    if (!value)
        return null;
    const trimmed = String(value).trim();
    if (!trimmed)
        return null;
    if (trimmed.length <= 4)
        return "****";
    return `${"*".repeat(Math.min(12, trimmed.length - 4))}${trimmed.slice(-4)}`;
}
function safeJsonStringify(data) {
    return JSON.stringify(data, (_key, value) => (typeof value === "bigint" ? value.toString() : value), 2);
}
// GET /tenants/:id/export — GDPR / Offboarding tenant JSON archive download
exports.superTenantLifecycleRouter.get("/tenants/:id/export", async (req, res) => {
    try {
        const { id } = req.params;
        const tenant = await prisma_1.rawPrisma.tenant.findUnique({
            where: { id },
            include: {
                subscription: {
                    include: {
                        plan: {
                            select: {
                                id: true,
                                name: true,
                                planType: true,
                                pricingModel: true,
                                currency: true,
                            },
                        },
                    },
                },
            },
        });
        if (!tenant) {
            return res.status(404).json({ error: "Tenant workspace not found." });
        }
        const [branches, departments, designations, employees, attendanceTotal, attendanceByStatus, leaveRequests, payrollRuns, storedDocuments, companyDocuments, tenantAddons,] = await Promise.all([
            prisma_1.rawPrisma.branch.findMany({
                where: { tenantId: id },
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    address: true,
                    phone: true,
                    email: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            prisma_1.rawPrisma.department.findMany({
                where: { tenantId: id },
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    branchId: true,
                    name: true,
                    description: true,
                    status: true,
                    createdAt: true,
                },
            }),
            prisma_1.rawPrisma.designation.findMany({
                where: { tenantId: id },
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    departmentId: true,
                    name: true,
                    description: true,
                    status: true,
                    createdAt: true,
                },
            }),
            prisma_1.rawPrisma.employee.findMany({
                where: { tenantId: id },
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    employeeCode: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    position: true,
                    employmentType: true,
                    employmentCategory: true,
                    status: true,
                    branchId: true,
                    departmentId: true,
                    designationId: true,
                    managerId: true,
                    salary: true,
                    joinedAt: true,
                    dateOfBirth: true,
                    gender: true,
                    taxRegime: true,
                    state: true,
                    city: true,
                    bankName: true,
                    bankAccount: true,
                    bankIfsc: true,
                    bankBranch: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            prisma_1.rawPrisma.attendance.count({ where: { tenantId: id } }),
            prisma_1.rawPrisma.attendance.groupBy({
                by: ["status"],
                where: { tenantId: id },
                _count: { _all: true },
            }),
            prisma_1.rawPrisma.leaveRequest.findMany({
                where: { tenantId: id },
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    employeeId: true,
                    leaveTypeId: true,
                    approverId: true,
                    startDate: true,
                    endDate: true,
                    days: true,
                    status: true,
                    reason: true,
                    halfDay: true,
                    approvedAt: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            prisma_1.rawPrisma.payrollRun.findMany({
                where: { tenantId: id },
                orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
                select: {
                    id: true,
                    periodMonth: true,
                    periodYear: true,
                    employeeCount: true,
                    totalAmount: true,
                    totalNet: true,
                    totalDeductions: true,
                    status: true,
                    approvalStatus: true,
                    approvedBy: true,
                    approvedAt: true,
                    isPublished: true,
                    publishedAt: true,
                    processedAt: true,
                    createdAt: true,
                },
            }),
            prisma_1.rawPrisma.storedDocument.findMany({
                where: { tenantId: id },
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    originalName: true,
                    mimeType: true,
                    sizeBytes: true,
                    isEncrypted: true,
                    entityType: true,
                    entityId: true,
                    createdAt: true,
                },
            }),
            prisma_1.rawPrisma.companyDocument.findMany({
                where: { tenantId: id },
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    employeeId: true,
                    documentCode: true,
                    title: true,
                    category: true,
                    fileName: true,
                    fileSize: true,
                    fileType: true,
                    status: true,
                    version: true,
                    effectiveDate: true,
                    expiryDate: true,
                    createdAt: true,
                },
            }),
            prisma_1.rawPrisma.tenantAddon.findMany({
                where: { tenantId: id },
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    addonSlug: true,
                    status: true,
                    plan: true,
                    trialEndsAt: true,
                    renewsAt: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
        ]);
        const sanitizedEmployees = employees.map((emp) => ({
            ...emp,
            salary: emp.salary !== null && emp.salary !== undefined ? Number(emp.salary) : null,
            bankAccount: maskLast4(emp.bankAccount),
        }));
        const attendanceCountsByStatus = {};
        for (const row of attendanceByStatus) {
            attendanceCountsByStatus[String(row.status)] = row._count._all;
        }
        const exportedAt = new Date().toISOString();
        const exportPayload = {
            exportMetadata: {
                schemaVersion: "1.0",
                exportedAt,
                exportedBy: req.user?.email || req.user?.userId || "super_admin",
                tenantId: tenant.id,
                tenantSlug: tenant.slug,
                redactionPolicy: "Password hashes excluded; bankAccount masked to last 4 characters.",
            },
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                logoUrl: tenant.logoUrl,
                timezone: tenant.timezone,
                currency: tenant.currency,
                industry: tenant.industry,
                companySize: tenant.companySize,
                phone: tenant.phone,
                address: tenant.address,
                isOnboarded: tenant.isOnboarded,
                createdAt: tenant.createdAt,
            },
            subscription: tenant.subscription
                ? {
                    id: tenant.subscription.id,
                    planId: tenant.subscription.planId,
                    planName: tenant.subscription.plan?.name || null,
                    status: tenant.subscription.status,
                    billingCycle: tenant.subscription.billingCycle,
                    maxEmployees: tenant.subscription.maxEmployees,
                    maxUsers: tenant.subscription.maxUsers,
                    storageLimitGb: tenant.subscription.storageLimitGb,
                    expiresAt: tenant.subscription.expiresAt,
                    trialEndsAt: tenant.subscription.trialEndsAt,
                    currentPeriodStart: tenant.subscription.currentPeriodStart,
                    currentPeriodEnd: tenant.subscription.currentPeriodEnd,
                    createdAt: tenant.subscription.createdAt,
                    updatedAt: tenant.subscription.updatedAt,
                }
                : null,
            organization: {
                branches,
                departments,
                designations,
            },
            employees: sanitizedEmployees,
            attendanceSummary: {
                totalRecords: attendanceTotal,
                byStatus: attendanceCountsByStatus,
            },
            leaveRequests: leaveRequests.map((lr) => ({
                ...lr,
                days: Number(lr.days),
            })),
            payrollRunsSummary: payrollRuns.map((pr) => ({
                ...pr,
                totalAmount: pr.totalAmount !== null ? Number(pr.totalAmount) : null,
                totalNet: pr.totalNet !== null ? Number(pr.totalNet) : null,
                totalDeductions: pr.totalDeductions !== null ? Number(pr.totalDeductions) : null,
            })),
            documentsMetadata: {
                storedDocumentsCount: storedDocuments.length,
                companyDocumentsCount: companyDocuments.length,
                storedDocuments,
                companyDocuments,
            },
            tenantAddons,
        };
        void (0, super_audit_1.writeSuperAuditLog)(req, {
            action: "TENANT_GDPR_EXPORT",
            entityType: "Tenant",
            entityId: tenant.id,
            tenantId: tenant.id,
            after: {
                exportedAt,
                employeesCount: sanitizedEmployees.length,
                branchesCount: branches.length,
                departmentsCount: departments.length,
                attendanceRecordsCount: attendanceTotal,
                leaveRequestsCount: leaveRequests.length,
                payrollRunsCount: payrollRuns.length,
                documentsCount: storedDocuments.length + companyDocuments.length,
                addonsCount: tenantAddons.length,
            },
        });
        const safeSlug = tenant.slug.replace(/[^a-z0-9-_]/gi, "_");
        const filename = `tenant-export-${safeSlug}-${exportedAt.slice(0, 10)}.json`;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).send(safeJsonStringify(exportPayload));
    }
    catch (err) {
        console.error("[super-lifecycle/export] Error:", err);
        return res.status(500).json({ error: err?.message || "Failed to export tenant data." });
    }
});
// POST /tenants/:id/offboard — Initiate graceful tenant offboarding
exports.superTenantLifecycleRouter.post("/tenants/:id/offboard", async (req, res) => {
    try {
        const { id } = req.params;
        const parsed = offboardBodySchema.safeParse(req.body || {});
        if (!parsed.success) {
            return res.status(400).json({
                error: parsed.error.errors[0]?.message || "Invalid offboarding parameters.",
            });
        }
        const { graceDays, reason } = parsed.data;
        const tenant = await prisma_1.rawPrisma.tenant.findUnique({
            where: { id },
            include: { subscription: true },
        });
        if (!tenant) {
            return res.status(404).json({ error: "Tenant workspace not found." });
        }
        const previousSubscriptionStatus = tenant.subscription?.status || null;
        const now = new Date();
        const purgeEligibleAt = new Date(now.getTime() + graceDays * 24 * 60 * 60 * 1000);
        // Suspend tenant subscription
        if (tenant.subscription) {
            await prisma_1.rawPrisma.tenantSubscription.update({
                where: { id: tenant.subscription.id },
                data: {
                    status: "suspended",
                    cancelledAt: now,
                },
            });
        }
        else {
            await prisma_1.rawPrisma.tenantSubscription.create({
                data: {
                    tenantId: id,
                    status: "suspended",
                    billingCycle: "monthly",
                    cancelledAt: now,
                },
            });
        }
        // Immediately disconnect all active tenant sockets
        try {
            (0, socket_1.getIO)()?.in(`tenant:${id}`).disconnectSockets(true);
        }
        catch (sockErr) {
            console.warn("[super-lifecycle/offboard] Socket disconnect warning:", sockErr?.message);
        }
        const record = {
            tenantId: tenant.id,
            tenantName: tenant.name,
            tenantSlug: tenant.slug,
            status: "pending",
            reason: reason || "Scheduled tenant offboarding initiated by Super Admin",
            graceDays,
            initiatedAt: now.toISOString(),
            purgeEligibleAt: purgeEligibleAt.toISOString(),
            initiatedBy: req.user?.email || req.user?.userId || "super_admin",
            previousSubscriptionStatus,
            cancelledAt: null,
            cancelledBy: null,
        };
        const existingSetting = await prisma_1.rawPrisma.setting.findFirst({
            where: {
                scope: "PLATFORM",
                scopeId: id,
                key: "tenant_offboarding",
            },
        });
        if (existingSetting) {
            await prisma_1.rawPrisma.setting.update({
                where: { id: existingSetting.id },
                data: {
                    valueJson: record,
                    updatedBy: req.user?.userId || null,
                    version: existingSetting.version + 1,
                },
            });
        }
        else {
            await prisma_1.rawPrisma.setting.create({
                data: {
                    scope: "PLATFORM",
                    scopeId: id,
                    group: "lifecycle",
                    key: "tenant_offboarding",
                    valueType: "json",
                    valueJson: record,
                    updatedBy: req.user?.userId || null,
                },
            });
        }
        res.locals.superAudit = {
            action: "TENANT_OFFBOARDING_INITIATED",
            entityType: "TenantOffboarding",
            entityId: tenant.id,
            tenantId: tenant.id,
            before: { subscriptionStatus: previousSubscriptionStatus },
            after: record,
        };
        return res.status(200).json({
            success: true,
            message: `Offboarding scheduled for "${tenant.name}" with a ${graceDays}-day grace period. Active sessions have been disconnected.`,
            offboarding: {
                ...record,
                daysRemaining: graceDays,
            },
        });
    }
    catch (err) {
        console.error("[super-lifecycle/offboard] Error:", err);
        return res.status(500).json({ error: err?.message || "Failed to initiate tenant offboarding." });
    }
});
// POST /tenants/:id/offboard/cancel — Cancel pending offboarding & reactivate subscription
exports.superTenantLifecycleRouter.post("/tenants/:id/offboard/cancel", async (req, res) => {
    try {
        const { id } = req.params;
        const tenant = await prisma_1.rawPrisma.tenant.findUnique({
            where: { id },
            include: { subscription: true },
        });
        if (!tenant) {
            return res.status(404).json({ error: "Tenant workspace not found." });
        }
        const existingSetting = await prisma_1.rawPrisma.setting.findFirst({
            where: {
                scope: "PLATFORM",
                scopeId: id,
                key: "tenant_offboarding",
            },
        });
        const currentValue = (existingSetting?.valueJson ?? null);
        if (!existingSetting || !currentValue || currentValue.status !== "pending") {
            return res.status(400).json({
                error: "No pending offboarding schedule found for this tenant.",
            });
        }
        // Reactivate subscription
        if (tenant.subscription) {
            await prisma_1.rawPrisma.tenantSubscription.update({
                where: { id: tenant.subscription.id },
                data: {
                    status: "active",
                    cancelledAt: null,
                },
            });
        }
        else {
            await prisma_1.rawPrisma.tenantSubscription.create({
                data: {
                    tenantId: id,
                    status: "active",
                    billingCycle: "monthly",
                },
            });
        }
        const now = new Date().toISOString();
        const updatedRecord = {
            ...currentValue,
            status: "cancelled",
            cancelledAt: now,
            cancelledBy: req.user?.email || req.user?.userId || "super_admin",
        };
        await prisma_1.rawPrisma.setting.update({
            where: { id: existingSetting.id },
            data: {
                valueJson: updatedRecord,
                updatedBy: req.user?.userId || null,
                version: existingSetting.version + 1,
            },
        });
        res.locals.superAudit = {
            action: "TENANT_OFFBOARDING_CANCELLED",
            entityType: "TenantOffboarding",
            entityId: tenant.id,
            tenantId: tenant.id,
            before: currentValue,
            after: updatedRecord,
        };
        return res.status(200).json({
            success: true,
            message: `Offboarding cancelled for "${tenant.name}". Workspace subscription has been reactivated.`,
            offboarding: updatedRecord,
        });
    }
    catch (err) {
        console.error("[super-lifecycle/offboard/cancel] Error:", err);
        return res.status(500).json({ error: err?.message || "Failed to cancel offboarding." });
    }
});
// GET /offboarding — List all pending offboarding tenants with days remaining
exports.superTenantLifecycleRouter.get("/offboarding", async (req, res) => {
    try {
        const includeCancelled = req.query.includeCancelled === "true";
        const settings = await prisma_1.rawPrisma.setting.findMany({
            where: {
                scope: "PLATFORM",
                key: "tenant_offboarding",
            },
            orderBy: { updatedAt: "desc" },
        });
        const rawRecords = settings
            .map((s) => ({
            settingId: s.id,
            scopeId: s.scopeId,
            record: s.valueJson,
        }))
            .filter((entry) => {
            if (!entry.record || !entry.record.tenantId)
                return false;
            if (includeCancelled)
                return true;
            return entry.record.status === "pending";
        });
        const tenantIds = rawRecords.map((r) => r.record.tenantId).filter(Boolean);
        const liveTenants = tenantIds.length
            ? await prisma_1.rawPrisma.tenant.findMany({
                where: { id: { in: tenantIds } },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    subscription: {
                        select: { status: true, expiresAt: true },
                    },
                },
            })
            : [];
        const tenantMap = new Map(liveTenants.map((t) => [t.id, t]));
        const nowMs = Date.now();
        const items = rawRecords.map(({ record }) => {
            const liveTenant = tenantMap.get(record.tenantId);
            const purgeMs = new Date(record.purgeEligibleAt).getTime();
            const diffMs = purgeMs - nowMs;
            const daysRemaining = isNaN(purgeMs)
                ? 0
                : Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            return {
                ...record,
                tenantName: liveTenant?.name || record.tenantName,
                tenantSlug: liveTenant?.slug || record.tenantSlug,
                tenantExists: Boolean(liveTenant),
                subscriptionStatus: liveTenant?.subscription?.status || null,
                daysRemaining,
                isPurgeEligible: record.status === "pending" && diffMs <= 0,
            };
        });
        return res.json({
            success: true,
            count: items.length,
            items,
        });
    }
    catch (err) {
        console.error("[super-lifecycle/offboarding] Error:", err);
        return res.status(500).json({ error: err?.message || "Failed to fetch offboarding queue." });
    }
});
