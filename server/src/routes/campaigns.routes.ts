import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { resolveTenantId } from "../lib/tenant";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";

export const campaignsRouter = Router();

campaignsRouter.use(requireAuth, resolveTenantContext);

// GET /api/campaigns - List campaigns with tabs, filters, and stats
campaignsRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const pagination = parsePaginationParams(req, "createdAt", 50);
    const { status, type, channel } = req.query;

    const where: any = { tenantId };

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
      prisma.marketingCampaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.marketingCampaign.count({ where }),
      prisma.marketingCampaign.findMany({
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
      ...formatPaginatedResponse(campaigns, total, pagination),
      stats,
    });
  } catch (error: any) {
    console.error("Error fetching marketing campaigns:", error);
    res.status(500).json({ error: error.message || "Failed to fetch campaigns" });
  }
});

// POST /api/campaigns - Create a new campaign
campaignsRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const {
      name,
      campaignType,
      channel,
      budget,
      spent,
      currency,
      period,
      periodValue,
      targetAudience,
      description,
      startDate,
      endDate,
      status,
      campaignCode: requestedCode,
    } = req.body;

    if (!name || !campaignType || !channel) {
      return res.status(400).json({
        error: "Name, Campaign Type, and Channel are required",
      });
    }

    // Generate campaign code if not provided
    let campaignCode = requestedCode;
    if (!campaignCode) {
      const count = await prisma.marketingCampaign.count({ where: { tenantId } });
      campaignCode = `#CAM${String(count + 1).padStart(4, "0")}`;
    }

    const campaign = await prisma.marketingCampaign.create({
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
  } catch (error: any) {
    console.error("Error creating marketing campaign:", error);
    res.status(500).json({ error: error.message || "Failed to create campaign" });
  }
});

// PUT /api/campaigns/:id - Update campaign
campaignsRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { id } = req.params;
    const existing = await prisma.marketingCampaign.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const {
      name,
      campaignType,
      channel,
      budget,
      spent,
      currency,
      period,
      periodValue,
      targetAudience,
      description,
      startDate,
      endDate,
      status,
      campaignCode,
    } = req.body;

    const updated = await prisma.marketingCampaign.update({
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
  } catch (error: any) {
    console.error("Error updating marketing campaign:", error);
    res.status(500).json({ error: error.message || "Failed to update campaign" });
  }
});

// PATCH /api/campaigns/:id/status - Update campaign status (active, completed, archived)
campaignsRouter.patch("/:id/status", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const existing = await prisma.marketingCampaign.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const updated = await prisma.marketingCampaign.update({
      where: { id },
      data: { status: String(status).toLowerCase() },
    });

    res.json({
      success: true,
      message: `Campaign status changed to ${status}`,
      data: updated,
    });
  } catch (error: any) {
    console.error("Error updating campaign status:", error);
    res.status(500).json({ error: error.message || "Failed to update campaign status" });
  }
});

// DELETE /api/campaigns/:id - Delete campaign
campaignsRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { id } = req.params;
    const existing = await prisma.marketingCampaign.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    await prisma.marketingCampaign.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting marketing campaign:", error);
    res.status(500).json({ error: error.message || "Failed to delete campaign" });
  }
});
