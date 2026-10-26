"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveService = void 0;
const prisma_1 = require("../prisma");
const outbox_service_1 = require("./outbox.service");
const attendance_service_1 = require("./attendance.service");
const socket_1 = require("../socket");
class LeaveService {
    /**
     * Derive authoritative available leave balance from immutable LeaveLedgerEntry records.
     */
    static async getEmployeeBalance(tenantId, employeeId, leaveTypeId) {
        const entries = await prisma_1.rawPrisma.leaveLedgerEntry.findMany({
            where: { tenantId, employeeId, leaveTypeId },
            select: { entryType: true, days: true },
        });
        let balance = 0;
        for (const entry of entries) {
            const days = Number(entry.days);
            if (entry.entryType === "ACCRUAL" || entry.entryType === "CREDIT" || entry.entryType === "CARRY_FORWARD") {
                balance += days;
            }
            else if (entry.entryType === "DEBIT" || entry.entryType === "ENCASHMENT") {
                balance -= days;
            }
        }
        // Also deduct any pending requests
        const pendingRequests = await prisma_1.rawPrisma.leaveRequest.findMany({
            where: { tenantId, employeeId, leaveTypeId, status: "pending" },
            select: { days: true },
        });
        const pendingTotal = pendingRequests.reduce((acc, req) => acc + Number(req.days), 0);
        return Math.max(0, balance - pendingTotal);
    }
    /**
     * Server-authoritative Dry-Run calculation.
     */
    static async validateDryRun(options) {
        const { tenantId, employeeId, leaveTypeId } = options;
        const start = new Date(options.startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(options.endDate);
        end.setUTCHours(0, 0, 0, 0);
        if (start > end) {
            throw new Error("Start date must be before or equal to end date.");
        }
        // 1. Fetch Leave Type and Policy
        const leaveType = await prisma_1.rawPrisma.leaveType.findUnique({
            where: { id: leaveTypeId },
        });
        if (!leaveType || leaveType.tenantId !== tenantId) {
            throw new Error("Leave type not found");
        }
        const leavePolicy = await prisma_1.rawPrisma.leavePolicy.findFirst({
            where: { tenantId, isDefault: true },
        });
        const sandwichRule = leaveType.sandwichRule || leavePolicy?.sandwichRule || false;
        // 2. Fetch existing holidays in the range
        const holidays = await prisma_1.rawPrisma.holiday.findMany({
            where: {
                tenantId,
                date: { gte: start, lte: end },
            },
            select: { date: true, name: true },
        });
        const holidayDates = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));
        // 3. Check overlaps with existing non-cancelled leave requests
        const overlapping = await prisma_1.rawPrisma.leaveRequest.findFirst({
            where: {
                tenantId,
                employeeId,
                status: { in: ["pending", "approved"] },
                startDate: { lte: end },
                endDate: { gte: start },
            },
        });
        const warnings = [];
        if (overlapping) {
            warnings.push("An overlapping leave application already exists for this period.");
        }
        // 4. Calculate day by day
        const breakdown = [];
        let deductibleDays = 0;
        const curr = new Date(start);
        while (curr <= end) {
            const dateStr = curr.toISOString().slice(0, 10);
            const dayOfWeek = curr.getUTCDay(); // 0 is Sunday, 6 is Saturday
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = holidayDates.has(dateStr);
            let isDeducted = true;
            let reason;
            if (!sandwichRule && (isWeekend || isHoliday)) {
                isDeducted = false;
                reason = isHoliday ? "Holiday" : "Weekend";
            }
            if (isDeducted) {
                deductibleDays += options.halfDay ? 0.5 : 1.0;
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
        // 5. Check available balance
        const availableBalance = await this.getEmployeeBalance(tenantId, employeeId, leaveTypeId);
        const hasEnoughBalance = availableBalance >= deductibleDays;
        if (!hasEnoughBalance && leaveType.isPaid) {
            warnings.push(`Insufficient leave balance. Available: ${availableBalance}, Required: ${deductibleDays}`);
        }
        return {
            isValid: warnings.length === 0,
            totalDays: deductibleDays,
            availableBalance,
            remainingBalance: availableBalance - deductibleDays,
            breakdown,
            warnings,
        };
    }
    /**
     * Submit Leave Application with Dry-Run verification.
     */
    static async submitApplication(tenantId, employeeId, data) {
        const dryRun = await this.validateDryRun({
            tenantId,
            employeeId,
            leaveTypeId: data.leaveTypeId,
            startDate: data.startDate,
            endDate: data.endDate,
            halfDay: data.halfDay,
            reason: data.reason,
        });
        if (!dryRun.isValid) {
            throw new Error(`Validation failed: ${dryRun.warnings.join("; ")}`);
        }
        const start = new Date(data.startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(data.endDate);
        end.setUTCHours(0, 0, 0, 0);
        const employee = await prisma_1.rawPrisma.employee.findUnique({
            where: { id: employeeId },
            select: { managerId: true, firstName: true, lastName: true },
        });
        const application = await prisma_1.rawPrisma.$transaction(async (tx) => {
            const req = await tx.leaveRequest.create({
                data: {
                    tenantId,
                    employeeId,
                    leaveTypeId: data.leaveTypeId,
                    approverId: employee?.managerId || null,
                    startDate: start,
                    endDate: end,
                    days: Math.max(1, Math.round(dryRun.totalDays)),
                    status: "pending",
                    reason: data.reason,
                },
                include: { leaveType: true, employee: true },
            });
            await outbox_service_1.OutboxService.createEvent({
                tenantId,
                eventType: "leave.requested",
                entityType: "LeaveRequest",
                entityId: req.id,
                actorId: employeeId,
                payload: {
                    employeeId,
                    leaveTypeId: data.leaveTypeId,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    days: dryRun.totalDays,
                },
            }, tx);
            return req;
        });
        (0, socket_1.broadcastToTenant)(tenantId, "leave.requested", {
            id: application.id,
            employeeName: `${employee?.firstName} ${employee?.lastName}`.trim(),
            days: dryRun.totalDays,
        });
        return application;
    }
    /**
     * Authoritative Leave Approval / Rejection.
     */
    static async decideApplication(tenantId, requestId, action, reviewerId, comments) {
        const request = await prisma_1.rawPrisma.leaveRequest.findUnique({
            where: { id: requestId },
            include: { leaveType: true, employee: true },
        });
        if (!request || request.tenantId !== tenantId) {
            throw new Error("Leave request not found");
        }
        if (request.status !== "pending") {
            throw new Error(`Request is already ${request.status}`);
        }
        if (action === "reject") {
            const updated = await prisma_1.rawPrisma.$transaction(async (tx) => {
                const req = await tx.leaveRequest.update({
                    where: { id: requestId },
                    data: {
                        status: "rejected",
                        approvedAt: new Date(),
                    },
                });
                await outbox_service_1.OutboxService.createEvent({
                    tenantId,
                    eventType: "leave.rejected",
                    entityType: "LeaveRequest",
                    entityId: req.id,
                    actorId: reviewerId,
                    payload: { employeeId: request.employeeId, comments },
                }, tx);
                return req;
            });
            (0, socket_1.broadcastToTenant)(tenantId, "leave.rejected", { id: requestId, employeeId: request.employeeId });
            return updated;
        }
        // APPROVE ACTION
        // 1. Verify Month Lock for all affected days
        const curr = new Date(request.startDate);
        const end = new Date(request.endDate);
        while (curr <= end) {
            await attendance_service_1.AttendanceService.assertMonthUnlocked(tenantId, curr);
            curr.setUTCDate(curr.getUTCDate() + 1);
        }
        // 2. Perform atomic approval inside $transaction
        const approved = await prisma_1.rawPrisma.$transaction(async (tx) => {
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
            const attCurr = new Date(request.startDate);
            while (attCurr <= end) {
                const dayDate = new Date(Date.UTC(attCurr.getUTCFullYear(), attCurr.getUTCMonth(), attCurr.getUTCDate()));
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
            await outbox_service_1.OutboxService.createEvent({
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
            }, tx);
            await outbox_service_1.OutboxService.createEvent({
                tenantId,
                eventType: "leave.balance_changed",
                entityType: "LeaveLedgerEntry",
                entityId: req.id,
                actorId: reviewerId,
                payload: {
                    employeeId: request.employeeId,
                    leaveTypeId: request.leaveTypeId,
                },
            }, tx);
            return req;
        });
        (0, socket_1.broadcastToTenant)(tenantId, "leave.approved", {
            id: requestId,
            employeeId: request.employeeId,
            days: request.days,
        });
        return approved;
    }
    /**
     * Cancel an approved or pending leave application with non-destructive compensating ledger entry.
     */
    static async cancelApplication(tenantId, requestId, actorId, reason) {
        const request = await prisma_1.rawPrisma.leaveRequest.findUnique({
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
                await attendance_service_1.AttendanceService.assertMonthUnlocked(tenantId, curr);
                curr.setUTCDate(curr.getUTCDate() + 1);
            }
        }
        const cancelled = await prisma_1.rawPrisma.$transaction(async (tx) => {
            const req = await tx.leaveRequest.update({
                where: { id: requestId },
                data: { status: "cancelled" },
            });
            // If it was approved, create a compensating CREDIT entry
            if (request.status === "approved" && request.leaveTypeId) {
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
                // Revert attendance records for affected dates
                const attCurr = new Date(request.startDate);
                const end = new Date(request.endDate);
                while (attCurr <= end) {
                    const dayDate = new Date(Date.UTC(attCurr.getUTCFullYear(), attCurr.getUTCMonth(), attCurr.getUTCDate()));
                    await tx.attendance.updateMany({
                        where: {
                            tenantId,
                            employeeId: request.employeeId,
                            date: dayDate,
                            status: "on_leave",
                        },
                        data: {
                            status: "present", // Reverted to default present or requires re-punch
                            notes: "Leave cancelled",
                        },
                    });
                    attCurr.setUTCDate(attCurr.getUTCDate() + 1);
                }
            }
            await outbox_service_1.OutboxService.createEvent({
                tenantId,
                eventType: "leave.cancelled",
                entityType: "LeaveRequest",
                entityId: req.id,
                actorId,
                payload: { employeeId: request.employeeId, reason },
            }, tx);
            return req;
        });
        (0, socket_1.broadcastToTenant)(tenantId, "leave.cancelled", { id: requestId, employeeId: request.employeeId });
        return cancelled;
    }
}
exports.LeaveService = LeaveService;
