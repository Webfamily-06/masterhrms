"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meLifecycleRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_context_1 = require("../context/tenant-context");
const lifecycle_service_1 = require("../services/lifecycle.service");
exports.meLifecycleRouter = (0, express_1.Router)();
exports.meLifecycleRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
async function resolveEmployee(req) {
    const tenantId = req.user?.tenantId;
    const user = req.user;
    const userId = user.userId || user.id;
    const db = (0, tenant_context_1.getTenantDb)();
    return await db.employee.findFirst({
        where: { tenantId, userId },
    });
}
// =========================================================================
// 1. MY AWARDS (ME-LC-01)
// =========================================================================
exports.meLifecycleRouter.get("/awards", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const db = (0, tenant_context_1.getTenantDb)();
        const awards = await db.award.findMany({
            where: { tenantId, employeeId: employee.id },
            include: { awardType: true },
            orderBy: { awardDate: "desc" },
        });
        return res.json(awards);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load awards." });
    }
});
// =========================================================================
// 2. MY PROMOTIONS & CAREER PROGRESSION (ME-LC-02)
// =========================================================================
exports.meLifecycleRouter.get("/promotions", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const db = (0, tenant_context_1.getTenantDb)();
        const promotions = await db.promotionRecord.findMany({
            where: { tenantId, employeeId: employee.id },
            orderBy: { promotionDate: "desc" },
        });
        return res.json(promotions);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load promotions." });
    }
});
// =========================================================================
// 3. MY TRANSFERS (ME-LC-03)
// =========================================================================
exports.meLifecycleRouter.get("/transfers", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const db = (0, tenant_context_1.getTenantDb)();
        const transfers = await db.employeeTransfer.findMany({
            where: { tenantId, employeeId: employee.id },
            orderBy: { effectiveDate: "desc" },
        });
        return res.json(transfers);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load transfers." });
    }
});
exports.meLifecycleRouter.post("/transfers/request", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found." });
        const db = (0, tenant_context_1.getTenantDb)();
        const { toBranchId, toDeptId, reason } = req.body;
        const request = await db.employeeTransfer.create({
            data: {
                tenantId,
                employeeId: employee.id,
                fromBranchId: employee.branchId,
                toBranchId: toBranchId || null,
                fromDeptId: employee.departmentId,
                toDeptId: toDeptId || null,
                effectiveDate: new Date(),
                reason: reason || "Employee requested transfer",
                status: "PENDING",
            },
        });
        return res.status(201).json(request);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to request transfer." });
    }
});
// =========================================================================
// 4. MY DISCIPLINARY WARNINGS (ME-LC-04)
// =========================================================================
exports.meLifecycleRouter.get("/warnings", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const db = (0, tenant_context_1.getTenantDb)();
        const warnings = await db.disciplinaryWarning.findMany({
            where: { tenantId, employeeId: employee.id },
            include: { warningType: true },
            orderBy: { warningDate: "desc" },
        });
        return res.json(warnings);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load warnings." });
    }
});
exports.meLifecycleRouter.put("/warnings/:id/acknowledge", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found." });
        const updated = await lifecycle_service_1.LifecycleService.acknowledgeWarning(tenantId, employee.id, req.params.id);
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to acknowledge warning." });
    }
});
exports.meLifecycleRouter.put("/warnings/:id/response", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found." });
        const { response } = req.body;
        if (!response)
            return res.status(400).json({ error: "Response text is required." });
        const updated = await lifecycle_service_1.LifecycleService.submitWarningResponse(tenantId, employee.id, req.params.id, response);
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to submit response." });
    }
});
// =========================================================================
// 5. MY RESIGNATION (ME-LC-05)
// =========================================================================
exports.meLifecycleRouter.get("/resignation", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json(null);
        const db = (0, tenant_context_1.getTenantDb)();
        const exit = await db.employeeExit.findFirst({
            where: { tenantId, employeeId: employee.id, exitType: "resignation" },
            include: { checklists: true },
            orderBy: { createdAt: "desc" },
        });
        return res.json(exit);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load resignation status." });
    }
});
exports.meLifecycleRouter.post("/resignation", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found." });
        const exit = await lifecycle_service_1.LifecycleService.submitResignation(tenantId, employee.id, req.body);
        return res.status(201).json(exit);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to submit resignation." });
    }
});
exports.meLifecycleRouter.post("/resignation/:id/withdraw", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found." });
        const updated = await lifecycle_service_1.LifecycleService.withdrawResignation(tenantId, employee.id, req.params.id, req.body.reason || "Employee withdrew resignation.");
        return res.json(updated);
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to withdraw resignation." });
    }
});
// =========================================================================
// 6. MY EXIT & CLEARANCE (ME-LC-06)
// =========================================================================
exports.meLifecycleRouter.get("/exit", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json(null);
        const db = (0, tenant_context_1.getTenantDb)();
        const exit = await db.employeeExit.findFirst({
            where: { tenantId, employeeId: employee.id },
            include: { checklists: true },
            orderBy: { createdAt: "desc" },
        });
        return res.json(exit);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load exit details." });
    }
});
// =========================================================================
// 7. MY BUSINESS TRIPS (ME-LC-07)
// =========================================================================
exports.meLifecycleRouter.get("/trips", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const db = (0, tenant_context_1.getTenantDb)();
        const trips = await db.employeeTrip.findMany({
            where: { tenantId, employeeId: employee.id },
            include: { expenses: true },
            orderBy: { fromDate: "desc" },
        });
        return res.json(trips);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load trips." });
    }
});
exports.meLifecycleRouter.post("/trips", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found." });
        const trip = await lifecycle_service_1.LifecycleService.createTrip(tenantId, employee.id, req.body);
        return res.status(201).json(trip);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create trip request." });
    }
});
exports.meLifecycleRouter.post("/trips/:id/expenses", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const expense = await lifecycle_service_1.LifecycleService.addTripExpense(tenantId, req.params.id, req.body);
        return res.status(201).json(expense);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to add trip expense." });
    }
});
// =========================================================================
// 8. MY COMPLAINTS & GRIEVANCES (ME-LC-08)
// STRICT SECURITY (P6-BR-014): Complaints filed against me are NEVER visible!
// =========================================================================
exports.meLifecycleRouter.get("/complaints", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const db = (0, tenant_context_1.getTenantDb)();
        // Only return complaints FILED BY the logged-in employee
        const complaints = await db.employeeComplaint.findMany({
            where: { tenantId, complainantId: employee.id },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                ticketCode: true,
                category: true,
                severity: true,
                incidentDate: true,
                subject: true,
                description: true,
                status: true,
                actionTaken: true,
                resolvedAt: true,
                createdAt: true,
            },
        });
        return res.json(complaints);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load complaints." });
    }
});
exports.meLifecycleRouter.post("/complaints", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        const complaint = await lifecycle_service_1.LifecycleService.fileComplaint(tenantId, {
            ...req.body,
            complainantId: employee?.id,
        });
        return res.status(201).json(complaint);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to file complaint." });
    }
});
