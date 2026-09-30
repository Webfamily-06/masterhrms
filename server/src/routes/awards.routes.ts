import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";
import { broadcastToTenant } from "../socket";

export const awardsRouter = Router();

awardsRouter.use(requireAuth, resolveTenantContext);

const DEFAULT_AWARD_TYPES = [
  { name: "Employee of the Month", icon: "Trophy", description: "Recognizing outstanding all-around contribution" },
  { name: "Star Performer", icon: "Star", description: "Consistently exceeding KPI targets and expectations" },
  { name: "Leadership Excellence", icon: "Award", description: "Exemplary mentorship and positive team influence" },
  { name: "Innovation Champion", icon: "Zap", description: "Breakthrough ideas or operational efficiency improvements" },
  { name: "Customer Delight", icon: "Heart", description: "Exceptional client satisfaction and service feedback" },
  { name: "Best Team Player", icon: "Users", description: "Exceptional collaboration and cross-functional support" },
];

async function ensureDefaultAwardTypes(tenantId: string) {
  const count = await prisma.awardType.count({ where: { tenantId } });
  if (count === 0) {
    await prisma.$transaction(
      DEFAULT_AWARD_TYPES.map((t) =>
        prisma.awardType.create({
          data: {
            tenantId,
            name: t.name,
            icon: t.icon,
            description: t.description,
          },
        })
      )
    );
  }
}

// GET /api/awards/types (List or auto-seed award types)
awardsRouter.get("/types", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    await ensureDefaultAwardTypes(tenantId);

    const types = await prisma.awardType.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { awards: true } },
      },
    });

    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch award types." });
  }
});

// POST /api/awards/types (Create custom award type)
awardsRouter.post("/types", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { name, icon, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Award type name is required." });
    }

    const type = await prisma.awardType.create({
      data: {
        tenantId,
        name: name.trim(),
        icon: icon || "Trophy",
        description: description?.trim() || null,
      },
    });

    return res.status(201).json(type);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create award type." });
  }
});

// GET /api/awards (List awards with pagination & filters)
awardsRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { employeeId, awardTypeId, search, month } = req.query;

    const where: any = { tenantId };
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

    const pagination = parsePaginationParams(req, "awardDate", 20);

    const [total, awards, totalGiftValue, awardTypeCounts] = await Promise.all([
      prisma.award.count({ where }),
      prisma.award.findMany({
        where,
        include: {
          employee: {
            include: { department: true },
          },
          awardType: true,
        },
        orderBy: { awardDate: "desc" },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
      prisma.award.aggregate({
        where: { tenantId },
        _sum: { giftAmount: true },
      }),
      prisma.award.groupBy({
        by: ["awardTypeId"],
        where: { tenantId },
        _count: { id: true },
      }),
    ]);

    return res.json({
      ...formatPaginatedResponse(awards, total, pagination),
      stats: {
        totalAwards: total,
        totalGiftValue: Number(totalGiftValue._sum.giftAmount || 0),
        distribution: awardTypeCounts,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch awards." });
  }
});

// POST /api/awards (Issue new award)
awardsRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const {
      employeeId,
      awardTypeId,
      awardDate,
      giftItem,
      giftAmount,
      description,
      certificateUrl,
      presentedBy,
    } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: "Employee is required." });
    }

    const certSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const certificateNo = `AWD-${new Date().getFullYear()}-${certSuffix}`;

    const award = await prisma.award.create({
      data: {
        tenantId,
        employeeId,
        awardTypeId: awardTypeId || null,
        awardDate: awardDate ? new Date(awardDate) : new Date(),
        giftItem: giftItem?.trim() || "Recognition Trophy",
        giftAmount: giftAmount ? Number(giftAmount) : 0,
        description: description?.trim() || null,
        certificateUrl: certificateUrl || null,
        certificateNo,
        presentedBy: presentedBy?.trim() || (req.user as any)?.name || "Management",
        status: "awarded",
      },
      include: {
        employee: {
          include: { department: true },
        },
        awardType: true,
      },
    });

    broadcastToTenant(tenantId, "award:created", award);
    broadcastToTenant(tenantId, "notification:new", {
      title: "Award Presented",
      description: `${award.employee.firstName} ${award.employee.lastName} received ${award.awardType?.name || "an Award"}!`,
      type: "award",
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json(award);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to issue award." });
  }
});

// PUT /api/awards/:id (Update award)
awardsRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { id } = req.params;
    const {
      awardTypeId,
      awardDate,
      giftItem,
      giftAmount,
      description,
      certificateUrl,
      presentedBy,
      status,
    } = req.body;

    const existing = await prisma.award.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Award record not found." });

    const updated = await prisma.award.update({
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
        employee: { include: { department: true } },
        awardType: true,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update award." });
  }
});

// DELETE /api/awards/:id (Delete award)
awardsRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { id } = req.params;
    const existing = await prisma.award.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Award not found." });

    await prisma.award.delete({ where: { id } });
    return res.json({ success: true, message: "Award deleted successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete award." });
  }
});
