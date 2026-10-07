import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { getTenantDb } from "../context/tenant-context";
import { NotificationService } from "../services/notification.service";
import { WorkflowService } from "../services/workflow.service";
import { AuditService } from "../services/audit.service";
import { attachAllowedActions } from "../lib/allowed-actions";
import { resolveUserSecurityContext } from "../lib/data-scope";
import { createMasterDataRouter } from "../blueprints/master-data.blueprint";
import { organizationRouter } from "./organization.routes";
import { hrEmployeesRouter } from "./hr-employees.routes";
import { hrAttendanceRouter } from "./hr-attendance.routes";
import { hrLeaveRouter } from "./hr-leave.routes";
import { meAttendanceRouter } from "./me-attendance.routes";
import { meLeaveRouter } from "./me-leave.routes";
import { hrPayrollRouter } from "./hr-payroll.routes";
import { mePayrollRouter } from "./me-payroll.routes";
import { hrRecruitmentRouter } from "./hr-recruitment.routes";
import { meRecruitmentRouter } from "./me-recruitment.routes";

export const platformFoundationRouter = Router();

// =========================================================================
// P2. ORGANIZATION & EMPLOYEES BUSINESS LAYER
// =========================================================================
platformFoundationRouter.use("/hr/organization", organizationRouter);
platformFoundationRouter.use("/hr/employees", hrEmployeesRouter);

// =========================================================================
// P3. ATTENDANCE & LEAVE BUSINESS LAYER
// =========================================================================
platformFoundationRouter.use("/hr/attendance", hrAttendanceRouter);
platformFoundationRouter.use("/hr/leave", hrLeaveRouter);
platformFoundationRouter.use("/me/attendance", meAttendanceRouter);
platformFoundationRouter.use("/me/leave", meLeaveRouter);

// =========================================================================
// P4. PAYROLL & FINANCE BUSINESS LAYER
// =========================================================================
platformFoundationRouter.use("/hr/payroll", hrPayrollRouter);
platformFoundationRouter.use("/me/payroll", mePayrollRouter);

// =========================================================================
// P5. RECRUITMENT & TALENT BUSINESS LAYER
// =========================================================================
platformFoundationRouter.use("/hr/recruitment", hrRecruitmentRouter);
platformFoundationRouter.use("/me/recruitment", meRecruitmentRouter);

// =========================================================================
// 0. MASTER DATA BLUEPRINTS
// =========================================================================
platformFoundationRouter.use(
  "/hr/masters/departments",
  createMasterDataRouter({
    modelName: "department",
    entityName: "Department",
    searchFields: ["name"],
    uniqueFields: ["name"],
  })
);

platformFoundationRouter.use(
  "/hr/masters/branches",
  createMasterDataRouter({
    modelName: "branch",
    entityName: "Branch",
    searchFields: ["name", "code"],
    uniqueFields: ["code"],
  })
);

platformFoundationRouter.use(
  "/hr/masters/designations",
  createMasterDataRouter({
    modelName: "designation",
    entityName: "Designation",
    searchFields: ["name"],
    uniqueFields: ["name"],
  })
);


