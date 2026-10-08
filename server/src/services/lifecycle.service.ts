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
      include: { employee: true },
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
        remarks: remarks ? `${probation.remarks || ""}\n[Extended ${extensionDays}d]: ${remarks}`.trim() : probation.remarks,
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
      include: { employee: true },
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

    const employee = await db.employee.findFirst({
      where: { id: params.employeeId, tenantId },
      include: { designation: true, department: true },
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

    // 2. Update Employee Profile
    const updateData: any = {
      position: params.newDesignation,
    };
    if (params.newDesignationId) updateData.designationId = params.newDesignationId;
    if (params.newDepartmentId) updateData.departmentId = params.newDepartmentId;
    if (params.newSalary && params.newSalary > 0) updateData.salary = params.newSalary;

    await db.employee.update({
      where: { id: employee.id },
      data: updateData,
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
    const db = getTenantDb();
    const effectiveDate = new Date(params.effectiveDate);

    const employee = await db.employee.findFirst({
      where: { id: params.employeeId, tenantId },
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
        status: "COMPLETED",
      },
    });

    // Update Employee
    const updateData: any = {};
    if (params.toBranchId) updateData.branchId = params.toBranchId;
    if (params.toDeptId) updateData.departmentId = params.toDeptId;
    if (params.newManagerId) updateData.managerId = params.newManagerId;

    if (Object.keys(updateData).length > 0) {
      await db.employee.update({
        where: { id: employee.id },
        data: updateData,
      });
    }

    await this.recordEvent({
      tenantId,
      employeeId: employee.id,
      eventType: "TRANSFERRED",
      effectiveDate,
      previousState: {
        branchId: employee.branchId,
        departmentId: employee.departmentId,
        managerId: employee.managerId,
      },
      newState: {
        branchId: params.toBranchId || employee.branchId,
        departmentId: params.toDeptId || employee.departmentId,
        managerId: params.newManagerId || employee.managerId,
      },
      changedFields: Object.keys(updateData),
      actorId,
      source: "hr_admin",
      reason: params.reason,
      referenceId: transfer.id,
    });

    return transfer;
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

  static async finalizeExit(tenantId: string, actorId: string, exitId: string) {
    const db = getTenantDb();
    const exit = await db.employeeExit.findFirst({
      where: { id: exitId, tenantId },
      include: { employee: true },
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
    await db.employee.update({
      where: { id: exit.employeeId },
      data: { status: "terminated" },
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
    await db.employee.update({
      where: { id: employee.id },
      data: { status: "terminated" },
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
