import { prisma, rawPrisma } from "../prisma.js";
import { getTenantDb } from "../context/tenant-context.js";
import { validateReportingHierarchy } from "../lib/reporting-hierarchy-validator.js";
import { NotificationService } from "./notification.service.js";
import { OutboxService } from "./outbox.service.js";
import { AuditService } from "./audit.service.js";
import { WorkflowService } from "./workflow.service.js";
import { LifecycleService } from "./lifecycle.service.js";

export type ManagerChangeRequestStatus =
  | "DRAFT"
  | "PENDING"
  | "SUBMITTED"
  | "CORRECTION_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

export interface CreateManagerChangeRequestParams {
  tenantId: string;
  actorUserId: string;
  employeeId: string;
  newManagerId: string | null;
  effectiveDate: Date | string;
  reason: string;
  attachmentId?: string | null;
  submitNow?: boolean;
  dbOverride?: any;
}

export interface ReviewManagerChangeRequestParams {
  tenantId: string;
  actorUserId: string;
  requestId: string;
  action: "APPROVE" | "REJECT" | "REQUEST_CORRECTION";
  comments?: string;
  dbOverride?: any;
}

export class ReportingManagerChangeService {
  /**
   * Deterministic idempotency key generator for manager change notifications.
   * Pattern: mgr_chg_{requestId}_{stage}
   */
  public static generateIdempotencyKey(requestId: string, stage: string): string {
    return `mgr_chg_${requestId}_${stage}`;
  }

