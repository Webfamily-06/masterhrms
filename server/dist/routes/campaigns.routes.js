"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const tenant_1 = require("../lib/tenant");
const pagination_1 = require("../lib/pagination");
exports.campaignsRouter = (0, express_1.Router)();
exports.campaignsRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// GET /api/campaigns - List campaigns with tabs, filters, and stats
exports.campaignsRouter.get("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 50);
        const { status, type, channel } = req.query;
        const where = { tenantId };
        if (status && status !== "all") {
            where.status = String(status).toLowerCase();
        }
        if (type && type !== "all") {
            where.campaignType = String(type);
        }
        if (channel && channel !== "all") {
            where.channel = String(channel);
        }
        if (pagination.search) {
            where.OR = [
                { name: { contains: pagination.search } },
                { campaignCode: { contains: pagination.search } },
                { targetAudience: { contains: pagination.search } },
            ];
        }
        const [campaigns, total, allForStats] = await Promise.all([
            prisma_1.prisma.marketingCampaign.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: pagination.skip,
                take: pagination.limit,
            }),
            prisma_1.prisma.marketingCampaign.count({ where }),
            prisma_1.prisma.marketingCampaign.findMany({
                where: { tenantId },
                select: { status: true, budget: true, spent: true },
            }),
        ]);
        // Aggregate stats
        const stats = {
            total: allForStats.length,
            active: allForStats.filter((c) => c.status === "active").length,
            completed: allForStats.filter((c) => c.status === "completed").length,
            archived: allForStats.filter((c) => c.status === "archived").length,
            totalBudget: allForStats.reduce((sum, c) => sum + Number(c.budget || 0), 0),
            totalSpent: allForStats.reduce((sum, c) => sum + Number(c.spent || 0), 0),
        };
        res.json({
            ...(0, pagination_1.formatPaginatedResponse)(campaigns, total, pagination),
            stats,
        });
    }
    catch (error) {
        console.error("Error fetching marketing campaigns:", error);
        res.status(500).json({ error: error.message || "Failed to fetch campaigns" });
    }
});
// POST /api/campaigns - Create a new campaign
exports.campaignsRouter.post("/", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { name, campaignType, channel, budget, spent, currency, period, periodValue, targetAudience, description, startDate, endDate, status, campaignCode: requestedCode, } = req.body;
        if (!name || !campaignType || !channel) {
            return res.status(400).json({
                error: "Name, Campaign Type, and Channel are required",
            });
        }
        // Generate campaign code if not provided
        let campaignCode = requestedCode;
        if (!campaignCode) {
            const count = await prisma_1.prisma.marketingCampaign.count({ where: { tenantId } });
            campaignCode = `#CAM${String(count + 1).padStart(4, "0")}`;
        }
        const campaign = await prisma_1.prisma.marketingCampaign.create({
            data: {
                tenantId,
                campaignCode,
                name: String(name).trim(),
                campaignType: String(campaignType).trim(),
                channel: String(channel).trim(),
                budget: Number(budget || 0),
                spent: Number(spent || 0),
                currency: currency ? String(currency).trim() : "USD",
                period: period ? String(period).trim() : "Days",
                periodValue: periodValue ? Number(periodValue) : null,
                targetAudience: targetAudience ? String(targetAudience).trim() : null,
                description: description ? String(description).trim() : null,
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : null,
                status: status ? String(status).toLowerCase() : "active",
            },
        });
        res.status(201).json({
            success: true,
            message: "Campaign created successfully",
            data: campaign,
        });
    }
    catch (error) {
        console.error("Error creating marketing campaign:", error);
        res.status(500).json({ error: error.message || "Failed to create campaign" });
    }
});
// PUT /api/campaigns/:id - Update campaign
exports.campaignsRouter.put("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const existing = await prisma_1.prisma.marketingCampaign.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Campaign not found" });
        }
        const { name, campaignType, channel, budget, spent, currency, period, periodValue, targetAudience, description, startDate, endDate, status, campaignCode, } = req.body;
        const updated = await prisma_1.prisma.marketingCampaign.update({
            where: { id },
            data: {
                ...(campaignCode && { campaignCode: String(campaignCode).trim() }),
                ...(name && { name: String(name).trim() }),
                ...(campaignType && { campaignType: String(campaignType).trim() }),
                ...(channel && { channel: String(channel).trim() }),
                ...(budget !== undefined && { budget: Number(budget) }),
                ...(spent !== undefined && { spent: Number(spent) }),
                ...(currency && { currency: String(currency).trim() }),
                ...(period !== undefined && { period: period ? String(period).trim() : null }),
                ...(periodValue !== undefined && { periodValue: periodValue ? Number(periodValue) : null }),
                ...(targetAudience !== undefined && { targetAudience: targetAudience ? String(targetAudience).trim() : null }),
                ...(description !== undefined && { description: description ? String(description).trim() : null }),
                ...(startDate && { startDate: new Date(startDate) }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(status && { status: String(status).toLowerCase() }),
            },
        });
        res.json({
            success: true,
            message: "Campaign updated successfully",
            data: updated,
        });
    }
    catch (error) {
        console.error("Error updating marketing campaign:", error);
        res.status(500).json({ error: error.message || "Failed to update campaign" });
    }
});
// PATCH /api/campaigns/:id/status - Update campaign status (active, completed, archived)
exports.campaignsRouter.patch("/:id/status", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: "Status is required" });
        }
        const existing = await prisma_1.prisma.marketingCampaign.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Campaign not found" });
        }
        const updated = await prisma_1.prisma.marketingCampaign.update({
            where: { id },
            data: { status: String(status).toLowerCase() },
        });
        res.json({
            success: true,
            message: `Campaign status changed to ${status}`,
            data: updated,
        });
    }
    catch (error) {
        console.error("Error updating campaign status:", error);
        res.status(500).json({ error: error.message || "Failed to update campaign status" });
    }
});
// DELETE /api/campaigns/:id - Delete campaign
exports.campaignsRouter.delete("/:id", async (req, res) => {
    try {
        const tenantId = (0, tenant_1.resolveTenantId)(req, res);
        if (!tenantId)
            return;
        const { id } = req.params;
        const existing = await prisma_1.prisma.marketingCampaign.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Campaign not found" });
        }
        await prisma_1.prisma.marketingCampaign.delete({
            where: { id },
        });
        res.json({
            success: true,
            message: "Campaign deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting marketing campaign:", error);
        res.status(500).json({ error: error.message || "Failed to delete campaign" });
    }
});
