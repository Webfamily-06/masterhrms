import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const suppliersRouter = Router();

/**
 * GET /api/suppliers
 * List all suppliers for the active tenant with search and analytics
 */
suppliersRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
      const t = await prisma.tenant.findFirst();
      tenantId = t?.id || "tenant-default-001";
    }

    const { search } = req.query;
    const where: any = { tenantId };

    if (search && typeof search === "string" && search.trim() !== "") {
      where.OR = [
        { name: { contains: search.trim() } },
        { email: { contains: search.trim() } },
        { phone: { contains: search.trim() } },
        { gstin: { contains: search.trim() } },
        { city: { contains: search.trim() } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: { select: { purchases: true } },
        purchases: {
          select: { total: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = suppliers.map((s) => {
      const totalPurchasesAmount = s.purchases.reduce((sum, p) => sum + Number(p.total || 0), 0);
      return {
        id: s.id,
        name: s.name,
        email: s.email || "",
        phone: s.phone || "",
        gstin: s.gstin || "",
        address: s.address || "",
        city: s.city || "",
        country: s.country || "India",
        purchasesCount: s._count.purchases,
        totalPurchasesAmount,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });

    return res.json({ data: formatted });
  } catch (err: any) {
    console.error("GET /api/suppliers error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch suppliers" });
  }
});

/**
 * GET /api/suppliers/:id
 * Get single supplier with purchase orders history
 */
suppliersRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
      const t = await prisma.tenant.findFirst();
      tenantId = t?.id || "tenant-default-001";
    }
    const { id } = req.params;

    const supplier = await prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        purchases: {
          include: {
            warehouse: { select: { name: true } },
            _count: { select: { details: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    return res.json({ data: supplier });
  } catch (err: any) {
    console.error("GET /api/suppliers/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch supplier details" });
  }
});

/**
 * POST /api/suppliers
 * Create a new supplier record
 */
suppliersRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
      const t = await prisma.tenant.findFirst();
      tenantId = t?.id || "tenant-default-001";
    }

    const { name, email, phone, gstin, address, city, country } = req.body;

    if (!name || String(name).trim() === "") {
      return res.status(400).json({ error: "Supplier name is required" });
    }

    const supplier = await prisma.supplier.create({
      data: {
        tenantId,
        name: String(name).trim(),
        email: email ? String(email).trim() : null,
        phone: phone ? String(phone).trim() : null,
        gstin: gstin ? String(gstin).trim().toUpperCase() : null,
        address: address ? String(address).trim() : null,
        city: city ? String(city).trim() : null,
        country: country ? String(country).trim() : "India",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: supplier,
    });
  } catch (err: any) {
    console.error("POST /api/suppliers error:", err);
    return res.status(500).json({ error: err.message || "Failed to create supplier" });
  }
});

/**
 * PUT /api/suppliers/:id
 * Update an existing supplier
 */
suppliersRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
      const t = await prisma.tenant.findFirst();
      tenantId = t?.id || "tenant-default-001";
    }
    const { id } = req.params;
    const { name, email, phone, gstin, address, city, country } = req.body;

    const existing = await prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Supplier not found or unauthorized" });
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(email !== undefined && { email: email ? String(email).trim() : null }),
        ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
        ...(gstin !== undefined && { gstin: gstin ? String(gstin).trim().toUpperCase() : null }),
        ...(address !== undefined && { address: address ? String(address).trim() : null }),
        ...(city !== undefined && { city: city ? String(city).trim() : null }),
        ...(country !== undefined && { country: country ? String(country).trim() : "India" }),
      },
    });

    return res.json({
      success: true,
      message: "Supplier updated successfully",
      data: updated,
    });
  } catch (err: any) {
    console.error("PUT /api/suppliers/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to update supplier" });
  }
});

/**
 * DELETE /api/suppliers/:id
 * Delete supplier if no purchases linked
 */
suppliersRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
      const t = await prisma.tenant.findFirst();
      tenantId = t?.id || "tenant-default-001";
    }
    const { id } = req.params;

    const existing = await prisma.supplier.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { purchases: true } } },
    });

    if (!existing) {
      return res.status(404).json({ error: "Supplier not found or unauthorized" });
    }

    if (existing._count.purchases > 0) {
      return res.status(400).json({
        error: `Cannot delete supplier: ${existing._count.purchases} purchase orders are linked to this supplier.`,
      });
    }

    await prisma.supplier.delete({ where: { id } });

    return res.json({
      success: true,
      message: "Supplier removed successfully",
    });
  } catch (err: any) {
    console.error("DELETE /api/suppliers/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete supplier" });
  }
});
