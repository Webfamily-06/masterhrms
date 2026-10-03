import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, requirePermission, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { broadcastToTenant } from "../socket";
import { parsePaginationParams, formatPaginatedResponse, parsePagination, paginate } from "../lib/pagination";

export const crmRouter = Router();

// ==========================================
// CRM LEADS (Relational MySQL backed)
// ==========================================

// GET /api/crm/leads - List all leads for tenant
crmRouter.get("/leads", requireAuth, resolveTenantContext, requirePermission("crm.leads.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const pagination = parsePaginationParams(req, "createdAt", 20);

    const [total, dbLeads] = await Promise.all([
      prisma.crmLead.count({ where: { tenantId } }),
      prisma.crmLead.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    const formatted = dbLeads.map((l) => ({
      id: l.id,
      name: l.contactName || l.title,
      title: l.title,
      contactName: l.contactName,
      company: l.company || "",
      email: l.email || "",
      phone: l.phone || "",
      value: Number(l.value),
      stage: l.stage,
      priority: l.priority,
      source: l.source || "Direct",
      notes: l.notes || "",
      assignedTo: l.assignedTo || "",
      createdAt: l.createdAt.toISOString(),
    }));

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(formatted, total, pagination));
    }

    res.setHeader("X-Total-Count", String(total));
    return res.json(formatted);
  } catch (err: any) {
    console.error("CRM Leads GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch CRM leads" });
  }
});

// POST /api/crm/leads - Create new lead
crmRouter.post("/leads", requireAuth, resolveTenantContext, requirePermission("crm.leads.create"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const body = req.body;

    const name = body.name || body.contactName || body.title || "New Prospect";
    const lead = await prisma.crmLead.create({
      data: {
        tenantId,
        title: body.title || name,
        contactName: name,
        company: body.company || null,
        email: body.email || null,
        phone: body.phone || null,
        stage: body.stage || "lead",
        value: Number(body.value || 0),
        priority: body.priority || "medium",
        source: body.source || "Inbound",
        notes: body.notes || null,
        assignedTo: body.assignedTo || null,
      },
    });

    return res.status(201).json({
      id: lead.id,
      name: lead.contactName,
      title: lead.title,
      company: lead.company || "",
      email: lead.email || "",
      phone: lead.phone || "",
      value: Number(lead.value),
      stage: lead.stage,
      priority: lead.priority,
      source: lead.source || "",
      notes: lead.notes || "",
      createdAt: lead.createdAt.toISOString(),
    });
  } catch (err: any) {
    console.error("CRM Leads POST error:", err);
    return res.status(500).json({ error: err.message || "Failed to create CRM lead" });
  }
});

// PUT /api/crm/leads/:id - Update lead details or drag-and-drop stage
crmRouter.put("/leads/:id", requireAuth, resolveTenantContext, requirePermission("crm.leads.edit"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const body = req.body;

    const dataToUpdate: any = {};
    if (body.name !== undefined) {
      dataToUpdate.contactName = body.name;
      dataToUpdate.title = body.title || body.name;
    }
    if (body.title !== undefined) dataToUpdate.title = body.title;
    if (body.company !== undefined) dataToUpdate.company = body.company;
    if (body.email !== undefined) dataToUpdate.email = body.email;
    if (body.phone !== undefined) dataToUpdate.phone = body.phone;
    if (body.stage !== undefined) dataToUpdate.stage = body.stage;
    if (body.value !== undefined) dataToUpdate.value = Number(body.value);
    if (body.priority !== undefined) dataToUpdate.priority = body.priority;
    if (body.source !== undefined) dataToUpdate.source = body.source;
    if (body.notes !== undefined) dataToUpdate.notes = body.notes;
    if (body.assignedTo !== undefined) dataToUpdate.assignedTo = body.assignedTo;

    await prisma.crmLead.updateMany({
      where: { id, tenantId },
      data: dataToUpdate,
    });

    return res.json({ success: true, id });
  } catch (err: any) {
    console.error("CRM Leads PUT error:", err);
    return res.status(500).json({ error: err.message || "Failed to update CRM lead" });
  }
});

// DELETE /api/crm/leads/:id - Remove lead
crmRouter.delete("/leads/:id", requireAuth, resolveTenantContext, requirePermission("crm.leads.delete"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;

    await prisma.crmLead.deleteMany({
      where: { id, tenantId },
    });

    return res.json({ success: true, message: "Lead removed" });
  } catch (err: any) {
    console.error("CRM Leads DELETE error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete CRM lead" });
  }
});

// ==========================================
// CRM DEALS (Relational DB backed)
// ==========================================

