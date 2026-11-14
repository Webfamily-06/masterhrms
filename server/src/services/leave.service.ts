import { LeaveStatus, AttendanceStatus } from "@prisma/client";
import { rawPrisma } from "../prisma";
import { AuditService } from "./audit.service";
import { OutboxService } from "./outbox.service";
import { NotificationService } from "./notification.service";
import { AttendanceService, MonthLockedError } from "./attendance.service";
import { broadcastToTenant } from "../socket";
import { SandwichLeaveService } from "./sandwich-leave.service";

export interface LeaveDryRunOptions {
  tenantId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string | Date;
  endDate: string | Date;
  halfDay?: boolean; // first half or second half
  halfDaySession?: string;
  reason?: string;
}

export interface DayBreakdown {
  date: string;
  isWeekend: boolean;
  isHoliday: boolean;
  isDeducted: boolean;
  reason?: string;
}

export class LeaveService {
  /**
   * Derive authoritative available leave balance from immutable LeaveLedgerEntry records.
   */
  static async getEmployeeBalance(tenantId: string, employeeId: string, leaveTypeId: string): Promise<number> {
    const entries = await rawPrisma.leaveLedgerEntry.findMany({
      where: { tenantId, employeeId, leaveTypeId },
      select: { entryType: true, days: true },
    });

    let balance = 0;
    for (const entry of entries) {
      const days = Number(entry.days);
      if (entry.entryType === "ACCRUAL" || entry.entryType === "CREDIT" || entry.entryType === "CARRY_FORWARD") {
        balance += days;
      } else if (entry.entryType === "DEBIT" || entry.entryType === "ENCASHMENT") {
        balance -= days;
      }
    }

    // Also deduct any pending requests
    const pendingRequests = await rawPrisma.leaveRequest.findMany({
      where: { tenantId, employeeId, leaveTypeId, status: "pending" },
      select: { days: true },
    });

    const pendingTotal = pendingRequests.reduce((acc, req) => acc + Number(req.days), 0);
    return Math.max(0, balance - pendingTotal);
  }

