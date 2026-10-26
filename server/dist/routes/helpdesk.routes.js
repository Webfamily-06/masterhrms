"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helpdeskRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const audit_service_1 = require("../services/audit.service");
const outbox_service_1 = require("../services/outbox.service");
exports.helpdeskRouter = (0, express_1.Router)();
// Standard default internal tickets for a new organization
const DEFAULT_INTERNAL_TICKETS = [
    {
        subject: "VPN credentials not connecting for remote work",
        category: "IT & Hardware",
        priority: "high",
        description: "I am unable to authenticate through the corporate WireGuard VPN gateway when working remotely.",
        assignedAgent: "IT Support Desk",
        slaHours: 12,
    },
    {
        subject: "Payroll salary slip tax deduction breakdown query",
        category: "Payroll & Salary",
        priority: "medium",
        description: "Requesting clarification on the professional tax and provident fund calculation in this month's payslip.",
        assignedAgent: "Finance & Accounts",
        slaHours: 24,
    },
    {
        subject: "Leave balance carry-forward policy inquiry",
        category: "Leave & Attendance",
        priority: "low",
        description: "How many days of privilege leave can be carried forward into the upcoming financial year?",
        assignedAgent: "People Operations (HR)",
        slaHours: 48,
    },
];
/**
 * Auto-seed standard internal tickets if tenant has none
 */
