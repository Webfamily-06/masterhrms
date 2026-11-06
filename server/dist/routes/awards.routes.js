"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.awardsRouter = void 0;
exports.isHRAwardAuthorized = isHRAwardAuthorized;
const fs_1 = __importDefault(require("fs"));
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const pagination_1 = require("../lib/pagination");
const socket_1 = require("../socket");
const audit_service_1 = require("../services/audit.service");
const award_nomination_service_1 = require("../services/award-nomination.service");
const award_certificate_service_1 = require("../services/award-certificate.service");
exports.awardsRouter = (0, express_1.Router)();
// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC UNPROTECTED VERIFICATION ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
exports.awardsRouter.get("/certificates/verify/:verificationCode", async (req, res) => {
    try {
        const code = req.params.verificationCode;
        const result = await award_certificate_service_1.AwardCertificateService.verifyPublicly(code);
        if (!result.valid && !result.status) {
            return res.status(404).json({ success: false, ...result });
        }
        return res.json({ success: true, data: result });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Certificate verification failed." });
    }
});
exports.awardsRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
async function resolveCallerEmployee(userId, tenantId, email) {
    return await prisma_1.prisma.employee.findFirst({
        where: {
            tenantId,
            OR: [
                { userId },
                ...(email ? [{ email }] : []),
            ],
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            managerId: true,
            status: true,
            department: { select: { id: true, name: true } },
        },
    });
}
function isHRAwardAuthorized(req) {
    const user = req.user;
    if (!user)
        return false;
    const roles = user.roles || [];
    const permissions = user.permissions || [];
    if (permissions.includes("*") ||
        permissions.includes("hrm.awards.manage") ||
        permissions.includes("hrm.awards.view") ||
        permissions.includes("hrm.employees.view") ||
        permissions.includes("hr_admin")) {
        return true;
    }
    const authorizedRoles = [
        "super_admin",
        "tenant_admin",
        "hr_admin",
        "hr_manager",
        "admin",
        "manager",
        "Workspace Admin",
    ];
    return roles.some((r) => authorizedRoles.includes(r));
}
const DEFAULT_AWARD_TYPES = [
    { name: "Employee of the Month", icon: "Trophy", description: "Recognizing outstanding all-around contribution" },
    { name: "Star Performer", icon: "Star", description: "Consistently exceeding KPI targets and expectations" },
    { name: "Leadership Excellence", icon: "Award", description: "Exemplary mentorship and positive team influence" },
    { name: "Innovation Champion", icon: "Zap", description: "Breakthrough ideas or operational efficiency improvements" },
    { name: "Customer Delight", icon: "Heart", description: "Exceptional client satisfaction and service feedback" },
    { name: "Best Team Player", icon: "Users", description: "Exceptional collaboration and cross-functional support" },
];
async function ensureDefaultAwardTypes(tenantId) {
    const count = await prisma_1.prisma.awardType.count({ where: { tenantId } });
    if (count === 0) {
        await prisma_1.prisma.$transaction(DEFAULT_AWARD_TYPES.map((t) => prisma_1.prisma.awardType.create({
            data: {
                tenantId,
                name: t.name,
                icon: t.icon,
                description: t.description,
            },
        })));
    }
}
// GET /api/awards/types (List or auto-seed award types)
exports.awardsRouter.get("/types", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        await ensureDefaultAwardTypes(tenantId);
        const types = await prisma_1.prisma.awardType.findMany({
            where: { tenantId },
            orderBy: { name: "asc" },
            include: {
                _count: { select: { awards: true } },
                workflow: { select: { id: true, name: true, entityType: true, isActive: true } },
            },
        });
        return res.json(types);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch award types." });
    }
});
// GET /api/awards/workflows (List active workflows available for awards)
exports.awardsRouter.get("/workflows", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const workflows = await prisma_1.prisma.workflowDefinition.findMany({
            where: {
                tenantId,
                isActive: true,
            },
            include: {
                steps: { orderBy: { stepOrder: "asc" } },
            },
            orderBy: { name: "asc" },
        });
        return res.json({ success: true, data: workflows });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch workflows." });
    }
});
// POST /api/awards/types (Create custom award type)
exports.awardsRouter.post("/types", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isHRAwardAuthorized(req)) {
            return res.status(403).json({
                error: "Access denied. Only authorized HR administrators or managers can create award types.",
                code: "HR_ROLE_REQUIRED",
            });
        }
        const { name, icon, description, imageUrl, imageStoragePath, requiresApproval, allowPeerNomination, allowSelfNomination, workflowId, status, } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Award type name is required." });
        }
        const type = await prisma_1.prisma.awardType.create({
            data: {
                tenantId,
                name: name.trim(),
                icon: icon || "Trophy",
                description: description?.trim() || null,
                imageUrl: imageUrl || null,
                imageStoragePath: imageStoragePath || null,
                requiresApproval: requiresApproval !== undefined ? Boolean(requiresApproval) : true,
                allowPeerNomination: allowPeerNomination !== undefined ? Boolean(allowPeerNomination) : true,
                allowSelfNomination: allowSelfNomination !== undefined ? Boolean(allowSelfNomination) : false,
                workflowId: workflowId || null,
                status: status || "active",
            },
            include: {
                workflow: { select: { id: true, name: true, entityType: true, isActive: true } },
            },
        });
        return res.status(201).json(type);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create award type." });
    }
});
// PUT /api/awards/types/:id (Update custom award type)
exports.awardsRouter.put("/types/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isHRAwardAuthorized(req)) {
            return res.status(403).json({
                error: "Access denied. Only authorized HR administrators or managers can update award types.",
                code: "HR_ROLE_REQUIRED",
            });
        }
        const { id } = req.params;
        const existing = await prisma_1.prisma.awardType.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: "Award type not found." });
        }
        const { name, icon, description, imageUrl, imageStoragePath, requiresApproval, allowPeerNomination, allowSelfNomination, workflowId, status, } = req.body;
        const updated = await prisma_1.prisma.awardType.update({
            where: { id },
            data: {
                ...(name !== undefined ? { name: name.trim() } : {}),
                ...(icon !== undefined ? { icon } : {}),
                ...(description !== undefined ? { description: description?.trim() || null } : {}),
                ...(imageUrl !== undefined ? { imageUrl } : {}),
                ...(imageStoragePath !== undefined ? { imageStoragePath } : {}),
                ...(requiresApproval !== undefined ? { requiresApproval: Boolean(requiresApproval) } : {}),
                ...(allowPeerNomination !== undefined ? { allowPeerNomination: Boolean(allowPeerNomination) } : {}),
                ...(allowSelfNomination !== undefined ? { allowSelfNomination: Boolean(allowSelfNomination) } : {}),
                ...(workflowId !== undefined ? { workflowId: workflowId || null } : {}),
                ...(status !== undefined ? { status } : {}),
            },
            include: {
                workflow: { select: { id: true, name: true, entityType: true, isActive: true } },
            },
        });
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update award type." });
    }
});
// GET /api/awards/my (Employee self-service personal awards)
exports.awardsRouter.get("/my", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const userId = req.user?.userId;
        const employee = await prisma_1.prisma.employee.findFirst({
            where: {
                tenantId,
                OR: [
                    { userId },
                    ...(req.user?.email ? [{ email: req.user.email }] : []),
                ],
            },
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
        });
        if (!employee) {
            return res.status(403).json({
                error: "No employee profile is linked to this account in the current workspace.",
                code: "EMPLOYEE_PROFILE_REQUIRED",
            });
        }
        const awards = await prisma_1.prisma.award.findMany({
            where: { tenantId, employeeId: employee.id },
            include: {
                awardType: true,
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: { select: { id: true, name: true } },
                    },
                },
                certificates: {
                    where: { status: "ACTIVE" },
                    take: 1,
                },
            },
            orderBy: { awardDate: "desc" },
        });
        return res.json({ success: true, data: awards });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch your awards." });
    }
});
// GET /api/awards (List awards with pagination & filters)
exports.awardsRouter.get("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isHRAwardAuthorized(req)) {
            return res.status(403).json({
                error: "Access denied. HR Administrator or Manager privileges required to view tenant-wide awards.",
                code: "HR_ROLE_REQUIRED",
            });
        }
        const { employeeId, awardTypeId, search, month } = req.query;
        const where = { tenantId };
        if (employeeId && employeeId !== "all") {
            where.employeeId = String(employeeId);
        }
        if (awardTypeId && awardTypeId !== "all") {
            where.awardTypeId = String(awardTypeId);
        }
        if (search) {
            where.OR = [
                { giftItem: { contains: String(search) } },
                { certificateNo: { contains: String(search) } },
                { description: { contains: String(search) } },
                { employee: { firstName: { contains: String(search) } } },
                { employee: { lastName: { contains: String(search) } } },
                { employee: { employeeCode: { contains: String(search) } } },
            ];
        }
        const pagination = (0, pagination_1.parsePaginationParams)(req, "awardDate", 20);
        const [total, awards, totalGiftValue, awardTypeCounts] = await Promise.all([
            prisma_1.prisma.award.count({ where }),
            prisma_1.prisma.award.findMany({
                where,
                include: {
                    employee: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            employeeCode: true,
                            department: { select: { id: true, name: true } },
                        },
                    },
                    awardType: true,
                    certificates: {
                        where: { status: "ACTIVE" },
                        take: 1,
                    },
                },
                orderBy: { awardDate: "desc" },
                ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
            }),
            prisma_1.prisma.award.aggregate({
                where: { tenantId },
                _sum: { giftAmount: true },
            }),
            prisma_1.prisma.award.groupBy({
                by: ["awardTypeId"],
                where: { tenantId },
                _count: { id: true },
            }),
        ]);
        return res.json({
            ...(0, pagination_1.formatPaginatedResponse)(awards, total, pagination),
            stats: {
                totalAwards: total,
                totalGiftValue: Number(totalGiftValue._sum.giftAmount || 0),
                distribution: awardTypeCounts,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch awards." });
    }
});
// POST /api/awards (Issue new award)
exports.awardsRouter.post("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isHRAwardAuthorized(req)) {
            return res.status(403).json({
                error: "Access denied. Only authorized HR administrators or managers can issue awards.",
                code: "HR_ROLE_REQUIRED",
            });
        }
        const { employeeId, awardTypeId, awardDate, giftItem, giftAmount, description, certificateUrl, presentedBy, } = req.body;
        if (!employeeId) {
            return res.status(400).json({ error: "Employee is required." });
        }
        // 1. Validate employee exists in current tenant
        const employee = await prisma_1.prisma.employee.findFirst({
            where: { id: employeeId, tenantId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                department: { select: { id: true, name: true } },
            },
        });
        if (!employee) {
            return res.status(404).json({ error: "Employee not found in the current tenant organization." });
        }
        // 2. Validate award type if specified
        let awardTypeRecord = null;
        if (awardTypeId) {
            awardTypeRecord = await prisma_1.prisma.awardType.findFirst({
                where: { id: awardTypeId, tenantId },
            });
            if (!awardTypeRecord) {
                return res.status(404).json({ error: "Award Type not found in the current tenant organization." });
            }
            if (awardTypeRecord.status === "inactive") {
                return res.status(400).json({
                    error: "Cannot issue award: This Award Type is inactive/deactivated.",
                    code: "AWARD_TYPE_INACTIVE",
                });
            }
            if (awardTypeRecord.requiresApproval) {
                const isSuperOrAdmin = (req.user?.permissions || []).includes("*") ||
                    ["super_admin", "tenant_admin", "hr_admin"].some((r) => (req.user?.roles || []).includes(r));
                if (!isSuperOrAdmin) {
                    return res.status(400).json({
                        error: "This Award Type requires an employee nomination and approval workflow. Please submit a nomination instead of direct granting.",
                        code: "NOMINATION_REQUIRED",
                    });
                }
            }
        }
        // 3. Validate award date
        const parsedAwardDate = awardDate ? new Date(awardDate) : new Date();
        if (isNaN(parsedAwardDate.getTime())) {
            return res.status(400).json({ error: "Invalid award date provided." });
        }
        const certSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
        const certificateNo = `AWD-${parsedAwardDate.getFullYear()}-${certSuffix}`;
        const defaultTitle = awardTypeRecord?.name || "Recognition Trophy";
        const award = await prisma_1.prisma.award.create({
            data: {
                tenantId,
                employeeId,
                awardTypeId: awardTypeId || null,
                awardDate: parsedAwardDate,
                giftItem: giftItem?.trim() || defaultTitle,
                giftAmount: giftAmount ? Number(giftAmount) : 0,
                description: description?.trim() || null,
                certificateUrl: certificateUrl || null,
                certificateNo,
                presentedBy: presentedBy?.trim() || req.user?.name || "Management",
                status: "awarded",
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: { select: { id: true, name: true } },
                    },
                },
                awardType: true,
            },
        });
        // 4. Audit logging
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId,
            action: "EMPLOYEE_AWARD_CONFERRED",
            entityType: "Award",
            entityId: award.id,
            newState: award,
        }).catch((err) => console.warn("Could not log mutation:", err.message));
        (0, socket_1.broadcastToTenant)(tenantId, "award:created", award);
        (0, socket_1.broadcastToTenant)(tenantId, "notification:new", {
            title: "Award Presented",
            description: `${award.employee.firstName} ${award.employee.lastName} received ${award.awardType?.name || award.giftItem || "an Award"}!`,
            type: "award",
            timestamp: new Date().toISOString(),
        });
        return res.status(201).json({ success: true, data: award });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to issue award." });
    }
});
// PUT /api/awards/:id (Update award)
exports.awardsRouter.put("/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isHRAwardAuthorized(req)) {
            return res.status(403).json({
                error: "Access denied. Only authorized HR administrators or managers can update awards.",
                code: "HR_ROLE_REQUIRED",
            });
        }
        const { id } = req.params;
        const { awardTypeId, awardDate, giftItem, giftAmount, description, certificateUrl, presentedBy, status, } = req.body;
        const existing = await prisma_1.prisma.award.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Award record not found." });
        const updated = await prisma_1.prisma.award.update({
            where: { id },
            data: {
                awardTypeId: awardTypeId !== undefined ? awardTypeId : existing.awardTypeId,
                awardDate: awardDate ? new Date(awardDate) : existing.awardDate,
                giftItem: giftItem !== undefined ? giftItem : existing.giftItem,
                giftAmount: giftAmount !== undefined ? Number(giftAmount) : existing.giftAmount,
                description: description !== undefined ? description : existing.description,
                certificateUrl: certificateUrl !== undefined ? certificateUrl : existing.certificateUrl,
                presentedBy: presentedBy !== undefined ? presentedBy : existing.presentedBy,
                status: status || existing.status,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        department: { select: { id: true, name: true } },
                    },
                },
                awardType: true,
            },
        });
        return res.json({ success: true, data: updated });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update award." });
    }
});
// DELETE /api/awards/:id (Delete award)
exports.awardsRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isHRAwardAuthorized(req)) {
            return res.status(403).json({
                error: "Access denied. Only authorized HR administrators or managers can revoke awards.",
                code: "HR_ROLE_REQUIRED",
            });
        }
        const { id } = req.params;
        const existing = await prisma_1.prisma.award.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Award not found." });
        await prisma_1.prisma.award.delete({ where: { id } });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId,
            action: "EMPLOYEE_AWARD_REVOKED",
            entityType: "Award",
            entityId: id,
            oldState: existing,
        }).catch((err) => console.warn("Could not log mutation:", err.message));
        (0, socket_1.broadcastToTenant)(tenantId, "award:deleted", { id });
        return res.json({ success: true, message: "Award deleted successfully." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete award." });
    }
});
// =========================================================================
// AWARD NOMINATION & APPROVAL WORKFLOW ENDPOINTS (STEP 3)
// =========================================================================
// GET /api/awards/nominations (List nominations with role/scope filtering)
exports.awardsRouter.get("/nominations", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const isHR = isHRAwardAuthorized(req);
        const userId = req.user?.userId;
        const callerEmp = await resolveCallerEmployee(userId, tenantId, req.user?.email);
        const { page = "1", limit = "20", status, awardTypeId, nominationSource, search, myOnly, } = req.query;
        const result = await award_nomination_service_1.AwardNominationService.getNominations({
            tenantId,
            userId,
            employeeId: callerEmp?.id,
            isHRAuthorized: isHR,
            myOnly: myOnly === "true",
            status: status,
            awardTypeId: awardTypeId,
            nominationSource: nominationSource,
            search: search,
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 20,
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch nominations." });
    }
});
// POST /api/awards/nominations (Submit nomination)
exports.awardsRouter.post("/nominations", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const isHR = isHRAwardAuthorized(req);
        const userId = req.user?.userId;
        const callerEmp = await resolveCallerEmployee(userId, tenantId, req.user?.email);
        const employeeId = req.body.employeeId || req.body.nomineeId;
        const awardTypeId = req.body.awardTypeId;
        const reason = req.body.reason || req.body.justification;
        const achievementDescription = req.body.achievementDescription || req.body.impactStatement;
        const supportingDocUrl = req.body.supportingDocUrl;
        const nominationSource = req.body.nominationSource;
        const nomination = await award_nomination_service_1.AwardNominationService.submitNomination({
            tenantId,
            nomineeEmployeeId: employeeId,
            awardTypeId,
            nominatorUserId: userId,
            nominatorEmployeeId: callerEmp?.id,
            nominationSource,
            reason,
            achievementDescription,
            supportingDocUrl,
            isHRAuthorized: isHR,
        });
        return res.status(201).json({ success: true, data: nomination });
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to submit nomination." });
    }
});
// POST /api/awards/nominations/:id/approve (Approve nomination step)
exports.awardsRouter.post("/nominations/:id/approve", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const isHR = isHRAwardAuthorized(req);
        const userId = req.user?.userId;
        const callerEmp = await resolveCallerEmployee(userId, tenantId, req.user?.email);
        const { comment } = req.body;
        const updated = await award_nomination_service_1.AwardNominationService.approveNomination({
            tenantId,
            nominationId: req.params.id,
            actorUserId: userId,
            actorEmployeeId: callerEmp?.id,
            actorRoles: req.user?.roles || [],
            isHRAuthorized: isHR,
            comment,
        });
        return res.json({ success: true, data: updated });
    }
    catch (err) {
        if (err.message === "Nomination not found." || err.message?.includes("not found")) {
            return res.status(404).json({ error: err.message, code: "NOT_FOUND" });
        }
        if (err.message?.includes("Access denied") || err.message?.includes("not authorized")) {
            return res.status(403).json({ error: err.message, code: "FORBIDDEN" });
        }
        return res.status(400).json({ error: err.message || "Failed to approve nomination." });
    }
});
// POST /api/awards/nominations/:id/reject (Reject nomination)
exports.awardsRouter.post("/nominations/:id/reject", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const isHR = isHRAwardAuthorized(req);
        const userId = req.user?.userId;
        const callerEmp = await resolveCallerEmployee(userId, tenantId, req.user?.email);
        const { comment } = req.body;
        const updated = await award_nomination_service_1.AwardNominationService.rejectNomination({
            tenantId,
            nominationId: req.params.id,
            actorUserId: userId,
            actorEmployeeId: callerEmp?.id,
            actorRoles: req.user?.roles || [],
            isHRAuthorized: isHR,
            comment,
        });
        return res.json({ success: true, data: updated });
    }
    catch (err) {
        if (err.message === "Nomination not found." || err.message?.includes("not found")) {
            return res.status(404).json({ error: err.message, code: "NOT_FOUND" });
        }
        if (err.message?.includes("Access denied") || err.message?.includes("not authorized")) {
            return res.status(403).json({ error: err.message, code: "FORBIDDEN" });
        }
        return res.status(400).json({ error: err.message || "Failed to reject nomination." });
    }
});
// POST /api/awards/nominations/:id/request-changes (Request changes)
exports.awardsRouter.post("/nominations/:id/request-changes", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const isHR = isHRAwardAuthorized(req);
        const userId = req.user?.userId;
        const callerEmp = await resolveCallerEmployee(userId, tenantId, req.user?.email);
        const { comment } = req.body;
        const updated = await award_nomination_service_1.AwardNominationService.requestChanges({
            tenantId,
            nominationId: req.params.id,
            actorUserId: userId,
            actorEmployeeId: callerEmp?.id,
            actorRoles: req.user?.roles || [],
            isHRAuthorized: isHR,
            comment,
        });
        return res.json({ success: true, data: updated });
    }
    catch (err) {
        if (err.message === "Nomination not found." || err.message?.includes("not found")) {
            return res.status(404).json({ error: err.message, code: "NOT_FOUND" });
        }
        if (err.message?.includes("Access denied") || err.message?.includes("not authorized")) {
            return res.status(403).json({ error: err.message, code: "FORBIDDEN" });
        }
        return res.status(400).json({ error: err.message || "Failed to request changes." });
    }
});
// POST /api/awards/nominations/:id/issue (Official Award Issuance)
exports.awardsRouter.post("/nominations/:id/issue", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        if (!isHRAwardAuthorized(req)) {
            return res.status(403).json({
                error: "Access denied. Only authorized HR administrators or managers can issue official awards.",
                code: "HR_ROLE_REQUIRED",
            });
        }
        const { giftItem, giftAmount, presentedBy } = req.body;
        const award = await award_nomination_service_1.AwardNominationService.issueOfficialAward({
            tenantId,
            nominationId: req.params.id,
            issuerUserId: req.user?.userId,
            issuerName: req.user?.name || req.user?.email,
            giftItem,
            giftAmount,
            presentedBy,
        });
        return res.status(201).json({ success: true, data: award });
    }
    catch (err) {
        if (err.message === "Nomination not found." || err.message?.includes("not found")) {
            return res.status(404).json({ error: err.message });
        }
        return res.status(400).json({ error: err.message || "Failed to issue award from nomination." });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: CERTIFICATE GENERATION, DISTRIBUTION & GOVERNANCE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/awards/:id/certificate/generate (Generate official certificate)
exports.awardsRouter.post("/:id/certificate/generate", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const isHR = isHRAwardAuthorized(req);
        if (!isHR) {
            return res.status(403).json({
                error: "Access denied. Only authorized HR administrators or managers can generate award certificates.",
                code: "HR_ROLE_REQUIRED",
            });
        }
        const result = await award_certificate_service_1.AwardCertificateService.generateCertificate({
            tenantId,
            awardId: req.params.id,
            actorUserId: req.user?.userId,
            isHRAuthorized: true,
            forceReissue: false,
        });
        return res.status(result.reused ? 200 : 201).json({
            success: true,
            data: result.certificate,
            reused: result.reused,
            message: result.message,
        });
    }
    catch (err) {
        if (err.message === "Award not found." || err.message?.includes("not found")) {
            return res.status(404).json({ error: err.message });
        }
        return res.status(400).json({ error: err.message || "Failed to generate award certificate." });
    }
});
// POST /api/awards/:id/certificate/reissue (Reissue certificate with reasons)
exports.awardsRouter.post("/:id/certificate/reissue", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const isHR = isHRAwardAuthorized(req);
        if (!isHR) {
            return res.status(403).json({
                error: "Access denied. Only authorized HR administrators or managers can reissue award certificates.",
                code: "HR_ROLE_REQUIRED",
            });
        }
        const { reason } = req.body;
        if (!reason || String(reason).trim().length < 3) {
            return res.status(400).json({ error: "A valid reissue reason (at least 3 characters) is required." });
        }
        const result = await award_certificate_service_1.AwardCertificateService.reissueCertificate({
            tenantId,
            awardId: req.params.id,
            actorUserId: req.user?.userId,
            reason: String(reason).trim(),
            isHRAuthorized: true,
        });
        return res.status(201).json({
            success: true,
            data: result.certificate,
            message: result.message,
        });
    }
    catch (err) {
        if (err.message === "Award not found." || err.message?.includes("not found")) {
            return res.status(404).json({ error: err.message });
        }
        return res.status(400).json({ error: err.message || "Failed to reissue award certificate." });
    }
});
// POST /api/awards/certificates/:id/revoke (Revoke certificate)
exports.awardsRouter.post("/certificates/:id/revoke", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const isHR = isHRAwardAuthorized(req);
        if (!isHR) {
            return res.status(403).json({
                error: "Access denied. Only authorized HR administrators or managers can revoke award certificates.",
                code: "HR_ROLE_REQUIRED",
            });
        }
        const { reason } = req.body;
        if (!reason || String(reason).trim().length < 3) {
            return res.status(400).json({ error: "A valid revocation reason (at least 3 characters) is required." });
        }
        const revoked = await award_certificate_service_1.AwardCertificateService.revokeCertificate({
            tenantId,
            certificateId: req.params.id,
            actorUserId: req.user?.userId,
            reason: String(reason).trim(),
            isHRAuthorized: true,
        });
        return res.json({ success: true, data: revoked });
    }
    catch (err) {
        if (err.message === "Certificate not found." || err.message?.includes("not found")) {
            return res.status(404).json({ error: err.message });
        }
        return res.status(400).json({ error: err.message || "Failed to revoke certificate." });
    }
});
// GET /api/awards/certificates/:id (View certificate details)
exports.awardsRouter.get("/certificates/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const isHR = isHRAwardAuthorized(req);
        const callerEmp = await resolveCallerEmployee(req.user?.userId, tenantId, req.user?.email);
        const cert = await prisma_1.prisma.employeeAwardCertificate.findFirst({
            where: { id: req.params.id, tenantId },
            include: {
                award: {
                    include: {
                        awardType: true,
                        employee: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                employeeCode: true,
                                department: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!cert) {
            return res.status(404).json({ error: "Certificate not found." });
        }
        const isOwner = callerEmp && cert.employeeId === callerEmp.id;
        if (!isHR && !isOwner) {
            return res.status(403).json({ error: "Access denied: You cannot view this certificate." });
        }
        return res.json({ success: true, data: cert });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to retrieve certificate details." });
    }
});
// GET /api/awards/certificates/:id/download (Stream verified PDF binary)
exports.awardsRouter.get("/certificates/:id/download", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const isHR = isHRAwardAuthorized(req);
        const callerEmp = await resolveCallerEmployee(req.user?.userId, tenantId, req.user?.email);
        const fileResult = await award_certificate_service_1.AwardCertificateService.getCertificateFile({
            certificateId: req.params.id,
            tenantId,
            actorUserId: req.user?.userId,
            callerEmployeeId: callerEmp?.id,
            isHRAuthorized: isHR,
        });
        res.setHeader("Content-Type", fileResult.mimeType || "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${fileResult.fileName}"`);
        res.setHeader("Content-Length", fileResult.fileSize);
        const stream = fs_1.default.createReadStream(fileResult.absolutePath);
        stream.pipe(res);
    }
    catch (err) {
        if (err.message === "Certificate not found." || err.message?.includes("not found")) {
            return res.status(404).json({ error: err.message });
        }
        if (err.message?.includes("Access denied")) {
            return res.status(403).json({ error: err.message });
        }
        return res.status(400).json({ error: err.message || "Failed to download certificate." });
    }
});
// GET /api/awards/:id/certificate (Get active certificate for award)
exports.awardsRouter.get("/:id/certificate", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const isHR = isHRAwardAuthorized(req);
        const callerEmp = await resolveCallerEmployee(req.user?.userId, tenantId, req.user?.email);
        const cert = await prisma_1.prisma.employeeAwardCertificate.findFirst({
            where: {
                tenantId,
                awardId: req.params.id,
                status: "ACTIVE",
            },
            include: {
                award: {
                    include: {
                        awardType: true,
                    },
                },
            },
        });
        if (!cert) {
            return res.status(404).json({ error: "No active certificate found for this award." });
        }
        const isOwner = callerEmp && cert.employeeId === callerEmp.id;
        if (!isHR && !isOwner) {
            return res.status(403).json({ error: "Access denied." });
        }
        return res.json({ success: true, data: cert });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch certificate." });
    }
});
