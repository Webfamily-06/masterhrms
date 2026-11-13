import { rawPrisma } from "../prisma.js";

export interface SandwichLeaveEvaluation {
  employeeId: string;
  employeeName: string;
  hasSandwichLeave: boolean;
  sandwichDaysCount: number;
  sandwichDates: string[]; // ISO date strings (YYYY-MM-DD)
  details: {
    date: string;
    type: "WEEKLY_OFF" | "HOLIDAY";
    name?: string;
    priorLeaveDate: string;
    nextLeaveDate: string;
    deducted: boolean;
    reason: string;
  }[];
}

export class SandwichLeaveService {
  /**
   * Get organization / tenant sandwich leave policy setting
   */
  static async getSandwichPolicySetting(tenantId: string): Promise<{
    sandwichRuleEnabled: boolean;
    policyId?: string;
    policyName?: string;
  }> {
    const defaultLeavePolicy = await rawPrisma.leavePolicy.findFirst({
      where: { tenantId, isDefault: true },
    });

    if (defaultLeavePolicy) {
      return {
        sandwichRuleEnabled: defaultLeavePolicy.sandwichRule,
        policyId: defaultLeavePolicy.id,
        policyName: defaultLeavePolicy.name,
      };
    }

    const anyPolicy = await rawPrisma.leavePolicy.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });

    return {
      sandwichRuleEnabled: anyPolicy?.sandwichRule ?? false,
      policyId: anyPolicy?.id,
      policyName: anyPolicy?.name,
    };
  }

  /**
   * Update sandwich policy setting for default policy
   */
  static async setSandwichPolicySetting(
    tenantId: string,
    enabled: boolean
  ): Promise<{ sandwichRuleEnabled: boolean; policyId?: string }> {
    let policy = await rawPrisma.leavePolicy.findFirst({
      where: { tenantId, isDefault: true },
    });

    if (!policy) {
      policy = await rawPrisma.leavePolicy.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
      });
    }

    if (policy) {
      const updated = await rawPrisma.leavePolicy.update({
        where: { id: policy.id },
        data: { sandwichRule: enabled },
      });
      return { sandwichRuleEnabled: updated.sandwichRule, policyId: updated.id };
    } else {
      const created = await rawPrisma.leavePolicy.create({
        data: {
          tenantId,
          name: "Standard Organization Leave Policy",
          code: `LPOL-DEF-${Date.now()}`,
          isDefault: true,
          sandwichRule: enabled,
          noticeDays: 2,
          maxConsecutiveDays: 14,
        },
      });
      return { sandwichRuleEnabled: created.sandwichRule, policyId: created.id };
    }
  }

  /**
   * Evaluate sandwich leave for an employee within a given date range.
   * If sandwichRule is enabled, detects intervening weekly offs and holidays
   * where the immediately preceding scheduled working day AND immediately succeeding
   * scheduled working day were approved full-day leaves.
   */
  static async evaluateEmployeeSandwichLeave(
    tenantId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SandwichLeaveEvaluation> {
    const policySetting = await this.getSandwichPolicySetting(tenantId);
    const employee = await rawPrisma.employee.findUnique({
      where: { id: employeeId },
      include: { branch: true, department: true },
    });

    if (!employee) {
      throw new Error(`Employee with ID ${employeeId} not found`);
    }

    const employeeName = `${employee.firstName} ${employee.lastName}`.trim();

    if (!policySetting.sandwichRuleEnabled) {
      return {
        employeeId,
        employeeName,
        hasSandwichLeave: false,
        sandwichDaysCount: 0,
        sandwichDates: [],
        details: [],
      };
    }

    // Extended search range: 7 days before and 7 days after to detect boundaries
    const searchStart = new Date(startDate);
    searchStart.setUTCDate(searchStart.getUTCDate() - 7);
    const searchEnd = new Date(endDate);
    searchEnd.setUTCDate(searchEnd.getUTCDate() + 7);

    // Fetch approved leaves
    const approvedLeaves = await rawPrisma.leaveRequest.findMany({
      where: {
        tenantId,
        employeeId,
        status: "approved",
        startDate: { lte: searchEnd },
        endDate: { gte: searchStart },
      },
      include: { leaveType: true },
    });

    // Build map of leave days (ignoring half-day leaves for sandwich triggers)
    const approvedLeaveDays = new Map<string, { fullDay: boolean; leaveType: string }>();
    for (const l of approvedLeaves) {
      const isHalfDay = Number(l.days) < 1.0;
      const cur = new Date(l.startDate);
      const endL = new Date(l.endDate);
      while (cur <= endL) {
        approvedLeaveDays.set(cur.toISOString().slice(0, 10), {
          fullDay: !isHalfDay,
          leaveType: l.leaveType?.name || "Leave",
        });
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }

    // Fetch holidays
    const holidays = await rawPrisma.holiday.findMany({
      where: {
        tenantId,
        status: "active",
        date: { gte: searchStart, lte: searchEnd },
      },
    });

    const holidayMap = new Map<string, string>();
    for (const h of holidays) {
      const hdStr = new Date(h.date).toISOString().slice(0, 10);
      if (!h.branchIds || h.branchIds.length === 0 || (employee.branchId && h.branchIds.includes(employee.branchId))) {
        holidayMap.set(hdStr, h.name);
      }
    }

    // Fetch shift rosters and attendance policy for working day schedule
    const shiftRosters = await rawPrisma.shiftRoster.findMany({
      where: {
        tenantId,
        employeeId,
        rosterDate: { gte: searchStart, lte: searchEnd },
      },
    });
    const rosterMap = new Map<string, string>();
    for (const r of shiftRosters) {
      rosterMap.set(new Date(r.rosterDate).toISOString().slice(0, 10), r.status);
    }

    const attendancePolicy = await rawPrisma.attendancePolicy.findFirst({
      where: {
        tenantId,
        OR: [
          { branchId: employee.branchId, departmentId: employee.departmentId },
          { branchId: employee.branchId, departmentId: null },
          { isDefault: true },
        ],
      },
      orderBy: { isDefault: "asc" },
    });

    const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const workingDaysConfig = (attendancePolicy?.workingDays || "Mon,Tue,Wed,Thu,Fri").toLowerCase();

    const isNonWorkingDay = (d: Date): { isNonWorking: boolean; type: "WEEKLY_OFF" | "HOLIDAY"; name?: string } => {
      const dStr = d.toISOString().slice(0, 10);
      if (holidayMap.has(dStr)) {
        return { isNonWorking: true, type: "HOLIDAY", name: holidayMap.get(dStr) };
      }
      const rosterStatus = rosterMap.get(dStr);
      if (rosterStatus === "weekly_off") {
        return { isNonWorking: true, type: "WEEKLY_OFF" };
      }
      if (rosterStatus && rosterStatus !== "weekly_off") {
        return { isNonWorking: false, type: "WEEKLY_OFF" };
      }
      const dayName = dayNames[d.getUTCDay()];
      if (!workingDaysConfig.includes(dayName)) {
        return { isNonWorking: true, type: "WEEKLY_OFF" };
      }
      return { isNonWorking: false, type: "WEEKLY_OFF" };
    };

    const details: SandwichLeaveEvaluation["details"] = [];
    const sandwichDates: string[] = [];

    // Scan each day in the requested target range [startDate, endDate]
    const cur = new Date(startDate);
    const end = new Date(endDate);

    while (cur <= end) {
      const curStr = cur.toISOString().slice(0, 10);
      const nonWorkCheck = isNonWorkingDay(cur);

      if (nonWorkCheck.isNonWorking) {
        // Find preceding scheduled working day
        let prevWorkDay: Date | null = new Date(cur);
        let foundPrev = false;
        for (let i = 1; i <= 7; i++) {
          prevWorkDay.setUTCDate(prevWorkDay.getUTCDate() - 1);
          if (!isNonWorkingDay(prevWorkDay).isNonWorking) {
            foundPrev = true;
            break;
          }
        }

        // Find succeeding scheduled working day
        let nextWorkDay: Date | null = new Date(cur);
        let foundNext = false;
        for (let i = 1; i <= 7; i++) {
          nextWorkDay.setUTCDate(nextWorkDay.getUTCDate() + 1);
          if (!isNonWorkingDay(nextWorkDay).isNonWorking) {
            foundNext = true;
            break;
          }
        }

        if (foundPrev && foundNext && prevWorkDay && nextWorkDay) {
          const prevLeave = approvedLeaveDays.get(prevWorkDay.toISOString().slice(0, 10));
          const nextLeave = approvedLeaveDays.get(nextWorkDay.toISOString().slice(0, 10));

          // Only trigger if both preceding and succeeding work days had FULL-DAY approved leaves
          if (prevLeave?.fullDay && nextLeave?.fullDay) {
            sandwichDates.push(curStr);
            details.push({
              date: curStr,
              type: nonWorkCheck.type,
              name: nonWorkCheck.name,
              priorLeaveDate: prevWorkDay.toISOString().slice(0, 10),
              nextLeaveDate: nextWorkDay.toISOString().slice(0, 10),
              deducted: true,
              reason: `Sandwich Leave: Intervening ${nonWorkCheck.type} between approved leaves on ${prevWorkDay.toISOString().slice(0, 10)} and ${nextWorkDay.toISOString().slice(0, 10)}`,
            });
          }
        }
      }

      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    return {
      employeeId,
      employeeName,
      hasSandwichLeave: sandwichDates.length > 0,
      sandwichDaysCount: sandwichDates.length,
      sandwichDates,
      details,
    };
  }
}