async function ensureSeedInternalTickets(tenantId, employeeId) {
    const count = await prisma_1.prisma.helpdeskTicket.count({ where: { tenantId } });
    if (count === 0 && employeeId) {
        for (const t of DEFAULT_INTERNAL_TICKETS) {
            const randomCode = Math.floor(1000 + Math.random() * 9000);
            const ticketCode = `TICK-${randomCode}`;
            const ticket = await prisma_1.prisma.helpdeskTicket.create({
                data: {
                    tenantId,
                    employeeId,
                    ticketCode,
                    subject: t.subject,
                    category: t.category,
                    priority: t.priority,
                    description: t.description,
                    assignedAgent: t.assignedAgent,
                    slaHours: t.slaHours,
                    status: "open",
                },
            });
            await prisma_1.prisma.helpdeskComment.create({
                data: {
                    ticketId: ticket.id,
                    authorName: "System Automation",
                    message: `Ticket ${ticketCode} created and routed to ${t.assignedAgent}. Target SLA: ${t.slaHours} hours.`,
                    isStaff: true,
                },
            });
        }
    }
}
// GET /api/helpdesk/tickets (List tenant internal tickets)
exports.helpdeskRouter.get("/tickets", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        // Find any employee for seeding if empty
        const firstEmp = await prisma_1.prisma.employee.findFirst({ where: { tenantId } });
        if (firstEmp) {
            // seed disabled
        }
        const { category, priority, status, employeeId, search } = req.query;
        const where = { tenantId };
        if (category && category !== "all") {
            where.category = String(category);
        }
        if (priority && priority !== "all") {
            where.priority = String(priority);
        }
        if (status && status !== "all") {
            where.status = String(status);
        }
        if (employeeId && employeeId !== "all") {
            where.employeeId = String(employeeId);
        }
        if (search) {
            where.OR = [
                { ticketCode: { contains: String(search) } },
                { subject: { contains: String(search) } },
                { description: { contains: String(search) } },
                { assignedAgent: { contains: String(search) } },
                { employee: { firstName: { contains: String(search) } } },
                { employee: { lastName: { contains: String(search) } } },
            ];
        }
        const tickets = await prisma_1.prisma.helpdeskTicket.findMany({
            where,
            include: {
                employee: {
                    include: { department: true },
                },
                comments: {
                    orderBy: { createdAt: "asc" },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json(tickets);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to list internal tickets." });
    }
});
// POST /api/helpdesk/tickets (Create internal ticket)
exports.helpdeskRouter.post("/tickets", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const { employeeId, subject, category, priority, description, assignedAgent } = req.body;
        if (!employeeId || !subject || !description) {
            return res.status(400).json({ error: "Employee, subject, and description are required." });
        }
        const slaMap = {
            urgent: 4,
            high: 12,
            medium: 24,
            low: 48,
        };
        const pri = (priority || "medium").toLowerCase();
        const slaHours = slaMap[pri] || 24;
        const randomCode = Math.floor(1000 + Math.random() * 9000);
        const ticketCode = `TICK-${randomCode}`;
        const defaultAgentMap = {
            "IT & Hardware": "IT Support Desk",
            "Payroll & Salary": "Finance & Payroll Dept",
            "Leave & Attendance": "People Operations (HR)",
            "HR Policies": "People Operations (HR)",
            "Workplace & Facilities": "Admin & Facilities Team",
        };
        const agent = assignedAgent || defaultAgentMap[category] || "Helpdesk Support Agent";
        const ticket = await prisma_1.prisma.helpdeskTicket.create({
            data: {
                tenantId,
                employeeId,
                ticketCode,
                subject,
                category: category || "IT & Hardware",
                priority: pri,
                description,
                assignedAgent: agent,
                slaHours,
                status: "open",
            },
            include: {
                employee: { include: { department: true } },
                comments: true,
            },
        });
        // Initial system comment
        await prisma_1.prisma.helpdeskComment.create({
            data: {
                ticketId: ticket.id,
                authorName: "System Automation",
                message: `Ticket ${ticketCode} submitted. Assigned to ${agent}. SLA Target: ${slaHours}h.`,
                isStaff: true,
            },
        });
        const refreshed = await prisma_1.prisma.helpdeskTicket.findUnique({
            where: { id: ticket.id },
            include: {
                employee: { include: { department: true } },
                comments: { orderBy: { createdAt: "asc" } },
            },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "helpdesk.ticket.created",
            entityType: "HelpdeskTicket",
            entityId: ticket.id,
            newState: { ticketCode, subject: ticket.subject, priority: ticket.priority, category: ticket.category },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId,
            eventType: "helpdesk.ticket.created",
            entityType: "helpdesk_ticket",
            entityId: ticket.id,
            actorId: req.user?.userId || req.user?.id,
            payload: { ticketCode, subject: ticket.subject, priority: ticket.priority },
        }).catch(() => { });
        return res.status(201).json(refreshed);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to create internal ticket." });
    }
});
// GET /api/helpdesk/tickets/:id (Ticket details + comments)
exports.helpdeskRouter.get("/tickets/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const ticket = await prisma_1.prisma.helpdeskTicket.findUnique({
            where: { id },
            include: {
                employee: { include: { department: true } },
                comments: { orderBy: { createdAt: "asc" } },
            },
        });
        if (!ticket || (tenantId && ticket.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Ticket not found." });
        }
        return res.json(ticket);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch ticket." });
    }
});
// PUT /api/helpdesk/tickets/:id (Edit ticket details)
exports.helpdeskRouter.put("/tickets/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const { subject, category, priority, description, assignedAgent } = req.body;
        const existing = await prisma_1.prisma.helpdeskTicket.findUnique({ where: { id } });
        if (!existing || (tenantId && existing.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Ticket not found." });
        }
        const updated = await prisma_1.prisma.helpdeskTicket.update({
            where: { id },
            data: {
                ...(subject && { subject }),
                ...(category && { category }),
                ...(priority && { priority }),
                ...(description && { description }),
                ...(assignedAgent && { assignedAgent }),
            },
            include: {
                employee: { include: { department: true } },
                comments: { orderBy: { createdAt: "asc" } },
            },
        });
        await audit_service_1.AuditService.logMutation({
            tenantId: existing.tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "helpdesk.ticket.updated",
            entityType: "HelpdeskTicket",
            entityId: id,
            oldState: { subject: existing.subject, priority: existing.priority },
            newState: { subject: updated.subject, priority: updated.priority },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId: existing.tenantId,
            eventType: "helpdesk.ticket.updated",
            entityType: "helpdesk_ticket",
            entityId: id,
            actorId: req.user?.userId || req.user?.id,
            payload: { ticketCode: updated.ticketCode, subject: updated.subject },
        }).catch(() => { });
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update ticket." });
    }
});
// POST /api/helpdesk/tickets/:id/comments (Add reply to ticket)
exports.helpdeskRouter.post("/tickets/:id/comments", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { message, isStaff } = req.body;
        const authorName = req.user?.email || "Support Agent";
        if (!message || !message.trim()) {
            return res.status(400).json({ error: "Message text is required." });
        }
        const comment = await prisma_1.prisma.helpdeskComment.create({
            data: {
                ticketId: id,
                authorName,
                message,
                isStaff: Boolean(isStaff),
            },
        });
        // Auto-update ticket status to in_progress if still open
        const ticket = await prisma_1.prisma.helpdeskTicket.findUnique({ where: { id } });
        if (ticket && ticket.status === "open") {
            await prisma_1.prisma.helpdeskTicket.update({
                where: { id },
                data: { status: "in_progress" },
            });
        }
        return res.status(201).json(comment);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to add comment." });
    }
});
// PUT /api/helpdesk/tickets/:id/status (Update ticket status & resolution)
exports.helpdeskRouter.put("/tickets/:id/status", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assignedAgent, resolutionNotes } = req.body;
        const tenantId = req.user?.tenantId;
        const existing = await prisma_1.prisma.helpdeskTicket.findUnique({ where: { id } });
        if (!existing || (tenantId && existing.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Ticket not found." });
        }
        const isResolved = status === "resolved" || status === "closed";
        const resolvedAt = isResolved ? new Date() : existing.resolvedAt;
        const updated = await prisma_1.prisma.helpdeskTicket.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(assignedAgent && { assignedAgent }),
                ...(resolutionNotes && { resolutionNotes }),
                ...(isResolved && { resolvedAt }),
            },
            include: {
                employee: { include: { department: true } },
                comments: { orderBy: { createdAt: "asc" } },
            },
        });
        if (resolutionNotes) {
            await prisma_1.prisma.helpdeskComment.create({
                data: {
                    ticketId: id,
                    authorName: req.user?.email || "Support Agent",
                    message: `[Resolution Notes]: ${resolutionNotes}`,
                    isStaff: true,
                },
            });
        }
        await audit_service_1.AuditService.logMutation({
            tenantId: existing.tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "helpdesk.ticket.status_changed",
            entityType: "HelpdeskTicket",
            entityId: id,
            oldState: { status: existing.status },
            newState: { status: updated.status, resolutionNotes },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId: existing.tenantId,
            eventType: "helpdesk.ticket.status_changed",
            entityType: "helpdesk_ticket",
            entityId: id,
            actorId: req.user?.userId || req.user?.id,
            payload: { ticketCode: updated.ticketCode, status: updated.status },
        }).catch(() => { });
        return res.json({
            success: true,
            message: `Ticket status updated to ${status}!`,
            ticket: updated,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to update ticket status." });
    }
});
// DELETE /api/helpdesk/tickets/:id
exports.helpdeskRouter.delete("/tickets/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const existing = await prisma_1.prisma.helpdeskTicket.findUnique({ where: { id } });
        if (!existing || (tenantId && existing.tenantId !== tenantId)) {
            return res.status(404).json({ error: "Ticket not found." });
        }
        await prisma_1.prisma.helpdeskComment.deleteMany({ where: { ticketId: id } });
        await prisma_1.prisma.helpdeskTicket.delete({ where: { id } });
        await audit_service_1.AuditService.logMutation({
            tenantId: existing.tenantId,
            actorId: req.user?.userId || req.user?.id,
            actorEmail: req.user?.email,
            action: "helpdesk.ticket.deleted",
            entityType: "HelpdeskTicket",
            entityId: id,
            oldState: { ticketCode: existing.ticketCode, subject: existing.subject },
        }).catch(() => { });
        await outbox_service_1.OutboxService.createOutboxEvent({
            tenantId: existing.tenantId,
            eventType: "helpdesk.ticket.deleted",
            entityType: "helpdesk_ticket",
            entityId: id,
            actorId: req.user?.userId || req.user?.id,
            payload: { ticketCode: existing.ticketCode },
        }).catch(() => { });
        return res.json({ success: true, message: "Ticket deleted." });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to delete ticket." });
    }
});
// GET /api/helpdesk/summary (Internal helpdesk metrics)
exports.helpdeskRouter.get("/summary/stats", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const allTickets = await prisma_1.prisma.helpdeskTicket.findMany({ where: { tenantId } });
        const totalTickets = allTickets.length;
        const openCount = allTickets.filter((t) => t.status === "open").length;
        const inProgressCount = allTickets.filter((t) => t.status === "in_progress").length;
        const resolvedCount = allTickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
        const slaCompliance = totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 100;
        return res.json({
            totalTickets,
            openCount,
            inProgressCount,
            resolvedCount,
            slaCompliance,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to generate helpdesk stats." });
    }
});