// GET /api/crm/deals - List deals with pagination, stage/status filter, search
crmRouter.get("/deals", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const pagination = parsePagination(req.query, ["createdAt", "value", "stage", "name", "closeDate"]);
    const { stage, status } = req.query;
    const search = pagination.search;

    const where: any = { tenantId };
    if (stage && stage !== "all") where.stage = String(stage);
    if (status && status !== "all") where.status = String(status);
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { customer: { contains: search, mode: "insensitive" } },
        { owner: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, deals] = await Promise.all([
      prisma.crmDeal.count({ where }),
      prisma.crmDeal.findMany({
        where,
        orderBy: pagination.orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    const items = deals.map((d) => ({
      id: d.id,
      name: d.name,
      customer: d.customer,
      stage: d.stage,
      value: Number(d.value),
      closeDate: d.closeDate ? d.closeDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "",
      closeDateRaw: d.closeDate ? d.closeDate.toISOString() : null,
      probability: d.probability,
      owner: d.owner || "Deal Specialist",
      ownerAvatar: d.ownerAvatar || "/ui-assets/avatar-01.jpg",
      status: d.status,
      notes: d.notes || "",
      pipelineId: d.pipelineId || null,
      leadId: d.leadId || null,
      createdAt: d.createdAt.toISOString(),
    }));

    res.setHeader("X-Total-Count", String(total));
    return res.json({
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("CRM Deals GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch CRM deals" });
  }
});

// GET /api/crm/deals/:id - Single deal
crmRouter.get("/deals/:id", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;

    const deal = await prisma.crmDeal.findFirst({
      where: { id, tenantId },
    });

    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }

    return res.json({
      id: deal.id,
      name: deal.name,
      customer: deal.customer,
      stage: deal.stage,
      value: Number(deal.value),
      closeDate: deal.closeDate ? deal.closeDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "",
      closeDateRaw: deal.closeDate ? deal.closeDate.toISOString() : null,
      probability: deal.probability,
      owner: deal.owner || "Deal Specialist",
      ownerAvatar: deal.ownerAvatar || "/ui-assets/avatar-01.jpg",
      status: deal.status,
      notes: deal.notes || "",
      pipelineId: deal.pipelineId || null,
      leadId: deal.leadId || null,
      createdAt: deal.createdAt.toISOString(),
    });
  } catch (err: any) {
    console.error("CRM Deal GET :id error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch CRM deal" });
  }
});

// POST /api/crm/deals - Create deal
crmRouter.post("/deals", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const body = req.body;

    if (!body.name || !body.customer) {
      return res.status(400).json({ error: "Deal name and customer are required" });
    }

    const stage = body.stage || "Proposal";
    const status = stage === "Won" ? "Won" : stage === "Lost" ? "Lost" : (body.status || "Open");
    const closeDate = body.closeDate ? new Date(body.closeDate) : null;

    const deal = await prisma.crmDeal.create({
      data: {
        tenantId,
        name: body.name,
        customer: body.customer,
        stage,
        value: Number(body.value || 0),
        closeDate: isNaN(closeDate?.getTime() || NaN) ? null : closeDate,
        probability: Number(body.probability || 50),
        owner: body.owner || "Deal Specialist",
        ownerAvatar: body.ownerAvatar || "/ui-assets/avatar-01.jpg",
        status,
        notes: body.notes || null,
        pipelineId: body.pipelineId || null,
        leadId: body.leadId || null,
      },
    });

    broadcastToTenant(tenantId, "crm:deal:created", {
      id: deal.id,
      name: deal.name,
      customer: deal.customer,
      stage: deal.stage,
      value: Number(deal.value),
      status: deal.status,
    });

    return res.status(201).json({
      id: deal.id,
      name: deal.name,
      customer: deal.customer,
      stage: deal.stage,
      value: Number(deal.value),
      closeDate: deal.closeDate ? deal.closeDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "",
      probability: deal.probability,
      owner: deal.owner,
      status: deal.status,
      createdAt: deal.createdAt.toISOString(),
    });
  } catch (err: any) {
    console.error("CRM Deals POST error:", err);
    return res.status(500).json({ error: err.message || "Failed to create CRM deal" });
  }
});

// PUT /api/crm/deals/:id - Update deal
crmRouter.put("/deals/:id", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.crmDeal.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Deal not found" });
    }

    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = body.name;
    if (body.customer !== undefined) dataToUpdate.customer = body.customer;
    if (body.stage !== undefined) {
      dataToUpdate.stage = body.stage;
      if (body.stage === "Won") dataToUpdate.status = "Won";
      else if (body.stage === "Lost") dataToUpdate.status = "Lost";
      else if (!body.status) dataToUpdate.status = "Open";
    }
    if (body.status !== undefined) dataToUpdate.status = body.status;
    if (body.value !== undefined) dataToUpdate.value = Number(body.value);
    if (body.probability !== undefined) dataToUpdate.probability = Number(body.probability);
    if (body.owner !== undefined) dataToUpdate.owner = body.owner;
    if (body.notes !== undefined) dataToUpdate.notes = body.notes;
    if (body.closeDate !== undefined) {
      const parsed = new Date(body.closeDate);
      dataToUpdate.closeDate = isNaN(parsed.getTime()) ? null : parsed;
    }

    const updated = await prisma.crmDeal.update({
      where: { id },
      data: dataToUpdate,
    });

    broadcastToTenant(tenantId, "crm:deal:updated", {
      id: updated.id,
      name: updated.name,
      stage: updated.stage,
      value: Number(updated.value),
      status: updated.status,
    });

    return res.json({ success: true, deal: updated });
  } catch (err: any) {
    console.error("CRM Deals PUT error:", err);
    return res.status(500).json({ error: err.message || "Failed to update CRM deal" });
  }
});

// PATCH /api/crm/deals/:id/stage - Update stage
crmRouter.patch("/deals/:id/stage", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const { stage } = req.body;

    if (!stage) {
      return res.status(400).json({ error: "Stage is required" });
    }

    const existing = await prisma.crmDeal.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Deal not found" });
    }

    const status = stage === "Won" ? "Won" : stage === "Lost" ? "Lost" : "Open";
    const updated = await prisma.crmDeal.update({
      where: { id },
      data: { stage, status },
    });

    broadcastToTenant(tenantId, "crm:deal:stageChanged", {
      id: updated.id,
      stage: updated.stage,
      status: updated.status,
    });

    return res.json({ success: true, stage: updated.stage, status: updated.status });
  } catch (err: any) {
    console.error("CRM Deals PATCH stage error:", err);
    return res.status(500).json({ error: err.message || "Failed to update deal stage" });
  }
});

