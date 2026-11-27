import { Router, Response } from "express";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const prisma = rawPrisma || proxiedPrisma;
import { requireAuth, requireSuperAdmin, AuthRequest } from "../middleware/auth";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";
import { isTenantAdminRole, writeSuperAuditLog } from "../lib/super-audit";

export const platformSupportRouter = Router();

const ALLOWED_STATUSES = new Set(["open", "in_progress", "on_hold", "resolved", "closed"]);
const ALLOWED_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);

function isSuper(req: AuthRequest): boolean {
  return Boolean(req.user?.roles?.includes("super_admin"));
}

/**
 * Resolves the tenant scope for the caller.
 * - Super Admin: unrestricted (null scope).
 * - Everyone else: MUST have a tenant context; otherwise access is denied (fail closed).
 */
function resolveScope(req: AuthRequest, res: Response): { ok: true; tenantId: string | null } | { ok: false } {
  if (isSuper(req)) return { ok: true, tenantId: null };
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    res.status(403).json({ error: "Workspace context is required to access platform support.", code: "TENANT_CONTEXT_REQUIRED" });
    return { ok: false };
  }
  return { ok: true, tenantId };
}

async function generateTicketCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = `TIC${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(10 + Math.random() * 89)}`;
    const clash = await prisma.platformSupportTicket.findFirst({ where: { ticketCode: code }, select: { id: true } });
    if (!clash) return code;
  }
  return `TIC${Date.now()}`;
}

// GET /api/support/platform/tickets (List platform tickets — tenant-scoped unless Super Admin)
platformSupportRouter.get("/tickets", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const scope = resolveScope(req, res);
    if (!scope.ok) return;

    const { requestType, priority, status, search, targetTenantId } = req.query;

    const where: any = {};
    if (scope.tenantId) {
      where.tenantId = scope.tenantId;
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
        { ticketCode: { contains: String(search), mode: "insensitive" } },
        { subject: { contains: String(search), mode: "insensitive" } },
        { targetAddonSlug: { contains: String(search), mode: "insensitive" } },
        { tenant: { name: { contains: String(search), mode: "insensitive" } } },
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

// POST /api/support/platform/tickets (Tenant Admin raises a ticket; Super Admin may raise on behalf of a tenant)
platformSupportRouter.post("/tickets", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let targetTenantId: string | null = null;
    if (isSuper(req)) {
      targetTenantId = req.body?.tenantId || req.user?.tenantId || null;
      if (!targetTenantId) {
        return res.status(400).json({ error: "tenantId is required when a Super Admin raises a ticket.", code: "TENANT_REQUIRED" });
      }
      const exists = await prisma.tenant.findUnique({ where: { id: targetTenantId }, select: { id: true } });
      if (!exists) return res.status(404).json({ error: "Target tenant workspace not found." });
    } else {
      // Non-super users can ONLY raise tickets for their own workspace (body.tenantId ignored)
      targetTenantId = req.user?.tenantId || null;
      if (!targetTenantId) {
        return res.status(403).json({ error: "Workspace context is required to raise a support ticket.", code: "TENANT_CONTEXT_REQUIRED" });
      }
    }

    const { subject, requestType, targetAddonSlug, priority, message, attachmentUrl } = req.body;

    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ error: "Subject is required." });
    }
    const normalizedPriority = String(priority || "medium").toLowerCase();

    const ticket = await prisma.platformSupportTicket.create({
      data: {
        tenantId: targetTenantId,
        ticketCode: await generateTicketCode(),
        subject: String(subject).trim().slice(0, 255),
        requestType: requestType || "Access Issue",
        targetAddonSlug: targetAddonSlug || null,
        priority: ALLOWED_PRIORITIES.has(normalizedPriority) ? normalizedPriority : "medium",
        status: "open",
      },
    });

    await prisma.platformTicketMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: isSuper(req) ? "super_admin" : "tenant_admin",
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

