import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const helpdeskRouter = Router();

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
async function ensureSeedInternalTickets(tenantId: string, employeeId?: string) {
  const count = await prisma.helpdeskTicket.count({ where: { tenantId } });
  if (count === 0 && employeeId) {
    for (const t of DEFAULT_INTERNAL_TICKETS) {
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const ticketCode = `TICK-${randomCode}`;

      const ticket = await prisma.helpdeskTicket.create({
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

      await prisma.helpdeskComment.create({
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
helpdeskRouter.get("/tickets", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    // Find any employee for seeding if empty
    const firstEmp = await prisma.employee.findFirst({ where: { tenantId } });
    if (firstEmp) {
      // seed disabled
    }

    const { category, priority, status, employeeId, search } = req.query;

    const where: any = { tenantId };
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

    const tickets = await prisma.helpdeskTicket.findMany({
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list internal tickets." });
  }
});

// POST /api/helpdesk/tickets (Create internal ticket)
helpdeskRouter.post("/tickets", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { employeeId, subject, category, priority, description, assignedAgent } = req.body;

    if (!employeeId || !subject || !description) {
      return res.status(400).json({ error: "Employee, subject, and description are required." });
    }

    const slaMap: Record<string, number> = {
      urgent: 4,
      high: 12,
      medium: 24,
      low: 48,
    };
    const pri = (priority || "medium").toLowerCase();
    const slaHours = slaMap[pri] || 24;

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const ticketCode = `TICK-${randomCode}`;

    const defaultAgentMap: Record<string, string> = {
      "IT & Hardware": "IT Support Desk",
      "Payroll & Salary": "Finance & Payroll Dept",
      "Leave & Attendance": "People Operations (HR)",
      "HR Policies": "People Operations (HR)",
      "Workplace & Facilities": "Admin & Facilities Team",
    };

    const agent = assignedAgent || defaultAgentMap[category] || "Helpdesk Support Agent";

    const ticket = await prisma.helpdeskTicket.create({
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
    await prisma.helpdeskComment.create({
      data: {
        ticketId: ticket.id,
        authorName: "System Automation",
        message: `Ticket ${ticketCode} submitted. Assigned to ${agent}. SLA Target: ${slaHours}h.`,
        isStaff: true,
      },
    });

    const refreshed = await prisma.helpdeskTicket.findUnique({
      where: { id: ticket.id },
      include: {
        employee: { include: { department: true } },
        comments: { orderBy: { createdAt: "asc" } },
      },
    });

    return res.status(201).json(refreshed);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create internal ticket." });
  }
});

// GET /api/helpdesk/tickets/:id (Ticket details + comments)
helpdeskRouter.get("/tickets/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const ticket = await prisma.helpdeskTicket.findUnique({
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch ticket." });
  }
});

// POST /api/helpdesk/tickets/:id/comments (Add reply to ticket)
helpdeskRouter.post("/tickets/:id/comments", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { message, isStaff } = req.body;
    const authorName = req.user?.email || "Support Agent";

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message text is required." });
    }

    const comment = await prisma.helpdeskComment.create({
      data: {
        ticketId: id,
        authorName,
        message,
        isStaff: Boolean(isStaff),
      },
    });

    // Auto-update ticket status to in_progress if still open
    const ticket = await prisma.helpdeskTicket.findUnique({ where: { id } });
    if (ticket && ticket.status === "open") {
      await prisma.helpdeskTicket.update({
        where: { id },
        data: { status: "in_progress" },
      });
    }

    return res.status(201).json(comment);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to add comment." });
  }
});

// PUT /api/helpdesk/tickets/:id/status (Update ticket status & resolution)
helpdeskRouter.put("/tickets/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assignedAgent, resolutionNotes } = req.body;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.helpdeskTicket.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    const isResolved = status === "resolved" || status === "closed";
    const resolvedAt = isResolved ? new Date() : existing.resolvedAt;

    const updated = await prisma.helpdeskTicket.update({
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
      await prisma.helpdeskComment.create({
        data: {
          ticketId: id,
          authorName: req.user?.email || "Support Agent",
          message: `[Resolution Notes]: ${resolutionNotes}`,
          isStaff: true,
        },
      });
    }

    return res.json({
      success: true,
      message: `Ticket status updated to ${status}!`,
      ticket: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update ticket status." });
  }
});

// DELETE /api/helpdesk/tickets/:id
helpdeskRouter.delete("/tickets/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const existing = await prisma.helpdeskTicket.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    await prisma.helpdeskTicket.delete({ where: { id } });
    return res.json({ success: true, message: "Ticket deleted." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete ticket." });
  }
});

// GET /api/helpdesk/summary (Internal helpdesk metrics)
helpdeskRouter.get("/summary/stats", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const allTickets = await prisma.helpdeskTicket.findMany({ where: { tenantId } });

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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate helpdesk stats." });
  }
});
