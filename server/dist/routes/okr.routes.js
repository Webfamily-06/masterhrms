"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.okrRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const addons_1 = require("../middleware/addons");
exports.okrRouter = (0, express_1.Router)();
// Apply Auth and Add-on Entitlement requirement to all OKR endpoints
exports.okrRouter.use(auth_1.requireAuth);
exports.okrRouter.use((0, addons_1.requireAddon)("okr-performance"));
/**
 * -------------------------------------------------------------
 * 1. OKR REVIEW CYCLES
 * -------------------------------------------------------------
 */
exports.okrRouter.get("/cycles", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const cycles = await prisma_1.prisma.okrCycle.findMany({
            where: { tenantId },
            orderBy: { startDate: "desc" },
            include: {
                _count: {
                    select: { objectives: true, reviews: true },
                },
            },
        });
        return res.json({ cycles });
    }
    catch (err) {
        console.error("[okr/cycles] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load OKR cycles." });
    }
});
exports.okrRouter.post("/cycles", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { name, periodType = "quarterly", startDate, endDate } = req.body;
        if (!name || !startDate || !endDate) {
            return res.status(400).json({ error: "Cycle name, start date, and end date are required." });
        }
        const cycle = await prisma_1.prisma.okrCycle.create({
            data: {
                tenantId,
                name,
                periodType,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                status: "active",
            },
        });
        return res.status(201).json({ cycle });
    }
    catch (err) {
        console.error("[okr/cycles:create] error:", err);
        return res.status(500).json({ error: err.message || "Failed to create OKR cycle." });
    }
});
/**
 * -------------------------------------------------------------
 * 2. OKR OBJECTIVES LIST & DETAILED HIERARCHICAL TREE
 * -------------------------------------------------------------
 */
exports.okrRouter.get("/objectives", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { cycleId, ownerId, departmentId, alignmentType, category } = req.query;
        const whereClause = { tenantId };
        if (cycleId && cycleId !== "all")
            whereClause.cycleId = String(cycleId);
        if (ownerId && ownerId !== "all")
            whereClause.ownerId = String(ownerId);
        if (departmentId && departmentId !== "all")
            whereClause.departmentId = String(departmentId);
        if (alignmentType && alignmentType !== "all")
            whereClause.alignmentType = String(alignmentType);
        if (category && category !== "all")
            whereClause.category = String(category);
        const objectives = await prisma_1.prisma.okrObjective.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            include: {
                owner: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        position: true,
                        department: { select: { name: true } },
                    },
                },
                parent: {
                    select: { id: true, title: true, alignmentType: true },
                },
                children: {
                    select: { id: true, title: true, progress: true, alignmentType: true },
                },
                keyResults: {
                    include: {
                        checkins: {
                            orderBy: { createdAt: "desc" },
                            take: 5,
                            include: {
                                employee: { select: { firstName: true, lastName: true } },
                            },
                        },
                    },
                },
            },
        });
        // Aggregations
        const totalCount = objectives.length;
        const avgProgress = totalCount > 0
            ? Math.round(objectives.reduce((sum, obj) => sum + Number(obj.progress), 0) / totalCount)
            : 0;
        return res.json({
            objectives,
            summary: {
                totalObjectives: totalCount,
                averageProgress: avgProgress,
                achievedCount: objectives.filter((o) => Number(o.progress) >= 100).length,
                inProgressCount: objectives.filter((o) => Number(o.progress) > 0 && Number(o.progress) < 100).length,
                notStartedCount: objectives.filter((o) => Number(o.progress) === 0).length,
            },
        });
    }
    catch (err) {
        console.error("[okr/objectives] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load objectives." });
    }
});
/**
 * Hierarchical Tree: Company -> Department -> Individual
 */
