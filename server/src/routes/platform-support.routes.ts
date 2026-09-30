import { Router, Response } from "express";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const prisma = rawPrisma || proxiedPrisma;
import { requireAuth, requireSuperAdmin, AuthRequest } from "../middleware/auth";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";

export const platformSupportRouter = Router();

// Standard default platform support tickets for demonstration
const DEFAULT_PLATFORM_TICKETS = [
  {
    subject: "Requesting ATS Recruitment Module Activation for Hiring Drive",
    requestType: "addon_upgrade",
    targetAddonSlug: "recruitment",
    priority: "high",
    initialMessage: "Our organization is expanding and needs the Recruitment ATS Kanban add-on enabled for our hiring drive.",
  },
  {
    subject: "Monthly GST Tax Invoice & Billing Receipt Query",
    requestType: "billing_invoices",
    priority: "medium",
    initialMessage: "Requesting revised GSTIN tax invoice receipt for the annual enterprise SaaS subscription.",
  },
  {
    subject: "Custom Biometric Machine Webhook API Integration",
    requestType: "technical_api",
    priority: "urgent",
    initialMessage: "Need guidance on configuring the real-time biometric TCP/HTTP push webhook for 3 new office branch locations.",
  },
];

/**
 * Auto-seed standard platform tickets if empty
 */
async function ensureSeedPlatformTickets(tenantId: string) {
  const count = await prisma.platformSupportTicket.count({ where: { tenantId } });
  if (count === 0) {
    for (const t of DEFAULT_PLATFORM_TICKETS) {
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const ticketCode = `SUP-${randomCode}`;

      const ticket = await prisma.platformSupportTicket.create({
        data: {
          tenantId,
          ticketCode,
          subject: t.subject,
          requestType: t.requestType,
          targetAddonSlug: t.targetAddonSlug || null,
          priority: t.priority,
          status: "open",
        },
      });

      await prisma.platformTicketMessage.create({
        data: {
          ticketId: ticket.id,
          senderType: "tenant_admin",
          senderName: "Organization Administrator",
          message: t.initialMessage,
        },
      });
    }
  }
}

