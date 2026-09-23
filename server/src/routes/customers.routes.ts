import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantId } from "../lib/tenant";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";

export const customersRouter = Router();

// GET /api/customers - List customers (Stocky Rule 0: Universal Query Contract)
customersRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const pagination = parsePaginationParams(req, "name", 50);
    const where: any = { tenantId };

    if (pagination.search) {
      where.OR = [
        { name: { contains: pagination.search } },
        { email: { contains: pagination.search } },
        { phone: { contains: pagination.search } },
        { gstin: { contains: pagination.search } },
        { city: { contains: pagination.search } },
      ];
    }

    const sortField = ["name", "email", "phone", "city", "createdAt", "updatedAt"].includes(pagination.sortField)
      ? pagination.sortField
      : "name";

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        orderBy: { [sortField]: pagination.sortType },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(customers, total, pagination));
    }

    res.setHeader("X-Total-Count", String(total));
    return res.json(customers);
  } catch (err: any) {
    console.error("Customers GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch customers" });
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