// DELETE /api/crm/deals/:id - Delete deal
crmRouter.delete("/deals/:id", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;

    const existing = await prisma.crmDeal.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Deal not found" });
    }

    await prisma.crmDeal.delete({
      where: { id },
    });

    broadcastToTenant(tenantId, "crm:deal:deleted", { id });

    return res.json({ success: true, message: "Deal deleted" });
  } catch (err: any) {
    console.error("CRM Deals DELETE error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete CRM deal" });
  }
});

// ==========================================
// CRM PROPOSALS & QUOTATIONS
// ==========================================

// GET /api/crm/proposals - List proposals
crmRouter.get("/proposals", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const pagination = parsePaginationParams(req, "createdAt", 20);

    const [total, proposals] = await Promise.all([
      prisma.crmProposal.count({ where: { tenantId } }),
      prisma.crmProposal.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    const formatted = proposals.map((p) => ({
      id: p.id,
      proposalNo: p.proposalNo,
      title: p.title,
      client: p.clientName,
      clientName: p.clientName,
      clientEmail: p.clientEmail || "",
      clientGstin: p.clientGstin || "",
      amount: Number(p.amount),
      status: p.status,
      date: p.validUntil ? p.validUntil.toISOString() : p.createdAt.toISOString(),
      created_at: p.createdAt.toISOString(),
      items: p.items || [],
      terms: p.terms || "",
      notes: p.notes || "",
    }));

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(formatted, total, pagination));
    }

    res.setHeader("X-Total-Count", String(total));
    return res.json(formatted);
  } catch (err: any) {
    console.error("Proposals GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch proposals" });
  }
});