// GET /api/support/platform/tickets (List platform tickets)
platformSupportRouter.get("/tickets", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const isSuperAdmin = req.user?.roles?.includes("super_admin");

    // Dynamic initial seed if empty
    const currentCount = await prisma.platformSupportTicket.count();
    if (currentCount === 0) {
      const tenants = await prisma.tenant.findMany({ take: 5 });
      if (tenants.length > 0) {
        const seedTickets = [
          {
            ticketCode: "TIC0016",
            subject: "Login not working",
            requestType: "Access Issue",
            priority: "high",
            status: "open",
            tenantId: tenants[0].id,
            messages: "Users are experiencing 401 errors when accessing the tenant dashboard after standard logout.",
          },
          {
            ticketCode: "TIC0015",
            subject: "HR module not loading",
            requestType: "Module Issue",
            priority: "medium",
            status: "open",
            tenantId: tenants[1]?.id || tenants[0].id,
            messages: "The employee profile tab takes over 15 seconds to fetch records from the server.",
          },
          {
            ticketCode: "TIC0014",
            subject: "Failed payments notice received",
            requestType: "Billing & Payments",
            priority: "low",
            status: "on_hold",
            tenantId: tenants[2]?.id || tenants[0].id,
            messages: "Our latest credit card payment was marked failed despite funds being settled.",
          },
          {
            ticketCode: "TIC0013",
            subject: "Billing amount incorrect",
            requestType: "Billing & Payments",
            priority: "medium",
            status: "open",
            tenantId: tenants[3]?.id || tenants[0].id,
            messages: "Invoice shows 50 users instead of the 25 users allowed on our current subscription.",
          },
          {
            ticketCode: "TIC0012",
            subject: "Webhook delivery failure to ERP",
            requestType: "API / Integration Issues",
            priority: "high",
            status: "open",
            tenantId: tenants[0].id,
            messages: "Webhook endpoint returning 502 bad gateway during employee check-in sync events.",
          },
          {
            ticketCode: "TIC0011",
            subject: "Plan upgrade to Enterprise inquiry",
            requestType: "Plan / Subscription Issues",
            priority: "low",
            status: "resolved",
            tenantId: tenants[1]?.id || tenants[0].id,
            messages: "We would like to upgrade from Advanced to Enterprise for custom domain support.",
          },
        ];

        for (const st of seedTickets) {
          const t = await prisma.platformSupportTicket.create({
            data: {
              ticketCode: st.ticketCode,
              subject: st.subject,
              requestType: st.requestType,
              priority: st.priority,
              status: st.status,
              tenantId: st.tenantId,
            },
          });
          await prisma.platformTicketMessage.create({
            data: {
              ticketId: t.id,
              senderType: "tenant_admin",
              senderName: "Tenant Administrator",
              message: st.messages,
            },
          });
        }
      }
    }

    const { requestType, priority, status, search, targetTenantId } = req.query;

    const where: any = {};
    if (!isSuperAdmin && tenantId) {
      where.tenantId = tenantId;
    } else if (targetTenantId && targetTenantId !== "all") {
      where.tenantId = String(targetTenantId);
    }

    if (requestType && requestType !== "all") {
      where.requestType = String(requestType);
    }
    if (priority && priority !== "all") {
      where.priority = String(priority);
    }
    if (status && status !== "all") {
      where.status = String(status);
    }
    if (search) {
      where.OR = [
        { ticketCode: { contains: String(search) } },
        { subject: { contains: String(search) } },
        { targetAddonSlug: { contains: String(search) } },
        { tenant: { name: { contains: String(search) } } },
      ];
    }

    const pagination = parsePaginationParams(req, "createdAt", 50);

    const [total, tickets] = await Promise.all([
      prisma.platformSupportTicket.count({ where }),
      prisma.platformSupportTicket.findMany({
        where,
        include: {
          tenant: true,
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(tickets, total, pagination));
    }

    res.setHeader("X-Total-Count", String(total));
    return res.json(tickets);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list platform support tickets." });
  }
});

// POST /api/support/platform/tickets (Tenant Admin or Super Admin creates ticket)
platformSupportRouter.post("/tickets", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let targetTenantId = req.user?.tenantId || req.body?.tenantId;
    if (!targetTenantId) {
      const firstTenant = await prisma.tenant.findFirst();
      if (!firstTenant) return res.status(400).json({ error: "No tenants exist to attach ticket to." });
      targetTenantId = firstTenant.id;
    }

    const { subject, requestType, targetAddonSlug, priority, message, attachmentUrl } = req.body;

    if (!subject) {
      return res.status(400).json({ error: "Subject is required." });
    }

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const ticketCode = `TIC00${randomCode}`;

    const ticket = await prisma.platformSupportTicket.create({
      data: {
        tenantId: targetTenantId,
        ticketCode,
        subject,
        requestType: requestType || "Access Issue",
        targetAddonSlug: targetAddonSlug || null,
        priority: (priority || "medium").toLowerCase(),
        status: "open",
      },
    });

    await prisma.platformTicketMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: req.user?.roles?.includes("super_admin") ? "super_admin" : "tenant_admin",
        senderName: req.user?.email || "Support Agent",
        message: message || "Support ticket created for workspace review.",
        attachmentUrl: attachmentUrl || null,
      },
    });

    const refreshed = await prisma.platformSupportTicket.findUnique({
      where: { id: ticket.id },
      include: {
        tenant: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    return res.status(201).json(refreshed);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create platform support ticket." });
  }
});

// PUT /api/support/platform/tickets/:id (Update ticket status or priority)
platformSupportRouter.put("/tickets/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, priority, subject, requestType } = req.body;

    const data: any = {};
    if (status) data.status = status;
    if (priority) data.priority = priority.toLowerCase();
    if (subject) data.subject = subject;
    if (requestType) data.requestType = requestType;

    const updated = await prisma.platformSupportTicket.update({
      where: { id },
      data,
      include: {
        tenant: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update support ticket." });
  }
});

// GET /api/support/platform/tickets/:id
platformSupportRouter.get("/tickets/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const isSuperAdmin = req.user?.roles?.includes("super_admin");

    const ticket = await prisma.platformSupportTicket.findUnique({
      where: { id },
      include: {
        tenant: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!ticket || (!isSuperAdmin && tenantId && ticket.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    return res.json(ticket);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch platform ticket." });
  }
});

// POST /api/support/platform/tickets/:id/messages (Add message to conversation)
platformSupportRouter.post("/tickets/:id/messages", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { message, attachmentUrl } = req.body;
    const isSuperAdmin = req.user!.roles.includes("super_admin");
    const target = await prisma.platformSupportTicket.findFirst({ where: { id, ...(isSuperAdmin ? {} : { tenantId: req.user!.tenantId! }) } });
    if (!target) return res.status(404).json({ error: "Ticket not found" });
    const senderType = isSuperAdmin ? "super_admin" : "tenant_admin";
    const senderName = req.user?.email || (senderType === "super_admin" ? "Platform Super Admin" : "Tenant Admin");

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message text is required." });
    }

    const newMsg = await prisma.platformTicketMessage.create({
      data: {
        ticketId: id,
        senderType: senderType || "tenant_admin",
        senderName,
        message,
        attachmentUrl: attachmentUrl || null,
      },
    });

    // Auto-update ticket status to in_progress if still open
    const ticket = await prisma.platformSupportTicket.findUnique({ where: { id } });
    if (ticket && ticket.status === "open") {
      await prisma.platformSupportTicket.update({
        where: { id },
        data: { status: "in_progress" },
      });
    }

    return res.status(201).json(newMsg);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to post message." });
  }
});

