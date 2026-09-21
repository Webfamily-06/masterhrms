import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, requirePermission, AuthRequest } from "../middleware/auth";
import { broadcastToTenant } from "../socket";

export const crmRouter = Router();

// ==========================================
// CRM LEADS (Relational MySQL backed)
// ==========================================

// GET /api/crm/leads - List all leads for tenant
crmRouter.get("/leads", requireAuth, requirePermission("crm.leads.view"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";

    const dbLeads = await prisma.crmLead.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    if (dbLeads.length > 0) {
      return res.json(
        dbLeads.map((l) => ({
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
        }))
      );
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
      const migrated = await prisma.crmLead.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });
      return res.json(
        migrated.map((l) => ({
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
        }))
      );
    }

    return res.json([]);
  } catch (err: any) {
    console.error("CRM Leads GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch CRM leads" });
  }
});

// POST /api/crm/leads - Create new lead
crmRouter.post("/leads", requireAuth, requirePermission("crm.leads.create"), async (req: AuthRequest, res: Response) => {
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
crmRouter.put("/leads/:id", requireAuth, requirePermission("crm.leads.edit"), async (req: AuthRequest, res: Response) => {
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
crmRouter.delete("/leads/:id", requireAuth, requirePermission("crm.leads.delete"), async (req: AuthRequest, res: Response) => {
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
crmRouter.get("/proposals", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";

    const proposals = await prisma.crmProposal.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    if (proposals.length > 0) {
      return res.json(
        proposals.map((p) => ({
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
        }))
      );
    }

    // Fallback to legacy CMS page
    const slug = `system-proposals-${tenantId}`;
    const page = await prisma.cmsPage.findUnique({ where: { slug } });
    const list = page?.content && Array.isArray(page.content) ? page.content : [];
    return res.json(list);
  } catch (err: any) {
    console.error("Proposals GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch proposals" });
  }
});

// POST /api/crm/proposals - Create proposal
crmRouter.post("/proposals", requireAuth, async (req: AuthRequest, res: Response) => {
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
crmRouter.patch("/proposals/:id", requireAuth, async (req: AuthRequest, res: Response) => {
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
crmRouter.post("/proposals/:id/convert", requireAuth, async (req: AuthRequest, res: Response) => {
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

// DELETE /api/crm/proposals/:id - Delete proposal
crmRouter.delete("/proposals/:id", requireAuth, async (req: AuthRequest, res: Response) => {
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