// POST /api/crm/proposals - Create proposal
crmRouter.post("/proposals", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const body = req.body;

    const count = await prisma.crmProposal.count({ where: { tenantId } });
    const proposalNo = `PROP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const created = await prisma.crmProposal.create({
      data: {
        tenantId,
        proposalNo,
        title: body.title || `Quotation for ${body.client || "Client"}`,
        clientName: body.client || body.clientName || "Valued Client",
        clientEmail: body.clientEmail || null,
        clientGstin: body.clientGstin || null,
        amount: Number(body.amount || 0),
        status: body.status || "sent",
        validUntil: body.date ? new Date(body.date) : null,
        items: body.items || null,
        terms: body.terms || "Standard 30 days quotation validity",
        notes: body.notes || null,
      },
    });

    broadcastToTenant(tenantId, "proposal:created", {
      id: created.id,
      proposalNo: created.proposalNo,
      title: created.title,
      client: created.clientName,
      amount: Number(created.amount),
      status: created.status,
    });

    return res.status(201).json({
      id: created.id,
      proposalNo: created.proposalNo,
      title: created.title,
      client: created.clientName,
      clientName: created.clientName,
      clientEmail: created.clientEmail || "",
      clientGstin: created.clientGstin || "",
      amount: Number(created.amount),
      status: created.status,
      date: created.createdAt.toISOString(),
      created_at: created.createdAt.toISOString(),
      terms: created.terms || "",
      notes: created.notes || "",
    });
  } catch (err: any) {
    console.error("Proposals POST error:", err);
    return res.status(500).json({ error: err.message || "Failed to create proposal" });
  }
});

// PATCH /api/crm/proposals/:id - Update proposal status and fields
crmRouter.patch("/proposals/:id", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.crmProposal.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Proposal not found" });
    }

    const updated = await prisma.crmProposal.update({
      where: { id: existing.id },
      data: {
        title: body.title !== undefined ? body.title : existing.title,
        clientName: body.clientName !== undefined ? body.clientName : (body.client !== undefined ? body.client : existing.clientName),
        clientEmail: body.clientEmail !== undefined ? body.clientEmail : existing.clientEmail,
        clientGstin: body.clientGstin !== undefined ? body.clientGstin : existing.clientGstin,
        amount: body.amount !== undefined ? Number(body.amount) : existing.amount,
        status: body.status !== undefined ? body.status : existing.status,
        validUntil: body.date ? new Date(body.date) : (body.validUntil ? new Date(body.validUntil) : existing.validUntil),
        terms: body.terms !== undefined ? body.terms : existing.terms,
        notes: body.notes !== undefined ? body.notes : existing.notes,
        items: body.items !== undefined ? body.items : existing.items,
      },
    });

    broadcastToTenant(tenantId, "proposal:updated", {
      id: updated.id,
      proposalNo: updated.proposalNo,
      status: updated.status,
      title: updated.title,
    });

    return res.json({
      success: true,
      proposal: {
        id: updated.id,
        proposalNo: updated.proposalNo,
        title: updated.title,
        client: updated.clientName,
        clientName: updated.clientName,
        clientEmail: updated.clientEmail || "",
        clientGstin: updated.clientGstin || "",
        amount: Number(updated.amount),
        status: updated.status,
        date: updated.validUntil ? updated.validUntil.toISOString() : updated.createdAt.toISOString(),
        created_at: updated.createdAt.toISOString(),
        terms: updated.terms || "",
        notes: updated.notes || "",
      },
    });
  } catch (err: any) {
    console.error("Proposals PATCH error:", err);
    return res.status(500).json({ error: err.message || "Failed to update proposal" });
  }
});

// POST /api/crm/proposals/:id/convert - One-click convert proposal to formal Sale Invoice
crmRouter.post("/proposals/:id/convert", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;

    const proposal = await prisma.crmProposal.findFirst({
      where: { id, tenantId },
    });

    if (!proposal) {
      return res.status(404).json({ error: "Proposal not found" });
    }

    const count = await prisma.sale.count({ where: { tenantId } });
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Sale record
      const sale = await tx.sale.create({
        data: {
          tenantId,
          invoiceNo,
          type: "invoice",
          customerName: proposal.clientName,
          customerGstin: proposal.clientGstin || "",
          subtotal: proposal.amount,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalTax: 0,
          total: proposal.amount,
          paidAmount: 0,
          paymentStatus: "unpaid",
          notes: `Converted from Proposal ${proposal.proposalNo}: ${proposal.title}`,
        },
      });

      // 2. Mark proposal as converted
      await tx.crmProposal.update({
        where: { id: proposal.id },
        data: { status: "converted" },
      });

      return sale;
    });

    broadcastToTenant(tenantId, "proposal:converted", {
      proposalId: proposal.id,
      invoiceNo: result.invoiceNo,
      saleId: result.id,
    });

    return res.json({
      success: true,
      message: `Proposal converted to Invoice ${result.invoiceNo}`,
      saleId: result.id,
      invoiceNo: result.invoiceNo,
    });
  } catch (err: any) {
    console.error("Proposal Convert error:", err);
    return res.status(500).json({ error: err.message || "Failed to convert proposal" });
  }
});

// POST /api/crm/proposals/:id/convert-to-project - Convert Proposal into active Project with tasks
crmRouter.post("/proposals/:id/convert-to-project", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;

    const proposal = await prisma.crmProposal.findFirst({
      where: { id, tenantId },
    });

    if (!proposal) {
      return res.status(404).json({ error: "Proposal not found" });
    }

    const items = Array.isArray(proposal.items) ? proposal.items : [];

    const project = await prisma.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          tenantId,
          name: `${proposal.title} — ${proposal.clientName}`,
          description: `Client Project generated from Proposal #${proposal.proposalNo}`,
          status: "active",
          budget: Number(proposal.amount || 0),
          startDate: new Date(),
        },
      });

      if (items.length > 0) {
        for (const item of items as any[]) {
          await tx.projectTask.create({
            data: {
              tenantId,
              projectId: createdProject.id,
              title: item.name || item.description || "Project Deliverable Item",
              description: `Deliverable scope item from proposal quotation (Qty: ${item.qty || 1}, Rate: ${item.rate || 0})`,
              status: "todo",
              priority: "medium",
            },
          });
        }
      } else {
        await tx.projectTask.create({
          data: {
            tenantId,
            projectId: createdProject.id,
            title: `Deliverable Scope: ${proposal.title}`,
            description: `Deliverable scope item for ${proposal.clientName}`,
            status: "todo",
            priority: "medium",
          },
        });
      }

      await tx.crmProposal.update({
        where: { id: proposal.id },
        data: { status: "accepted" },
      });

      return createdProject;
    });

    broadcastToTenant(tenantId, "proposal:converted_to_project", {
      proposalId: proposal.id,
      projectId: project.id,
      projectName: project.name,
    });

    return res.status(201).json({
      success: true,
      message: `Proposal #${proposal.proposalNo} converted to Project: ${project.name}`,
      projectId: project.id,
      project,
    });
  } catch (err: any) {
    console.error("Proposal to Project convert error:", err);
    return res.status(500).json({ error: err.message || "Failed to convert proposal to project" });
  }
});

// DELETE /api/crm/proposals/:id - Delete proposal
crmRouter.delete("/proposals/:id", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    await prisma.crmProposal.deleteMany({
      where: { id, tenantId },
    });
    return res.json({ success: true, message: "Proposal deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete proposal" });
  }
});

// ==========================================
// PUBLIC CLIENT QUOTATION SELF-SERVICE PORTAL
// ==========================================

// GET /api/crm/proposals/public/:id - Public Client view of quotation
crmRouter.get("/proposals/public/:id", async (req, res: Response) => {
  try {
    const { id } = req.params;
    const proposal = await prisma.crmProposal.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            timezone: true,
          },
        },
      },
    });

    if (!proposal) {
      return res.status(404).json({ error: "Quotation proposal not found or link has expired." });
    }

    return res.json({
      success: true,
      proposal: {
        id: proposal.id,
        proposalNo: proposal.proposalNo,
        title: proposal.title,
        clientName: proposal.clientName,
        clientEmail: proposal.clientEmail || "",
        clientGstin: proposal.clientGstin || "",
        amount: Number(proposal.amount),
        status: proposal.status,
        validUntil: proposal.validUntil ? proposal.validUntil.toISOString() : null,
        createdAt: proposal.createdAt.toISOString(),
        items: proposal.items || [
          {
            description: proposal.title,
            qty: 1,
            rate: Number(proposal.amount),
            amount: Number(proposal.amount),
          },
        ],
        terms: proposal.terms || "Quotation valid for 30 days. Standard payment terms: Net 15 days upon milestone completion.",
        notes: proposal.notes || "",
        organization: {
          name: proposal.tenant?.name || "Corporate Enterprise",
          logoUrl: proposal.tenant?.logoUrl || null,
        },
      },
    });
  } catch (err: any) {
    console.error("Public Proposal GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to load quotation proposal." });
  }
});

