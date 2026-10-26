"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrPerformanceRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_1 = require("../context/tenant-context");
const performance_service_1 = require("../services/performance.service");
exports.hrPerformanceRouter = (0, express_1.Router)();
// =========================================================================
// 0. PERFORMANCE OVERVIEW
// =========================================================================
exports.hrPerformanceRouter.get("/overview", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const metrics = await performance_service_1.PerformanceService.getOverviewMetrics(tenantId);
        return res.json(metrics);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load performance overview." });
    }
});
// =========================================================================
// 1. REVIEW CYCLES (HR-PF-03)
// =========================================================================
exports.hrPerformanceRouter.get("/cycles", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const cycles = await performance_service_1.PerformanceService.listCycles(tenantId);
        return res.json(cycles);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch cycles." });
    }
});
exports.hrPerformanceRouter.post("/cycles", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const cycle = await performance_service_1.PerformanceService.createCycle(tenantId, actorId, req.body);
        return res.status(201).json(cycle);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create cycle." });
    }
});
exports.hrPerformanceRouter.put("/cycles/:id/status", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const cycle = await performance_service_1.PerformanceService.updateCycleStatus(tenantId, actorId, req.params.id, req.body.status);
        return res.json(cycle);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update cycle status." });
    }
});
// =========================================================================
// 2. GOALS & OKRs (HR-PF-02)
// =========================================================================
exports.hrPerformanceRouter.get("/goals", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { cycleId, employeeId } = req.query;
        const db = (0, tenant_context_1.getTenantDb)();
        const where = { tenantId };
        if (cycleId && cycleId !== "all")
            where.cycleId = String(cycleId);
        if (employeeId && employeeId !== "all")
            where.ownerId = String(employeeId);
        const goals = await db.okrObjective.findMany({
            where,
            include: {
                owner: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
                keyResults: { include: { checkins: { take: 5, orderBy: { createdAt: "desc" } } } },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json(goals);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch goals." });
    }
});
exports.hrPerformanceRouter.post("/goals", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const goal = await performance_service_1.PerformanceService.createObjective(tenantId, actorId, req.body);
        return res.status(201).json(goal);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create goal." });
    }
});
// =========================================================================
// 3. INDICATORS & COMPETENCIES (HR-PF-04)
// =========================================================================
exports.hrPerformanceRouter.get("/indicators", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const indicators = await performance_service_1.PerformanceService.listIndicators(tenantId);
        return res.json(indicators);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch indicators." });
    }
});
exports.hrPerformanceRouter.post("/indicators", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const indicator = await performance_service_1.PerformanceService.createIndicator(tenantId, req.body);
        return res.status(201).json(indicator);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create indicator." });
    }
});
// =========================================================================
// 4. GOAL TYPES & INDICATOR CATEGORIES (HR-PF-05, HR-PF-06)
// =========================================================================
exports.hrPerformanceRouter.get("/goal-types", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const types = await db.goalTypeMaster.findMany({
            where: { tenantId },
            orderBy: { name: "asc" },
        });
        return res.json(types);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch goal types." });
    }
});
exports.hrPerformanceRouter.post("/goal-types", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const item = await db.goalTypeMaster.create({
            data: {
                tenantId,
                name: req.body.name,
                code: req.body.code.toUpperCase(),
                measurementType: req.body.measurementType || "percentage",
                unit: req.body.unit || null,
                description: req.body.description || null,
            },
        });
        return res.status(201).json(item);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create goal type." });
    }
});
exports.hrPerformanceRouter.get("/indicator-categories", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const categories = await db.indicatorCategory.findMany({
            where: { tenantId },
            orderBy: { name: "asc" },
        });
        return res.json(categories);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch indicator categories." });
    }
});
exports.hrPerformanceRouter.post("/indicator-categories", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const item = await db.indicatorCategory.create({
            data: {
                tenantId,
                name: req.body.name,
                code: req.body.code.toUpperCase(),
                description: req.body.description || null,
                defaultWeight: req.body.defaultWeight ? parseFloat(req.body.defaultWeight) : 25.0,
            },
        });
        return res.status(201).json(item);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create indicator category." });
    }
});
// =========================================================================
// 5. REVIEWS & RATINGS (HR-PF-01)
// =========================================================================
exports.hrPerformanceRouter.get("/reviews", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { cycleId, employeeId } = req.query;
        const db = (0, tenant_context_1.getTenantDb)();
        const where = { cycle: { tenantId } };
        if (cycleId && cycleId !== "all")
            where.cycleId = String(cycleId);
        if (employeeId && employeeId !== "all")
            where.employeeId = String(employeeId);
        const reviews = await db.okrReview.findMany({
            where,
            include: {
                cycle: true,
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
                reviewer: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json(reviews);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch reviews." });
    }
});
exports.hrPerformanceRouter.post("/reviews", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const review = await performance_service_1.PerformanceService.submitReview(tenantId, actorId, req.body);
        return res.status(201).json(review);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to submit review." });
    }
});
exports.hrPerformanceRouter.post("/cycles/:id/release", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const result = await performance_service_1.PerformanceService.releaseReviews(tenantId, actorId, req.params.id);
        return res.json({ success: true, releasedCount: result.count });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to release reviews." });
    }
});
// =========================================================================
// 6. PERFORMANCE IMPROVEMENT PLANS (PIP) (HR-PF-01 Linkage)
// =========================================================================
exports.hrPerformanceRouter.get("/pip", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const db = (0, tenant_context_1.getTenantDb)();
        const pips = await db.performanceImprovementPlan.findMany({
            where: { tenantId },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true } },
            },
            orderBy: { startDate: "desc" },
        });
        return res.json(pips);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch PIPs." });
    }
});
exports.hrPerformanceRouter.post("/pip", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const pip = await performance_service_1.PerformanceService.createPIP(tenantId, actorId, req.body);
        return res.status(201).json(pip);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create PIP." });
    }
});
exports.hrPerformanceRouter.put("/pip/:id/conclude", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const pip = await performance_service_1.PerformanceService.concludePIP(tenantId, actorId, req.params.id, req.body.status, req.body.finalRemarks);
        return res.json(pip);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to conclude PIP." });
    }
});
