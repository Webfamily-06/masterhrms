import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { resolveTenantId } from "../lib/tenant";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";

export const customersRouter = Router();

// Enforce Request-Scoped Tenant Context on all customer endpoints
customersRouter.use(requireAuth, resolveTenantContext);

/**
 * GET /api/customers
 * List customers with AR metrics (Stocky Rule 0: Universal Query Contract)
 */
customersRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const pagination = parsePaginationParams(req, "name", 50);
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
      : "name";

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        include: {
          _count: { select: { sales: true } },
          sales: {
            select: { total: true, paidAmount: true, paymentStatus: true },
          },
        },
        orderBy: { [sortField]: pagination.sortType },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    const formatted = customers.map((c) => {
      const activeSales = c.sales;
      const totalInvoiced = activeSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
      const totalPaid = activeSales.reduce((sum, s) => sum + Number(s.paidAmount || 0), 0);
      const outstandingReceivable = Math.max(0, totalInvoiced - totalPaid);

      return {
        id: c.id,
        name: c.name,
        email: c.email || "",
        phone: c.phone || "",
        gstin: c.gstin || "",
        address: c.address || "",
        city: c.city || "",
        state: c.state || "",
        country: c.country || "India",
        postalCode: c.postalCode || "",
        creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
        notes: c.notes || "",
        ordersCount: c._count?.sales || 0,
        totalInvoiced,
        totalPaid,
        outstandingReceivable,
        hasOutstandingBalance: outstandingReceivable > 0,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(formatted, total, pagination));
    }

    res.setHeader("X-Total-Count", String(total));
    return res.json(formatted);
  } catch (err: any) {
    console.error("Customers GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch customers" });
  }
});

/**
 * GET /api/customers/ar-summary
 * Tenant-wide Accounts Receivable (AR) executive metrics
 */
customersRouter.get("/ar-summary", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const sales = await prisma.sale.findMany({
      where: { tenantId },
      select: { total: true, paidAmount: true, paymentStatus: true, customerId: true },
    });

    const totalInvoiced = sales.reduce((s, sale) => s + Number(sale.total || 0), 0);
    const totalCollected = sales.reduce((s, sale) => s + Number(sale.paidAmount || 0), 0);
    const outstandingReceivable = Math.max(0, totalInvoiced - totalCollected);
    const unpaidInvoicesCount = sales.filter((s) => s.paymentStatus !== "paid").length;
    const debtorsWithOpenAR = new Set(
      sales.filter((s) => s.paymentStatus !== "paid" && s.customerId).map((s) => s.customerId)
    ).size;

    return res.json({
      data: {
        totalInvoiced,
        totalCollected,
        outstandingReceivable,
        unpaidInvoicesCount,
        debtorsWithOpenAR,
      },
    });
  } catch (err: any) {
    console.error("GET /api/customers/ar-summary error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch AR summary" });
  }
});

/**
 * GET /api/customers/:id
 * Get single customer with sales history and AR metrics
 */
customersRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        sales: {
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

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const totalInvoiced = customer.sales.reduce((s, sale) => s + Number(sale.total || 0), 0);
    const totalPaid = customer.sales.reduce((s, sale) => s + Number(sale.paidAmount || 0), 0);
    const outstandingReceivable = Math.max(0, totalInvoiced - totalPaid);

    return res.json({
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        gstin: customer.gstin,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        country: customer.country,
        postalCode: customer.postalCode,
        creditLimit: customer.creditLimit ? Number(customer.creditLimit) : null,
        notes: customer.notes,
        totalInvoiced,
        totalPaid,
        outstandingReceivable,
        hasOutstandingBalance: outstandingReceivable > 0,
        salesCount: customer.sales.length,
        recentSales: customer.sales.map((s) => ({
          id: s.id,
          invoiceNo: s.invoiceNo,
          type: s.type,
          date: s.date.toISOString(),
          total: Number(s.total),
          paidAmount: Number(s.paidAmount),
          remainingBalance: Math.max(0, Number(s.total) - Number(s.paidAmount)),
          paymentStatus: s.paymentStatus,
          paymentMethod: s.paymentMethod,
          warehouseName: s.warehouse?.name || "Main Warehouse",
          itemsCount: s._count?.details || 0,
          paymentsCount: s.payments?.length || 0,
        })),
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("GET /api/customers/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch customer" });
  }
});

/**
 * GET /api/customers/:id/payments
 * Get complete payment history stream for a single customer across all sales
 */
customersRouter.get("/:id/payments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId },
      select: { id: true, name: true },
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const sales = await prisma.sale.findMany({
      where: { customerId: id, tenantId },
      select: { id: true, invoiceNo: true },
    });

    const saleIds = sales.map((s) => s.id);
    const saleMap = new Map(sales.map((s) => [s.id, s.invoiceNo]));

    const payments = await prisma.salePayment.findMany({
      where: { saleId: { in: saleIds } },
      orderBy: { paidAt: "desc" },
    });

    return res.json({
      data: payments.map((p) => ({
        id: p.id,
        saleId: p.saleId,
        invoiceNo: saleMap.get(p.saleId) || "—",
        amount: Number(p.amount),
        method: p.method,
        referenceNo: p.referenceNo,
        notes: (p as any).notes || "",
        paidAt: p.paidAt.toISOString(),
      })),
    });
  } catch (err: any) {
    console.error("GET /api/customers/:id/payments error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch customer payments" });
  }
});

// POST /api/customers - Create a customer
customersRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const body = req.body;

    if (!body.name || !body.name.trim()) {
      return res.status(400).json({ error: "Customer name is required" });
    }

    const customer = await prisma.customer.create({
      data: {
        tenantId,
        name: body.name.trim(),
        email: body.email || null,
        phone: body.phone || null,
        gstin: body.gstin || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        country: body.country || "India",
        postalCode: body.postalCode || null,
        creditLimit: body.creditLimit ? Number(body.creditLimit) : null,
        notes: body.notes || null,
      },
    });

    return res.status(201).json(customer);
  } catch (err: any) {
    console.error("Customers POST error:", err);
    return res.status(500).json({ error: err.message || "Failed to create customer" });
  }
});

// PUT /api/customers/:id - Update customer
customersRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.customer.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name.trim() : existing.name,
        email: body.email !== undefined ? body.email : existing.email,
        phone: body.phone !== undefined ? body.phone : existing.phone,
        gstin: body.gstin !== undefined ? body.gstin : existing.gstin,
        address: body.address !== undefined ? body.address : existing.address,
        city: body.city !== undefined ? body.city : existing.city,
        state: body.state !== undefined ? body.state : existing.state,
        country: body.country !== undefined ? body.country : existing.country,
        postalCode: body.postalCode !== undefined ? body.postalCode : existing.postalCode,
        creditLimit: body.creditLimit !== undefined ? Number(body.creditLimit) : existing.creditLimit,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    console.error("Customers PUT error:", err);
    return res.status(500).json({ error: err.message || "Failed to update customer" });
  }
});

// DELETE /api/customers/:id - Delete customer
customersRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    await prisma.customer.deleteMany({
      where: { id, tenantId },
    });

    return res.json({ success: true, message: "Customer deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete customer" });
  }
});
