import Decimal from "decimal.js";
import { rawPrisma } from "../prisma";
import { LeaveService, LeaveHttpError } from "./leave.service";
import { AttendanceService } from "./attendance.service";
import { AuditService } from "./audit.service";
import { NotificationService } from "./notification.service";
import { OutboxService } from "./outbox.service";
import { broadcastToTenant } from "../socket";

export interface ActorContext {
  userId: string;
  email?: string | null;
  roles?: string[];
  permissions?: string[];
}

export interface CallerAuthorizationProfile {
  userId: string;
  email: string | null;
  roles: string[];
  permissions: string[];
  employeeId: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    departmentId: string | null;
    branchId: string | null;
    managerId: string | null;
  } | null;
  isHrAdmin: boolean;
  isHrManager: boolean;
  isPayrollRole: boolean;
  isReportingManager: boolean;
  directReportIds: string[];
}

const ENCASHMENT_PENDING_STATUSES = [
  "PENDING",
  "MANAGER_APPROVED",
  "HR_APPROVED",
  "CLARIFICATION_REQUESTED",
];

function toUtcDateOnly(val: string | Date): Date {
  const s = typeof val === "string" ? val.trim() : val.toISOString();
  const ymd = s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    throw new LeaveHttpError(`Invalid date format: "${s}". Expected YYYY-MM-DD.`, 400, "INVALID_DATE");
  }
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new LeaveHttpError(`Invalid calendar date: "${s}".`, 400, "INVALID_DATE");
  }
  return d;
}

function normalizeStringArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((x) => String(x).trim()).filter(Boolean);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean);
    } catch {
      return val
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function assertValidRequestedDays(raw: any, allowHalfDay: boolean = true): number {
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    throw new LeaveHttpError("Requested days must be a valid finite number.", 400, "INVALID_DAYS");
  }
  if (num < 0) {
    throw new LeaveHttpError("Negative day quantities are not permitted.", 400, "NEGATIVE_DAYS");
  }
  if (num === 0) {
    throw new LeaveHttpError("Zero-day requests are not permitted.", 400, "ZERO_DAYS");
  }
  const scaled = Math.round(num * 100);
  if (Math.abs(num * 100 - scaled) > 0.001 || scaled % 50 !== 0) {
    throw new LeaveHttpError(
      "Fractional-day precision error: only whole days (1.0) or half-days (0.5) are permitted.",
      400,
      "INVALID_FRACTIONAL_PRECISION"
    );
  }
  if (!allowHalfDay && scaled % 100 !== 0) {
    throw new LeaveHttpError(
      "Half-day quantities (0.5) are not permitted under the active policy configuration.",
      400,
      "HALF_DAY_NOT_ALLOWED"
    );
  }
  return Number((scaled / 100).toFixed(2));
}

function buildRequestCode(prefix: "ENC" | "COF"): string {
  const now = new Date();
  const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${ym}-${rnd}`;
}

function buildConfigCode(prefix: "ECFG" | "CCFG", name: string): string {
  const slug = String(name || prefix)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}_${slug || "POLICY"}_${rnd}`.slice(0, 48);
}

function resolveApprovalStagesFromMode(mode?: string | null): string[] {
  const m = String(mode || "MANAGER_THEN_HR").toUpperCase();
  if (m === "AUTO") return [];
  if (m === "HR_ONLY" || m === "HR") return ["HR"];
  if (m === "MANAGER_ONLY" || m === "MANAGER") return ["MANAGER"];
  return ["MANAGER", "HR"];
}

export class LeaveEncashmentCompOffService {
  // =========================================================================
  // 1. AUTHORIZATION & ROLE RESOLUTION
  // =========================================================================

  static async resolveCallerProfile(
    tenantId: string,
    actor: ActorContext
  ): Promise<CallerAuthorizationProfile> {
    const rawRoles = Array.isArray(actor.roles) ? actor.roles : [];
    const normalizedRoles = rawRoles.map((r) => String(r).toLowerCase().trim());

    const [roleAssignments, employee, userRecord] = await Promise.all([
      rawPrisma.userRoleAssignment.findMany({
        where: { tenantId, userId: actor.userId },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      }),
      rawPrisma.employee.findFirst({
        where: { tenantId, userId: actor.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          departmentId: true,
          branchId: true,
          managerId: true,
        },
      }),
      actor.email
        ? Promise.resolve({ email: actor.email })
        : rawPrisma.user.findUnique({
            where: { id: actor.userId },
            select: { email: true },
          }),
    ]);

    const assignedRoleSlugs = roleAssignments
      .flatMap((ra) => {
        const raw = String(ra.role?.name || "").toLowerCase().trim();
        if (!raw) return [];
        return [raw, raw.replace(/\s+/g, "_")];
      })
      .filter(Boolean);
    const allRoles = Array.from(new Set([...normalizedRoles, ...assignedRoleSlugs]));

    const permSet = new Set<string>(
      (Array.isArray(actor.permissions) ? actor.permissions : []).map((p) => String(p).trim())
    );
    for (const ra of roleAssignments) {
      for (const rp of ra.role?.permissions || []) {
        const key = (rp.permission as any)?.code || (rp.permission as any)?.key;
        if (key) permSet.add(String(key));
      }
    }
    const permissions = Array.from(permSet);

    const hrAdminRoleTokens = new Set([
      "super_admin",
      "superadmin",
      "tenant_admin",
      "workspace_admin",
      "admin",
      "owner",
      "hr_admin",
      "hr",
    ]);
    const hrManagerRoleTokens = new Set(["hr_manager", "hrmanager", "people_ops", "hr_executive"]);
    const payrollRoleTokens = new Set([
      "payroll",
      "payroll_admin",
      "payroll_officer",
      "payroll_manager",
      "finance",
      "finance_admin",
      "accountant",
    ]);

    const isHrAdmin =
      allRoles.some((r) => hrAdminRoleTokens.has(r)) || permissions.includes("*");
    const isHrManager =
      isHrAdmin ||
      allRoles.some((r) => hrManagerRoleTokens.has(r)) ||
      (permissions.includes("hrm.leave.approve") &&
        permissions.includes("hrm.leave.view") &&
        allRoles.some((r) => r.includes("hr")));
    const isPayrollRole =
      isHrAdmin ||
      allRoles.some((r) => payrollRoleTokens.has(r)) ||
      permissions.some((p) => p.startsWith("payroll.") || p.startsWith("hrm.payroll."));

    let directReportIds: string[] = [];
    if (employee?.id) {
      const now = new Date();
      const [subordinates, activeDelegations] = await Promise.all([
        rawPrisma.employee.findMany({
          where: { tenantId, managerId: employee.id },
          select: { id: true },
        }),
        rawPrisma.approvalDelegation.findMany({
          where: {
            tenantId,
            delegateId: employee.id,
            status: "ACTIVE",
            startDate: { lte: now },
            endDate: { gte: now },
          },
          select: { managerId: true },
        }),
      ]);

      const reportSet = new Set(subordinates.map((s) => s.id));
      if (activeDelegations.length > 0) {
        const delegatorIds = activeDelegations.map((d) => d.managerId);
        const delegatedReports = await rawPrisma.employee.findMany({
          where: { tenantId, managerId: { in: delegatorIds } },
          select: { id: true },
        });
        for (const dr of delegatedReports) {
          if (dr.id !== employee.id) reportSet.add(dr.id);
        }
      }
      directReportIds = Array.from(reportSet);
    }

    const isReportingManager =
      directReportIds.length > 0 || allRoles.some((r) => r === "manager" || r === "team_lead");

    return {
      userId: actor.userId,
      email: userRecord?.email || actor.email || null,
      roles: allRoles,
      permissions,
      employeeId: employee?.id || null,
      employee: employee || null,
      isHrAdmin,
      isHrManager,
      isPayrollRole,
      isReportingManager,
      directReportIds,
    };
  }

  private static assertHrAdmin(profile: CallerAuthorizationProfile) {
    if (!profile.isHrAdmin) {
      throw new LeaveHttpError(
        "Forbidden: Only HR Administrators can create, modify, or deactivate policy configurations.",
        403,
        "HR_ADMIN_REQUIRED"
      );
    }
  }

  private static assertNotSelfApproval(
    profile: CallerAuthorizationProfile,
    targetEmployee: { id: string; userId?: string | null }
  ) {
    if (
      (profile.employeeId && profile.employeeId === targetEmployee.id) ||
      (targetEmployee.userId && targetEmployee.userId === profile.userId)
    ) {
      throw new LeaveHttpError(
        "Forbidden: Employees, managers, and administrators cannot approve or process their own requests.",
        403,
        "SELF_APPROVAL_FORBIDDEN"
      );
    }
  }

  private static canViewRecord(
    profile: CallerAuthorizationProfile,
    record: { employeeId: string; type: string },
    selfOnly?: boolean
  ): boolean {
    if (selfOnly) {
      return Boolean(profile.employeeId && profile.employeeId === record.employeeId);
    }
    if (profile.isHrAdmin || profile.isHrManager) return true;
    if (profile.isPayrollRole && record.type === "ENCASHMENT") return true;
    if (profile.employeeId && profile.employeeId === record.employeeId) return true;
    if (profile.directReportIds.includes(record.employeeId)) return true;
    return false;
  }

  private static async notifyHrUsers(
    tenantId: string,
    title: string,
    message: string,
    type: string,
    excludeUserId?: string
  ) {
    try {
      const hrAssignments = await rawPrisma.userRoleAssignment.findMany({
        where: {
          tenantId,
          role: {
            name: {
              in: [
                "admin",
                "Admin",
                "tenant_admin",
                "Tenant Admin",
                "hr_admin",
                "HR Admin",
                "hr_manager",
                "HR Manager",
                "super_admin",
                "Super Admin",
              ],
            },
          },
        },
        select: { userId: true },
        take: 25,
      });
      const recipientIds = Array.from(
        new Set(hrAssignments.map((a) => a.userId).filter((id) => id && id !== excludeUserId))
      );
      await Promise.all(
        recipientIds.map((uid) =>
          NotificationService.createNotification({
            tenantId,
            userId: uid,
            title,
            message,
            type,
            actionUrl: "/hr/leave/encashment-compoff",
          }).catch(() => {})
        )
      );
    } catch {
      // Non-blocking notification fanout
    }
  }

  // =========================================================================
  // 2. DYNAMIC FILTER METADATA & SERVER-SIDE SUMMARY AGGREGATES
  // =========================================================================

