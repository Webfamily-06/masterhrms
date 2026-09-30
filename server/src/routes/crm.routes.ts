import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, requirePermission, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { broadcastToTenant } from "../socket";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";

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

    if (dbLeads.length > 0) {
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
    }

    // Auto-migrate from legacy CMS page if exists
    const slug = `system-crm-leads-${tenantId}`;
    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    const legacyList = page?.content && Array.isArray(page.content) ? page.content : [];

    if (legacyList.length > 0) {
      for (const rawItem of legacyList) {
        const item = rawItem as any;
        if (!item || typeof item !== "object") continue;
        try {
          await prisma.crmLead.create({
            data: {
              tenantId,
              title: item.title || item.name || "Lead",
              contactName: item.name || item.contactName || "Contact",
              company: item.company || null,
              email: item.email || null,
              phone: item.phone || null,
              stage: item.stage || "new",
              value: Number(item.value || 0),
              priority: item.priority || "medium",
              source: item.source || "Direct",
              notes: item.notes || null,
            },
          });
        } catch {}
      }
      const [migratedTotal, migrated] = await Promise.all([
        prisma.crmLead.count({ where: { tenantId } }),
        prisma.crmLead.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
        }),
      ]);
      const formatted = migrated.map((l) => ({
        id: l.id,
        name: l.contactName || l.title,
        title: l.title,
        company: l.company || "",
        email: l.email || "",
        phone: l.phone || "",
        value: Number(l.value),
        stage: l.stage,
        priority: l.priority,
        source: l.source || "Direct",
        notes: l.notes || "",
        createdAt: l.createdAt.toISOString(),
      }));

      if (pagination.isPaginated) {
        return res.json(formatPaginatedResponse(formatted, migratedTotal, pagination));
      }

      res.setHeader("X-Total-Count", String(migratedTotal));
      return res.json(formatted);
    }

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse([], 0, pagination));
    }

    res.setHeader("X-Total-Count", "0");
    return res.json([]);
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

    if (proposals.length > 0) {
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
    }

    // Fallback to legacy CMS page
    const slug = `system-proposals-${tenantId}`;
    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    const list = page?.content && Array.isArray(page.content) ? page.content : [];

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(list, list.length, pagination));
    }

    res.setHeader("X-Total-Count", String(list.length));
    return res.json(list);
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