exports.okrRouter.get("/tree", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { cycleId } = req.query;
        const whereClause = { tenantId };
        if (cycleId && cycleId !== "all")
            whereClause.cycleId = String(cycleId);
        const allObjectives = await prisma_1.prisma.okrObjective.findMany({
            where: whereClause,
            include: {
                owner: { select: { firstName: true, lastName: true, position: true } },
                keyResults: true,
                children: {
                    include: {
                        owner: { select: { firstName: true, lastName: true } },
                        keyResults: true,
                        children: {
                            include: {
                                owner: { select: { firstName: true, lastName: true } },
                                keyResults: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });
        // Root nodes: parentId is null
        const rootObjectives = allObjectives.filter((o) => !o.parentId);
        return res.json({ tree: rootObjectives });
    }
    catch (err) {
        console.error("[okr/tree] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load OKR tree." });
    }
});
/**
 * Single OKR Detail
 */
exports.okrRouter.get("/objectives/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const objective = await prisma_1.prisma.okrObjective.findUnique({
            where: { id },
            include: {
                cycle: true,
                owner: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        position: true,
                        department: { select: { name: true } },
                    },
                },
                parent: {
                    select: { id: true, title: true, alignmentType: true, progress: true },
                },
                children: {
                    include: {
                        owner: { select: { firstName: true, lastName: true } },
                        keyResults: true,
                    },
                },
                keyResults: {
                    include: {
                        checkins: {
                            orderBy: { createdAt: "desc" },
                            include: {
                                employee: { select: { firstName: true, lastName: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!objective || objective.tenantId !== tenantId) {
            return res.status(404).json({ error: "Objective not found." });
        }
        return res.json({ objective });
    }
    catch (err) {
        console.error("[okr/objective:detail] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load objective details." });
    }
});
exports.okrRouter.post("/objectives", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { cycleId, parentId, category = "Strategy", title, description, ownerId, departmentId, alignmentType = "individual", keyResults = [], } = req.body;
        if (!cycleId || !title || !ownerId) {
            return res.status(400).json({ error: "Cycle, title, and owner are required." });
        }
        const objective = await prisma_1.prisma.okrObjective.create({
            data: {
                tenantId,
                cycleId,
                parentId: parentId || null,
                category,
                title,
                description,
                ownerId,
                departmentId: departmentId || null,
                alignmentType,
                progress: 0,
                status: "in_progress",
                keyResults: {
                    create: keyResults.map((kr) => ({
                        title: kr.title || "Measurable Result",
                        measurementType: kr.measurementType || "percentage",
                        startValue: Number(kr.startValue) || 0,
                        targetValue: Number(kr.targetValue) || 100,
                        currentValue: Number(kr.startValue) || 0,
                        weight: Number(kr.weight) || 1.0,
                        status: "in_progress",
                    })),
                },
            },
            include: {
                keyResults: true,
            },
        });
        return res.status(201).json({ objective });
    }
    catch (err) {
        console.error("[okr/objectives:create] error:", err);
        return res.status(500).json({ error: err.message || "Failed to create objective." });
    }
});
/**
 * -------------------------------------------------------------
 * 3. CHECK-INS & LIVE PROGRESS EVALUATION
 * -------------------------------------------------------------
 */
exports.okrRouter.get("/checkins", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const checkins = await prisma_1.prisma.okrCheckin.findMany({
            where: { keyResult: { objective: { tenantId } } },
            orderBy: { createdAt: "desc" },
            take: 50,
            include: {
                employee: { select: { firstName: true, lastName: true, position: true } },
                keyResult: {
                    select: {
                        title: true,
                        measurementType: true,
                        targetValue: true,
                        objective: { select: { id: true, title: true, alignmentType: true } },
                    },
                },
            },
        });
        return res.json({ checkins });
    }
    catch (err) {
        console.error("[okr/checkins:list] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load checkins." });
    }
});
exports.okrRouter.post("/checkins", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { keyResultId, employeeId, progressValue, confidenceScore = 8, notes, blockers, } = req.body;
        if (!keyResultId || !employeeId || progressValue === undefined) {
            return res.status(400).json({ error: "KeyResult ID, employee ID, and progress value are required." });
        }
        // 1. Create checkin record
        const checkin = await prisma_1.prisma.okrCheckin.create({
            data: {
                keyResultId,
                employeeId,
                progressValue: Number(progressValue),
                confidenceScore: Number(confidenceScore),
                notes,
                blockers,
            },
        });
        // 2. Update Key Result current value
        const updatedKr = await prisma_1.prisma.okrKeyResult.update({
            where: { id: keyResultId },
            data: {
                currentValue: Number(progressValue),
            },
            include: {
                objective: {
                    include: {
                        keyResults: true,
                    },
                },
            },
        });
        // 3. Recalculate Objective Overall Progress (%)
        const allKrs = updatedKr.objective.keyResults;
        let totalWeight = 0;
        let weightedProgressSum = 0;
        allKrs.forEach((kr) => {
            const start = Number(kr.startValue);
            const target = Number(kr.targetValue);
            const current = Number(kr.currentValue);
            const weight = Number(kr.weight || 1.0);
            const span = target - start || 1;
            const pct = Math.min(100, Math.max(0, ((current - start) / span) * 100));
            weightedProgressSum += pct * weight;
            totalWeight += weight;
        });
        const objectiveProgress = totalWeight > 0 ? Math.round(weightedProgressSum / totalWeight) : 0;
        await prisma_1.prisma.okrObjective.update({
            where: { id: updatedKr.objectiveId },
            data: {
                progress: objectiveProgress,
                status: objectiveProgress >= 100 ? "achieved" : objectiveProgress > 0 ? "in_progress" : "not_started",
            },
        });
        return res.json({
            checkin,
            keyResult: updatedKr,
            objectiveProgress,
        });
    }
    catch (err) {
        console.error("[okr/checkins:create] error:", err);
        return res.status(500).json({ error: err.message || "Failed to record check-in." });
    }
});
/**
 * -------------------------------------------------------------
 * 4. 360° APPRAISAL REVIEWS & RATINGS
 * -------------------------------------------------------------
 */