// POST /api/crm/proposals/public/:id/respond - Client Accept or Decline quotation
crmRouter.post("/proposals/public/:id/respond", async (req, res: Response) => {
  try {
    const { id } = req.params;
    const { action, signatureName, notes } = req.body;

    if (!action || !["accept", "decline"].includes(action)) {
      return res.status(400).json({ error: "Invalid response action. Expected 'accept' or 'decline'." });
    }

    const proposal = await prisma.crmProposal.findUnique({ where: { id } });
    if (!proposal) {
      return res.status(404).json({ error: "Quotation proposal not found." });
    }

    if (proposal.status === "accepted" || proposal.status === "converted") {
      return res.status(400).json({ error: `Quotation is already ${proposal.status.toUpperCase()}.` });
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";
    const timestamp = new Date().toLocaleString();
    const signatureNote = action === "accept"
      ? `\n[Digitally Accepted by ${signatureName || proposal.clientName} on ${timestamp}]`
      : `\n[Declined by Client on ${timestamp}: ${notes || "No reason provided"}]`;

    const updated = await prisma.crmProposal.update({
      where: { id },
      data: {
        status: newStatus,
        notes: `${proposal.notes || ""}${signatureNote}`.trim(),
      },
    });

    broadcastToTenant(proposal.tenantId, "proposal:responded", {
      id: updated.id,
      proposalNo: updated.proposalNo,
      clientName: updated.clientName,
      status: updated.status,
      action,
      signatureName,
    });

    return res.json({
      success: true,
      message: action === "accept"
        ? `Quotation #${updated.proposalNo} accepted successfully! Our team has been notified.`
        : `Quotation #${updated.proposalNo} marked as declined.`,
      status: updated.status,
    });
  } catch (err: any) {
    console.error("Public Proposal Respond error:", err);
    return res.status(500).json({ error: err.message || "Failed to submit proposal response." });
  }
});

// ==========================================
// CRM CONTACTS (Enterprise Directory & Passport)
// ==========================================

// GET /api/crm/contacts - List contacts for tenant
crmRouter.get("/contacts", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const statusParam = typeof req.query.status === "string" ? req.query.status : undefined;
    const sortParam = req.query.sort === "asc" ? "asc" : "desc";
    const searchParam = typeof req.query.search === "string" ? req.query.search.trim() : undefined;

    const where: any = { tenantId };
    if (statusParam && statusParam !== "all") {
      where.status = statusParam;
    }
    if (searchParam) {
      where.OR = [
        { name: { contains: searchParam } },
        { email: { contains: searchParam } },
        { phone: { contains: searchParam } },
        { company: { contains: searchParam } },
        { role: { contains: searchParam } },
        { city: { contains: searchParam } },
      ];
    }

    let contacts = await prisma.crmContact.findMany({
      where,
      orderBy: { createdAt: sortParam },
    });

    // Auto-seed realistic enterprise contacts if table empty for this tenant
    if (contacts.length === 0 && !searchParam && (!statusParam || statusParam === "all")) {
      const initialContacts = [
        {
          tenantId,
          name: "Darlee Robertson",
          email: "darlee@example.com",
          phone: "(163) 2459 315",
          role: "Facility Manager",
          company: "TechCorp Solutions",
          city: "Berlin",
          country: "Germany",
          rating: 4.2,
          owner: (req.user as any)?.fullName || "Admin",
          status: "active",
          social: {
            linkedin: "linkedin.com/in/darlee-robertson",
            twitter: "@darlee_r",
          },
          activities: [
            {
              type: "call",
              title: "Initial Qualification Call",
              date: new Date(Date.now() - 86400000 * 2).toISOString(),
              notes: "Discussed corporate facilities renewal and Q3 requirements.",
            },
            {
              type: "email",
              title: "Quotation Sent",
              date: new Date(Date.now() - 86400000 * 4).toISOString(),
              notes: "Shared standard ERP licensing schedule and implementation terms.",
            },
          ],
          notes: "Key decision maker for European enterprise facilities rollout.",
        },
        {
          tenantId,
          name: "Alexander Kenn",
          email: "alex@example.com",
          phone: "+1 202 555 0173",
          role: "Chief Executive Officer",
          company: "TechCorp Inc",
          city: "New York",
          country: "USA",
          rating: 4.8,
          owner: (req.user as any)?.fullName || "Admin",
          status: "active",
          social: {
            linkedin: "linkedin.com/in/alex-kenn-ceo",
            twitter: "@akenn_tech",
          },
          activities: [
            {
              type: "meeting",
              title: "Executive Strategic Review",
              date: new Date(Date.now() - 86400000).toISOString(),
              notes: "Finalized master multi-tenant subscription terms.",
            },
            {
              type: "call",
              title: "Contract Review Call",
              date: new Date(Date.now() - 86400000 * 3).toISOString(),
              notes: "Addressed SLA and high-availability queries.",
            },
          ],
          notes: "High priority account. Prefers email follow-ups with concise milestone summaries.",
        },
        {
          tenantId,
          name: "Sharon Roy",
          email: "sharon@example.com",
          phone: "(145) 8965 241",
          role: "Software Architect",
          company: "Nova Digital Systems",
          city: "London",
          country: "United Kingdom",
          rating: 4.5,
          owner: (req.user as any)?.fullName || "Admin",
          status: "active",
          social: {
            linkedin: "linkedin.com/in/sharon-roy-arch",
          },
          activities: [
            {
              type: "email",
              title: "API Architecture Specs Exchanged",
              date: new Date(Date.now() - 86400000 * 5).toISOString(),
              notes: "Reviewed REST API and webhook integration capabilities.",
            },
          ],
          notes: "Technical stakeholder evaluating custom POS and ERP integrations.",
        },
        {
          tenantId,
          name: "Vaughn Lewis",
          email: "vaughn@example.com",
          phone: "(178) 6589 423",
          role: "Director of Operations",
          company: "Global Logistics Group",
          city: "Toronto",
          country: "Canada",
          rating: 4.0,
          owner: (req.user as any)?.fullName || "Admin",
          status: "inactive",
          activities: [],
          notes: "Legacy logistics contract on pause until next budget cycle in November.",
        },
      ];

      for (const item of initialContacts) {
        await prisma.crmContact.create({ data: item });
      }

      contacts = await prisma.crmContact.findMany({
        where,
        orderBy: { createdAt: sortParam },
      });
    }

    const formatted = contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email || "",
      phone: c.phone || "",
      role: c.role || "",
      company: c.company || "",
      city: c.city || "",
      country: c.country || "India",
      location: [c.city, c.country].filter(Boolean).join(", ") || "Global",
      rating: Number(c.rating),
      owner: c.owner || "Admin",
      status: c.status as "active" | "inactive",
      social: (c.social as any) || {},
      activities: (c.activities as any) || [],
      notes: c.notes || "",
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return res.json(formatted);
  } catch (err: any) {
    console.error("CRM Contacts GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch CRM contacts" });
  }
});

