"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warningsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const pagination_1 = require("../lib/pagination");
const socket_1 = require("../socket");
exports.warningsRouter = (0, express_1.Router)();
exports.warningsRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
const DEFAULT_WARNING_TYPES = [
    { name: "Attendance & Punctuality", defaultSeverity: "minor", description: "Unexcused absences, chronic tardiness, or unauthorized time off" },
    { name: "Policy & Code of Conduct", defaultSeverity: "moderate", description: "Non-compliance with organizational guidelines or workplace harassment" },
    { name: "Performance & Quality of Work", defaultSeverity: "moderate", description: "Consistently substandard deliverables or missed deadlines" },
    { name: "Insubordination & Misconduct", defaultSeverity: "major", description: "Refusal to follow reasonable instructions or hostile conduct" },
    { name: "Security & Data Breach", defaultSeverity: "critical", description: "Unauthorized access, sharing of proprietary data, or security violation" },
];
async function ensureDefaultWarningTypes(tenantId) {
    const count = await prisma_1.prisma.warningType.count({ where: { tenantId } });
    if (count === 0) {
        await prisma_1.prisma.$transaction(DEFAULT_WARNING_TYPES.map((t) => prisma_1.prisma.warningType.create({
            data: {
                tenantId,
                name: t.name,
                defaultSeverity: t.defaultSeverity,
                description: t.description,
            },
        })));
    }
}
// GET /api/warnings/types
exports.warningsRouter.get("/types", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        await ensureDefaultWarningTypes(tenantId);
        const types = await prisma_1.prisma.warningType.findMany({
            where: { tenantId },
            orderBy: { name: "asc" },
            include: {
                _count: { select: { warnings: true } },
            },
        });
        return res.json(types);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch warning types." });
    }
});
// POST /api/warnings/types
exports.warningsRouter.post("/types", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { name, defaultSeverity, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Warning type name is required." });
        }
        const type = await prisma_1.prisma.warningType.create({
            data: {
                tenantId,
                name: name.trim(),
                defaultSeverity: defaultSeverity || "moderate",
                description: description?.trim() || null,
            },
        });
        return res.status(201).json(type);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create warning type." });
    }
});
// GET /api/warnings
exports.warningsRouter.get("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { employeeId, warningTypeId, severity, status, search } = req.query;
        const where = { tenantId };
        // Employee isolation: If standard employee, only see own warnings
        const isEmployeeRole = req.user?.roles?.includes("employee") && !req.user?.roles?.some((r) => ["admin", "hr_admin", "super_admin"].includes(r));
        if (isEmployeeRole) {
            const myEmployee = await prisma_1.prisma.employee.findFirst({
                where: { tenantId, userId: req.user?.userId },
                select: { id: true },
            });
            if (myEmployee) {
                where.employeeId = myEmployee.id;
            }
        }
        else if (employeeId && employeeId !== "all") {
            where.employeeId = String(employeeId);
        }
        if (warningTypeId && warningTypeId !== "all") {
            where.warningTypeId = String(warningTypeId);
        }
        if (severity && severity !== "all") {
            where.severity = String(severity);
        }
        if (status && status !== "all") {
            where.status = String(status);
        }
        if (search) {
            where.OR = [
                { subject: { contains: String(search) } },
                { description: { contains: String(search) } },
                { warningBy: { contains: String(search) } },
                { employee: { firstName: { contains: String(search) } } },
                { employee: { lastName: { contains: String(search) } } },
                { employee: { employeeCode: { contains: String(search) } } },
            ];
        }
        const pagination = (0, pagination_1.parsePaginationParams)(req, "warningDate", 20);
        const [total, warnings, activeCount, criticalCount] = await Promise.all([
            prisma_1.prisma.disciplinaryWarning.count({ where }),
            prisma_1.prisma.disciplinaryWarning.findMany({
                where,
                include: {
                    employee: {
                        include: { department: true },
                    },
                    warningType: true,
                },
                orderBy: { warningDate: "desc" },
                ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
            }),
            prisma_1.prisma.disciplinaryWarning.count({ where: { ...where, status: "issued" } }),
            prisma_1.prisma.disciplinaryWarning.count({ where: { ...where, severity: "critical" } }),
        ]);
        return res.json({
            ...(0, pagination_1.formatPaginatedResponse)(warnings, total, pagination),
            stats: {
                totalWarnings: total,
                activeCount,
                criticalCount,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch disciplinary warnings." });
    }
});
// POST /api/warnings (Issue warning)
exports.warningsRouter.post("/", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { employeeId, warningTypeId, subject, severity, warningDate, description, letterUrl, warningBy, } = req.body;
        if (!employeeId || !subject || !description) {
            return res.status(400).json({ error: "Employee, subject, and description are required." });
        }
        const warning = await prisma_1.prisma.disciplinaryWarning.create({
            data: {
                tenantId,
                employeeId,
                warningTypeId: warningTypeId || null,
                subject: subject.trim(),
                severity: severity || "moderate",
                warningDate: warningDate ? new Date(warningDate) : new Date(),
                description: description.trim(),
                letterUrl: letterUrl || null,
                warningBy: warningBy?.trim() || req.user?.name || "HR Department",
                status: "issued",
            },
            include: {
                employee: {
                    include: { department: true },
                },
                warningType: true,
            },
        });
        (0, socket_1.broadcastToTenant)(tenantId, "warning:issued", warning);
        (0, socket_1.broadcastToTenant)(tenantId, "notification:new", {
            title: `Disciplinary Notice: ${warning.subject}`,
            description: `A formal ${warning.severity.toUpperCase()} warning was issued to ${warning.employee.firstName} ${warning.employee.lastName}.`,
            type: "warning",
            timestamp: new Date().toISOString(),
        });
        return res.status(201).json(warning);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to issue disciplinary warning." });
    }
});
// POST /api/warnings/:id/acknowledge (Employee sign-off)
exports.warningsRouter.post("/:id/acknowledge", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { id } = req.params;
        const { employeeResponse } = req.body;
        const existing = await prisma_1.prisma.disciplinaryWarning.findFirst({
            where: { id, tenantId },
            include: { employee: true },
        });
        if (!existing)
            return res.status(404).json({ error: "Warning record not found." });
        const updated = await prisma_1.prisma.disciplinaryWarning.update({
            where: { id },
            data: {
                status: "acknowledged",
                employeeResponse: employeeResponse?.trim() || "Acknowledged and signed by employee.",
                acknowledgedAt: new Date(),
            },
            include: {
                employee: { include: { department: true } },
                warningType: true,
            },
        });
        (0, socket_1.broadcastToTenant)(tenantId, "warning:acknowledged", updated);
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to acknowledge warning." });
    }
});
// POST /api/warnings/:id/resolve (Manager resolution)
exports.warningsRouter.post("/:id/resolve", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { id } = req.params;
        const existing = await prisma_1.prisma.disciplinaryWarning.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Warning record not found." });
        const updated = await prisma_1.prisma.disciplinaryWarning.update({
            where: { id },
            data: {
                status: "resolved",
                resolvedAt: new Date(),
            },
            include: {
                employee: { include: { department: true } },
                warningType: true,
            },
        });
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to resolve warning." });
    }
});
// PUT /api/warnings/:id (Update warning)
exports.warningsRouter.put("/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { id } = req.params;
        const { warningTypeId, subject, severity, warningDate, description, letterUrl, warningBy, status, } = req.body;
        const existing = await prisma_1.prisma.disciplinaryWarning.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Warning record not found." });
        const updated = await prisma_1.prisma.disciplinaryWarning.update({
            where: { id },
            data: {
                warningTypeId: warningTypeId !== undefined ? warningTypeId : existing.warningTypeId,
                subject: subject !== undefined ? subject.trim() : existing.subject,
                severity: severity || existing.severity,
                warningDate: warningDate ? new Date(warningDate) : existing.warningDate,
                description: description !== undefined ? description.trim() : existing.description,
                letterUrl: letterUrl !== undefined ? letterUrl : existing.letterUrl,
                warningBy: warningBy !== undefined ? warningBy : existing.warningBy,
                status: status || existing.status,
            },
            include: {
                employee: { include: { department: true } },
                warningType: true,
            },
        });
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update warning." });
    }
});
// DELETE /api/warnings/:id
exports.warningsRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { id } = req.params;
        const existing = await prisma_1.prisma.disciplinaryWarning.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: "Warning record not found." });
        await prisma_1.prisma.disciplinaryWarning.delete({ where: { id } });
        return res.json({ success: true, message: "Warning deleted successfully." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete warning." });
    }
});
