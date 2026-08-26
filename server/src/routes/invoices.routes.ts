import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const invoicesRouter = Router();

// GET /api/invoices
invoicesRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const slug = `system-invoices-records-${tenantId}`;

    const page = await prisma.cmsPage.findUnique({
      where: { slug },
    });

    const list = page?.content && Array.isArray(page.content) ? page.content : [];
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/invoices
invoicesRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const slug = `system-invoices-records-${tenantId}`;

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    const currentList: any[] = page?.content && Array.isArray(page.content) ? (page.content as any[]) : [];

    const newInvoice = {
      ...req.body,
      id: req.body.id || `INV-${Date.now()}`,
      createdAt: new Date().toISOString(),
      tenantId,
    };

    const updatedList = [newInvoice, ...currentList];

    await prisma.cmsPage.upsert({
      where: { slug },
      update: { content: updatedList, updatedAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        slug,
        title: "Invoices Ledger",
        content: updatedList,
        published: true,
      },
    });

    return res.status(201).json(newInvoice);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// PUT /api/invoices/:id
invoicesRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const slug = `system-invoices-records-${tenantId}`;

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    const currentList: any[] = page?.content && Array.isArray(page.content) ? (page.content as any[]) : [];

    const updatedList = currentList.map((inv) => (inv.id === id ? { ...inv, ...req.body } : inv));

    await prisma.cmsPage.upsert({
      where: { slug },
      update: { content: updatedList, updatedAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        slug,
        title: "Invoices Ledger",
        content: updatedList,
        published: true,
      },
    });

    return res.json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// DELETE /api/invoices/:id
invoicesRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const slug = `system-invoices-records-${tenantId}`;

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    const currentList: any[] = page?.content && Array.isArray(page.content) ? (page.content as any[]) : [];

    const updatedList = currentList.filter((inv) => inv.id !== id);

    await prisma.cmsPage.upsert({
      where: { slug },
      update: { content: updatedList, updatedAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        slug,
        title: "Invoices Ledger",
        content: updatedList,
        published: true,
      },
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/invoices/pos/sales
invoicesRouter.get("/pos/sales", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const slug = `system-pos-sales-${tenantId}`;

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    const list = page?.content && Array.isArray(page.content) ? page.content : [];
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/invoices/pos/sales
invoicesRouter.post("/pos/sales", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const slug = `system-pos-sales-${tenantId}`;

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    const currentList: any[] = page?.content && Array.isArray(page.content) ? (page.content as any[]) : [];

    const newSale = {
      ...req.body,
      id: req.body.id || `POS-${Date.now()}`,
      completedAt: new Date().toISOString(),
      cashier: req.user?.email || "Admin Cashier",
    };

    const updatedList = [newSale, ...currentList];

    await prisma.cmsPage.upsert({
      where: { slug },
      update: { content: updatedList, updatedAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        slug,
        title: "POS Sales Log",
        content: updatedList,
        published: true,
      },
    });

    return res.status(201).json(newSale);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/invoices/pos/held
invoicesRouter.get("/pos/held", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const slug = `system-pos-held-${tenantId}`;

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    const list = page?.content && Array.isArray(page.content) ? page.content : [];
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/invoices/pos/held
invoicesRouter.post("/pos/held", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const slug = `system-pos-held-${tenantId}`;

    const { heldOrders } = req.body;
    await prisma.cmsPage.upsert({
      where: { slug },
      update: { content: heldOrders ?? [], updatedAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        slug,
        title: "POS Held Orders",
        content: heldOrders ?? [],
        published: true,
      },
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});