// POST /api/support/platform/tickets/:id/action (Super Admin 1-Click Action / Resolution)
platformSupportRouter.post("/tickets/:id/action", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, status, adminNotes, replyMessage } = req.body;

    const ticket = await prisma.platformSupportTicket.findUnique({
      where: { id },
      include: { tenant: true },
    });

    if (!ticket) return res.status(404).json({ error: "Ticket not found." });

    let finalAction = action || ticket.superAdminAction;
    let finalStatus = status || "resolved";

    // 1-Click Action: If Super Admin approves Add-on upgrade request
    if (action === "activate_addon" && ticket.targetAddonSlug) {
      await prisma.tenantAddon.upsert({
        where: {
          tenantId_addonSlug: {
            tenantId: ticket.tenantId,
            addonSlug: ticket.targetAddonSlug,
          },
        },
        create: {
          tenantId: ticket.tenantId,
          addonSlug: ticket.targetAddonSlug,
          status: "active",
          plan: "enterprise_unlimited",
          features: ["full_access"],
        },
        update: {
          status: "active",
          plan: "enterprise_unlimited",
        },
      });

      finalAction = "addon_activated";
      finalStatus = "resolved";

      await prisma.platformTicketMessage.create({
        data: {
          ticketId: id,
          senderType: "super_admin",
          senderName: "Super Admin Platform Engine",
          message: `Great news! Super Admin has approved and automatically enabled the '${ticket.targetAddonSlug.toUpperCase()}' enterprise add-on suite for your organization!`,
        },
      });
    }

    if (replyMessage) {
      await prisma.platformTicketMessage.create({
        data: {
          ticketId: id,
          senderType: "super_admin",
          senderName: req.user?.email || "Platform Super Admin",
          message: replyMessage,
        },
      });
    }

    const updated = await prisma.platformSupportTicket.update({
      where: { id },
      data: {
        status: finalStatus,
        superAdminAction: finalAction,
        adminNotes: adminNotes !== undefined ? adminNotes : ticket.adminNotes,
        resolvedAt: finalStatus === "resolved" || finalStatus === "closed" ? new Date() : ticket.resolvedAt,
      },
      include: {
        tenant: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    return res.json({
      success: true,
      message: "Platform support ticket actioned successfully!",
      ticket: updated,
    });
  } catch (err: any) {
    console.error("[platform-support action] error:", err);
    return res.status(500).json({ error: err.message || "Failed to action ticket." });
  }
});

// DELETE /api/support/platform/tickets/:id
platformSupportRouter.delete("/tickets/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.platformSupportTicket.delete({ where: { id } });
    return res.json({ success: true, message: "Ticket deleted." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete ticket." });
  }
});

// GET /api/support/platform/summary (Metrics)
platformSupportRouter.get("/summary/stats", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const isSuperAdmin = req.user?.roles?.includes("super_admin");

    const where: any = {};
    if (!isSuperAdmin && tenantId) {
      where.tenantId = tenantId;
    }

    const allTickets: any[] = await prisma.platformSupportTicket.findMany({ where });

    const totalTickets = allTickets.length;
    const upgradeRequests = allTickets.filter((t: any) => t.requestType === "addon_upgrade").length;
    const billingQueries = allTickets.filter((t: any) => t.requestType === "billing_invoices").length;
    const technicalIssues = allTickets.filter((t: any) => t.requestType === "technical_api").length;
    const resolvedCount = allTickets.filter((t: any) => t.status === "resolved" || t.status === "closed").length;

    return res.json({
      totalTickets,
      upgradeRequests,
      billingQueries,
      technicalIssues,
      resolvedCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate platform stats." });
  }
});
