import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireTenantAdmin } from "../lib/super-audit";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
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
import { hrLifecycleRouter } from "./hr-lifecycle.routes";
import { hrPerformanceRouter } from "./hr-performance.routes";
import { meLifecycleRouter } from "./me-lifecycle.routes";
import { mePerformanceRouter } from "./me-performance.routes";
import { hrTrainingRouter } from "./hr-training.routes";
import { meTrainingRouter } from "./me-training.routes";
import { hrAssetsRouter } from "./hr-assets.routes";
import { meAssetsRouter } from "./me-assets.routes";
import { hrMeetingsRouter } from "./hr-meetings.routes";
import { meMeetingsRouter } from "./me-meetings.routes";
import { hrZoomMeetingsRouter } from "./hr-zoom-meetings.routes";
import { hrMailTemplatesRouter } from "./hr-mail-templates.routes";
import { hrDocumentsRouter } from "./hr-documents.routes";
import { meDocumentsRouter } from "./me-documents.routes";
import { hrCollaborationRouter } from "./hr-collaboration.routes";
import { meCollaborationRouter } from "./me-collaboration.routes";
import { hrProfileChangesRouter } from "./hr-profile-changes.routes";

export const platformFoundationRouter = Router();

platformFoundationRouter.use(requireAuth, resolveTenantContext);

// =========================================================================
// P2. ORGANIZATION & EMPLOYEES BUSINESS LAYER
// =========================================================================
platformFoundationRouter.use("/hr/organization", organizationRouter);
platformFoundationRouter.use("/hr/employees", hrEmployeesRouter);
platformFoundationRouter.use("/hr/requests/profile-changes", hrProfileChangesRouter);
platformFoundationRouter.use("/hr/profile-changes", hrProfileChangesRouter);

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
// P6. LIFECYCLE & PERFORMANCE BUSINESS LAYER
// =========================================================================
platformFoundationRouter.use("/hr/lifecycle", hrLifecycleRouter);
platformFoundationRouter.use("/hr/performance", hrPerformanceRouter);
platformFoundationRouter.use("/me/lifecycle", meLifecycleRouter);
platformFoundationRouter.use("/me/performance", mePerformanceRouter);

// =========================================================================
// P7. TRAINING, ASSETS, MEETINGS, DOCUMENTS BUSINESS LAYER
// =========================================================================
platformFoundationRouter.use("/hr/training", hrTrainingRouter);
platformFoundationRouter.use("/me/training", meTrainingRouter);
platformFoundationRouter.use("/hr/assets", hrAssetsRouter);
platformFoundationRouter.use("/me/assets", meAssetsRouter);
platformFoundationRouter.use("/hr/meetings", hrMeetingsRouter);
platformFoundationRouter.use("/me/meetings", meMeetingsRouter);
platformFoundationRouter.use("/hr/zoom-meetings", hrZoomMeetingsRouter);
platformFoundationRouter.use("/hr/documents", hrDocumentsRouter);
platformFoundationRouter.use("/me/documents", meDocumentsRouter);
platformFoundationRouter.use("/hr/mail-templates", hrMailTemplatesRouter);

// =========================================================================
// P8. COLLABORATION & FINAL POLISH BUSINESS LAYER
// =========================================================================
platformFoundationRouter.use("/hr", hrCollaborationRouter);
platformFoundationRouter.use("/me", meCollaborationRouter);


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
      const moduleParam = req.query.module ? String(req.query.module) : undefined;

      const result = await NotificationService.getUserNotifications(tenantId, userId, {
        unreadOnly,
        limit,
        offset,
        module: moduleParam,
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

// List workflow definitions (HR / workspace administrators only)
platformFoundationRouter.get(
  "/hr/workflows",
  requireTenantAdmin,
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

// Create workflow definition (HR / workspace administrators only)
platformFoundationRouter.post(
  "/hr/workflows",
  requireTenantAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId!;
      const { entityType, name, description, steps } = req.body;
      if (!entityType || !name) {
        return res.status(400).json({ error: "entityType and name are required." });
      }
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
            create: (Array.isArray(steps) ? steps : []).map((step: any, index: number) => ({
              stepOrder: Number(step.stepOrder) || index + 1,
              name: step.name || `Step ${index + 1}`,
              approverType: String(step.approverType || "ROLE").toUpperCase(),
              // Schema column is approverValue (role key, user id, or MANAGER marker)
              approverValue: step.approverValue ?? step.approverRole ?? step.specificUserId ?? null,
              approvalMode: step.approvalMode || "ANY",
              slaHours: step.slaHours ?? null,
              escalateTo: step.escalateTo ?? null,
              canSkip: Boolean(step.canSkip),
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

// Unified HR Approval Inbox (All pending requests in tenant — HR / workspace administrators only)
platformFoundationRouter.get(
  "/hr/approvals",
  requireTenantAdmin,
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

      // 2. Requests awaiting MY action: current step must target me (USER), one of my roles (ROLE),
      //    or me as the requester's reporting manager (MANAGER). Own requests are excluded.
      const pendingCandidates = await db.approvalRequest.findMany({
        where: {
          tenantId,
          status: "PENDING",
          requesterId: { not: userId },
        },
        include: {
          workflow: { include: { steps: true } },
          actions: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      const myRoleKeys = new Set(
        (req.user?.roles || []).map((r) => String(r).toLowerCase().replace(/[-\s]/g, "_"))
      );
      const needsManagerCheck = pendingCandidates.some((r: any) => {
        const step = r.workflow?.steps?.find((s: any) => s.stepOrder === r.currentStep);
        return step && /MANAGER/i.test(String(step.approverType));
      });
      const reportUserIds = new Set<string>();
      if (needsManagerCheck) {
        const me = await db.employee.findFirst({ where: { tenantId, userId }, select: { id: true } });
        if (me) {
          const reports = await db.employee.findMany({
            where: { tenantId, managerId: me.id, userId: { not: null } },
            select: { userId: true },
          });
          reports.forEach((e: any) => e.userId && reportUserIds.add(e.userId));
        }
      }

      const toApprove = pendingCandidates.filter((r: any) => {
        const step = r.workflow?.steps?.find((s: any) => s.stepOrder === r.currentStep);
        if (!step) return false;
        const type = String(step.approverType || "").toUpperCase();
        const value = String(step.approverValue || "");
        if (type === "USER" || type === "SPECIFIC_USER") return value === userId;
        if (type === "ROLE") return myRoleKeys.has(value.toLowerCase().replace(/[-\s]/g, "_"));
        if (type.includes("MANAGER")) return reportUserIds.has(r.requesterId);
        return false;
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
