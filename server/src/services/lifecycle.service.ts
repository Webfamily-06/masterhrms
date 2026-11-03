import { getTenantDb } from "../context/tenant-context";
import { AuditService } from "./audit.service";
import { OutboxService } from "./outbox.service";
import { NotificationService } from "./notification.service";

export interface LifecycleEventPayload {
  tenantId: string;
  employeeId: string;
  eventType: string;
  effectiveDate: Date | string;
  previousState?: any;
  newState?: any;
  changedFields?: string[];
  actorId?: string;
  source?: string;
  reason?: string;
  referenceId?: string;
  auditMetadata?: any;
}

const EMPLOYEE_CORE_SELECT = {
  id: true,
  tenantId: true,
  firstName: true,
  lastName: true,
  salary: true,
  branchId: true,
  departmentId: true,
  managerId: true,
  position: true,
  status: true,
  designationId: true,
  userId: true,
  joinedAt: true,
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true } },
};

export class LifecycleService {
  /**
   * 1. APPEND-ONLY IMMUTABLE EVENT STORE (P6-BR-019)
   */
  static async recordEvent(payload: LifecycleEventPayload) {
    const db = getTenantDb();
    const effectiveDate = new Date(payload.effectiveDate);

    const event = await db.employeeEvent.create({
      data: {
        tenantId: payload.tenantId,
        employeeId: payload.employeeId,
        eventType: payload.eventType,
        effectiveDate,
        previousState: payload.previousState || undefined,
        newState: payload.newState || undefined,
        changedFields: payload.changedFields || [],
        actorId: payload.actorId || null,
        source: payload.source || "system",
        reason: payload.reason || null,
        referenceId: payload.referenceId || null,
        auditMetadata: payload.auditMetadata || undefined,
      },
    });

    // Write audit log & outbox event
    await AuditService.log({
      tenantId: payload.tenantId,
      actorId: payload.actorId || "system",
      action: `LIFECYCLE_${payload.eventType}`,
      entityType: "Employee",
      entityId: payload.employeeId,
      metadata: {
        eventId: event.id,
        eventType: payload.eventType,
        effectiveDate: effectiveDate.toISOString(),
        referenceId: payload.referenceId,
      },
    });

    await OutboxService.publish({
      tenantId: payload.tenantId,
      eventType: "employee.lifecycle_event",
      entityId: payload.employeeId,
      entityType: "Employee",
      actorId: payload.actorId || "system",
      payload: {
        eventId: event.id,
        employeeId: payload.employeeId,
        eventType: payload.eventType,
        effectiveDate: effectiveDate.toISOString(),
      },
    });

    return event;
  }