// POST /api/crm/contacts - Create contact
crmRouter.post("/contacts", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const body = req.body;

    if (!body.name || !body.name.trim()) {
      return res.status(400).json({ error: "Contact name is required." });
    }

    const created = await prisma.crmContact.create({
      data: {
        tenantId,
        name: body.name.trim(),
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        role: body.role?.trim() || null,
        company: body.company?.trim() || null,
        city: body.city?.trim() || null,
        country: body.country?.trim() || "India",
        rating: body.rating !== undefined ? Number(body.rating) : 4.5,
        owner: body.owner || (req.user as any)?.fullName || "Admin",
        status: body.status === "inactive" ? "inactive" : "active",
        social: body.social || {},
        activities: body.activities || [],
        notes: body.notes || null,
      },
    });

    broadcastToTenant(tenantId, "crm:contact:created", { id: created.id, name: created.name });

    return res.status(201).json({
      id: created.id,
      name: created.name,
      email: created.email || "",
      phone: created.phone || "",
      role: created.role || "",
      company: created.company || "",
      city: created.city || "",
      country: created.country || "India",
      location: [created.city, created.country].filter(Boolean).join(", ") || "Global",
      rating: Number(created.rating),
      owner: created.owner || "Admin",
      status: created.status as "active" | "inactive",
      social: (created.social as any) || {},
      activities: (created.activities as any) || [],
      notes: created.notes || "",
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
  } catch (err: any) {
    console.error("CRM Contact POST error:", err);
    return res.status(500).json({ error: err.message || "Failed to create CRM contact" });
  }
});

// PUT /api/crm/contacts/:id - Update contact
crmRouter.put("/contacts/:id", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.crmContact.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Contact not found." });
    }

    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = body.name.trim();
    if (body.email !== undefined) dataToUpdate.email = body.email ? body.email.trim() : null;
    if (body.phone !== undefined) dataToUpdate.phone = body.phone ? body.phone.trim() : null;
    if (body.role !== undefined) dataToUpdate.role = body.role ? body.role.trim() : null;
    if (body.company !== undefined) dataToUpdate.company = body.company ? body.company.trim() : null;
    if (body.city !== undefined) dataToUpdate.city = body.city ? body.city.trim() : null;
    if (body.country !== undefined) dataToUpdate.country = body.country ? body.country.trim() : "India";
    if (body.rating !== undefined) dataToUpdate.rating = Number(body.rating);
    if (body.owner !== undefined) dataToUpdate.owner = body.owner;
    if (body.status !== undefined) dataToUpdate.status = body.status;
    if (body.social !== undefined) dataToUpdate.social = body.social;
    if (body.activities !== undefined) dataToUpdate.activities = body.activities;
    if (body.notes !== undefined) dataToUpdate.notes = body.notes;

    const updated = await prisma.crmContact.update({
      where: { id: existing.id },
      data: dataToUpdate,
    });

    broadcastToTenant(tenantId, "crm:contact:updated", { id: updated.id, name: updated.name });

    return res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email || "",
      phone: updated.phone || "",
      role: updated.role || "",
      company: updated.company || "",
      city: updated.city || "",
      country: updated.country || "India",
      location: [updated.city, updated.country].filter(Boolean).join(", ") || "Global",
      rating: Number(updated.rating),
      owner: updated.owner || "Admin",
      status: updated.status as "active" | "inactive",
      social: (updated.social as any) || {},
      activities: (updated.activities as any) || [],
      notes: updated.notes || "",
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err: any) {
    console.error("CRM Contact PUT error:", err);
    return res.status(500).json({ error: err.message || "Failed to update CRM contact" });
  }
});