// PUT /api/support/platform/tickets/:id (Update ticket — Super Admin any ticket; tenant admins only their own)
platformSupportRouter.put("/tickets/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const scope = resolveScope(req, res);
    if (!scope.ok) return;
    const { id } = req.params;

    const existing = await prisma.platformSupportTicket.findFirst({
      where: { id, ...(scope.tenantId ? { tenantId: scope.tenantId } : {}) },
    });
    if (!existing) return res.status(404).json({ error: "Ticket not found." });

    if (!isSuper(req) && !isTenantAdminRole(req.user?.roles)) {
      return res.status(403).json({ error: "Only workspace administrators can update support tickets.", code: "TENANT_ADMIN_REQUIRED" });
    }

    const { status, priority, subject, requestType } = req.body;

    const data: any = {};
    if (status) {
      const s = String(status).toLowerCase();
      if (!ALLOWED_STATUSES.has(s)) return res.status(400).json({ error: `Invalid status '${status}'.` });
      // Tenants may only close/reopen their own tickets; workflow states are Super Admin controlled
      if (!isSuper(req) && !["closed", "open"].includes(s)) {
        return res.status(403).json({ error: "Only the platform support team can change this ticket status." });
      }
      data.status = s;
      if (s === "resolved" || s === "closed") data.resolvedAt = new Date();
    }
    if (priority) {
      const p = String(priority).toLowerCase();
      if (!ALLOWED_PRIORITIES.has(p)) return res.status(400).json({ error: `Invalid priority '${priority}'.` });
      data.priority = p;
    }
    if (subject) data.subject = String(subject).trim().slice(0, 255);
    if (requestType) data.requestType = String(requestType).slice(0, 100);

    const updated = await prisma.platformSupportTicket.update({
      where: { id },
      data,
      include: {
        tenant: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (isSuper(req)) {
      void writeSuperAuditLog(req, {
        action: "PLATFORM_TICKET_UPDATED",
        entityType: "PlatformSupportTicket",
        entityId: id,
        tenantId: existing.tenantId,
        before: { status: existing.status, priority: existing.priority, subject: existing.subject },
        after: data,
      });
    }

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update support ticket." });
  }
});

// GET /api/support/platform/tickets/:id
platformSupportRouter.get("/tickets/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const scope = resolveScope(req, res);
    if (!scope.ok) return;
    const { id } = req.params;

    const ticket = await prisma.platformSupportTicket.findFirst({
      where: { id, ...(scope.tenantId ? { tenantId: scope.tenantId } : {}) },
      include: {
        tenant: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!ticket) {
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
    const scope = resolveScope(req, res);
    if (!scope.ok) return;
    const { id } = req.params;
    const { message, attachmentUrl } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Message text is required." });
    }

    const target = await prisma.platformSupportTicket.findFirst({
      where: { id, ...(scope.tenantId ? { tenantId: scope.tenantId } : {}) },
    });
    if (!target) return res.status(404).json({ error: "Ticket not found" });

    const senderType = isSuper(req) ? "super_admin" : "tenant_admin";
    const senderName = req.user?.email || (senderType === "super_admin" ? "Platform Super Admin" : "Tenant Admin");

    const newMsg = await prisma.platformTicketMessage.create({
      data: {
        ticketId: id,
        senderType,
        senderName,
        message: String(message),
        attachmentUrl: attachmentUrl || null,
      },
    });

    // Auto-update ticket status to in_progress when the platform team first responds
    if (target.status === "open" && senderType === "super_admin") {
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
    const requestedStatus = String(status || "resolved").toLowerCase();
    let finalStatus = ALLOWED_STATUSES.has(requestedStatus) ? requestedStatus : "resolved";

    // 1-Click Action: Super Admin approves an Add-on upgrade request (manual, audited entitlement)
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
          plan: "super_admin_override",
          features: {
            source: "MANUAL_ASSIGNMENT",
            assignedBy: req.user?.email || "super_admin",
            assignedAt: new Date().toISOString(),
            supportTicketId: ticket.id,
          },
        },
        update: {
          status: "active",
        },
      });

      finalAction = "addon_activated";
      finalStatus = "resolved";

      await prisma.platformTicketMessage.create({
        data: {
          ticketId: id,
          senderType: "super_admin",
          senderName: "Super Admin Platform Engine",
          message: `Super Admin has approved and enabled the '${ticket.targetAddonSlug.toUpperCase()}' add-on for your organization.`,
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

    void writeSuperAuditLog(req, {
      action: action === "activate_addon" ? "PLATFORM_TICKET_ADDON_ACTIVATED" : "PLATFORM_TICKET_ACTIONED",
      entityType: "PlatformSupportTicket",
      entityId: id,
      tenantId: ticket.tenantId,
      before: { status: ticket.status, superAdminAction: ticket.superAdminAction },
      after: { status: finalStatus, superAdminAction: finalAction, addonSlug: ticket.targetAddonSlug || null },
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

// DELETE /api/support/platform/tickets/:id (Super Admin only)
platformSupportRouter.delete("/tickets/:id", requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.platformSupportTicket.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Ticket not found." });

    await prisma.platformSupportTicket.delete({ where: { id } });

    void writeSuperAuditLog(req, {
      action: "PLATFORM_TICKET_DELETED",
      entityType: "PlatformSupportTicket",
      entityId: id,
      tenantId: existing.tenantId,
      before: { ticketCode: existing.ticketCode, subject: existing.subject, status: existing.status },
    });

    return res.json({ success: true, message: "Ticket deleted." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete ticket." });
  }
});

// GET /api/support/platform/summary/stats (Metrics — tenant-scoped unless Super Admin)
platformSupportRouter.get("/summary/stats", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const scope = resolveScope(req, res);
    if (!scope.ok) return;

    const where: any = scope.tenantId ? { tenantId: scope.tenantId } : {};

    const grouped = await prisma.platformSupportTicket.groupBy({
      by: ["requestType", "status"],
      where,
      _count: { _all: true },
    });

    let totalTickets = 0;
    let upgradeRequests = 0;
    let billingQueries = 0;
    let technicalIssues = 0;
    let resolvedCount = 0;
    let openCount = 0;

    for (const g of grouped as any[]) {
      const n = g._count?._all || 0;
      const type = String(g.requestType || "").toLowerCase();
      totalTickets += n;
      if (type === "addon_upgrade" || type.includes("plan") || type.includes("module")) upgradeRequests += n;
      if (type === "billing_invoices" || type.includes("billing")) billingQueries += n;
      if (type === "technical_api" || type.includes("api") || type.includes("integration")) technicalIssues += n;
      if (g.status === "resolved" || g.status === "closed") resolvedCount += n;
      if (g.status === "open" || g.status === "in_progress") openCount += n;
    }

    return res.json({
      totalTickets,
      upgradeRequests,
      billingQueries,
      technicalIssues,
      resolvedCount,
      openCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate platform stats." });
  }
});
