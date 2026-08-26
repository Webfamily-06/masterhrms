import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const crmRouter = Router();

// GET /api/crm/leads
crmRouter.get("/leads", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const slug = `system-crm-leads-${tenantId}`;

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    const list = page?.content && Array.isArray(page.content) ? page.content : [];
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/crm/leads
crmRouter.post("/leads", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const slug = `system-crm-leads-${tenantId}`;

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    const currentList: any[] = page?.content && Array.isArray(page.content) ? (page.content as any[]) : [];

    const newLead = {
      ...req.body,
      id: req.body.id || `LEAD-${Date.now()}`,
      createdAt: new Date().toISOString(),
      stage: req.body.stage || "new",
      value: Number(req.body.value) || 0,
    };

    const updatedList = [newLead, ...currentList];

    await prisma.cmsPage.upsert({
      where: { slug },
      update: { content: updatedList, updatedAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        slug,
        title: "CRM Leads Pipeline",
        content: updatedList,
        published: true,
      },
    });

    return res.status(201).json(newLead);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// PUT /api/crm/leads/:id
crmRouter.put("/leads/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const slug = `system-crm-leads-${tenantId}`;

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    const currentList: any[] = page?.content && Array.isArray(page.content) ? (page.content as any[]) : [];

    const updatedList = currentList.map((lead) => (lead.id === id ? { ...lead, ...req.body } : lead));

    await prisma.cmsPage.upsert({
      where: { slug },
      update: { content: updatedList, updatedAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        slug,
        title: "CRM Leads Pipeline",
        content: updatedList,
        published: true,
      },
    });

    return res.json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// DELETE /api/crm/leads/:id
crmRouter.delete("/leads/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const slug = `system-crm-leads-${tenantId}`;

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    const currentList: any[] = page?.content && Array.isArray(page.content) ? (page.content as any[]) : [];

    const updatedList = currentList.filter((lead) => lead.id !== id);

    await prisma.cmsPage.upsert({
      where: { slug },
      update: { content: updatedList, updatedAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        slug,
        title: "CRM Leads Pipeline",
        content: updatedList,
        published: true,
      },
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/crm/proposals
crmRouter.get("/proposals", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const slug = `system-proposals-${tenantId}`;

    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    const list = page?.content && Array.isArray(page.content) ? page.content : [];
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/crm/proposals
crmRouter.post("/proposals", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const slug = `system-proposals-${tenantId}`;

    const { proposals } = req.body;
    await prisma.cmsPage.upsert({
      where: { slug },
      update: { content: proposals ?? [], updatedAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        slug,
        title: "Client Proposals",
        content: proposals ?? [],
        published: true,
      },
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});