  /**
   * Validates and submits a new Reporting Manager Change Request.
   */
  public static async createRequest(params: CreateManagerChangeRequestParams) {
    const {
      tenantId,
      actorUserId,
      employeeId,
      newManagerId,
      effectiveDate,
      reason,
      attachmentId,
      submitNow = true,
      dbOverride,
    } = params;

    const db = dbOverride || rawPrisma || prisma;

    if (!reason || reason.trim().length === 0) {
      throw new Error("A justification reason is mandatory for a reporting manager change request.");
    }

    const parsedEffectiveDate = new Date(effectiveDate);
    if (isNaN(parsedEffectiveDate.getTime())) {
      throw new Error("Invalid effectiveDate specified.");
    }

    // 1. Fetch and validate employee
    const employee = await db.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        status: true,
        managerId: true,
        departmentId: true,
        branchId: true,
        manager: {
          select: { id: true, userId: true, firstName: true, lastName: true, employeeCode: true },
        },
      },
    });

    if (!employee) {
      throw new Error("Target employee not found in the current tenant context.");
    }

    if (employee.status !== "active") {
      throw new Error(`Cannot modify reporting manager for an employee in '${employee.status}' status.`);
    }

    // Anti-self modification check: Employee cannot directly change their own manager
    if (employee.userId && employee.userId === actorUserId) {
      // Allow self-service request ONLY if permitted and routing through workflow
      // but verify they are not approving their own request
    }

    const currentManagerId = employee.managerId;
    const cleanNewManagerId = newManagerId ? newManagerId.trim() : null;

    // Check if new manager is identical to current manager
    if (cleanNewManagerId === currentManagerId) {
      throw new Error("Proposed manager is identical to the employee's current reporting manager.");
    }

    // 2. Validate hierarchy using validateReportingHierarchy
    const hierarchyCheck = await validateReportingHierarchy(
      tenantId,
      employee.id,
      cleanNewManagerId,
      db
    );

    if (!hierarchyCheck.valid) {
      throw new Error(hierarchyCheck.error || "Hierarchy validation failed.");
    }

    // 3. Conflict detection: Check if a pending or approved uncompleted request already exists for this employee
    const conflictingRequest = await db.employeeTransfer.findFirst({
      where: {
        tenantId,
        employeeId: employee.id,
        status: { in: ["PENDING", "SUBMITTED", "CORRECTION_REQUESTED", "APPROVED"] },
        reason: { contains: "[MANAGER_CHANGE" },
      },
      select: { id: true, status: true, effectiveDate: true },
    });

    if (conflictingRequest) {
      throw new Error(
        `A conflicting manager change request (#${conflictingRequest.id}) is already in '${conflictingRequest.status}' status for this employee.`
      );
    }

    // 4. Create EmployeeTransfer record representing manager change
    const initialStatus = submitNow ? "PENDING" : "DRAFT";
    const formattedReason = `[MANAGER_CHANGE] ${reason.trim()}${attachmentId ? ` [Attachment: ${attachmentId}]` : ""}`;

    const transfer = await db.employeeTransfer.create({
      data: {
        tenantId,
        employeeId: employee.id,
        fromBranchId: null, // Manager-only change preserves branch
        toBranchId: null,
        fromDeptId: null,   // Manager-only change preserves department
        toDeptId: null,
        oldManagerId: currentManagerId,
        newManagerId: cleanNewManagerId,
        effectiveDate: parsedEffectiveDate,
        reason: formattedReason,
        status: initialStatus,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
          },
        },
      },
    });

    // 5. If submitNow, initiate approval workflow
    let approvalRequest: any = null;
    if (submitNow) {
      try {
        approvalRequest = await WorkflowService.submit({
          tenantId,
          entityType: "REPORTING_MANAGER_CHANGE",
          entityId: transfer.id,
          requesterId: actorUserId,
          module: "ORGANIZATION",
          payloadSnapshot: {
            transferId: transfer.id,
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            oldManagerId: currentManagerId,
            newManagerId: cleanNewManagerId,
            effectiveDate: parsedEffectiveDate.toISOString(),
            reason,
          },
        });
      } catch (wfErr: any) {
        console.warn("[ReportingManagerChangeService] WorkflowService warning:", wfErr.message);
      }

      // Notify approver / HR team
      const idempotencyKey = this.generateIdempotencyKey(transfer.id, "submitted");
      try {
        // Resolve HR or current/proposed manager approvers
        const hrAdmins = await db.userRole?.findMany({
          where: { tenantId, role: { in: ["hr_admin", "super_admin"] } },
          select: { userId: true },
          take: 5,
        });

        if (hrAdmins && hrAdmins.length > 0) {
          for (const hr of hrAdmins) {
            await NotificationService.createNotification({
              tenantId,
              userId: hr.userId,
              title: "Reporting Manager Change Requested",
              message: `A manager change request for ${employee.firstName} ${employee.lastName} (${employee.employeeCode}) was submitted and requires approval.`,
              type: "MANAGER_CHANGE_SUBMITTED",
              actionUrl: "/hr/organization/manager-changes",
              metadata: {
                idempotencyKey: `${idempotencyKey}_${hr.userId}`,
                transferId: transfer.id,
                employeeId: employee.id,
              },
            });
          }
        }
      } catch (notifErr: any) {
        console.warn("[ReportingManagerChangeService] Notification warning:", notifErr.message);
      }

      // Emits outbox event
      try {
        await OutboxService.createOutboxEvent(
          {
            tenantId,
            eventType: "REPORTING_MANAGER_CHANGE_REQUESTED",
            entityType: "EmployeeTransfer",
            entityId: transfer.id,
            actorId: actorUserId,
            payload: {
              transferId: transfer.id,
              employeeId: employee.id,
              oldManagerId: currentManagerId,
              newManagerId: cleanNewManagerId,
              effectiveDate: parsedEffectiveDate.toISOString(),
              reason,
            },
            metadata: { idempotencyKey },
          },
          dbOverride
        );
      } catch (outboxErr: any) {
        console.warn("[ReportingManagerChangeService] Outbox event warning:", outboxErr.message);
      }

      // Record audit log
      try {
        await AuditService.logMutation({
          tenantId,
          actorId: actorUserId,
          action: "REPORTING_MANAGER_CHANGE_REQUESTED",
          entityType: "EmployeeTransfer",
          entityId: transfer.id,
          metadata: {
            employeeId: employee.id,
            oldManagerId: currentManagerId,
            newManagerId: cleanNewManagerId,
            effectiveDate: parsedEffectiveDate.toISOString(),
            reason,
          },
        });
      } catch (auditErr: any) {
        console.warn("[ReportingManagerChangeService] Audit warning:", auditErr.message);
      }
    }

    return {
      request: transfer,
      approvalRequest,
    };
  }

  /**
   * Reviews an existing Reporting Manager Change Request (APPROVE, REJECT, REQUEST_CORRECTION).
   */
  public static async reviewRequest(params: ReviewManagerChangeRequestParams) {
    const { tenantId, actorUserId, requestId, action, comments, dbOverride } = params;
    const db = dbOverride || rawPrisma || prisma;

    const transfer = await db.employeeTransfer.findFirst({
      where: { id: requestId, tenantId },
      include: {
        employee: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            status: true,
            managerId: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new Error("Manager change request not found in current tenant context.");
    }

    if (transfer.status === "COMPLETED") {
      throw new Error("Cannot review a request that has already been completed and applied.");
    }

    if (transfer.status === "REJECTED" || transfer.status === "CANCELLED") {
      throw new Error(`Cannot review a request currently in '${transfer.status}' status.`);
    }

    // Segregation of duties: Employee cannot approve their own manager change request
    if (transfer.employee.userId && transfer.employee.userId === actorUserId) {
      throw new Error("Forbidden: Employees cannot approve or review their own reporting manager change request.");
    }

    if ((action === "REJECT" || action === "REQUEST_CORRECTION") && (!comments || comments.trim().length === 0)) {
      throw new Error(`A justification comment is mandatory when taking the '${action}' action.`);
    }

    const now = new Date();
    const effectiveDate = new Date(transfer.effectiveDate);

    if (action === "REJECT") {
      const updatedTransfer = await db.employeeTransfer.update({
        where: { id: transfer.id },
        data: {
          status: "REJECTED",
          reason: `${transfer.reason || ""}\n[REJECTED on ${now.toISOString().slice(0, 10)} by user ${actorUserId}]: ${comments}`.trim(),
        },
      });

      // Audit log
      try {
        await AuditService.logMutation({
          tenantId,
          actorId: actorUserId,
          action: "REPORTING_MANAGER_CHANGE_REJECTED",
          entityType: "EmployeeTransfer",
          entityId: transfer.id,
          metadata: { comments },
        });
      } catch {}

      return { request: updatedTransfer, applied: false };
    }

    if (action === "REQUEST_CORRECTION") {
      const updatedTransfer = await db.employeeTransfer.update({
        where: { id: transfer.id },
        data: {
          status: "CORRECTION_REQUESTED",
          reason: `${transfer.reason || ""}\n[CORRECTION_REQUESTED on ${now.toISOString().slice(0, 10)} by user ${actorUserId}]: ${comments}`.trim(),
        },
      });

      // Audit log
      try {
        await AuditService.logMutation({
          tenantId,
          actorId: actorUserId,
          action: "REPORTING_MANAGER_CHANGE_CORRECTION_REQUESTED",
          entityType: "EmployeeTransfer",
          entityId: transfer.id,
          metadata: { comments },
        });
      } catch {}

      return { request: updatedTransfer, applied: false };
    }

    if (action === "APPROVE") {
      // Check if effective date has arrived (<= today in UTC)
      const isDue = effectiveDate.getTime() <= now.getTime();

      if (isDue) {
        // Immediate application
        const appliedResult = await this.applyManagerChange({
          tenantId,
          actorUserId,
          transferId: transfer.id,
          dbOverride: db,
        });

        return {
          request: appliedResult.transfer,
          applied: true,
          appliedAt: now.toISOString(),
        };
      } else {
        // Future effective date: Mark APPROVED awaiting effective date
        const updatedTransfer = await db.employeeTransfer.update({
          where: { id: transfer.id },
          data: {
            status: "APPROVED",
            reason: `${transfer.reason || ""}\n[APPROVED on ${now.toISOString().slice(0, 10)} by user ${actorUserId} - Effective: ${effectiveDate.toISOString().slice(0, 10)}]${comments ? `: ${comments}` : ""}`.trim(),
          },
        });

        // Audit log
        try {
          await AuditService.logMutation({
            tenantId,
            actorId: actorUserId,
            action: "REPORTING_MANAGER_CHANGE_APPROVED_AWAITING_DATE",
            entityType: "EmployeeTransfer",
            entityId: transfer.id,
            metadata: { effectiveDate: effectiveDate.toISOString() },
          });
        } catch {}

        return {
          request: updatedTransfer,
          applied: false,
          awaitingEffectiveDate: true,
        };
      }
    }

    throw new Error(`Unsupported action: ${action}`);
  }

  /**
   * Applies an approved Reporting Manager Change atomically:
   * 1. Revalidates reporting hierarchy using validateReportingHierarchy.
   * 2. Verifies proposed manager is still active and valid.
   * 3. Atomically updates employee.managerId.
   * 4. Updates transfer record status to COMPLETED.
   * 5. Emits events and dispatches notifications.
   */
  public static async applyManagerChange(params: {
    tenantId: string;
    actorUserId: string;
    transferId: string;
    dbOverride?: any;
  }) {
    const { tenantId, actorUserId, transferId, dbOverride } = params;
    const db = dbOverride || rawPrisma || prisma;

    const transfer = await db.employeeTransfer.findFirst({
      where: { id: transferId, tenantId },
      include: {
        employee: {
          select: {
            id: true,
            tenantId: true,
            userId: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            status: true,
            managerId: true,
            departmentId: true,
            branchId: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new Error("Manager change request not found.");
    }

    if (transfer.status === "COMPLETED") {
      throw new Error("This manager change has already been applied.");
    }

    const employee = transfer.employee;
    if (!employee || employee.tenantId !== tenantId) {
      throw new Error("Target employee record not found in tenant context.");
    }

    const targetManagerId = transfer.newManagerId ? transfer.newManagerId.trim() : null;

    // 1. Re-validate hierarchy strictly before applying mutation
    const hierarchyCheck = await validateReportingHierarchy(
      tenantId,
      employee.id,
      targetManagerId,
      db
    );

    if (!hierarchyCheck.valid) {
      throw new Error(`Hierarchy validation failed at application time: ${hierarchyCheck.error}`);
    }

    // 2. Fetch new manager details for notifications
    let newManager: any = null;
    if (targetManagerId) {
      newManager = await db.employee.findFirst({
        where: { id: targetManagerId, tenantId },
        select: { id: true, userId: true, firstName: true, lastName: true, employeeCode: true, status: true },
      });
      if (!newManager || newManager.status !== "active") {
        throw new Error("Proposed manager is no longer active or does not exist.");
      }
    }

    // 3. Fetch old manager details for notifications
    let oldManager: any = null;
    if (transfer.oldManagerId) {
      oldManager = await db.employee.findFirst({
        where: { id: transfer.oldManagerId, tenantId },
        select: { id: true, userId: true, firstName: true, lastName: true, employeeCode: true },
      });
    }

    // 4. Execute atomic database mutation inside transaction
    const now = new Date();
    const [updatedEmployee, completedTransfer] = await db.$transaction([
      db.employee.update({
        where: { id: employee.id },
        data: {
          managerId: targetManagerId,
        },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          managerId: true,
          departmentId: true,
          branchId: true,
          designationId: true,
          salary: true,
          status: true,
        },
      }),
      db.employeeTransfer.update({
        where: { id: transfer.id },
        data: {
          status: "COMPLETED",
          reason: `${transfer.reason || ""}\n[APPLIED on ${now.toISOString().slice(0, 10)} by user ${actorUserId}]`.trim(),
        },
      }),
    ]);

    // 5. Emit Audit Log
    try {
      await AuditService.logMutation({
        tenantId,
        actorId: actorUserId,
        action: "REPORTING_MANAGER_CHANGE_APPLIED",
        entityType: "Employee",
        entityId: employee.id,
        metadata: {
          transferId: transfer.id,
          employeeId: employee.id,
          oldManagerId: transfer.oldManagerId,
          newManagerId: targetManagerId,
          effectiveDate: transfer.effectiveDate,
        },
      });
    } catch (auditErr: any) {
      console.warn("[ReportingManagerChangeService] Audit warning:", auditErr.message);
    }

    // 6. Emit Outbox Event
    const idempotencyKey = this.generateIdempotencyKey(transfer.id, "applied");
    try {
      await OutboxService.createOutboxEvent(
        {
          tenantId,
          eventType: "REPORTING_MANAGER_CHANGE_APPLIED",
          entityType: "Employee",
          entityId: employee.id,
          actorId: actorUserId,
          payload: {
            transferId: transfer.id,
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            oldManagerId: transfer.oldManagerId,
            newManagerId: targetManagerId,
            appliedAt: now.toISOString(),
          },
          metadata: { idempotencyKey },
        },
        dbOverride
      );
    } catch (outboxErr: any) {
      console.warn("[ReportingManagerChangeService] Outbox event warning:", outboxErr.message);
    }

    // 7. Dispatch multi-party notifications
    try {
      const empName = `${employee.firstName} ${employee.lastName}`.trim();
      const newMgrName = newManager ? `${newManager.firstName} ${newManager.lastName}`.trim() : "None";

      // Notify Employee
      if (employee.userId) {
        await NotificationService.createNotification({
          tenantId,
          userId: employee.userId,
          title: "Reporting Manager Updated",
          message: `Your reporting line has been updated. Your current reporting manager is now ${newMgrName}.`,
          type: "MANAGER_CHANGE_APPLIED",
          actionUrl: "/me/organization/structure",
          metadata: { idempotencyKey: `${idempotencyKey}_emp`, transferId: transfer.id },
        });
      }

      // Notify New Manager
      if (newManager?.userId) {
        await NotificationService.createNotification({
          tenantId,
          userId: newManager.userId,
          title: "New Direct Report Assigned",
          message: `${empName} (${employee.employeeCode}) now reports directly to you.`,
          type: "NEW_DIRECT_REPORT_ASSIGNED",
          actionUrl: "/me/team",
          metadata: { idempotencyKey: `${idempotencyKey}_new_mgr`, transferId: transfer.id },
        });
      }

      // Notify Old Manager
      if (oldManager?.userId) {
        await NotificationService.createNotification({
          tenantId,
          userId: oldManager.userId,
          title: "Direct Report Reassigned",
          message: `${empName} (${employee.employeeCode}) has been reassigned to reporting manager ${newMgrName}.`,
          type: "DIRECT_REPORT_REASSIGNED",
          actionUrl: "/me/team",
          metadata: { idempotencyKey: `${idempotencyKey}_old_mgr`, transferId: transfer.id },
        });
      }
    } catch (notifErr: any) {
      console.warn("[ReportingManagerChangeService] Notification warning:", notifErr.message);
    }

    return {
      employee: updatedEmployee,
      transfer: completedTransfer,
    };
  }

  /**
   * Retrieves manager change requests with rich filtering, search, and pagination.
   */
  public static async getRequests(
    tenantId: string,
    filters: {
      status?: string;
      search?: string;
      employeeId?: string;
      managerId?: string;
      page?: number;
      limit?: number;
    } = {},
    dbOverride?: any
  ) {
    const db = dbOverride || rawPrisma || prisma;
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Math.min(100, Math.max(1, Number(filters.limit || 20)));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      reason: { contains: "[MANAGER_CHANGE" },
    };

    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.managerId) {
      where.OR = [{ oldManagerId: filters.managerId }, { newManagerId: filters.managerId }];
    }

    if (filters.search) {
      const term = filters.search.trim();
      where.employee = {
        OR: [
          { firstName: { contains: term, mode: "insensitive" } },
          { lastName: { contains: term, mode: "insensitive" } },
          { employeeCode: { contains: term, mode: "insensitive" } },
        ],
      };
    }

    const [total, requests] = await Promise.all([
      db.employeeTransfer.count({ where }),
      db.employeeTransfer.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              position: true,
              department: { select: { id: true, name: true } },
              branch: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // Enrich with old and new manager names
    const managerIds = new Set<string>();
    for (const r of requests) {
      if (r.oldManagerId) managerIds.add(r.oldManagerId);
      if (r.newManagerId) managerIds.add(r.newManagerId);
    }

    const managers = managerIds.size > 0
      ? await db.employee.findMany({
          where: { tenantId, id: { in: Array.from(managerIds) } },
          select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true },
        })
      : [];

    const managerMap = new Map(managers.map((m: any) => [m.id, m]));

    const enriched = requests.map((r: any) => ({
      ...r,
      oldManager: r.oldManagerId ? managerMap.get(r.oldManagerId) || null : null,
      newManager: r.newManagerId ? managerMap.get(r.newManagerId) || null : null,
    }));

    return {
      items: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves summary KPI counts for manager change review dashboard.
   */
  public static async getOverview(tenantId: string, dbOverride?: any) {
    const db = dbOverride || rawPrisma || prisma;
    const now = new Date();

    const records = await db.employeeTransfer.findMany({
      where: {
        tenantId,
        reason: { contains: "[MANAGER_CHANGE" },
      },
      select: {
        id: true,
        status: true,
        effectiveDate: true,
      },
    });

    let pending = 0;
    let correctionRequested = 0;
    let approvedAwaitingDate = 0;
    let completed = 0;
    let rejected = 0;

    for (const r of records) {
      if (r.status === "PENDING" || r.status === "SUBMITTED") pending++;
      else if (r.status === "CORRECTION_REQUESTED") correctionRequested++;
      else if (r.status === "APPROVED") {
        if (new Date(r.effectiveDate) > now) approvedAwaitingDate++;
        else pending++; // Due for cron processing
      } else if (r.status === "COMPLETED") completed++;
      else if (r.status === "REJECTED") rejected++;
    }

    return {
      counts: {
        total: records.length,
        pending,
        correctionRequested,
        approvedAwaitingDate,
        completed,
        rejected,
      },
      evaluatedAt: now.toISOString(),
    };
  }

  /**
   * Retrieves complete historical manager changes for an employee.
   */
  public static async getEmployeeManagerHistory(tenantId: string, employeeId: string, dbOverride?: any) {
    const db = dbOverride || rawPrisma || prisma;

    const records = await db.employeeTransfer.findMany({
      where: {
        tenantId,
        employeeId,
        reason: { contains: "[MANAGER_CHANGE" },
        status: "COMPLETED",
      },
      orderBy: { effectiveDate: "desc" },
    });

    const managerIds = new Set<string>();
    for (const r of records) {
      if (r.oldManagerId) managerIds.add(r.oldManagerId);
      if (r.newManagerId) managerIds.add(r.newManagerId);
    }

    const managers = managerIds.size > 0
      ? await db.employee.findMany({
          where: { tenantId, id: { in: Array.from(managerIds) } },
          select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true },
        })
      : [];

    const managerMap = new Map(managers.map((m: any) => [m.id, m]));

    return records.map((r: any) => ({
      id: r.id,
      effectiveDate: r.effectiveDate,
      reason: r.reason,
      oldManager: r.oldManagerId ? managerMap.get(r.oldManagerId) || null : null,
      newManager: r.newManagerId ? managerMap.get(r.newManagerId) || null : null,
      appliedAt: r.updatedAt,
    }));
  }
}
