"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crmRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const entitlements_1 = require("../middleware/entitlements");
const socket_1 = require("../socket");
const pagination_1 = require("../lib/pagination");
const audit_service_1 = require("../services/audit.service");
const outbox_service_1 = require("../services/outbox.service");
exports.crmRouter = (0, express_1.Router)();
// Enforce Product CRM Entitlement on all authenticated workspace CRM operations
exports.crmRouter.use((req, res, next) => {
    const p = req.path || req.url || "";
    if (p.startsWith("/proposals/public")) {
        return next();
    }
    return (0, auth_1.requireAuth)(req, res, (err) => {
        if (err)
            return next(err);
        return (0, entitlements_1.requireEntitlement)("product_crm")(req, res, next);
    });
});
// ==========================================
// CRM LEADS (Relational MySQL backed)
// ==========================================
// GET /api/crm/leads - List all leads for tenant
exports.crmRouter.get("/leads", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, auth_1.requirePermission)("crm.leads.view"), async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 20);
        const [total, dbLeads] = await Promise.all([
            prisma_1.prisma.crmLead.count({ where: { tenantId } }),
            prisma_1.prisma.crmLead.findMany({
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
            return res.json((0, pagination_1.formatPaginatedResponse)(formatted, total, pagination));
        }
        res.setHeader("X-Total-Count", String(total));
        return res.json(formatted);
    }
    catch (err) {
        console.error("CRM Leads GET error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch CRM leads" });
    }
});
// GET /api/crm/leads/:id - Fetch single lead by id
exports.crmRouter.get("/leads/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, auth_1.requirePermission)("crm.leads.view"), async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const l = await prisma_1.prisma.crmLead.findFirst({
            where: { id, tenantId },
        });
        if (!l) {
            return res.status(404).json({ error: "CRM lead not found" });
        }
        return res.json({
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
        });
    }
    catch (err) {
        console.error("CRM Lead GET :id error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch CRM lead" });
    }
});
// POST /api/crm/leads - Create new lead
exports.crmRouter.post("/leads", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, auth_1.requirePermission)("crm.leads.create"), async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const body = req.body;
        const name = body.name || body.contactName || body.title || "New Prospect";
        const lead = await prisma_1.prisma.crmLead.create({
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
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "crm.lead.created",
            entityType: "CrmLead",
            entityId: lead.id,
            newState: { title: lead.title, value: Number(lead.value), stage: lead.stage },
        }).catch(() => { });
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
    }
    catch (err) {
        console.error("CRM Leads POST error:", err);
        return res.status(500).json({ error: err.message || "Failed to create CRM lead" });
    }
});
// PUT /api/crm/leads/:id - Update lead details or drag-and-drop stage
exports.crmRouter.put("/leads/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, auth_1.requirePermission)("crm.leads.edit"), async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const body = req.body;
        const existing = await prisma_1.prisma.crmLead.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: "CRM lead not found" });
        }
        const dataToUpdate = {};
        if (body.name !== undefined) {
            dataToUpdate.contactName = body.name;
            dataToUpdate.title = body.title || body.name;
        }
        if (body.title !== undefined)
            dataToUpdate.title = body.title;
        if (body.company !== undefined)
            dataToUpdate.company = body.company;
        if (body.email !== undefined)
            dataToUpdate.email = body.email;
        if (body.phone !== undefined)
            dataToUpdate.phone = body.phone;
        if (body.stage !== undefined)
            dataToUpdate.stage = body.stage;
        if (body.value !== undefined)
            dataToUpdate.value = Number(body.value);
        if (body.priority !== undefined)
            dataToUpdate.priority = body.priority;
        if (body.source !== undefined)
            dataToUpdate.source = body.source;
        if (body.notes !== undefined)
            dataToUpdate.notes = body.notes;
        if (body.assignedTo !== undefined)
            dataToUpdate.assignedTo = body.assignedTo;
        const updated = await prisma_1.prisma.crmLead.update({
            where: { id: existing.id },
            data: dataToUpdate,
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "crm.lead.updated",
            entityType: "CrmLead",
            entityId: id,
            oldState: { stage: existing.stage, value: Number(existing.value) },
            newState: dataToUpdate,
        }).catch(() => { });
        if (body.stage && body.stage !== existing.stage) {
            await outbox_service_1.OutboxService.createOutboxEvent({
                tenantId,
                eventType: "crm.lead.stage_changed",
                entityType: "CrmLead",
                entityId: id,
                actorId: req.user?.userId || req.user?.id,
                payload: { id, fromStage: existing.stage, toStage: body.stage },
            }).catch(() => { });
        }
        return res.json({ success: true, id, lead: updated });
    }
    catch (err) {
        console.error("CRM Leads PUT error:", err);
        return res.status(500).json({ error: err.message || "Failed to update CRM lead" });
    }
});
// DELETE /api/crm/leads/:id - Remove lead
exports.crmRouter.delete("/leads/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, (0, auth_1.requirePermission)("crm.leads.delete"), async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const existing = await prisma_1.prisma.crmLead.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: "CRM lead not found" });
        }
        await prisma_1.prisma.crmLead.delete({
            where: { id: existing.id },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "crm.lead.deleted",
            entityType: "CrmLead",
            entityId: id,
            oldState: { title: existing.title, contactName: existing.contactName },
        }).catch(() => { });
        return res.json({ success: true, message: "Lead removed" });
    }
    catch (err) {
        console.error("CRM Leads DELETE error:", err);
        return res.status(500).json({ error: err.message || "Failed to delete CRM lead" });
    }
});
// ==========================================
// CRM DEALS (Relational DB backed)
// ==========================================
// GET /api/crm/deals - List deals with pagination, stage/status filter, search
exports.crmRouter.get("/deals", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const pagination = (0, pagination_1.parsePagination)(req.query, ["createdAt", "value", "stage", "name", "closeDate"]);
        const { stage, status } = req.query;
        const search = pagination.search;
        const where = { tenantId };
        if (stage && stage !== "all")
            where.stage = String(stage);
        if (status && status !== "all")
            where.status = String(status);
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { customer: { contains: search, mode: "insensitive" } },
                { owner: { contains: search, mode: "insensitive" } },
            ];
        }
        const [total, deals] = await Promise.all([
            prisma_1.prisma.crmDeal.count({ where }),
            prisma_1.prisma.crmDeal.findMany({
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
    }
    catch (err) {
        console.error("CRM Deals GET error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch CRM deals" });
    }
});
// GET /api/crm/deals/:id - Single deal
exports.crmRouter.get("/deals/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const deal = await prisma_1.prisma.crmDeal.findFirst({
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
    }
    catch (err) {
        console.error("CRM Deal GET :id error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch CRM deal" });
    }
});
// POST /api/crm/deals - Create deal
exports.crmRouter.post("/deals", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const body = req.body;
        if (!body.name || !body.customer) {
            return res.status(400).json({ error: "Deal name and customer are required" });
        }
        const stage = body.stage || "Proposal";
        const status = stage === "Won" ? "Won" : stage === "Lost" ? "Lost" : (body.status || "Open");
        const closeDate = body.closeDate ? new Date(body.closeDate) : null;
        const deal = await prisma_1.prisma.crmDeal.create({
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
        (0, socket_1.broadcastToTenant)(tenantId, "crm:deal:created", {
            id: deal.id,
            name: deal.name,
            customer: deal.customer,
            stage: deal.stage,
            value: Number(deal.value),
            status: deal.status,
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "crm.deal.created",
            entityType: "CrmDeal",
            entityId: deal.id,
            newState: { name: deal.name, value: Number(deal.value), stage: deal.stage, customer: deal.customer },
        }).catch(() => { });
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
    }
    catch (err) {
        console.error("CRM Deals POST error:", err);
        return res.status(500).json({ error: err.message || "Failed to create CRM deal" });
    }
});
// PUT /api/crm/deals/:id - Update deal
exports.crmRouter.put("/deals/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const body = req.body;
        const existing = await prisma_1.prisma.crmDeal.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Deal not found" });
        }
        const dataToUpdate = {};
        if (body.name !== undefined)
            dataToUpdate.name = body.name;
        if (body.customer !== undefined)
            dataToUpdate.customer = body.customer;
        if (body.stage !== undefined) {
            dataToUpdate.stage = body.stage;
            if (body.stage === "Won")
                dataToUpdate.status = "Won";
            else if (body.stage === "Lost")
                dataToUpdate.status = "Lost";
            else if (!body.status)
                dataToUpdate.status = "Open";
        }
        if (body.status !== undefined)
            dataToUpdate.status = body.status;
        if (body.value !== undefined)
            dataToUpdate.value = Number(body.value);
        if (body.probability !== undefined)
            dataToUpdate.probability = Number(body.probability);
        if (body.owner !== undefined)
            dataToUpdate.owner = body.owner;
        if (body.notes !== undefined)
            dataToUpdate.notes = body.notes;
        if (body.closeDate !== undefined) {
            const parsed = new Date(body.closeDate);
            dataToUpdate.closeDate = isNaN(parsed.getTime()) ? null : parsed;
        }
        const updated = await prisma_1.prisma.crmDeal.update({
            where: { id },
            data: dataToUpdate,
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "crm.deal.updated",
            entityType: "CrmDeal",
            entityId: id,
            oldState: { name: existing.name, stage: existing.stage, value: Number(existing.value) },
            newState: dataToUpdate,
        }).catch(() => { });
        (0, socket_1.broadcastToTenant)(tenantId, "crm:deal:updated", {
            id: updated.id,
            name: updated.name,
            stage: updated.stage,
            value: Number(updated.value),
            status: updated.status,
        });
        return res.json({ success: true, deal: updated });
    }
    catch (err) {
        console.error("CRM Deals PUT error:", err);
        return res.status(500).json({ error: err.message || "Failed to update CRM deal" });
    }
});
// PATCH /api/crm/deals/:id/stage - Update stage
exports.crmRouter.patch("/deals/:id/stage", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const { stage } = req.body;
        if (!stage) {
            return res.status(400).json({ error: "Stage is required" });
        }
        const existing = await prisma_1.prisma.crmDeal.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Deal not found" });
        }
        const status = stage === "Won" ? "Won" : stage === "Lost" ? "Lost" : "Open";
        const updated = await prisma_1.prisma.crmDeal.update({
            where: { id },
            data: { stage, status },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "crm.deal.stage_updated",
            entityType: "CrmDeal",
            entityId: id,
            oldState: { stage: existing.stage, status: existing.status },
            newState: { stage: updated.stage, status: updated.status },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId,
            eventType: updated.stage === "Won" ? "crm.deal.won" : "crm.deal.stage_changed",
            entityType: "CrmDeal",
            entityId: id,
            actorId: req.user?.userId || req.user?.id,
            payload: { id, stage: updated.stage, status: updated.status, value: Number(existing.value) },
        }).catch(() => { });
        (0, socket_1.broadcastToTenant)(tenantId, "crm:deal:stageChanged", {
            id: updated.id,
            stage: updated.stage,
            status: updated.status,
        });
        return res.json({ success: true, stage: updated.stage, status: updated.status });
    }
    catch (err) {
        console.error("CRM Deals PATCH stage error:", err);
        return res.status(500).json({ error: err.message || "Failed to update deal stage" });
    }
});
// DELETE /api/crm/deals/:id - Delete deal
exports.crmRouter.delete("/deals/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const existing = await prisma_1.prisma.crmDeal.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Deal not found" });
        }
        await prisma_1.prisma.crmDeal.delete({
            where: { id },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "crm.deal.deleted",
            entityType: "CrmDeal",
            entityId: id,
            oldState: { name: existing.name, customer: existing.customer, value: Number(existing.value) },
        }).catch(() => { });
        (0, socket_1.broadcastToTenant)(tenantId, "crm:deal:deleted", { id });
        return res.json({ success: true, message: "Deal deleted" });
    }
    catch (err) {
        console.error("CRM Deals DELETE error:", err);
        return res.status(500).json({ error: err.message || "Failed to delete CRM deal" });
    }
});
// ==========================================
// CRM PROPOSALS & QUOTATIONS
// ==========================================
// GET /api/crm/proposals - List proposals
exports.crmRouter.get("/proposals", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const pagination = (0, pagination_1.parsePaginationParams)(req, "createdAt", 20);
        const [total, proposals] = await Promise.all([
            prisma_1.prisma.crmProposal.count({ where: { tenantId } }),
            prisma_1.prisma.crmProposal.findMany({
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
            return res.json((0, pagination_1.formatPaginatedResponse)(formatted, total, pagination));
        }
        res.setHeader("X-Total-Count", String(total));
        return res.json(formatted);
    }
    catch (err) {
        console.error("Proposals GET error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch proposals" });
    }
});
// POST /api/crm/proposals - Create proposal
exports.crmRouter.post("/proposals", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const body = req.body;
        const count = await prisma_1.prisma.crmProposal.count({ where: { tenantId } });
        const proposalNo = `PROP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
        const created = await prisma_1.prisma.crmProposal.create({
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
        (0, socket_1.broadcastToTenant)(tenantId, "proposal:created", {
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
    }
    catch (err) {
        console.error("Proposals POST error:", err);
        return res.status(500).json({ error: err.message || "Failed to create proposal" });
    }
});
// PATCH /api/crm/proposals/:id - Update proposal status and fields
exports.crmRouter.patch("/proposals/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const body = req.body;
        const existing = await prisma_1.prisma.crmProposal.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Proposal not found" });
        }
        const updated = await prisma_1.prisma.crmProposal.update({
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
        (0, socket_1.broadcastToTenant)(tenantId, "proposal:updated", {
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
    }
    catch (err) {
        console.error("Proposals PATCH error:", err);
        return res.status(500).json({ error: err.message || "Failed to update proposal" });
    }
});
// POST /api/crm/proposals/:id/convert - One-click convert proposal to formal Sale Invoice
exports.crmRouter.post("/proposals/:id/convert", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const proposal = await prisma_1.prisma.crmProposal.findFirst({
            where: { id, tenantId },
        });
        if (!proposal) {
            return res.status(404).json({ error: "Proposal not found" });
        }
        const count = await prisma_1.prisma.sale.count({ where: { tenantId } });
        const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
        const result = await prisma_1.prisma.$transaction(async (tx) => {
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
        (0, socket_1.broadcastToTenant)(tenantId, "proposal:converted", {
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
    }
    catch (err) {
        console.error("Proposal Convert error:", err);
        return res.status(500).json({ error: err.message || "Failed to convert proposal" });
    }
});
// POST /api/crm/proposals/:id/convert-to-project - Convert Proposal into active Project with tasks
exports.crmRouter.post("/proposals/:id/convert-to-project", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const proposal = await prisma_1.prisma.crmProposal.findFirst({
            where: { id, tenantId },
        });
        if (!proposal) {
            return res.status(404).json({ error: "Proposal not found" });
        }
        const items = Array.isArray(proposal.items) ? proposal.items : [];
        const project = await prisma_1.prisma.$transaction(async (tx) => {
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
                for (const item of items) {
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
            }
            else {
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
        (0, socket_1.broadcastToTenant)(tenantId, "proposal:converted_to_project", {
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
    }
    catch (err) {
        console.error("Proposal to Project convert error:", err);
        return res.status(500).json({ error: err.message || "Failed to convert proposal to project" });
    }
});
// DELETE /api/crm/proposals/:id - Delete proposal
exports.crmRouter.delete("/proposals/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        await prisma_1.prisma.crmProposal.deleteMany({
            where: { id, tenantId },
        });
        return res.json({ success: true, message: "Proposal deleted" });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete proposal" });
    }
});
// ==========================================
// PUBLIC CLIENT QUOTATION SELF-SERVICE PORTAL
// ==========================================
// GET /api/crm/proposals/public/:id - Public Client view of quotation
exports.crmRouter.get("/proposals/public/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const proposal = await prisma_1.prisma.crmProposal.findUnique({
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
    }
    catch (err) {
        console.error("Public Proposal GET error:", err);
        return res.status(500).json({ error: err.message || "Failed to load quotation proposal." });
    }
});
// POST /api/crm/proposals/public/:id/respond - Client Accept or Decline quotation
exports.crmRouter.post("/proposals/public/:id/respond", async (req, res) => {
    try {
        const { id } = req.params;
        const { action, signatureName, notes } = req.body;
        if (!action || !["accept", "decline"].includes(action)) {
            return res.status(400).json({ error: "Invalid response action. Expected 'accept' or 'decline'." });
        }
        const proposal = await prisma_1.prisma.crmProposal.findUnique({ where: { id } });
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
        const updated = await prisma_1.prisma.crmProposal.update({
            where: { id },
            data: {
                status: newStatus,
                notes: `${proposal.notes || ""}${signatureNote}`.trim(),
            },
        });
        (0, socket_1.broadcastToTenant)(proposal.tenantId, "proposal:responded", {
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
    }
    catch (err) {
        console.error("Public Proposal Respond error:", err);
        return res.status(500).json({ error: err.message || "Failed to submit proposal response." });
    }
});
// ==========================================
// CRM CONTACTS (Enterprise Directory & Passport)
// ==========================================
// GET /api/crm/contacts - List contacts for tenant
exports.crmRouter.get("/contacts", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const statusParam = typeof req.query.status === "string" ? req.query.status : undefined;
        const sortParam = req.query.sort === "asc" ? "asc" : "desc";
        const searchParam = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
        const where = { tenantId };
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
        const contacts = await prisma_1.prisma.crmContact.findMany({
            where,
            orderBy: { createdAt: sortParam },
        });
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
            status: c.status,
            social: c.social || {},
            activities: c.activities || [],
            notes: c.notes || "",
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
        }));
        return res.json(formatted);
    }
    catch (err) {
        console.error("CRM Contacts GET error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch CRM contacts" });
    }
});
// GET /api/crm/contacts/:id - Get single contact
exports.crmRouter.get("/contacts/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const c = await prisma_1.prisma.crmContact.findFirst({
            where: { id, tenantId },
        });
        if (!c) {
            return res.status(404).json({ error: "Contact not found." });
        }
        return res.json({
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
            status: c.status,
            social: c.social || {},
            activities: c.activities || [],
            notes: c.notes || "",
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
        });
    }
    catch (err) {
        console.error("CRM Contact GET :id error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch CRM contact" });
    }
});
// POST /api/crm/contacts - Create contact
exports.crmRouter.post("/contacts", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const body = req.body;
        if (!body.name || !body.name.trim()) {
            return res.status(400).json({ error: "Contact name is required." });
        }
        const created = await prisma_1.prisma.crmContact.create({
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
                owner: body.owner || req.user?.fullName || "Admin",
                status: body.status === "inactive" ? "inactive" : "active",
                social: body.social || {},
                activities: body.activities || [],
                notes: body.notes || null,
            },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "crm.contact.created",
            entityType: "CrmContact",
            entityId: created.id,
            newState: { name: created.name, email: created.email, company: created.company },
        }).catch(() => { });
        (0, socket_1.broadcastToTenant)(tenantId, "crm:contact:created", { id: created.id, name: created.name });
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
            status: created.status,
            social: created.social || {},
            activities: created.activities || [],
            notes: created.notes || "",
            createdAt: created.createdAt.toISOString(),
            updatedAt: created.updatedAt.toISOString(),
        });
    }
    catch (err) {
        console.error("CRM Contact POST error:", err);
        return res.status(500).json({ error: err.message || "Failed to create CRM contact" });
    }
});
// PUT /api/crm/contacts/:id - Update contact
exports.crmRouter.put("/contacts/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const body = req.body;
        const existing = await prisma_1.prisma.crmContact.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Contact not found." });
        }
        const dataToUpdate = {};
        if (body.name !== undefined)
            dataToUpdate.name = body.name.trim();
        if (body.email !== undefined)
            dataToUpdate.email = body.email ? body.email.trim() : null;
        if (body.phone !== undefined)
            dataToUpdate.phone = body.phone ? body.phone.trim() : null;
        if (body.role !== undefined)
            dataToUpdate.role = body.role ? body.role.trim() : null;
        if (body.company !== undefined)
            dataToUpdate.company = body.company ? body.company.trim() : null;
        if (body.city !== undefined)
            dataToUpdate.city = body.city ? body.city.trim() : null;
        if (body.country !== undefined)
            dataToUpdate.country = body.country ? body.country.trim() : "India";
        if (body.rating !== undefined)
            dataToUpdate.rating = Number(body.rating);
        if (body.owner !== undefined)
            dataToUpdate.owner = body.owner;
        if (body.status !== undefined)
            dataToUpdate.status = body.status;
        if (body.social !== undefined)
            dataToUpdate.social = body.social;
        if (body.activities !== undefined)
            dataToUpdate.activities = body.activities;
        if (body.notes !== undefined)
            dataToUpdate.notes = body.notes;
        const updated = await prisma_1.prisma.crmContact.update({
            where: { id: existing.id },
            data: dataToUpdate,
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "crm.contact.updated",
            entityType: "CrmContact",
            entityId: id,
            oldState: { name: existing.name, email: existing.email },
            newState: dataToUpdate,
        }).catch(() => { });
        (0, socket_1.broadcastToTenant)(tenantId, "crm:contact:updated", { id: updated.id, name: updated.name });
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
            status: updated.status,
            social: updated.social || {},
            activities: updated.activities || [],
            notes: updated.notes || "",
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
        });
    }
    catch (err) {
        console.error("CRM Contact PUT error:", err);
        return res.status(500).json({ error: err.message || "Failed to update CRM contact" });
    }
});
// DELETE /api/crm/contacts/:id - Delete contact
exports.crmRouter.delete("/contacts/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const existing = await prisma_1.prisma.crmContact.findFirst({
            where: { id, tenantId },
        });
        if (!existing) {
            return res.status(404).json({ error: "Contact not found." });
        }
        await prisma_1.prisma.crmContact.delete({
            where: { id: existing.id },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "crm.contact.deleted",
            entityType: "CrmContact",
            entityId: id,
            oldState: { name: existing.name, email: existing.email },
        }).catch(() => { });
        (0, socket_1.broadcastToTenant)(tenantId, "crm:contact:deleted", { id });
        return res.json({ success: true, message: "Contact deleted successfully." });
    }
    catch (err) {
        console.error("CRM Contact DELETE error:", err);
        return res.status(500).json({ error: err.message || "Failed to delete CRM contact" });
    }
});
// ==========================================
// CRM COMPANIES (Relational MySQL backed)
// ==========================================
// GET /api/crm/companies - List companies for tenant
exports.crmRouter.get("/companies", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const searchParam = req.query.search?.trim() || "";
        const where = { tenantId };
        if (searchParam) {
            where.OR = [
                { name: { contains: searchParam } },
                { industry: { contains: searchParam } },
                { location: { contains: searchParam } },
            ];
        }
        const companies = await prisma_1.prisma.crmCompany.findMany({
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
    }
    catch (err) {
        console.error("CRM Companies GET error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch CRM companies" });
    }
});
// GET /api/crm/companies/:id - Get single company
exports.crmRouter.get("/companies/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const c = await prisma_1.prisma.crmCompany.findFirst({
            where: { id, tenantId },
        });
        if (!c) {
            return res.status(404).json({ error: "Company not found." });
        }
        return res.json({
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
        });
    }
    catch (err) {
        console.error("CRM Company GET :id error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch CRM company" });
    }
});
// POST /api/crm/companies - Create company
exports.crmRouter.post("/companies", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const body = req.body;
        if (!body.name || !body.name.trim()) {
            return res.status(400).json({ error: "Company name is required." });
        }
        const created = await prisma_1.prisma.crmCompany.create({
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
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "crm.company.created",
            entityType: "CrmCompany",
            entityId: created.id,
            newState: { name: created.name, industry: created.industry },
        }).catch(() => { });
        (0, socket_1.broadcastToTenant)(tenantId, "crm:company:created", { id: created.id, name: created.name });
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
    }
    catch (err) {
        console.error("CRM Company POST error:", err);
        return res.status(500).json({ error: err.message || "Failed to create CRM company" });
    }
});
// PUT /api/crm/companies/:id - Update company
exports.crmRouter.put("/companies/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const body = req.body;
        const existing = await prisma_1.prisma.crmCompany.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: "Company not found." });
        }
        const dataToUpdate = {};
        if (body.name !== undefined)
            dataToUpdate.name = body.name.trim();
        if (body.industry !== undefined)
            dataToUpdate.industry = body.industry?.trim() || null;
        if (body.employeesCount !== undefined)
            dataToUpdate.employeesCount = body.employeesCount;
        if (body.annualRevenue !== undefined)
            dataToUpdate.annualRevenue = Number(body.annualRevenue);
        if (body.website !== undefined)
            dataToUpdate.website = body.website?.trim() || null;
        if (body.location !== undefined)
            dataToUpdate.location = body.location?.trim() || null;
        if (body.dealsCount !== undefined)
            dataToUpdate.dealsCount = Number(body.dealsCount);
        if (body.notes !== undefined)
            dataToUpdate.notes = body.notes;
        const updated = await prisma_1.prisma.crmCompany.update({ where: { id: existing.id }, data: dataToUpdate });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "crm.company.updated",
            entityType: "CrmCompany",
            entityId: id,
            oldState: { name: existing.name },
            newState: dataToUpdate,
        }).catch(() => { });
        (0, socket_1.broadcastToTenant)(tenantId, "crm:company:updated", { id: updated.id, name: updated.name });
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
    }
    catch (err) {
        console.error("CRM Company PUT error:", err);
        return res.status(500).json({ error: err.message || "Failed to update CRM company" });
    }
});
// DELETE /api/crm/companies/:id - Delete company
exports.crmRouter.delete("/companies/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const existing = await prisma_1.prisma.crmCompany.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: "Company not found." });
        }
        await prisma_1.prisma.crmCompany.delete({ where: { id: existing.id } });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "crm.company.deleted",
            entityType: "CrmCompany",
            entityId: id,
            oldState: { name: existing.name },
        }).catch(() => { });
        (0, socket_1.broadcastToTenant)(tenantId, "crm:company:deleted", { id });
        return res.json({ success: true, message: "Company deleted successfully." });
    }
    catch (err) {
        console.error("CRM Company DELETE error:", err);
        return res.status(500).json({ error: err.message || "Failed to delete CRM company" });
    }
});
// ==========================================
// CALL HISTORY (Relational MySQL backed)
// ==========================================
// GET /api/crm/calls - List call history records
exports.crmRouter.get("/calls", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { search, callType, sort = "desc" } = req.query;
        const where = { tenantId };
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
        let calls = await prisma_1.prisma.callHistoryRecord.findMany({
            where,
            orderBy: { callTime: sort === "asc" ? "asc" : "desc" },
        });
        // Auto-seed realistic demo calls if empty
        if (calls.length === 0 && !search && (!callType || callType === "all")) {
            const now = Date.now();
            await prisma_1.prisma.callHistoryRecord.createMany({
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
            calls = await prisma_1.prisma.callHistoryRecord.findMany({
                where,
                orderBy: { callTime: "desc" },
            });
        }
        return res.json(calls);
    }
    catch (err) {
        console.error("CRM Calls GET error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch call history" });
    }
});
// POST /api/crm/calls - Log a new call
exports.crmRouter.post("/calls", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { callerName, callerEmail, callerPhone, callerAvatarUrl, callType = "outgoing", durationSeconds = 0, notes, } = req.body;
        if (!callerName || !callerPhone) {
            return res.status(400).json({ error: "Caller name and phone number are required." });
        }
        const record = await prisma_1.prisma.callHistoryRecord.create({
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
    }
    catch (err) {
        console.error("CRM Calls POST error:", err);
        return res.status(500).json({ error: err.message || "Failed to log call" });
    }
});
// DELETE /api/crm/calls/:id - Delete a call record
exports.crmRouter.delete("/calls/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const deleted = await prisma_1.prisma.callHistoryRecord.deleteMany({
            where: { id, tenantId },
        });
        if (deleted.count === 0) {
            return res.status(404).json({ error: "Call record not found." });
        }
        return res.json({ success: true, message: "Call record deleted." });
    }
    catch (err) {
        console.error("CRM Calls DELETE error:", err);
        return res.status(500).json({ error: err.message || "Failed to delete call record" });
    }
});
// POST /api/crm/calls/bulk-delete - Delete multiple call records
exports.crmRouter.post("/calls/bulk-delete", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "Array of IDs required." });
        }
        const deleted = await prisma_1.prisma.callHistoryRecord.deleteMany({
            where: { id: { in: ids }, tenantId },
        });
        return res.json({ success: true, count: deleted.count });
    }
    catch (err) {
        console.error("CRM Calls Bulk DELETE error:", err);
        return res.status(500).json({ error: err.message || "Failed to bulk delete call records" });
    }
});
// =========================================================================
// PIPELINES CRUD (/api/crm/pipelines)
// =========================================================================
const DEFAULT_CRM_PIPELINES = [
    { id: "pip-1", name: "Enterprise B2B Direct", source: "Direct", status: "active", stages: ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Contract Won", "Closed Lost"], createdAt: "2026-01-15T00:00:00.000Z" },
    { id: "pip-2", name: "Inbound Marketing & Web", source: "Website", status: "active", stages: ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Contract Won", "Closed Lost"], createdAt: "2026-02-01T00:00:00.000Z" },
    { id: "pip-3", name: "Partner Referrals & Channel", source: "Referral", status: "active", stages: ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Contract Won", "Closed Lost"], createdAt: "2026-02-14T00:00:00.000Z" },
    { id: "pip-4", name: "Cold Outbound & Campaigns", source: "Outbound", status: "active", stages: ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Contract Won", "Closed Lost"], createdAt: "2026-03-01T00:00:00.000Z" },
];
async function getTenantPipelines(tenantId) {
    const row = await prisma_1.prisma.setting.findFirst({
        where: { scope: "TENANT", scopeId: tenantId, key: "crm.pipelines" },
    });
    if (row?.valueJson && Array.isArray(row.valueJson)) {
        return row.valueJson;
    }
    await prisma_1.prisma.setting.upsert({
        where: { scope_scopeId_key: { scope: "TENANT", scopeId: tenantId, key: "crm.pipelines" } },
        create: {
            scope: "TENANT",
            scopeId: tenantId,
            group: "crm",
            key: "crm.pipelines",
            valueJson: DEFAULT_CRM_PIPELINES,
            valueType: "json",
        },
        update: {},
    });
    return DEFAULT_CRM_PIPELINES;
}
// GET /api/crm/pipelines
exports.crmRouter.get("/pipelines", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const pipelines = await getTenantPipelines(tenantId);
        const deals = await prisma_1.prisma.crmDeal.findMany({
            where: { tenantId },
            select: { id: true, pipelineId: true, value: true, stage: true },
        });
        const enriched = pipelines.map((p) => {
            const matchingDeals = deals.filter((d) => d.pipelineId === p.id || (!d.pipelineId && p.id === "pip-1"));
            const totalVal = matchingDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
            return {
                ...p,
                totalValue: totalVal,
                dealCount: matchingDeals.length,
            };
        });
        return res.json({ success: true, data: enriched });
    }
    catch (err) {
        console.error("GET /api/crm/pipelines error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch pipelines" });
    }
});
// POST /api/crm/pipelines
exports.crmRouter.post("/pipelines", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { name, source, stages, status } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Pipeline name is required." });
        }
        const current = await getTenantPipelines(tenantId);
        const newPipeline = {
            id: "pip-" + Date.now(),
            name: name.trim(),
            source: source || "Direct Sales",
            stages: Array.isArray(stages) && stages.length > 0 ? stages : ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Contract Won", "Closed Lost"],
            status: status || "active",
            createdAt: new Date().toISOString(),
        };
        const updated = [newPipeline, ...current];
        await prisma_1.prisma.setting.upsert({
            where: { scope_scopeId_key: { scope: "TENANT", scopeId: tenantId, key: "crm.pipelines" } },
            create: {
                scope: "TENANT",
                scopeId: tenantId,
                group: "crm",
                key: "crm.pipelines",
                valueJson: updated,
                valueType: "json",
            },
            update: { valueJson: updated },
        });
        return res.status(201).json({ success: true, pipeline: newPipeline });
    }
    catch (err) {
        console.error("POST /api/crm/pipelines error:", err);
        return res.status(500).json({ error: err.message || "Failed to create pipeline" });
    }
});
// PUT /api/crm/pipelines/:id
exports.crmRouter.put("/pipelines/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const { name, source, stages, status } = req.body;
        const current = await getTenantPipelines(tenantId);
        const existingIndex = current.findIndex((p) => p.id === id);
        if (existingIndex === -1) {
            return res.status(404).json({ error: "Pipeline not found" });
        }
        const target = current[existingIndex];
        const updatedPipeline = {
            ...target,
            name: name !== undefined ? name.trim() : target.name,
            source: source !== undefined ? source : target.source,
            stages: stages !== undefined ? stages : target.stages,
            status: status !== undefined ? status : target.status,
            updatedAt: new Date().toISOString(),
        };
        current[existingIndex] = updatedPipeline;
        await prisma_1.prisma.setting.upsert({
            where: { scope_scopeId_key: { scope: "TENANT", scopeId: tenantId, key: "crm.pipelines" } },
            create: {
                scope: "TENANT",
                scopeId: tenantId,
                group: "crm",
                key: "crm.pipelines",
                valueJson: current,
                valueType: "json",
            },
            update: { valueJson: current },
        });
        return res.json({ success: true, pipeline: updatedPipeline });
    }
    catch (err) {
        console.error("PUT /api/crm/pipelines/:id error:", err);
        return res.status(500).json({ error: err.message || "Failed to update pipeline" });
    }
});
// DELETE /api/crm/pipelines/:id
exports.crmRouter.delete("/pipelines/:id", auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || "default";
        const { id } = req.params;
        const current = await getTenantPipelines(tenantId);
        const updated = current.filter((p) => p.id !== id);
        await prisma_1.prisma.setting.upsert({
            where: { scope_scopeId_key: { scope: "TENANT", scopeId: tenantId, key: "crm.pipelines" } },
            create: {
                scope: "TENANT",
                scopeId: tenantId,
                group: "crm",
                key: "crm.pipelines",
                valueJson: updated,
                valueType: "json",
            },
            update: { valueJson: updated },
        });
        return res.json({ success: true, message: "Pipeline deleted successfully" });
    }
    catch (err) {
        console.error("DELETE /api/crm/pipelines/:id error:", err);
        return res.status(500).json({ error: err.message || "Failed to delete pipeline" });
    }
});