  /**
   * Pure date arithmetic calculation for deductible days, weekend exclusions, and sandwich leave mechanics.
   */
  static calculateDeductibleDays(
    startDate: Date,
    endDate: Date,
    sandwichRule: boolean,
    holidayDates: Set<string> = new Set(),
    isHalfDay: boolean = false
  ) {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(0, 0, 0, 0);

    const breakdown: DayBreakdown[] = [];
    let deductibleDays = 0;
    let weekendDays = 0;
    let holidayDays = 0;
    let sandwichDays = 0;
    const curr = new Date(start);

    while (curr <= end) {
      const dateStr = curr.toISOString().slice(0, 10);
      const dayOfWeek = curr.getUTCDay(); // 0 is Sunday, 6 is Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDates.has(dateStr);

      if (isWeekend) weekendDays++;
      if (isHoliday) holidayDays++;

      let isDeducted = true;
      let reason: string | undefined;

      if (!sandwichRule && (isWeekend || isHoliday)) {
        isDeducted = false;
        reason = isHoliday ? "Holiday" : "Weekend";
      } else if (sandwichRule && (isWeekend || isHoliday)) {
        sandwichDays++;
        reason = isHoliday ? "Holiday (Sandwich Rule)" : "Weekend (Sandwich Rule)";
      }

      if (isDeducted) {
        deductibleDays += isHalfDay ? 0.5 : 1.0;
      }

      breakdown.push({
        date: dateStr,
        isWeekend,
        isHoliday,
        isDeducted,
        reason,
      });

      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    return {
      deductibleDays,
      weekendDays,
      holidayDays,
      sandwichDays,
      breakdown,
    };
  }

  /**
   * Server-authoritative Dry-Run calculation.
   */
  static async validateDryRun(options: LeaveDryRunOptions) {
    const { tenantId, employeeId, leaveTypeId } = options;
    const start = new Date(options.startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(options.endDate);
    end.setUTCHours(0, 0, 0, 0);

    if (start > end) {
      throw new Error("Start date must be before or equal to end date.");
    }

    // 1. Fetch Leave Type and Policy
    const leaveType = await rawPrisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });
    if (!leaveType || leaveType.tenantId !== tenantId) {
      throw new Error("Leave type not found");
    }

    const leavePolicy = await rawPrisma.leavePolicy.findFirst({
      where: { tenantId, isDefault: true },
    });

    const sandwichRule = leaveType.sandwichRule || leavePolicy?.sandwichRule || false;

    // 2. Fetch existing holidays in the range
    const holidays = await rawPrisma.holiday.findMany({
      where: {
        tenantId,
        date: { gte: start, lte: end },
      },
      select: { date: true, name: true },
    });
    const holidayDates = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));

    // 3. Check overlaps with existing non-cancelled leave requests
    const overlapping = await rawPrisma.leaveRequest.findFirst({
      where: {
        tenantId,
        employeeId,
        status: { in: ["pending", "approved"] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    const warnings: string[] = [];
    if (overlapping) {
      warnings.push("An overlapping leave application already exists for this period.");
    }

    // 3b. Workforce Category & Contract Tenure Boundary Enforcement
    const empRecord = await rawPrisma.employee.findUnique({
      where: { id: employeeId },
      select: { employmentCategory: true, employmentType: true },
    });

    if (empRecord) {
      if (
        empRecord.employmentCategory === "vendor_outsourced" ||
        empRecord.employmentCategory === "consultant_freelancer"
      ) {
        warnings.push(
          "External contractors and consultants under Accounts Payable cannot apply for statutory paid employee leaves. Please submit invoice adjustments or timesheet notes."
        );
      }

      const activeContract = await rawPrisma.employeeContract.findFirst({
        where: { tenantId, employeeId, status: "active" },
        orderBy: { startDate: "desc" },
      });

      if (activeContract) {
        const cStart = new Date(activeContract.startDate);
        cStart.setUTCHours(0, 0, 0, 0);
        if (start < cStart) {
          warnings.push(
            `Leave start date cannot precede active contract start date (${cStart.toISOString().slice(0, 10)}).`
          );
        }
        if (activeContract.endDate) {
          const cEnd = new Date(activeContract.endDate);
          cEnd.setUTCHours(23, 59, 59, 999);
          if (end > cEnd) {
            warnings.push(
              `Leave end date cannot exceed active contract expiry date (${cEnd.toISOString().slice(0, 10)}).`
            );
          }
        }
      }
    }

    // 4. Calculate day by day using calculateDeductibleDays
    const calc = this.calculateDeductibleDays(
      start,
      end,
      sandwichRule,
      holidayDates,
      !!options.halfDay
    );
    const deductibleDays = calc.deductibleDays;
    const weekendCount = calc.weekendDays;
    const holidayCount = calc.holidayDays;
    const sandwichDeductions = calc.sandwichDays;
    const breakdown = calc.breakdown;

    // 4b. Also evaluate external sandwich leave boundaries (adjacent leaves)
    let externalSandwichEvaluation: any = null;
    try {
      externalSandwichEvaluation = await SandwichLeaveService.evaluateEmployeeSandwichLeave(
        tenantId,
        employeeId,
        start,
        end
      );
    } catch {
      // Non-blocking fallback
    }

    // 5. Check available balance
    const availableBalance = await this.getEmployeeBalance(tenantId, employeeId, leaveTypeId);
    const hasEnoughBalance = availableBalance >= deductibleDays;

    if (!hasEnoughBalance && leaveType.isPaid) {
      warnings.push(`Insufficient leave balance. Available: ${availableBalance}, Required: ${deductibleDays}`);
    }

    return {
      isValid: warnings.length === 0,
      totalDays: deductibleDays,
      weekendCount,
      holidayCount,
      sandwichDaysCount: sandwichDeductions + (externalSandwichEvaluation?.sandwichDaysCount || 0),
      sandwichDates: externalSandwichEvaluation?.sandwichDates || [],
      isPaid: leaveType.isPaid,
      leaveTypeName: leaveType.name,
      availableBalance,
      remainingBalance: availableBalance - deductibleDays,
      breakdown,
      warnings,
    };
  }

  /**
   * Submit Leave Application with Dry-Run verification.
   */
  static async submitApplication(
    tenantId: string,
    employeeId: string,
    data: {
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      halfDay?: boolean;
      halfDaySession?: string;
      reason: string;
      attachment?: string;
      attachmentUrl?: string;
    },
    actorId?: string
  ) {
    const dryRun = await this.validateDryRun({
      tenantId,
      employeeId,
      leaveTypeId: data.leaveTypeId,
      startDate: data.startDate,
      endDate: data.endDate,
      halfDay: data.halfDay,
      halfDaySession: data.halfDaySession,
      reason: data.reason,
    });

    if (!dryRun.isValid) {
      throw new Error(`Validation failed: ${dryRun.warnings.join("; ")}`);
    }

    const start = new Date(data.startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(data.endDate);
    end.setUTCHours(0, 0, 0, 0);

    const employee = await rawPrisma.employee.findUnique({
      where: { id: employeeId },
      select: { managerId: true, firstName: true, lastName: true, userId: true },
    });

    const application = await rawPrisma.$transaction(async (tx) => {
      const req = await tx.leaveRequest.create({
        data: {
          tenantId,
          employeeId,
          leaveTypeId: data.leaveTypeId,
          approverId: employee?.managerId || null,
          startDate: start,
          endDate: end,
          days: dryRun.totalDays,
          status: "pending",
          reason: data.reason,
          halfDay: !!data.halfDay,
          halfDaySession: data.halfDaySession || null,
          attachmentUrl: data.attachmentUrl || data.attachment || null,
        },
        include: { leaveType: true, employee: true },
      });

      await OutboxService.createEvent(
        {
          tenantId,
          eventType: "leave.requested",
          entityType: "LeaveRequest",
          entityId: req.id,
          actorId: actorId || employeeId,
          payload: {
            employeeId,
            leaveTypeId: data.leaveTypeId,
            startDate: data.startDate,
            endDate: data.endDate,
            days: dryRun.totalDays,
          },
        },
        tx
      );

      return req;
    });

    // Notify Approver if manager exists
    if (employee?.managerId) {
      try {
        const mgr = await rawPrisma.employee.findUnique({
          where: { id: employee.managerId },
          select: { userId: true },
        });
        if (mgr?.userId) {
          await NotificationService.createNotification({
            tenantId,
            userId: mgr.userId,
            title: "New Leave Application",
            message: `${employee.firstName} ${employee.lastName} submitted a leave application for ${dryRun.totalDays} day(s).`,
            type: "LEAVE_REQUESTED",
            actionUrl: "/hr/leave/applications",
          });
        }
      } catch {
        // Non-blocking notification
      }
    }

    broadcastToTenant(tenantId, "leave.requested", {
      id: application.id,
      employeeName: `${employee?.firstName} ${employee?.lastName}`.trim(),
      days: dryRun.totalDays,
    });

    return application;
  }

  /**
   * Authoritative Leave Approval / Rejection.
   */
  static async decideApplication(
    tenantId: string,
    requestId: string,
    action: "approve" | "reject",
    reviewerId: string,
    comments?: string
  ) {
    const request = await rawPrisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { leaveType: true, employee: true },
    });

    if (!request || request.tenantId !== tenantId) {
      throw new Error("Leave request not found");
    }

    if (request.status !== "pending") {
      throw new Error(`Request is already ${request.status}`);
    }

    if (request.employee?.userId === reviewerId) {
      throw new Error("Segregation of duties violation: Employees cannot approve or reject their own leave applications");
    }

    if (action === "reject") {
      const updated = await rawPrisma.$transaction(async (tx) => {
        const req = await tx.leaveRequest.update({
          where: { id: requestId },
          data: {
            status: "rejected",
            rejectionReason: comments || "Rejected by reviewer",
            approvedAt: new Date(),
          },
        });

        await OutboxService.createEvent(
          {
            tenantId,
            eventType: "leave.rejected",
            entityType: "LeaveRequest",
            entityId: req.id,
            actorId: reviewerId,
            payload: { employeeId: request.employeeId, comments },
          },
          tx
        );

        return req;
      });

      if (request.employee?.userId) {
        try {
          await NotificationService.createNotification({
            tenantId,
            userId: request.employee.userId,
            title: "Leave Application Rejected",
            message: `Your leave request for ${request.days} day(s) was rejected. ${comments ? `Reason: ${comments}` : ""}`,
            type: "LEAVE_REJECTED",
            actionUrl: "/me/leave/applications",
          });
        } catch {
          // Non-blocking notification
        }
      }

      broadcastToTenant(tenantId, "leave.rejected", { id: requestId, employeeId: request.employeeId });

      try {
        await AuditService.logMutation({
          tenantId,
          actorId: reviewerId,
          action: "LEAVE_APPLICATION_REJECTED",
          entityType: "LeaveRequest",
          entityId: requestId,
          metadata: { comments, employeeId: request.employeeId, days: Number(request.days) },
        });
      } catch {
        // Non-blocking audit log
      }

      return updated;
    }

    // APPROVE ACTION
    // 1. Verify Month Lock for all affected days
    const curr = new Date(request.startDate);
    const end = new Date(request.endDate);
    while (curr <= end) {
      await AttendanceService.assertMonthUnlocked(tenantId, curr);
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    // 1b. Fetch sandwich rule and holidays for accurate attendance sync (GAP-VAL-008)
    const leavePolicy = await rawPrisma.leavePolicy.findFirst({
      where: { tenantId, isDefault: true },
    });
    const sandwichRule = request.leaveType?.sandwichRule ?? leavePolicy?.sandwichRule ?? false;
    const holidays = await rawPrisma.holiday.findMany({
      where: {
        tenantId,
        date: { gte: request.startDate, lte: request.endDate },
      },
      select: { date: true },
    });
    const holidayDates = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));

    // 2. Perform atomic approval inside $transaction
    const approved = await rawPrisma.$transaction(async (tx) => {
      // Mark request approved
      const req = await tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: "approved",
          approvedAt: new Date(),
        },
      });

      // Write immutable ledger entry (DEBIT)
      if (request.leaveTypeId) {
        const currentBalance = await this.getEmployeeBalance(tenantId, request.employeeId, request.leaveTypeId);
        await tx.leaveLedgerEntry.create({
          data: {
            tenantId,
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            entryType: "DEBIT",
            days: request.days,
            balance: Math.max(0, currentBalance - Number(request.days)),
            referenceId: requestId,
            notes: `Approved leave application #${requestId}`,
            effectiveAt: request.startDate,
          },
        });
      }

      // Update Attendance records for the approved days to 'on_leave'
      // GAP-VAL-008: When sandwichRule is false, skip weekends and holidays to prevent overwriting weekly_off
      const attCurr = new Date(request.startDate);
      while (attCurr <= end) {
        const dayDate = new Date(Date.UTC(attCurr.getUTCFullYear(), attCurr.getUTCMonth(), attCurr.getUTCDate()));
        const dateStr = dayDate.toISOString().slice(0, 10);
        const dayOfWeek = dayDate.getUTCDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidayDates.has(dateStr);

        if (!sandwichRule && (isWeekend || isHoliday)) {
          attCurr.setUTCDate(attCurr.getUTCDate() + 1);
          continue;
        }

        await tx.attendance.upsert({
          where: {
            tenantId_employeeId_date: {
              tenantId,
              employeeId: request.employeeId,
              date: dayDate,
            },
          },
          create: {
            tenantId,
            employeeId: request.employeeId,
            date: dayDate,
            status: "on_leave",
            notes: `Approved Leave: ${request.leaveType?.name || "Leave"}`,
            source: "LEAVE_APPROVAL",
          },
          update: {
            status: "on_leave",
            notes: `Approved Leave: ${request.leaveType?.name || "Leave"}`,
          },
        });
        attCurr.setUTCDate(attCurr.getUTCDate() + 1);
      }

      await OutboxService.createEvent(
        {
          tenantId,
          eventType: "leave.approved",
          entityType: "LeaveRequest",
          entityId: req.id,
          actorId: reviewerId,
          payload: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            days: request.days,
          },
        },
        tx
      );

      await OutboxService.createEvent(
        {
          tenantId,
          eventType: "leave.balance_changed",
          entityType: "LeaveLedgerEntry",
          entityId: req.id,
          actorId: reviewerId,
          payload: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
          },
        },
        tx
      );

      return req;
    });

    broadcastToTenant(tenantId, "leave.approved", {
      id: requestId,
      employeeId: request.employeeId,
      days: request.days,
    });

    try {
      await AuditService.logMutation({
        tenantId,
        actorId: reviewerId,
        action: "LEAVE_APPLICATION_APPROVED",
        entityType: "LeaveRequest",
        entityId: requestId,
        metadata: { comments, employeeId: request.employeeId, days: Number(request.days) },
      });
    } catch {
      // Non-blocking audit log
    }

    return approved;
  }

  /**
   * Cancel an approved or pending leave application with non-destructive compensating ledger entry.
   */
  static async cancelApplication(tenantId: string, requestId: string, actorId: string, reason?: string) {
    const request = await rawPrisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { leaveType: true },
    });

    if (!request || request.tenantId !== tenantId) {
      throw new Error("Leave request not found");
    }

    if (request.status === "cancelled" || request.status === "rejected") {
      throw new Error(`Cannot cancel a request with status ${request.status}`);
    }

    // If already approved, check month lock for affected period
    if (request.status === "approved") {
      const curr = new Date(request.startDate);
      const end = new Date(request.endDate);
      while (curr <= end) {
        await AttendanceService.assertMonthUnlocked(tenantId, curr);
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
    }

    // Fetch active holidays overlapping the cancelled leave dates
    const holidays = await rawPrisma.holiday.findMany({
      where: {
        tenantId,
        date: { gte: request.startDate, lte: request.endDate },
        status: "active",
      },
      select: { date: true, name: true },
    });
    const holidayMap = new Map<string, string>();
    holidays.forEach((h) => holidayMap.set(h.date.toISOString().slice(0, 10), h.name));

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const cancelled = await rawPrisma.$transaction(async (tx) => {
      const req = await tx.leaveRequest.update({
        where: { id: requestId },
        data: { status: "cancelled" },
      });

      // If it was approved, create a compensating CREDIT entry (strictly idempotent)
      if (request.status === "approved" && request.leaveTypeId) {
        const existingCredit = await tx.leaveLedgerEntry.findFirst({
          where: { tenantId, referenceId: requestId, entryType: "CREDIT" },
        });

        if (!existingCredit) {
          const currentBalance = await this.getEmployeeBalance(tenantId, request.employeeId, request.leaveTypeId);
          await tx.leaveLedgerEntry.create({
            data: {
              tenantId,
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              entryType: "CREDIT",
              days: request.days,
              balance: currentBalance + Number(request.days),
              referenceId: requestId,
              notes: `Compensating reversal for cancelled leave #${requestId}. Reason: ${reason || "Cancelled"}`,
              effectiveAt: new Date(),
            },
          });
        }

        // Revert attendance records for affected dates with strict integrity preservation
        const attCurr = new Date(request.startDate);
        const end = new Date(request.endDate);
        while (attCurr <= end) {
          const dayDate = new Date(Date.UTC(attCurr.getUTCFullYear(), attCurr.getUTCMonth(), attCurr.getUTCDate()));
          const dateStr = dayDate.toISOString().slice(0, 10);
          const dayOfWeek = dayDate.getUTCDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isHoliday = holidayMap.has(dateStr);

          const existingAtt = await tx.attendance.findUnique({
            where: {
              tenantId_employeeId_date: {
                tenantId,
                employeeId: request.employeeId,
                date: dayDate,
              },
            },
          });

          if (existingAtt && existingAtt.status === "on_leave") {
            if (isHoliday || isWeekend || (dayDate > today && existingAtt.source === "LEAVE_APPROVAL")) {
              // Synthetic record generated purely for leave approval on holidays/weekends/future -> delete cleanly
              await tx.attendance.delete({
                where: { id: existingAtt.id },
              });
            } else {
              // Historical regular working day: if checkIn punch exists, restore punch status; otherwise mark absent
              const revertedStatus: "present" | "absent" = existingAtt.checkIn ? "present" : "absent";
              await tx.attendance.update({
                where: { id: existingAtt.id },
                data: {
                  status: revertedStatus,
                  notes: `Leave cancelled. Prior status restored: ${revertedStatus}`,
                },
              });
            }
          }
          attCurr.setUTCDate(attCurr.getUTCDate() + 1);
        }
      }

      await OutboxService.createEvent(
        {
          tenantId,
          eventType: "leave.cancelled",
          entityType: "LeaveRequest",
          entityId: req.id,
          actorId,
          payload: { employeeId: request.employeeId, reason },
        },
        tx
      );

      return req;
    });

    try {
      await AuditService.logMutation({
        tenantId,
        actorId,
        action: "LEAVE_APPLICATION_CANCELLED",
        entityType: "LeaveRequest",
        entityId: requestId,
        metadata: { reason, employeeId: request.employeeId, days: Number(request.days) },
      });
    } catch {
      // Non-blocking audit log
    }

    broadcastToTenant(tenantId, "leave.cancelled", { id: requestId, employeeId: request.employeeId });
    return cancelled;
  }

  /**
   * Comprehensive Employee Leave Balances breakdown across all leave types.
   */
  static async getEmployeeDetailedBalances(tenantId: string, employeeId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();
    const startOfYear = new Date(Date.UTC(targetYear, 0, 1));
    const endOfYear = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59));

    const [leaveTypes, ledgerEntries, leaveRequests] = await Promise.all([
      rawPrisma.leaveType.findMany({
        where: { tenantId, status: "active" },
        orderBy: { name: "asc" },
      }),
      rawPrisma.leaveLedgerEntry.findMany({
        where: {
          tenantId,
          employeeId,
          effectiveAt: { gte: startOfYear, lte: endOfYear },
        },
      }),
      rawPrisma.leaveRequest.findMany({
        where: {
          tenantId,
          employeeId,
          startDate: { gte: startOfYear, lte: endOfYear },
          status: { in: ["pending", "approved"] },
        },
      }),
    ]);

    const balances = leaveTypes.map((lt) => {
      const typeEntries = ledgerEntries.filter((e) => e.leaveTypeId === lt.id);
      const typeRequests = leaveRequests.filter((r) => r.leaveTypeId === lt.id);

      let openingBalance = 0;
      let accrued = 0;
      let carryForward = 0;
      let creditAdjustments = 0;
      let debitAdjustments = 0;

      for (const entry of typeEntries) {
        const d = Number(entry.days);
        if (entry.entryType === "CARRY_FORWARD") {
          carryForward += d;
        } else if (entry.entryType === "ACCRUAL") {
          accrued += d;
        } else if (entry.entryType === "CREDIT") {
          creditAdjustments += d;
        } else if (entry.entryType === "DEBIT" && !entry.referenceId) {
          debitAdjustments += d;
        }
      }

      // If no ledger accrual exists yet, default annual entitlement from leaveType.daysPerYear
      const annualEntitlement = accrued > 0 ? accrued : Number(lt.daysPerYear || 12);
      const used = typeRequests
        .filter((r) => r.status === "approved")
        .reduce((acc, r) => acc + Number(r.days), 0);
      const pending = typeRequests
        .filter((r) => r.status === "pending")
        .reduce((acc, r) => acc + Number(r.days), 0);

      const total = openingBalance + annualEntitlement + carryForward + creditAdjustments - debitAdjustments;
      const available = Math.max(0, total - used - pending);

      return {
        leaveTypeId: lt.id,
        leaveTypeName: lt.name,
        color: lt.color || "#3b82f6",
        isPaid: lt.isPaid,
        openingBalance,
        annualEntitlement,
        accrued: accrued > 0 ? accrued : annualEntitlement,
        carryForward,
        total,
        used,
        pending,
        available,
      };
    });

    return balances;
  }

  /**
   * Idempotent Balance Synchronization for all active employees and active leave types.
   */
  static async syncTenantBalances(tenantId: string, actorUserId?: string) {
    const [employees, leaveTypes, existingEntries] = await Promise.all([
      rawPrisma.employee.findMany({
        where: { tenantId, status: "active" },
        select: { id: true, firstName: true, lastName: true, employeeCode: true },
      }),
      rawPrisma.leaveType.findMany({
        where: { tenantId, status: "active" },
      }),
      rawPrisma.leaveLedgerEntry.findMany({
        where: { tenantId },
        select: { employeeId: true, leaveTypeId: true },
      }),
    ]);

    const existingSet = new Set(existingEntries.map((e) => `${e.employeeId}_${e.leaveTypeId}`));
    const entriesToCreate: any[] = [];
    const now = new Date();

    for (const emp of employees) {
      for (const lt of leaveTypes) {
        const key = `${emp.id}_${lt.id}`;
        if (!existingSet.has(key)) {
          const quota = Number(lt.daysPerYear) || 12;
          entriesToCreate.push({
            tenantId,
            employeeId: emp.id,
            leaveTypeId: lt.id,
            entryType: "ACCRUAL",
            days: quota,
            balance: quota,
            notes: `Initial entitlement sync for ${lt.name}`,
            effectiveAt: now,
          });
          existingSet.add(key);
        }
      }
    }

    if (entriesToCreate.length > 0) {
      await rawPrisma.leaveLedgerEntry.createMany({
        data: entriesToCreate,
      });
    }

    const createdEntriesCount = entriesToCreate.length;

    if (actorUserId) {
      try {
        await AuditService.logAudit({
          tenantId,
          userId: actorUserId,
          action: "LEAVE_BALANCES_SYNCHRONIZED",
          entityType: "LeaveLedgerEntry",
          entityId: tenantId,
          afterState: { employeesCount: employees.length, createdEntriesCount },
        });
      } catch {
        // Non-blocking
      }
    }

    return {
      success: true,
      employeesCount: employees.length,
      createdEntriesCount,
      message: `Successfully synchronized balances for ${employees.length} employees (${createdEntriesCount} initial ledger allocations created).`,
    };
  }

  /**
   * Retrieve immutable leave ledger history for an employee.
   */
  static async getEmployeeLedger(tenantId: string, employeeId: string) {
    const entries = await rawPrisma.leaveLedgerEntry.findMany({
      where: { tenantId, employeeId },
      orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
    });

    const leaveTypes = await rawPrisma.leaveType.findMany({ where: { tenantId } });
    const typeMap = new Map(leaveTypes.map((t) => [t.id, t]));

    return entries.map((e) => ({
      ...e,
      leaveType: typeMap.get(e.leaveTypeId) || null,
    }));
  }
}
