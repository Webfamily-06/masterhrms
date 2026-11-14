import { rawPrisma } from "../prisma";
import { AuditService } from "./audit.service";
import { OutboxService } from "./outbox.service";
import { NotificationService } from "./notification.service";
import { AttendanceService } from "./attendance.service";
import { broadcastToTenant } from "../socket";
import { SandwichLeaveService } from "./sandwich-leave.service";

export interface LeaveDryRunOptions {
  tenantId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string | Date;
  endDate: string | Date;
  halfDay?: boolean;
  halfDaySession?: string;
  reason?: string;
  excludeRequestId?: string;
  bypassNoticePeriod?: boolean;
}

export interface DayBreakdown {
  date: string;
  isWeekend: boolean;
  isHoliday: boolean;
  isDeducted: boolean;
  reason?: string;
}

export interface ParsedPolicyRules {
  minDays: number;
  halfDayAllowed: boolean;
  blackoutDatesList: string[];
}

export class LeaveHttpError extends Error {
  status: number;
  code?: string;
  details?: any;
  constructor(message: string, status: number = 400, code?: string, details?: any) {
    super(message);
    this.name = "LeaveHttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class LeaveService {
  static readonly ELEVATED_HR_ROLES = [
    "super_admin",
    "admin",
    "hr_admin",
    "hr_manager",
    "HR Manager",
    "Workspace Admin",
    "tenant_admin",
  ];

  static isElevatedHrUser(roles?: string[] | null): boolean {
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => this.ELEVATED_HR_ROLES.includes(r));
  }

  /**
   * Parses extended policy rule metadata stored non-destructively in `LeavePolicy.blackoutDates`
   * when formatted as JSON (`{"minDays": 1, "halfDayAllowed": true, "blackout": [...]}`),
   * while remaining 100% compatible with plain comma-separated date strings or null values.
   */
  static parsePolicyRules(policy: any | null | undefined, leaveType?: any | null): ParsedPolicyRules {
    const defaultHalfDay = leaveType?.halfDayAllowed !== undefined ? Boolean(leaveType.halfDayAllowed) : true;
    let minDays = defaultHalfDay ? 0.5 : 1;
    let halfDayAllowed = defaultHalfDay;
    let blackoutDatesList: string[] = [];

    const raw = policy?.blackoutDates;
    if (typeof raw === "string" && raw.trim().length > 0) {
      const trimmed = raw.trim();
      if (trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed.halfDayAllowed === "boolean") {
            halfDayAllowed = parsed.halfDayAllowed && (leaveType ? Boolean(leaveType.halfDayAllowed) : true);
          }
          if (parsed.minDays !== undefined && parsed.minDays !== null && !Number.isNaN(Number(parsed.minDays))) {
            minDays = Math.max(0.5, Number(parsed.minDays));
          } else {
            minDays = halfDayAllowed ? 0.5 : 1;
          }
          if (Array.isArray(parsed.blackout)) {
            blackoutDatesList = parsed.blackout.map(String).filter(Boolean);
          }
        } catch {
          blackoutDatesList = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
        }
      } else {
        blackoutDatesList = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    return {
      minDays,
      halfDayAllowed,
      blackoutDatesList,
    };
  }

  static serializePolicyRules(
    input: {
      minDays?: number | string;
      halfDayAllowed?: boolean;
      blackoutDates?: string | string[] | null;
    },
    existingBlackoutDates?: string | null,
    leaveType?: any | null
  ): string | null {
    const prev = this.parsePolicyRules({ blackoutDates: existingBlackoutDates }, leaveType);
    const halfDayAllowed =
      input.halfDayAllowed !== undefined ? Boolean(input.halfDayAllowed) : prev.halfDayAllowed;
    const minDays =
      input.minDays !== undefined && input.minDays !== "" && !Number.isNaN(Number(input.minDays))
        ? Math.max(0.5, Number(input.minDays))
        : prev.minDays;

    let blackout: string[] = prev.blackoutDatesList;
    if (Array.isArray(input.blackoutDates)) {
      blackout = input.blackoutDates.map(String).filter(Boolean);
    } else if (typeof input.blackoutDates === "string") {
      const t = input.blackoutDates.trim();
      if (!t) {
        blackout = [];
      } else if (!t.startsWith("{")) {
        blackout = t.split(",").map((s) => s.trim()).filter(Boolean);
      }
    } else if (input.blackoutDates === null) {
      blackout = [];
    }

    return JSON.stringify({
      minDays,
      halfDayAllowed,
      ...(blackout.length > 0 ? { blackout } : {}),
    });
  }

  static enrichPolicy(policy: any) {
    if (!policy) return null;
    const rules = this.parsePolicyRules(policy, policy.leaveType);
    const carryForwardDays = policy.carryForwardEnabled ? Number(policy.maxCarryForwardDays ?? 0) : 0;
    return {
      ...policy,
      leaveTypeName: policy.leaveType?.name || "All Leave Types (Global)",
      color: policy.leaveType?.color || "#3b82f6",
      entitlementDays:
        policy.leaveType?.daysPerYear !== undefined ? Number(policy.leaveType.daysPerYear) : null,
      isPaid: policy.leaveType?.isPaid ?? true,
      minDays: rules.minDays,
      halfDayAllowed: rules.halfDayAllowed,
      blackoutDatesList: rules.blackoutDatesList,
      carryForward: carryForwardDays,
      carryForwardDays,
    };
  }