  static async getDynamicFilterMetadata(tenantId: string, profile: CallerAuthorizationProfile) {
    const employeeScopeWhere: any = { tenantId };
    if (!profile.isHrAdmin && !profile.isHrManager && !profile.isPayrollRole) {
      const allowedIds = [
        ...(profile.employeeId ? [profile.employeeId] : []),
        ...profile.directReportIds,
      ];
      employeeScopeWhere.id = { in: allowedIds.length > 0 ? allowedIds : ["__NONE__"] };
    }

    const [
      tenant,
      employees,
      departments,
      branches,
      leaveTypes,
      salaryComponents,
      payrollRuns,
      encashmentConfigs,
      compOffConfigs,
    ] = await Promise.all([
      rawPrisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, currency: true, timezone: true },
      }),
      rawPrisma.employee.findMany({
        where: employeeScopeWhere,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          position: true,
          status: true,
          employmentCategory: true,
          departmentId: true,
          branchId: true,
          managerId: true,
          department: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      rawPrisma.department.findMany({
        where: { tenantId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      rawPrisma.branch.findMany({
        where: { tenantId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      rawPrisma.leaveType.findMany({
        where: { tenantId, status: "active" },
        select: {
          id: true,
          name: true,
          code: true,
          color: true,
          isPaid: true,
          halfDayAllowed: true,
          daysPerYear: true,
        },
        orderBy: { name: "asc" },
      }),
      rawPrisma.salaryComponent.findMany({
        where: { tenantId, isActive: true, type: "earning" },
        select: { id: true, code: true, name: true, isTaxable: true },
        orderBy: { sortOrder: "asc" },
      }),
      rawPrisma.payrollRun.findMany({
        where: { tenantId },
        select: {
          id: true,
          periodMonth: true,
          periodYear: true,
          status: true,
          approvalStatus: true,
          isPublished: true,
        },
        orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
        take: 36,
      }),
      rawPrisma.leaveEncashmentConfig.findMany({
        where: { tenantId, status: "active", enabled: true },
        select: {
          id: true,
          name: true,
          code: true,
          version: true,
          eligibleLeaveTypeIds: true,
          leaveTypeId: true,
          allowEssSubmission: true,
        },
      }),
      rawPrisma.compOffConfig.findMany({
        where: { tenantId, status: "active", enabled: true },
        select: {
          id: true,
          name: true,
          code: true,
          version: true,
          compOffLeaveTypeId: true,
          allowWeeklyOff: true,
          allowPublicHoliday: true,
          allowApprovedOvertime: true,
          allowWorkdayExtraHours: true,
          halfDayAllowed: true,
          allowEssSubmission: true,
          expiryDays: true,
        },
      }),
    ]);

    const categorySet = new Set<string>(["permanent", "probation", "contract", "intern"]);
    for (const emp of employees) {
      if (emp.employmentCategory) categorySet.add(String(emp.employmentCategory));
    }

    const now = new Date();
    const curMonth = now.getUTCMonth() + 1;
    const curYear = now.getUTCFullYear();
    const periodMap = new Map<string, any>();

    for (const pr of payrollRuns) {
      const key = `${pr.periodYear}-${String(pr.periodMonth).padStart(2, "0")}`;
      periodMap.set(key, {
        key,
        label: `${String(pr.periodMonth).padStart(2, "0")}/${pr.periodYear}`,
        periodMonth: pr.periodMonth,
        periodYear: pr.periodYear,
        payrollRunId: pr.id,
        status: pr.status,
        approvalStatus: pr.approvalStatus,
        isLocked:
          Boolean(pr.isPublished) ||
          ["CLOSED", "OUTPUTS_GENERATED", "FINALIZING", "finalized"].includes(
            String(pr.approvalStatus || "")
          ),
      });
    }

    for (let offset = -1; offset <= 3; offset++) {
      const dt = new Date(Date.UTC(curYear, curMonth - 1 + offset, 1));
      const pm = dt.getUTCMonth() + 1;
      const py = dt.getUTCFullYear();
      const key = `${py}-${String(pm).padStart(2, "0")}`;
      if (!periodMap.has(key)) {
        periodMap.set(key, {
          key,
          label: `${String(pm).padStart(2, "0")}/${py}`,
          periodMonth: pm,
          periodYear: py,
          payrollRunId: null,
          status: "uninitialized",
          approvalStatus: "OPEN",
          isLocked: false,
        });
      }
    }

    const payrollPeriods = Array.from(periodMap.values()).sort((a, b) =>
      b.key.localeCompare(a.key)
    );

    return {
      currency: tenant?.currency || "INR",
      timezone: tenant?.timezone || "Asia/Kolkata",
      viewerAccess: {
        userId: profile.userId,
        employeeId: profile.employeeId,
        isHrAdmin: profile.isHrAdmin,
        isHrManager: profile.isHrManager,
        isPayrollRole: profile.isPayrollRole,
        isReportingManager: profile.isReportingManager,
        directReportsCount: profile.directReportIds.length,
        canConfigurePolicies: profile.isHrAdmin,
        canProcessPayroll: profile.isHrAdmin || profile.isPayrollRole,
        canCreateForOthers: profile.isHrAdmin || profile.isHrManager,
        canCreateEncashment:
          profile.isHrAdmin ||
          profile.isHrManager ||
          (Boolean(profile.employeeId) &&
            (encashmentConfigs.length === 0 || encashmentConfigs.some((c) => c.allowEssSubmission))),
        canCreateCompOff:
          profile.isHrAdmin ||
          profile.isHrManager ||
          (Boolean(profile.employeeId) &&
            (compOffConfigs.length === 0 || compOffConfigs.some((c) => c.allowEssSubmission))),
        canApproveRequests:
          profile.isHrAdmin || profile.isHrManager || profile.isReportingManager,
        canViewSalaryAmounts:
          profile.isHrAdmin || profile.isHrManager || profile.isPayrollRole,
      },
      employees: employees.map((e) => ({
        ...e,
        fullName: `${e.firstName} ${e.lastName}`.trim(),
      })),
      departments,
      branches,
      leaveTypes,
      salaryComponents,
      payrollRuns: payrollRuns.map((pr) => ({
        ...pr,
        month: pr.periodMonth,
        year: pr.periodYear,
      })),
      payrollPeriods,
      employmentCategories: Array.from(categorySet),
      activeEncashmentConfigsCount: encashmentConfigs.length,
      activeCompOffConfigsCount: compOffConfigs.length,
      encashmentStatuses: [
        "DRAFT",
        "PENDING",
        "CLARIFICATION_REQUESTED",
        "MANAGER_APPROVED",
        "HR_APPROVED",
        "APPROVED",
        "PAYROLL_PENDING",
        "PAYROLL_PROCESSING",
        "PAID",
        "FAILED",
        "REJECTED",
        "CANCELLED",
        "REVERSED",
      ],
      compOffStatuses: [
        "DRAFT",
        "PENDING",
        "MANAGER_APPROVED",
        "HR_APPROVED",
        "CREDITED",
        "PARTIALLY_USED",
        "USED",
        "EXPIRED",
        "REJECTED",
        "CANCELLED",
        "REVERSED",
      ],
      workTypes: ["WEEKLY_OFF", "PUBLIC_HOLIDAY", "OVERTIME", "WORKDAY_EXTRA"],
      transactionTypes: ["ENCASHMENT", "COMP_OFF"],
    };
  }

  static async getSummaryAggregates(
    tenantId: string,
    profile: CallerAuthorizationProfile,
    options?: { selfOnly?: boolean; expiringDaysHorizon?: number }
  ) {
    const scopeFilter: any = { tenantId };
    if (options?.selfOnly) {
      scopeFilter.employeeId = profile.employeeId || "__NONE__";
    } else if (!profile.isHrAdmin && !profile.isHrManager && !profile.isPayrollRole) {
      const allowedIds = [
        ...(profile.employeeId ? [profile.employeeId] : []),
        ...profile.directReportIds,
      ];
      scopeFilter.employeeId = { in: allowedIds.length > 0 ? allowedIds : ["__NONE__"] };
    }

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const horizonDays = options?.expiringDaysHorizon ?? 14;
    const expiryHorizon = new Date(today.getTime() + horizonDays * 86400000);

    const [
      tenant,
      pendingEncashmentCount,
      approvedEncashmentAgg,
      awaitingPayrollAgg,
      paidEncashmentAgg,
      pendingCompOffCount,
      availableCompOffAgg,
      expiringCompOffAgg,
      reservedAllocationsAgg,
    ] = await Promise.all([
      rawPrisma.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } }),
      rawPrisma.leaveEncashmentRequest.count({
        where: {
          ...scopeFilter,
          type: "ENCASHMENT",
          status: { in: ["PENDING", "MANAGER_APPROVED", "HR_APPROVED", "CLARIFICATION_REQUESTED"] },
        },
      }),
      rawPrisma.leaveEncashmentRequest.aggregate({
        where: {
          ...scopeFilter,
          type: "ENCASHMENT",
          status: { in: ["APPROVED", "PAYROLL_PENDING", "PAYROLL_PROCESSING", "PAID"] },
        },
        _count: { _all: true },
        _sum: { days: true, netPayableAmount: true },
      }),
      rawPrisma.leaveEncashmentRequest.aggregate({
        where: {
          ...scopeFilter,
          type: "ENCASHMENT",
          status: { in: ["APPROVED", "PAYROLL_PENDING", "PAYROLL_PROCESSING", "FAILED"] },
        },
        _count: { _all: true },
        _sum: { days: true, netPayableAmount: true },
      }),
      rawPrisma.leaveEncashmentRequest.aggregate({
        where: {
          ...scopeFilter,
          type: "ENCASHMENT",
          status: "PAID",
        },
        _count: { _all: true },
        _sum: { netPayableAmount: true },
      }),
      rawPrisma.leaveEncashmentRequest.count({
        where: {
          ...scopeFilter,
          type: "COMP_OFF",
          status: { in: ["PENDING", "MANAGER_APPROVED", "HR_APPROVED"] },
        },
      }),
      rawPrisma.leaveEncashmentRequest.aggregate({
        where: {
          ...scopeFilter,
          type: "COMP_OFF",
          status: { in: ["CREDITED", "PARTIALLY_USED"] },
          remainingDays: { gt: 0 },
          OR: [{ expiresAt: null }, { expiresAt: { gte: today } }],
        },
        _sum: { remainingDays: true },
      }),
      rawPrisma.leaveEncashmentRequest.aggregate({
        where: {
          ...scopeFilter,
          type: "COMP_OFF",
          status: { in: ["CREDITED", "PARTIALLY_USED"] },
          remainingDays: { gt: 0 },
          expiresAt: { gte: today, lte: expiryHorizon },
        },
        _count: { _all: true },
        _sum: { remainingDays: true },
      }),
      rawPrisma.compOffUsageAllocation.aggregate({
        where: {
          ...scopeFilter,
          status: "RESERVED",
          leaveRequest: { status: "pending" },
        },
        _sum: { daysAllocated: true },
      }),
    ]);

    const rawRemainingCompOff = Number(availableCompOffAgg._sum.remainingDays || 0);
    const reservedCompOff = Number(reservedAllocationsAgg._sum.daysAllocated || 0);
    const netAvailableCompOffDays = Number(
      Math.max(0, rawRemainingCompOff - reservedCompOff).toFixed(2)
    );

    const hideAggregateSalary =
      !options?.selfOnly &&
      !profile.isHrAdmin &&
      !profile.isHrManager &&
      !profile.isPayrollRole;

    return {
      currency: tenant?.currency || "INR",
      pendingEncashmentRequests: pendingEncashmentCount,
      approvedEncashmentRequests: approvedEncashmentAgg._count._all || 0,
      approvedEncashmentDays: Number(approvedEncashmentAgg._sum.days || 0),
      approvedEncashmentAmount: hideAggregateSalary
        ? null
        : Number(approvedEncashmentAgg._sum.netPayableAmount || 0),
      awaitingPayrollProcessing: awaitingPayrollAgg._count._all || 0,
      awaitingPayrollAmount: hideAggregateSalary
        ? null
        : Number(awaitingPayrollAgg._sum.netPayableAmount || 0),
      paidEncashmentRequests: paidEncashmentAgg._count._all || 0,
      paidEncashmentAmount: hideAggregateSalary
        ? null
        : Number(paidEncashmentAgg._sum.netPayableAmount || 0),
      pendingCompOffRequests: pendingCompOffCount,
      availableCompOffDays: netAvailableCompOffDays,
      expiringCompOffDays: Number(expiringCompOffAgg._sum.remainingDays || 0),
      expiringCompOffLotsCount: expiringCompOffAgg._count._all || 0,
      expiringHorizonDays: horizonDays,
      warningWindowDays: horizonDays,
    };
  }

  // =========================================================================
  // 3. MODULE D — CONFIGURATION CRUD, OVERLAP VALIDATION & VERSIONING
  // =========================================================================

  private static datesOverlap(
    startA: Date,
    endA: Date | null,
    startB: Date,
    endB: Date | null
  ): boolean {
    const maxEnd = new Date("9999-12-31T00:00:00.000Z");
    const eA = endA || maxEnd;
    const eB = endB || maxEnd;
    return startA <= eB && startB <= eA;
  }

  private static async enrichConfigsWithOrgNames<
    T extends { branchId: string | null; departmentId: string | null }
  >(tenantId: string, rows: T[]) {
    if (rows.length === 0) return [];
    const branchIds = Array.from(
      new Set(rows.map((r) => r.branchId).filter((x): x is string => Boolean(x)))
    );
    const deptIds = Array.from(
      new Set(rows.map((r) => r.departmentId).filter((x): x is string => Boolean(x)))
    );
    const [branches, depts] = await Promise.all([
      branchIds.length > 0
        ? rawPrisma.branch.findMany({
            where: { tenantId, id: { in: branchIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      deptIds.length > 0
        ? rawPrisma.department.findMany({
            where: { tenantId, id: { in: deptIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);
    const branchMap = new Map(branches.map((b) => [b.id, b]));
    const deptMap = new Map(depts.map((d) => [d.id, d]));

    return rows.map((r: any) => ({
      ...r,
      isEnabled: r.enabled,
      branch: r.branchId ? branchMap.get(r.branchId) || null : null,
      department: r.departmentId ? deptMap.get(r.departmentId) || null : null,
      salaryComponent: r.payrollComponent || null,
      leaveType: r.leaveType || r.compOffLeaveType || null,
    }));
  }

  private static async assertNoConflictingEncashmentConfig(
    tenantId: string,
    candidate: {
      leaveTypeIds: string[];
      branchId: string | null;
      departmentId: string | null;
      effectiveFrom: Date;
      effectiveTo: Date | null;
      excludeIds?: string[];
    }
  ) {
    const activeConfigs = await rawPrisma.leaveEncashmentConfig.findMany({
      where: {
        tenantId,
        status: "active",
        enabled: true,
        ...(candidate.excludeIds && candidate.excludeIds.length > 0
          ? { id: { notIn: candidate.excludeIds } }
          : {}),
      },
    });

    for (const existing of activeConfigs) {
      const sameOrgScope =
        (existing.branchId || null) === (candidate.branchId || null) &&
        (existing.departmentId || null) === (candidate.departmentId || null);
      if (!sameOrgScope) continue;

      if (
        !this.datesOverlap(
          candidate.effectiveFrom,
          candidate.effectiveTo,
          new Date(existing.effectiveFrom),
          existing.effectiveTo ? new Date(existing.effectiveTo) : null
        )
      ) {
        continue;
      }

      const existingLtIds = new Set<string>([
        ...normalizeStringArray(existing.eligibleLeaveTypeIds),
        ...(existing.leaveTypeId ? [existing.leaveTypeId] : []),
      ]);
      const overlapLeaveType = candidate.leaveTypeIds.some((id) => existingLtIds.has(id));
      if (overlapLeaveType) {
        throw new LeaveHttpError(
          `Conflicting active Encashment Configuration "${existing.name}" (v${existing.version}) already covers one or more selected leave types for the same branch/department scope and overlapping effective dates.`,
          409,
          "CONFIG_SCOPE_OVERLAP"
        );
      }
    }
  }

  static async listEncashmentConfigs(tenantId: string, includeArchived: boolean = true) {
    const rows = await rawPrisma.leaveEncashmentConfig.findMany({
      where: {
        tenantId,
        ...(includeArchived ? {} : { status: "active" }),
      },
      include: {
        leaveType: { select: { id: true, name: true, code: true, color: true } },
        payrollComponent: { select: { id: true, code: true, name: true, isTaxable: true } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });
    const enriched = await this.enrichConfigsWithOrgNames(tenantId, rows);
    return enriched.map((c: any) => ({
      ...c,
      minRemainingBalance: Number(c.minRemainingBalance),
      maxEncashableDaysPerRequest: Number(c.maxEncashableDaysPerRequest),
      maxEncashableDaysPerYear: Number(c.maxEncashableDaysPerYear),
      minRetainedBalance: Number(c.minRetainedBalance),
      periodicLimitDays: c.periodicLimitDays !== null ? Number(c.periodicLimitDays) : null,
      dailyRateDivisor: c.dailyRateDivisor !== null ? Number(c.dailyRateDivisor) : null,
      // Friendly aliases for UI
      maxEncashableDays: Number(c.maxEncashableDaysPerRequest),
      annualMaxDays: Number(c.maxEncashableDaysPerYear),
      salaryBasis: c.salaryBasisType,
      divisorMode: c.dailyRateDivisorMode,
      customDivisor: c.dailyRateDivisor !== null ? Number(c.dailyRateDivisor) : null,
      salaryComponentId: c.payrollComponentId,
      allowSelfService: c.allowEssSubmission,
    }));
  }

  static async createEncashmentConfig(
    tenantId: string,
    profile: CallerAuthorizationProfile,
    input: any
  ) {
    this.assertHrAdmin(profile);

    const name = String(input.name || "").trim();
    if (!name) {
      throw new LeaveHttpError("Configuration name is required.", 400);
    }

    const rawLtIds = normalizeStringArray(input.eligibleLeaveTypeIds);
    if (input.leaveTypeId && !rawLtIds.includes(String(input.leaveTypeId))) {
      rawLtIds.push(String(input.leaveTypeId));
    }
    if (rawLtIds.length === 0) {
      throw new LeaveHttpError(
        "At least one eligible Leave Type must be selected for Leave Encashment.",
        400,
        "ELIGIBLE_LEAVE_TYPE_REQUIRED"
      );
    }

    const validLeaveTypes = await rawPrisma.leaveType.findMany({
      where: { tenantId, id: { in: rawLtIds } },
      select: { id: true },
    });
    if (validLeaveTypes.length !== rawLtIds.length) {
      throw new LeaveHttpError(
        "One or more selected Leave Types do not belong to this tenant.",
        400,
        "INVALID_LEAVE_TYPE"
      );
    }

    const payrollComponentId =
      input.payrollComponentId || input.salaryComponentId || null;
    if (payrollComponentId) {
      const comp = await rawPrisma.salaryComponent.findFirst({
        where: { id: String(payrollComponentId), tenantId },
        select: { id: true },
      });
      if (!comp) {
        throw new LeaveHttpError("Selected Payroll Earning Component was not found.", 400);
      }
    }

    const effectiveFrom = input.effectiveFrom
      ? toUtcDateOnly(input.effectiveFrom)
      : toUtcDateOnly(new Date());
    const effectiveTo = input.effectiveTo ? toUtcDateOnly(input.effectiveTo) : null;
    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new LeaveHttpError("Effective-To date cannot precede Effective-From date.", 400);
    }

    const dailyRateDivisorMode = String(
      input.dailyRateDivisorMode || input.divisorMode || "WORKING_DAYS"
    ).toUpperCase();
    const dailyRateDivisor =
      input.dailyRateDivisor !== undefined && input.dailyRateDivisor !== null && input.dailyRateDivisor !== ""
        ? Number(input.dailyRateDivisor)
        : input.customDivisor !== undefined && input.customDivisor !== null && input.customDivisor !== ""
          ? Number(input.customDivisor)
          : null;

    if (dailyRateDivisorMode === "CUSTOM" && (!dailyRateDivisor || dailyRateDivisor <= 0)) {
      throw new LeaveHttpError(
        "A positive custom daily-rate divisor is required when divisor mode is CUSTOM.",
        400
      );
    }

    const branchId = input.branchId && input.branchId !== "all" ? String(input.branchId) : null;
    const departmentId =
      input.departmentId && input.departmentId !== "all" ? String(input.departmentId) : null;
    const enabled =
      input.enabled !== undefined
        ? Boolean(input.enabled)
        : input.isEnabled !== undefined
          ? Boolean(input.isEnabled)
          : true;

    if (enabled) {
      await this.assertNoConflictingEncashmentConfig(tenantId, {
        leaveTypeIds: rawLtIds,
        branchId,
        departmentId,
        effectiveFrom,
        effectiveTo,
      });
    }

    const code = input.code ? String(input.code).trim().toUpperCase() : buildConfigCode("ECFG", name);
    const maxPerReq = Math.max(
      0.5,
      Number(input.maxEncashableDaysPerRequest ?? input.maxEncashableDays ?? 15)
    );
    const maxPerYr = Math.max(
      maxPerReq,
      Number(input.maxEncashableDaysPerYear ?? input.annualMaxDays ?? 30)
    );

    const created = await rawPrisma.leaveEncashmentConfig.create({
      data: {
        tenantId,
        name,
        code,
        description: input.description ? String(input.description).trim() : null,
        enabled,
        status: enabled ? "active" : "inactive",
        version: 1,
        leaveTypeId: rawLtIds[0],
        eligibleLeaveTypeIds: rawLtIds,
        eligibilityCriteria: input.eligibilityCriteria ?? null,
        minServiceMonths: Math.max(0, Number(input.minServiceMonths ?? 0)),
        minRemainingBalance: Math.max(0, Number(input.minRemainingBalance ?? 0)),
        maxEncashableDaysPerRequest: maxPerReq,
        maxEncashableDaysPerYear: maxPerYr,
        minRetainedBalance: Math.max(0, Number(input.minRetainedBalance ?? 0)),
        encashmentFrequency: String(
          input.encashmentFrequency || input.frequency || "ANNUAL"
        ).toUpperCase(),
        periodicLimitDays:
          input.periodicLimitDays !== undefined && input.periodicLimitDays !== null && input.periodicLimitDays !== ""
            ? Number(input.periodicLimitDays)
            : null,
        applicableCategories: normalizeStringArray(input.applicableCategories),
        branchId,
        departmentId,
        approvalMode: String(input.approvalMode || "MANAGER_THEN_HR").toUpperCase(),
        allowEssSubmission:
          input.allowEssSubmission !== undefined
            ? Boolean(input.allowEssSubmission)
            : input.allowSelfService !== undefined
              ? Boolean(input.allowSelfService)
              : true,
        requireSupportingDoc: Boolean(input.requireSupportingDoc),
        salaryBasisType: String(
          input.salaryBasisType || input.salaryBasis || "BASIC"
        ).toUpperCase(),
        salaryComponentCodes: normalizeStringArray(input.salaryComponentCodes),
        dailyRateDivisorMode,
        dailyRateDivisor,
        payrollComponentId: payrollComponentId ? String(payrollComponentId) : null,
        effectiveFrom,
        effectiveTo,
        createdById: profile.userId,
        updatedById: profile.userId,
      },
      include: { leaveType: true, payrollComponent: true },
    });

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: "LEAVE_ENCASHMENT_CONFIG_CREATED",
      entityType: "LeaveEncashmentConfig",
      entityId: created.id,
      newState: created,
    });

    const [enriched] = await this.enrichConfigsWithOrgNames(tenantId, [created]);
    return enriched;
  }

  static async updateEncashmentConfig(
    tenantId: string,
    configId: string,
    profile: CallerAuthorizationProfile,
    input: any
  ) {
    this.assertHrAdmin(profile);

    const existing = await rawPrisma.leaveEncashmentConfig.findFirst({
      where: { id: configId, tenantId },
    });
    if (!existing) {
      throw new LeaveHttpError("Encashment configuration not found.", 404);
    }

    const name = input.name !== undefined ? String(input.name).trim() : existing.name;
    if (!name) {
      throw new LeaveHttpError("Configuration name cannot be empty.", 400);
    }

    const rawLtIds =
      input.eligibleLeaveTypeIds !== undefined
        ? normalizeStringArray(input.eligibleLeaveTypeIds)
        : normalizeStringArray(existing.eligibleLeaveTypeIds);
    if (rawLtIds.length === 0 && existing.leaveTypeId) rawLtIds.push(existing.leaveTypeId);
    if (rawLtIds.length === 0) {
      throw new LeaveHttpError("At least one eligible Leave Type is required.", 400);
    }

    const effectiveFrom = input.effectiveFrom
      ? toUtcDateOnly(input.effectiveFrom)
      : new Date(existing.effectiveFrom);
    const effectiveTo =
      input.effectiveTo !== undefined
        ? input.effectiveTo
          ? toUtcDateOnly(input.effectiveTo)
          : null
        : existing.effectiveTo
          ? new Date(existing.effectiveTo)
          : null;
    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new LeaveHttpError("Effective-To date cannot precede Effective-From date.", 400);
    }

    const branchId =
      input.branchId !== undefined
        ? input.branchId && input.branchId !== "all"
          ? String(input.branchId)
          : null
        : existing.branchId;
    const departmentId =
      input.departmentId !== undefined
        ? input.departmentId && input.departmentId !== "all"
          ? String(input.departmentId)
          : null
        : existing.departmentId;
    const enabled =
      input.enabled !== undefined
        ? Boolean(input.enabled)
        : input.isEnabled !== undefined
          ? Boolean(input.isEnabled)
          : existing.enabled;

    if (enabled) {
      await this.assertNoConflictingEncashmentConfig(tenantId, {
        leaveTypeIds: rawLtIds,
        branchId,
        departmentId,
        effectiveFrom,
        effectiveTo,
        excludeIds: [existing.id],
      });
    }

    const referencedCount = await rawPrisma.leaveEncashmentRequest.count({
      where: { tenantId, encashmentConfigId: existing.id },
    });

    const maxPerReq =
      input.maxEncashableDaysPerRequest !== undefined || input.maxEncashableDays !== undefined
        ? Math.max(0.5, Number(input.maxEncashableDaysPerRequest ?? input.maxEncashableDays))
        : Number(existing.maxEncashableDaysPerRequest);
    const maxPerYr =
      input.maxEncashableDaysPerYear !== undefined || input.annualMaxDays !== undefined
        ? Math.max(maxPerReq, Number(input.maxEncashableDaysPerYear ?? input.annualMaxDays))
        : Number(existing.maxEncashableDaysPerYear);

    const payrollComponentId =
      input.payrollComponentId !== undefined || input.salaryComponentId !== undefined
        ? input.payrollComponentId || input.salaryComponentId || null
        : existing.payrollComponentId;

    const payloadData = {
      name,
      description:
        input.description !== undefined
          ? input.description
            ? String(input.description).trim()
            : null
          : existing.description,
      enabled,
      status: enabled ? "active" : "inactive",
      leaveTypeId: rawLtIds[0],
      eligibleLeaveTypeIds: rawLtIds,
      eligibilityCriteria:
        input.eligibilityCriteria !== undefined
          ? input.eligibilityCriteria
          : existing.eligibilityCriteria,
      minServiceMonths:
        input.minServiceMonths !== undefined
          ? Math.max(0, Number(input.minServiceMonths))
          : existing.minServiceMonths,
      minRemainingBalance:
        input.minRemainingBalance !== undefined
          ? Math.max(0, Number(input.minRemainingBalance))
          : Number(existing.minRemainingBalance),
      maxEncashableDaysPerRequest: maxPerReq,
      maxEncashableDaysPerYear: maxPerYr,
      minRetainedBalance:
        input.minRetainedBalance !== undefined
          ? Math.max(0, Number(input.minRetainedBalance))
          : Number(existing.minRetainedBalance),
      encashmentFrequency:
        input.encashmentFrequency !== undefined || input.frequency !== undefined
          ? String(input.encashmentFrequency || input.frequency).toUpperCase()
          : existing.encashmentFrequency,
      periodicLimitDays:
        input.periodicLimitDays !== undefined
          ? input.periodicLimitDays !== null && input.periodicLimitDays !== ""
            ? Number(input.periodicLimitDays)
            : null
          : existing.periodicLimitDays !== null
            ? Number(existing.periodicLimitDays)
            : null,
      applicableCategories:
        input.applicableCategories !== undefined
          ? normalizeStringArray(input.applicableCategories)
          : (existing.applicableCategories as any),
      branchId,
      departmentId,
      approvalMode:
        input.approvalMode !== undefined
          ? String(input.approvalMode).toUpperCase()
          : existing.approvalMode,
      allowEssSubmission:
        input.allowEssSubmission !== undefined
          ? Boolean(input.allowEssSubmission)
          : input.allowSelfService !== undefined
            ? Boolean(input.allowSelfService)
            : existing.allowEssSubmission,
      requireSupportingDoc:
        input.requireSupportingDoc !== undefined
          ? Boolean(input.requireSupportingDoc)
          : existing.requireSupportingDoc,
      salaryBasisType:
        input.salaryBasisType !== undefined || input.salaryBasis !== undefined
          ? String(input.salaryBasisType || input.salaryBasis).toUpperCase()
          : existing.salaryBasisType,
      salaryComponentCodes:
        input.salaryComponentCodes !== undefined
          ? normalizeStringArray(input.salaryComponentCodes)
          : (existing.salaryComponentCodes as any),
      dailyRateDivisorMode:
        input.dailyRateDivisorMode !== undefined || input.divisorMode !== undefined
          ? String(input.dailyRateDivisorMode || input.divisorMode).toUpperCase()
          : existing.dailyRateDivisorMode,
      dailyRateDivisor:
        input.dailyRateDivisor !== undefined || input.customDivisor !== undefined
          ? (input.dailyRateDivisor ?? input.customDivisor) !== null &&
            (input.dailyRateDivisor ?? input.customDivisor) !== ""
            ? Number(input.dailyRateDivisor ?? input.customDivisor)
            : null
          : existing.dailyRateDivisor !== null
            ? Number(existing.dailyRateDivisor)
            : null,
      payrollComponentId: payrollComponentId ? String(payrollComponentId) : null,
      effectiveFrom,
      effectiveTo,
      updatedById: profile.userId,
    };

    let result;
    if (referencedCount > 0) {
      // Immutable policy versioning: preserve historical version referenced by approved/past requests
      result = await rawPrisma.$transaction(async (tx) => {
        await tx.leaveEncashmentConfig.update({
          where: { id: existing.id },
          data: { status: "superseded", enabled: false, updatedById: profile.userId },
        });
        return tx.leaveEncashmentConfig.create({
          data: {
            ...payloadData,
            tenantId,
            code: existing.code,
            version: existing.version + 1,
            previousVersionId: existing.id,
            createdById: existing.createdById || profile.userId,
          },
          include: { leaveType: true, payrollComponent: true },
        });
      });
    } else {
      result = await rawPrisma.leaveEncashmentConfig.update({
        where: { id: existing.id },
        data: { ...payloadData, version: existing.version + 1 },
        include: { leaveType: true, payrollComponent: true },
      });
    }

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: "LEAVE_ENCASHMENT_CONFIG_UPDATED",
      entityType: "LeaveEncashmentConfig",
      entityId: result.id,
      oldState: existing,
      newState: result,
    });

    const [enriched] = await this.enrichConfigsWithOrgNames(tenantId, [result]);
    return enriched;
  }

  static async deactivateEncashmentConfig(
    tenantId: string,
    configId: string,
    profile: CallerAuthorizationProfile
  ) {
    this.assertHrAdmin(profile);
    const existing = await rawPrisma.leaveEncashmentConfig.findFirst({
      where: { id: configId, tenantId },
    });
    if (!existing) {
      throw new LeaveHttpError("Encashment configuration not found.", 404);
    }

    const updated = await rawPrisma.leaveEncashmentConfig.update({
      where: { id: configId },
      data: { status: "inactive", enabled: false, updatedById: profile.userId },
      include: { leaveType: true, payrollComponent: true },
    });

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: "LEAVE_ENCASHMENT_CONFIG_DEACTIVATED",
      entityType: "LeaveEncashmentConfig",
      entityId: configId,
      oldState: existing,
      newState: updated,
    });

    const [enriched] = await this.enrichConfigsWithOrgNames(tenantId, [updated]);
    return enriched;
  }

  // --- Comp-Off Configuration CRUD ---

  private static async assertNoConflictingCompOffConfig(
    tenantId: string,
    candidate: {
      branchId: string | null;
      departmentId: string | null;
      effectiveFrom: Date;
      effectiveTo: Date | null;
      excludeIds?: string[];
    }
  ) {
    const activeConfigs = await rawPrisma.compOffConfig.findMany({
      where: {
        tenantId,
        status: "active",
        enabled: true,
        ...(candidate.excludeIds && candidate.excludeIds.length > 0
          ? { id: { notIn: candidate.excludeIds } }
          : {}),
      },
    });

    for (const existing of activeConfigs) {
      const sameScope =
        (existing.branchId || null) === (candidate.branchId || null) &&
        (existing.departmentId || null) === (candidate.departmentId || null);
      if (!sameScope) continue;

      if (
        this.datesOverlap(
          candidate.effectiveFrom,
          candidate.effectiveTo,
          new Date(existing.effectiveFrom),
          existing.effectiveTo ? new Date(existing.effectiveTo) : null
        )
      ) {
        throw new LeaveHttpError(
          `Conflicting active Comp-Off Configuration "${existing.name}" (v${existing.version}) already covers the same organizational scope and effective dates.`,
          409,
          "CONFIG_SCOPE_OVERLAP"
        );
      }
    }
  }

  static async listCompOffConfigs(tenantId: string, includeArchived: boolean = true) {
    const rows = await rawPrisma.compOffConfig.findMany({
      where: {
        tenantId,
        ...(includeArchived ? {} : { status: "active" }),
      },
      include: {
        compOffLeaveType: { select: { id: true, name: true, code: true, color: true } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });
    const enriched = await this.enrichConfigsWithOrgNames(tenantId, rows);
    return enriched.map((c: any) => ({
      ...c,
      minQualifyingHours: Number(c.minQualifyingHours),
      halfDayHoursThreshold: Number(c.halfDayHoursThreshold),
      fullDayHoursThreshold: Number(c.fullDayHoursThreshold),
      maxCreditPerDay: Number(c.maxCreditPerDay),
      maxMonthlyCredits: Number(c.maxMonthlyCredits),
      maxYearlyCredits: Number(c.maxYearlyCredits),
      // Friendly aliases
      leaveTypeId: c.compOffLeaveTypeId,
      allowWeeklyOffWork: c.allowWeeklyOff,
      allowHolidayWork: c.allowPublicHoliday,
      weeklyOffEligible: c.allowWeeklyOff,
      publicHolidayEligible: c.allowPublicHoliday,
      overtimeEligible: c.allowApprovedOvertime,
      workdayExtraHoursEligible: c.allowWorkdayExtraHours,
      minWorkedHours: Number(c.minQualifyingHours),
      halfDayHours: Number(c.halfDayHoursThreshold),
      fullDayHours: Number(c.fullDayHoursThreshold),
      maxCreditDaysPerRequest: Number(c.maxCreditPerDay),
      maxAccrualBalance: Number(c.maxYearlyCredits),
      maxBackdateDays: c.submissionDeadlineDays,
      requireAttendanceProof: c.requireAttendanceRecord,
      requireApprovedOvertime: c.requireApprovedOvertimeForOt,
      creditExpiryDays: c.expiryDays,
      preExpiryAlertDays: c.expiryWarningDays,
      allowHalfDay: c.halfDayAllowed,
      allowSelfService: c.allowEssSubmission,
    }));
  }

  static async createCompOffConfig(
    tenantId: string,
    profile: CallerAuthorizationProfile,
    input: any
  ) {
    this.assertHrAdmin(profile);

    const name = String(input.name || "").trim();
    if (!name) {
      throw new LeaveHttpError("Comp-Off configuration name is required.", 400);
    }

    let compOffLeaveTypeId: string | null = input.compOffLeaveTypeId || input.leaveTypeId || null;
    if (compOffLeaveTypeId) {
      const lt = await rawPrisma.leaveType.findFirst({
        where: { id: String(compOffLeaveTypeId), tenantId },
      });
      if (!lt) {
        throw new LeaveHttpError("Designated Comp-Off Leave Type was not found.", 400);
      }
    } else {
      const existingCompLt = await rawPrisma.leaveType.findFirst({
        where: {
          tenantId,
          status: "active",
          OR: [
            { code: { in: ["COMP_OFF", "COMPOFF", "CO", "COM"] } },
            { name: { contains: "Comp", mode: "insensitive" } },
          ],
        },
      });
      if (existingCompLt) {
        compOffLeaveTypeId = existingCompLt.id;
      } else {
        const autoCreatedLt = await rawPrisma.leaveType.create({
          data: {
            tenantId,
            name: "Compensatory Off",
            code: "COMP_OFF",
            description: "Earned compensatory leave for eligible weekly-off, holiday, or overtime work",
            daysPerYear: 0,
            color: "#00a76f",
            isPaid: true,
            halfDayAllowed: true,
            status: "active",
          },
        });
        compOffLeaveTypeId = autoCreatedLt.id;
      }
    }

    const effectiveFrom = input.effectiveFrom
      ? toUtcDateOnly(input.effectiveFrom)
      : toUtcDateOnly(new Date());
    const effectiveTo = input.effectiveTo ? toUtcDateOnly(input.effectiveTo) : null;
    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new LeaveHttpError("Effective-To date cannot precede Effective-From date.", 400);
    }

    const branchId = input.branchId && input.branchId !== "all" ? String(input.branchId) : null;
    const departmentId =
      input.departmentId && input.departmentId !== "all" ? String(input.departmentId) : null;
    const enabled =
      input.enabled !== undefined
        ? Boolean(input.enabled)
        : input.isEnabled !== undefined
          ? Boolean(input.isEnabled)
          : true;

    if (enabled) {
      await this.assertNoConflictingCompOffConfig(tenantId, {
        branchId,
        departmentId,
        effectiveFrom,
        effectiveTo,
      });
    }

    const minQualifyingHours = Math.max(
      0.5,
      Number(input.minQualifyingHours ?? input.minWorkedHours ?? 4)
    );
    const halfDayHoursThreshold = Math.max(
      0.5,
      Number(input.halfDayHoursThreshold ?? input.halfDayHours ?? minQualifyingHours)
    );
    const fullDayHoursThreshold = Math.max(
      halfDayHoursThreshold,
      Number(input.fullDayHoursThreshold ?? input.fullDayHours ?? 8)
    );
    const code = input.code ? String(input.code).trim().toUpperCase() : buildConfigCode("CCFG", name);

    const created = await rawPrisma.compOffConfig.create({
      data: {
        tenantId,
        name,
        code,
        description: input.description ? String(input.description).trim() : null,
        enabled,
        status: enabled ? "active" : "inactive",
        version: 1,
        compOffLeaveTypeId,
        eligibleWorkTypes: normalizeStringArray(input.eligibleWorkTypes),
        allowWeeklyOff:
          input.allowWeeklyOff !== undefined
            ? Boolean(input.allowWeeklyOff)
            : input.allowWeeklyOffWork !== undefined
              ? Boolean(input.allowWeeklyOffWork)
              : input.weeklyOffEligible !== undefined
                ? Boolean(input.weeklyOffEligible)
                : true,
        allowPublicHoliday:
          input.allowPublicHoliday !== undefined
            ? Boolean(input.allowPublicHoliday)
            : input.allowHolidayWork !== undefined
              ? Boolean(input.allowHolidayWork)
              : input.publicHolidayEligible !== undefined
                ? Boolean(input.publicHolidayEligible)
                : true,
        allowApprovedOvertime:
          input.allowApprovedOvertime !== undefined
            ? Boolean(input.allowApprovedOvertime)
            : input.overtimeEligible !== undefined
              ? Boolean(input.overtimeEligible)
              : true,
        allowWorkdayExtraHours:
          input.allowWorkdayExtraHours !== undefined
            ? Boolean(input.allowWorkdayExtraHours)
            : Boolean(input.workdayExtraHoursEligible),
        requireAttendanceRecord:
          input.requireAttendanceRecord !== undefined
            ? Boolean(input.requireAttendanceRecord)
            : input.requireAttendanceProof !== undefined
              ? Boolean(input.requireAttendanceProof)
              : true,
        requireApprovedOvertimeForOt:
          input.requireApprovedOvertimeForOt !== undefined
            ? Boolean(input.requireApprovedOvertimeForOt)
            : input.requireApprovedOvertime !== undefined
              ? Boolean(input.requireApprovedOvertime)
              : true,
        minQualifyingHours,
        halfDayHoursThreshold,
        fullDayHoursThreshold,
        maxCreditPerDay: Math.max(
          0.5,
          Number(input.maxCreditPerDay ?? input.maxCreditDaysPerRequest ?? 1)
        ),
        maxMonthlyCredits: Math.max(0.5, Number(input.maxMonthlyCredits ?? 4)),
        maxYearlyCredits: Math.max(
          0.5,
          Number(input.maxYearlyCredits ?? input.maxAccrualBalance ?? 24)
        ),
        submissionDeadlineDays: Math.max(
          1,
          Number(input.submissionDeadlineDays ?? input.maxBackdateDays ?? 30)
        ),
        expiryDays: Math.max(1, Number(input.expiryDays ?? input.creditExpiryDays ?? 90)),
        expiryWarningDays: Math.max(
          1,
          Number(input.expiryWarningDays ?? input.preExpiryAlertDays ?? 7)
        ),
        applicableCategories: normalizeStringArray(input.applicableCategories),
        branchId,
        departmentId,
        approvalMode: String(input.approvalMode || "MANAGER_THEN_HR").toUpperCase(),
        halfDayAllowed:
          input.halfDayAllowed !== undefined
            ? Boolean(input.halfDayAllowed)
            : input.allowHalfDay !== undefined
              ? Boolean(input.allowHalfDay)
              : true,
        allowEssSubmission:
          input.allowEssSubmission !== undefined
            ? Boolean(input.allowEssSubmission)
            : input.allowSelfService !== undefined
              ? Boolean(input.allowSelfService)
              : true,
        requireSupportingDoc: Boolean(input.requireSupportingDoc),
        effectiveFrom,
        effectiveTo,
        createdById: profile.userId,
        updatedById: profile.userId,
      },
      include: { compOffLeaveType: true },
    });

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: "COMP_OFF_CONFIG_CREATED",
      entityType: "CompOffConfig",
      entityId: created.id,
      newState: created,
    });

    const [enriched] = await this.enrichConfigsWithOrgNames(tenantId, [created]);
    return enriched;
  }

  static async updateCompOffConfig(
    tenantId: string,
    configId: string,
    profile: CallerAuthorizationProfile,
    input: any
  ) {
    this.assertHrAdmin(profile);

    const existing = await rawPrisma.compOffConfig.findFirst({
      where: { id: configId, tenantId },
    });
    if (!existing) {
      throw new LeaveHttpError("Comp-Off configuration not found.", 404);
    }

    const name = input.name !== undefined ? String(input.name).trim() : existing.name;
    if (!name) {
      throw new LeaveHttpError("Comp-Off configuration name cannot be empty.", 400);
    }

    const effectiveFrom = input.effectiveFrom
      ? toUtcDateOnly(input.effectiveFrom)
      : new Date(existing.effectiveFrom);
    const effectiveTo =
      input.effectiveTo !== undefined
        ? input.effectiveTo
          ? toUtcDateOnly(input.effectiveTo)
          : null
        : existing.effectiveTo
          ? new Date(existing.effectiveTo)
          : null;
    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new LeaveHttpError("Effective-To date cannot precede Effective-From date.", 400);
    }

    const branchId =
      input.branchId !== undefined
        ? input.branchId && input.branchId !== "all"
          ? String(input.branchId)
          : null
        : existing.branchId;
    const departmentId =
      input.departmentId !== undefined
        ? input.departmentId && input.departmentId !== "all"
          ? String(input.departmentId)
          : null
        : existing.departmentId;
    const enabled =
      input.enabled !== undefined
        ? Boolean(input.enabled)
        : input.isEnabled !== undefined
          ? Boolean(input.isEnabled)
          : existing.enabled;

    if (enabled) {
      await this.assertNoConflictingCompOffConfig(tenantId, {
        branchId,
        departmentId,
        effectiveFrom,
        effectiveTo,
        excludeIds: [existing.id],
      });
    }

    const referencedCount = await rawPrisma.leaveEncashmentRequest.count({
      where: { tenantId, compOffConfigId: existing.id },
    });

    const payloadData = {
      name,
      description:
        input.description !== undefined
          ? input.description
            ? String(input.description).trim()
            : null
          : existing.description,
      enabled,
      status: enabled ? "active" : "inactive",
      compOffLeaveTypeId:
        input.compOffLeaveTypeId !== undefined || input.leaveTypeId !== undefined
          ? input.compOffLeaveTypeId || input.leaveTypeId || existing.compOffLeaveTypeId
          : existing.compOffLeaveTypeId,
      eligibleWorkTypes:
        input.eligibleWorkTypes !== undefined
          ? normalizeStringArray(input.eligibleWorkTypes)
          : (existing.eligibleWorkTypes as any),
      allowWeeklyOff:
        input.allowWeeklyOff !== undefined
          ? Boolean(input.allowWeeklyOff)
          : input.allowWeeklyOffWork !== undefined
            ? Boolean(input.allowWeeklyOffWork)
            : input.weeklyOffEligible !== undefined
              ? Boolean(input.weeklyOffEligible)
              : existing.allowWeeklyOff,
      allowPublicHoliday:
        input.allowPublicHoliday !== undefined
          ? Boolean(input.allowPublicHoliday)
          : input.allowHolidayWork !== undefined
            ? Boolean(input.allowHolidayWork)
            : input.publicHolidayEligible !== undefined
              ? Boolean(input.publicHolidayEligible)
              : existing.allowPublicHoliday,
      allowApprovedOvertime:
        input.allowApprovedOvertime !== undefined
          ? Boolean(input.allowApprovedOvertime)
          : input.overtimeEligible !== undefined
            ? Boolean(input.overtimeEligible)
            : existing.allowApprovedOvertime,
      allowWorkdayExtraHours:
        input.allowWorkdayExtraHours !== undefined
          ? Boolean(input.allowWorkdayExtraHours)
          : input.workdayExtraHoursEligible !== undefined
            ? Boolean(input.workdayExtraHoursEligible)
            : existing.allowWorkdayExtraHours,
      requireAttendanceRecord:
        input.requireAttendanceRecord !== undefined
          ? Boolean(input.requireAttendanceRecord)
          : input.requireAttendanceProof !== undefined
            ? Boolean(input.requireAttendanceProof)
            : existing.requireAttendanceRecord,
      requireApprovedOvertimeForOt:
        input.requireApprovedOvertimeForOt !== undefined
          ? Boolean(input.requireApprovedOvertimeForOt)
          : input.requireApprovedOvertime !== undefined
            ? Boolean(input.requireApprovedOvertime)
            : existing.requireApprovedOvertimeForOt,
      minQualifyingHours:
        input.minQualifyingHours !== undefined || input.minWorkedHours !== undefined
          ? Math.max(0.5, Number(input.minQualifyingHours ?? input.minWorkedHours))
          : Number(existing.minQualifyingHours),
      halfDayHoursThreshold:
        input.halfDayHoursThreshold !== undefined || input.halfDayHours !== undefined
          ? Math.max(0.5, Number(input.halfDayHoursThreshold ?? input.halfDayHours))
          : Number(existing.halfDayHoursThreshold),
      fullDayHoursThreshold:
        input.fullDayHoursThreshold !== undefined || input.fullDayHours !== undefined
          ? Math.max(0.5, Number(input.fullDayHoursThreshold ?? input.fullDayHours))
          : Number(existing.fullDayHoursThreshold),
      maxCreditPerDay:
        input.maxCreditPerDay !== undefined || input.maxCreditDaysPerRequest !== undefined
          ? Math.max(0.5, Number(input.maxCreditPerDay ?? input.maxCreditDaysPerRequest))
          : Number(existing.maxCreditPerDay),
      maxMonthlyCredits:
        input.maxMonthlyCredits !== undefined
          ? Math.max(0.5, Number(input.maxMonthlyCredits))
          : Number(existing.maxMonthlyCredits),
      maxYearlyCredits:
        input.maxYearlyCredits !== undefined || input.maxAccrualBalance !== undefined
          ? Math.max(0.5, Number(input.maxYearlyCredits ?? input.maxAccrualBalance))
          : Number(existing.maxYearlyCredits),
      submissionDeadlineDays:
        input.submissionDeadlineDays !== undefined || input.maxBackdateDays !== undefined
          ? Math.max(1, Number(input.submissionDeadlineDays ?? input.maxBackdateDays))
          : existing.submissionDeadlineDays,
      expiryDays:
        input.expiryDays !== undefined || input.creditExpiryDays !== undefined
          ? Math.max(1, Number(input.expiryDays ?? input.creditExpiryDays))
          : existing.expiryDays,
      expiryWarningDays:
        input.expiryWarningDays !== undefined || input.preExpiryAlertDays !== undefined
          ? Math.max(1, Number(input.expiryWarningDays ?? input.preExpiryAlertDays))
          : existing.expiryWarningDays,
      applicableCategories:
        input.applicableCategories !== undefined
          ? normalizeStringArray(input.applicableCategories)
          : (existing.applicableCategories as any),
      branchId,
      departmentId,
      approvalMode:
        input.approvalMode !== undefined
          ? String(input.approvalMode).toUpperCase()
          : existing.approvalMode,
      halfDayAllowed:
        input.halfDayAllowed !== undefined
          ? Boolean(input.halfDayAllowed)
          : input.allowHalfDay !== undefined
            ? Boolean(input.allowHalfDay)
            : existing.halfDayAllowed,
      allowEssSubmission:
        input.allowEssSubmission !== undefined
          ? Boolean(input.allowEssSubmission)
          : input.allowSelfService !== undefined
            ? Boolean(input.allowSelfService)
            : existing.allowEssSubmission,
      requireSupportingDoc:
        input.requireSupportingDoc !== undefined
          ? Boolean(input.requireSupportingDoc)
          : existing.requireSupportingDoc,
      effectiveFrom,
      effectiveTo,
      updatedById: profile.userId,
    };

    let result;
    if (referencedCount > 0) {
      result = await rawPrisma.$transaction(async (tx) => {
        await tx.compOffConfig.update({
          where: { id: existing.id },
          data: { status: "superseded", enabled: false, updatedById: profile.userId },
        });
        return tx.compOffConfig.create({
          data: {
            ...payloadData,
            tenantId,
            code: existing.code,
            version: existing.version + 1,
            previousVersionId: existing.id,
            createdById: existing.createdById || profile.userId,
          },
          include: { compOffLeaveType: true },
        });
      });
    } else {
      result = await rawPrisma.compOffConfig.update({
        where: { id: existing.id },
        data: { ...payloadData, version: existing.version + 1 },
        include: { compOffLeaveType: true },
      });
    }

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: "COMP_OFF_CONFIG_UPDATED",
      entityType: "CompOffConfig",
      entityId: result.id,
      oldState: existing,
      newState: result,
    });

    const [enriched] = await this.enrichConfigsWithOrgNames(tenantId, [result]);
    return enriched;
  }

  static async deactivateCompOffConfig(
    tenantId: string,
    configId: string,
    profile: CallerAuthorizationProfile
  ) {
    this.assertHrAdmin(profile);
    const existing = await rawPrisma.compOffConfig.findFirst({
      where: { id: configId, tenantId },
    });
    if (!existing) {
      throw new LeaveHttpError("Comp-Off configuration not found.", 404);
    }

    const updated = await rawPrisma.compOffConfig.update({
      where: { id: configId },
      data: { status: "inactive", enabled: false, updatedById: profile.userId },
      include: { compOffLeaveType: true },
    });

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: "COMP_OFF_CONFIG_DEACTIVATED",
      entityType: "CompOffConfig",
      entityId: configId,
      oldState: existing,
      newState: updated,
    });