exports.okrRouter.get("/reviews", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { cycleId, employeeId, reviewerId } = req.query;
        const whereClause = {
            cycle: { tenantId },
        };
        if (cycleId && cycleId !== "all")
            whereClause.cycleId = String(cycleId);
        if (employeeId)
            whereClause.employeeId = String(employeeId);
        if (reviewerId)
            whereClause.reviewerId = String(reviewerId);
        const reviews = await prisma_1.prisma.okrReview.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            include: {
                cycle: { select: { name: true } },
                employee: { select: { firstName: true, lastName: true, position: true } },
                reviewer: { select: { firstName: true, lastName: true } },
            },
        });
        const totalReviews = reviews.length;
        const completedReviews = reviews.filter((r) => r.status === "approved" || r.status === "submitted");
        const avgScore = completedReviews.length > 0
            ? (completedReviews.reduce((sum, r) => sum + Number(r.ratingScore || 0), 0) /
                completedReviews.length).toFixed(1)
            : "0.0";
        return res.json({
            reviews,
            summary: {
                totalReviews,
                completedCount: completedReviews.length,
                pendingCount: totalReviews - completedReviews.length,
                averageScore: avgScore,
            },
        });
    }
    catch (err) {
        console.error("[okr/reviews] error:", err);
        return res.status(500).json({ error: err.message || "Failed to load reviews." });
    }
});
exports.okrRouter.post("/reviews", async (req, res) => {
    try {
        const { cycleId, employeeId, reviewerId, reviewType = "manager", ratingScore, feedbackText } = req.body;
        if (!cycleId || !employeeId || !reviewerId || ratingScore === undefined) {
            return res.status(400).json({ error: "Cycle, employee, reviewer, and rating score are required." });
        }
        const review = await prisma_1.prisma.okrReview.create({
            data: {
                cycleId,
                employeeId,
                reviewerId,
                reviewType,
                ratingScore: Number(ratingScore),
                feedbackText,
                status: "submitted",
            },
        });
        return res.status(201).json({ review });
    }
    catch (err) {
        console.error("[okr/reviews:create] error:", err);
        return res.status(500).json({ error: err.message || "Failed to submit review." });
    }
});
/**
 * -------------------------------------------------------------
 * 4. OKR PERFORMANCE INDICATORS & APPRAISALS
 * -------------------------------------------------------------
 */
exports.okrRouter.get("/indicators", async (_req, res) => {
    return res.json({ indicators: [] });
});
exports.okrRouter.get("/appraisals", async (_req, res) => {
    return res.json({ appraisals: [] });
});