  /**
   * Resolves the most specific active policy applicable to a leave type and employee org scope.
   */
  static async resolveEffectivePolicy(
    tenantId: string,
    leaveTypeId: string,
    branchId?: string | null,
    departmentId?: string | null,
    referenceDate?: Date
  ): Promise<{
    policy: any | null;
    rules: ParsedPolicyRules;
    blockedReason?: string;
  }> {
    const [policies, leaveType] = await Promise.all([
      rawPrisma.leavePolicy.findMany({
        where: {
          tenantId,
          OR: [{ leaveTypeId }, { leaveTypeId: null }, { isDefault: true }],
        },
        include: { leaveType: true },
        orderBy: [{ isDefault: "asc" }, { updatedAt: "desc" }],
      }),
      rawPrisma.leaveType.findFirst({ where: { id: leaveTypeId, tenantId } }),
    ]);

    const refDate = referenceDate ? new Date(referenceDate) : new Date();
    refDate.setUTCHours(0, 0, 0, 0);

    const typeSpecificPolicies = policies.filter((p) => p.leaveTypeId === leaveTypeId);
    const matchesScope = (p: any) => {
      if (p.branchId && branchId && p.branchId !== branchId) return false;
      if (p.branchId && !branchId) return false;
      if (p.departmentId && departmentId && p.departmentId !== departmentId) return false;
      if (p.departmentId && !departmentId) return false;
      return true;
    };

    const isWithinDates = (p: any) => {
      if (p.effectiveFrom) {
        const ef = new Date(p.effectiveFrom);
        ef.setUTCHours(0, 0, 0, 0);
        if (refDate < ef) return false;
      }
      if (p.effectiveTo) {
        const et = new Date(p.effectiveTo);
        et.setUTCHours(23, 59, 59, 999);
        if (refDate > et) return false;
      }
      return true;
    };

    const scopedTypePolicies = typeSpecificPolicies.filter(matchesScope);
    const activeScopedTypePolicies = scopedTypePolicies.filter(
      (p) => p.status === "active" && isWithinDates(p)
    );

    // Specificity score: branch + department (4) > department (3) > branch (2) > leaveType org-wide (1)
    const score = (p: any) => (p.branchId ? 2 : 0) + (p.departmentId ? 2 : 0) + (p.leaveTypeId ? 1 : 0);
    activeScopedTypePolicies.sort((a, b) => score(b) - score(a));

    if (activeScopedTypePolicies.length > 0) {
      const chosen = activeScopedTypePolicies[0];
      return {
        policy: this.enrichPolicy(chosen),
        rules: this.parsePolicyRules(chosen, leaveType || chosen.leaveType),
      };
    }

    // If a leave-type-specific policy exists for this scope, check if it was explicitly deactivated or outside effective period
    if (scopedTypePolicies.length > 0) {
      const inactiveOne = scopedTypePolicies.find((p) => p.status !== "active");
      if (inactiveOne) {
        return {
          policy: this.enrichPolicy(inactiveOne),
          rules: this.parsePolicyRules(inactiveOne, leaveType || inactiveOne.leaveType),
          blockedReason: `The leave policy "${inactiveOne.name}" for ${leaveType?.name || "this leave type"} is currently inactive.`,
        };
      }
      const outOfWindow = scopedTypePolicies.find((p) => !isWithinDates(p));
      if (outOfWindow) {
        const fromStr = outOfWindow.effectiveFrom
          ? new Date(outOfWindow.effectiveFrom).toISOString().slice(0, 10)
          : "N/A";
        const toStr = outOfWindow.effectiveTo
          ? new Date(outOfWindow.effectiveTo).toISOString().slice(0, 10)
          : "open";
        return {
          policy: this.enrichPolicy(outOfWindow),
          rules: this.parsePolicyRules(outOfWindow, leaveType || outOfWindow.leaveType),
          blockedReason: `Leave dates fall outside the effective period (${fromStr} to ${toStr}) of policy "${outOfWindow.name}".`,
        };
      }
    }

    // Fall back to global / default active policy
    const globalCandidates = policies
      .filter((p) => (!p.leaveTypeId || p.isDefault) && p.status === "active" && matchesScope(p) && isWithinDates(p))
      .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));

    const fallback = globalCandidates[0] || null;
    return {
      policy: fallback ? this.enrichPolicy(fallback) : null,
      rules: this.parsePolicyRules(fallback, leaveType),
    };
  }

  /**
   * Pure, single-source-of-truth balance computation for one employee + one leave type in a target year.
   * Ensures HR cards, ESS cards, Ledger snapshots, and Dry-Run checks NEVER diverge.
   */
  static computeLeaveTypeBalanceSummary(
    lt: {
      id: string;
      name: string;
      code?: string | null;
      color?: string | null;
      isPaid?: boolean;
      status?: string;
      daysPerYear?: number | null;
      halfDayAllowed?: boolean;
      sandwichRule?: boolean;
    },
    yearEntries: Array<{
      entryType: string;
      days: any;
      referenceId?: string | null;
    }>,
    yearRequests: Array<{
      id: string;
      status: string;
      days: any;
    }>
  ) {
    let accrued = 0;
    let hasSyncedAccrual = false;
    let carryForward = 0;
    let manualCredits = 0;
    let manualDebits = 0;
    let encashments = 0;

    // Track reference-linked ledger debits/credits (approvals & compensating reversals)
    const refDebits = new Map<string, number>();
    const refCredits = new Map<string, number>();

    for (const entry of yearEntries) {
      const d = Number(entry.days || 0);
      if (entry.entryType === "ACCRUAL") {
        hasSyncedAccrual = true;
        accrued += d;
      } else if (entry.entryType === "CARRY_FORWARD") {
        carryForward += d;
      } else if (entry.entryType === "CREDIT") {
        if (entry.referenceId) {
          refCredits.set(entry.referenceId, (refCredits.get(entry.referenceId) || 0) + d);
        } else {
          manualCredits += d;
        }
      } else if (entry.entryType === "DEBIT") {
        if (entry.referenceId) {
          refDebits.set(entry.referenceId, (refDebits.get(entry.referenceId) || 0) + d);
        } else {
          manualDebits += d;
        }
      } else if (entry.entryType === "ENCASHMENT") {
        encashments += d;
      }
    }

    const defaultQuota = lt.daysPerYear !== undefined && lt.daysPerYear !== null ? Number(lt.daysPerYear) : 0;
    const annualEntitlement = hasSyncedAccrual ? accrued : defaultQuota;

    // Net ledger-backed leave usage (DEBIT minus compensating CREDIT per request referenceId)
    let netLedgerUsed = 0;
    for (const [refId, deb] of refDebits.entries()) {
      const cred = refCredits.get(refId) || 0;
      netLedgerUsed += Math.max(0, deb - cred);
    }

    // Include any legacy approved requests in this year that had no ledger DEBIT row
    let legacyUnledgeredApproved = 0;
    let pending = 0;
    for (const req of yearRequests) {
      const reqDays = Number(req.days || 0);
      if (req.status === "approved" && !refDebits.has(req.id)) {
        legacyUnledgeredApproved += reqDays;
      } else if (req.status === "pending") {
        pending += reqDays;
      }
    }

    const used = Number((netLedgerUsed + legacyUnledgeredApproved).toFixed(2));
    const pendingRounded = Number(pending.toFixed(2));
    const total = Number(
      Math.max(0, annualEntitlement + carryForward + manualCredits - manualDebits - encashments).toFixed(2)
    );
    const available = Number(Math.max(0, total - used - pendingRounded).toFixed(2));

    return {
      leaveTypeId: lt.id,
      leaveTypeName: lt.name,
      code: lt.code || null,
      color: lt.color || "#3b82f6",
      status: lt.status || "active",
      isPaid: lt.isPaid !== false,
      halfDayAllowed: lt.halfDayAllowed !== false,
      sandwichRule: Boolean(lt.sandwichRule),
      isSynced: hasSyncedAccrual,
      openingBalance: 0,
      annualEntitlement: Number(annualEntitlement.toFixed(2)),
      accrued: Number(annualEntitlement.toFixed(2)),
      carryForward: Number(carryForward.toFixed(2)),
      manualCredits: Number(manualCredits.toFixed(2)),
      manualDebits: Number(manualDebits.toFixed(2)),
      encashments: Number(encashments.toFixed(2)),
      total,
      used,
      pending: pendingRounded,
      available,
    };
  }

  /**
   * Derive authoritative available leave balance from immutable LeaveLedgerEntry + LeaveRequest records.
   */
  static async getEmployeeBalance(
    tenantId: string,
    employeeId: string,
    leaveTypeId: string,
    year?: number,
    options?: { tx?: any; excludeRequestId?: string; ignorePending?: boolean }
  ): Promise<number> {
    const db = options?.tx || rawPrisma;
    const targetYear = year || new Date().getUTCFullYear();
    const startOfYear = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));

    const [leaveType, entries, requests] = await Promise.all([
      db.leaveType.findFirst({
        where: { id: leaveTypeId, tenantId },
      }),
      db.leaveLedgerEntry.findMany({
        where: {
          tenantId,
          employeeId,
          leaveTypeId,
          effectiveAt: { gte: startOfYear, lte: endOfYear },
        },
        select: { entryType: true, days: true, referenceId: true },
      }),
      db.leaveRequest.findMany({
        where: {
          tenantId,
          employeeId,
          leaveTypeId,
          startDate: { gte: startOfYear, lte: endOfYear },
          status: options?.ignorePending ? { in: ["approved"] } : { in: ["pending", "approved"] },
          ...(options?.excludeRequestId ? { id: { not: options.excludeRequestId } } : {}),
        },
        select: { id: true, status: true, days: true },
      }),
    ]);

    if (!leaveType) return 0;
    const summary = this.computeLeaveTypeBalanceSummary(leaveType, entries, requests);
    return summary.available;
  }

  /**
   * Comprehensive single-employee leave balances breakdown across leave types (3 parallel queries).
   */
  static async getEmployeeDetailedBalances(
    tenantId: string,
    employeeId: string,
    year?: number,
    options?: { includeInactiveWithHistory?: boolean }
  ) {
    const targetYear = year || new Date().getUTCFullYear();
    const startOfYear = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));

    const [leaveTypes, ledgerEntries, leaveRequests] = await Promise.all([
      rawPrisma.leaveType.findMany({
        where: options?.includeInactiveWithHistory ? { tenantId } : { tenantId, status: "active" },
        orderBy: [{ status: "asc" }, { name: "asc" }],
      }),
      rawPrisma.leaveLedgerEntry.findMany({
        where: {
          tenantId,
          employeeId,
          effectiveAt: { gte: startOfYear, lte: endOfYear },
        },
        select: { leaveTypeId: true, entryType: true, days: true, referenceId: true },
      }),
      rawPrisma.leaveRequest.findMany({
        where: {
          tenantId,
          employeeId,
          startDate: { gte: startOfYear, lte: endOfYear },
          status: { in: ["pending", "approved"] },
        },
        select: { id: true, leaveTypeId: true, status: true, days: true },
      }),
    ]);

    const entriesByType = new Map<string, any[]>();
    for (const e of ledgerEntries) {
      if (!entriesByType.has(e.leaveTypeId)) entriesByType.set(e.leaveTypeId, []);
      entriesByType.get(e.leaveTypeId)!.push(e);
    }

    const reqsByType = new Map<string, any[]>();
    for (const r of leaveRequests) {
      if (!r.leaveTypeId) continue;
      if (!reqsByType.has(r.leaveTypeId)) reqsByType.set(r.leaveTypeId, []);
      reqsByType.get(r.leaveTypeId)!.push(r);
    }

    return leaveTypes
      .filter((lt) => {
        if (lt.status === "active") return true;
        if (!options?.includeInactiveWithHistory) return false;
        return entriesByType.has(lt.id) || reqsByType.has(lt.id);
      })
      .map((lt) =>
        this.computeLeaveTypeBalanceSummary(
          lt,
          entriesByType.get(lt.id) || [],
          reqsByType.get(lt.id) || []
        )
      );
  }

  /**
   * High-performance bulk balance aggregation for N employees in constant 3 parallel queries (eliminates 3N+2 N+1 storm).
   */
  static async getBulkEmployeeDetailedBalances(
    tenantId: string,
    employees: Array<{
      id: string;
      firstName: string;
      lastName: string;
      employeeCode: string;
      position?: string | null;
      department?: { id?: string; name?: string } | null;
      user?: { profile?: { avatarUrl?: string | null } | null } | null;
    }>,
    year?: number,
    options?: { leaveTypeId?: string }
  ) {
    const targetYear = year || new Date().getUTCFullYear();
    const startOfYear = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
    const employeeIds = employees.map((e) => e.id);

    const leaveTypeWhere: any = { tenantId, status: "active" };
    if (options?.leaveTypeId && options.leaveTypeId !== "all") {
      leaveTypeWhere.id = options.leaveTypeId;
    }

    const [activeLeaveTypes, ledgerEntries, leaveRequests] = await Promise.all([
      rawPrisma.leaveType.findMany({
        where: leaveTypeWhere,
        orderBy: { name: "asc" },
      }),
      employeeIds.length > 0
        ? rawPrisma.leaveLedgerEntry.findMany({
            where: {
              tenantId,
              employeeId: { in: employeeIds },
              effectiveAt: { gte: startOfYear, lte: endOfYear },
              ...(options?.leaveTypeId && options.leaveTypeId !== "all"
                ? { leaveTypeId: options.leaveTypeId }
                : {}),
            },
            select: { employeeId: true, leaveTypeId: true, entryType: true, days: true, referenceId: true },
          })
        : Promise.resolve([]),
      employeeIds.length > 0
        ? rawPrisma.leaveRequest.findMany({
            where: {
              tenantId,
              employeeId: { in: employeeIds },
              startDate: { gte: startOfYear, lte: endOfYear },
              status: { in: ["pending", "approved"] },
              ...(options?.leaveTypeId && options.leaveTypeId !== "all"
                ? { leaveTypeId: options.leaveTypeId }
                : {}),
            },
            select: { id: true, employeeId: true, leaveTypeId: true, status: true, days: true },
          })
        : Promise.resolve([]),
    ]);

    const entriesMap = new Map<string, any[]>();
    for (const e of ledgerEntries) {
      const k = `${e.employeeId}::${e.leaveTypeId}`;
      if (!entriesMap.has(k)) entriesMap.set(k, []);
      entriesMap.get(k)!.push(e);
    }

    const reqsMap = new Map<string, any[]>();
    for (const r of leaveRequests) {
      if (!r.leaveTypeId) continue;
      const k = `${r.employeeId}::${r.leaveTypeId}`;
      if (!reqsMap.has(k)) reqsMap.set(k, []);
      reqsMap.get(k)!.push(r);
    }

    const data = employees.map((emp) => {
      const empBalances = activeLeaveTypes.map((lt) => {
        const k = `${emp.id}::${lt.id}`;
        return this.computeLeaveTypeBalanceSummary(
          lt,
          entriesMap.get(k) || [],
          reqsMap.get(k) || []
        );
      });

      return {
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
        employeeCode: emp.employeeCode,
        position: emp.position || "Team Member",
        department: emp.department?.name || "General",
        departmentId: emp.department?.id || null,
        avatarUrl: emp.user?.profile?.avatarUrl || null,
        balances: empBalances,
      };
    });

    return {
      year: targetYear,
      leaveTypes: activeLeaveTypes,
      data,
    };
  }

  /**
   * Pure date arithmetic calculation for deductible days, weekend exclusions, and intra-range sandwich leave mechanics.
   * Non-working days (weekends/holidays) inside [startDate, endDate] are only counted as sandwich days
   * when `sandwichRule` is enabled AND they are flanked by working leave days before and after.
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

    const rawDays: Array<{ date: string; isWeekend: boolean; isHoliday: boolean; isNonWorking: boolean }> = [];
    const curr = new Date(start);
    while (curr <= end) {
      const dateStr = curr.toISOString().slice(0, 10);
      const dayOfWeek = curr.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDates.has(dateStr);
      rawDays.push({
        date: dateStr,
        isWeekend,
        isHoliday,
        isNonWorking: isWeekend || isHoliday,
      });
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    // Identify first and last working day indices inside [start, end]
    let firstWorkingIdx = -1;
    let lastWorkingIdx = -1;
    for (let i = 0; i < rawDays.length; i++) {
      if (!rawDays[i].isNonWorking) {
        if (firstWorkingIdx === -1) firstWorkingIdx = i;
        lastWorkingIdx = i;
      }
    }

    const breakdown: DayBreakdown[] = [];
    let deductibleDays = 0;
    let weekendDays = 0;
    let holidayDays = 0;
    let sandwichDays = 0;

    for (let i = 0; i < rawDays.length; i++) {
      const d = rawDays[i];
      if (d.isWeekend) weekendDays++;
      if (d.isHoliday) holidayDays++;

      let isDeducted = !d.isNonWorking;
      let reason: string | undefined;

      if (d.isNonWorking) {
        const isFlankedByWorkingLeave =
          !isHalfDay &&
          firstWorkingIdx !== -1 &&
          lastWorkingIdx !== -1 &&
          i > firstWorkingIdx &&
          i < lastWorkingIdx;

        if (sandwichRule && isFlankedByWorkingLeave) {
          isDeducted = true;
          sandwichDays++;
          reason = d.isHoliday ? "Holiday (Sandwich Rule)" : "Weekend (Sandwich Rule)";
        } else {
          isDeducted = false;
          reason = d.isHoliday ? "Holiday" : "Weekend";
        }
      }

      if (isDeducted) {
        deductibleDays += isHalfDay ? 0.5 : 1.0;
      }

      breakdown.push({
        date: d.date,
        isWeekend: d.isWeekend,
        isHoliday: d.isHoliday,
        isDeducted,
        reason,
      });
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
   * Server-authoritative Dry-Run calculation & policy compliance check.
   * Enforces LeaveType active status, LeavePolicy rules (status, effective dates, probation,
   * notice period, min/max days, half-day, blackout dates, sandwich rule), overlaps, and ledger balance.
   */
  static async validateDryRun(options: LeaveDryRunOptions) {
    const { tenantId, employeeId, leaveTypeId } = options;
    const start = new Date(options.startDate);
    const end = new Date(options.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new LeaveHttpError("Valid start date and end date are required.", 400);
    }
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

    if (start > end) {
      throw new LeaveHttpError("Start date must be before or equal to end date.", 400);
    }

    const startIso = start.toISOString().slice(0, 10);
    const endIso = end.toISOString().slice(0, 10);

    // Parallelize core entity + policy + holiday + overlap + employee lookups
    const [leaveType, empRecord, holidays, overlapping] = await Promise.all([
      rawPrisma.leaveType.findFirst({
        where: { id: leaveTypeId, tenantId },
      }),
      rawPrisma.employee.findFirst({
        where: { id: employeeId, tenantId },
        select: {
          id: true,
          branchId: true,
          departmentId: true,
          employmentCategory: true,
          employmentType: true,
          joinedAt: true,
          status: true,
        },
      }),
      rawPrisma.holiday.findMany({
        where: {
          tenantId,
          status: "active",
          date: { gte: start, lte: end },
        },
        select: { date: true, name: true, branchIds: true },
      }),
      rawPrisma.leaveRequest.findFirst({
        where: {
          tenantId,
          employeeId,
          status: { in: ["pending", "approved"] },
          ...(options.excludeRequestId ? { id: { not: options.excludeRequestId } } : {}),
          startDate: { lte: end },
          endDate: { gte: start },
        },
      }),
    ]);

    if (!leaveType) {
      throw new LeaveHttpError("Leave type not found in this organization.", 404);
    }
    if (!empRecord) {
      throw new LeaveHttpError("Employee record not found in this organization.", 404);
    }

    const warnings: string[] = [];

    // 1. Active Leave Type enforcement
    if (leaveType.status !== "active") {
      warnings.push(`Leave type "${leaveType.name}" is inactive and cannot be selected for new leave applications.`);
    }

    // 2. Resolve applicable LeavePolicy & extended rules
    const { policy: effectivePolicy, rules, blockedReason } = await this.resolveEffectivePolicy(
      tenantId,
      leaveTypeId,
      empRecord.branchId,
      empRecord.departmentId,
      start
    );

    if (blockedReason) {
      warnings.push(blockedReason);
    }

    const sandwichRule = Boolean(leaveType.sandwichRule || effectivePolicy?.sandwichRule);
    const halfDayAllowed = Boolean(leaveType.halfDayAllowed && rules.halfDayAllowed);
    const minDays = rules.minDays;
    const maxConsecutiveDays = effectivePolicy?.maxConsecutiveDays ?? 365;
    const noticeDays = effectivePolicy?.noticeDays ?? 0;
    const probationAllowed = effectivePolicy?.probationAllowed ?? true;
    const requiresApproval = effectivePolicy?.requiresApproval ?? true;

    // 3. Half-day validation
    if (options.halfDay) {
      if (!halfDayAllowed) {
        warnings.push(`Half-day leave is not permitted under "${effectivePolicy?.name || leaveType.name}".`);
      }
      if (startIso !== endIso) {
        warnings.push("Half-day leave can only be applied for a single calendar date.");
      }
    }

    // 4. Overlap check
    if (overlapping) {
      warnings.push("An overlapping pending or approved leave application already exists for this period.");
    }

    // 5. Workforce category, contract & probation checks
    if (
      empRecord.employmentCategory === "vendor_outsourced" ||
      empRecord.employmentCategory === "consultant_freelancer"
    ) {
      if (leaveType.isPaid) {
        warnings.push(
          "External contractors and consultants under Accounts Payable cannot apply for statutory paid employee leaves. Please submit invoice adjustments or timesheet notes."
        );
      }
    }

    const [activeContract, activeProbation] = await Promise.all([
      rawPrisma.employeeContract.findFirst({
        where: { tenantId, employeeId, status: "active" },
        orderBy: { startDate: "desc" },
      }),
      !probationAllowed
        ? rawPrisma.probationRecord.findFirst({
            where: {
              tenantId,
              employeeId,
              status: { in: ["active", "in_progress", "extended"] },
              startDate: { lte: start },
              endDate: { gte: start },
            },
          })
        : Promise.resolve(null),
    ]);

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

    if (!probationAllowed && (activeProbation || empRecord.employmentCategory === "probationary")) {
      warnings.push(
        `Employees currently on probation are not eligible for "${effectivePolicy?.name || leaveType.name}".`
      );
    }

    // 6. Notice period check (when noticeDays > 0 and not explicitly bypassed by HR backdate override)
    if (noticeDays > 0 && !options.bypassNoticePeriod) {
      const todayUtc = new Date();
      todayUtc.setUTCHours(0, 0, 0, 0);
      const diffNoticeDays = Math.round((start.getTime() - todayUtc.getTime()) / (1000 * 60 * 60 * 24));
      if (diffNoticeDays < noticeDays) {
        warnings.push(
          `Policy "${effectivePolicy?.name || leaveType.name}" requires at least ${noticeDays} day(s) advance notice (selected start date is ${diffNoticeDays} day(s) from today).`
        );
      }
    }

    // 7. Blackout dates check
    if (rules.blackoutDatesList.length > 0) {
      const hitBlackout = rules.blackoutDatesList.find((bd) => bd >= startIso && bd <= endIso);
      if (hitBlackout) {
        warnings.push(`Selected period includes restricted blackout date (${hitBlackout}).`);
      }
    }

    // 8. Calculate deductible days + intra-range sandwich days
    const holidayDates = new Set(
      holidays
        .filter(
          (h) =>
            !h.branchIds ||
            h.branchIds.length === 0 ||
            (empRecord.branchId && h.branchIds.includes(empRecord.branchId))
        )
        .map((h) => h.date.toISOString().slice(0, 10))
    );

    const calc = this.calculateDeductibleDays(
      start,
      end,
      sandwichRule,
      holidayDates,
      Boolean(options.halfDay)
    );

    let deductibleDays = calc.deductibleDays;
    const weekendCount = calc.weekendDays;
    const holidayCount = calc.holidayDays;
    let totalSandwichDays = calc.sandwichDays;
    const sandwichDatesSet = new Set<string>(
      calc.breakdown.filter((b) => b.isDeducted && (b.isWeekend || b.isHoliday)).map((b) => b.date)
    );

    // 8b. Evaluate cross-request adjacent sandwich bridges (only for full-day leaves when sandwichRule=true)
    if (sandwichRule && !options.halfDay && deductibleDays > 0) {
      try {
        const extSw = await SandwichLeaveService.evaluateEmployeeSandwichLeave(
          tenantId,
          employeeId,
          start,
          end,
          {
            sandwichRuleOverride: true,
            proposedRangeAsLeave: true,
            excludeRequestId: options.excludeRequestId,
          }
        );
        for (const sDate of extSw.sandwichDates) {
          if (!sandwichDatesSet.has(sDate)) {
            sandwichDatesSet.add(sDate);
            // If outside [startIso, endIso], add 1 deductible day for the bridged weekend/holiday
            if (sDate < startIso || sDate > endIso) {
              deductibleDays += 1;
              totalSandwichDays += 1;
            }
          }
        }
      } catch {
        // Non-blocking fallback
      }
    }

    if (deductibleDays <= 0) {
      warnings.push("Selected date range contains 0 working/deductible days (falls entirely on weekends or holidays).");
    } else {
      // 9. Min / Max days per application enforcement
      const effectiveMin = options.halfDay && halfDayAllowed && minDays <= 1 ? 0.5 : minDays;
      if (deductibleDays < effectiveMin) {
        warnings.push(
          `Minimum ${effectiveMin} day(s) per application required under "${effectivePolicy?.name || leaveType.name}" (requested ${deductibleDays} day(s)).`
        );
      }
      if (maxConsecutiveDays > 0 && deductibleDays > maxConsecutiveDays) {
        warnings.push(
          `Maximum ${maxConsecutiveDays} day(s) per application allowed under "${effectivePolicy?.name || leaveType.name}" (requested ${deductibleDays} day(s)).`
        );
      }
    }

    // 10. Live ledger balance check for target year
    const availableBalance = await this.getEmployeeBalance(
      tenantId,
      employeeId,
      leaveTypeId,
      start.getUTCFullYear(),
      { excludeRequestId: options.excludeRequestId }
    );

    if (leaveType.isPaid && availableBalance < deductibleDays) {
      warnings.push(
        `Insufficient leave balance for ${leaveType.name}. Available: ${availableBalance} day(s), Required: ${deductibleDays} day(s).`
      );
    }

    return {
      isValid: warnings.length === 0,
      valid: warnings.length === 0,
      totalDays: deductibleDays,
      computedDays: deductibleDays,
      calculatedDays: deductibleDays,
      weekendCount,
      holidayCount,
      isSandwich: totalSandwichDays > 0,
      sandwichDaysCount: totalSandwichDays,
      sandwichDaysAdded: totalSandwichDays,
      sandwichDates: Array.from(sandwichDatesSet).sort(),
      isPaid: leaveType.isPaid,
      leaveTypeName: leaveType.name,
      availableBalance,
      remainingBalance: Number((availableBalance - deductibleDays).toFixed(2)),
      requiresApproval,
      policySummary: {
        policyId: effectivePolicy?.id || null,
        policyName: effectivePolicy?.name || "Standard Leave Policy",
        minDays,
        maxConsecutiveDays,
        noticeDays,
        probationAllowed,
        halfDayAllowed,
        sandwichRule,
        requiresApproval,
        carryForwardDays: effectivePolicy?.carryForwardDays ?? 0,
      },
      breakdown: calc.breakdown,
      warnings,
      blockingIssues: warnings,
    };
  }

  /**
   * Submit Leave Application with server-side Dry-Run verification.
   * When policy `requiresApproval === false`, auto-approves atomically with ledger DEBIT!
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
    actorId?: string,
    options?: { bypassNoticePeriod?: boolean }
  ) {
    if (!data.reason || !String(data.reason).trim()) {
      throw new LeaveHttpError("Leave reason is required.", 400);
    }

    const dryRun = await this.validateDryRun({
      tenantId,
      employeeId,
      leaveTypeId: data.leaveTypeId,
      startDate: data.startDate,
      endDate: data.endDate,
      halfDay: data.halfDay,
      halfDaySession: data.halfDaySession,
      reason: data.reason,
      bypassNoticePeriod: options?.bypassNoticePeriod,
    });

    if (!dryRun.isValid) {
      throw new LeaveHttpError(`Validation failed: ${dryRun.warnings.join("; ")}`, 400, "LEAVE_POLICY_VIOLATION", {
        warnings: dryRun.warnings,
      });
    }

    const start = new Date(data.startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(data.endDate);
    end.setUTCHours(0, 0, 0, 0);

    const employee = await rawPrisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: { id: true, managerId: true, firstName: true, lastName: true, userId: true },
    });
    if (!employee) {
      throw new LeaveHttpError("Employee not found in this organization.", 404);
    }

    const cleanAttachmentUrl = data.attachmentUrl || data.attachment || null;
    if (cleanAttachmentUrl && String(cleanAttachmentUrl).startsWith("blob:")) {
      throw new LeaveHttpError("Invalid attachment URL: browser blob URLs cannot be persisted.", 400);
    }

    const application = await rawPrisma.$transaction(async (tx) => {
      // Concurrency-safe overlap re-check inside transaction
      const concurrentOverlap = await tx.leaveRequest.findFirst({
        where: {
          tenantId,
          employeeId,
          status: { in: ["pending", "approved"] },
          startDate: { lte: end },
          endDate: { gte: start },
        },
        select: { id: true },
      });
      if (concurrentOverlap) {
        throw new LeaveHttpError(
          "An overlapping leave application already exists for this period.",
          409,
          "DUPLICATE_LEAVE_SUBMISSION"
        );
      }

      const req = await tx.leaveRequest.create({
        data: {
          tenantId,
          employeeId,
          leaveTypeId: data.leaveTypeId,
          approverId: employee.managerId || null,
          startDate: start,
          endDate: end,
          days: dryRun.totalDays,
          status: "pending",
          reason: String(data.reason).trim(),
          halfDay: Boolean(data.halfDay),
          halfDaySession: data.halfDay ? data.halfDaySession || "first_half" : null,
          attachmentUrl: cleanAttachmentUrl,
        },
        include: { leaveType: true, employee: true },
      });

      await OutboxService.createEvent(
        {
          tenantId,
          eventType: "leave.requested",
          entityType: "LeaveRequest",
          entityId: req.id,
          actorId: actorId || employee.userId || employeeId,
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

    // If policy explicitly states requiresApproval = false, auto-approve through authoritative ledger flow
    if (dryRun.requiresApproval === false) {
      return await this.decideApplication(
        tenantId,
        application.id,
        "approve",
        "SYSTEM_POLICY_AUTO_APPROVAL",
        "Auto-approved per organization leave policy (Approval Not Required)",
        ["hr_admin"]
      );
    }

    if (employee.managerId) {
      rawPrisma.employee
        .findUnique({ where: { id: employee.managerId }, select: { userId: true } })
        .then((mgr) => {
          if (mgr?.userId) {
            return NotificationService.createNotification({
              tenantId,
              userId: mgr.userId,
              title: "New Leave Application",
              message: `${employee.firstName} ${employee.lastName} submitted a leave application for ${dryRun.totalDays} day(s).`,
              type: "LEAVE_REQUESTED",
              actionUrl: "/hr/leave/applications",
            });
          }
        })
        .catch(() => {});
    }

    broadcastToTenant(tenantId, "leave.requested", {
      id: application.id,
      employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
      days: dryRun.totalDays,
    });

    return application;
  }

  /**
   * Update an eligible PENDING leave application with full policy & balance re-validation.
   */
  static async updatePendingApplication(
    tenantId: string,
    requestId: string,
    data: {
      leaveTypeId?: string;
      startDate?: string;
      endDate?: string;
      halfDay?: boolean;
      halfDaySession?: string | null;
      reason?: string;
      attachmentUrl?: string | null;
    },
    actorId: string,
    options?: { callerEmployeeId?: string; isElevatedHR?: boolean }
  ) {
    const existing = await rawPrisma.leaveRequest.findFirst({
      where: { id: requestId, tenantId },
      include: { employee: true, leaveType: true },
    });

    if (!existing) {
      throw new LeaveHttpError("Leave application not found.", 404);
    }

    if (!options?.isElevatedHR && options?.callerEmployeeId !== existing.employeeId) {
      throw new LeaveHttpError("Forbidden: You may only edit your own pending leave applications.", 403);
    }

    if (existing.status !== "pending") {
      throw new LeaveHttpError(
        `Only pending leave applications can be edited (current status: ${existing.status}).`,
        400
      );
    }

    const nextLeaveTypeId = data.leaveTypeId || existing.leaveTypeId;
    if (!nextLeaveTypeId) {
      throw new LeaveHttpError("Leave type is required.", 400);
    }

    const nextStartStr = data.startDate || existing.startDate.toISOString().slice(0, 10);
    const nextEndStr = data.endDate || existing.endDate.toISOString().slice(0, 10);
    const nextHalfDay = data.halfDay !== undefined ? Boolean(data.halfDay) : existing.halfDay;
    const nextSession = nextHalfDay
      ? data.halfDaySession || existing.halfDaySession || "first_half"
      : null;
    const nextReason = data.reason !== undefined ? String(data.reason).trim() : existing.reason || "";

    if (!nextReason) {
      throw new LeaveHttpError("Leave reason is required.", 400);
    }

    const dryRun = await this.validateDryRun({
      tenantId,
      employeeId: existing.employeeId,
      leaveTypeId: nextLeaveTypeId,
      startDate: nextStartStr,
      endDate: nextEndStr,
      halfDay: nextHalfDay,
      halfDaySession: nextSession || undefined,
      reason: nextReason,
      excludeRequestId: requestId,
      bypassNoticePeriod: Boolean(options?.isElevatedHR),
    });

    if (!dryRun.isValid) {
      throw new LeaveHttpError(`Validation failed: ${dryRun.warnings.join("; ")}`, 400, "LEAVE_POLICY_VIOLATION", {
        warnings: dryRun.warnings,
      });
    }

    const start = new Date(nextStartStr);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(nextEndStr);
    end.setUTCHours(0, 0, 0, 0);

    const nextAttachmentUrl =
      data.attachmentUrl !== undefined ? data.attachmentUrl : existing.attachmentUrl;
    if (nextAttachmentUrl && String(nextAttachmentUrl).startsWith("blob:")) {
      throw new LeaveHttpError("Invalid attachment URL: browser blob URLs cannot be persisted.", 400);
    }

    const updated = await rawPrisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        leaveTypeId: nextLeaveTypeId,
        startDate: start,
        endDate: end,
        days: dryRun.totalDays,
        halfDay: nextHalfDay,
        halfDaySession: nextSession,
        reason: nextReason,
        attachmentUrl: nextAttachmentUrl || null,
      },
      include: { leaveType: true, employee: true },
    });

    AuditService.logMutation({
      tenantId,
      actorId,
      action: "LEAVE_APPLICATION_UPDATED",
      entityType: "LeaveRequest",
      entityId: requestId,
      oldState: {
        leaveTypeId: existing.leaveTypeId,
        startDate: existing.startDate,
        endDate: existing.endDate,
        days: Number(existing.days),
        reason: existing.reason,
      },
      newState: {
        leaveTypeId: updated.leaveTypeId,
        startDate: updated.startDate,
        endDate: updated.endDate,
        days: Number(updated.days),
        reason: updated.reason,
      },
    }).catch(() => {});

    return updated;
  }

  /**
   * Enforces reviewer authorization: elevated HR/Admin OR direct reporting manager OR active delegate.
   * Strictly forbids self-approval.
   */
  static async assertReviewerAuthorized(
    tenantId: string,
    reviewerUserId: string,
    reviewerRoles: string[] | undefined,
    targetEmployee: { id: string; userId?: string | null; managerId?: string | null }
  ) {
    if (reviewerUserId === "SYSTEM_POLICY_AUTO_APPROVAL") return;

    if (targetEmployee.userId && targetEmployee.userId === reviewerUserId) {
      throw new LeaveHttpError(
        "Segregation of duties violation: Employees cannot approve or reject their own leave applications.",
        403,
        "SELF_APPROVAL_FORBIDDEN"
      );
    }

    if (this.isElevatedHrUser(reviewerRoles)) {
      return;
    }

    const reviewerEmp = await rawPrisma.employee.findFirst({
      where: { tenantId, userId: reviewerUserId },
      select: { id: true },
    });

    if (!reviewerEmp) {
      throw new LeaveHttpError(
        "Forbidden: Only HR administrators or the employee's reporting manager can approve or reject this leave request.",
        403,
        "UNAUTHORIZED_APPROVER"
      );
    }

    if (targetEmployee.managerId && targetEmployee.managerId === reviewerEmp.id) {
      return;
    }

    // Check active ApprovalDelegation
    if (targetEmployee.managerId) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const delegation = await rawPrisma.approvalDelegation.findFirst({
        where: {
          tenantId,
          managerId: targetEmployee.managerId,
          delegateId: reviewerEmp.id,
          status: "ACTIVE",
          startDate: { lte: today },
          endDate: { gte: today },
        },
      });
      if (delegation) return;
    }

    throw new LeaveHttpError(
      "Forbidden: You are not the assigned reporting manager or authorized HR approver for this employee.",
      403,
      "UNAUTHORIZED_APPROVER"
    );
  }

  /**
   * Asserts AttendanceMonthLock is unlocked for distinct (year, month) pairs spanned by [startDate, endDate].
   */
  private static async assertDateSpanUnlocked(tenantId: string, startDate: Date, endDate: Date) {
    const checked = new Set<string>();
    const curr = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
    const endMonth = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
    while (curr <= endMonth) {
      const key = `${curr.getUTCFullYear()}-${curr.getUTCMonth() + 1}`;
      if (!checked.has(key)) {
        checked.add(key);
        await AttendanceService.assertMonthUnlocked(tenantId, curr);
      }
      curr.setUTCMonth(curr.getUTCMonth() + 1);
    }
  }

  /**
   * Authoritative Leave Approval / Rejection with concurrency guard and exact single ledger DEBIT.
   */
  static async decideApplication(
    tenantId: string,
    requestId: string,
    action: "approve" | "reject",
    reviewerId: string,
    comments?: string,
    reviewerRoles?: string[]
  ) {
    const request = await rawPrisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { leaveType: true, employee: true },
    });

    if (!request || request.tenantId !== tenantId) {
      throw new LeaveHttpError("Leave request not found.", 404);
    }

    if (request.status !== "pending") {
      throw new LeaveHttpError(`Request is already ${request.status}.`, 409, "INVALID_LEAVE_STATE");
    }

    // Resolve reviewer roles if not passed by caller
    let effectiveRoles = reviewerRoles;
    if (!effectiveRoles && reviewerId !== "SYSTEM_POLICY_AUTO_APPROVAL") {
      const userRec = await rawPrisma.user.findUnique({
        where: { id: reviewerId },
        include: { roles: true },
      });
      effectiveRoles = userRec?.roles?.map((r: any) => r.role) || [];
    }

    await this.assertReviewerAuthorized(tenantId, reviewerId, effectiveRoles, request.employee);

    if (action === "reject") {
      const updated = await rawPrisma.$transaction(async (tx) => {
        const claimed = await tx.leaveRequest.updateMany({
          where: { id: requestId, tenantId, status: "pending" },
          data: {
            status: "rejected",
            approverId: reviewerId === "SYSTEM_POLICY_AUTO_APPROVAL" ? null : reviewerId,
            rejectionReason: comments || "Rejected by reviewer",
            approvedAt: new Date(),
          },
        });
        if (claimed.count === 0) {
          throw new LeaveHttpError("Leave request was already processed by another reviewer.", 409);
        }

        const req = await tx.leaveRequest.findUnique({
          where: { id: requestId },
          include: { leaveType: true, employee: true },
        });

        await OutboxService.createEvent(
          {
            tenantId,
            eventType: "leave.rejected",
            entityType: "LeaveRequest",
            entityId: requestId,
            actorId: reviewerId,
            payload: { employeeId: request.employeeId, comments },
          },
          tx
        );

        return req!;
      });

      if (request.employee?.userId) {
        NotificationService.createNotification({
          tenantId,
          userId: request.employee.userId,
          title: "Leave Application Rejected",
          message: `Your leave request for ${request.days} day(s) was rejected. ${comments ? `Reason: ${comments}` : ""}`,
          type: "LEAVE_REJECTED",
          actionUrl: "/me/leave/applications",
        }).catch(() => {});
      }

      broadcastToTenant(tenantId, "leave.rejected", { id: requestId, employeeId: request.employeeId });

      AuditService.logMutation({
        tenantId,
        actorId: reviewerId === "SYSTEM_POLICY_AUTO_APPROVAL" ? null : reviewerId,
        action: "LEAVE_APPLICATION_REJECTED",
        entityType: "LeaveRequest",
        entityId: requestId,
        metadata: { comments, employeeId: request.employeeId, days: Number(request.days) },
      }).catch(() => {});

      return updated;
    }

    // APPROVE ACTION
    await this.assertDateSpanUnlocked(tenantId, request.startDate, request.endDate);

    const [{ policy: effectivePolicy }, holidays] = await Promise.all([
      request.leaveTypeId
        ? this.resolveEffectivePolicy(
            tenantId,
            request.leaveTypeId,
            request.employee.branchId,
            request.employee.departmentId,
            request.startDate
          )
        : Promise.resolve({ policy: null }),
      rawPrisma.holiday.findMany({
        where: {
          tenantId,
          status: "active",
          date: { gte: request.startDate, lte: request.endDate },
        },
        select: { date: true },
      }),
    ]);

    const sandwichRule = Boolean(request.leaveType?.sandwichRule || effectivePolicy?.sandwichRule);
    const holidayDates = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));
    const end = new Date(request.endDate);
    end.setUTCHours(0, 0, 0, 0);

    const approved = await rawPrisma.$transaction(async (tx) => {
      // Verify balance before approving paid leave
      if (request.leaveTypeId && request.leaveType?.isPaid !== false) {
        const availableBefore = await this.getEmployeeBalance(
          tenantId,
          request.employeeId,
          request.leaveTypeId,
          request.startDate.getUTCFullYear(),
          { tx, excludeRequestId: requestId }
        );
        if (availableBefore < Number(request.days)) {
          throw new LeaveHttpError(
            `Cannot approve leave: employee only has ${availableBefore} day(s) available, but request requires ${Number(request.days)} day(s).`,
            400,
            "INSUFFICIENT_LEAVE_BALANCE"
          );
        }
      }

      // Atomic status claim (prevents double-approval race conditions!)
      const claimed = await tx.leaveRequest.updateMany({
        where: { id: requestId, tenantId, status: "pending" },
        data: {
          status: "approved",
          approverId: reviewerId === "SYSTEM_POLICY_AUTO_APPROVAL" ? null : reviewerId,
          approvedAt: new Date(),
          ...(comments ? { rejectionReason: comments } : {}),
        },
      });
      if (claimed.count === 0) {
        throw new LeaveHttpError("Leave request was already processed by another reviewer.", 409);
      }

      // Write exactly ONE immutable ledger entry (DEBIT)
      if (request.leaveTypeId) {
        const existingDebit = await tx.leaveLedgerEntry.findFirst({
          where: { tenantId, referenceId: requestId, entryType: "DEBIT" },
          select: { id: true },
        });

        if (!existingDebit) {
          // Compute balance BEFORE this debit (excluding this request which is now approved & has no debit yet -> wait: excludeRequestId excludes it from legacyUnledgeredApproved too!)
          const balanceBeforeDebit = await this.getEmployeeBalance(
            tenantId,
            request.employeeId,
            request.leaveTypeId,
            request.startDate.getUTCFullYear(),
            { tx, excludeRequestId: requestId }
          );
          const runningBalanceAfter = Number(Math.max(0, balanceBeforeDebit - Number(request.days)).toFixed(2));

          await tx.leaveLedgerEntry.create({
            data: {
              tenantId,
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              entryType: "DEBIT",
              days: request.days,
              balance: runningBalanceAfter,
              referenceId: requestId,
              notes: comments
                ? `Approved leave #${requestId.slice(0, 8)} (${comments})`.slice(0, 250)
                : `Approved leave application #${requestId.slice(0, 8)}`,
              effectiveAt: request.startDate,
            },
          });
        }
      }

      // Sync Attendance records for deductible leave days
      const calc = this.calculateDeductibleDays(
        request.startDate,
        end,
        sandwichRule,
        holidayDates,
        request.halfDay
      );

      for (const dayItem of calc.breakdown) {
        if (!dayItem.isDeducted) continue;
        const dayDate = new Date(`${dayItem.date}T00:00:00.000Z`);
        const attStatus = request.halfDay ? "half_day" : "on_leave";
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
            status: attStatus as any,
            notes: `Approved Leave: ${request.leaveType?.name || "Leave"}`,
            source: "LEAVE_APPROVAL",
          },
          update: {
            status: attStatus as any,
            notes: `Approved Leave: ${request.leaveType?.name || "Leave"}`,
          },
        });
      }

      const req = await tx.leaveRequest.findUnique({
        where: { id: requestId },
        include: { leaveType: true, employee: true },
      });

      await OutboxService.createEvent(
        {
          tenantId,
          eventType: "leave.approved",
          entityType: "LeaveRequest",
          entityId: requestId,
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
          entityId: requestId,
          actorId: reviewerId,
          payload: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
          },
        },
        tx
      );

      return req!;
    });

    if (request.employee?.userId) {
      NotificationService.createNotification({
        tenantId,
        userId: request.employee.userId,
        title: "Leave Application Approved",
        message: `Your ${request.leaveType?.name || "leave"} request for ${request.days} day(s) has been approved.`,
        type: "LEAVE_APPROVED",
        actionUrl: "/me/leave/applications",
      }).catch(() => {});
    }

    broadcastToTenant(tenantId, "leave.approved", {
      id: requestId,
      employeeId: request.employeeId,
      days: request.days,
    });

    AuditService.logMutation({
      tenantId,
      actorId: reviewerId === "SYSTEM_POLICY_AUTO_APPROVAL" ? null : reviewerId,
      action: "LEAVE_APPLICATION_APPROVED",
      entityType: "LeaveRequest",
      entityId: requestId,
      metadata: { comments, employeeId: request.employeeId, days: Number(request.days) },
    }).catch(() => {});

    return approved;
  }

  /**
   * Cancel an approved or pending leave application with non-destructive compensating CREDIT ledger entry.
   */
  static async cancelApplication(
    tenantId: string,
    requestId: string,
    actorId: string,
    reason?: string,
    options?: { actionLabel?: string }
  ) {
    const request = await rawPrisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { leaveType: true, employee: true },
    });

    if (!request || request.tenantId !== tenantId) {
      throw new LeaveHttpError("Leave request not found.", 404);
    }

    if (request.status === "cancelled" || request.status === "rejected") {
      throw new LeaveHttpError(`Cannot cancel a request with status ${request.status}.`, 400);
    }

    if (request.status === "approved") {
      await this.assertDateSpanUnlocked(tenantId, request.startDate, request.endDate);
    }

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
      const claimed = await tx.leaveRequest.updateMany({
        where: { id: requestId, tenantId, status: { in: ["pending", "approved"] } },
        data: {
          status: "cancelled",
          ...(reason ? { rejectionReason: reason } : {}),
        },
      });
      if (claimed.count === 0) {
        throw new LeaveHttpError("Leave request was already cancelled.", 409);
      }

      // If it was approved, create a single compensating CREDIT entry (strictly idempotent)
      if (request.status === "approved" && request.leaveTypeId) {
        const existingCredit = await tx.leaveLedgerEntry.findFirst({
          where: { tenantId, referenceId: requestId, entryType: "CREDIT" },
          select: { id: true },
        });

        if (!existingCredit) {
          // Ensure a DEBIT existed or create compensating CREDIT that restores exact post-reversal balance
          const existingDebit = await tx.leaveLedgerEntry.findFirst({
            where: { tenantId, referenceId: requestId, entryType: "DEBIT" },
            select: { id: true },
          });

          // If legacy approved request had no DEBIT, write the historical DEBIT first or compute restored balance cleanly
          if (!existingDebit) {
            const balNow = await this.getEmployeeBalance(
              tenantId,
              request.employeeId,
              request.leaveTypeId,
              request.startDate.getUTCFullYear(),
              { tx }
            );
            await tx.leaveLedgerEntry.create({
              data: {
                tenantId,
                employeeId: request.employeeId,
                leaveTypeId: request.leaveTypeId,
                entryType: "DEBIT",
                days: request.days,
                balance: Math.max(0, Number((balNow - Number(request.days)).toFixed(2))),
                referenceId: requestId,
                notes: `Historical approval debit for #${requestId.slice(0, 8)}`,
                effectiveAt: request.startDate,
              },
            });
          }

          const balanceBeforeCredit = await this.getEmployeeBalance(
            tenantId,
            request.employeeId,
            request.leaveTypeId,
            request.startDate.getUTCFullYear(),
            { tx }
          );
          const restoredBalance = Number((balanceBeforeCredit + Number(request.days)).toFixed(2));

          await tx.leaveLedgerEntry.create({
            data: {
              tenantId,
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              entryType: "CREDIT",
              days: request.days,
              balance: restoredBalance,
              referenceId: requestId,
              notes: `Compensating reversal for ${options?.actionLabel || "cancelled"} leave #${requestId.slice(0, 8)}. Reason: ${reason || "Cancelled"}`.slice(
                0,
                250
              ),
              effectiveAt: request.startDate,
            },
          });
        }

        // Revert attendance records for affected dates
        const existingAtts = await tx.attendance.findMany({
          where: {
            tenantId,
            employeeId: request.employeeId,
            date: { gte: request.startDate, lte: request.endDate },
            status: { in: ["on_leave", "half_day"] as any },
          },
        });

        for (const existingAtt of existingAtts) {
          const dayDate = new Date(existingAtt.date);
          dayDate.setUTCHours(0, 0, 0, 0);
          const dateStr = dayDate.toISOString().slice(0, 10);
          const dayOfWeek = dayDate.getUTCDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isHoliday = holidayMap.has(dateStr);

          if (isHoliday || isWeekend || (dayDate >= today && existingAtt.source === "LEAVE_APPROVAL")) {
            await tx.attendance.delete({ where: { id: existingAtt.id } });
          } else if (existingAtt.source === "LEAVE_APPROVAL" && !existingAtt.checkIn) {
            await tx.attendance.delete({ where: { id: existingAtt.id } });
          } else {
            const revertedStatus: "present" | "absent" = existingAtt.checkIn ? "present" : "absent";
            await tx.attendance.update({
              where: { id: existingAtt.id },
              data: {
                status: revertedStatus,
                notes: `Leave ${options?.actionLabel || "cancelled"}. Prior status restored: ${revertedStatus}`,
              },
            });
          }
        }
      }

      const req = await tx.leaveRequest.findUnique({
        where: { id: requestId },
        include: { leaveType: true, employee: true },
      });

      await OutboxService.createEvent(
        {
          tenantId,
          eventType: "leave.cancelled",
          entityType: "LeaveRequest",
          entityId: requestId,
          actorId,
          payload: { employeeId: request.employeeId, reason },
        },
        tx
      );

      return req!;
    });

    AuditService.logMutation({
      tenantId,
      actorId,
      action:
        options?.actionLabel === "reversed"
          ? "LEAVE_APPLICATION_REVERSED"
          : "LEAVE_APPLICATION_CANCELLED",
      entityType: "LeaveRequest",
      entityId: requestId,
      metadata: { reason, employeeId: request.employeeId, days: Number(request.days) },
    }).catch(() => {});

    broadcastToTenant(tenantId, "leave.cancelled", { id: requestId, employeeId: request.employeeId });
    return cancelled;
  }

  /**
   * Authorized HR Reversal of a finalized (`approved` or `rejected`) leave request.
   * - If `approved`: cancels with compensating CREDIT ledger entry and restores attendance.
   * - If `rejected`: re-opens as `pending` for fresh review (preserving full audit trail).
   */
  static async reverseApplication(
    tenantId: string,
    requestId: string,
    actorId: string,
    reason: string,
    actorRoles?: string[]
  ) {
    if (!reason || !String(reason).trim()) {
      throw new LeaveHttpError("A reason is mandatory when reversing a leave decision.", 400);
    }

    const request = await rawPrisma.leaveRequest.findFirst({
      where: { id: requestId, tenantId },
      include: { employee: true, leaveType: true },
    });

    if (!request) {
      throw new LeaveHttpError("Leave request not found.", 404);
    }

    await this.assertReviewerAuthorized(tenantId, actorId, actorRoles, request.employee);

    if (request.status === "approved") {
      return await this.cancelApplication(tenantId, requestId, actorId, reason.trim(), {
        actionLabel: "reversed",
      });
    }

    if (request.status === "rejected") {
      const reopened = await rawPrisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: "pending",
          rejectionReason: `Decision reversed: ${reason.trim()}`,
          approvedAt: null,
        },
        include: { employee: true, leaveType: true },
      });

      AuditService.logMutation({
        tenantId,
        actorId,
        action: "LEAVE_REJECTION_REVERSED",
        entityType: "LeaveRequest",
        entityId: requestId,
        metadata: { reason: reason.trim(), employeeId: request.employeeId },
      }).catch(() => {});

      return reopened;
    }

    throw new LeaveHttpError(
      `Only approved or rejected leave applications can be reversed (current status: ${request.status}).`,
      400
    );
  }

  /**
   * Atomic, concurrency-safe manual CREDIT / DEBIT adjustment with mandatory reason and actor audit log.
   */
  static async adjustBalance(
    tenantId: string,
    params: {
      employeeId: string;
      leaveTypeId: string;
      entryType: "CREDIT" | "DEBIT";
      days: number;
      notes: string;
      year?: number;
      actorUserId: string;
      actorEmail?: string | null;
    }
  ) {
    const { employeeId, leaveTypeId, entryType, notes, actorUserId, actorEmail } = params;
    const numDays = Number(params.days);

    if (!employeeId || !leaveTypeId) {
      throw new LeaveHttpError("employeeId and leaveTypeId are required.", 400);
    }
    if (!["CREDIT", "DEBIT"].includes(entryType)) {
      throw new LeaveHttpError("entryType must be 'CREDIT' or 'DEBIT'.", 400);
    }
    if (Number.isNaN(numDays) || numDays <= 0) {
      throw new LeaveHttpError("Adjustment days must be a positive number greater than 0.", 400);
    }
    if (!notes || !String(notes).trim()) {
      throw new LeaveHttpError("A reason/note is mandatory for manual leave balance adjustments.", 400);
    }

    const [emp, lt] = await Promise.all([
      rawPrisma.employee.findFirst({ where: { id: employeeId, tenantId }, select: { id: true } }),
      rawPrisma.leaveType.findFirst({ where: { id: leaveTypeId, tenantId }, select: { id: true, name: true } }),
    ]);
    if (!emp) throw new LeaveHttpError("Employee not found in this organization.", 404);
    if (!lt) throw new LeaveHttpError("Leave type not found in this organization.", 404);

    const now = new Date();
    const targetYear = params.year || now.getUTCFullYear();
    const effectiveAt =
      targetYear === now.getUTCFullYear()
        ? now
        : new Date(Date.UTC(targetYear, 0, 15, 12, 0, 0));

    return await rawPrisma.$transaction(async (tx) => {
      // Lock the employee row in transaction to serialize concurrent balance adjustments!
      await tx.$queryRaw`SELECT id FROM employees WHERE id = ${employeeId} AND tenant_id = ${tenantId} FOR UPDATE`;

      const currentBal = await this.getEmployeeBalance(tenantId, employeeId, leaveTypeId, targetYear, { tx });
      if (entryType === "DEBIT" && numDays > currentBal) {
        throw new LeaveHttpError(
          `Cannot debit ${numDays} day(s): current available balance for ${lt.name} is ${currentBal} day(s).`,
          400,
          "INSUFFICIENT_BALANCE_FOR_DEBIT"
        );
      }

      const newBal =
        entryType === "CREDIT"
          ? Number((currentBal + numDays).toFixed(2))
          : Number(Math.max(0, currentBal - numDays).toFixed(2));

      const rec = await tx.leaveLedgerEntry.create({
        data: {
          tenantId,
          employeeId,
          leaveTypeId,
          entryType,
          days: numDays,
          balance: newBal,
          notes: String(notes).trim().slice(0, 255),
          effectiveAt,
        },
      });

      await AuditService.logMutation(
        {
          tenantId,
          actorId: actorUserId,
          actorEmail: actorEmail || null,
          action: "LEAVE_BALANCE_MANUAL_ADJUSTMENT",
          entityType: "LeaveLedgerEntry",
          entityId: rec.id,
          newState: {
            employeeId,
            leaveTypeId,
            leaveTypeName: lt.name,
            entryType,
            days: numDays,
            previousBalance: currentBal,
            newBalance: newBal,
            year: targetYear,
            reason: String(notes).trim(),
          },
        },
        tx
      );

      return rec;
    });
  }

  /**
   * Year-aware, idempotent Balance Synchronization for active employees and active leave types.
   * Checks ONLY `entryType = "ACCRUAL"` within `targetYear` so:
   * - Manual CREDIT/DEBIT adjustments never block initial entitlement sync
   * - Re-syncing never overwrites or duplicates allocations
   * - Unpaid 0-day leave types preserve `0` (never coerced to `12`!)
   */
  static async syncTenantBalances(
    tenantId: string,
    actorUserId?: string,
    year?: number,
    targetEmployeeId?: string
  ) {
    const targetYear = year || new Date().getUTCFullYear();
    const startOfYear = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
    const accrualEffectiveDate =
      targetYear === new Date().getUTCFullYear()
        ? new Date()
        : new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));

    const empWhere: any = { tenantId, status: "active" };
    if (targetEmployeeId && targetEmployeeId !== "all") {
      empWhere.id = targetEmployeeId;
    }

    const [employees, leaveTypes, existingAccruals, existingYearAdjustments] = await Promise.all([
      rawPrisma.employee.findMany({
        where: empWhere,
        select: { id: true, firstName: true, lastName: true, employeeCode: true, employmentCategory: true },
      }),
      rawPrisma.leaveType.findMany({
        where: { tenantId, status: "active" },
      }),
      rawPrisma.leaveLedgerEntry.findMany({
        where: {
          tenantId,
          entryType: "ACCRUAL",
          effectiveAt: { gte: startOfYear, lte: endOfYear },
          ...(targetEmployeeId && targetEmployeeId !== "all" ? { employeeId: targetEmployeeId } : {}),
        },
        select: { employeeId: true, leaveTypeId: true },
      }),
      rawPrisma.leaveLedgerEntry.findMany({
        where: {
          tenantId,
          entryType: { not: "ACCRUAL" },
          effectiveAt: { gte: startOfYear, lte: endOfYear },
          ...(targetEmployeeId && targetEmployeeId !== "all" ? { employeeId: targetEmployeeId } : {}),
        },
        select: { employeeId: true, leaveTypeId: true, entryType: true, days: true, referenceId: true },
      }),
    ]);

    const existingAccrualSet = new Set(existingAccruals.map((e) => `${e.employeeId}::${e.leaveTypeId}`));
    const netDeltaMap = new Map<string, number>();
    for (const adj of existingYearAdjustments) {
      const k = `${adj.employeeId}::${adj.leaveTypeId}`;
      const d = Number(adj.days || 0);
      const cur = netDeltaMap.get(k) || 0;
      if (adj.entryType === "CREDIT" || adj.entryType === "CARRY_FORWARD") {
        netDeltaMap.set(k, cur + d);
      } else if (adj.entryType === "DEBIT" || adj.entryType === "ENCASHMENT") {
        netDeltaMap.set(k, cur - d);
      }
    }

    const entriesToCreate: any[] = [];
    for (const emp of employees) {
      // Skip external AP contractors for paid leave accruals
      const isExternalContractor =
        emp.employmentCategory === "vendor_outsourced" ||
        emp.employmentCategory === "consultant_freelancer";

      for (const lt of leaveTypes) {
        if (isExternalContractor && lt.isPaid) continue;
        const key = `${emp.id}::${lt.id}`;
        if (!existingAccrualSet.has(key)) {
          const quota = lt.daysPerYear !== undefined && lt.daysPerYear !== null ? Number(lt.daysPerYear) : 0;
          const priorDelta = netDeltaMap.get(key) || 0;
          entriesToCreate.push({
            tenantId,
            employeeId: emp.id,
            leaveTypeId: lt.id,
            entryType: "ACCRUAL",
            days: quota,
            balance: Math.max(0, Number((quota + priorDelta).toFixed(2))),
            notes: `${targetYear} annual entitlement sync for ${lt.name}`,
            effectiveAt: accrualEffectiveDate,
          });
          existingAccrualSet.add(key);
        }
      }
    }

    if (entriesToCreate.length > 0) {
      await rawPrisma.$transaction(async (tx) => {
        await tx.leaveLedgerEntry.createMany({
          data: entriesToCreate,
        });
      });
    }

    const createdEntriesCount = entriesToCreate.length;

    if (actorUserId) {
      AuditService.logMutation({
        tenantId,
        actorId: actorUserId,
        action: "LEAVE_BALANCES_SYNCHRONIZED",
        entityType: "LeaveLedgerEntry",
        entityId: tenantId,
        newState: {
          year: targetYear,
          employeesCount: employees.length,
          createdEntriesCount,
        },
      }).catch(() => {});
    }

    return {
      success: true,
      year: targetYear,
      employeesCount: employees.length,
      createdEntriesCount,
      message:
        createdEntriesCount > 0
          ? `Synchronized ${targetYear} balances for ${employees.length} employee(s) (${createdEntriesCount} new ledger allocation(s) recorded).`
          : `All ${targetYear} leave entitlements are already synchronized (${employees.length} employee(s) verified, 0 duplicate allocations created).`,
    };
  }

  /**
   * Retrieve immutable leave ledger history for an employee, enriched with LeaveType and Actor metadata.
   */
  static async getEmployeeLedger(tenantId: string, employeeId: string, year?: number) {
    const where: any = { tenantId, employeeId };
    if (year) {
      where.effectiveAt = {
        gte: new Date(Date.UTC(year, 0, 1, 0, 0, 0)),
        lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
      };
    }

    const [entries, leaveTypes, employee] = await Promise.all([
      rawPrisma.leaveLedgerEntry.findMany({
        where,
        orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
      }),
      rawPrisma.leaveType.findMany({ where: { tenantId } }),
      rawPrisma.employee.findFirst({
        where: { id: employeeId, tenantId },
        select: { id: true, firstName: true, lastName: true, employeeCode: true },
      }),
    ]);

    const typeMap = new Map(leaveTypes.map((t) => [t.id, t]));
    const entryIds = entries.map((e) => e.id);
    const refIds = entries.map((e) => e.referenceId).filter((r): r is string => Boolean(r));
    const lookupEntityIds = Array.from(new Set([...entryIds, ...refIds]));

    const auditLogs =
      lookupEntityIds.length > 0
        ? await rawPrisma.auditLog.findMany({
            where: {
              tenantId,
              entityId: { in: lookupEntityIds },
            },
            orderBy: { createdAt: "desc" },
            select: { entityId: true, actorId: true, actorEmail: true, action: true },
          })
        : [];

    const actorIds = Array.from(
      new Set(auditLogs.map((a) => a.actorId).filter((x): x is string => Boolean(x)))
    );
    const actorUsers =
      actorIds.length > 0
        ? await rawPrisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, email: true, profile: { select: { fullName: true } } },
          })
        : [];
    const userMap = new Map(
      actorUsers.map((u) => [u.id, u.profile?.fullName || u.email || "Authorized HR"])
    );

    const auditByEntity = new Map<string, { actorName: string; actorId: string | null }>();
    for (const log of auditLogs) {
      if (!auditByEntity.has(log.entityId)) {
        const actorName =
          (log.actorId && userMap.get(log.actorId)) ||
          log.actorEmail ||
          (log.action === "LEAVE_BALANCES_SYNCHRONIZED" ? "HR Entitlement Sync" : "System");
        auditByEntity.set(log.entityId, { actorName, actorId: log.actorId });
      }
    }

    return entries.map((e) => {
      const auditInfo =
        auditByEntity.get(e.id) || (e.referenceId ? auditByEntity.get(e.referenceId) : undefined);
      const actorName =
        auditInfo?.actorName ||
        (e.entryType === "ACCRUAL" ? "System / HR Sync" : "HR / Workflow Engine");

      return {
        ...e,
        days: Number(e.days),
        balance: Number(e.balance),
        reason: e.notes || "",
        actorName,
        actorId: auditInfo?.actorId || null,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}`.trim() : null,
        employeeCode: employee?.employeeCode || null,
        leaveType: typeMap.get(e.leaveTypeId) || null,
      };
    });
  }

  /**
   * Returns all active Leave Types + resolved applicable Leave Policies + live balances + eligibility flags
   * for an authenticated Employee Self-Service caller in minimal parallel queries.
   */
  static async getEligibleEmployeeLeaveCatalog(tenantId: string, employeeId: string, year?: number) {
    const targetYear = year || new Date().getUTCFullYear();
    const refDate = new Date();
    refDate.setUTCHours(0, 0, 0, 0);

    const [employee, activeTypes, allPolicies, detailedBalances, activeProbation] = await Promise.all([
      rawPrisma.employee.findFirst({
        where: { id: employeeId, tenantId },
        include: { branch: true, department: true },
      }),
      rawPrisma.leaveType.findMany({
        where: { tenantId, status: "active" },
        orderBy: { name: "asc" },
      }),
      rawPrisma.leavePolicy.findMany({
        where: { tenantId, status: "active" },
        include: { leaveType: true },
        orderBy: [{ isDefault: "asc" }, { updatedAt: "desc" }],
      }),
      this.getEmployeeDetailedBalances(tenantId, employeeId, targetYear),
      rawPrisma.probationRecord.findFirst({
        where: {
          tenantId,
          employeeId,
          status: { in: ["active", "in_progress", "extended"] },
          startDate: { lte: refDate },
          endDate: { gte: refDate },
        },
      }),
    ]);

    if (!employee) {
      throw new LeaveHttpError("Employee profile not found.", 404);
    }

    const isOnProbation = Boolean(activeProbation || employee.employmentCategory === "probationary");
    const isExternalContractor =
      employee.employmentCategory === "vendor_outsourced" ||
      employee.employmentCategory === "consultant_freelancer";

    const balanceMap = new Map(detailedBalances.map((b) => [b.leaveTypeId, b]));

    const matchesScope = (p: any) => {
      if (p.branchId && p.branchId !== employee.branchId) return false;
      if (p.departmentId && p.departmentId !== employee.departmentId) return false;
      return true;
    };

    const isWithinDates = (p: any) => {
      if (p.effectiveFrom) {
        const ef = new Date(p.effectiveFrom);
        ef.setUTCHours(0, 0, 0, 0);
        if (refDate < ef) return false;
      }
      if (p.effectiveTo) {
        const et = new Date(p.effectiveTo);
        et.setUTCHours(23, 59, 59, 999);
        if (refDate > et) return false;
      }
      return true;
    };

    const scopedActivePolicies = allPolicies.filter((p) => matchesScope(p) && isWithinDates(p));
    const defaultPolicy =
      scopedActivePolicies.find((p) => p.isDefault) ||
      scopedActivePolicies.find((p) => !p.leaveTypeId) ||
      null;

    const items = activeTypes.map((lt) => {
      const typeCandidates = scopedActivePolicies
        .filter((p) => p.leaveTypeId === lt.id)
        .sort(
          (a, b) =>
            (b.branchId ? 2 : 0) +
            (b.departmentId ? 2 : 0) -
            ((a.branchId ? 2 : 0) + (a.departmentId ? 2 : 0))
        );

      const resolvedPolicy = typeCandidates[0] || defaultPolicy;
      const rules = this.parsePolicyRules(resolvedPolicy, lt);
      const bal = balanceMap.get(lt.id);

      let eligible = true;
      let ineligibilityReason: string | null = null;
      if (isExternalContractor && lt.isPaid) {
        eligible = false;
        ineligibilityReason = "External contractors/consultants are only eligible for unpaid leave notes.";
      } else if (resolvedPolicy && !resolvedPolicy.probationAllowed && isOnProbation) {
        eligible = false;
        ineligibilityReason = "Not available during active probation period.";
      }

      const resolvedCarryEnabled = Boolean(
        resolvedPolicy ? resolvedPolicy.carryForwardEnabled : lt.carryForward
      );
      const resolvedCarryDays = resolvedPolicy
        ? resolvedPolicy.carryForwardEnabled
          ? Number(resolvedPolicy.maxCarryForwardDays ?? 0)
          : 0
        : lt.carryForward
        ? Number(lt.maxCarryForward ?? 0)
        : 0;

      return {
        id: lt.id,
        leaveTypeId: lt.id,
        name: lt.name,
        code: lt.code || lt.name.slice(0, 3).toUpperCase(),
        description: resolvedPolicy?.description || lt.description || null,
        color: lt.color || "#3b82f6",
        daysPerYear: Number(lt.daysPerYear ?? 0),
        isPaid: lt.isPaid,
        carryForward: resolvedCarryEnabled,
        maxCarryForward: resolvedCarryDays,
        halfDayAllowed: Boolean(lt.halfDayAllowed && rules.halfDayAllowed),
        sandwichRule: Boolean(lt.sandwichRule || resolvedPolicy?.sandwichRule),
        status: lt.status,
        eligible,
        ineligibilityReason,
        ineligibleReason: ineligibilityReason,
        availableBalance: bal?.available ?? Number(lt.daysPerYear ?? 0),
        usedBalance: bal?.used ?? 0,
        pendingBalance: bal?.pending ?? 0,
        carryForwardBalance: bal?.carryForward ?? 0,
        totalEntitlement: bal?.total ?? Number(lt.daysPerYear ?? 0),
        policy: {
          id: resolvedPolicy?.id || null,
          name: resolvedPolicy?.name || `${lt.name} Standard Policy`,
          code: resolvedPolicy?.code || lt.code || "STD",
          description: resolvedPolicy?.description || lt.description || null,
          minDays: rules.minDays,
          maxConsecutiveDays: resolvedPolicy?.maxConsecutiveDays ?? 14,
          noticeDays: resolvedPolicy?.noticeDays ?? 0,
          carryForward: resolvedCarryDays,
          carryForwardEnabled: resolvedCarryEnabled,
          maxCarryForwardDays: resolvedCarryDays,
          requiresApproval: resolvedPolicy?.requiresApproval ?? true,
          probationAllowed: resolvedPolicy?.probationAllowed ?? true,
          halfDayAllowed: Boolean(lt.halfDayAllowed && rules.halfDayAllowed),
          sandwichRule: Boolean(lt.sandwichRule || resolvedPolicy?.sandwichRule),
          accrualFrequency: resolvedPolicy?.accrualFrequency || "yearly",
          effectiveFrom: resolvedPolicy?.effectiveFrom || null,
          effectiveTo: resolvedPolicy?.effectiveTo || null,
          isDefault: resolvedPolicy?.isDefault ?? false,
        },
      };
    });

    return {
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        employeeCode: employee.employeeCode,
        department: employee.department?.name || "General",
        branch: employee.branch?.name || "Headquarters",
        employmentCategory: employee.employmentCategory || "permanent",
        isOnProbation,
      },
      year: targetYear,
      leaveTypes: items,
    };
  }
}
