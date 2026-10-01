import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';

export interface AttendanceWindowOptions {
  periodMonth: number;
  periodYear: number;
  cutoffStartDay?: number; // e.g. 25 for 25th of prev month; default 1 (calendar month)
  cutoffEndDay?: number;   // e.g. 24 for 24th of current month; default 0 (last day of month)
}

export interface EmployeeAttendanceSummary {
  employeeId: string;
  employeeCode: string;
  totalMonthDays: number;
  totalWorkingDays: number;
  presentDays: number;
  halfDays: number;
  approvedPaidLeaveDays: number;
  approvedUnpaidLeaveDays: number;
  calculatedLopDays: number;
  manualLopAdjustment: number;
  finalLopDays: number;
  payableDays: number;
  prorationFactor: Decimal;
  auditNotes?: string;
}

export class PayrollAttendanceService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Determine date range for cutoff window
   */
  getCutoffDateRange(options: AttendanceWindowOptions): { startDate: Date; endDate: Date; totalMonthDays: number } {
    const { periodMonth, periodYear, cutoffStartDay = 1, cutoffEndDay = 0 } = options;

    const daysInCurrentMonth = new Date(periodYear, periodMonth, 0).getDate();

    let startDate: Date;
    let endDate: Date;

    if (cutoffStartDay === 1 && (cutoffEndDay === 0 || cutoffEndDay === daysInCurrentMonth)) {
      // Standard calendar month
      startDate = new Date(Date.UTC(periodYear, periodMonth - 1, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(periodYear, periodMonth - 1, daysInCurrentMonth, 23, 59, 59));
    } else {
      // Custom cutoff: e.g. 25th of previous month to 24th of current month
      const prevMonth = periodMonth === 1 ? 12 : periodMonth - 1;
      const prevYear = periodMonth === 1 ? periodYear - 1 : periodYear;
      startDate = new Date(Date.UTC(prevYear, prevMonth - 1, cutoffStartDay, 0, 0, 0));
      endDate = new Date(Date.UTC(periodYear, periodMonth - 1, cutoffEndDay, 23, 59, 59));
    }

    return {
      startDate,
      endDate,
      totalMonthDays: daysInCurrentMonth,
    };
  }

  /**
   * Calculate attendance & LOP summary for an employee or all active employees in tenant
   */
  async computeTenantAttendance(
    tenantId: string,
    options: AttendanceWindowOptions,
    lopOverrides?: Record<string, { lopDays: number; reason: string }>
  ): Promise<Map<string, EmployeeAttendanceSummary>> {
    const { startDate, endDate, totalMonthDays } = this.getCutoffDateRange(options);

    // Fetch active employees
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: 'active' },
      select: { id: true, employeeCode: true },
    });

    // Fetch punches in range
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        date: { gte: startDate, lte: endDate },
      },
    });

    // Fetch approved leaves in range
    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        status: 'approved',
        OR: [{ startDate: { lte: endDate }, endDate: { gte: startDate } }],
      },
      include: { leaveType: true },
    });

    const result = new Map<string, EmployeeAttendanceSummary>();

    for (const emp of employees) {
      const empPunches = attendanceRecords.filter((a) => a.employeeId === emp.id);
      const empLeaves = leaveRequests.filter((l) => l.employeeId === emp.id);

      let presentPunches = 0;
      let halfDayPunches = 0;

      for (const p of empPunches) {
        if (p.status === 'present' || p.status === 'late') {
          presentPunches++;
        } else if (p.status === 'half_day') {
          halfDayPunches++;
        }
      }

      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;

      for (const l of empLeaves) {
        const isUnpaid = l.leaveType ? /unpaid|lop|loss of pay/i.test(l.leaveType.name) : false;
        const isPaid = !isUnpaid;
        const days = Number(l.days || 1);
        if (isPaid) {
          paidLeaveDays += days;
        } else {
          unpaidLeaveDays += days;
        }
      }

      let calculatedLop = 0;
      let payableDays = totalMonthDays;

      if (empPunches.length > 0) {
        // Punches exist: standard LOP is remaining days minus approved paid leaves and working credit
        const workedCredit = presentPunches + halfDayPunches * 0.5;
        const creditedDays = workedCredit + paidLeaveDays;
        payableDays = Math.min(totalMonthDays, Math.round(creditedDays * 10) / 10);
        calculatedLop = Math.max(0, totalMonthDays - payableDays);
      } else {
        // No explicit biometric/web punches uploaded for this month
        // Default to full month days minus approved unpaid leave
        calculatedLop = unpaidLeaveDays;
        payableDays = Math.max(0, totalMonthDays - calculatedLop);
      }

      // Check manual LOP override
      let manualLopAdjustment = 0;
      let auditNotes: string | undefined;
      if (lopOverrides && lopOverrides[emp.id]) {
        const override = lopOverrides[emp.id];
        manualLopAdjustment = override.lopDays - calculatedLop;
        calculatedLop = override.lopDays;
        payableDays = Math.max(0, totalMonthDays - calculatedLop);
        auditNotes = `LOP manually overridden to ${override.lopDays} days. Reason: ${override.reason}`;
      }

      const prorationFactor = new Decimal(payableDays).dividedBy(new Decimal(totalMonthDays));

      result.set(emp.id, {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        totalMonthDays,
        totalWorkingDays: totalMonthDays,
        presentDays: presentPunches,
        halfDays: halfDayPunches,
        approvedPaidLeaveDays: paidLeaveDays,
        approvedUnpaidLeaveDays: unpaidLeaveDays,
        calculatedLopDays: calculatedLop,
        manualLopAdjustment,
        finalLopDays: calculatedLop,
        payableDays,
        prorationFactor,
        auditNotes,
      });
    }

    return result;
  }
}
