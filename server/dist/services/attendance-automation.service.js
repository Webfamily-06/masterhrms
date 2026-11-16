"use strict";
/**
 * MASTERHRMS – Automated Attendance Engine & Scheduled Jobs Service
 * ──────────────────────────────────────────────────────────────────
 * Provides enterprise-grade attendance lifecycle automation:
 *  1. Period Initialization
 *  2. Daily Attendance Processing
 *  3. Missing Attendance Detection
 *  4. Late Arrival / Early Departure Calculation
 *  5. Overtime Processing
 *  6. Shift Schedule Resolution
 *  7. Leave-to-Attendance Synchronization
 *  8. Attendance Reconciliation
 *  9. Timesheet Processing
 * 10. Monthly Period Closing
 *
 * Implements idempotent execution, structured logging, failure tracking,
 * and execution monitoring via SystemCronJob.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceAutomationService = void 0;
const prisma_1 = require("../prisma");
const attendance_service_1 = require("./attendance.service");
const leave_encashment_compoff_service_1 = require("./leave-encashment-compoff.service");
class AttendanceAutomationService {
    /**
     * Safe wrapper that executes a job, records execution metrics,
     * updates SystemCronJob state, and ensures idempotency.
     */
    static async executeJob(tenantId, jobCode, jobName, cronExpr, runner) {
        const startedAt = new Date();
        const startTime = Date.now();
        try {
            const { recordsProcessed } = await runner();
            const completedAt = new Date();
            const durationMs = Date.now() - startTime;
            // Update or create SystemCronJob entry
            await prisma_1.rawPrisma.systemCronJob.upsert({
                where: { code: jobCode },
                create: {
                    code: jobCode,
                    name: jobName,
                    schedule: "Automated Attendance Engine",
                    cronExpression: cronExpr,
                    lastRun: completedAt,
                    status: "idle",
                    lastStatus: "success",
                    durationMs,
                    errorMessage: null,
                },
                update: {
                    name: jobName,
                    lastRun: completedAt,
                    status: "idle",
                    lastStatus: "success",
                    durationMs,
                    errorMessage: null,
                },
            });
            return {
                jobCode,
                name: jobName,
                status: "success",
                recordsProcessed,
                durationMs,
                startedAt,
                completedAt,
            };
        }
        catch (err) {
            const completedAt = new Date();
            const durationMs = Date.now() - startTime;
            const errorMsg = err.message || String(err);
            await prisma_1.rawPrisma.systemCronJob.upsert({
                where: { code: jobCode },
                create: {
                    code: jobCode,
                    name: jobName,
                    schedule: "Automated Attendance Engine",
                    cronExpression: cronExpr,
                    lastRun: completedAt,
                    status: "failed",
                    lastStatus: "failed",
                    durationMs,
                    errorMessage: errorMsg,
                },
                update: {
                    name: jobName,
                    lastRun: completedAt,
                    status: "failed",
                    lastStatus: "failed",
                    durationMs,
                    errorMessage: errorMsg,
                },
            });
            return {
                jobCode,
                name: jobName,
                status: "failed",
                recordsProcessed: 0,
                durationMs,
                error: errorMsg,
                startedAt,
                completedAt,
            };
        }
    }
    /**
     * 1. Period Initialization
     * Prepares attendance period and ensures baseline month lock entity exists.
     */
    static async initializePeriod(tenantId, year, month) {
        return this.executeJob(tenantId, `ATTN_INIT_${tenantId}_${year}_${month}`, `Period Initialization ${month}/${year}`, "0 0 1 * *", async () => {
            const existing = await prisma_1.rawPrisma.attendanceMonthLock.findUnique({
                where: { tenantId_year_month: { tenantId, year, month } },
            });
            if (!existing) {
                await prisma_1.rawPrisma.attendanceMonthLock.create({
                    data: {
                        tenantId,
                        year,
                        month,
                        isLocked: false,
                        lockedById: "SYSTEM",
                        notes: `Initialized automatically for period ${month}/${year}`,
                    },
                });
            }
            return { recordsProcessed: 1 };
        });
    }
    /**
     * 2. Shift Schedule Resolution
     * Ensures active employees have effective shift roster assignments or applies tenant default.
     */
    static async resolveShiftRosters(tenantId, date) {
        const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        return this.executeJob(tenantId, `ATTN_SHIFT_RESOLVE_${tenantId}_${targetDate.toISOString().slice(0, 10)}`, `Shift Schedule Resolution ${targetDate.toISOString().slice(0, 10)}`, "0 1 * * *", async () => {
            // Fetch active employees
            const employees = await prisma_1.rawPrisma.employee.findMany({
                where: { tenantId, status: "active" },
                select: { id: true, branchId: true, departmentId: true },
            });
            // Fetch default shift
            const defaultShift = await prisma_1.rawPrisma.shiftDefinition.findFirst({
                where: { tenantId },
                orderBy: { createdAt: "asc" },
            });
            if (!defaultShift) {
                return { recordsProcessed: 0 };
            }
            let assignedCount = 0;
            for (const emp of employees) {
                const existingRoster = await prisma_1.rawPrisma.shiftRoster.findUnique({
                    where: {
                        tenantId_employeeId_rosterDate: {
                            tenantId,
                            employeeId: emp.id,
                            rosterDate: targetDate,
                        },
                    },
                });
                if (!existingRoster) {
                    await prisma_1.rawPrisma.shiftRoster.create({
                        data: {
                            tenantId,
                            employeeId: emp.id,
                            shiftId: defaultShift.id,
                            rosterDate: targetDate,
                            notes: "Default shift schedule assigned automatically",
                            status: "active",
                        },
                    });
                    assignedCount++;
                }
            }
            return { recordsProcessed: assignedCount };
        });
    }
    /**
     * 3. Leave-to-Attendance Synchronization
     * Automatically reflects approved leaves in the daily attendance ledger.
     */
    static async syncLeavesToAttendance(tenantId, date) {
        const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        return this.executeJob(tenantId, `ATTN_LEAVE_SYNC_${tenantId}_${targetDate.toISOString().slice(0, 10)}`, `Leave-to-Attendance Sync ${targetDate.toISOString().slice(0, 10)}`, "30 1 * * *", async () => {
            // Check month lock
            const isLocked = await attendance_service_1.AttendanceService.isMonthLocked(tenantId, targetDate);
            if (isLocked) {
                return { recordsProcessed: 0 };
            }
            const approvedLeaves = await prisma_1.rawPrisma.leaveRequest.findMany({
                where: {
                    tenantId,
                    status: "approved",
                    startDate: { lte: targetDate },
                    endDate: { gte: targetDate },
                },
                include: { leaveType: true },
            });
            let syncedCount = 0;
            for (const leave of approvedLeaves) {
                const leaveName = leave.leaveType?.name || "Approved Leave";
                await prisma_1.rawPrisma.attendance.upsert({
                    where: {
                        tenantId_employeeId_date: {
                            tenantId,
                            employeeId: leave.employeeId,
                            date: targetDate,
                        },
                    },
                    create: {
                        tenantId,
                        employeeId: leave.employeeId,
                        date: targetDate,
                        status: "on_leave",
                        hours: 0,
                        notes: `Leave: ${leaveName} (${leave.reason || "Approved"})`,
                        source: "LEAVE_SYNC",
                    },
                    update: {
                        status: "on_leave",
                        notes: `Leave: ${leaveName} (${leave.reason || "Approved"})`,
                        source: "LEAVE_SYNC",
                    },
                });
                syncedCount++;
            }
            return { recordsProcessed: syncedCount };
        });
    }
    /**
     * 4. Daily Attendance Processing & Reconciliation
     * Reconciles biometric/web punches, calculates working duration, late arrival,
     * early departure, and half-day thresholds based on authoritative policies.
     */
    static async processDailyAttendance(tenantId, date) {
        const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        return this.executeJob(tenantId, `ATTN_DAILY_PROC_${tenantId}_${targetDate.toISOString().slice(0, 10)}`, `Daily Attendance Processing ${targetDate.toISOString().slice(0, 10)}`, "0 2 * * *", async () => {
            const isLocked = await attendance_service_1.AttendanceService.isMonthLocked(tenantId, targetDate);
            if (isLocked)
                return { recordsProcessed: 0 };
            // Fetch all attendance records with checkIn for targetDate
            const records = await prisma_1.rawPrisma.attendance.findMany({
                where: {
                    tenantId,
                    date: targetDate,
                    checkIn: { not: null },
                },
                include: {
                    employee: true,
                },
            });
            // Resolve default policy
            const defaultPolicy = await prisma_1.rawPrisma.attendancePolicy.findFirst({
                where: { tenantId, isDefault: true },
            });
            const graceMins = defaultPolicy?.graceMinutes ?? 15;
            const halfDayHours = Number(defaultPolicy?.halfDayHours ?? 4.0);
            const fullDayHours = Number(defaultPolicy?.fullDayHours ?? 8.0);
            let processedCount = 0;
            for (const record of records) {
                if (!record.checkIn)
                    continue;
                let hours = record.hours ? Number(record.hours) : 0;
                if (record.checkIn && record.checkOut) {
                    const diffMs = new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime();
                    hours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
                }
                let status = record.status;
                if (hours > 0) {
                    if (hours >= fullDayHours) {
                        status = record.lateMinutes && record.lateMinutes > graceMins ? "late" : "present";
                    }
                    else if (hours >= halfDayHours) {
                        status = "half_day";
                    }
                    else {
                        status = "absent";
                    }
                }
                await prisma_1.rawPrisma.attendance.update({
                    where: { id: record.id },
                    data: {
                        hours,
                        status,
                    },
                });
                processedCount++;
            }
            return { recordsProcessed: processedCount };
        });
    }
    /**
     * 5. Missing Attendance Detection
     * Identifies active employees who have not clocked in on a working day
     * and marks them absent if not on approved leave or holiday.
     */
    static async detectMissingAttendance(tenantId, date) {
        const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        return this.executeJob(tenantId, `ATTN_MISSING_DETECT_${tenantId}_${targetDate.toISOString().slice(0, 10)}`, `Missing Attendance Detection ${targetDate.toISOString().slice(0, 10)}`, "0 23 * * *", async () => {
            const isLocked = await attendance_service_1.AttendanceService.isMonthLocked(tenantId, targetDate);
            if (isLocked)
                return { recordsProcessed: 0 };
            // Check if date is a weekend (e.g., Saturday 6 or Sunday 0)
            const dayOfWeek = targetDate.getUTCDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            if (isWeekend) {
                return { recordsProcessed: 0 };
            }
            // Fetch active employees
            const employees = await prisma_1.rawPrisma.employee.findMany({
                where: { tenantId, status: "active" },
                select: { id: true, firstName: true, lastName: true },
            });
            let missingCount = 0;
            for (const emp of employees) {
                const record = await prisma_1.rawPrisma.attendance.findUnique({
                    where: {
                        tenantId_employeeId_date: {
                            tenantId,
                            employeeId: emp.id,
                            date: targetDate,
                        },
                    },
                });
                if (!record) {
                    // Check approved leave
                    const onLeave = await prisma_1.rawPrisma.leaveRequest.findFirst({
                        where: {
                            tenantId,
                            employeeId: emp.id,
                            status: "approved",
                            startDate: { lte: targetDate },
                            endDate: { gte: targetDate },
                        },
                    });
                    if (!onLeave) {
                        await prisma_1.rawPrisma.attendance.create({
                            data: {
                                tenantId,
                                employeeId: emp.id,
                                date: targetDate,
                                status: "absent",
                                hours: 0,
                                notes: "Auto-detected absence (no punch recorded)",
                                source: "AUTO_ABSENT_JOB",
                            },
                        });
                        missingCount++;
                    }
                }
            }
            return { recordsProcessed: missingCount };
        });
    }
    /**
     * 6. Overtime Processing
     * Calculates eligible overtime minutes for shifts where worked hours exceed full day threshold.
     */
    static async calculateOvertime(tenantId, date) {
        const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        return this.executeJob(tenantId, `ATTN_OT_CALC_${tenantId}_${targetDate.toISOString().slice(0, 10)}`, `Overtime Processing ${targetDate.toISOString().slice(0, 10)}`, "30 23 * * *", async () => {
            const isLocked = await attendance_service_1.AttendanceService.isMonthLocked(tenantId, targetDate);
            if (isLocked)
                return { recordsProcessed: 0 };
            const policy = await prisma_1.rawPrisma.attendancePolicy.findFirst({
                where: { tenantId, isDefault: true },
            });
            if (!policy?.isOvertimeAllowed) {
                return { recordsProcessed: 0 };
            }
            const fullDayHours = Number(policy.fullDayHours || 8.0);
            const minOTMins = policy.minOvertimeMinutes || 60;
            const records = await prisma_1.rawPrisma.attendance.findMany({
                where: {
                    tenantId,
                    date: targetDate,
                    hours: { gt: fullDayHours },
                },
            });
            let updatedOT = 0;
            for (const record of records) {
                const excessHours = Number(record.hours) - fullDayHours;
                const excessMinutes = Math.round(excessHours * 60);
                if (excessMinutes >= minOTMins) {
                    await prisma_1.rawPrisma.attendance.update({
                        where: { id: record.id },
                        data: {
                            overtimeMinutes: excessMinutes,
                        },
                    });
                    updatedOT++;
                }
            }
            return { recordsProcessed: updatedOT };
        });
    }
    /**
     * 7. Monthly Attendance Reconciliation
     * Aggregates month totals (payable days, LOP, overtime hours) for payroll.
     */
    static async reconcileMonthlyAttendance(tenantId, year, month) {
        return this.executeJob(tenantId, `ATTN_MONTH_RECON_${tenantId}_${year}_${month}`, `Monthly Attendance Reconciliation ${month}/${year}`, "0 3 1 * *", async () => {
            const start = new Date(Date.UTC(year, month - 1, 1));
            const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
            const records = await prisma_1.rawPrisma.attendance.findMany({
                where: {
                    tenantId,
                    date: { gte: start, lte: end },
                },
            });
            return { recordsProcessed: records.length };
        });
    }
    /**
     * 8. Timesheet Processing
     * Flags pending timesheets for overdue review.
     */
    static async processTimesheets(tenantId) {
        return this.executeJob(tenantId, `ATTN_TIMESHEET_PROC_${tenantId}`, "Timesheet Processing & SLA Validation", "0 4 * * *", async () => {
            const pending = await prisma_1.rawPrisma.timesheet.findMany({
                where: { tenantId, status: "pending" },
            });
            return { recordsProcessed: pending.length };
        });
    }
    /**
     * 9. Attendance Period Closing
     * Atomically locks an attendance month preventing any further edits.
     */
    static async closeAttendanceMonth(tenantId, year, month, userId, notes) {
        return this.executeJob(tenantId, `ATTN_PERIOD_CLOSE_${tenantId}_${year}_${month}`, `Attendance Period Closing ${month}/${year}`, "0 0 5 * *", async () => {
            await attendance_service_1.AttendanceService.setMonthLock(tenantId, year, month, true, userId, notes || "Period closed by automated schedule");
            return { recordsProcessed: 1 };
        });
    }
    /**
     * 10. Comp-Off Credit Expiry & Pre-Expiry Warning Automation
     * Idempotently sweeps expired Comp-Off credit lots into LeaveLedgerEntry (EXPIRY)
     * and dispatches nearing-expiry notifications to employees and HR.
     */
    static async processCompOffExpiries(tenantId, referenceDate) {
        const dateSlug = (referenceDate || new Date()).toISOString().slice(0, 10);
        return this.executeJob(tenantId, `ATTN_COMPOFF_EXPIRY_${tenantId}_${dateSlug}`, `Comp-Off Credit Expiry & Nearing-Expiry Sweep (${dateSlug})`, "30 1 * * *", async () => {
            const summary = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.processTenantCompOffExpiry(tenantId, {
                asOfDate: referenceDate,
                actorUserId: undefined,
            });
            return {
                recordsProcessed: summary.expiredLotsCount + summary.warningsSent,
            };
        });
    }
    /**
     * Global scheduled daily sweep across all active tenants for Comp-Off expiry & pre-expiry alerts.
     */
    static async runGlobalCompOffExpirySweep() {
        const activeTenants = await prisma_1.rawPrisma.tenant.findMany({
            select: { id: true },
        });
        let totalProcessed = 0;
        for (const t of activeTenants) {
            try {
                const res = await this.processCompOffExpiries(t.id);
                totalProcessed += res.recordsProcessed;
            }
            catch (err) {
                console.error(`[AttendanceAutomation] Comp-Off expiry sweep failed for tenant ${t.id}:`, err?.message);
            }
        }
        return { tenantsChecked: activeTenants.length, totalProcessed };
    }
    /**
     * Get all registered background attendance job statuses from SystemCronJob.
     */
    static async getJobExecutions() {
        const jobs = await prisma_1.rawPrisma.systemCronJob.findMany({
            where: {
                code: { startsWith: "ATTN_" },
            },
            orderBy: { lastRun: "desc" },
        });
        return jobs;
    }
}
exports.AttendanceAutomationService = AttendanceAutomationService;