// DELETE /api/crm/contacts/:id - Delete contact
crmRouter.delete("/contacts/:id", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;

    const deleted = await prisma.crmContact.deleteMany({
      where: { id, tenantId },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: "Contact not found." });
    }

    broadcastToTenant(tenantId, "crm:contact:deleted", { id });

    return res.json({ success: true, message: "Contact deleted successfully." });
  } catch (err: any) {
    console.error("CRM Contact DELETE error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete CRM contact" });
  }
});


// ==========================================
// CRM COMPANIES (Relational MySQL backed)
// ==========================================

// GET /api/crm/companies - List companies for tenant
crmRouter.get("/companies", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const searchParam = (req.query.search as string)?.trim() || "";

    const where: any = { tenantId };
    if (searchParam) {
      where.OR = [
        { name: { contains: searchParam } },
        { industry: { contains: searchParam } },
        { location: { contains: searchParam } },
      ];
    }

    const companies = await prisma.crmCompany.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const formatted = companies.map((c) => ({
      id: c.id,
      name: c.name,
      industry: c.industry || "",
      employeesCount: c.employeesCount || "1-50",
      annualRevenue: Number(c.annualRevenue),
      website: c.website || "",
      location: c.location || "",
      dealsCount: c.dealsCount,
      notes: c.notes || "",
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return res.json(formatted);
  } catch (err: any) {
    console.error("CRM Companies GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch CRM companies" });
  }
});

// POST /api/crm/companies - Create company
crmRouter.post("/companies", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const body = req.body;

    if (!body.name || !body.name.trim()) {
      return res.status(400).json({ error: "Company name is required." });
    }

    const created = await prisma.crmCompany.create({
      data: {
        tenantId,
        name: body.name.trim(),
        industry: body.industry?.trim() || null,
        employeesCount: body.employeesCount || null,
        annualRevenue: body.annualRevenue !== undefined ? Number(body.annualRevenue) : 0,
        website: body.website?.trim() || null,
        location: body.location?.trim() || null,
        dealsCount: 0,
        notes: body.notes || null,
      },
    });

    broadcastToTenant(tenantId, "crm:company:created", { id: created.id, name: created.name });

    return res.status(201).json({
      id: created.id,
      name: created.name,
      industry: created.industry || "",
      employeesCount: created.employeesCount || "1-50",
      annualRevenue: Number(created.annualRevenue),
      website: created.website || "",
      location: created.location || "",
      dealsCount: created.dealsCount,
      notes: created.notes || "",
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
  } catch (err: any) {
    console.error("CRM Company POST error:", err);
    return res.status(500).json({ error: err.message || "Failed to create CRM company" });
  }
});

// PUT /api/crm/companies/:id - Update company
crmRouter.put("/companies/:id", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.crmCompany.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Company not found." });
    }

    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = body.name.trim();
    if (body.industry !== undefined) dataToUpdate.industry = body.industry?.trim() || null;
    if (body.employeesCount !== undefined) dataToUpdate.employeesCount = body.employeesCount;
    if (body.annualRevenue !== undefined) dataToUpdate.annualRevenue = Number(body.annualRevenue);
    if (body.website !== undefined) dataToUpdate.website = body.website?.trim() || null;
    if (body.location !== undefined) dataToUpdate.location = body.location?.trim() || null;
    if (body.dealsCount !== undefined) dataToUpdate.dealsCount = Number(body.dealsCount);
    if (body.notes !== undefined) dataToUpdate.notes = body.notes;

    const updated = await prisma.crmCompany.update({ where: { id: existing.id }, data: dataToUpdate });

    broadcastToTenant(tenantId, "crm:company:updated", { id: updated.id, name: updated.name });

    return res.json({
      id: updated.id,
      name: updated.name,
      industry: updated.industry || "",
      employeesCount: updated.employeesCount || "1-50",
      annualRevenue: Number(updated.annualRevenue),
      website: updated.website || "",
      location: updated.location || "",
      dealsCount: updated.dealsCount,
      notes: updated.notes || "",
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err: any) {
    console.error("CRM Company PUT error:", err);
    return res.status(500).json({ error: err.message || "Failed to update CRM company" });
  }
});

// DELETE /api/crm/companies/:id - Delete company
crmRouter.delete("/companies/:id", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;

    const deleted = await prisma.crmCompany.deleteMany({ where: { id, tenantId } });
    if (deleted.count === 0) {
      return res.status(404).json({ error: "Company not found." });
    }

    broadcastToTenant(tenantId, "crm:company:deleted", { id });
    return res.json({ success: true, message: "Company deleted successfully." });
  } catch (err: any) {
    console.error("CRM Company DELETE error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete CRM company" });
  }
});

// ==========================================
// CALL HISTORY (Relational MySQL backed)
// ==========================================

