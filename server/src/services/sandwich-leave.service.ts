import { rawPrisma } from "../prisma";

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
      where: { tenantId, isDefault: true, status: "active" },
    });

    if (defaultLeavePolicy) {
      return {
        sandwichRuleEnabled: defaultLeavePolicy.sandwichRule,
        policyId: defaultLeavePolicy.id,
        policyName: defaultLeavePolicy.name,
      };
    }

    const anyPolicy = await rawPrisma.leavePolicy.findFirst({
      where: { tenantId, status: "active" },
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
   * Evaluate sandwich leave for an employee within or adjacent to a given date range.
   * When `proposedRangeAsLeave` is true (e.g. during dry-run / application submit),
   * also detects intervening non-working days between an existing approved/pending full-day leave
   * and the newly proposed full-day leave range (e.g. Friday leave + Monday leave -> Sat/Sun sandwich).
   */
  static async evaluateEmployeeSandwichLeave(
    tenantId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
    options?: {
      sandwichRuleOverride?: boolean;
      proposedRangeAsLeave?: boolean;
      excludeRequestId?: string;
    }
  ): Promise<SandwichLeaveEvaluation> {
    const [policySetting, employee] = await Promise.all([
      options?.sandwichRuleOverride !== undefined
        ? Promise.resolve({ sandwichRuleEnabled: options.sandwichRuleOverride })
        : this.getSandwichPolicySetting(tenantId),
      rawPrisma.employee.findFirst({
        where: { id: employeeId, tenantId },
        include: { branch: true, department: true },
      }),
    ]);

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

    const normStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    const normEnd = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

    // Extended search range: 10 days before and 10 days after to detect adjacent weekly offs / holidays
    const searchStart = new Date(normStart);
    searchStart.setUTCDate(searchStart.getUTCDate() - 10);
    const searchEnd = new Date(normEnd);
    searchEnd.setUTCDate(searchEnd.getUTCDate() + 10);

    const [existingLeaves, holidays, shiftRosters, attendancePolicy] = await Promise.all([
      rawPrisma.leaveRequest.findMany({
        where: {
          tenantId,
          employeeId,
          status: "approved",
          ...(options?.excludeRequestId ? { id: { not: options.excludeRequestId } } : {}),
          startDate: { lte: searchEnd },
          endDate: { gte: searchStart },
        },
        include: { leaveType: true },
      }),
      rawPrisma.holiday.findMany({
        where: {
          tenantId,
          status: "active",
          date: { gte: searchStart, lte: searchEnd },
        },
      }),
      rawPrisma.shiftRoster.findMany({
        where: {
          tenantId,
          employeeId,
          rosterDate: { gte: searchStart, lte: searchEnd },
        },
      }),
      rawPrisma.attendancePolicy.findFirst({
        where: {
          tenantId,
          OR: [
            { branchId: employee.branchId, departmentId: employee.departmentId },
            { branchId: employee.branchId, departmentId: null },
            { isDefault: true },
          ],
        },
        orderBy: { isDefault: "asc" },
      }),
    ]);

    // Build map of leave days (ignoring half-day leaves for sandwich triggers)
    const fullLeaveDays = new Map<string, { fullDay: boolean; leaveType: string; isProposed?: boolean }>();
    for (const l of existingLeaves) {
      const isHalfDay = l.halfDay || Number(l.days) < 1.0;
      const cur = new Date(l.startDate);
      cur.setUTCHours(0, 0, 0, 0);
      const endL = new Date(l.endDate);
      endL.setUTCHours(0, 0, 0, 0);
      while (cur <= endL) {
        fullLeaveDays.set(cur.toISOString().slice(0, 10), {
          fullDay: !isHalfDay,
          leaveType: l.leaveType?.name || "Leave",
        });
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }

    if (options?.proposedRangeAsLeave) {
      const pCur = new Date(normStart);
      while (pCur <= normEnd) {
        const dStr = pCur.toISOString().slice(0, 10);
        if (!fullLeaveDays.has(dStr)) {
          fullLeaveDays.set(dStr, {
            fullDay: true,
            leaveType: "Proposed Leave",
            isProposed: true,
          });
        }
        pCur.setUTCDate(pCur.getUTCDate() + 1);
      }
    }

    const holidayMap = new Map<string, string>();
    for (const h of holidays) {
      const hdStr = new Date(h.date).toISOString().slice(0, 10);
      if (!h.branchIds || h.branchIds.length === 0 || (employee.branchId && h.branchIds.includes(employee.branchId))) {
        holidayMap.set(hdStr, h.name);
      }
    }

    const rosterMap = new Map<string, string>();
    for (const r of shiftRosters) {
      rosterMap.set(new Date(r.rosterDate).toISOString().slice(0, 10), r.status);
    }

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

    // When evaluating a proposed range, also scan up to 5 days immediately outside [normStart, normEnd]
    // to catch adjacent weekend/holiday bridges between an existing leave and the proposed leave
    const scanStart = new Date(normStart);
    const scanEnd = new Date(normEnd);
    if (options?.proposedRangeAsLeave) {
      scanStart.setUTCDate(scanStart.getUTCDate() - 5);
      scanEnd.setUTCDate(scanEnd.getUTCDate() + 5);
    }

    const startIso = normStart.toISOString().slice(0, 10);
    const endIso = normEnd.toISOString().slice(0, 10);

    const cur = new Date(scanStart);
    while (cur <= scanEnd) {
      const curStr = cur.toISOString().slice(0, 10);
      const nonWorkCheck = isNonWorkingDay(cur);

      if (nonWorkCheck.isNonWorking) {
        const prevWorkDay = new Date(cur);
        let foundPrev = false;
        for (let i = 1; i <= 7; i++) {
          prevWorkDay.setUTCDate(prevWorkDay.getUTCDate() - 1);
          if (!isNonWorkingDay(prevWorkDay).isNonWorking) {
            foundPrev = true;
            break;
          }
        }

        const nextWorkDay = new Date(cur);
        let foundNext = false;
        for (let i = 1; i <= 7; i++) {
          nextWorkDay.setUTCDate(nextWorkDay.getUTCDate() + 1);
          if (!isNonWorkingDay(nextWorkDay).isNonWorking) {
            foundNext = true;
            break;
          }
        }

        if (foundPrev && foundNext) {
          const prevStr = prevWorkDay.toISOString().slice(0, 10);
          const nextStr = nextWorkDay.toISOString().slice(0, 10);
          const prevLeave = fullLeaveDays.get(prevStr);
          const nextLeave = fullLeaveDays.get(nextStr);

          if (prevLeave?.fullDay && nextLeave?.fullDay) {
            // If scanning outside [normStart, normEnd], only include if one side touches the proposed range
            const insideTarget = curStr >= startIso && curStr <= endIso;
            const touchesProposed =
              Boolean(prevLeave.isProposed && !nextLeave.isProposed) ||
              Boolean(!prevLeave.isProposed && nextLeave.isProposed);

            if (insideTarget || touchesProposed) {
              sandwichDates.push(curStr);
              details.push({
                date: curStr,
                type: nonWorkCheck.type,
                name: nonWorkCheck.name,
                priorLeaveDate: prevStr,
                nextLeaveDate: nextStr,
                deducted: true,
                reason: `Sandwich Leave: Intervening ${nonWorkCheck.type} between leaves on ${prevStr} and ${nextStr}`,
              });
            }
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
