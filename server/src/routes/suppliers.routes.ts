import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { resolveTenantId } from "../lib/tenant";

import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";

export const suppliersRouter = Router();

// Enforce Request-Scoped Tenant Context on all supplier endpoints
suppliersRouter.use(requireAuth, resolveTenantContext);

/**
 * GET /api/suppliers
 * List all suppliers for the active tenant with search and analytics (Stocky Rule 0: Universal Query Contract)
 */
suppliersRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const pagination = parsePaginationParams(req, "createdAt", 50);
    const where: any = { tenantId };

    const searchQuery = pagination.search || (typeof req.query.search === "string" ? req.query.search.trim() : "");
    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery } },
        { email: { contains: searchQuery } },
        { phone: { contains: searchQuery } },
        { gstin: { contains: searchQuery } },
        { city: { contains: searchQuery } },
      ];
    }

    const sortField = ["name", "email", "phone", "city", "createdAt", "updatedAt"].includes(pagination.sortField)
      ? pagination.sortField
      : "createdAt";

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        include: {
          _count: { select: { purchases: true } },
          purchases: {
            select: { total: true, paidAmount: true, paymentStatus: true, status: true },
          },
        },
        orderBy: { [sortField]: pagination.sortType },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    const formatted = suppliers.map((s) => {
      const activePurchases = s.purchases.filter((p) => p.status !== "cancelled");
      const totalPurchasesAmount = activePurchases.reduce((sum, p) => sum + Number(p.total || 0), 0);
      const totalPaid = activePurchases.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);
      const outstandingBalance = Math.max(0, totalPurchasesAmount - totalPaid);
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
        totalPaid,
        outstandingBalance,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(formatted, total, pagination));
    }

    res.setHeader("X-Total-Count", String(total));
    return res.json({ data: formatted });
  } catch (err: any) {
    console.error("GET /api/suppliers error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch suppliers" });
  }
});

/**
 * GET /api/suppliers/ap-summary
 * Tenant-wide Accounts Payable summary: total payable, total paid, outstanding balance,
 * and count of suppliers with open payables. Used by the AP KPI card on the Purchases page.
 */
suppliersRouter.get("/ap-summary", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const purchases = await prisma.purchase.findMany({
      where: { tenantId, status: { not: "cancelled" } },
      select: { total: true, paidAmount: true, paymentStatus: true, supplierId: true },
    });

    const totalPayable = purchases.reduce((s, p) => s + Number(p.total || 0), 0);
    const totalPaid = purchases.reduce((s, p) => s + Number(p.paidAmount || 0), 0);
    const outstanding = Math.max(0, totalPayable - totalPaid);
    const unpaidCount = purchases.filter((p) => p.paymentStatus !== "paid").length;
    const suppliersWithOpenAP = new Set(
      purchases.filter((p) => p.paymentStatus !== "paid" && p.supplierId).map((p) => p.supplierId)
    ).size;

    return res.json({
      data: {
        totalPayable,
        totalPaid,
        outstanding,
        unpaidCount,
        suppliersWithOpenAP,
      },
    });
  } catch (err: any) {
    console.error("GET /api/suppliers/ap-summary error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch AP summary" });
  }
});

/**
 * GET /api/suppliers/:id
 * Get single supplier with purchase orders history
 */
suppliersRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    const supplier = await prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        purchases: {
          include: {
            warehouse: { select: { name: true } },
            _count: { select: { details: true } },
            payments: { orderBy: { paidAt: "asc" } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    // Compute AP metrics for this supplier
    const activePurchases = supplier.purchases.filter((p) => p.status !== "cancelled");
    const totalPayable = activePurchases.reduce((s, p) => s + Number(p.total || 0), 0);
    const totalPaid = activePurchases.reduce((s, p) => s + Number(p.paidAmount || 0), 0);
    const outstandingBalance = Math.max(0, totalPayable - totalPaid);

    return res.json({
      data: {
        ...supplier,
        apMetrics: { totalPayable, totalPaid, outstandingBalance },
      },
    });
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
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

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
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
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
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
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