// GET /api/crm/calls - List call history records
crmRouter.get("/calls", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { search, callType, sort = "desc" } = req.query;

    const where: any = { tenantId };
    if (callType && callType !== "all") {
      where.callType = String(callType);
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { callerName: { contains: q } },
        { callerEmail: { contains: q } },
        { callerPhone: { contains: q } },
      ];
    }

    let calls = await prisma.callHistoryRecord.findMany({
      where,
      orderBy: { callTime: sort === "asc" ? "asc" : "desc" },
    });

    // Auto-seed realistic demo calls if empty
    if (calls.length === 0 && !search && (!callType || callType === "all")) {
      const now = Date.now();
      await prisma.callHistoryRecord.createMany({
        data: [
          {
            tenantId,
            callerName: "Anthony Lewis",
            callerEmail: "anthony@example.com",
            callerPhone: "(123) 4567 890",
            callerAvatarUrl: "https://smarthr.dreamstechnologies.com/html/assets/img/users/user-32.jpg",
            callType: "incoming",
            durationSeconds: 145, // 02:25
            callTime: new Date(now - 2 * 3600 * 1000),
            totalCalls: 20,
            avgCallSeconds: 30,
            avgWaitSeconds: 5,
            status: "completed",
          },
          {
            tenantId,
            callerName: "Brian Villalobos",
            callerEmail: "brian@example.com",
            callerPhone: "(179) 7382 829",
            callerAvatarUrl: "https://smarthr.dreamstechnologies.com/html/assets/img/users/user-09.jpg",
            callType: "outgoing",
            durationSeconds: 70, // 01:10
            callTime: new Date(now - 5 * 3600 * 1000),
            totalCalls: 12,
            avgCallSeconds: 45,
            avgWaitSeconds: 3,
            status: "completed",
          },
          {
            tenantId,
            callerName: "Harvey Smith",
            callerEmail: "harvey@example.com",
            callerPhone: "(184) 2719 738",
            callerAvatarUrl: "https://smarthr.dreamstechnologies.com/html/assets/img/users/user-01.jpg",
            callType: "video",
            durationSeconds: 240, // 04:00
            callTime: new Date(now - 24 * 3600 * 1000),
            totalCalls: 8,
            avgCallSeconds: 120,
            avgWaitSeconds: 10,
            status: "completed",
          },
          {
            tenantId,
            callerName: "Stephan Peralt",
            callerEmail: "peralt@example.com",
            callerPhone: "(193) 7839 748",
            callerAvatarUrl: "https://smarthr.dreamstechnologies.com/html/assets/img/users/user-33.jpg",
            callType: "incoming",
            durationSeconds: 95,
            callTime: new Date(now - 28 * 3600 * 1000),
            totalCalls: 15,
            avgCallSeconds: 25,
            avgWaitSeconds: 4,
            status: "completed",
          },
          {
            tenantId,
            callerName: "Doglas Martini",
            callerEmail: "martni@example.com",
            callerPhone: "(183) 9302 890",
            callerAvatarUrl: "https://smarthr.dreamstechnologies.com/html/assets/img/users/user-34.jpg",
            callType: "outgoing",
            durationSeconds: 65,
            callTime: new Date(now - 48 * 3600 * 1000),
            totalCalls: 18,
            avgCallSeconds: 35,
            avgWaitSeconds: 6,
            status: "completed",
          },
          {
            tenantId,
            callerName: "Lori Broaddus",
            callerEmail: "broaddus@example.com",
            callerPhone: "(168) 8392 823",
            callerAvatarUrl: "https://smarthr.dreamstechnologies.com/html/assets/img/users/user-02.jpg",
            callType: "missed",
            durationSeconds: 0,
            callTime: new Date(now - 72 * 3600 * 1000),
            totalCalls: 5,
            avgCallSeconds: 0,
            avgWaitSeconds: 15,
            status: "missed",
          },
        ],
      });

      calls = await prisma.callHistoryRecord.findMany({
        where,
        orderBy: { callTime: "desc" },
      });
    }

    return res.json(calls);
  } catch (err: any) {
    console.error("CRM Calls GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch call history" });
  }
});

// POST /api/crm/calls - Log a new call
crmRouter.post("/calls", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const {
      callerName,
      callerEmail,
      callerPhone,
      callerAvatarUrl,
      callType = "outgoing",
      durationSeconds = 0,
      notes,
    } = req.body;

    if (!callerName || !callerPhone) {
      return res.status(400).json({ error: "Caller name and phone number are required." });
    }

    const record = await prisma.callHistoryRecord.create({
      data: {
        tenantId,
        callerName: callerName.trim(),
        callerEmail: callerEmail ? callerEmail.trim() : null,
        callerPhone: callerPhone.trim(),
        callerAvatarUrl: callerAvatarUrl || null,
        callType,
        durationSeconds: Number(durationSeconds) || 0,
        callTime: new Date(),
        status: callType === "missed" ? "missed" : "completed",
        notes: notes || null,
      },
    });

    return res.status(201).json(record);
  } catch (err: any) {
    console.error("CRM Calls POST error:", err);
    return res.status(500).json({ error: err.message || "Failed to log call" });
  }
});

// DELETE /api/crm/calls/:id - Delete a call record
crmRouter.delete("/calls/:id", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;

    const deleted = await prisma.callHistoryRecord.deleteMany({
      where: { id, tenantId },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: "Call record not found." });
    }

    return res.json({ success: true, message: "Call record deleted." });
  } catch (err: any) {
    console.error("CRM Calls DELETE error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete call record" });
  }
});

// POST /api/crm/calls/bulk-delete - Delete multiple call records
crmRouter.post("/calls/bulk-delete", requireAuth, resolveTenantContext, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Array of IDs required." });
    }

    const deleted = await prisma.callHistoryRecord.deleteMany({
      where: { id: { in: ids }, tenantId },
    });

    return res.json({ success: true, count: deleted.count });
  } catch (err: any) {
    console.error("CRM Calls Bulk DELETE error:", err);
    return res.status(500).json({ error: err.message || "Failed to bulk delete call records" });
  }
});

