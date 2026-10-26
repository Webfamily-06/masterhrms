"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mePerformanceRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_1 = require("../context/tenant-context");
const performance_service_1 = require("../services/performance.service");
exports.mePerformanceRouter = (0, express_1.Router)();
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
// 1. MY PERFORMANCE REVIEWS (ME-PF-01)
// =========================================================================
exports.mePerformanceRouter.get("/reviews", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const db = (0, tenant_context_1.getTenantDb)();
        const reviews = await db.okrReview.findMany({
            where: {
                cycle: { tenantId },
                employeeId: employee.id,
            },
            include: {
                cycle: true,
                reviewer: { select: { id: true, firstName: true, lastName: true, position: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        // Mask manager ratings if not yet released/approved
        const sanitized = reviews.map((r) => {
            const isReleased = r.status === "approved" || r.status === "acknowledged";
            return {
                id: r.id,
                cycleId: r.cycleId,
                cycleName: r.cycle.name,
                reviewType: r.reviewType,
                status: r.status,
                reviewerName: `${r.reviewer.firstName} ${r.reviewer.lastName}`,
                ratingScore: isReleased ? r.ratingScore : null,
                feedbackText: isReleased ? r.feedbackText : null,
                createdAt: r.createdAt,
            };
        });
        return res.json(sanitized);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load reviews." });
    }
});
// Submit Self Assessment
exports.mePerformanceRouter.post("/reviews/self", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found." });
        const review = await performance_service_1.PerformanceService.submitReview(tenantId, employee.id, {
            ...req.body,
            employeeId: employee.id,
            reviewerId: employee.id,
            reviewType: "self",
        });
        return res.status(201).json(review);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to submit self-assessment." });
    }
});
// Acknowledge Final Review
exports.mePerformanceRouter.put("/reviews/:id/acknowledge", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found." });
        const db = (0, tenant_context_1.getTenantDb)();
        const review = await db.okrReview.findFirst({
            where: { id: req.params.id, employeeId: employee.id },
        });
        if (!review)
            throw new Error("Review not found.");
        const updated = await db.okrReview.update({
            where: { id: review.id },
            data: { status: "acknowledged" },
        });
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to acknowledge review." });
    }
});
// =========================================================================
// 2. MY GOALS (ME-PF-02)
// =========================================================================
exports.mePerformanceRouter.get("/goals", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.json([]);
        const db = (0, tenant_context_1.getTenantDb)();
        const goals = await db.okrObjective.findMany({
            where: { tenantId, ownerId: employee.id },
            include: {
                cycle: true,
                keyResults: {
                    include: {
                        checkins: { orderBy: { createdAt: "desc" }, take: 5 },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json(goals);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load goals." });
    }
});
// Goal Check-in
exports.mePerformanceRouter.post("/goals/checkin", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const employee = await resolveEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found." });
        const result = await performance_service_1.PerformanceService.checkinKeyResult(tenantId, employee.id, req.body);
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to record check-in." });
    }
});
// =========================================================================
// 3. REVIEW CYCLES (ME-PF-03)
// =========================================================================
exports.mePerformanceRouter.get("/cycles", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const cycles = await performance_service_1.PerformanceService.listCycles(tenantId);
        return res.json(cycles);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load review cycles." });
    }
});
// =========================================================================
// 4. PERFORMANCE INDICATORS (ME-PF-04)
// =========================================================================
exports.mePerformanceRouter.get("/indicators", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const indicators = await performance_service_1.PerformanceService.listIndicators(tenantId);
        return res.json(indicators);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to load indicators." });
    }
});