// =========================================================================
// 1. REALTIME CATCH-UP (GET /api/v1/shared/events)
// =========================================================================
platformFoundationRouter.get(
  "/shared/events",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(403).json({ error: "Tenant context required" });
      }

      const since = req.query.since as string | undefined;
      const limit = Math.min(Number(req.query.limit) || 50, 100);

      const db = getTenantDb();
      const where: any = { tenantId };

      if (since) {
        const sinceDate = new Date(since);
        if (!isNaN(sinceDate.getTime())) {
          where.createdAt = { gt: sinceDate };
        }
      }

      const events = await db.outboxEvent.findMany({
        where,
        orderBy: { createdAt: "asc" },
        take: limit,
      });

      return res.json({
        events: events.map((e) => ({
          eventId: e.id,
          eventType: e.eventType,
          entityType: e.entityType,
          entityId: e.entityId,
          occurredAt: e.createdAt,
          payload: e.payload,
          metadata: (e.payload as any)?._metadata || null,
        })),
        cursor: events.length > 0 ? events[events.length - 1].createdAt : since,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// =========================================================================
// 2. NOTIFICATIONS (GET & POST /api/v1/shared/notifications)
// =========================================================================
platformFoundationRouter.get(
  "/shared/notifications",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      if (!tenantId || !userId) {
        return res.status(403).json({ error: "Context required" });
      }

      const unreadOnly = req.query.unread === "true";
      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const offset = Number(req.query.offset) || 0;

      const result = await NotificationService.getUserNotifications(tenantId, userId, {
        unreadOnly,
        limit,
        offset,
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

platformFoundationRouter.post(
  "/shared/notifications/:id/read",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const userId = req.user?.userId!;
      await NotificationService.markAsRead(tenantId, req.params.id, userId);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

platformFoundationRouter.post(
  "/shared/notifications/read-all",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const userId = req.user?.userId!;
      await NotificationService.markAllAsRead(tenantId, userId);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// =========================================================================
// 3. WORKFLOW DEFINITIONS & APPROVAL INBOX
// =========================================================================

// List workflow definitions
platformFoundationRouter.get(
  "/hr/workflows",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const db = getTenantDb();
      const workflows = await db.workflowDefinition.findMany({
        where: { tenantId },
        include: { steps: { orderBy: { stepOrder: "asc" } } },
      });
      return res.json({ workflows });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// Create workflow definition
platformFoundationRouter.post(
  "/hr/workflows",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const { entityType, name, description, isDefault, steps } = req.body;
      const db = getTenantDb();

      const created = await db.workflowDefinition.create({
        data: {
          tenantId,
          module: req.body.module || "SYSTEM",
          entityType,
          name,
          description: description ?? null,
          isActive: true,
          steps: {
            create: (steps || []).map((step: any, index: number) => ({
              stepOrder: step.stepOrder || index + 1,
              name: step.name || `Step ${index + 1}`,
              approverType: step.approverType || "ROLE",
              approverRole: step.approverRole ?? null,
              specificUserId: step.specificUserId ?? null,
              slaHours: step.slaHours ?? null,
            })),
          },
        },
        include: { steps: true },
      });

      return res.status(201).json(created);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// Unified HR Approval Inbox (All pending requests in tenant)
platformFoundationRouter.get(
  "/hr/approvals",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const db = getTenantDb();
      const userContext = await resolveUserSecurityContext(
        req.user?.userId!,
        tenantId,
        req.user?.roles || [],
        db
      );

      const status = req.query.status as string | undefined;
      const where: any = { tenantId };
      if (status) {
        where.status = status;
      }

      const requests = await db.approvalRequest.findMany({
        where,
        include: {
          workflow: { include: { steps: true } },
          actions: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const withAllowedActions = attachAllowedActions(
        "ApprovalRequest",
        requests,
        userContext,
        req.user?.permissions || []
      );

      return res.json({ requests: withAllowedActions });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// Employee Self-Service My Approvals / My Requests
platformFoundationRouter.get(
  "/me/approvals",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const userId = req.user?.userId!;
      const db = getTenantDb();
      const userContext = await resolveUserSecurityContext(
        userId,
        tenantId,
        req.user?.roles || [],
        db
      );

      // 1. Requests submitted by me
      const mySubmitted = await db.approvalRequest.findMany({
        where: { tenantId, requesterId: userId },
        include: { workflow: true, actions: { orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
      });

      // 2. Requests awaiting my action (where I am approver or manager)
      const toApprove = await db.approvalRequest.findMany({
        where: {
          tenantId,
          status: "PENDING",
        },
        include: {
          workflow: { include: { steps: true } },
          actions: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        submitted: attachAllowedActions("ApprovalRequest", mySubmitted, userContext),
        pendingAction: attachAllowedActions("ApprovalRequest", toApprove, userContext),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// Workflow Action: Approve
platformFoundationRouter.post(
  "/shared/approvals/:id/approve",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const actorId = req.user?.userId!;
      const { comment } = req.body;

      const result = await WorkflowService.approveStep({
        tenantId,
        requestId: req.params.id,
        actorId,
        comment,
      });

      return res.json({ success: true, request: result });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

// Workflow Action: Reject
platformFoundationRouter.post(
  "/shared/approvals/:id/reject",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const actorId = req.user?.userId!;
      const { comment } = req.body;

      const result = await WorkflowService.rejectStep({
        tenantId,
        requestId: req.params.id,
        actorId,
        comment,
      });

      return res.json({ success: true, request: result });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

// Workflow Action: Withdraw
platformFoundationRouter.post(
  "/shared/approvals/:id/withdraw",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const actorId = req.user?.userId!;
      const { comment } = req.body;

      const result = await WorkflowService.withdrawRequest({
        tenantId,
        requestId: req.params.id,
        actorId,
        comment,
      });

      return res.json({ success: true, request: result });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

// Workflow Action: Delegate
platformFoundationRouter.post(
  "/shared/approvals/:id/delegate",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const actorId = req.user?.userId!;
      const { delegateToUserId, comment } = req.body;

      if (!delegateToUserId) {
        return res.status(400).json({ error: "delegateToUserId is required" });
      }

      const result = await WorkflowService.delegateStep({
        tenantId,
        requestId: req.params.id,
        actorId,
        delegateToUserId,
        comment,
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
);

// Entity Audit Trail
platformFoundationRouter.get(
  "/shared/audit-trail",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const entityType = req.query.entityType as string;
      const entityId = req.query.entityId as string;

      if (!entityType || !entityId) {
        return res.status(400).json({ error: "entityType and entityId are required" });
      }

      const trail = await AuditService.getEntityAuditTrail(tenantId, entityType, entityId);
      return res.json({ auditTrail: trail });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);