  /**
   * 2. EMPLOYEE TIMELINE QUERY
   */
  static async getTimeline(tenantId: string, employeeId: string, limit = 50) {
    const db = getTenantDb();
    return await db.employeeEvent.findMany({
      where: { tenantId, employeeId },
      orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
  }

  /**
   * 3. PROBATION & CONFIRMATION (P6-BR-001, P6-BR-002, P6-BR-003)
   */
  static async extendProbation(
    tenantId: string,
    actorId: string,
    probationId: string,
    extensionDays: number,
    remarks: string
  ) {
    const db = getTenantDb();

    if (extensionDays <= 0 || extensionDays > 90) {
      throw new Error("Probation extension must be between 1 and 90 calendar days.");
    }

    const probation = await db.probationRecord.findFirst({
      where: { id: probationId, tenantId },
      include: { employee: { select: EMPLOYEE_CORE_SELECT } },
    });

    if (!probation) {
      throw new Error("Probation record not found.");
    }

    if (probation.status === "confirmed") {
      throw new Error("Cannot extend probation for an already confirmed employee.");
    }

    const totalDays = probation.probationPeriodDays + extensionDays;
    if (totalDays > 180) {
      throw new Error(`Total cumulative probation cannot exceed 180 days (currently ${totalDays} days).`);
    }

    const newEndDate = new Date(probation.endDate);
    newEndDate.setDate(newEndDate.getDate() + extensionDays);

    const updated = await db.probationRecord.update({
      where: { id: probationId },
      data: {
        endDate: newEndDate,
        extendedUntil: newEndDate,
        probationPeriodDays: totalDays,
        status: "extended",
        remarks: remarks ? `${probation.remarks || ""}\r\n[Extended ${extensionDays}d]: ${remarks}`.trim() : probation.remarks,
      },
    });

    await this.recordEvent({
      tenantId,
      employeeId: probation.employeeId,
      eventType: "PROBATION_EXTENDED",
      effectiveDate: new Date(),
      previousState: { endDate: probation.endDate, periodDays: probation.probationPeriodDays },
      newState: { endDate: newEndDate, periodDays: totalDays },
      changedFields: ["endDate", "probationPeriodDays", "status"],
      actorId,
      source: "hr_admin",
      reason: remarks,
      referenceId: probation.id,
    });

    return updated;
  }

  static async confirmProbation(
    tenantId: string,
    actorId: string,
    probationId: string,
    performanceRating?: string,
    remarks?: string
  ) {
    const db = getTenantDb();

    const probation = await db.probationRecord.findFirst({
      where: { id: probationId, tenantId },
      include: { employee: { select: EMPLOYEE_CORE_SELECT } },
    });

    if (!probation) {
      throw new Error("Probation record not found.");
    }

    if (probation.status === "confirmed") {
      throw new Error("Employee is already confirmed.");
    }

    const confirmedAt = new Date();

    const updated = await db.probationRecord.update({
      where: { id: probationId },
      data: {
        status: "confirmed",
        performanceRating: performanceRating || probation.performanceRating,
        remarks: remarks || probation.remarks,
        confirmedAt,
      },
    });

    await this.recordEvent({
      tenantId,
      employeeId: probation.employeeId,
      eventType: "CONFIRMED",
      effectiveDate: confirmedAt,
      previousState: { status: probation.status },
      newState: { status: "confirmed", confirmedAt },
      changedFields: ["status", "confirmedAt", "performanceRating"],
      actorId,
      source: "hr_admin",
      reason: remarks || "Probation successfully completed and confirmed.",
      referenceId: probation.id,
    });

    if (probation.employee.userId) {
      await NotificationService.createNotification({
        tenantId,
        userId: probation.employee.userId,
        type: "EMPLOYMENT_CONFIRMED",
        title: "Employment Confirmed",
        message: `Congratulations! Your probation period has been successfully confirmed.`,
      });
    }

    return updated;
  }

  /**
   * 4. PROMOTIONS & SALARY LINKAGE (P6-BR-004, P6-BR-005)
   */
  static async executePromotion(
    tenantId: string,
    actorId: string,
    params: {
      employeeId: string;
      newDesignationId?: string;
      newDesignation: string;
      newDepartmentId?: string;
      newDepartment?: string;
      effectiveDate: string | Date;
      newSalary?: number;
      promotionType?: string;
      remarks?: string;
    }
  ) {
    const db = getTenantDb();
    const effectiveDate = new Date(params.effectiveDate);

    const employee = await (db.employee as any).findFirst({
      where: { id: params.employeeId, tenantId },
      select: EMPLOYEE_CORE_SELECT,
    });

    if (!employee) {
      throw new Error("Employee not found.");
    }

    const previousDesignation = employee.designation?.name || employee.position || "N/A";
    const previousDepartment = employee.department?.name || "N/A";
    const previousSalary = employee.salary ? Number(employee.salary) : null;

    // 1. Create Promotion Record
    const promotion = await db.promotionRecord.create({
      data: {
        tenantId,
        employeeId: employee.id,
        promotionDate: effectiveDate,
        previousDesignation,
        newDesignation: params.newDesignation,
        previousDepartment,
        newDepartment: params.newDepartment || previousDepartment,
        previousSalary,
        newSalary: params.newSalary || previousSalary,
        promotionType: params.promotionType || "promotion",
        remarks: params.remarks || null,
      },
    });

    const isEffectiveNow = effectiveDate <= new Date();

    // Versioned EmployeeSalaryAssignment (TASK-P2-02, GAP-VAL-020, GAP-DB-API-005)
    if (params.newSalary && params.newSalary > 0) {
      if (isEffectiveNow) {
        try {
          const prior = await (db as any).employeeSalaryAssignment.findFirst({
            where: { tenantId, employeeId: employee.id, isCurrent: true },
            orderBy: { effectiveFrom: "desc" },
          });
          if (prior) {
            const dayBefore = new Date(effectiveDate);
            dayBefore.setDate(dayBefore.getDate() - 1);
            await (db as any).employeeSalaryAssignment.update({
              where: { id: prior.id },
              data: { isCurrent: false, effectiveTo: dayBefore },
            });
          }
        } catch (e: any) {
          console.warn("[Lifecycle] prior salary assignment non-fatal lookup:", e?.message);
        }

        try {
          await (db as any).employeeSalaryAssignment.create({
            data: {
              tenantId,
              employeeId: employee.id,
              ctcAnnual: params.newSalary * 12,
              ctcMonthly: params.newSalary,
              effectiveFrom: effectiveDate,
              isCurrent: true,
              remarks: `Promotion: ${params.newDesignation} (${params.remarks || ""})`,
            },
          });
        } catch (e: any) {
          console.warn("[Lifecycle] salary assignment create non-fatal:", e?.message);
        }
      } else {
        try {
          await (db as any).employeeSalaryAssignment.create({
            data: {
              tenantId,
              employeeId: employee.id,
              ctcAnnual: params.newSalary * 12,
              ctcMonthly: params.newSalary,
              effectiveFrom: effectiveDate,
              isCurrent: false,
              remarks: `Scheduled Promotion: ${params.newDesignation} (${params.remarks || ""})`,
            },
          });
        } catch (e: any) {
          console.warn("[Lifecycle] future salary assignment create non-fatal:", e?.message);
        }
      }
    }

    // 2. Update Employee Profile (only mutate Employee.salary if isEffectiveNow)
    const updateData: any = {
      position: params.newDesignation,
    };
    if (params.newDesignationId) updateData.designationId = params.newDesignationId;
    if (params.newDepartmentId) updateData.departmentId = params.newDepartmentId;
    if (isEffectiveNow && params.newSalary && params.newSalary > 0) {
      updateData.salary = params.newSalary;
    }

    await (db.employee as any).update({
      where: { id: employee.id },
      data: updateData,
      select: { id: true },
    });

    // 3. Record Event
    await this.recordEvent({
      tenantId,
      employeeId: employee.id,
      eventType: "PROMOTED",
      effectiveDate,
      previousState: {
        designation: previousDesignation,
        department: previousDepartment,
        salary: previousSalary,
      },
      newState: {
        designation: params.newDesignation,
        department: params.newDepartment || previousDepartment,
        salary: params.newSalary || previousSalary,
      },
      changedFields: ["position", "designationId", ...(params.newDepartmentId ? ["departmentId"] : []), ...(params.newSalary ? ["salary"] : [])],
      actorId,
      source: "hr_admin",
      reason: params.remarks,
      referenceId: promotion.id,
    });

    return promotion;
  }

  /**
   * 5. TRANSFERS (P6-BR-006)
   */
  /**
   * Applies any approved future-dated salary assignments that have reached their effective date.
   */
  static async applyDueSalaryAssignments(tenantId: string) {
    const db = getTenantDb();
    const now = new Date();
    try {
      const dueAssignments = await (db as any).employeeSalaryAssignment.findMany({
        where: {
          tenantId,
          isCurrent: false,
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
        },
        orderBy: { effectiveFrom: "asc" },
      });

      for (const assignment of dueAssignments) {
        await (db as any).employeeSalaryAssignment.updateMany({
          where: {
            tenantId,
            employeeId: assignment.employeeId,
            isCurrent: true,
            id: { not: assignment.id },
          },
          data: { isCurrent: false },
        });

        await (db as any).employeeSalaryAssignment.update({
          where: { id: assignment.id },
          data: { isCurrent: true },
        });

        await (db.employee as any).update({
          where: { id: assignment.employeeId },
          data: { salary: assignment.ctcMonthly },
          select: { id: true },
        });
      }
      return dueAssignments.length;
    } catch (err: any) {
      console.warn("[Lifecycle] applyDueSalaryAssignments fallback:", err?.message);
      return 0;
    }
  }

  /**
   * 5. TRANSFERS (TASK-P2-01, GAP-VAL-018, WF-GAP-003)
   */
  static async requestTransfer(
    tenantId: string,
    actorId: string,
    params: {
      employeeId: string;
      toBranchId?: string;
      toDeptId?: string;
      newManagerId?: string;
      effectiveDate: string | Date;
      reason?: string;
    }
  ) {
    const db = getTenantDb();
    const effectiveDate = new Date(params.effectiveDate);

    const employee = await (db.employee as any).findFirst({
      where: { id: params.employeeId, tenantId },
      select: EMPLOYEE_CORE_SELECT,
    });
    if (!employee) throw new Error("Employee not found.");

    const transfer = await db.employeeTransfer.create({
      data: {
        tenantId,
        employeeId: employee.id,
        fromBranchId: employee.branchId,
        toBranchId: params.toBranchId || null,
        fromDeptId: employee.departmentId,
        toDeptId: params.toDeptId || null,
        oldManagerId: employee.managerId,
        newManagerId: params.newManagerId || null,
        effectiveDate,
        reason: params.reason || null,
        status: "PENDING",
      },
    });

    return transfer;
  }

  static async approveTransfer(tenantId: string, actorId: string, transferId: string) {
    const db = getTenantDb();
    const transfer = await db.employeeTransfer.findFirst({
      where: { id: transferId, tenantId },
      include: { employee: { select: EMPLOYEE_CORE_SELECT } },
    });
    if (!transfer) throw new Error("Transfer record not found.");
    if (transfer.status !== "PENDING") {
      throw new Error(`Cannot approve transfer in status ${transfer.status}`);
    }

    const now = new Date();
    const isDue = transfer.effectiveDate <= now;

    if (isDue) {
      return await this.applyTransferMutation(tenantId, actorId, transfer);
    } else {
      return await db.employeeTransfer.update({
        where: { id: transferId },
        data: { status: "APPROVED" },
      });
    }
  }

  static async applyDueTransfers(tenantId: string) {
    const db = getTenantDb();
    const now = new Date();
    const dueTransfers = await db.employeeTransfer.findMany({
      where: {
        tenantId,
        status: "APPROVED",
        effectiveDate: { lte: now },
      },
      include: { employee: { select: EMPLOYEE_CORE_SELECT } },
    });

    const applied: any[] = [];
    for (const transfer of dueTransfers) {
      const res = await this.applyTransferMutation(tenantId, "scheduler", transfer);
      applied.push(res);
    }
    return applied;
  }

  private static async applyTransferMutation(tenantId: string, actorId: string, transfer: any) {
    const db = getTenantDb();
    const updateData: any = {};
    if (transfer.toBranchId) updateData.branchId = transfer.toBranchId;
    if (transfer.toDeptId) updateData.departmentId = transfer.toDeptId;
    if (transfer.newManagerId) updateData.managerId = transfer.newManagerId;

    if (Object.keys(updateData).length > 0) {
      await (db.employee as any).update({
        where: { id: transfer.employeeId },
        data: updateData,
        select: { id: true },
      });
    }

    const completed = await db.employeeTransfer.update({
      where: { id: transfer.id },
      data: { status: "COMPLETED" },
    });

    await this.recordEvent({
      tenantId,
      employeeId: transfer.employeeId,
      eventType: "TRANSFERRED",
      effectiveDate: transfer.effectiveDate,
      previousState: {
        branchId: transfer.fromBranchId,
        departmentId: transfer.fromDeptId,
        managerId: transfer.oldManagerId,
      },
      newState: {
        branchId: transfer.toBranchId || transfer.fromBranchId,
        departmentId: transfer.toDeptId || transfer.fromDeptId,
        managerId: transfer.newManagerId || transfer.oldManagerId,
      },
      changedFields: Object.keys(updateData),
      actorId,
      source: "hr_admin",
      reason: transfer.reason,
      referenceId: transfer.id,
    });

    return completed;
  }

  static async executeTransfer(
    tenantId: string,
    actorId: string,
    params: {
      employeeId: string;
      toBranchId?: string;
      toDeptId?: string;
      newManagerId?: string;
      effectiveDate: string | Date;
      reason?: string;
    }
  ) {
    const effectiveDate = new Date(params.effectiveDate);
    const now = new Date();

    const transfer = await this.requestTransfer(tenantId, actorId, params);
    if (effectiveDate <= now) {
      return await this.approveTransfer(tenantId, actorId, transfer.id);
    } else {
      return await this.approveTransfer(tenantId, actorId, transfer.id);
    }
  }

  /**
   * 6. WARNINGS & ACKNOWLEDGEMENT (P6-BR-007)
   */
  static async issueWarning(
    tenantId: string,
    actorId: string,
    params: {
      employeeId: string;
      warningTypeId?: string;
      subject: string;
      severity: string;
      warningDate: string | Date;
      description: string;
      warningBy?: string;
      letterUrl?: string;
    }
  ) {
    const db = getTenantDb();
    const warningDate = new Date(params.warningDate);

    const warning = await db.disciplinaryWarning.create({
      data: {
        tenantId,
        employeeId: params.employeeId,
        warningTypeId: params.warningTypeId || null,
        subject: params.subject,
        severity: params.severity || "moderate",
        warningDate,
        description: params.description,
        warningBy: params.warningBy || null,
        letterUrl: params.letterUrl || null,
        status: "issued",
      },
    });

    await this.recordEvent({
      tenantId,
      employeeId: params.employeeId,
      eventType: "WARNING_ISSUED",
      effectiveDate: warningDate,
      newState: {
        subject: params.subject,
        severity: params.severity,
      },
      changedFields: ["disciplinary_warnings"],
      actorId,
      source: "hr_admin",
      reason: params.description,
      referenceId: warning.id,
    });

    return warning;
  }

  static async acknowledgeWarning(tenantId: string, employeeId: string, warningId: string) {
    const db = getTenantDb();
    const warning = await db.disciplinaryWarning.findFirst({
      where: { id: warningId, tenantId, employeeId },
    });

    if (!warning) throw new Error("Warning not found.");

    return await db.disciplinaryWarning.update({
      where: { id: warningId },
      data: {
        status: "acknowledged",
        acknowledgedAt: new Date(),
      },
    });
  }

  static async submitWarningResponse(tenantId: string, employeeId: string, warningId: string, response: string) {
    const db = getTenantDb();
    const warning = await db.disciplinaryWarning.findFirst({
      where: { id: warningId, tenantId, employeeId },
    });

    if (!warning) throw new Error("Warning not found.");

    return await db.disciplinaryWarning.update({
      where: { id: warningId },
      data: {
        employeeResponse: response,
        status: "appealed",
      },
    });
  }


  /**
   * Reviews and finalizes a disciplinary warning appeal (TASK-P2-06, GAP-VAL-022, WF-GAP-010).
   */
  static async reviewWarningAppeal(
    tenantId: string,
    actorId: string,
    warningId: string,
    params: {
      decision: "UPHELD" | "MODIFIED" | "REVOKED";
      hearingNotes?: string;
      modifiedSeverity?: string;
    }
  ) {
    const db = getTenantDb();
    const warning = await db.disciplinaryWarning.findFirst({
      where: { id: warningId, tenantId },
      include: { employee: { select: EMPLOYEE_CORE_SELECT } },
    });

    if (!warning) throw new Error("Warning record not found.");
    if (warning.status !== "appealed") {
      throw new Error(`Cannot review appeal for warning in status '${warning.status}'. Must be 'appealed'.`);
    }

    const decision = params.decision.toUpperCase();
    let newStatus = "active";
    let newSeverity = warning.severity;

    if (decision === "REVOKED") {
      newStatus = "revoked";
    } else if (decision === "MODIFIED") {
      newStatus = "modified";
      if (params.modifiedSeverity) {
        newSeverity = params.modifiedSeverity;
      }
    } else if (decision === "UPHELD") {
      newStatus = "upheld";
    }

    const updated = await db.disciplinaryWarning.update({
      where: { id: warningId },
      data: {
        status: newStatus,
        severity: newSeverity,
        resolvedAt: new Date(),
        description: params.hearingNotes 
          ? `${warning.description}\n[Appeal Decision: ${decision} by ${actorId} - ${params.hearingNotes}]`
          : `${warning.description}\n[Appeal Decision: ${decision} by ${actorId}]`,
      },
    });

    await this.recordEvent({
      tenantId,
      employeeId: warning.employeeId,
      eventType: "WARNING_APPEAL_REVIEWED",
      effectiveDate: new Date(),
      previousState: { status: warning.status, severity: warning.severity },
      newState: { status: newStatus, severity: newSeverity, decision },
      changedFields: ["status", "severity", "resolvedAt"],
      actorId,
      source: "hr_admin",
      reason: params.hearingNotes || `Appeal ${decision}`,
      referenceId: warning.id,
    });

    return updated;
  }
  /**
   * 7. RESIGNATIONS & EXITS (P6-BR-008, P6-BR-009, P6-BR-010, P6-BR-011, P6-BR-012)
   */
  static async submitResignation(
    tenantId: string,
    employeeId: string,
    params: {
      resignationDate: string | Date;
      requestedLastWorkingDay: string | Date;
      reason: string;
      noticePeriodDays?: number;
    }
  ) {
    const db = getTenantDb();
    const resignationDate = new Date(params.resignationDate);
    const requestedLWD = new Date(params.requestedLastWorkingDay);
    const noticePeriodDays = params.noticePeriodDays || 60;

    const exitCode = `EXIT-${Date.now().toString(36).toUpperCase()}`;

    const exit = await db.employeeExit.create({
      data: {
        tenantId,
        employeeId,
        exitCode,
        resignationDate,
        lastWorkingDay: requestedLWD,
        reason: params.reason,
        exitType: "resignation",
        status: "serving_notice",
        noticePeriodDays,
      },
    });

    // Auto-create standard checklist items
    const standardChecklists = [
      { department: "IT", title: "Handover laptop and peripherals" },
      { department: "IT", title: "Revoke VPN and internal email access" },
      { department: "Finance", title: "Clear outstanding travel advances & loans" },
      { department: "Finance", title: "Verify pending expense claims" },
      { department: "HR", title: "Conduct exit interview" },
      { department: "HR", title: "Generate experience & relieving letters" },
      { department: "Admin", title: "Collect physical ID card & building access badge" },
    ];

    for (const item of standardChecklists) {
      await db.exitChecklistItem.create({
        data: {
          exitId: exit.id,
          department: item.department,
          title: item.title,
          isCompleted: false,
        },
      });
    }

    await this.recordEvent({
      tenantId,
      employeeId,
      eventType: "RESIGNED",
      effectiveDate: resignationDate,
      newState: {
        exitCode,
        lastWorkingDay: requestedLWD,
        reason: params.reason,
      },
      changedFields: ["employee_exits"],
      actorId: employeeId,
      source: "self",
      reason: params.reason,
      referenceId: exit.id,
    });

    return exit;
  }

  static async withdrawResignation(tenantId: string, employeeId: string, exitId: string, reason: string) {
    const db = getTenantDb();
    const exit = await db.employeeExit.findFirst({
      where: { id: exitId, tenantId, employeeId },
    });

    if (!exit) throw new Error("Exit record not found.");
    if (exit.status === "completed" || exit.status === "fnf_settled") {
      throw new Error("Cannot withdraw a finalized exit.");
    }

    const updated = await db.employeeExit.update({
      where: { id: exitId },
      data: { status: "withdrawn" },
    });

    await this.recordEvent({
      tenantId,
      employeeId,
      eventType: "RESIGNATION_WITHDRAWN",
      effectiveDate: new Date(),
      previousState: { status: exit.status },
      newState: { status: "withdrawn" },
      changedFields: ["status"],
      actorId: employeeId,
      source: "self",
      reason,
      referenceId: exit.id,
    });

    return updated;
  }

  /**
   * Calculates Full and Final Settlement (F&F) according to statutory and company policies (TASK-P2-03).
   * Prorated Salary + Leave Encashment + Gratuity - Notice Shortfall - Outstanding Loans.
   */
  static async calculateFnFSettlement(
    tenantId: string,
    employeeId: string,
    lastWorkingDay: Date | string,
    options?: { noticeShortfallDays?: number; outstandingLoans?: number; reason?: string }
  ) {
    const db = getTenantDb();
    const lwd = new Date(lastWorkingDay);

    const employee = await (db.employee as any).findFirst({
      where: { id: employeeId, tenantId },
      select: EMPLOYEE_CORE_SELECT,
    });
    if (!employee) throw new Error("Employee not found for F&F calculation.");

    const monthlySalary = Number(employee.salary || 0);
    const basicSalary = Math.round(monthlySalary * 0.5); // statutory basic pay baseline

    // 1. Prorated Monthly Salary for last working month
    const year = lwd.getFullYear();
    const month = lwd.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysWorkedInExitMonth = lwd.getDate();
    const proratedSalary = Math.round(((monthlySalary / daysInMonth) * daysWorkedInExitMonth) * 100) / 100;

    // 2. Leave Encashment Calculation
    let earnedLeaveBalance = 0;
    try {
      const leaveBalances = await (db as any).leaveBalance.findMany({
        where: { tenantId, employeeId },
        include: { leaveType: true },
      });
      const el = leaveBalances.find((b: any) => b.leaveType?.code?.toUpperCase().includes("EL") || b.leaveType?.name?.toUpperCase().includes("EARNED"));
      if (el) {
        earnedLeaveBalance = Math.max(0, Number(el.balance || el.remaining || 0));
      }
    } catch {}
    // Statutory Encashment = EL Balance * (Basic / 30)
    const leaveEncashment = Math.round((earnedLeaveBalance * (basicSalary / 30)) * 100) / 100;

    // 3. Gratuity (Payment of Gratuity Act, 1972)
    // Formula: (15 * Last Drawn Basic * Years of Service) / 26; Eligible only if tenure >= 5 years (1825 days)
    let gratuity = 0;
    const rawJoining = (employee as any).joinedAt || (employee as any).joiningDate || (employee as any).dateOfJoining;
    const joiningDate = rawJoining ? new Date(rawJoining) : lwd;
    const serviceDays = Math.max(0, (lwd.getTime() - joiningDate.getTime()) / (1000 * 60 * 60 * 24));
    const serviceYears = serviceDays / 365.25;

    if (serviceYears >= 5.0) {
      const roundedTenureYears = Math.round(serviceYears);
      const statutoryGratuity = Math.floor((15 * basicSalary * roundedTenureYears) / 26);
      gratuity = Math.min(statutoryGratuity, 2000000); // statutory ceiling ₹20,00,000
    }

    // 4. Notice Period Shortfall Recovery
    const noticeShortfallDays = options?.noticeShortfallDays || 0;
    const noticeShortfallDeduction = Math.round((noticeShortfallDays * (monthlySalary / 30)) * 100) / 100;

    // 5. Outstanding Loans / Advances Recovery
    const loanDeductions = Math.round((options?.outstandingLoans || 0) * 100) / 100;

    // Net F&F Calculation
    const grossAdditions = Math.round((proratedSalary + leaveEncashment + gratuity) * 100) / 100;
    const totalDeductions = Math.round((noticeShortfallDeduction + loanDeductions) * 100) / 100;
    const netSettlementAmount = Math.max(0, Math.round((grossAdditions - totalDeductions) * 100) / 100);

    return {
      employeeId,
      lastWorkingDay: lwd,
      serviceYears: Math.round(serviceYears * 10) / 10,
      monthlySalary,
      basicSalary,
      breakdown: {
        proratedSalary,
        daysWorkedInExitMonth,
        daysInMonth,
        leaveEncashment,
        earnedLeaveDays: earnedLeaveBalance,
        gratuity,
        isGratuityEligible: serviceYears >= 5.0,
        noticeShortfallDeduction,
        noticeShortfallDays,
        loanDeductions,
        grossAdditions,
        totalDeductions,
        netSettlementAmount,
      },
    };
  }

  static async finalizeExit(tenantId: string, actorId: string, exitId: string) {
    const db = getTenantDb();
    const exit = await db.employeeExit.findFirst({
      where: { id: exitId, tenantId },
      include: { employee: { select: EMPLOYEE_CORE_SELECT } },
    });

    if (!exit) throw new Error("Exit record not found.");

    const now = new Date();

    // 1. Mark Exit Completed
    const updatedExit = await db.employeeExit.update({
      where: { id: exitId },
      data: {
        status: "completed",
        fnfSettledAt: now,
      },
    });

    // 2. Terminate Employee Status
    await (db.employee as any).update({
      where: { id: exit.employeeId },
      data: { status: "terminated" },
      select: { id: true },
    });

    // 3. Deactivate User Account if exists
    if (exit.employee.userId) {
      await db.userRole.deleteMany({
        where: { userId: exit.employee.userId, tenantId },
      });
    }

    // 4. Record Event
    await this.recordEvent({
      tenantId,
      employeeId: exit.employeeId,
      eventType: "EXITED",
      effectiveDate: now,
      previousState: { status: exit.employee.status },
      newState: { status: "terminated", exitId: exit.id },
      changedFields: ["status"],
      actorId,
      source: "hr_admin",
      reason: `Exit finalized via ${exit.exitCode}`,
      referenceId: exit.id,
    });

    return updatedExit;
  }

  static async executeTermination(
    tenantId: string,
    actorId: string,
    params: {
      employeeId: string;
      reason: string;
      exitType?: string;
      severanceAmount?: number;
      rehireEligible?: boolean;
    }
  ) {
    const db = getTenantDb();
    const now = new Date();
    const exitCode = `TERM-${Date.now().toString(36).toUpperCase()}`;

    const employee = await db.employee.findFirst({
      where: { id: params.employeeId, tenantId },
    });

    if (!employee) throw new Error("Employee not found.");

    // Create Exit record
    const exit = await db.employeeExit.create({
      data: {
        tenantId,
        employeeId: employee.id,
        exitCode,
        resignationDate: now,
        lastWorkingDay: now,
        reason: params.reason,
        exitType: params.exitType || "termination",
        status: "completed",
        fnfSettlementAmount: params.severanceAmount || 0,
        fnfSettledAt: now,
      },
    });

    // Deactivate employee
    await (db.employee as any).update({
      where: { id: employee.id },
      data: { status: "terminated" },
      select: { id: true },
    });

    if (employee.userId) {
      await db.userRole.deleteMany({
        where: { userId: employee.userId, tenantId },
      });
    }

    await this.recordEvent({
      tenantId,
      employeeId: employee.id,
      eventType: "TERMINATED",
      effectiveDate: now,
      previousState: { status: employee.status },
      newState: { status: "terminated", reason: params.reason },
      changedFields: ["status"],
      actorId,
      source: "hr_admin",
      reason: params.reason,
      referenceId: exit.id,
    });

    return exit;
  }

  /**
   * 8. BUSINESS TRAVEL (P6-BR-013)
   */
  static async createTrip(
    tenantId: string,
    employeeId: string,
    params: {
      purpose: string;
      destination: string;
      fromDate: string | Date;
      toDate: string | Date;
      travelMode?: string;
      advanceAmount?: number;
      estimatedCost?: number;
      itinerary?: any;
    }
  ) {
    const db = getTenantDb();
    const tripCode = `TRIP-${Date.now().toString(36).toUpperCase()}`;

    return await db.employeeTrip.create({
      data: {
        tenantId,
        employeeId,
        tripCode,
        purpose: params.purpose,
        destination: params.destination,
        fromDate: new Date(params.fromDate),
        toDate: new Date(params.toDate),
        travelMode: params.travelMode || "flight",
        advanceAmount: params.advanceAmount || 0,
        estimatedCost: params.estimatedCost || 0,
        itinerary: params.itinerary || undefined,
        status: "pending",
      },
    });
  }

  static async approveTrip(tenantId: string, actorId: string, tripId: string, remarks?: string) {
    const db = getTenantDb();
    return await db.employeeTrip.update({
      where: { id: tripId },
      data: {
        status: "approved",
        approvedBy: actorId,
        approvedAt: new Date(),
        approvalRemarks: remarks || null,
      },
    });
  }

  static async addTripExpense(
    tenantId: string,
    tripId: string,
    params: {
      category: string;
      amount: number;
      receiptUrl?: string;
      receiptDate?: string | Date;
      description?: string;
    }
  ) {
    const db = getTenantDb();
    return await db.tripExpenseItem.create({
      data: {
        tenantId,
        tripId,
        category: params.category,
        amount: params.amount,
        receiptUrl: params.receiptUrl || null,
        receiptDate: params.receiptDate ? new Date(params.receiptDate) : null,
        description: params.description || null,
        isApproved: true,
      },
    });
  }

  /**
   * 9. COMPLAINTS & GRIEVANCES (P6-BR-014)
   */
  static async fileComplaint(
    tenantId: string,
    params: {
      complainantId?: string;
      isAnonymous?: boolean;
      accusedEmployeeId?: string;
      category: string;
      severity?: string;
      incidentDate?: string | Date;
      subject: string;
      description: string;
      evidenceUrl?: string;
    }
  ) {
    const db = getTenantDb();
    const ticketCode = `GRV-${Date.now().toString(36).toUpperCase()}`;

    return await db.employeeComplaint.create({
      data: {
        tenantId,
        ticketCode,
        complainantId: params.isAnonymous ? null : (params.complainantId || null),
        isAnonymous: !!params.isAnonymous,
        accusedEmployeeId: params.accusedEmployeeId || null,
        category: params.category,
        severity: params.severity || "medium",
        incidentDate: params.incidentDate ? new Date(params.incidentDate) : null,
        subject: params.subject,
        description: params.description,
        evidenceUrl: params.evidenceUrl || null,
        status: "new",
      },
    });
  }

  static async resolveComplaint(
    tenantId: string,
    complaintId: string,
    resolutionNotes: string,
    actionTaken?: string
  ) {
    const db = getTenantDb();
    return await db.employeeComplaint.update({
      where: { id: complaintId },
      data: {
        status: "resolved",
        resolutionNotes,
        actionTaken: actionTaken || "none",
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * 10. LIFECYCLE OVERVIEW METRICS
   */
  static async getOverviewMetrics(tenantId: string) {
    const db = getTenantDb();

    const [
      activeProbations,
      pendingExits,
      promotionsCount,
      warningsCount,
      pendingTrips,
      openComplaints,
    ] = await Promise.all([
      db.probationRecord.count({ where: { tenantId, status: { in: ["active", "extended"] } } }),
      db.employeeExit.count({ where: { tenantId, status: { in: ["serving_notice", "clearance_pending"] } } }),
      db.promotionRecord.count({ where: { tenantId } }),
      db.disciplinaryWarning.count({ where: { tenantId, status: "issued" } }),
      db.employeeTrip.count({ where: { tenantId, status: "pending" } }),
      db.employeeComplaint.count({ where: { tenantId, status: { in: ["new", "under_review", "investigating"] } } }),
    ]);

    return {
      activeProbations,
      pendingExits,
      promotionsCount,
      warningsCount,
      pendingTrips,
      openComplaints,
    };
  }
}