    const [enriched] = await this.enrichConfigsWithOrgNames(tenantId, [updated]);
    return enriched;
  }

  // =========================================================================
  // 4. MODULE A — LEAVE ENCASHMENT ENGINE (ELIGIBILITY, CALCULATION, WORKFLOW, PAYROLL)
  // =========================================================================

  static async resolveEffectiveEncashmentConfig(
    tenantId: string,
    employee: { branchId?: string | null; departmentId?: string | null; employmentCategory?: string | null },
    effectiveDate: Date,
    leaveTypeId?: string,
    db: any = rawPrisma
  ) {
    const configs = await db.leaveEncashmentConfig.findMany({
      where: {
        tenantId,
        status: "active",
        enabled: true,
        effectiveFrom: { lte: effectiveDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveDate } }],
      },
      include: { payrollComponent: true, leaveType: true },
      orderBy: [{ version: "desc" }, { updatedAt: "desc" }],
    });

    const matching = configs.filter((cfg: any) => {
      if (cfg.branchId && cfg.branchId !== employee.branchId) return false;
      if (cfg.departmentId && cfg.departmentId !== employee.departmentId) return false;

      const cats = normalizeStringArray(cfg.applicableCategories).map((c) => c.toLowerCase());
      if (cats.length > 0 && employee.employmentCategory) {
        if (!cats.includes(String(employee.employmentCategory).toLowerCase())) return false;
      }

      if (leaveTypeId) {
        const ltIds = new Set<string>([
          ...normalizeStringArray(cfg.eligibleLeaveTypeIds),
          ...(cfg.leaveTypeId ? [cfg.leaveTypeId] : []),
        ]);
        if (!ltIds.has(leaveTypeId)) return false;
      }
      return true;
    });

    matching.sort((a: any, b: any) => {
      const scoreA = (a.branchId ? 2 : 0) + (a.departmentId ? 1 : 0);
      const scoreB = (b.branchId ? 2 : 0) + (b.departmentId ? 1 : 0);
      return scoreB - scoreA;
    });

    return matching[0] || null;
  }

  private static async resolveDivisorDays(
    tenantId: string,
    employee: { branchId?: string | null; departmentId?: string | null },
    config: { dailyRateDivisorMode: string; dailyRateDivisor: any },
    effectiveDate: Date,
    db: any = rawPrisma
  ): Promise<{ divisor: Decimal; divisorSource: string }> {
    const mode = String(config.dailyRateDivisorMode || "WORKING_DAYS").toUpperCase();

    if (mode === "CUSTOM") {
      const custom = Number(config.dailyRateDivisor || 0);
      if (!custom || custom <= 0) {
        throw new LeaveHttpError(
          "Invalid Encashment Configuration: custom daily-rate divisor is missing or zero.",
          400,
          "INVALID_DIVISOR_CONFIG"
        );
      }
      return { divisor: new Decimal(custom), divisorSource: `CUSTOM_CONFIG (${custom})` };
    }

    const year = effectiveDate.getUTCFullYear();
    const month = effectiveDate.getUTCMonth() + 1;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    if (mode === "CALENDAR_DAYS") {
      return {
        divisor: new Decimal(daysInMonth),
        divisorSource: `CALENDAR_DAYS (${String(month).padStart(2, "0")}/${year}: ${daysInMonth} days)`,
      };
    }

    // WORKING_DAYS or SALARY_STRUCTURE — dynamically derived from tenant AttendancePolicy + Holidays
    const policies = await db.attendancePolicy.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
    const matchedPolicy =
      policies.find(
        (p: any) =>
          (!p.branchId || p.branchId === employee.branchId) &&
          (!p.departmentId || p.departmentId === employee.departmentId)
      ) || policies[0];

    const workingDayTokens = matchedPolicy?.workingDays
      ? String(matchedPolicy.workingDays)
          .split(",")
          .map((d: string) => d.trim().slice(0, 3).toLowerCase())
      : ["mon", "tue", "wed", "thu", "fri"];
    const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const holidays = await db.holiday.findMany({
      where: {
        tenantId,
        status: "active",
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { date: true },
    });
    const holidayDates = new Set(
      holidays.map((h: any) => new Date(h.date).toISOString().slice(0, 10))
    );

    let workingDaysCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(Date.UTC(year, month - 1, d));
      const dow = dayNames[dt.getUTCDay()];
      const iso = dt.toISOString().slice(0, 10);
      if (workingDayTokens.includes(dow) && !holidayDates.has(iso)) {
        workingDaysCount++;
      }
    }

    if (workingDaysCount <= 0) {
      workingDaysCount = daysInMonth;
    }

    return {
      divisor: new Decimal(workingDaysCount),
      divisorSource: `${mode} (${String(month).padStart(2, "0")}/${year} Attendance Policy: ${workingDaysCount} working days)`,
    };
  }

  static async getEncashmentEligibilityForEmployee(
    tenantId: string,
    employeeId: string,
    effectiveDateInput?: string | { effectiveDate?: string; db?: any },
    dbArg: any = rawPrisma
  ) {
    const effStr =
      typeof effectiveDateInput === "string"
        ? effectiveDateInput
        : effectiveDateInput?.effectiveDate;
    const db =
      typeof effectiveDateInput === "object" && effectiveDateInput?.db
        ? effectiveDateInput.db
        : dbArg;

    const employee = await db.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: {
        department: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });
    if (!employee) {
      throw new LeaveHttpError("Employee not found in this tenant.", 404, "EMPLOYEE_NOT_FOUND");
    }

    const effDate = effStr ? toUtcDateOnly(effStr) : toUtcDateOnly(new Date());
    const year = effDate.getUTCFullYear();

    const [detailedBalances, activeConfigs, yearEncashments] = await Promise.all([
      LeaveService.getEmployeeDetailedBalances(tenantId, employeeId, year),
      db.leaveEncashmentConfig.findMany({
        where: {
          tenantId,
          status: "active",
          enabled: true,
          effectiveFrom: { lte: effDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: effDate } }],
        },
        include: { payrollComponent: true },
        orderBy: [{ version: "desc" }, { updatedAt: "desc" }],
      }),
      db.leaveEncashmentRequest.findMany({
        where: {
          tenantId,
          employeeId,
          type: "ENCASHMENT",
          status: {
            in: [
              "PENDING",
              "MANAGER_APPROVED",
              "HR_APPROVED",
              "APPROVED",
              "PAYROLL_PENDING",
              "PAYROLL_PROCESSING",
              "PAID",
            ],
          },
          OR: [
            {
              effectiveDate: {
                gte: new Date(Date.UTC(year, 0, 1)),
                lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
              },
            },
            {
              effectiveDate: null,
              createdAt: {
                gte: new Date(Date.UTC(year, 0, 1)),
                lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
              },
            },
          ],
        },
        select: { id: true, leaveTypeId: true, days: true, approvedDays: true, status: true },
      }),
    ]);

    const serviceMonths = employee.joinedAt
      ? Math.max(
          0,
          (effDate.getUTCFullYear() - new Date(employee.joinedAt).getUTCFullYear()) * 12 +
            (effDate.getUTCMonth() - new Date(employee.joinedAt).getUTCMonth())
        )
      : 999;

    const eligibleLeaveTypes: any[] = [];
    const ineligibleLeaveTypes: any[] = [];

    for (const bal of detailedBalances) {
      const matchedConfig = activeConfigs.find((cfg: any) => {
        if (cfg.branchId && cfg.branchId !== employee.branchId) return false;
        if (cfg.departmentId && cfg.departmentId !== employee.departmentId) return false;
        const cats = normalizeStringArray(cfg.applicableCategories).map((c) => c.toLowerCase());
        if (
          cats.length > 0 &&
          employee.employmentCategory &&
          !cats.includes(String(employee.employmentCategory).toLowerCase())
        ) {
          return false;
        }
        const ltIds = new Set<string>([
          ...normalizeStringArray(cfg.eligibleLeaveTypeIds),
          ...(cfg.leaveTypeId ? [cfg.leaveTypeId] : []),
        ]);
        return ltIds.has(bal.leaveTypeId);
      });

      if (!matchedConfig) {
        ineligibleLeaveTypes.push({
          leaveTypeId: bal.leaveTypeId,
          leaveTypeName: bal.leaveTypeName,
          leaveTypeCode: bal.code,
          availableBalance: bal.available,
          reason: "Not marked eligible by any active Leave Encashment Configuration.",
        });
        continue;
      }

      if (serviceMonths < Number(matchedConfig.minServiceMonths || 0)) {
        ineligibleLeaveTypes.push({
          leaveTypeId: bal.leaveTypeId,
          leaveTypeName: bal.leaveTypeName,
          leaveTypeCode: bal.code,
          availableBalance: bal.available,
          reason: `Requires minimum ${matchedConfig.minServiceMonths} month(s) of service (current: ${serviceMonths}).`,
        });
        continue;
      }

      const usedAnnualEncashment = yearEncashments
        .filter((e: any) => e.leaveTypeId === bal.leaveTypeId)
        .reduce((s: number, e: any) => s + Number(e.approvedDays ?? e.days ?? 0), 0);

      const minRetained = Number(matchedConfig.minRetainedBalance || 0);
      const minRemainingReq = Number(matchedConfig.minRemainingBalance || 0);
      const maxPerReq = Number(matchedConfig.maxEncashableDaysPerRequest || 0);
      const annualMax = Number(matchedConfig.maxEncashableDaysPerYear || maxPerReq);
      const remainingAnnualQuota = Math.max(0, annualMax - usedAnnualEncashment);

      const maxByRetained = Math.max(0, bal.available - minRetained);
      const maxRequestableNow = Number(
        Math.max(0, Math.min(maxByRetained, maxPerReq, remainingAnnualQuota)).toFixed(2)
      );

      eligibleLeaveTypes.push({
        leaveTypeId: bal.leaveTypeId,
        leaveTypeName: bal.leaveTypeName,
        leaveTypeCode: bal.code,
        color: bal.color,
        availableBalance: bal.available,
        minRemainingBalanceRequired: minRemainingReq,
        minRetainedBalance: minRetained,
        maxEncashableDaysPerRequest: maxPerReq,
        annualMaxDays: annualMax,
        usedAnnualEncashmentDays: Number(usedAnnualEncashment.toFixed(2)),
        remainingAnnualQuotaDays: Number(remainingAnnualQuota.toFixed(2)),
        maxRequestableNow,
        canSubmitNow: bal.available >= minRemainingReq && maxRequestableNow >= 0.5,
        config: {
          id: matchedConfig.id,
          name: matchedConfig.name,
          version: matchedConfig.version,
          frequency: matchedConfig.encashmentFrequency,
          salaryBasis: matchedConfig.salaryBasisType,
          divisorMode: matchedConfig.dailyRateDivisorMode,
          customDivisor:
            matchedConfig.dailyRateDivisor !== null
              ? Number(matchedConfig.dailyRateDivisor)
              : null,
          allowSelfService: matchedConfig.allowEssSubmission,
          requireSupportingDoc: matchedConfig.requireSupportingDoc,
          salaryComponent: matchedConfig.payrollComponent
            ? {
                id: matchedConfig.payrollComponent.id,
                code: matchedConfig.payrollComponent.code,
                name: matchedConfig.payrollComponent.name,
              }
            : null,
        },
      });
    }

    return {
      employee: {
        id: employee.id,
        fullName: `${employee.firstName} ${employee.lastName}`.trim(),
        employeeCode: employee.employeeCode,
        department: employee.department?.name || null,
        branch: employee.branch?.name || null,
        serviceMonths,
      },
      effectiveDate: effDate.toISOString().slice(0, 10),
      eligibleLeaveTypes,
      ineligibleLeaveTypes,
    };
  }

  static async calculateEncashmentPreview(
    tenantId: string,
    params: {
      employeeId: string;
      leaveTypeId: string;
      requestedDays: number;
      effectiveDate?: string;
      excludeEncashmentId?: string;
      isSelfService?: boolean;
      db?: any;
    }
  ) {
    const db = params.db || rawPrisma;
    const requestedDays = assertValidRequestedDays(params.requestedDays, true);
    const effDate = params.effectiveDate
      ? toUtcDateOnly(params.effectiveDate)
      : toUtcDateOnly(new Date());
    const year = effDate.getUTCFullYear();

    const [tenant, employee, leaveType] = await Promise.all([
      db.tenant.findUnique({ where: { id: tenantId }, select: { currency: true } }),
      db.employee.findFirst({
        where: { id: params.employeeId, tenantId },
        include: {
          salaryAssignments: {
            where: { isCurrent: true },
            include: { items: { include: { component: true } } },
            orderBy: { effectiveFrom: "desc" },
            take: 1,
          },
        },
      }),
      db.leaveType.findFirst({
        where: { id: params.leaveTypeId, tenantId, status: "active" },
      }),
    ]);

    if (!employee) {
      throw new LeaveHttpError("Employee does not belong to the authenticated tenant.", 404);
    }
    if (!leaveType) {
      throw new LeaveHttpError("Leave type not found or inactive.", 404);
    }

    const config = await this.resolveEffectiveEncashmentConfig(
      tenantId,
      employee,
      effDate,
      params.leaveTypeId,
      db
    );
    if (!config || !config.enabled) {
      throw new LeaveHttpError(
        `Leave type "${leaveType.name}" is not eligible for encashment under any active tenant configuration.`,
        400,
        "INELIGIBLE_LEAVE_TYPE"
      );
    }

    if (params.isSelfService && !config.allowEssSubmission) {
      throw new LeaveHttpError(
        "Employee self-service submission is disabled under the active Leave Encashment Policy.",
        403,
        "ESS_ENCASHMENT_DISABLED"
      );
    }

    if (employee.joinedAt) {
      const joined = new Date(employee.joinedAt);
      const monthsServed =
        (effDate.getUTCFullYear() - joined.getUTCFullYear()) * 12 +
        (effDate.getUTCMonth() - joined.getUTCMonth());
      if (monthsServed < Number(config.minServiceMonths || 0)) {
        throw new LeaveHttpError(
          `Employee has completed ${Math.max(0, monthsServed)} month(s) of service; minimum required is ${config.minServiceMonths} month(s).`,
          400,
          "MIN_SERVICE_NOT_MET"
        );
      }
    }

    const availableBalance = await LeaveService.getEmployeeBalance(
      tenantId,
      params.employeeId,
      params.leaveTypeId,
      year,
      { tx: db, excludeEncashmentId: params.excludeEncashmentId }
    );

    const minRemainingBalance = Number(config.minRemainingBalance || 0);
    if (availableBalance < minRemainingBalance) {
      throw new LeaveHttpError(
        `Available balance (${availableBalance} days) is below the policy minimum balance threshold (${minRemainingBalance} days) required to initiate encashment.`,
        400,
        "MIN_BALANCE_NOT_MET"
      );
    }

    if (requestedDays > availableBalance) {
      throw new LeaveHttpError(
        `Requested days (${requestedDays}) exceed authoritative available balance (${availableBalance}).`,
        400,
        "EXCEEDS_AVAILABLE_BALANCE"
      );
    }

    const maxPerReq = Number(config.maxEncashableDaysPerRequest || 0);
    if (maxPerReq > 0 && requestedDays > maxPerReq) {
      throw new LeaveHttpError(
        `Requested days (${requestedDays}) exceed policy maximum encashable days per request (${maxPerReq}).`,
        400,
        "EXCEEDS_POLICY_MAX"
      );
    }

    const retainedBalance = Number((availableBalance - requestedDays).toFixed(2));
    const minRetained = Number(config.minRetainedBalance || 0);
    if (retainedBalance < minRetained) {
      throw new LeaveHttpError(
        `Retained balance after encashment (${retainedBalance} days) violates minimum retained balance policy (${minRetained} days).`,
        400,
        "MIN_RETAINED_BALANCE_VIOLATION"
      );
    }

    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    const existingYearRequests = await db.leaveEncashmentRequest.findMany({
      where: {
        tenantId,
        employeeId: params.employeeId,
        leaveTypeId: params.leaveTypeId,
        type: "ENCASHMENT",
        ...(params.excludeEncashmentId ? { id: { not: params.excludeEncashmentId } } : {}),
        status: {
          in: [
            "PENDING",
            "MANAGER_APPROVED",
            "HR_APPROVED",
            "APPROVED",
            "PAYROLL_PENDING",
            "PAYROLL_PROCESSING",
            "PAID",
          ],
        },
        OR: [
          { effectiveDate: { gte: yearStart, lte: yearEnd } },
          { effectiveDate: null, createdAt: { gte: yearStart, lte: yearEnd } },
        ],
      },
      select: { id: true, days: true, approvedDays: true, effectiveDate: true, createdAt: true },
    });

    const annualMaxDays = Number(config.maxEncashableDaysPerYear || 0);
    const alreadyEncashedThisYear = existingYearRequests.reduce(
      (s: number, r: any) => s + Number(r.approvedDays ?? r.days ?? 0),
      0
    );
    if (annualMaxDays > 0 && alreadyEncashedThisYear + requestedDays > annualMaxDays) {
      throw new LeaveHttpError(
        `Annual encashment limit exceeded: ${alreadyEncashedThisYear} day(s) already encashed/pending in ${year} + ${requestedDays} requested exceeds annual cap of ${annualMaxDays} day(s).`,
        400,
        "ANNUAL_LIMIT_EXCEEDED"
      );
    }

    const freq = String(config.encashmentFrequency || "ANNUAL").toUpperCase();
    if (freq === "ONCE_PER_YEAR" && existingYearRequests.length >= 1) {
      throw new LeaveHttpError(
        `Policy permits only one encashment request per year (${year}).`,
        400,
        "FREQUENCY_LIMIT_EXCEEDED"
      );
    }

    // Resolve Employee's Eligible Salary Basis using Decimal arithmetic
    const currentAssignment = employee.salaryAssignments?.[0];
    const items = currentAssignment?.items || [];
    const basisMode = String(config.salaryBasisType || "BASIC").toUpperCase();

    let monthlyBasis = new Decimal(0);
    const includedComponents: Array<{ code: string; name: string; monthlyAmount: number }> = [];

    if (items.length > 0) {
      if (basisMode === "GROSS") {
        for (const item of items) {
          if (item.component?.type === "earning") {
            const amt = new Decimal(item.monthlyAmount || 0);
            monthlyBasis = monthlyBasis.plus(amt);
            includedComponents.push({
              code: item.component.code,
              name: item.component.name,
              monthlyAmount: amt.toDecimalPlaces(2).toNumber(),
            });
          }
        }
      } else if (basisMode === "BASIC_PLUS_DA") {
        for (const item of items) {
          const code = String(item.component?.code || "").toUpperCase();
          if (code === "BASIC" || code === "DA" || code.includes("DEARNESS")) {
            const amt = new Decimal(item.monthlyAmount || 0);
            monthlyBasis = monthlyBasis.plus(amt);
            includedComponents.push({
              code: item.component.code,
              name: item.component.name,
              monthlyAmount: amt.toDecimalPlaces(2).toNumber(),
            });
          }
        }
      } else if (basisMode === "CUSTOM_COMPONENTS") {
        const wantedCodes = new Set(
          normalizeStringArray(config.salaryComponentCodes).map((x) => x.toUpperCase())
        );
        for (const item of items) {
          const code = String(item.component?.code || "").toUpperCase();
          if (wantedCodes.has(code) || wantedCodes.has(String(item.componentId))) {
            const amt = new Decimal(item.monthlyAmount || 0);
            monthlyBasis = monthlyBasis.plus(amt);
            includedComponents.push({
              code: item.component.code,
              name: item.component.name,
              monthlyAmount: amt.toDecimalPlaces(2).toNumber(),
            });
          }
        }
      } else {
        for (const item of items) {
          const code = String(item.component?.code || "").toUpperCase();
          if (code === "BASIC" || String(item.component?.name || "").toLowerCase().includes("basic")) {
            const amt = new Decimal(item.monthlyAmount || 0);
            monthlyBasis = monthlyBasis.plus(amt);
            includedComponents.push({
              code: item.component.code,
              name: item.component.name,
              monthlyAmount: amt.toDecimalPlaces(2).toNumber(),
            });
          }
        }
      }
    }

    if (monthlyBasis.lte(0)) {
      const fallbackMonthly = currentAssignment?.ctcMonthly
        ? new Decimal(currentAssignment.ctcMonthly)
        : employee.salary
          ? new Decimal(employee.salary)
          : new Decimal(0);

      if (fallbackMonthly.lte(0)) {
        throw new LeaveHttpError(
          "Cannot compute encashment: employee does not have an active salary assignment or configured base salary.",
          400,
          "MISSING_EMPLOYEE_SALARY"
        );
      }

      if (basisMode === "BASIC" || basisMode === "BASIC_PLUS_DA") {
        monthlyBasis = fallbackMonthly.times("0.5").toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        includedComponents.push({
          code: "BASIC",
          name: "Basic Salary (50% of CTC structure)",
          monthlyAmount: monthlyBasis.toNumber(),
        });
      } else {
        monthlyBasis = fallbackMonthly.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        includedComponents.push({
          code: "GROSS",
          name: "Monthly Gross Compensation",
          monthlyAmount: monthlyBasis.toNumber(),
        });
      }
    }

    const { divisor, divisorSource } = await this.resolveDivisorDays(
      tenantId,
      employee,
      config,
      effDate,
      db
    );

    const dailyRate = monthlyBasis.dividedBy(divisor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const grossEncashment = dailyRate
      .times(new Decimal(requestedDays))
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const adjustments = new Decimal(0);
    const finalPayable = grossEncashment.plus(adjustments).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const currency = tenant?.currency || "INR";

    const snapshot = {
      computedAt: new Date().toISOString(),
      effectiveDate: effDate.toISOString().slice(0, 10),
      currency,
      policyConfigId: config.id,
      policyConfigName: config.name,
      policyVersion: config.version,
      salaryBasisMode: basisMode,
      includedSalaryComponents: includedComponents,
      eligibleMonthlyBasis: monthlyBasis.toNumber(),
      dailyRateDivisor: divisor.toNumber(),
      divisorSource,
      unitDailyRate: dailyRate.toNumber(),
      availableBalanceBefore: availableBalance,
      encashableDays: requestedDays,
      retainedBalanceAfter: retainedBalance,
      grossEncashmentAmount: grossEncashment.toNumber(),
      adjustmentsAmount: adjustments.toNumber(),
      finalPayableAmount: finalPayable.toNumber(),
      mappedSalaryComponent: config.payrollComponent
        ? {
            id: config.payrollComponent.id,
            code: config.payrollComponent.code,
            name: config.payrollComponent.name,
            isTaxable: config.payrollComponent.isTaxable,
          }
        : null,
      formulaDescription: `(${basisMode} Monthly Basis ${currency} ${monthlyBasis.toFixed(2)} ÷ ${divisor.toNumber()} [${divisorSource}]) × ${requestedDays} day(s) = ${currency} ${finalPayable.toFixed(2)}`,
    };

    return {
      config,
      employee: {
        id: employee.id,
        fullName: `${employee.firstName} ${employee.lastName}`.trim(),
        employeeCode: employee.employeeCode,
        managerId: employee.managerId,
      },
      leaveType: {
        id: leaveType.id,
        name: leaveType.name,
        code: leaveType.code,
      },
      currency,
      availableBalance,
      requestedDays,
      retainedBalance,
      salaryBasisType: basisMode,
      salaryBasisAmount: monthlyBasis.toNumber(),
      eligibleSalaryBasis: monthlyBasis.toNumber(),
      divisorMode: config.dailyRateDivisorMode,
      divisor: divisor.toNumber(),
      dailyRateDivisor: divisor.toNumber(),
      dailyRate: dailyRate.toNumber(),
      unitDailyRate: dailyRate.toNumber(),
      grossAmount: grossEncashment.toNumber(),
      adjustmentsAmount: adjustments.toNumber(),
      netPayableAmount: finalPayable.toNumber(),
      totalAmount: finalPayable.toNumber(),
      salaryComponent: config.payrollComponent || null,
      calculationSnapshot: snapshot,
    };
  }

  static async createEncashmentRequest(
    tenantId: string,
    profile: CallerAuthorizationProfile,
    input: {
      employeeId?: string;
      leaveTypeId: string;
      days: number;
      reason: string;
      effectiveDate?: string;
      attachmentUrl?: string | null;
      supportingDocUrl?: string | null;
      submitAsDraft?: boolean;
      idempotencyKey?: string;
    },
    options?: { selfOnly?: boolean }
  ) {
    const isSelfOnly = Boolean(options?.selfOnly);
    const targetEmployeeId = isSelfOnly
      ? profile.employeeId
      : input.employeeId || profile.employeeId;
    if (!targetEmployeeId) {
      throw new LeaveHttpError("Employee is required to create an encashment request.", 400);
    }

    if (
      !isSelfOnly &&
      targetEmployeeId !== profile.employeeId &&
      !profile.isHrAdmin &&
      !profile.isHrManager
    ) {
      throw new LeaveHttpError(
        "Forbidden: Only HR Administrators or HR Managers can create encashment requests on behalf of another employee.",
        403,
        "UNAUTHORIZED_ON_BEHALF"
      );
    }

    const reason = String(input.reason || "").trim();
    if (!reason) {
      throw new LeaveHttpError("Encashment request reason is required.", 400);
    }

    const docUrl = input.supportingDocUrl ?? input.attachmentUrl ?? null;
    if (docUrl && String(docUrl).startsWith("blob:")) {
      throw new LeaveHttpError(
        "Invalid supporting document URL: browser blob URLs cannot be persisted.",
        400
      );
    }

    if (input.idempotencyKey) {
      const existingByKey = await rawPrisma.leaveEncashmentRequest.findFirst({
        where: { tenantId, idempotencyKey: String(input.idempotencyKey).trim() },
        include: { employee: true, leaveType: true, payrollComponent: true },
      });
      if (existingByKey) return this.formatRequestRecord(existingByKey, profile);
    }

    const isSelfSubmission = isSelfOnly || targetEmployeeId === profile.employeeId;
    const effectiveDate = input.effectiveDate
      ? toUtcDateOnly(input.effectiveDate)
      : toUtcDateOnly(new Date());

    const created = await rawPrisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM employees WHERE id = ${targetEmployeeId} AND tenant_id = ${tenantId} FOR UPDATE`;

      const preview = await this.calculateEncashmentPreview(tenantId, {
        employeeId: targetEmployeeId,
        leaveTypeId: input.leaveTypeId,
        requestedDays: input.days,
        effectiveDate: effectiveDate.toISOString().slice(0, 10),
        isSelfService: isSelfSubmission && !profile.isHrAdmin,
        db: tx,
      });

      if (preview.config.requireSupportingDoc && !docUrl && !input.submitAsDraft) {
        throw new LeaveHttpError(
          "Supporting document is mandatory under the active Leave Encashment Configuration.",
          400,
          "SUPPORTING_DOCUMENT_REQUIRED"
        );
      }

      const duplicatePending = await tx.leaveEncashmentRequest.findFirst({
        where: {
          tenantId,
          employeeId: targetEmployeeId,
          leaveTypeId: input.leaveTypeId,
          type: "ENCASHMENT",
          status: { in: ENCASHMENT_PENDING_STATUSES },
          effectiveDate,
          days: preview.requestedDays,
        },
        select: { id: true, requestCode: true },
      });
      if (duplicatePending) {
        throw new LeaveHttpError(
          `A matching pending encashment request (${duplicatePending.requestCode || duplicatePending.id.slice(0, 8)}) already exists for this date and quantity.`,
          409,
          "DUPLICATE_ENCASHMENT_REQUEST"
        );
      }

      const status = input.submitAsDraft ? "DRAFT" : "PENDING";
      const requestCode = buildRequestCode("ENC");

      const rec = await tx.leaveEncashmentRequest.create({
        data: {
          tenantId,
          requestCode,
          employeeId: targetEmployeeId,
          leaveTypeId: input.leaveTypeId,
          type: "ENCASHMENT",
          days: preview.requestedDays,
          reason,
          status,
          effectiveDate,
          supportingDocUrl: docUrl || null,
          submittedById: profile.userId,
          submittedAt: status === "PENDING" ? new Date() : null,
          managerId: preview.employee.managerId || null,
          availableBalanceSnapshot: preview.availableBalance,
          retainedBalanceSnapshot: preview.retainedBalance,
          salaryBasisType: preview.salaryBasisType,
          salaryBasisAmount: preview.salaryBasisAmount,
          dailyRateDivisor: preview.dailyRateDivisor,
          dailyRate: preview.dailyRate,
          grossAmount: preview.grossAmount,
          adjustmentsAmount: preview.adjustmentsAmount,
          netPayableAmount: preview.netPayableAmount,
          currency: preview.currency,
          calculationSnapshot: preview.calculationSnapshot,
          payrollComponentId: preview.config.payrollComponentId || null,
          encashmentConfigId: preview.config.id,
          configVersion: preview.config.version,
          idempotencyKey: input.idempotencyKey ? String(input.idempotencyKey).trim() : null,
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              userId: true,
              managerId: true,
              department: { select: { id: true, name: true } },
              branch: { select: { id: true, name: true } },
            },
          },
          leaveType: true,
          payrollComponent: true,
        },
      });

      await tx.leaveEncashmentCompOffEvent.create({
        data: {
          tenantId,
          requestId: rec.id,
          employeeId: targetEmployeeId,
          transactionType: "ENCASHMENT",
          eventType: status === "DRAFT" ? "DRAFT_SAVED" : "SUBMITTED",
          actorId: profile.userId,
          actorName: profile.email,
          actorRole: profile.roles[0] || "employee",
          fromStatus: null,
          toStatus: status,
          days: preview.requestedDays,
          amount: preview.netPayableAmount,
          comments: reason,
          metadataJson: {
            requestCode,
            effectiveDate: effectiveDate.toISOString().slice(0, 10),
            retainedBalance: preview.retainedBalance,
          },
        },
      });

      return rec;
    });

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: created.status === "DRAFT" ? "ENCASHMENT_DRAFT_CREATED" : "ENCASHMENT_REQUEST_CREATED",
      entityType: "LeaveEncashmentRequest",
      entityId: created.id,
      newState: {
        requestCode: created.requestCode,
        employeeId: created.employeeId,
        leaveTypeId: created.leaveTypeId,
        days: Number(created.days),
        netPayableAmount: Number(created.netPayableAmount),
        status: created.status,
      },
    });

    if (created.status === "PENDING") {
      const empName = `${created.employee.firstName} ${created.employee.lastName}`.trim();
      if (created.employee.managerId) {
        rawPrisma.employee
          .findUnique({ where: { id: created.employee.managerId }, select: { userId: true } })
          .then((mgr) => {
            if (mgr?.userId && mgr.userId !== profile.userId) {
              return NotificationService.createNotification({
                tenantId,
                userId: mgr.userId,
                title: "Encashment Request Submitted",
                message: `${empName} submitted a leave encashment request (${created.requestCode}) for ${Number(created.days)} day(s).`,
                type: "ENCASHMENT_SUBMITTED",
                actionUrl: "/hr/leave/encashment-compoff",
              });
            }
          })
          .catch(() => {});
      }

      void this.notifyHrUsers(
        tenantId,
        "Encashment Request Submitted",
        `${empName} submitted leave encashment request ${created.requestCode} (${Number(created.days)} day(s)).`,
        "ENCASHMENT_SUBMITTED",
        profile.userId
      );

      broadcastToTenant(tenantId, "leave.encashment.submitted", {
        id: created.id,
        requestCode: created.requestCode,
        employeeId: created.employeeId,
      });
    }

    return this.formatRequestRecord(created, profile);
  }

  static async updateEncashmentRequest(
    tenantId: string,
    requestId: string,
    profile: CallerAuthorizationProfile,
    input: {
      leaveTypeId?: string;
      days?: number;
      reason?: string;
      effectiveDate?: string;
      attachmentUrl?: string | null;
      supportingDocUrl?: string | null;
      submitNow?: boolean;
    },
    options?: { selfOnly?: boolean }
  ) {
    const existing = await rawPrisma.leaveEncashmentRequest.findFirst({
      where: { id: requestId, tenantId, type: "ENCASHMENT" },
      include: { employee: true },
    });
    if (!existing) {
      throw new LeaveHttpError("Encashment request not found.", 404);
    }

    const isOwner = Boolean(profile.employeeId && profile.employeeId === existing.employeeId);
    if (options?.selfOnly && !isOwner) {
      throw new LeaveHttpError("Forbidden: You can only update your own encashment request.", 403);
    }
    if (!isOwner && !profile.isHrAdmin && !profile.isHrManager) {
      throw new LeaveHttpError(
        "Forbidden: Insufficient permissions to edit this encashment request.",
        403
      );
    }

    if (!["DRAFT", "PENDING", "CLARIFICATION_REQUESTED"].includes(existing.status)) {
      throw new LeaveHttpError(
        `Cannot edit encashment request in status "${existing.status}". Only DRAFT, PENDING, or CLARIFICATION_REQUESTED requests can be modified.`,
        400,
        "INVALID_EDIT_STATE"
      );
    }

    const nextLeaveTypeId = input.leaveTypeId || existing.leaveTypeId;
    const nextDays = input.days !== undefined ? Number(input.days) : Number(existing.days);
    const nextReason =
      input.reason !== undefined ? String(input.reason).trim() : String(existing.reason || "");
    if (!nextReason) {
      throw new LeaveHttpError("Encashment request reason is required.", 400);
    }

    const nextEffDate = input.effectiveDate
      ? toUtcDateOnly(input.effectiveDate)
      : existing.effectiveDate
        ? new Date(existing.effectiveDate)
        : toUtcDateOnly(new Date());

    const nextDocUrl =
      input.supportingDocUrl !== undefined
        ? input.supportingDocUrl
        : input.attachmentUrl !== undefined
          ? input.attachmentUrl
          : existing.supportingDocUrl;

    const updated = await rawPrisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM employees WHERE id = ${existing.employeeId} AND tenant_id = ${tenantId} FOR UPDATE`;

      const preview = await this.calculateEncashmentPreview(tenantId, {
        employeeId: existing.employeeId,
        leaveTypeId: nextLeaveTypeId,
        requestedDays: nextDays,
        effectiveDate: nextEffDate.toISOString().slice(0, 10),
        excludeEncashmentId: existing.id,
        isSelfService: isOwner && !profile.isHrAdmin,
        db: tx,
      });

      const willSubmit =
        Boolean(input.submitNow) ||
        existing.status === "PENDING" ||
        (existing.status === "CLARIFICATION_REQUESTED" && input.submitNow !== false);

      if (preview.config.requireSupportingDoc && !nextDocUrl && willSubmit) {
        throw new LeaveHttpError(
          "Supporting document is mandatory under the active Leave Encashment Configuration.",
          400,
          "SUPPORTING_DOCUMENT_REQUIRED"
        );
      }

      const nextStatus = willSubmit ? "PENDING" : "DRAFT";

      const rec = await tx.leaveEncashmentRequest.update({
        where: { id: existing.id },
        data: {
          leaveTypeId: nextLeaveTypeId,
          days: preview.requestedDays,
          reason: nextReason,
          effectiveDate: nextEffDate,
          supportingDocUrl: nextDocUrl || null,
          status: nextStatus,
          submittedAt: willSubmit && !existing.submittedAt ? new Date() : existing.submittedAt,
          availableBalanceSnapshot: preview.availableBalance,
          retainedBalanceSnapshot: preview.retainedBalance,
          salaryBasisType: preview.salaryBasisType,
          salaryBasisAmount: preview.salaryBasisAmount,
          dailyRateDivisor: preview.dailyRateDivisor,
          dailyRate: preview.dailyRate,
          grossAmount: preview.grossAmount,
          adjustmentsAmount: preview.adjustmentsAmount,
          netPayableAmount: preview.netPayableAmount,
          currency: preview.currency,
          calculationSnapshot: preview.calculationSnapshot,
          payrollComponentId: preview.config.payrollComponentId || existing.payrollComponentId,
          encashmentConfigId: preview.config.id,
          configVersion: preview.config.version,
        },
        include: { employee: true, leaveType: true, payrollComponent: true },
      });

      await tx.leaveEncashmentCompOffEvent.create({
        data: {
          tenantId,
          requestId: existing.id,
          employeeId: existing.employeeId,
          transactionType: "ENCASHMENT",
          eventType: willSubmit && existing.status !== "PENDING" ? "RESUBMITTED" : "UPDATED",
          actorId: profile.userId,
          actorName: profile.email,
          actorRole: profile.roles[0] || "employee",
          fromStatus: existing.status,
          toStatus: nextStatus,
          days: preview.requestedDays,
          amount: preview.netPayableAmount,
          comments: nextReason,
        },
      });

      return rec;
    });

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: "ENCASHMENT_REQUEST_UPDATED",
      entityType: "LeaveEncashmentRequest",
      entityId: requestId,
      oldState: {
        days: Number(existing.days),
        status: existing.status,
        netPayableAmount: Number(existing.netPayableAmount),
      },
      newState: {
        days: Number(updated.days),
        status: updated.status,
        netPayableAmount: Number(updated.netPayableAmount),
      },
    });

    return this.formatRequestRecord(updated, profile);
  }

  static async decideEncashmentRequest(
    tenantId: string,
    requestId: string,
    profile: CallerAuthorizationProfile,
    params: {
      action: "approve" | "reject" | "request_clarification";
      comments?: string;
      approvedDays?: number;
    }
  ) {
    const request = await rawPrisma.leaveEncashmentRequest.findFirst({
      where: { id: requestId, tenantId, type: "ENCASHMENT" },
      include: {
        employee: true,
        leaveType: true,
        encashmentConfig: true,
      },
    });
    if (!request) {
      throw new LeaveHttpError("Encashment request not found.", 404);
    }

    this.assertNotSelfApproval(profile, request.employee);

    const isDirectManager = profile.directReportIds.includes(request.employeeId);
    if (!profile.isHrAdmin && !profile.isHrManager && !isDirectManager) {
      throw new LeaveHttpError(
        "Forbidden: Only authorized Reporting Managers, HR Managers, or HR Admins can review this encashment request.",
        403,
        "UNAUTHORIZED_APPROVER"
      );
    }

    if (!["PENDING", "MANAGER_APPROVED", "HR_APPROVED"].includes(request.status)) {
      throw new LeaveHttpError(
        `Cannot review encashment request in status "${request.status}".`,
        409,
        "INVALID_DECISION_STATE"
      );
    }

    const comments = String(params.comments || "").trim();

    if (params.action === "reject") {
      if (!comments) {
        throw new LeaveHttpError(
          "A rejection reason is mandatory when rejecting an encashment request.",
          400
        );
      }

      const rejected = await rawPrisma.$transaction(async (tx) => {
        const claimed = await tx.leaveEncashmentRequest.updateMany({
          where: { id: requestId, tenantId, status: request.status },
          data: {
            status: "REJECTED",
            approverId: profile.userId,
            rejectionReason: comments,
          },
        });
        if (claimed.count === 0) {
          throw new LeaveHttpError("Request was already processed by another reviewer.", 409);
        }

        await tx.leaveEncashmentCompOffEvent.create({
          data: {
            tenantId,
            requestId,
            employeeId: request.employeeId,
            transactionType: "ENCASHMENT",
            eventType: "REJECTED",
            actorId: profile.userId,
            actorName: profile.email,
            actorRole: profile.roles[0] || "reviewer",
            fromStatus: request.status,
            toStatus: "REJECTED",
            days: Number(request.days),
            comments,
          },
        });

        return tx.leaveEncashmentRequest.findUnique({
          where: { id: requestId },
          include: { employee: true, leaveType: true, payrollComponent: true },
        });
      });

      if (request.employee.userId) {
        NotificationService.createNotification({
          tenantId,
          userId: request.employee.userId,
          title: "Encashment Request Rejected",
          message: `Your leave encashment request (${request.requestCode || requestId.slice(0, 8)}) was rejected. Reason: ${comments}`,
          type: "ENCASHMENT_REJECTED",
          actionUrl: "/me/leave/encashment-compoff",
        }).catch(() => {});
      }

      await AuditService.logMutation({
        tenantId,
        actorId: profile.userId,
        actorEmail: profile.email,
        action: "ENCASHMENT_REQUEST_REJECTED",
        entityType: "LeaveEncashmentRequest",
        entityId: requestId,
        oldState: { status: request.status },
        newState: { status: "REJECTED", rejectionReason: comments },
      });

      return this.formatRequestRecord(rejected!, profile);
    }

    if (params.action === "request_clarification") {
      if (!comments) {
        throw new LeaveHttpError(
          "Please specify the clarification needed from the employee.",
          400
        );
      }

      const clarified = await rawPrisma.$transaction(async (tx) => {
        const rec = await tx.leaveEncashmentRequest.update({
          where: { id: requestId },
          data: {
            status: "CLARIFICATION_REQUESTED",
            clarificationNote: comments,
          },
          include: { employee: true, leaveType: true, payrollComponent: true },
        });

        await tx.leaveEncashmentCompOffEvent.create({
          data: {
            tenantId,
            requestId,
            employeeId: request.employeeId,
            transactionType: "ENCASHMENT",
            eventType: "CLARIFICATION_REQUESTED",
            actorId: profile.userId,
            actorName: profile.email,
            actorRole: profile.roles[0] || "reviewer",
            fromStatus: request.status,
            toStatus: "CLARIFICATION_REQUESTED",
            comments,
          },
        });
        return rec;
      });

      if (request.employee.userId) {
        NotificationService.createNotification({
          tenantId,
          userId: request.employee.userId,
          title: "Clarification Requested on Encashment",
          message: `Reviewer requested clarification on your encashment request (${request.requestCode || requestId.slice(0, 8)}): ${comments}`,
          type: "ENCASHMENT_CLARIFICATION",
          actionUrl: "/me/leave/encashment-compoff",
        }).catch(() => {});
      }

      await AuditService.logMutation({
        tenantId,
        actorId: profile.userId,
        actorEmail: profile.email,
        action: "ENCASHMENT_CLARIFICATION_REQUESTED",
        entityType: "LeaveEncashmentRequest",
        entityId: requestId,
        oldState: { status: request.status },
        newState: { status: "CLARIFICATION_REQUESTED", clarificationNote: comments },
      });

      return this.formatRequestRecord(clarified, profile);
    }

    // APPROVE ACTION — Evaluate multi-level approval matrix
    const stages = resolveApprovalStagesFromMode(request.encashmentConfig?.approvalMode);
    const requiresHrStage = stages.length === 0 || stages.includes("HR");
    const requiresManagerStage = stages.includes("MANAGER") && Boolean(request.employee.managerId);

    if (!profile.isHrAdmin && !profile.isHrManager && isDirectManager && requiresHrStage) {
      if (request.status !== "PENDING") {
        throw new LeaveHttpError(
          `Manager approval was already recorded (current status: ${request.status}). Waiting for HR approval.`,
          409
        );
      }

      const mgrApproved = await rawPrisma.$transaction(async (tx) => {
        const claimed = await tx.leaveEncashmentRequest.updateMany({
          where: { id: requestId, tenantId, status: "PENDING" },
          data: {
            status: "MANAGER_APPROVED",
            managerApproverId: profile.userId,
            managerApprovedAt: new Date(),
            managerComments: comments || null,
          },
        });
        if (claimed.count === 0) {
          throw new LeaveHttpError("Request was already updated by another reviewer.", 409);
        }

        await tx.leaveEncashmentCompOffEvent.create({
          data: {
            tenantId,
            requestId,
            employeeId: request.employeeId,
            transactionType: "ENCASHMENT",
            eventType: "MANAGER_APPROVED",
            actorId: profile.userId,
            actorName: profile.email,
            actorRole: "reporting_manager",
            fromStatus: "PENDING",
            toStatus: "MANAGER_APPROVED",
            days: Number(request.days),
            comments: comments || "Approved by Reporting Manager",
          },
        });

        return tx.leaveEncashmentRequest.findUnique({
          where: { id: requestId },
          include: { employee: true, leaveType: true, payrollComponent: true },
        });
      });

      void this.notifyHrUsers(
        tenantId,
        "Encashment Manager-Approved — Awaiting HR Approval",
        `Encashment request ${request.requestCode} for ${request.employee.firstName} ${request.employee.lastName} was approved by their manager and awaits HR final approval.`,
        "ENCASHMENT_APPROVED",
        profile.userId
      );

      await AuditService.logMutation({
        tenantId,
        actorId: profile.userId,
        actorEmail: profile.email,
        action: "ENCASHMENT_MANAGER_APPROVED",
        entityType: "LeaveEncashmentRequest",
        entityId: requestId,
        oldState: { status: "PENDING" },
        newState: { status: "MANAGER_APPROVED" },
      });

      return this.formatRequestRecord(mgrApproved!, profile);
    }

    // Final Approval -> Lock employee row, re-verify balance & snapshot, create ENCASHMENT LeaveLedgerEntry!
    // Never mark PAID on approval — transitions to APPROVED with payrollStatus: AWAITING_PAYROLL
    const effDate = request.effectiveDate
      ? new Date(request.effectiveDate)
      : toUtcDateOnly(new Date());
    await AttendanceService.assertMonthUnlocked(tenantId, effDate);

    const finalDays =
      params.approvedDays !== undefined
        ? assertValidRequestedDays(params.approvedDays, true)
        : Number(request.days);

    const approved = await rawPrisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM employees WHERE id = ${request.employeeId} AND tenant_id = ${tenantId} FOR UPDATE`;

      const verifiedCalc = await this.calculateEncashmentPreview(tenantId, {
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        requestedDays: finalDays,
        effectiveDate: effDate.toISOString().slice(0, 10),
        excludeEncashmentId: requestId,
        isSelfService: false,
        db: tx,
      });

      const claimed = await tx.leaveEncashmentRequest.updateMany({
        where: { id: requestId, tenantId, status: request.status },
        data: {
          status: "APPROVED",
          payrollStatus: "AWAITING_PAYROLL",
          approvedDays: finalDays,
          approverId: profile.userId,
          approvedAt: new Date(),
          hrApproverId:
            profile.isHrAdmin || profile.isHrManager ? profile.userId : request.hrApproverId,
          hrApprovedAt:
            profile.isHrAdmin || profile.isHrManager ? new Date() : request.hrApprovedAt,
          hrComments: comments || null,
          ...(requiresManagerStage && !request.managerApprovedAt && isDirectManager
            ? { managerApproverId: profile.userId, managerApprovedAt: new Date() }
            : {}),
          availableBalanceSnapshot: verifiedCalc.availableBalance,
          retainedBalanceSnapshot: verifiedCalc.retainedBalance,
          salaryBasisType: verifiedCalc.salaryBasisType,
          salaryBasisAmount: verifiedCalc.salaryBasisAmount,
          dailyRateDivisor: verifiedCalc.dailyRateDivisor,
          dailyRate: verifiedCalc.dailyRate,
          grossAmount: verifiedCalc.grossAmount,
          adjustmentsAmount: verifiedCalc.adjustmentsAmount,
          netPayableAmount: verifiedCalc.netPayableAmount,
          currency: verifiedCalc.currency,
          calculationSnapshot: {
            ...verifiedCalc.calculationSnapshot,
            approvedByUserId: profile.userId,
            approvedAt: new Date().toISOString(),
          },
        },
      });
      if (claimed.count === 0) {
        throw new LeaveHttpError(
          "Encashment request was already processed by another reviewer.",
          409
        );
      }

      let encashLedger = await tx.leaveLedgerEntry.findFirst({
        where: { tenantId, referenceId: requestId, entryType: "ENCASHMENT" },
      });

      if (!encashLedger) {
        const postApprovalBal = Number(
          Math.max(0, verifiedCalc.availableBalance - finalDays).toFixed(2)
        );
        encashLedger = await tx.leaveLedgerEntry.create({
          data: {
            tenantId,
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            entryType: "ENCASHMENT",
            days: finalDays,
            balance: postApprovalBal,
            referenceId: requestId,
            notes: `Approved leave encashment ${request.requestCode || requestId.slice(0, 8)} (${finalDays}d)`.slice(
              0,
              250
            ),
            effectiveAt: effDate,
          },
        });
      }

      await tx.leaveEncashmentRequest.update({
        where: { id: requestId },
        data: { ledgerEntryId: encashLedger.id },
      });

      await tx.leaveEncashmentCompOffEvent.create({
        data: {
          tenantId,
          requestId,
          employeeId: request.employeeId,
          transactionType: "ENCASHMENT",
          eventType: "APPROVED",
          actorId: profile.userId,
          actorName: profile.email,
          actorRole: profile.roles[0] || "hr_admin",
          fromStatus: request.status,
          toStatus: "APPROVED",
          days: finalDays,
          amount: verifiedCalc.netPayableAmount,
          ledgerEntryId: encashLedger.id,
          comments:
            comments ||
            "Encashment approved and leave balance encashed; queued for payroll processing.",
        },
      });

      await OutboxService.createEvent(
        {
          tenantId,
          eventType: "leave.encashment.approved",
          entityType: "LeaveEncashmentRequest",
          entityId: requestId,
          actorId: profile.userId,
          payload: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            days: finalDays,
          },
        },
        tx
      );

      return tx.leaveEncashmentRequest.findUnique({
        where: { id: requestId },
        include: { employee: true, leaveType: true, payrollComponent: true },
      });
    });

    if (request.employee.userId) {
      NotificationService.createNotification({
        tenantId,
        userId: request.employee.userId,
        title: "Leave Encashment Approved",
        message: `Your leave encashment request (${request.requestCode || requestId.slice(0, 8)}) for ${finalDays} day(s) has been approved and is awaiting payroll processing.`,
        type: "ENCASHMENT_APPROVED",
        actionUrl: "/me/leave/encashment-compoff",
      }).catch(() => {});
    }

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: "ENCASHMENT_REQUEST_APPROVED",
      entityType: "LeaveEncashmentRequest",
      entityId: requestId,
      oldState: { status: request.status },
      newState: {
        status: "APPROVED",
        approvedDays: finalDays,
        netPayableAmount: Number(approved?.netPayableAmount || 0),
        ledgerEntryId: approved?.ledgerEntryId,
      },
    });

    return this.formatRequestRecord(approved!, profile);
  }

  static async cancelEncashmentRequest(
    tenantId: string,
    requestId: string,
    profile: CallerAuthorizationProfile,
    reason?: string,
    options?: { selfOnly?: boolean }
  ) {
    const request = await rawPrisma.leaveEncashmentRequest.findFirst({
      where: { id: requestId, tenantId, type: "ENCASHMENT" },
      include: { employee: true, leaveType: true },
    });
    if (!request) {
      throw new LeaveHttpError("Encashment request not found.", 404);
    }

    const isOwner = Boolean(profile.employeeId && profile.employeeId === request.employeeId);
    if (options?.selfOnly && !isOwner) {
      throw new LeaveHttpError("Forbidden: You can only cancel your own encashment request.", 403);
    }
    if (!isOwner && !profile.isHrAdmin && !profile.isHrManager) {
      throw new LeaveHttpError(
        "Forbidden: Insufficient permissions to cancel this encashment request.",
        403
      );
    }

    const cancellableStatuses = [
      "DRAFT",
      "PENDING",
      "CLARIFICATION_REQUESTED",
      "MANAGER_APPROVED",
      "HR_APPROVED",
      ...(profile.isHrAdmin ? ["APPROVED"] : []),
    ];

    if (!cancellableStatuses.includes(request.status)) {
      throw new LeaveHttpError(
        `Cannot cancel encashment request in status "${request.status}". Once sent to payroll or paid, use an auditable reversal instead.`,
        400,
        "CANNOT_CANCEL_STATE"
      );
    }

    const cancelReason = String(reason || "Cancelled by user").trim();

    const cancelled = await rawPrisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM employees WHERE id = ${request.employeeId} AND tenant_id = ${tenantId} FOR UPDATE`;

      let reversalLedgerId: string | null = null;
      if (request.status === "APPROVED") {
        const existingDebit = await tx.leaveLedgerEntry.findFirst({
          where: { tenantId, referenceId: requestId, entryType: "ENCASHMENT" },
        });
        if (existingDebit) {
          const existingRev = await tx.leaveLedgerEntry.findFirst({
            where: { tenantId, referenceId: requestId, entryType: "CREDIT" },
          });
          if (!existingRev) {
            const effYear = (request.effectiveDate || request.createdAt).getUTCFullYear();
            const balNow = await LeaveService.getEmployeeBalance(
              tenantId,
              request.employeeId,
              request.leaveTypeId,
              effYear,
              { tx }
            );
            const restoredDays = Number(existingDebit.days);
            const revEntry = await tx.leaveLedgerEntry.create({
              data: {
                tenantId,
                employeeId: request.employeeId,
                leaveTypeId: request.leaveTypeId,
                entryType: "CREDIT",
                days: restoredDays,
                balance: Number((balNow + restoredDays).toFixed(2)),
                referenceId: requestId,
                notes: `Restored encashed leave upon cancellation (${cancelReason})`.slice(0, 250),
                effectiveAt: request.effectiveDate || new Date(),
              },
            });
            reversalLedgerId = revEntry.id;
          } else {
            reversalLedgerId = existingRev.id;
          }
        }
      }

      const rec = await tx.leaveEncashmentRequest.update({
        where: { id: requestId },
        data: {
          status: "CANCELLED",
          cancelledById: profile.userId,
          cancelledAt: new Date(),
          cancellationReason: cancelReason,
          ...(reversalLedgerId ? { reversalLedgerEntryId: reversalLedgerId } : {}),
        },
        include: { employee: true, leaveType: true, payrollComponent: true },
      });

      await tx.leaveEncashmentCompOffEvent.create({
        data: {
          tenantId,
          requestId,
          employeeId: request.employeeId,
          transactionType: "ENCASHMENT",
          eventType: "CANCELLED",
          actorId: profile.userId,
          actorName: profile.email,
          actorRole: profile.roles[0] || "employee",
          fromStatus: request.status,
          toStatus: "CANCELLED",
          days: Number(request.approvedDays ?? request.days),
          ledgerEntryId: reversalLedgerId,
          comments: cancelReason,
        },
      });

      return rec;
    });

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: "ENCASHMENT_REQUEST_CANCELLED",
      entityType: "LeaveEncashmentRequest",
      entityId: requestId,
      oldState: { status: request.status },
      newState: { status: "CANCELLED", cancellationReason: cancelReason },
    });

    return this.formatRequestRecord(cancelled, profile);
  }

  static async processEncashmentToPayroll(
    tenantId: string,
    requestId: string,
    profile: CallerAuthorizationProfile,
    params: {
      payrollMonth: number;
      payrollYear: number;
      payrollRunId?: string;
      salaryComponentId?: string;
      allowControlledAdjustment?: boolean;
      notes?: string;
    }
  ) {
    if (!profile.isHrAdmin && !profile.isPayrollRole) {
      throw new LeaveHttpError(
        "Forbidden: Only authorized HR Administrators or Payroll Officers can process approved encashment items to payroll.",
        403,
        "UNAUTHORIZED_PAYROLL_PROCESSOR"
      );
    }

    const pm = Number(params.payrollMonth);
    const py = Number(params.payrollYear);
    if (!Number.isInteger(pm) || pm < 1 || pm > 12 || !Number.isInteger(py) || py < 2000 || py > 2100) {
      throw new LeaveHttpError("Valid payrollMonth (1-12) and payrollYear are required.", 400);
    }

    const request = await rawPrisma.leaveEncashmentRequest.findFirst({
      where: { id: requestId, tenantId, type: "ENCASHMENT" },
      include: { employee: true, leaveType: true, encashmentConfig: true, payrollComponent: true },
    });
    if (!request) {
      throw new LeaveHttpError("Encashment request not found.", 404);
    }

    this.assertNotSelfApproval(profile, request.employee);

    if (["PAYROLL_PENDING", "PAYROLL_PROCESSING", "PAID"].includes(request.status)) {
      throw new LeaveHttpError(
        `Duplicate payroll processing blocked: encashment ${request.requestCode || requestId.slice(0, 8)} is already linked to payroll (${request.payrollRef || request.status}).`,
        409,
        "DUPLICATE_PAYROLL_INSERTION"
      );
    }

    if (!["APPROVED", "FAILED"].includes(request.status)) {
      throw new LeaveHttpError(
        `Only APPROVED (or retryable FAILED) encashment requests can be sent to payroll (current status: ${request.status}).`,
        400,
        "INVALID_PAYROLL_STATE"
      );
    }

    let salaryComponentId =
      params.salaryComponentId ||
      request.payrollComponentId ||
      request.encashmentConfig?.payrollComponentId ||
      null;

    if (salaryComponentId) {
      const comp = await rawPrisma.salaryComponent.findFirst({
        where: { id: salaryComponentId, tenantId },
      });
      if (!comp) {
        throw new LeaveHttpError("Mapped Payroll SalaryComponent not found in tenant.", 400);
      }
    } else {
      let defaultEncComp = await rawPrisma.salaryComponent.findFirst({
        where: {
          tenantId,
          OR: [
            { code: { in: ["LEAVE_ENCASH", "LEAVE_ENCASHMENT", "ENCASH"] } },
            { name: { contains: "Encashment", mode: "insensitive" } },
          ],
        },
      });
      if (!defaultEncComp) {
        defaultEncComp = await rawPrisma.salaryComponent.create({
          data: {
            tenantId,
            code: "LEAVE_ENCASH",
            name: "Leave Encashment",
            type: "earning",
            calculationType: "flat",
            defaultValue: 0,
            isTaxable: true,
            isStatutory: false,
            isActive: true,
            description: "Taxable earning component for approved Leave Encashment payouts",
          },
        });
      }
      salaryComponentId = defaultEncComp.id;
    }

    const updated = await rawPrisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM leave_encashment_requests WHERE id = ${requestId} AND tenant_id = ${tenantId} FOR UPDATE`;

      const fresh = await tx.leaveEncashmentRequest.findUnique({ where: { id: requestId } });
      if (!fresh || !["APPROVED", "FAILED"].includes(fresh.status)) {
        throw new LeaveHttpError(
          "Encashment request was concurrently modified or already queued for payroll.",
          409,
          "DUPLICATE_PAYROLL_INSERTION"
        );
      }

      const targetRun = params.payrollRunId
        ? await tx.payrollRun.findFirst({ where: { id: params.payrollRunId, tenantId } })
        : await tx.payrollRun.findFirst({
            where: { tenantId, periodMonth: pm, periodYear: py },
          });

      if (targetRun) {
        const lockedRunStates = [
          "APPROVED",
          "approved",
          "FINALIZING",
          "OUTPUTS_GENERATED",
          "CLOSED",
          "finalized",
        ];
        const isLocked =
          Boolean(targetRun.isPublished) ||
          lockedRunStates.includes(String(targetRun.approvalStatus || "")) ||
          targetRun.status === "paid";

        if (isLocked && !(params.allowControlledAdjustment && profile.isHrAdmin)) {
          throw new LeaveHttpError(
            `Payroll period ${String(pm).padStart(2, "0")}/${py} is already finalized/locked (${targetRun.approvalStatus}). Select an open payroll period.`,
            409,
            "PAYROLL_PERIOD_LOCKED"
          );
        }
      }

      let linkedPayslipId: string | null = null;
      let nextStatus = "PAYROLL_PENDING";
      const payrollRef = `PAY-ENC-${py}${String(pm).padStart(2, "0")}-${(fresh.requestCode || requestId).slice(-6).toUpperCase()}`;

      if (targetRun && ["draft", "DRAFT", "CALCULATED", "calculated", "PREVIEW_READY"].includes(String(targetRun.approvalStatus || "draft"))) {
        const existingSlip = await tx.payslip.findFirst({
          where: { tenantId, payrollRunId: targetRun.id, employeeId: fresh.employeeId },
        });

        if (existingSlip) {
          const existingBreakdown = (existingSlip.breakdown as any) || {};
          const prevIds: string[] = Array.isArray(existingBreakdown.encashmentRequestIds)
            ? existingBreakdown.encashmentRequestIds
            : [];
          if (prevIds.includes(requestId)) {
            throw new LeaveHttpError(
              "Duplicate payroll entry: this encashment request is already embedded in the employee's draft payslip.",
              409,
              "DUPLICATE_PAYROLL_INSERTION"
            );
          }

          const amt = new Decimal(fresh.netPayableAmount || 0);
          const newGross = new Decimal(existingSlip.grossSalary || 0).plus(amt);
          const newNet = new Decimal(existingSlip.netSalary || 0).plus(amt);
          const updatedBreakdown = {
            ...existingBreakdown,
            leaveEncashmentAmount: new Decimal(existingBreakdown.leaveEncashmentAmount || 0)
              .plus(amt)
              .toNumber(),
            encashmentRequestIds: [...prevIds, requestId],
          };

          await tx.payslip.update({
            where: { id: existingSlip.id },
            data: {
              grossSalary: newGross.toNumber(),
              netSalary: newNet.toNumber(),
              breakdown: updatedBreakdown,
            },
          });

          await tx.payrollRun.update({
            where: { id: targetRun.id },
            data: {
              totalAmount: new Decimal(targetRun.totalAmount || 0).plus(amt).toNumber(),
              totalNet: new Decimal(targetRun.totalNet || 0).plus(amt).toNumber(),
            },
          });

          linkedPayslipId = existingSlip.id;
          nextStatus = "PAYROLL_PROCESSING";
        }
      }

      const rec = await tx.leaveEncashmentRequest.update({
        where: { id: requestId },
        data: {
          status: nextStatus,
          payrollStatus: nextStatus,
          payrollComponentId: salaryComponentId,
          payrollPeriodMonth: pm,
          payrollPeriodYear: py,
          payrollRunId: targetRun?.id || null,
          payslipId: linkedPayslipId,
          payrollRef,
          payrollProcessedAt: new Date(),
          failureReason: null,
        },
        include: {
          employee: true,
          leaveType: true,
          payrollComponent: true,
          payrollRun: true,
        },
      });

      await tx.leaveEncashmentCompOffEvent.create({
        data: {
          tenantId,
          requestId,
          employeeId: fresh.employeeId,
          transactionType: "ENCASHMENT",
          eventType: "SENT_TO_PAYROLL",
          actorId: profile.userId,
          actorName: profile.email,
          actorRole: profile.isPayrollRole ? "payroll" : "hr_admin",
          fromStatus: fresh.status,
          toStatus: nextStatus,
          days: Number(fresh.approvedDays ?? fresh.days),
          amount: Number(fresh.netPayableAmount || 0),
          payrollRef,
          comments:
            params.notes ||
            `Linked to payroll period ${String(pm).padStart(2, "0")}/${py} under ref ${payrollRef}.`,
          metadataJson: {
            payrollMonth: pm,
            payrollYear: py,
            payrollRunId: targetRun?.id || null,
            payslipId: linkedPayslipId,
            salaryComponentId,
          },
        },
      });

      return rec;
    });

    if (request.employee.userId) {
      NotificationService.createNotification({
        tenantId,
        userId: request.employee.userId,
        title: "Encashment Queued for Payroll",
        message: `Your approved leave encashment (${request.requestCode || requestId.slice(0, 8)}) has been scheduled for payroll period ${String(pm).padStart(2, "0")}/${py}.`,
        type: "ENCASHMENT_SENT_TO_PAYROLL",
        actionUrl: "/me/leave/encashment-compoff",
      }).catch(() => {});
    }

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: "ENCASHMENT_SENT_TO_PAYROLL",
      entityType: "LeaveEncashmentRequest",
      entityId: requestId,
      oldState: { status: request.status },
      newState: {
        status: updated.status,
        payrollPeriodMonth: pm,
        payrollPeriodYear: py,
        payrollRef: updated.payrollRef,
      },
    });

    return this.formatRequestRecord(updated, profile);
  }

  static async markEncashmentPayrollFailed(
    tenantId: string,
    requestId: string,
    profile: CallerAuthorizationProfile,
    failureReason: string
  ) {
    if (!profile.isHrAdmin && !profile.isPayrollRole) {
      throw new LeaveHttpError(
        "Forbidden: Only HR Administrators or Payroll Officers can record payroll failures.",
        403
      );
    }
    const reason = String(failureReason || "").trim();
    if (!reason) {
      throw new LeaveHttpError("A failure reason is required.", 400);
    }

    const existing = await rawPrisma.leaveEncashmentRequest.findFirst({
      where: { id: requestId, tenantId, type: "ENCASHMENT" },
      include: { employee: true },
    });
    if (!existing) {
      throw new LeaveHttpError("Encashment request not found.", 404);
    }
    if (!["PAYROLL_PENDING", "PAYROLL_PROCESSING"].includes(existing.status)) {
      throw new LeaveHttpError(
        `Cannot mark payroll failure from status "${existing.status}".`,
        400
      );
    }

    const failed = await rawPrisma.$transaction(async (tx) => {
      const rec = await tx.leaveEncashmentRequest.update({
        where: { id: requestId },
        data: {
          status: "FAILED",
          payrollStatus: "FAILED",
          failureReason: reason,
        },
        include: { employee: true, leaveType: true, payrollComponent: true },
      });

      await tx.leaveEncashmentCompOffEvent.create({
        data: {
          tenantId,
          requestId,
          employeeId: existing.employeeId,
          transactionType: "ENCASHMENT",
          eventType: "PAYROLL_FAILED",
          actorId: profile.userId,
          actorName: profile.email,
          actorRole: profile.isPayrollRole ? "payroll" : "hr_admin",
          fromStatus: existing.status,
          toStatus: "FAILED",
          payrollRef: existing.payrollRef,
          comments: reason,
        },
      });

      return rec;
    });

    if (existing.employee.userId) {
      NotificationService.createNotification({
        tenantId,
        userId: existing.employee.userId,
        title: "Encashment Payroll Processing Delayed",
        message: `Payroll processing for your leave encashment (${existing.requestCode || requestId.slice(0, 8)}) encountered an issue and is queued for HR/Payroll resolution.`,
        type: "ENCASHMENT_PAYROLL_FAILED",
        actionUrl: "/me/leave/encashment-compoff",
      }).catch(() => {});
    }

    void this.notifyHrUsers(
      tenantId,
      "Payroll Processing Failed for Leave Encashment",
      `Encashment ${existing.requestCode || requestId.slice(0, 8)} failed payroll processing: ${reason}`,
      "ENCASHMENT_PAYROLL_FAILED"
    );

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: "ENCASHMENT_PAYROLL_FAILED",
      entityType: "LeaveEncashmentRequest",
      entityId: requestId,
      oldState: { status: existing.status },
      newState: { status: "FAILED", failureReason: reason },
    });

    return this.formatRequestRecord(failed, profile);
  }

  static async reconcileAndMarkPayrollPaid(
    tenantId: string,
    params: {
      requestId?: string;
      payrollRunId?: string;
      disbursementRef?: string;
      actorUserId: string;
      actorEmail?: string | null;
      tx?: any;
    }
  ) {
    const db = params.tx || rawPrisma;
    const whereClause: any = {
      tenantId,
      type: "ENCASHMENT",
      status: { in: ["PAYROLL_PENDING", "PAYROLL_PROCESSING"] },
    };
    if (params.requestId) whereClause.id = params.requestId;
    if (params.payrollRunId) whereClause.payrollRunId = params.payrollRunId;

    const candidates = await db.leaveEncashmentRequest.findMany({
      where: whereClause,
      include: { employee: true, payrollRun: true },
    });

    if (candidates.length === 0) {
      if (params.requestId) {
        throw new LeaveHttpError(
          "No encashment request in PAYROLL_PENDING or PAYROLL_PROCESSING state found to mark as PAID.",
          400
        );
      }
      return { updatedCount: 0, records: [] };
    }

    const finalizedRecords: any[] = [];
    for (const req of candidates) {
      const run = req.payrollRun;
      if (!run) {
        throw new LeaveHttpError(
          `Cannot mark encashment ${req.requestCode || req.id.slice(0, 8)} as PAID: no PayrollRun is linked.`,
          400,
          "PAYROLL_RUN_MISSING"
        );
      }

      const isVerifiedCompleted =
        Boolean(run.isPublished) ||
        ["CLOSED", "OUTPUTS_GENERATED", "finalized"].includes(String(run.approvalStatus || "")) ||
        run.status === "paid" ||
        (run.status === "completed" &&
          String(run.approvalStatus || "").toLowerCase() === "approved");

      if (!isVerifiedCompleted) {
        throw new LeaveHttpError(
          `Cannot mark encashment ${req.requestCode || req.id.slice(0, 8)} as PAID: linked payroll run (${String(run.periodMonth).padStart(2, "0")}/${run.periodYear}) is in state "${run.approvalStatus}" and has not completed finalization/disbursement.`,
          409,
          "PAYROLL_RUN_NOT_COMPLETED"
        );
      }

      const slip = req.payslipId
        ? await db.payslip.findFirst({ where: { id: req.payslipId, tenantId } })
        : await db.payslip.findFirst({
            where: { tenantId, payrollRunId: run.id, employeeId: req.employeeId },
          });

      const finalRef =
        params.disbursementRef || req.payrollRef || `PAID-${run.id.slice(0, 8).toUpperCase()}`;
      const paidRec = await db.leaveEncashmentRequest.update({
        where: { id: req.id },
        data: {
          status: "PAID",
          payrollStatus: "PAID",
          payslipId: slip?.id || req.payslipId,
          payrollRef: finalRef,
          paidAt: new Date(),
        },
        include: { employee: true, leaveType: true, payrollComponent: true, payrollRun: true },
      });

      await db.leaveEncashmentCompOffEvent.create({
        data: {
          tenantId,
          requestId: req.id,
          employeeId: req.employeeId,
          transactionType: "ENCASHMENT",
          eventType: "PAID",
          actorId: params.actorUserId,
          actorName: params.actorEmail || null,
          fromStatus: req.status,
          toStatus: "PAID",
          days: Number(req.approvedDays ?? req.days),
          amount: Number(req.netPayableAmount || 0),
          payrollRef: finalRef,
          comments: `Verified payroll completion for period ${String(run.periodMonth).padStart(2, "0")}/${run.periodYear}.`,
          metadataJson: { payrollRunId: run.id, payslipId: slip?.id || null },
        },
      });

      finalizedRecords.push(paidRec);

      if (!params.tx && req.employee?.userId) {
        NotificationService.createNotification({
          tenantId,
          userId: req.employee.userId,
          title: "Leave Encashment Disbursed",
          message: `Your leave encashment (${req.requestCode || req.id.slice(0, 8)}) has been completed in payroll period ${String(run.periodMonth).padStart(2, "0")}/${run.periodYear} (Ref: ${finalRef}).`,
          type: "ENCASHMENT_PAID",
          actionUrl: "/me/leave/encashment-compoff",
        }).catch(() => {});
      }
    }

    if (!params.tx && finalizedRecords.length > 0) {
      await AuditService.logMutation({
        tenantId,
        actorId: params.actorUserId,
        actorEmail: params.actorEmail || null,
        action: "ENCASHMENT_MARKED_PAID",
        entityType: "LeaveEncashmentRequest",
        entityId: params.requestId || params.payrollRunId || tenantId,
        newState: {
          count: finalizedRecords.length,
          ids: finalizedRecords.map((r) => r.id),
        },
      });
    }

    return { updatedCount: finalizedRecords.length, records: finalizedRecords };
  }

  static async getEncashmentPayrollStatus(
    tenantId: string,
    requestId: string,
    profile: CallerAuthorizationProfile,
    options?: { selfOnly?: boolean }
  ) {
    const req = await rawPrisma.leaveEncashmentRequest.findFirst({
      where: { id: requestId, tenantId, type: "ENCASHMENT" },
      include: {
        payrollComponent: { select: { id: true, code: true, name: true, isTaxable: true } },
        payrollRun: {
          select: {
            id: true,
            periodMonth: true,
            periodYear: true,
            status: true,
            approvalStatus: true,
            isPublished: true,
            publishedAt: true,
          },
        },
        payslip: {
          select: {
            id: true,
            periodMonth: true,
            periodYear: true,
            status: true,
            isPublished: true,
            publishedAt: true,
          },
        },
        events: {
          where: {
            eventType: {
              in: ["APPROVED", "SENT_TO_PAYROLL", "PAYROLL_FAILED", "PAID", "REVERSED"],
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!req) {
      throw new LeaveHttpError("Encashment request not found.", 404);
    }
    if (!this.canViewRecord(profile, req, options?.selfOnly)) {
      throw new LeaveHttpError(
        "Forbidden: You do not have access to this encashment record.",
        403
      );
    }

    const canSeeSalary =
      profile.isHrAdmin ||
      profile.isHrManager ||
      profile.isPayrollRole ||
      (profile.employeeId && profile.employeeId === req.employeeId);

    return {
      id: req.id,
      requestCode: req.requestCode,
      status: req.status,
      payrollStatus: req.payrollStatus,
      payrollMonth: req.payrollPeriodMonth,
      payrollYear: req.payrollPeriodYear,
      payrollPeriodLabel:
        req.payrollPeriodMonth && req.payrollPeriodYear
          ? `${String(req.payrollPeriodMonth).padStart(2, "0")}/${req.payrollPeriodYear}`
          : null,
      payrollRef: req.payrollRef,
      payrollProcessedAt: req.payrollProcessedAt,
      paidAt: req.paidAt,
      failureReason: req.failureReason,
      totalAmount:
        canSeeSalary && req.netPayableAmount !== null ? Number(req.netPayableAmount) : null,
      currency: req.currency,
      salaryComponent: req.payrollComponent,
      payrollRun: req.payrollRun,
      payslip: req.payslip,
      timeline: req.events,
    };
  }

  static async reverseTransaction(
    tenantId: string,
    requestId: string,
    profile: CallerAuthorizationProfile,
    params: { reason: string }
  ) {
    if (!profile.isHrAdmin) {
      throw new LeaveHttpError(
        "Forbidden: Only HR Administrators can execute auditable financial or ledger reversals.",
        403,
        "HR_ADMIN_REQUIRED"
      );
    }

    const reason = String(params.reason || "").trim();
    if (!reason) {
      throw new LeaveHttpError("A mandatory audit reason is required to reverse a transaction.", 400);
    }

    const req = await rawPrisma.leaveEncashmentRequest.findFirst({
      where: { id: requestId, tenantId },
      include: { employee: true, leaveType: true, usageAllocations: true },
    });
    if (!req) {
      throw new LeaveHttpError("Transaction record not found.", 404);
    }

    this.assertNotSelfApproval(profile, req.employee);

    if (req.status === "REVERSED") {
      throw new LeaveHttpError(
        "This transaction has already been reversed.",
        409,
        "ALREADY_REVERSED"
      );
    }

    if (req.type === "ENCASHMENT") {
      if (
        !["APPROVED", "PAYROLL_PENDING", "PAYROLL_PROCESSING", "PAID", "FAILED"].includes(
          req.status
        )
      ) {
        throw new LeaveHttpError(
          `Cannot reverse encashment in status "${req.status}". Use Cancel for pending/draft requests.`,
          400,
          "INVALID_REVERSAL_STATE"
        );
      }

      const reversed = await rawPrisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM employees WHERE id = ${req.employeeId} AND tenant_id = ${tenantId} FOR UPDATE`;

        const existingDebit = await tx.leaveLedgerEntry.findFirst({
          where: { tenantId, referenceId: requestId, entryType: "ENCASHMENT" },
        });
        const existingRevCredit = await tx.leaveLedgerEntry.findFirst({
          where: { tenantId, referenceId: requestId, entryType: "CREDIT" },
        });

        let reversalLedgerId = existingRevCredit?.id || null;
        const restoreDays = Number(existingDebit?.days ?? req.approvedDays ?? req.days);

        if (existingDebit && !existingRevCredit) {
          const effYear = (req.effectiveDate || req.createdAt).getUTCFullYear();
          const curBal = await LeaveService.getEmployeeBalance(
            tenantId,
            req.employeeId,
            req.leaveTypeId,
            effYear,
            { tx }
          );
          const revEntry = await tx.leaveLedgerEntry.create({
            data: {
              tenantId,
              employeeId: req.employeeId,
              leaveTypeId: req.leaveTypeId,
              entryType: "CREDIT",
              days: restoreDays,
              balance: Number((curBal + restoreDays).toFixed(2)),
              referenceId: requestId,
              notes: `Reversal of Leave Encashment ${req.requestCode || requestId.slice(0, 8)}: ${reason}`.slice(
                0,
                250
              ),
              effectiveAt: req.effectiveDate || new Date(),
            },
          });
          reversalLedgerId = revEntry.id;
        }

        if (req.payslipId && req.status !== "PAID") {
          const draftSlip = await tx.payslip.findFirst({
            where: { id: req.payslipId, tenantId, isPublished: false },
          });
          if (draftSlip) {
            const amt = new Decimal(req.netPayableAmount || 0);
            const bd = (draftSlip.breakdown as any) || {};
            await tx.payslip.update({
              where: { id: draftSlip.id },
              data: {
                grossSalary: Decimal.max(
                  0,
                  new Decimal(draftSlip.grossSalary || 0).minus(amt)
                ).toNumber(),
                netSalary: Decimal.max(
                  0,
                  new Decimal(draftSlip.netSalary || 0).minus(amt)
                ).toNumber(),
                breakdown: {
                  ...bd,
                  leaveEncashmentAmount: Decimal.max(
                    0,
                    new Decimal(bd.leaveEncashmentAmount || 0).minus(amt)
                  ).toNumber(),
                  encashmentRequestIds: Array.isArray(bd.encashmentRequestIds)
                    ? bd.encashmentRequestIds.filter((x: string) => x !== requestId)
                    : [],
                },
              },
            });
          }
        }

        const reversalRef = `REV-${(req.requestCode || requestId).slice(-8).toUpperCase()}`;
        const rec = await tx.leaveEncashmentRequest.update({
          where: { id: requestId },
          data: {
            status: "REVERSED",
            payrollStatus: "REVERSED",
            reversedById: profile.userId,
            reversedAt: new Date(),
            reversalReason: reason,
            reversalRef,
            reversalLedgerEntryId: reversalLedgerId,
          },
          include: { employee: true, leaveType: true, payrollComponent: true },
        });

        await tx.leaveEncashmentCompOffEvent.create({
          data: {
            tenantId,
            requestId,
            employeeId: req.employeeId,
            transactionType: "ENCASHMENT",
            eventType: "REVERSED",
            actorId: profile.userId,
            actorName: profile.email,
            actorRole: "hr_admin",
            fromStatus: req.status,
            toStatus: "REVERSED",
            days: restoreDays,
            amount: Number(req.netPayableAmount || 0),
            ledgerEntryId: reversalLedgerId,
            payrollRef: req.payrollRef,
            comments: reason,
            metadataJson: {
              wasPaid: req.status === "PAID",
              payrollRecoveryRequired: req.status === "PAID",
              reversalRef,
            },
          },
        });

        return rec;
      });

      await AuditService.logMutation({
        tenantId,
        actorId: profile.userId,
        actorEmail: profile.email,
        action: "ENCASHMENT_TRANSACTION_REVERSED",
        entityType: "LeaveEncashmentRequest",
        entityId: requestId,
        oldState: { status: req.status, payrollRef: req.payrollRef },
        newState: {
          status: "REVERSED",
          reversalReason: reason,
          reversalLedgerEntryId: reversed.reversalLedgerEntryId,
        },
      });

      return this.formatRequestRecord(reversed, profile);
    }

    // COMP_OFF Reversal
    if (!["CREDITED", "PARTIALLY_USED"].includes(req.status)) {
      throw new LeaveHttpError(
        `Cannot reverse Comp-Off in status "${req.status}". Fully consumed or uncredited requests cannot be reversed directly.`,
        400,
        "INVALID_REVERSAL_STATE"
      );
    }

    const activeAllocs = (req.usageAllocations || []).filter((a) =>
      ["RESERVED", "CONSUMED"].includes(a.status)
    );
    if (activeAllocs.length > 0) {
      throw new LeaveHttpError(
        `Cannot reverse Comp-Off lot while ${activeAllocs.length} leave application allocation(s) are active/consumed against it. Cancel the linked leave application first.`,
        409,
        "COMPOFF_ALREADY_ALLOCATED"
      );
    }

    const reversedCompOff = await rawPrisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM employees WHERE id = ${req.employeeId} AND tenant_id = ${tenantId} FOR UPDATE`;

      const remDays = Number(req.remainingDays ?? req.approvedDays ?? req.days);
      const curYear = new Date().getUTCFullYear();
      const balBefore = await LeaveService.getEmployeeBalance(
        tenantId,
        req.employeeId,
        req.leaveTypeId,
        curYear,
        { tx, skipCompOffSweep: true }
      );

      let revDebitId: string | null = null;
      if (remDays > 0) {
        const revDebit = await tx.leaveLedgerEntry.create({
          data: {
            tenantId,
            employeeId: req.employeeId,
            leaveTypeId: req.leaveTypeId,
            entryType: "DEBIT",
            days: remDays,
            balance: Math.max(0, Number((balBefore - remDays).toFixed(2))),
            referenceId: requestId,
            notes: `Reversal of Comp-Off credit ${req.requestCode || requestId.slice(0, 8)}: ${reason}`.slice(
              0,
              250
            ),
            effectiveAt: new Date(),
          },
        });
        revDebitId = revDebit.id;
      }

      const reversalRef = `REV-${(req.requestCode || requestId).slice(-8).toUpperCase()}`;
      const rec = await tx.leaveEncashmentRequest.update({
        where: { id: requestId },
        data: {
          status: "REVERSED",
          remainingDays: 0,
          reversedById: profile.userId,
          reversedAt: new Date(),
          reversalReason: reason,
          reversalRef,
          reversalLedgerEntryId: revDebitId,
        },
        include: { employee: true, leaveType: true },
      });

      await tx.leaveEncashmentCompOffEvent.create({
        data: {
          tenantId,
          requestId,
          employeeId: req.employeeId,
          transactionType: "COMP_OFF",
          eventType: "REVERSED",
          actorId: profile.userId,
          actorName: profile.email,
          actorRole: "hr_admin",
          fromStatus: req.status,
          toStatus: "REVERSED",
          days: remDays,
          ledgerEntryId: revDebitId,
          comments: reason,
        },
      });

      return rec;
    });

    if (req.employee.userId) {
      NotificationService.createNotification({
        tenantId,
        userId: req.employee.userId,
        title: "Comp-Off Balance Adjusted",
        message: `Comp-Off credit (${req.requestCode || requestId.slice(0, 8)}) was reversed by HR: ${reason}`,
        type: "COMP_OFF_BALANCE_CHANGED",
        actionUrl: "/me/leave/encashment-compoff",
      }).catch(() => {});
    }

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: "COMP_OFF_TRANSACTION_REVERSED",
      entityType: "LeaveEncashmentRequest",
      entityId: requestId,
      oldState: { status: req.status, remainingDays: Number(req.remainingDays || 0) },
      newState: { status: "REVERSED", reversalReason: reason },
    });

    return this.formatRequestRecord(reversedCompOff, profile);
  }

  // =========================================================================
  // 5. MODULE B — COMP-OFF ENGINE (ATTENDANCE/OVERTIME VERIFICATION, APPROVAL, CREDIT, EXPIRY)
  // =========================================================================

  static async resolveEffectiveCompOffConfig(
    tenantId: string,
    employee: {
      branchId?: string | null;
      departmentId?: string | null;
      employmentCategory?: string | null;
    },
    workDate: Date,
    db: any = rawPrisma
  ) {
    const configs = await db.compOffConfig.findMany({
      where: {
        tenantId,
        status: "active",
        enabled: true,
        effectiveFrom: { lte: workDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: workDate } }],
      },
      include: { compOffLeaveType: true },
      orderBy: [{ version: "desc" }, { updatedAt: "desc" }],
    });

    const matching = configs.filter((cfg: any) => {
      if (cfg.branchId && cfg.branchId !== employee.branchId) return false;
      if (cfg.departmentId && cfg.departmentId !== employee.departmentId) return false;
      const cats = normalizeStringArray(cfg.applicableCategories).map((c) => c.toLowerCase());
      if (cats.length > 0 && employee.employmentCategory) {
        if (!cats.includes(String(employee.employmentCategory).toLowerCase())) return false;
      }
      return true;
    });

    matching.sort((a: any, b: any) => {
      const scoreA = (a.branchId ? 2 : 0) + (a.departmentId ? 1 : 0);
      const scoreB = (b.branchId ? 2 : 0) + (b.departmentId ? 1 : 0);
      return scoreB - scoreA;
    });

    return matching[0] || null;
  }

  static async verifyAndPreviewCompOff(
    tenantId: string,
    params: {
      employeeId: string;
      workedOnDate: string;
      workType?: string;
      attendanceId?: string | null;
      overtimeRequestId?: string | null;
      actualHoursWorked?: number;
      requestedDays?: number;
      excludeRequestId?: string;
      excludeCompOffId?: string;
      isSelfService?: boolean;
      db?: any;
    }
  ) {
    const db = params.db || rawPrisma;
    const excludeId = params.excludeCompOffId || params.excludeRequestId;
    const workDate = toUtcDateOnly(params.workedOnDate);
    const today = toUtcDateOnly(new Date());

    if (workDate > today) {
      throw new LeaveHttpError(
        "Comp-Off cannot be requested for a future work date.",
        400,
        "FUTURE_WORK_DATE_FORBIDDEN"
      );
    }

    const employee = await db.employee.findFirst({
      where: { id: params.employeeId, tenantId },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });
    if (!employee) {
      throw new LeaveHttpError("Employee does not belong to the authenticated tenant.", 404);
    }

    const config = await this.resolveEffectiveCompOffConfig(tenantId, employee, workDate, db);
    if (!config || !config.enabled) {
      throw new LeaveHttpError(
        "Comp-Off is not enabled for this employee's scope on the selected work date.",
        400,
        "COMPOFF_DISABLED"
      );
    }

    if (params.isSelfService && !config.allowEssSubmission) {
      throw new LeaveHttpError(
        "Employee self-service Comp-Off submission is disabled under the active policy.",
        403,
        "ESS_COMPOFF_DISABLED"
      );
    }

    const daysSinceWork = Math.floor((today.getTime() - workDate.getTime()) / 86400000);
    if (daysSinceWork > Number(config.submissionDeadlineDays || 30)) {
      throw new LeaveHttpError(
        `Submission window expired: work date is ${daysSinceWork} day(s) ago, exceeding the ${config.submissionDeadlineDays}-day submission deadline.`,
        400,
        "SUBMISSION_DEADLINE_EXCEEDED"
      );
    }

    const duplicateClaim = await db.leaveEncashmentRequest.findFirst({
      where: {
        tenantId,
        employeeId: params.employeeId,
        type: "COMP_OFF",
        workedOnDate: workDate,
        status: { notIn: ["REJECTED", "CANCELLED", "REVERSED"] },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, requestCode: true, status: true },
    });
    if (duplicateClaim) {
      throw new LeaveHttpError(
        `Duplicate Comp-Off claim blocked: work date ${workDate.toISOString().slice(0, 10)} has already been claimed (${duplicateClaim.requestCode || duplicateClaim.id.slice(0, 8)}, status: ${duplicateClaim.status}).`,
        409,
        "DUPLICATE_WORK_DATE_CLAIM"
      );
    }

    const workDateEnd = new Date(`${workDate.toISOString().slice(0, 10)}T23:59:59.999Z`);
    const [holidays, policies, attendanceById, attendanceByDate, overtimeById, overtimesOnDate] =
      await Promise.all([
        db.holiday.findMany({
          where: {
            tenantId,
            status: "active",
            date: { gte: workDate, lte: workDateEnd },
          },
        }),
        db.attendancePolicy.findMany({
          where: { tenantId },
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        }),
        params.attendanceId
          ? db.attendance.findFirst({
              where: { id: params.attendanceId, tenantId },
            })
          : Promise.resolve(null),
        db.attendance.findFirst({
          where: {
            tenantId,
            employeeId: params.employeeId,
            date: { gte: workDate, lte: workDateEnd },
          },
        }),
        params.overtimeRequestId
          ? db.overtimeRequest.findFirst({
              where: { id: params.overtimeRequestId, tenantId },
            })
          : Promise.resolve(null),
        db.overtimeRequest.findMany({
          where: {
            tenantId,
            employeeId: params.employeeId,
            overtimeDate: { gte: workDate, lte: workDateEnd },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    if (params.attendanceId) {
      if (
        !attendanceById ||
        attendanceById.employeeId !== params.employeeId ||
        new Date(attendanceById.date).toISOString().slice(0, 10) !==
          workDate.toISOString().slice(0, 10)
      ) {
        throw new LeaveHttpError(
          "Invalid attendance reference: record does not belong to this employee or work date.",
          400,
          "INVALID_ATTENDANCE_REFERENCE"
        );
      }
    }

    if (params.overtimeRequestId) {
      if (
        !overtimeById ||
        overtimeById.employeeId !== params.employeeId ||
        new Date(overtimeById.overtimeDate).toISOString().slice(0, 10) !==
          workDate.toISOString().slice(0, 10)
      ) {
        throw new LeaveHttpError(
          "Invalid overtime reference: overtime record does not belong to this employee or work date.",
          400,
          "INVALID_OVERTIME_REFERENCE"
        );
      }
    }

    const matchedAttendance = attendanceById || attendanceByDate;
    const matchedOvertime = overtimeById || overtimesOnDate[0] || null;

    const matchedPolicy =
      policies.find(
        (p: any) =>
          (!p.branchId || p.branchId === employee.branchId) &&
          (!p.departmentId || p.departmentId === employee.departmentId)
      ) || policies[0];
    const workingDayTokens = matchedPolicy?.workingDays
      ? String(matchedPolicy.workingDays)
          .split(",")
          .map((d: string) => d.trim().slice(0, 3).toLowerCase())
      : ["mon", "tue", "wed", "thu", "fri"];
    const dowToken = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][workDate.getUTCDay()];
    const isWeeklyOff = !workingDayTokens.includes(dowToken);
    const isPublicHoliday = holidays.length > 0;
    const holidayName = holidays[0]?.name || null;

    let resolvedWorkType = params.workType ? String(params.workType).toUpperCase().trim() : "";
    if (!resolvedWorkType) {
      if (isPublicHoliday) resolvedWorkType = "PUBLIC_HOLIDAY";
      else if (isWeeklyOff) resolvedWorkType = "WEEKLY_OFF";
      else if (matchedOvertime) resolvedWorkType = "OVERTIME";
      else resolvedWorkType = "WORKDAY_EXTRA";
    }

    if (resolvedWorkType === "WEEKLY_OFF") {
      if (!config.allowWeeklyOff) {
        throw new LeaveHttpError(
          "Weekly-off work is not eligible for Comp-Off under the active policy.",
          400,
          "INELIGIBLE_WORK_TYPE"
        );
      }
      if (!isWeeklyOff) {
        throw new LeaveHttpError(
          `Selected date (${workDate.toISOString().slice(0, 10)}) is a regular working day, not a weekly off.`,
          400,
          "DATE_NOT_WEEKLY_OFF"
        );
      }
    } else if (resolvedWorkType === "PUBLIC_HOLIDAY") {
      if (!config.allowPublicHoliday) {
        throw new LeaveHttpError(
          "Public holiday work is not eligible for Comp-Off under the active policy.",
          400,
          "INELIGIBLE_WORK_TYPE"
        );
      }
      if (!isPublicHoliday) {
        throw new LeaveHttpError(
          `Selected date (${workDate.toISOString().slice(0, 10)}) is not an active public holiday in the holiday calendar.`,
          400,
          "DATE_NOT_PUBLIC_HOLIDAY"
        );
      }
    } else if (resolvedWorkType === "OVERTIME") {
      if (!config.allowApprovedOvertime) {
        throw new LeaveHttpError(
          "Overtime-to-Comp-Off conversion is disabled under the active policy.",
          400,
          "INELIGIBLE_WORK_TYPE"
        );
      }
      if (config.requireApprovedOvertimeForOt) {
        if (
          !matchedOvertime ||
          String(matchedOvertime.status || "").toLowerCase() !== "approved"
        ) {
          throw new LeaveHttpError(
            "An approved Overtime Request is required for Overtime Comp-Off claims.",
            400,
            "UNAPPROVED_OVERTIME"
          );
        }
      }
    } else if (resolvedWorkType === "WORKDAY_EXTRA") {
      if (!config.allowWorkdayExtraHours) {
        throw new LeaveHttpError(
          "Regular workday extra hours are not eligible for Comp-Off under the active policy.",
          400,
          "INELIGIBLE_WORK_TYPE"
        );
      }
    } else {
      throw new LeaveHttpError(`Unsupported workType "${resolvedWorkType}".`, 400);
    }

    if (config.requireAttendanceRecord) {
      const validPresentStatuses = ["present", "late", "half_day", "on_duty", "wfh"];
      if (
        !matchedAttendance ||
        !validPresentStatuses.includes(String(matchedAttendance.status || "").toLowerCase())
      ) {
        throw new LeaveHttpError(
          `Verified attendance record is missing or absent on ${workDate.toISOString().slice(0, 10)}. Comp-Off requires verified attendance evidence.`,
          400,
          "MISSING_ATTENDANCE_EVIDENCE"
        );
      }
    }

    let evidencedHours = 0;
    if (matchedAttendance) {
      if (matchedAttendance.hours !== null && matchedAttendance.hours !== undefined && Number(matchedAttendance.hours) > 0) {
        evidencedHours = Number(matchedAttendance.hours);
      } else if (matchedAttendance.checkIn && matchedAttendance.checkOut) {
        const diffMs =
          new Date(matchedAttendance.checkOut).getTime() -
          new Date(matchedAttendance.checkIn).getTime();
        if (diffMs > 0) {
          evidencedHours = Number((diffMs / 3600000).toFixed(2));
        }
      } else if (matchedAttendance.overtimeMinutes && matchedAttendance.overtimeMinutes > 0) {
        evidencedHours = Number((matchedAttendance.overtimeMinutes / 60).toFixed(2));
      }
    }
    if (
      resolvedWorkType === "OVERTIME" &&
      matchedOvertime &&
      String(matchedOvertime.status || "").toLowerCase() === "approved"
    ) {
      const otHours = Number(matchedOvertime.hoursRequested || 0);
      if (otHours > 0) evidencedHours = otHours;
    }

    const actualHours =
      params.actualHoursWorked !== undefined && params.actualHoursWorked > 0
        ? Number(params.actualHoursWorked)
        : evidencedHours;

    const minQualifyingHours = Number(config.minQualifyingHours || 4);
    if (actualHours < minQualifyingHours) {
      throw new LeaveHttpError(
        `Actual worked hours (${actualHours}h) are below the minimum qualifying threshold (${minQualifyingHours}h) required to earn Comp-Off.`,
        400,
        "MIN_WORK_HOURS_NOT_MET"
      );
    }

    const fullDayThreshold = Number(config.fullDayHoursThreshold || 8);
    const halfDayThreshold = Number(config.halfDayHoursThreshold || minQualifyingHours);
    const maxPerDay = Number(config.maxCreditPerDay || 1);

    let convertedDays = 0;
    if (actualHours >= fullDayThreshold) {
      const multiples = Math.floor((actualHours / fullDayThreshold) * 2) / 2;
      convertedDays = Math.min(maxPerDay, Math.max(1, multiples));
    } else if (actualHours >= halfDayThreshold) {
      if (!config.halfDayAllowed) {
        throw new LeaveHttpError(
          `Half-day Comp-Off is disabled; full-day threshold of ${fullDayThreshold} hours is required (actual: ${actualHours}h).`,
          400,
          "HALF_DAY_NOT_ALLOWED"
        );
      }
      convertedDays = Math.min(maxPerDay, 0.5);
    } else {
      throw new LeaveHttpError(
        `Worked hours (${actualHours}h) do not meet half-day (${halfDayThreshold}h) or full-day (${fullDayThreshold}h) conversion thresholds.`,
        400,
        "CONVERSION_THRESHOLD_NOT_MET"
      );
    }

    const requestedDays =
      params.requestedDays !== undefined
        ? assertValidRequestedDays(params.requestedDays, config.halfDayAllowed)
        : convertedDays;

    if (requestedDays > convertedDays) {
      throw new LeaveHttpError(
        `Requested Comp-Off days (${requestedDays}) exceed earned conversion credit (${convertedDays}) for ${actualHours} worked hour(s).`,
        400,
        "EXCEEDS_EARNED_CONVERSION"
      );
    }
    if (requestedDays > maxPerDay) {
      throw new LeaveHttpError(
        `Requested Comp-Off days (${requestedDays}) exceed maximum daily credit cap (${maxPerDay}).`,
        400,
        "EXCEEDS_DAILY_CAP"
      );
    }

    const workYear = workDate.getUTCFullYear();
    const workMonth = workDate.getUTCMonth();
    const monthStart = new Date(Date.UTC(workYear, workMonth, 1));
    const monthEnd = new Date(Date.UTC(workYear, workMonth + 1, 0, 23, 59, 59, 999));
    const yearStart = new Date(Date.UTC(workYear, 0, 1));
    const yearEnd = new Date(Date.UTC(workYear, 11, 31, 23, 59, 59, 999));

    const [monthClaims, yearClaims] = await Promise.all([
      db.leaveEncashmentRequest.findMany({
        where: {
          tenantId,
          employeeId: params.employeeId,
          type: "COMP_OFF",
          workedOnDate: { gte: monthStart, lte: monthEnd },
          status: { notIn: ["REJECTED", "CANCELLED", "REVERSED", "DRAFT"] },
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { days: true, approvedDays: true },
      }),
      db.leaveEncashmentRequest.findMany({
        where: {
          tenantId,
          employeeId: params.employeeId,
          type: "COMP_OFF",
          workedOnDate: { gte: yearStart, lte: yearEnd },
          status: { notIn: ["REJECTED", "CANCELLED", "REVERSED", "DRAFT"] },
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { days: true, approvedDays: true },
      }),
    ]);

    const monthUsedCredits = monthClaims.reduce(
      (s: number, r: any) => s + Number(r.approvedDays ?? r.days ?? 0),
      0
    );
    const yearUsedCredits = yearClaims.reduce(
      (s: number, r: any) => s + Number(r.approvedDays ?? r.days ?? 0),
      0
    );
    const maxMonthly = Number(config.maxMonthlyCredits || 0);
    const maxYearly = Number(config.maxYearlyCredits || 0);

    if (maxMonthly > 0 && monthUsedCredits + requestedDays > maxMonthly) {
      throw new LeaveHttpError(
        `Monthly Comp-Off credit cap exceeded (${monthUsedCredits} claimed + ${requestedDays} requested > ${maxMonthly} monthly limit).`,
        400,
        "MONTHLY_CREDIT_CAP_EXCEEDED"
      );
    }
    if (maxYearly > 0 && yearUsedCredits + requestedDays > maxYearly) {
      throw new LeaveHttpError(
        `Annual Comp-Off credit cap exceeded (${yearUsedCredits} claimed + ${requestedDays} requested > ${maxYearly} yearly limit).`,
        400,
        "YEARLY_CREDIT_CAP_EXCEEDED"
      );
    }

    let compOffLeaveType = config.compOffLeaveType;
    if (!compOffLeaveType) {
      compOffLeaveType = await db.leaveType.findFirst({
        where: {
          tenantId,
          status: "active",
          OR: [
            { code: { in: ["COMP_OFF", "COMPOFF", "CO", "COM"] } },
            { name: { contains: "Comp", mode: "insensitive" } },
          ],
        },
      });
    }
    if (!compOffLeaveType) {
      throw new LeaveHttpError(
        "No active Comp-Off Leave Type is configured for this tenant.",
        400,
        "MISSING_COMPOFF_LEAVE_TYPE"
      );
    }

    const expiryDays = Number(config.expiryDays || 90);
    const projectedExpiryDate = new Date(today.getTime() + expiryDays * 86400000);

    return {
      eligible: true,
      config: {
        id: config.id,
        name: config.name,
        version: config.version,
        creditExpiryDays: expiryDays,
        expiryDays,
        requireSupportingDoc: config.requireSupportingDoc,
        approvalMode: config.approvalMode,
      },
      employee: {
        id: employee.id,
        fullName: `${employee.firstName} ${employee.lastName}`.trim(),
        employeeCode: employee.employeeCode,
        managerId: employee.managerId,
        managerName: employee.manager
          ? `${employee.manager.firstName} ${employee.manager.lastName}`.trim()
          : null,
      },
      leaveType: {
        id: compOffLeaveType.id,
        name: compOffLeaveType.name,
        code: compOffLeaveType.code,
      },
      workedOnDate: workDate.toISOString().slice(0, 10),
      workType: resolvedWorkType,
      dayClassification: {
        isWeeklyOff,
        isPublicHoliday,
        holidayName,
      },
      attendanceEvidence: matchedAttendance
        ? {
            id: matchedAttendance.id,
            status: matchedAttendance.status,
            checkIn: matchedAttendance.checkIn,
            checkOut: matchedAttendance.checkOut,
            evidencedHours,
          }
        : null,
      overtimeEvidence: matchedOvertime
        ? {
            id: matchedOvertime.id,
            hours: Number(matchedOvertime.hoursRequested),
            status: matchedOvertime.status,
          }
        : null,
      actualHoursWorked: actualHours,
      verifiedHours: actualHours,
      convertedDays,
      recommendedDays: convertedDays,
      creditedDays: convertedDays,
      requestedDays,
      projectedExpiryDate: projectedExpiryDate.toISOString().slice(0, 10),
      projectedExpiresAt: projectedExpiryDate.toISOString().slice(0, 10),
      quotas: {
        monthUsedCredits,
        maxMonthlyCredits: maxMonthly,
        yearUsedCredits,
        maxYearlyCredits: maxYearly,
      },
    };
  }

  static async createCompOffRequest(
    tenantId: string,
    profile: CallerAuthorizationProfile,
    input: {
      employeeId?: string;
      leaveTypeId?: string;
      workedOnDate: string;
      workType?: string;
      attendanceId?: string | null;
      overtimeRequestId?: string | null;
      actualHoursWorked?: number;
      requestedDays?: number;
      reason: string;
      attachmentUrl?: string | null;
      supportingDocUrl?: string | null;
      managerEmployeeId?: string | null;
      submitAsDraft?: boolean;
      idempotencyKey?: string;
    },
    options?: { selfOnly?: boolean }
  ) {
    const isSelfOnly = Boolean(options?.selfOnly);
    const targetEmployeeId = isSelfOnly
      ? profile.employeeId
      : input.employeeId || profile.employeeId;
    if (!targetEmployeeId) {
      throw new LeaveHttpError("Employee is required to submit a Comp-Off request.", 400);
    }

    if (
      !isSelfOnly &&
      targetEmployeeId !== profile.employeeId &&
      !profile.isHrAdmin &&
      !profile.isHrManager
    ) {
      throw new LeaveHttpError(
        "Forbidden: Only HR Administrators or HR Managers can create Comp-Off requests on behalf of another employee.",
        403,
        "UNAUTHORIZED_ON_BEHALF"
      );
    }

    const reason = String(input.reason || "").trim();
    if (!reason) {
      throw new LeaveHttpError("Reason for Comp-Off request is required.", 400);
    }

    const docUrl = input.supportingDocUrl ?? input.attachmentUrl ?? null;
    if (docUrl && String(docUrl).startsWith("blob:")) {
      throw new LeaveHttpError(
        "Invalid supporting document URL: browser blob URLs cannot be persisted.",
        400
      );
    }

    if (input.idempotencyKey) {
      const existingByKey = await rawPrisma.leaveEncashmentRequest.findFirst({
        where: { tenantId, idempotencyKey: String(input.idempotencyKey).trim() },
        include: { employee: true, leaveType: true },
      });
      if (existingByKey) return this.formatRequestRecord(existingByKey, profile);
    }

    const isSelfSubmission = isSelfOnly || targetEmployeeId === profile.employeeId;

    const created = await rawPrisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM employees WHERE id = ${targetEmployeeId} AND tenant_id = ${tenantId} FOR UPDATE`;

      const verified = await this.verifyAndPreviewCompOff(tenantId, {
        employeeId: targetEmployeeId,
        workedOnDate: input.workedOnDate,
        workType: input.workType,
        attendanceId: input.attendanceId,
        overtimeRequestId: input.overtimeRequestId,
        actualHoursWorked: input.actualHoursWorked,
        requestedDays: input.requestedDays,
        isSelfService: isSelfSubmission && !profile.isHrAdmin,
        db: tx,
      });

      if (verified.config.requireSupportingDoc && !docUrl && !input.submitAsDraft) {
        throw new LeaveHttpError(
          "Supporting document is required under the active Comp-Off Policy.",
          400,
          "SUPPORTING_DOCUMENT_REQUIRED"
        );
      }

      const status = input.submitAsDraft ? "DRAFT" : "PENDING";
      const requestCode = buildRequestCode("COF");
      const managerEmpId = input.managerEmployeeId || verified.employee.managerId || null;

      const rec = await tx.leaveEncashmentRequest.create({
        data: {
          tenantId,
          requestCode,
          employeeId: targetEmployeeId,
          leaveTypeId: verified.leaveType.id,
          type: "COMP_OFF",
          days: verified.requestedDays,
          creditedDays: verified.convertedDays,
          actualWorkedHours: verified.actualHoursWorked,
          workedOnDate: toUtcDateOnly(verified.workedOnDate),
          workType: verified.workType,
          attendanceId: verified.attendanceEvidence?.id || null,
          overtimeRequestId: verified.overtimeEvidence?.id || null,
          reason,
          supportingDocUrl: docUrl || null,
          status,
          submittedById: profile.userId,
          submittedAt: status === "PENDING" ? new Date() : null,
          managerId: managerEmpId,
          compOffConfigId: verified.config.id,
          configVersion: verified.config.version,
          calculationSnapshot: {
            verifiedAt: new Date().toISOString(),
            workType: verified.workType,
            dayClassification: verified.dayClassification,
            actualHoursWorked: verified.actualHoursWorked,
            convertedDays: verified.convertedDays,
            requestedDays: verified.requestedDays,
            creditExpiryDays: verified.config.expiryDays,
          },
          idempotencyKey: input.idempotencyKey ? String(input.idempotencyKey).trim() : null,
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              userId: true,
              managerId: true,
              department: { select: { id: true, name: true } },
              branch: { select: { id: true, name: true } },
            },
          },
          leaveType: true,
        },
      });

      await tx.leaveEncashmentCompOffEvent.create({
        data: {
          tenantId,
          requestId: rec.id,
          employeeId: targetEmployeeId,
          transactionType: "COMP_OFF",
          eventType: status === "DRAFT" ? "DRAFT_SAVED" : "SUBMITTED",
          actorId: profile.userId,
          actorName: profile.email,
          actorRole: profile.roles[0] || "employee",
          fromStatus: null,
          toStatus: status,
          days: verified.requestedDays,
          comments: reason,
          metadataJson: {
            workedOnDate: verified.workedOnDate,
            workType: verified.workType,
            actualHoursWorked: verified.actualHoursWorked,
            attendanceId: verified.attendanceEvidence?.id || null,
            overtimeRequestId: verified.overtimeEvidence?.id || null,
          },
        },
      });

      return rec;
    });

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: created.status === "DRAFT" ? "COMP_OFF_DRAFT_CREATED" : "COMP_OFF_REQUEST_CREATED",
      entityType: "LeaveEncashmentRequest",
      entityId: created.id,
      newState: {
        requestCode: created.requestCode,
        employeeId: created.employeeId,
        workedOnDate: created.workedOnDate,
        workType: created.workType,
        days: Number(created.days),
        status: created.status,
      },
    });

    if (created.status === "PENDING") {
      const empName = `${created.employee.firstName} ${created.employee.lastName}`.trim();
      if (created.managerId) {
        rawPrisma.employee
          .findUnique({ where: { id: created.managerId }, select: { userId: true } })
          .then((mgr) => {
            if (mgr?.userId && mgr.userId !== profile.userId) {
              return NotificationService.createNotification({
                tenantId,
                userId: mgr.userId,
                title: "Comp-Off Request Submitted",
                message: `${empName} submitted Comp-Off request ${created.requestCode} (${Number(created.days)} day(s) for work on ${created.workedOnDate?.toISOString().slice(0, 10)}).`,
                type: "COMP_OFF_SUBMITTED",
                actionUrl: "/hr/leave/encashment-compoff",
              });
            }
          })
          .catch(() => {});
      }

      void this.notifyHrUsers(
        tenantId,
        "Comp-Off Request Submitted",
        `${empName} submitted Comp-Off request ${created.requestCode} (${Number(created.days)} day(s)).`,
        "COMP_OFF_SUBMITTED",
        profile.userId
      );

      broadcastToTenant(tenantId, "leave.compoff.submitted", {
        id: created.id,
        requestCode: created.requestCode,
        employeeId: created.employeeId,
      });
    }

    return this.formatRequestRecord(created, profile);
  }

  static async updateCompOffRequest(
    tenantId: string,
    requestId: string,
    profile: CallerAuthorizationProfile,
    input: {
      workedOnDate?: string;
      workType?: string;
      attendanceId?: string | null;
      overtimeRequestId?: string | null;
      actualHoursWorked?: number;
      requestedDays?: number;
      reason?: string;
      attachmentUrl?: string | null;
      supportingDocUrl?: string | null;
      submitNow?: boolean;
    },
    options?: { selfOnly?: boolean }
  ) {
    const existing = await rawPrisma.leaveEncashmentRequest.findFirst({
      where: { id: requestId, tenantId, type: "COMP_OFF" },
      include: { employee: true },
    });
    if (!existing) {
      throw new LeaveHttpError("Comp-Off request not found.", 404);
    }

    const isOwner = Boolean(profile.employeeId && profile.employeeId === existing.employeeId);
    if (options?.selfOnly && !isOwner) {
      throw new LeaveHttpError("Forbidden: You can only update your own Comp-Off request.", 403);
    }
    if (!isOwner && !profile.isHrAdmin && !profile.isHrManager) {
      throw new LeaveHttpError("Forbidden: Insufficient permissions.", 403);
    }

    if (!["DRAFT", "PENDING"].includes(existing.status)) {
      throw new LeaveHttpError(
        `Cannot update Comp-Off request in status "${existing.status}". Only DRAFT or PENDING requests may be edited.`,
        400,
        "INVALID_EDIT_STATE"
      );
    }

    const nextWorkDate =
      input.workedOnDate ||
      (existing.workedOnDate ? existing.workedOnDate.toISOString().slice(0, 10) : "");
    const nextReason =
      input.reason !== undefined ? String(input.reason).trim() : String(existing.reason || "");
    if (!nextReason) {
      throw new LeaveHttpError("Reason is required.", 400);
    }
    const nextDoc =
      input.supportingDocUrl !== undefined
        ? input.supportingDocUrl
        : input.attachmentUrl !== undefined
          ? input.attachmentUrl
          : existing.supportingDocUrl;

    const updated = await rawPrisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM employees WHERE id = ${existing.employeeId} AND tenant_id = ${tenantId} FOR UPDATE`;

      const verified = await this.verifyAndPreviewCompOff(tenantId, {
        employeeId: existing.employeeId,
        workedOnDate: nextWorkDate,
        workType: input.workType || existing.workType || undefined,
        attendanceId:
          input.attendanceId !== undefined ? input.attendanceId : existing.attendanceId,
        overtimeRequestId:
          input.overtimeRequestId !== undefined
            ? input.overtimeRequestId
            : existing.overtimeRequestId,
        actualHoursWorked:
          input.actualHoursWorked !== undefined
            ? input.actualHoursWorked
            : existing.actualWorkedHours !== null
              ? Number(existing.actualWorkedHours)
              : undefined,
        requestedDays:
          input.requestedDays !== undefined ? input.requestedDays : Number(existing.days),
        excludeCompOffId: existing.id,
        isSelfService: isOwner && !profile.isHrAdmin,
        db: tx,
      });

      const willSubmit = Boolean(input.submitNow) || existing.status === "PENDING";
      if (verified.config.requireSupportingDoc && !nextDoc && willSubmit) {
        throw new LeaveHttpError(
          "Supporting document is required under the active Comp-Off Policy.",
          400
        );
      }

      const nextStatus = willSubmit ? "PENDING" : "DRAFT";

      const rec = await tx.leaveEncashmentRequest.update({
        where: { id: existing.id },
        data: {
          workedOnDate: toUtcDateOnly(verified.workedOnDate),
          workType: verified.workType,
          attendanceId: verified.attendanceEvidence?.id || null,
          overtimeRequestId: verified.overtimeEvidence?.id || null,
          actualWorkedHours: verified.actualHoursWorked,
          creditedDays: verified.convertedDays,
          days: verified.requestedDays,
          reason: nextReason,
          supportingDocUrl: nextDoc || null,
          status: nextStatus,
          submittedAt: willSubmit && !existing.submittedAt ? new Date() : existing.submittedAt,
          compOffConfigId: verified.config.id,
          configVersion: verified.config.version,
        },
        include: { employee: true, leaveType: true },
      });

      await tx.leaveEncashmentCompOffEvent.create({
        data: {
          tenantId,
          requestId: existing.id,
          employeeId: existing.employeeId,
          transactionType: "COMP_OFF",
          eventType: willSubmit && existing.status === "DRAFT" ? "SUBMITTED" : "UPDATED",
          actorId: profile.userId,
          actorName: profile.email,
          actorRole: profile.roles[0] || "employee",
          fromStatus: existing.status,
          toStatus: nextStatus,
          days: verified.requestedDays,
          comments: nextReason,
        },
      });

      return rec;
    });

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: "COMP_OFF_REQUEST_UPDATED",
      entityType: "LeaveEncashmentRequest",
      entityId: requestId,
      oldState: { status: existing.status, days: Number(existing.days) },
      newState: { status: updated.status, days: Number(updated.days) },
    });

    return this.formatRequestRecord(updated, profile);
  }

  private static async executeCompOffCreditInTx(
    tx: any,
    params: {
      tenantId: string;
      requestId: string;
      actorUserId: string;
      actorEmail?: string | null;
      actorRole: string;
      approvedDays?: number;
      comments?: string;
    }
  ) {
    const { tenantId, requestId, actorUserId, actorEmail, actorRole } = params;
    await tx.$queryRaw`SELECT id FROM leave_encashment_requests WHERE id = ${requestId} AND tenant_id = ${tenantId} FOR UPDATE`;

    const req = await tx.leaveEncashmentRequest.findFirst({
      where: { id: requestId, tenantId, type: "COMP_OFF" },
      include: { compOffConfig: true, employee: true },
    });
    if (!req) {
      throw new LeaveHttpError("Comp-Off request not found.", 404);
    }

    await tx.$queryRaw`SELECT id FROM employees WHERE id = ${req.employeeId} AND tenant_id = ${tenantId} FOR UPDATE`;

    const existingCreditEntry = await tx.leaveLedgerEntry.findFirst({
      where: { tenantId, referenceId: requestId, entryType: "CREDIT" },
    });
    if (existingCreditEntry || ["CREDITED", "PARTIALLY_USED", "USED"].includes(req.status)) {
      throw new LeaveHttpError(
        `Duplicate Comp-Off credit blocked: request ${req.requestCode || requestId.slice(0, 8)} has already been credited.`,
        409,
        "DUPLICATE_COMPOFF_CREDIT"
      );
    }

    const creditDays =
      params.approvedDays !== undefined
        ? assertValidRequestedDays(params.approvedDays, req.compOffConfig?.halfDayAllowed ?? true)
        : Number(req.approvedDays ?? req.days);

    if (creditDays > Number(req.days)) {
      throw new LeaveHttpError(
        `Approved credit (${creditDays}) cannot exceed requested Comp-Off days (${Number(req.days)}).`,
        400
      );
    }

    const creditDate = new Date();
    const creditDateOnly = toUtcDateOnly(creditDate);
    const expiryDays = Number(req.compOffConfig?.expiryDays || 90);
    const expiresAt = new Date(
      creditDateOnly.getTime() + expiryDays * 86400000 + 23 * 3600000 + 59 * 60000 + 59000
    );

    const balBefore = await LeaveService.getEmployeeBalance(
      tenantId,
      req.employeeId,
      req.leaveTypeId,
      creditDateOnly.getUTCFullYear(),
      { tx, skipCompOffSweep: true }
    );
    const balAfter = Number((balBefore + creditDays).toFixed(2));
    const workDateLabel = req.workedOnDate ? req.workedOnDate.toISOString().slice(0, 10) : "N/A";

    const ledgerEntry = await tx.leaveLedgerEntry.create({
      data: {
        tenantId,
        employeeId: req.employeeId,
        leaveTypeId: req.leaveTypeId,
        entryType: "CREDIT",
        days: creditDays,
        balance: balAfter,
        referenceId: requestId,
        notes: `Comp-Off credit ${req.requestCode || requestId.slice(0, 8)} (Worked: ${workDateLabel}, Expires: ${expiresAt.toISOString().slice(0, 10)})`.slice(
          0,
          250
        ),
        effectiveAt: creditDateOnly,
      },
    });

    const updated = await tx.leaveEncashmentRequest.update({
      where: { id: requestId },
      data: {
        status: "CREDITED",
        approvedDays: creditDays,
        creditedDays: creditDays,
        usedDays: 0,
        expiredDays: 0,
        remainingDays: creditDays,
        effectiveDate: creditDateOnly,
        creditedAt: creditDate,
        expiresAt,
        ledgerEntryId: ledgerEntry.id,
        approverId: actorUserId,
        approvedAt: req.approvedAt || creditDate,
        hrApproverId: req.hrApproverId || actorUserId,
        hrApprovedAt: req.hrApprovedAt || creditDate,
        ...(params.comments ? { hrComments: params.comments } : {}),
      },
      include: { employee: true, leaveType: true },
    });

    await tx.leaveEncashmentCompOffEvent.create({
      data: {
        tenantId,
        requestId,
        employeeId: req.employeeId,
        transactionType: "COMP_OFF",
        eventType: "CREDITED",
        actorId: actorUserId,
        actorName: actorEmail || null,
        actorRole,
        fromStatus: req.status,
        toStatus: "CREDITED",
        days: creditDays,
        ledgerEntryId: ledgerEntry.id,
        comments:
          params.comments ||
          `Comp-Off approved and ${creditDays} day(s) credited to leave ledger (Expires ${expiresAt.toISOString().slice(0, 10)}).`,
        metadataJson: {
          workedOnDate: workDateLabel,
          effectiveDate: creditDateOnly.toISOString().slice(0, 10),
          expiresAt: expiresAt.toISOString(),
          balanceAfterCredit: balAfter,
        },
      },
    });

    const authoritativeBalance = await LeaveService.getEmployeeBalance(
      tenantId,
      req.employeeId,
      req.leaveTypeId,
      creditDateOnly.getUTCFullYear(),
      { tx, skipCompOffSweep: true }
    );

    return { updated, ledgerEntry, authoritativeBalance, expiresAt };
  }

  static async decideCompOffRequest(
    tenantId: string,
    requestId: string,
    profile: CallerAuthorizationProfile,
    params: {
      action: "approve" | "reject";
      comments?: string;
      approvedDays?: number;
    }
  ) {
    const request = await rawPrisma.leaveEncashmentRequest.findFirst({
      where: { id: requestId, tenantId, type: "COMP_OFF" },
      include: { employee: true, leaveType: true, compOffConfig: true },
    });
    if (!request) {
      throw new LeaveHttpError("Comp-Off request not found.", 404);
    }

    this.assertNotSelfApproval(profile, request.employee);

    const isDirectManager = profile.directReportIds.includes(request.employeeId);
    if (!profile.isHrAdmin && !profile.isHrManager && !isDirectManager) {
      throw new LeaveHttpError(
        "Forbidden: Only authorized Reporting Managers, HR Managers, or HR Admins can review this Comp-Off request.",
        403,
        "UNAUTHORIZED_APPROVER"
      );
    }

    if (!["PENDING", "MANAGER_APPROVED", "HR_APPROVED"].includes(request.status)) {
      throw new LeaveHttpError(
        `Cannot review Comp-Off request in status "${request.status}".`,
        409,
        "INVALID_DECISION_STATE"
      );
    }

    const comments = String(params.comments || "").trim();

    if (params.action === "reject") {
      if (!comments) {
        throw new LeaveHttpError(
          "A rejection reason is mandatory when rejecting a Comp-Off request.",
          400
        );
      }

      const rejected = await rawPrisma.$transaction(async (tx) => {
        const claimed = await tx.leaveEncashmentRequest.updateMany({
          where: { id: requestId, tenantId, status: request.status },
          data: {
            status: "REJECTED",
            approverId: profile.userId,
            rejectionReason: comments,
          },
        });
        if (claimed.count === 0) {
          throw new LeaveHttpError("Request was already processed by another reviewer.", 409);
        }

        await tx.leaveEncashmentCompOffEvent.create({
          data: {
            tenantId,
            requestId,
            employeeId: request.employeeId,
            transactionType: "COMP_OFF",
            eventType: "REJECTED",
            actorId: profile.userId,
            actorName: profile.email,
            actorRole: profile.roles[0] || "reviewer",
            fromStatus: request.status,
            toStatus: "REJECTED",
            days: Number(request.days),
            comments,
          },
        });

        return tx.leaveEncashmentRequest.findUnique({
          where: { id: requestId },
          include: { employee: true, leaveType: true },
        });
      });

      if (request.employee.userId) {
        NotificationService.createNotification({
          tenantId,
          userId: request.employee.userId,
          title: "Comp-Off Request Rejected",
          message: `Your Comp-Off request (${request.requestCode || requestId.slice(0, 8)}) was rejected. Reason: ${comments}`,
          type: "COMP_OFF_REJECTED",
          actionUrl: "/me/leave/encashment-compoff",
        }).catch(() => {});
      }

      await AuditService.logMutation({
        tenantId,
        actorId: profile.userId,
        actorEmail: profile.email,
        action: "COMP_OFF_REQUEST_REJECTED",
        entityType: "LeaveEncashmentRequest",
        entityId: requestId,
        oldState: { status: request.status },
        newState: { status: "REJECTED", rejectionReason: comments },
      });

      return this.formatRequestRecord(rejected!, profile);
    }

    const stages = resolveApprovalStagesFromMode(request.compOffConfig?.approvalMode);
    const requiresHrStage = stages.length === 0 || stages.includes("HR");

    if (!profile.isHrAdmin && !profile.isHrManager && isDirectManager && requiresHrStage) {
      if (request.status !== "PENDING") {
        throw new LeaveHttpError(
          `Manager approval already recorded (${request.status}); awaiting HR final approval.`,
          409
        );
      }

      const mgrApproved = await rawPrisma.$transaction(async (tx) => {
        const claimed = await tx.leaveEncashmentRequest.updateMany({
          where: { id: requestId, tenantId, status: "PENDING" },
          data: {
            status: "MANAGER_APPROVED",
            managerApproverId: profile.userId,
            managerApprovedAt: new Date(),
            managerComments: comments || null,
          },
        });
        if (claimed.count === 0) {
          throw new LeaveHttpError("Request was already updated by another reviewer.", 409);
        }

        await tx.leaveEncashmentCompOffEvent.create({
          data: {
            tenantId,
            requestId,
            employeeId: request.employeeId,
            transactionType: "COMP_OFF",
            eventType: "MANAGER_APPROVED",
            actorId: profile.userId,
            actorName: profile.email,
            actorRole: "reporting_manager",
            fromStatus: "PENDING",
            toStatus: "MANAGER_APPROVED",
            days: Number(request.days),
            comments: comments || "Approved by Reporting Manager",
          },
        });

        return tx.leaveEncashmentRequest.findUnique({
          where: { id: requestId },
          include: { employee: true, leaveType: true },
        });
      });

      if (request.employee.userId) {
        NotificationService.createNotification({
          tenantId,
          userId: request.employee.userId,
          title: "Comp-Off Manager Approved",
          message: `Your Comp-Off request (${request.requestCode || requestId.slice(0, 8)}) was approved by your manager and awaits HR final approval.`,
          type: "COMP_OFF_APPROVED",
          actionUrl: "/me/leave/encashment-compoff",
        }).catch(() => {});
      }

      void this.notifyHrUsers(
        tenantId,
        "Comp-Off Manager-Approved — Awaiting HR Credit",
        `Comp-Off request ${request.requestCode} for ${request.employee.firstName} ${request.employee.lastName} awaits HR final approval.`,
        "COMP_OFF_APPROVED",
        profile.userId
      );

      await AuditService.logMutation({
        tenantId,
        actorId: profile.userId,
        actorEmail: profile.email,
        action: "COMP_OFF_MANAGER_APPROVED",
        entityType: "LeaveEncashmentRequest",
        entityId: requestId,
        oldState: { status: "PENDING" },
        newState: { status: "MANAGER_APPROVED" },
      });

      return this.formatRequestRecord(mgrApproved!, profile);
    }

    const creditResult = await rawPrisma.$transaction(async (tx) => {
      return this.executeCompOffCreditInTx(tx, {
        tenantId,
        requestId,
        actorUserId: profile.userId,
        actorEmail: profile.email,
        actorRole: profile.roles[0] || "hr_admin",
        approvedDays: params.approvedDays,
        comments,
      });
    });

    if (request.employee.userId) {
      NotificationService.createNotification({
        tenantId,
        userId: request.employee.userId,
        title: "Comp-Off Approved & Credited",
        message: `${Number(creditResult.updated.approvedDays)} Comp-Off day(s) have been credited to your leave balance (Available: ${creditResult.authoritativeBalance} day(s), Expires: ${creditResult.expiresAt.toISOString().slice(0, 10)}).`,
        type: "COMP_OFF_CREDITED",
        actionUrl: "/me/leave/encashment-compoff",
      }).catch(() => {});
    }

    if (request.managerId) {
      rawPrisma.employee
        .findUnique({ where: { id: request.managerId }, select: { userId: true } })
        .then((mgr) => {
          if (mgr?.userId && mgr.userId !== profile.userId) {
            return NotificationService.createNotification({
              tenantId,
              userId: mgr.userId,
              title: "Team Member Comp-Off Credited",
              message: `Comp-Off request ${request.requestCode} for ${request.employee.firstName} ${request.employee.lastName} was approved and credited (${Number(creditResult.updated.approvedDays)} day(s)).`,
              type: "COMP_OFF_CREDITED",
              actionUrl: "/hr/leave/encashment-compoff",
            });
          }
        })
        .catch(() => {});
    }

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: "COMP_OFF_APPROVED_AND_CREDITED",
      entityType: "LeaveEncashmentRequest",
      entityId: requestId,
      oldState: { status: request.status },
      newState: {
        status: "CREDITED",
        approvedDays: Number(creditResult.updated.approvedDays),
        ledgerEntryId: creditResult.ledgerEntry.id,
        expiresAt: creditResult.expiresAt.toISOString(),
        authoritativeBalance: creditResult.authoritativeBalance,
      },
    });

    return {
      ...this.formatRequestRecord(creditResult.updated, profile),
      authoritativeBalance: creditResult.authoritativeBalance,
    };
  }

  static async creditApprovedCompOff(
    tenantId: string,
    requestId: string,
    profile: CallerAuthorizationProfile
  ) {
    if (!profile.isHrAdmin && !profile.isHrManager) {
      throw new LeaveHttpError("Forbidden: Only HR can credit approved Comp-Off requests.", 403);
    }

    const req = await rawPrisma.leaveEncashmentRequest.findFirst({
      where: { id: requestId, tenantId, type: "COMP_OFF" },
      include: { employee: true },
    });
    if (!req) {
      throw new LeaveHttpError("Comp-Off request not found.", 404);
    }

    this.assertNotSelfApproval(profile, req.employee);

    if (["CREDITED", "PARTIALLY_USED", "USED"].includes(req.status)) {
      throw new LeaveHttpError(
        `Duplicate credit prevented: Comp-Off request ${req.requestCode || requestId.slice(0, 8)} is already ${req.status}.`,
        409,
        "DUPLICATE_COMPOFF_CREDIT"
      );
    }
    if (!["HR_APPROVED", "APPROVED", "MANAGER_APPROVED"].includes(req.status)) {
      throw new LeaveHttpError(
        `Cannot credit Comp-Off in status "${req.status}". Approve the request first.`,
        400
      );
    }

    const result = await rawPrisma.$transaction(async (tx) =>
      this.executeCompOffCreditInTx(tx, {
        tenantId,
        requestId,
        actorUserId: profile.userId,
        actorEmail: profile.email,
        actorRole: profile.roles[0] || "hr_admin",
      })
    );

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: "COMP_OFF_CREDITED",
      entityType: "LeaveEncashmentRequest",
      entityId: requestId,
      oldState: { status: req.status },
      newState: {
        status: "CREDITED",
        ledgerEntryId: result.ledgerEntry.id,
        authoritativeBalance: result.authoritativeBalance,
      },
    });

    return {
      ...this.formatRequestRecord(result.updated, profile),
      authoritativeBalance: result.authoritativeBalance,
    };
  }

  static async cancelCompOffRequest(
    tenantId: string,
    requestId: string,
    profile: CallerAuthorizationProfile,
    reason?: string,
    options?: { selfOnly?: boolean }
  ) {
    const req = await rawPrisma.leaveEncashmentRequest.findFirst({
      where: { id: requestId, tenantId, type: "COMP_OFF" },
      include: { employee: true },
    });
    if (!req) {
      throw new LeaveHttpError("Comp-Off request not found.", 404);
    }

    const isOwner = Boolean(profile.employeeId && profile.employeeId === req.employeeId);
    if (options?.selfOnly && !isOwner) {
      throw new LeaveHttpError("Forbidden: You can only cancel your own Comp-Off request.", 403);
    }
    if (!isOwner && !profile.isHrAdmin && !profile.isHrManager) {
      throw new LeaveHttpError("Forbidden: Insufficient permissions.", 403);
    }

    if (!["DRAFT", "PENDING", "MANAGER_APPROVED"].includes(req.status)) {
      throw new LeaveHttpError(
        `Cannot cancel Comp-Off request in status "${req.status}". Credited Comp-Off lots require HR reversal.`,
        400,
        "CANNOT_CANCEL_STATE"
      );
    }

    const cancelReason = String(reason || "Cancelled by user").trim();
    const cancelled = await rawPrisma.$transaction(async (tx) => {
      const rec = await tx.leaveEncashmentRequest.update({
        where: { id: requestId },
        data: {
          status: "CANCELLED",
          cancelledById: profile.userId,
          cancelledAt: new Date(),
          cancellationReason: cancelReason,
        },
        include: { employee: true, leaveType: true },
      });

      await tx.leaveEncashmentCompOffEvent.create({
        data: {
          tenantId,
          requestId,
          employeeId: req.employeeId,
          transactionType: "COMP_OFF",
          eventType: "CANCELLED",
          actorId: profile.userId,
          actorName: profile.email,
          actorRole: profile.roles[0] || "employee",
          fromStatus: req.status,
          toStatus: "CANCELLED",
          days: Number(req.days),
          comments: cancelReason,
        },
      });

      return rec;
    });

    await AuditService.logMutation({
      tenantId,
      actorId: profile.userId,
      actorEmail: profile.email,
      action: "COMP_OFF_REQUEST_CANCELLED",
      entityType: "LeaveEncashmentRequest",
      entityId: requestId,
      oldState: { status: req.status },
      newState: { status: "CANCELLED", cancellationReason: cancelReason },
    });

    return this.formatRequestRecord(cancelled, profile);
  }

  static async getCompOffBalanceAndExpiringLots(
    tenantId: string,
    employeeId: string,
    horizonOrOpts?: number | { horizonDays?: number }
  ) {
    const employee = await rawPrisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    });
    if (!employee) {
      throw new LeaveHttpError("Employee not found in this tenant.", 404);
    }

    await LeaveService.sweepOverdueCompOffLotsForEmployee(tenantId, employeeId, rawPrisma);

    const horizonDays =
      typeof horizonOrOpts === "number"
        ? horizonOrOpts
        : horizonOrOpts?.horizonDays !== undefined
          ? horizonOrOpts.horizonDays
          : 14;

    const today = toUtcDateOnly(new Date());
    const horizon = new Date(today.getTime() + horizonDays * 86400000);

    const lots = await rawPrisma.leaveEncashmentRequest.findMany({
      where: {
        tenantId,
        employeeId,
        type: "COMP_OFF",
        status: { in: ["CREDITED", "PARTIALLY_USED", "USED", "EXPIRED"] },
      },
      include: {
        leaveType: { select: { id: true, name: true, code: true } },
        usageAllocations: {
          where: { status: { in: ["RESERVED", "CONSUMED"] } },
          include: {
            leaveRequest: {
              select: { id: true, status: true, startDate: true, endDate: true, days: true },
            },
          },
        },
      },
      orderBy: [{ expiresAt: "asc" }, { workedOnDate: "asc" }],
    });

    let totalCredited = 0;
    let totalUsed = 0;
    let totalReserved = 0;
    let totalExpired = 0;
    let netAvailable = 0;
    let expiringSoonDays = 0;

    const activeLots: any[] = [];
    const expiringLots: any[] = [];

    for (const lot of lots) {
      const credited = Number(lot.approvedDays ?? lot.days ?? 0);
      const used = Number(lot.usedDays || 0);
      const expired = Number(lot.expiredDays || 0);
      const rem = Number(lot.remainingDays || 0);
      const reservedOnLot = (lot.usageAllocations || [])
        .filter((a) => a.status === "RESERVED" && (!a.leaveRequest || a.leaveRequest.status === "pending"))
        .reduce((s, a) => s + Number(a.daysAllocated || 0), 0);

      totalCredited += credited;
      totalUsed += used;
      totalExpired += expired;
      totalReserved += reservedOnLot;

      if (
        ["CREDITED", "PARTIALLY_USED"].includes(lot.status) &&
        rem > 0 &&
        (!lot.expiresAt || lot.expiresAt >= today)
      ) {
        const netLotAvail = Number(Math.max(0, rem - reservedOnLot).toFixed(2));
        netAvailable += netLotAvail;

        const daysUntilExpiry = lot.expiresAt
          ? Math.max(0, Math.ceil((lot.expiresAt.getTime() - today.getTime()) / 86400000))
          : null;

        const formattedLot = {
          id: lot.id,
          requestCode: lot.requestCode,
          workedOnDate: lot.workedOnDate?.toISOString().slice(0, 10) || null,
          workType: lot.workType,
          creditedDays: credited,
          usedDays: used,
          reservedDays: Number(reservedOnLot.toFixed(2)),
          remainingDays: rem,
          netAvailableDays: netLotAvail,
          creditedAt: lot.creditedAt,
          expiresAt: lot.expiresAt?.toISOString().slice(0, 10) || null,
          daysUntilExpiry,
          leaveType: lot.leaveType,
        };
        activeLots.push(formattedLot);

        if (lot.expiresAt && lot.expiresAt <= horizon && netLotAvail > 0) {
          expiringSoonDays += netLotAvail;
          expiringLots.push(formattedLot);
        }
      }
    }

    return {
      employee: {
        id: employee.id,
        fullName: `${employee.firstName} ${employee.lastName}`.trim(),
        employeeCode: employee.employeeCode,
      },
      totalCreditedDays: Number(totalCredited.toFixed(2)),
      totalUsedDays: Number(totalUsed.toFixed(2)),
      totalReservedDays: Number(totalReserved.toFixed(2)),
      totalExpiredDays: Number(totalExpired.toFixed(2)),
      availableDays: Number(netAvailable.toFixed(2)),
      expiringSoonDays: Number(expiringSoonDays.toFixed(2)),
      horizonDays,
      activeLots,
      expiringLots,
      expiringSoonLots: expiringLots,
    };
  }

  static async processTenantCompOffExpiry(
    tenantId: string,
    options?: {
      referenceDate?: Date;
      asOfDate?: Date;
      actorUserId?: string;
      actorEmail?: string | null;
    }
  ) {
    const now = options?.referenceDate || options?.asOfDate || new Date();

    const overdueLots = await rawPrisma.leaveEncashmentRequest.findMany({
      where: {
        tenantId,
        type: "COMP_OFF",
        status: { in: ["CREDITED", "PARTIALLY_USED"] },
        expiresAt: { lt: now },
        remainingDays: { gt: 0 },
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, userId: true } },
      },
    });

    let expiredLotsCount = 0;
    let expiredDaysTotal = 0;

    for (const lot of overdueLots) {
      const res = await rawPrisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM leave_encashment_requests WHERE id = ${lot.id} AND tenant_id = ${tenantId} FOR UPDATE`;
        const fresh = await tx.leaveEncashmentRequest.findUnique({ where: { id: lot.id } });
        if (
          !fresh ||
          !["CREDITED", "PARTIALLY_USED"].includes(fresh.status) ||
          Number(fresh.remainingDays || 0) <= 0
        ) {
          return null;
        }

        const rem = Number(fresh.remainingDays);
        const existingExp = await tx.leaveLedgerEntry.findFirst({
          where: { tenantId, referenceId: fresh.id, entryType: "EXPIRY" },
        });

        let expLedgerId = existingExp?.id || null;
        if (!existingExp) {
          const balBefore = await LeaveService.getEmployeeBalance(
            tenantId,
            fresh.employeeId,
            fresh.leaveTypeId,
            now.getUTCFullYear(),
            { tx, skipCompOffSweep: true }
          );
          const createdEntry = await tx.leaveLedgerEntry.create({
            data: {
              tenantId,
              employeeId: fresh.employeeId,
              leaveTypeId: fresh.leaveTypeId,
              entryType: "EXPIRY",
              days: rem,
              balance: Math.max(0, Number((balBefore - rem).toFixed(2))),
              referenceId: fresh.id,
              notes: `Comp-Off credit ${fresh.requestCode || fresh.id.slice(0, 8)} expired unused (${rem}d)`.slice(
                0,
                250
              ),
              effectiveAt: fresh.expiresAt || now,
            },
          });
          expLedgerId = createdEntry.id;
        }

        const nextExpiredDays = Number((Number(fresh.expiredDays || 0) + rem).toFixed(2));
        await tx.leaveEncashmentRequest.update({
          where: { id: fresh.id },
          data: {
            expiredDays: nextExpiredDays,
            remainingDays: 0,
            status: "EXPIRED",
            expiredAt: now,
            expiryLedgerEntryId: expLedgerId,
          },
        });

        await tx.leaveEncashmentCompOffEvent.create({
          data: {
            tenantId,
            requestId: fresh.id,
            employeeId: fresh.employeeId,
            transactionType: "COMP_OFF",
            eventType: "EXPIRED",
            actorId: options?.actorUserId || null,
            actorName: options?.actorEmail || null,
            actorRole: options?.actorUserId ? "hr_admin" : "system_cron",
            fromStatus: fresh.status,
            toStatus: "EXPIRED",
            days: rem,
            ledgerEntryId: expLedgerId,
            comments: `Unused Comp-Off balance (${rem} day(s)) expired on ${fresh.expiresAt?.toISOString().slice(0, 10)}. Already consumed days (${Number(fresh.usedDays || 0)}) preserved.`,
          },
        });

        return { rem, expLedgerId };
      });

      if (res) {
        expiredLotsCount++;
        expiredDaysTotal += res.rem;

        if (lot.employee?.userId) {
          NotificationService.createNotification({
            tenantId,
            userId: lot.employee.userId,
            title: "Comp-Off Credit Expired",
            message: `${res.rem} unused Comp-Off day(s) (${lot.requestCode || lot.id.slice(0, 8)}) reached expiry and were deducted from your available Comp-Off balance.`,
            type: "COMP_OFF_EXPIRED",
            actionUrl: "/me/leave/encashment-compoff",
          }).catch(() => {});
        }
      }
    }

    if (expiredLotsCount > 0) {
      void this.notifyHrUsers(
        tenantId,
        "Comp-Off Credits Expired",
        `${expiredLotsCount} Comp-Off lot(s) totaling ${Number(expiredDaysTotal.toFixed(2))} day(s) expired and were reconciled in the leave ledger.`,
        "COMP_OFF_EXPIRED"
      );

      await AuditService.logMutation({
        tenantId,
        actorId: options?.actorUserId || null,
        actorEmail: options?.actorEmail || null,
        action: "COMP_OFF_EXPIRY_PROCESSED",
        entityType: "LeaveEncashmentRequest",
        entityId: tenantId,
        newState: {
          expiredLotsCount,
          expiredDaysTotal: Number(expiredDaysTotal.toFixed(2)),
        },
      });
    }

    const maxAlertHorizon = new Date(now.getTime() + 30 * 86400000);
    const nearingCandidates = await rawPrisma.leaveEncashmentRequest.findMany({
      where: {
        tenantId,
        type: "COMP_OFF",
        status: { in: ["CREDITED", "PARTIALLY_USED"] },
        remainingDays: { gt: 0 },
        expiryWarningSentAt: null,
        expiresAt: { gte: now, lte: maxAlertHorizon },
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, userId: true } },
        compOffConfig: { select: { expiryWarningDays: true } },
      },
    });

    let warningsSent = 0;
    for (const cand of nearingCandidates) {
      const alertDays = Number(cand.compOffConfig?.expiryWarningDays ?? 7);
      const daysLeft = Math.ceil(((cand.expiresAt?.getTime() || 0) - now.getTime()) / 86400000);
      if (daysLeft <= alertDays) {
        const claimed = await rawPrisma.leaveEncashmentRequest.updateMany({
          where: { id: cand.id, tenantId, expiryWarningSentAt: null },
          data: { expiryWarningSentAt: now },
        });
        if (claimed.count > 0) {
          warningsSent++;
          if (cand.employee?.userId) {
            NotificationService.createNotification({
              tenantId,
              userId: cand.employee.userId,
              title: "Comp-Off Nearing Expiry",
              message: `You have ${Number(cand.remainingDays)} Comp-Off day(s) (${cand.requestCode || cand.id.slice(0, 8)}) expiring in ${Math.max(0, daysLeft)} day(s) on ${cand.expiresAt?.toISOString().slice(0, 10)}.`,
              type: "COMP_OFF_NEARING_EXPIRY",
              actionUrl: "/me/leave/encashment-compoff",
            }).catch(() => {});
          }
        }
      }
    }

    if (warningsSent > 0) {
      void this.notifyHrUsers(
        tenantId,
        "Employee Comp-Off Credits Nearing Expiry",
        `${warningsSent} employee Comp-Off credit lot(s) are approaching their expiry date.`,
        "COMP_OFF_NEARING_EXPIRY"
      );
    }

    return {
      expiredCount: expiredLotsCount,
      expiredLotsCount,
      expiredDaysTotal: Number(expiredDaysTotal.toFixed(2)),
      nearingExpiryNotifiedCount: warningsSent,
      preExpiryAlertsSent: warningsSent,
      warningsSent,
      processedAt: now.toISOString(),
    };
  }

  // =========================================================================
  // 6. MODULE C — TRANSACTION HISTORY, DETAIL DRAWER & CSV EXPORT
  // =========================================================================

  private static formatRequestRecord(r: any, profile: CallerAuthorizationProfile) {
    const canSeeFinancials =
      profile.isHrAdmin ||
      profile.isHrManager ||
      profile.isPayrollRole ||
      (profile.employeeId && profile.employeeId === r.employeeId);

    const netAmt = r.netPayableAmount ?? r.grossAmount ?? null;

    return {
      ...r,
      days: Number(r.days),
      approvedDays: r.approvedDays !== null && r.approvedDays !== undefined ? Number(r.approvedDays) : null,
      usedDays: Number(r.usedDays || 0),
      expiredDays: Number(r.expiredDays || 0),
      remainingDays:
        r.remainingDays !== null && r.remainingDays !== undefined ? Number(r.remainingDays) : null,
      actualWorkedHours:
        r.actualWorkedHours !== null && r.actualWorkedHours !== undefined
          ? Number(r.actualWorkedHours)
          : null,
      actualHoursWorked:
        r.actualWorkedHours !== null && r.actualWorkedHours !== undefined
          ? Number(r.actualWorkedHours)
          : null,
      creditedDays:
        r.creditedDays !== null && r.creditedDays !== undefined ? Number(r.creditedDays) : null,
      convertedDays:
        r.creditedDays !== null && r.creditedDays !== undefined ? Number(r.creditedDays) : null,
      availableBalanceSnapshot:
        r.availableBalanceSnapshot !== null && r.availableBalanceSnapshot !== undefined
          ? Number(r.availableBalanceSnapshot)
          : null,
      availableBalanceAtReq:
        r.availableBalanceSnapshot !== null && r.availableBalanceSnapshot !== undefined
          ? Number(r.availableBalanceSnapshot)
          : null,
      retainedBalanceSnapshot:
        r.retainedBalanceSnapshot !== null && r.retainedBalanceSnapshot !== undefined
          ? Number(r.retainedBalanceSnapshot)
          : null,
      retainedBalanceAfter:
        r.retainedBalanceSnapshot !== null && r.retainedBalanceSnapshot !== undefined
          ? Number(r.retainedBalanceSnapshot)
          : null,
      salaryBasisAmount:
        canSeeFinancials && r.salaryBasisAmount !== null && r.salaryBasisAmount !== undefined
          ? Number(r.salaryBasisAmount)
          : null,
      eligibleSalaryBasis:
        canSeeFinancials && r.salaryBasisAmount !== null && r.salaryBasisAmount !== undefined
          ? Number(r.salaryBasisAmount)
          : null,
      dailyRateDivisor:
        r.dailyRateDivisor !== null && r.dailyRateDivisor !== undefined
          ? Number(r.dailyRateDivisor)
          : null,
      dailyRate:
        canSeeFinancials && r.dailyRate !== null && r.dailyRate !== undefined
          ? Number(r.dailyRate)
          : null,
      unitDailyRate:
        canSeeFinancials && r.dailyRate !== null && r.dailyRate !== undefined
          ? Number(r.dailyRate)
          : null,
      grossAmount:
        canSeeFinancials && r.grossAmount !== null && r.grossAmount !== undefined
          ? Number(r.grossAmount)
          : null,
      adjustmentsAmount:
        canSeeFinancials && r.adjustmentsAmount !== null && r.adjustmentsAmount !== undefined
          ? Number(r.adjustmentsAmount)
          : null,
      netPayableAmount: canSeeFinancials && netAmt !== null ? Number(netAmt) : null,
      totalAmount: canSeeFinancials && netAmt !== null ? Number(netAmt) : null,
      calculationSnapshot: canSeeFinancials ? r.calculationSnapshot : null,
      attachmentUrl: r.supportingDocUrl || null,
      salaryComponent: r.payrollComponent || null,
      payrollMonth: r.payrollPeriodMonth ?? null,
      payrollYear: r.payrollPeriodYear ?? null,
    };
  }

  static async listRequestsAndHistory(
    tenantId: string,
    profile: CallerAuthorizationProfile,
    query: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      tab?: "ENCASHMENT" | "COMP_OFF" | "HISTORY";
      type?: string;
      employeeId?: string;
      departmentId?: string;
      branchId?: string;
      leaveTypeId?: string;
      status?: string;
      payrollPeriod?: string;
      payrollMonth?: string | number;
      payrollYear?: string | number;
      startDate?: string;
      endDate?: string;
      search?: string;
      selfOnly?: boolean;
      teamOnly?: boolean;
    }
  ) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const skip = (page - 1) * limit;

    const andClauses: any[] = [{ tenantId }];

    if (query.selfOnly) {
      andClauses.push({ employeeId: profile.employeeId || "__NONE__" });
    } else if (query.teamOnly) {
      andClauses.push({
        employeeId: {
          in: profile.directReportIds.length > 0 ? profile.directReportIds : ["__NONE__"],
        },
      });
    } else if (!profile.isHrAdmin && !profile.isHrManager) {
      if (profile.isPayrollRole) {
        andClauses.push({ type: "ENCASHMENT" });
      } else {
        const allowedEmpIds = [
          ...(profile.employeeId ? [profile.employeeId] : []),
          ...profile.directReportIds,
        ];
        andClauses.push({
          employeeId: { in: allowedEmpIds.length > 0 ? allowedEmpIds : ["__NONE__"] },
        });
      }
    }

    const effectiveType =
      query.tab === "ENCASHMENT"
        ? "ENCASHMENT"
        : query.tab === "COMP_OFF"
          ? "COMP_OFF"
          : query.type && query.type !== "all"
            ? String(query.type).toUpperCase()
            : null;

    if (effectiveType === "ENCASHMENT" || effectiveType === "COMP_OFF") {
      andClauses.push({ type: effectiveType });
    }
    if (query.employeeId && query.employeeId !== "all") {
      andClauses.push({ employeeId: String(query.employeeId) });
    }
    if (query.leaveTypeId && query.leaveTypeId !== "all") {
      andClauses.push({ leaveTypeId: String(query.leaveTypeId) });
    }
    if (query.status && query.status !== "all") {
      andClauses.push({ status: String(query.status).toUpperCase() });
    }
    if (query.departmentId && query.departmentId !== "all") {
      andClauses.push({ employee: { departmentId: String(query.departmentId) } });
    }
    if (query.branchId && query.branchId !== "all") {
      andClauses.push({ employee: { branchId: String(query.branchId) } });
    }
    if (query.payrollPeriod && query.payrollPeriod !== "all") {
      const p = String(query.payrollPeriod).trim();
      let pm = 0;
      let py = 0;
      if (/^\d{4}-\d{2}$/.test(p)) {
        py = parseInt(p.slice(0, 4), 10);
        pm = parseInt(p.slice(5, 7), 10);
      } else if (/^\d{1,2}\/\d{4}$/.test(p)) {
        const parts = p.split("/");
        pm = parseInt(parts[0], 10);
        py = parseInt(parts[1], 10);
      }
      if (pm > 0 && py > 0) {
        andClauses.push({ payrollPeriodMonth: pm, payrollPeriodYear: py });
      }
    } else {
      if (query.payrollMonth && query.payrollMonth !== "all") {
        const pm = parseInt(String(query.payrollMonth), 10);
        if (pm > 0) andClauses.push({ payrollPeriodMonth: pm });
      }
      if (query.payrollYear && query.payrollYear !== "all") {
        const py = parseInt(String(query.payrollYear), 10);
        if (py > 0) andClauses.push({ payrollPeriodYear: py });
      }
    }
    if (query.startDate || query.endDate) {
      const gte = query.startDate ? toUtcDateOnly(query.startDate) : undefined;
      const lte = query.endDate
        ? new Date(`${query.endDate.slice(0, 10)}T23:59:59.999Z`)
        : undefined;
      const rangeCond = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
      andClauses.push({
        OR: [{ createdAt: rangeCond }, { effectiveDate: rangeCond }, { workedOnDate: rangeCond }],
      });
    }
    if (query.search && String(query.search).trim()) {
      const q = String(query.search).trim();
      andClauses.push({
        OR: [
          { requestCode: { contains: q, mode: "insensitive" } },
          { payrollRef: { contains: q, mode: "insensitive" } },
          { reason: { contains: q, mode: "insensitive" } },
          { employee: { firstName: { contains: q, mode: "insensitive" } } },
          { employee: { lastName: { contains: q, mode: "insensitive" } } },
          { employee: { employeeCode: { contains: q, mode: "insensitive" } } },
          { leaveType: { name: { contains: q, mode: "insensitive" } } },
        ],
      });
    }

    const allowedSortFields: Record<string, string> = {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      days: "days",
      approvedDays: "approvedDays",
      totalAmount: "netPayableAmount",
      netPayableAmount: "netPayableAmount",
      status: "status",
      effectiveDate: "effectiveDate",
      workedOnDate: "workedOnDate",
      expiresAt: "expiresAt",
      payrollProcessedAt: "payrollProcessedAt",
    };
    const sortField = allowedSortFields[String(query.sortBy || "createdAt")] || "createdAt";
    const sortDir = query.sortOrder === "asc" ? "asc" : "desc";

    const where = { AND: andClauses };
    const [rows, total] = await Promise.all([
      rawPrisma.leaveEncashmentRequest.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              position: true,
              departmentId: true,
              branchId: true,
              department: { select: { id: true, name: true } },
              branch: { select: { id: true, name: true } },
            },
          },
          leaveType: { select: { id: true, name: true, code: true, color: true } },
          payrollComponent: { select: { id: true, code: true, name: true } },
          payrollRun: {
            select: {
              id: true,
              periodMonth: true,
              periodYear: true,
              status: true,
              approvalStatus: true,
              isPublished: true,
            },
          },
        },
        orderBy: { [sortField]: sortDir },
        skip,
        take: limit,
      }),
      rawPrisma.leaveEncashmentRequest.count({ where }),
    ]);

    const approverUserIds = Array.from(
      new Set(
        rows
          .flatMap((r) => [r.approverId, r.managerApproverId, r.hrApproverId])
          .filter((x): x is string => Boolean(x))
      )
    );
    const approverUsers =
      approverUserIds.length > 0
        ? await rawPrisma.user.findMany({
            where: { id: { in: approverUserIds } },
            select: { id: true, email: true, profile: { select: { fullName: true } } },
          })
        : [];
    const approverMap = new Map(
      approverUsers.map((u) => [u.id, u.profile?.fullName || u.email || u.id])
    );

    const formattedRows = rows.map((r) => {
      const primaryApproverId = r.hrApproverId || r.approverId || r.managerApproverId || null;
      return {
        ...this.formatRequestRecord(r, profile),
        approverName: primaryApproverId ? approverMap.get(primaryApproverId) || null : null,
        managerApproverName: r.managerApproverId
          ? approverMap.get(r.managerApproverId) || null
          : null,
        hrApproverName: r.hrApproverId ? approverMap.get(r.hrApproverId) || null : null,
      };
    });

    return {
      data: formattedRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  static async getTransactionDetail(
    tenantId: string,
    requestId: string,
    profile: CallerAuthorizationProfile,
    options?: { selfOnly?: boolean }
  ) {
    const req = await rawPrisma.leaveEncashmentRequest.findFirst({
      where: { id: requestId, tenantId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            position: true,
            employmentCategory: true,
            department: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
            manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          },
        },
        leaveType: true,
        payrollComponent: true,
        encashmentConfig: {
          select: {
            id: true,
            name: true,
            version: true,
            salaryBasisType: true,
            dailyRateDivisorMode: true,
          },
        },
        compOffConfig: {
          select: { id: true, name: true, version: true, expiryDays: true },
        },
        payrollRun: {
          select: {
            id: true,
            periodMonth: true,
            periodYear: true,
            status: true,
            approvalStatus: true,
            isPublished: true,
            publishedAt: true,
          },
        },
        payslip: {
          select: {
            id: true,
            periodMonth: true,
            periodYear: true,
            status: true,
            isPublished: true,
            publishedAt: true,
          },
        },
        usageAllocations: {
          include: {
            leaveRequest: {
              select: {
                id: true,
                startDate: true,
                endDate: true,
                days: true,
                status: true,
                reason: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        events: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!req) {
      throw new LeaveHttpError("Transaction record not found.", 404);
    }

    if (!this.canViewRecord(profile, req, options?.selfOnly)) {
      throw new LeaveHttpError(
        "Forbidden: You are not authorized to access this transaction.",
        403
      );
    }

    const [attendanceRecord, overtimeRecord] = await Promise.all([
      req.attendanceId
        ? rawPrisma.attendance.findFirst({
            where: { id: req.attendanceId, tenantId },
            select: {
              id: true,
              date: true,
              status: true,
              checkIn: true,
              checkOut: true,
              hours: true,
              source: true,
            },
          })
        : Promise.resolve(null),
      req.overtimeRequestId
        ? rawPrisma.overtimeRequest.findFirst({
            where: { id: req.overtimeRequestId, tenantId },
            select: {
              id: true,
              overtimeDate: true,
              hoursRequested: true,
              status: true,
              reason: true,
            },
          })
        : Promise.resolve(null),
    ]);

    const ledgerRefIds = [
      req.id,
      ...(req.usageAllocations || []).map((a) => a.leaveRequestId),
    ];
    const ledgerEntries = await rawPrisma.leaveLedgerEntry.findMany({
      where: {
        tenantId,
        employeeId: req.employeeId,
        OR: [
          { referenceId: { in: ledgerRefIds } },
          {
            id: {
              in: [
                req.ledgerEntryId,
                req.expiryLedgerEntryId,
                req.reversalLedgerEntryId,
              ].filter((x): x is string => Boolean(x)),
            },
          },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    const actorIds = Array.from(
      new Set(
        [
          req.submittedById,
          req.approverId,
          req.managerApproverId,
          req.hrApproverId,
          req.cancelledById,
          req.reversedById,
          ...req.events.map((e) => e.actorId),
        ].filter((x): x is string => Boolean(x))
      )
    );
    const actors =
      actorIds.length > 0
        ? await rawPrisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, email: true, profile: { select: { fullName: true } } },
          })
        : [];
    const actorMap = new Map(actors.map((a) => [a.id, a.profile?.fullName || a.email || a.id]));

    const canSeeFinancials =
      profile.isHrAdmin ||
      profile.isHrManager ||
      profile.isPayrollRole ||
      (profile.employeeId && profile.employeeId === req.employeeId);

    const enrichedEvents = req.events.map((ev) => ({
      ...ev,
      days: ev.days !== null ? Number(ev.days) : null,
      amount: canSeeFinancials && ev.amount !== null ? Number(ev.amount) : null,
      actorName: ev.actorId
        ? actorMap.get(ev.actorId) || ev.actorName || null
        : ev.actorName || "System Automation",
    }));

    const approvalTimeline = enrichedEvents.filter((e) =>
      [
        "DRAFT_SAVED",
        "SUBMITTED",
        "RESUBMITTED",
        "CLARIFICATION_REQUESTED",
        "MANAGER_APPROVED",
        "HR_APPROVED",
        "APPROVED",
        "CREDITED",
        "REJECTED",
        "CANCELLED",
      ].includes(e.eventType)
    );

    const payrollTimeline = enrichedEvents.filter((e) =>
      ["APPROVED", "SENT_TO_PAYROLL", "PAYROLL_FAILED", "PAID", "REVERSED"].includes(e.eventType)
    );

    const formattedAllocations = (req.usageAllocations || []).map((a) => ({
      ...a,
      daysAllocated: Number(a.daysAllocated),
      allocatedDays: Number(a.daysAllocated),
      leaveRequest: a.leaveRequest
        ? { ...a.leaveRequest, days: Number(a.leaveRequest.days) }
        : null,
    }));

    return {
      ...this.formatRequestRecord(req, profile),
      attendance: attendanceRecord
        ? {
            ...attendanceRecord,
            hours: attendanceRecord.hours !== null ? Number(attendanceRecord.hours) : null,
          }
        : null,
      overtimeRequest: overtimeRecord
        ? {
            ...overtimeRecord,
            date: overtimeRecord.overtimeDate,
            hours: Number(overtimeRecord.hoursRequested),
          }
        : null,
      usageAllocations: formattedAllocations,
      compOffAllocations: formattedAllocations,
      approverName: req.approverId ? actorMap.get(req.approverId) || null : null,
      managerApproverName: req.managerApproverId
        ? actorMap.get(req.managerApproverId) || null
        : null,
      hrApproverName: req.hrApproverId ? actorMap.get(req.hrApproverId) || null : null,
      events: enrichedEvents,
      approvalTimeline,
      payrollTimeline,
      ledgerEntries: ledgerEntries.map((le) => ({
        ...le,
        days: Number(le.days),
        balance: Number(le.balance),
      })),
    };
  }

  static async exportTransactionsCsv(
    tenantId: string,
    profile: CallerAuthorizationProfile,
    query: any
  ): Promise<string> {
    const res = await this.listRequestsAndHistory(tenantId, profile, {
      ...query,
      page: 1,
      limit: 1000,
    });

    const esc = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n\r]/.test(s) ? `"${s}"` : s;
    };

    const headers = [
      "Transaction ID",
      "Employee Code",
      "Employee Name",
      "Department",
      "Branch",
      "Transaction Type",
      "Leave Type",
      "Work Date",
      "Effective Date",
      "Requested Days",
      "Approved Days",
      "Used Days",
      "Remaining Days",
      "Amount",
      "Currency",
      "Payroll Period",
      "Payroll Reference",
      "Status",
      "Approver",
      "Expiry Date",
      "Processed Date",
      "Created Date",
      "Updated Date",
    ];

    const lines = [headers.join(",")];
    for (const r of res.data as any[]) {
      const empName = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.trim();
      const payPeriod =
        r.payrollMonth && r.payrollYear
          ? `${String(r.payrollMonth).padStart(2, "0")}/${r.payrollYear}`
          : "";

      lines.push(
        [
          esc(r.requestCode || r.id),
          esc(r.employee?.employeeCode || ""),
          esc(empName),
          esc(r.employee?.department?.name || ""),
          esc(r.employee?.branch?.name || ""),
          esc(r.type),
          esc(r.leaveType?.name || ""),
          esc(r.workedOnDate ? new Date(r.workedOnDate).toISOString().slice(0, 10) : ""),
          esc(r.effectiveDate ? new Date(r.effectiveDate).toISOString().slice(0, 10) : ""),
          esc(r.days),
          esc(r.approvedDays ?? ""),
          esc(r.usedDays ?? 0),
          esc(r.remainingDays ?? ""),
          esc(r.totalAmount ?? ""),
          esc(r.currency || ""),
          esc(payPeriod),
          esc(r.payrollRef || ""),
          esc(r.status),
          esc(r.approverName || ""),
          esc(r.expiresAt ? new Date(r.expiresAt).toISOString().slice(0, 10) : ""),
          esc(r.payrollProcessedAt ? new Date(r.payrollProcessedAt).toISOString() : ""),
          esc(r.createdAt ? new Date(r.createdAt).toISOString() : ""),
          esc(r.updatedAt ? new Date(r.updatedAt).toISOString() : ""),
        ].join(",")
      );
    }

    return lines.join("\n");
  }
}
