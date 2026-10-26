"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrLifecycleRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_context_1 = require("../context/tenant-context");
const lifecycle_service_1 = require("../services/lifecycle.service");
exports.hrLifecycleRouter = (0, express_1.Router)();
exports.hrLifecycleRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// Authorized HR Administration Roles
const HR_ADMIN_ROLES = ["admin", "super_admin", "tenant_admin", "hr_admin", "hr_manager"];
const COMPLAINT_ADMIN_ROLES = ["admin", "super_admin", "tenant_admin", "hr_admin", "hr_manager", "compliance_admin"];
const requireHrAdmin = (0, auth_1.requireRole)(...HR_ADMIN_ROLES);
const requireComplaintAdmin = (0, auth_1.requireRole)(...COMPLAINT_ADMIN_ROLES);
// =========================================================================
// 0. COMMAND CENTER OVERVIEW
// =========================================================================
exports.hrLifecycleRouter.get("/overview", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const metrics = await lifecycle_service_1.LifecycleService.getOverviewMetrics(tenantId);
        return res.json(metrics);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load lifecycle overview." });
    }
});
// =========================================================================
// 1. AWARDS (HR-LC-01)
// =========================================================================
exports.hrLifecycleRouter.get("/awards", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const awards = await db.award.findMany({
            where: { tenantId },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
                awardType: true,
            },
            orderBy: { awardDate: "desc" },
        });
        return res.json(awards);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch awards." });
    }
});
exports.hrLifecycleRouter.post("/awards", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const db = (0, tenant_context_1.getTenantDb)();
        const { employeeId, awardTypeId, awardDate, giftItem, giftAmount, description, presentedBy, certificateNo } = req.body;
        if (!employeeId || !awardDate) {
            return res.status(400).json({ error: "Employee and award date are required." });
        }
        const award = await db.award.create({
            data: {
                tenantId,
                employeeId,
                awardTypeId: awardTypeId || null,
                awardDate: new Date(awardDate),
                giftItem: giftItem || null,
                giftAmount: giftAmount ? parseFloat(giftAmount) : 0,
                description: description || null,
                presentedBy: presentedBy || null,
                certificateNo: certificateNo || `CERT-${Date.now().toString(36).toUpperCase()}`,
                status: "awarded",
            },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
                awardType: true,
            },
        });
        await lifecycle_service_1.LifecycleService.recordEvent({
            tenantId,
            employeeId,
            eventType: "AWARD_GRANTED",
            effectiveDate: new Date(awardDate),
            newState: { giftItem, giftAmount },
            actorId,
            source: "hr_admin",
            reason: description || "Employee recognized with award.",
            referenceId: award.id,
        });
        return res.status(201).json(award);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to grant award." });
    }
});
exports.hrLifecycleRouter.delete("/awards/:id", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        await db.award.deleteMany({ where: { id: req.params.id, tenantId } });
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete award." });
    }
});
// =========================================================================
// 2. PROMOTIONS (HR-LC-02)
// =========================================================================
exports.hrLifecycleRouter.get("/promotions", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const promotions = await db.promotionRecord.findMany({
            where: { tenantId },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
            },
            orderBy: { promotionDate: "desc" },
        });
        return res.json(promotions);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch promotions." });
    }
});
exports.hrLifecycleRouter.post("/promotions", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const promotion = await lifecycle_service_1.LifecycleService.executePromotion(tenantId, actorId, req.body);
        return res.status(201).json(promotion);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to execute promotion." });
    }
});
// =========================================================================
// 3. TRANSFERS (HR-LC-03)
// =========================================================================
exports.hrLifecycleRouter.get("/transfers", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const transfers = await db.employeeTransfer.findMany({
            where: { tenantId },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
            },
            orderBy: { effectiveDate: "desc" },
        });
        return res.json(transfers);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch employee transfers." });
    }
});
exports.hrLifecycleRouter.post("/transfers", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const transfer = await lifecycle_service_1.LifecycleService.executeTransfer(tenantId, actorId, req.body);
        return res.status(201).json(transfer);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to execute employee transfer." });
    }
});
// =========================================================================
// 4. WARNINGS (HR-LC-04)
// =========================================================================
exports.hrLifecycleRouter.get("/warnings", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const warnings = await db.disciplinaryWarning.findMany({
            where: { tenantId },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
                warningType: true,
            },
            orderBy: { warningDate: "desc" },
        });
        return res.json(warnings);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch disciplinary warnings." });
    }
});
exports.hrLifecycleRouter.post("/warnings", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const warning = await lifecycle_service_1.LifecycleService.issueWarning(tenantId, actorId, req.body);
        return res.status(201).json(warning);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to issue disciplinary warning." });
    }
});
exports.hrLifecycleRouter.delete("/warnings/:id", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        await db.disciplinaryWarning.deleteMany({ where: { id: req.params.id, tenantId } });
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete warning." });
    }
});
// =========================================================================
// 5. RESIGNATIONS (HR-LC-05)
// =========================================================================
exports.hrLifecycleRouter.get("/resignations", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const resignations = await db.employeeExit.findMany({
            where: { tenantId, exitType: "resignation" },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
                checklists: true,
            },
            orderBy: { resignationDate: "desc" },
        });
        return res.json(resignations);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch resignations." });
    }
});
exports.hrLifecycleRouter.put("/resignations/:id/review", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const { status, acceptedLastWorkingDay, notes } = req.body;
        const exit = await db.employeeExit.update({
            where: { id: req.params.id },
            data: {
                status: status || "clearance_pending",
                lastWorkingDay: acceptedLastWorkingDay ? new Date(acceptedLastWorkingDay) : undefined,
                exitInterviewNotes: notes || undefined,
            },
            include: { employee: true },
        });
        return res.json(exit);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to review resignation." });
    }
});
// =========================================================================
// 6. TERMINATIONS (HR-LC-06)
// =========================================================================
exports.hrLifecycleRouter.get("/terminations", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const terminations = await db.employeeExit.findMany({
            where: { tenantId, exitType: { not: "resignation" } },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
            },
            orderBy: { lastWorkingDay: "desc" },
        });
        return res.json(terminations);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch terminations." });
    }
});
exports.hrLifecycleRouter.post("/terminations", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const exit = await lifecycle_service_1.LifecycleService.executeTermination(tenantId, actorId, req.body);
        return res.status(201).json(exit);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to execute termination." });
    }
});
// =========================================================================
// 7. BUSINESS TRIPS (HR-LC-07)
// =========================================================================
exports.hrLifecycleRouter.get("/trips", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const trips = await db.employeeTrip.findMany({
            where: { tenantId },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
                expenses: true,
            },
            orderBy: { fromDate: "desc" },
        });
        return res.json(trips);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch business trips." });
    }
});
exports.hrLifecycleRouter.put("/trips/:id/approve", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const trip = await lifecycle_service_1.LifecycleService.approveTrip(tenantId, actorId, req.params.id, req.body.remarks);
        return res.json(trip);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to approve trip." });
    }
});
// =========================================================================
// 8. COMPLAINTS & GRIEVANCES (HR-LC-08)
// Strictly restricted to HR & Compliance administrators
// =========================================================================
exports.hrLifecycleRouter.get("/complaints", requireComplaintAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const complaints = await db.employeeComplaint.findMany({
            where: { tenantId },
            include: {
                caseNotes: { orderBy: { createdAt: "desc" } },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json(complaints);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch complaints." });
    }
});
exports.hrLifecycleRouter.put("/complaints/:id/resolve", requireComplaintAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { resolutionNotes, actionTaken } = req.body;
        const resolved = await lifecycle_service_1.LifecycleService.resolveComplaint(tenantId, req.params.id, resolutionNotes, actionTaken);
        return res.json(resolved);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to resolve complaint." });
    }
});
exports.hrLifecycleRouter.post("/complaints", requireComplaintAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const complaint = await lifecycle_service_1.LifecycleService.fileComplaint(tenantId, req.body);
        return res.status(201).json(complaint);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to record complaint." });
    }
});
exports.hrLifecycleRouter.post("/complaints/:id/notes", requireComplaintAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const authorId = req.user?.userId || "system";
        const db = (0, tenant_context_1.getTenantDb)();
        const { noteText, isConfidential } = req.body;
        if (!noteText) {
            return res.status(400).json({ error: "Note text is required." });
        }
        const caseNote = await db.complaintCaseNote.create({
            data: {
                tenantId,
                complaintId: req.params.id,
                authorId,
                noteText,
                isConfidential: isConfidential ?? true,
            },
        });
        return res.status(201).json(caseNote);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to add case note." });
    }
});
// =========================================================================
// 9. EXITS & CLEARANCE (HR-LC-09)
// =========================================================================
exports.hrLifecycleRouter.get("/exits", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const exits = await db.employeeExit.findMany({
            where: { tenantId },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
                checklists: true,
            },
            orderBy: { lastWorkingDay: "desc" },
        });
        return res.json(exits);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch exit cases." });
    }
});
exports.hrLifecycleRouter.put("/exits/:id/checklist/:itemId", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const { isCompleted } = req.body;
        const actorName = req.user?.email || "HR Admin";
        const item = await db.exitChecklistItem.update({
            where: { id: req.params.itemId },
            data: {
                isCompleted: !!isCompleted,
                completedBy: isCompleted ? actorName : null,
                completedAt: isCompleted ? new Date() : null,
            },
        });
        return res.json(item);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update checklist item." });
    }
});
exports.hrLifecycleRouter.put("/exits/:id/finalize", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const exit = await lifecycle_service_1.LifecycleService.finalizeExit(tenantId, actorId, req.params.id);
        return res.json(exit);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to finalize employee exit." });
    }
});
// =========================================================================
// 10. PROBATION MANAGEMENT (HR-LC-10)
// =========================================================================
exports.hrLifecycleRouter.get("/probation", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const probations = await db.probationRecord.findMany({
            where: { tenantId },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
            },
            orderBy: { endDate: "asc" },
        });
        return res.json(probations);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch probation records." });
    }
});
exports.hrLifecycleRouter.put("/probation/:id/extend", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const { extensionDays, remarks } = req.body;
        const updated = await lifecycle_service_1.LifecycleService.extendProbation(tenantId, actorId, req.params.id, parseInt(extensionDays), remarks);
        return res.json(updated);
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to extend probation." });
    }
});
exports.hrLifecycleRouter.put("/probation/:id/confirm", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const { performanceRating, remarks } = req.body;
        const updated = await lifecycle_service_1.LifecycleService.confirmProbation(tenantId, actorId, req.params.id, performanceRating, remarks);
        return res.json(updated);
    }
    catch (err) {
        return res.status(400).json({ error: err.message || "Failed to confirm probation." });
    }
});
// =========================================================================
// 11. TIMELINE & EVENT STORE QUERY (P6-BR-019)
// =========================================================================
exports.hrLifecycleRouter.get("/timeline/:employeeId", requireHrAdmin, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const events = await lifecycle_service_1.LifecycleService.getTimeline(tenantId, req.params.employeeId);
        return res.json(events);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load employee timeline." });
    }
});
