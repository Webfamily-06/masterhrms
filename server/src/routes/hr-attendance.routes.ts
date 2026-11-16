import { Router, Response, NextFunction } from "express";
import { rawPrisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";
import { AttendanceService } from "../services/attendance.service";
import { AttendanceAutomationService } from "../services/attendance-automation.service";
import { AuditService } from "../services/audit.service";
import { broadcastToTenant } from "../socket";
import { buildDataScopeFilter, DataScope } from "../lib/data-scope";
import { AttendanceExportService, AttendanceCycle } from "../services/attendance-export.service.js";
import { SandwichLeaveService } from "../services/sandwich-leave.service.js";
import { ContractLifecycleService } from "../services/contract-lifecycle.service.js";
import { LeaveService } from "../services/leave.service";

export const hrAttendanceRouter = Router();

hrAttendanceRouter.use(requireAuth, resolveTenantContext);

function isElevatedHrAttendanceAdmin(req: AuthRequest): boolean {
  const perms = req.user?.permissions || [];
  return (
    LeaveService.isElevatedHrUser(req.user?.roles) ||
    perms.includes("*") ||
    perms.includes("hrm.attendance.manage")
  );
}

// Router-level RBAC guard:
// - Read-only reference metadata (/departments, /policies, /shifts, /month-lock) remains accessible to authenticated workspace users (e.g., Employee Edit & ESS display).
// - Administrative configuration & manual override mutations require elevated HR/Workspace Admin privileges (403 HR_ADMIN_REQUIRED).
// - Operational HR/Team views, approvals, and exports require either elevated HR/Admin OR Reporting Manager privileges (403 FORBIDDEN).
const READONLY_REFERENCE_PATHS = new Set(["/departments", "/policies", "/shifts", "/month-lock"]);
const ADMIN_MUTATION_PREFIXES = [
  "/records",
  "/month-lock",
  "/policies",
  "/shifts",
  "/devices",
  "/automation",
  "/settings",
];

hrAttendanceRouter.use(async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.method === "GET" && READONLY_REFERENCE_PATHS.has(req.path)) {
      return next();
    }

    const isHrAdmin = isElevatedHrAttendanceAdmin(req);
    if (isHrAdmin) {
      return next();
    }

    // Non-GET administrative mutations on policies, shifts, rosters, month-locks, bulk/manual records, devices, automation
    const isShiftSwapAction = req.path.startsWith("/shifts/swaps/");
    if (
      req.method !== "GET" &&
      !isShiftSwapAction &&
      ADMIN_MUTATION_PREFIXES.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`))
    ) {
      return res.status(403).json({
        error: "Forbidden: HR Administrator privileges are required for attendance configuration and overrides.",
        code: "HR_ADMIN_REQUIRED",
      });
    }

    // Check Reporting Manager status for team views & approval actions
    const tenantId = req.tenantId!;
    const callerEmp = await rawPrisma.employee.findFirst({
      where: { tenantId, userId: req.user!.userId },
      select: { id: true },
    });
    const directReportCount = callerEmp
      ? await rawPrisma.employee.count({ where: { tenantId, managerId: callerEmp.id } })
      : 0;
    const isManager =
      Boolean(req.user?.roles?.some((r) => ["manager", "team_lead", "department_head"].includes(String(r).toLowerCase()))) ||
      directReportCount > 0;

    if (!isManager) {
      return res.status(403).json({
        error: "Forbidden: HR Administrator or Reporting Manager privileges are required.",
        code: "FORBIDDEN",
      });
    }

    (req as any).callerManagerEmployeeId = callerEmp?.id || null;
    return next();
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Authorization check failed" });
  }
});

async function assertNotSelfOrOutOfScopeApproval(
  req: AuthRequest,
  tenantId: string,
  targetEmployeeId: string
): Promise<{ ok: boolean; status?: number; error?: string; code?: string }> {
  const callerUserId = req.user!.userId;
  const targetEmp = await rawPrisma.employee.findFirst({
    where: { id: targetEmployeeId, tenantId },
    select: { id: true, userId: true, managerId: true },
  });
  if (!targetEmp) {
    return { ok: false, status: 404, error: "Target employee not found", code: "NOT_FOUND" };
  }
  const callerEmp = await rawPrisma.employee.findFirst({
    where: { tenantId, userId: callerUserId },
    select: { id: true },
  });
  if (targetEmp.userId === callerUserId || (callerEmp && callerEmp.id === targetEmp.id)) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden: Self-approval is not permitted.",
      code: "SELF_APPROVAL_FORBIDDEN",
    };
  }
  if (!isElevatedHrAttendanceAdmin(req)) {
    if (!callerEmp || targetEmp.managerId !== callerEmp.id) {
      return {
        ok: false,
        status: 403,
        error: "Forbidden: You can only review requests for your direct reports.",
        code: "EMPLOYEE_SCOPE_FORBIDDEN",
      };
    }
  }
  return { ok: true };
}

// GET /api/v1/hr/attendance/departments
hrAttendanceRouter.get("/departments", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const departments = await rawPrisma.department.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return res.json({ data: departments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/attendance/records
hrAttendanceRouter.get("/records", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const pagination = parsePaginationParams(req, "date", 50);
    const { employeeId, branchId, departmentId, date, month, year, status } = req.query;

    const where: any = { tenantId };

    if (employeeId && employeeId !== "all") where.employeeId = String(employeeId);
    if (status && status !== "all") where.status = String(status);

    if (date) {
      const parts = String(date).split("-");
      if (parts.length === 3) {
        where.date = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
      } else {
        where.date = new Date(String(date));
      }
    } else if (month && year) {
      const y = parseInt(String(year), 10);
      const m = parseInt(String(month), 10) - 1;
      const start = new Date(Date.UTC(y, m, 1));
      const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      where.date = { gte: start, lte: end };
    }

    if (branchId && branchId !== "all") {
      where.employee = { ...where.employee, branchId: String(branchId) };
    }
    if (departmentId && departmentId !== "all") {
      where.employee = { ...where.employee, departmentId: String(departmentId) };
    }

    if (pagination.search) {
      where.OR = [
        { employee: { firstName: { contains: pagination.search, mode: "insensitive" } } },
        { employee: { lastName: { contains: pagination.search, mode: "insensitive" } } },
        { employee: { employeeCode: { contains: pagination.search, mode: "insensitive" } } },
      ];
    }

    const [total, records] = await Promise.all([
      rawPrisma.attendance.count({ where }),
      rawPrisma.attendance.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              branch: { select: { id: true, name: true } },
              department: { select: { id: true, name: true } },
              designation: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { date: pagination.sortType },
        skip: pagination.skip,
        take: pagination.limit,
      }),
    ]);

    return res.json(formatPaginatedResponse(records, total, pagination));
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list attendance records" });
  }
});

// GET /api/v1/hr/attendance/matrix
hrAttendanceRouter.get("/matrix", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const year = parseInt(String(req.query.year || new Date().getUTCFullYear()), 10);
    const month = parseInt(String(req.query.month || new Date().getUTCMonth() + 1), 10);
    const { employeeId, branchId, departmentId, search } = req.query;

    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

    // Resolve employees
    const empWhere: any = { tenantId, status: "active" };
    if (employeeId && employeeId !== "all") empWhere.id = String(employeeId);
    if (branchId && branchId !== "all") empWhere.branchId = String(branchId);
    if (departmentId && departmentId !== "all") empWhere.departmentId = String(departmentId);
    if (search) {
      empWhere.OR = [
        { firstName: { contains: String(search), mode: "insensitive" } },
        { lastName: { contains: String(search), mode: "insensitive" } },
        { employeeCode: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const [employees, attendanceRecords, approvedLeaves, attendancePolicies, shiftRosters, holidays] = await Promise.all([
      rawPrisma.employee.findMany({
        where: empWhere,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          branchId: true,
          departmentId: true,
          designation: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          user: {
            select: {
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      rawPrisma.attendance.findMany({
        where: {
          tenantId,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      rawPrisma.leaveRequest.findMany({
        where: {
          tenantId,
          status: "approved",
          startDate: { lte: endOfMonth },
          endDate: { gte: startOfMonth },
        },
        include: { leaveType: true },
      }),
      rawPrisma.attendancePolicy.findMany({
        where: { tenantId },
      }),
      rawPrisma.shiftRoster.findMany({
        where: {
          tenantId,
          rosterDate: { gte: startOfMonth, lte: endOfMonth },
        },
        include: {
          shift: true,
        },
      }),
      rawPrisma.holiday.findMany({
        where: {
          tenantId,
          status: "active",
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
    ]);

    const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Create lookup map: `${empId}_${day}` -> attendance record
    const attendanceMap = new Map<string, any>();
    for (const r of attendanceRecords) {
      const d = new Date(r.date);
      const dayNum = d.getUTCDate();
      attendanceMap.set(`${r.employeeId}_${dayNum}`, r);
    }

    // Create lookup for leaves: `${empId}_${day}` -> leave
    const leaveMap = new Map<string, any>();
    for (const l of approvedLeaves) {
      const lStart = new Date(l.startDate);
      const lEnd = new Date(l.endDate);
      for (let day = 1; day <= daysInMonth; day++) {
        const curDate = new Date(Date.UTC(year, month - 1, day));
        if (curDate >= lStart && curDate <= lEnd) {
          leaveMap.set(`${l.employeeId}_${day}`, l);
        }
      }
    }

    // Create lookup for shift rosters: `${empId}_${day}` -> roster
    const rosterMap = new Map<string, any>();
    for (const sr of shiftRosters) {
      const d = new Date(sr.rosterDate);
      const dayNum = d.getUTCDate();
      rosterMap.set(`${sr.employeeId}_${dayNum}`, sr);
    }

    // Policy resolver per employee (branch/department match or fallback to default)
    const defaultPolicy = attendancePolicies.find((p) => p.isDefault) || attendancePolicies[0];
    const getEmployeePolicy = (emp: any) => {
      let policy = attendancePolicies.find(
        (p) => p.branchId === emp.branchId && p.departmentId === emp.departmentId
      );
      if (!policy && emp.branchId) {
        policy = attendancePolicies.find((p) => p.branchId === emp.branchId && !p.departmentId);
      }
      if (!policy && emp.departmentId) {
        policy = attendancePolicies.find((p) => !p.branchId && p.departmentId === emp.departmentId);
      }
      return (
        policy ||
        defaultPolicy || {
          workingDays: "Mon,Tue,Wed,Thu,Fri",
          graceMinutes: 15,
          halfDayHours: 4.0,
          fullDayHours: 8.0,
          isOvertimeAllowed: true,
        }
      );
    };

    // Check organization sandwich leave policy
    const sandwichSetting = await SandwichLeaveService.getSandwichPolicySetting(tenantId);
    const sandwichMap = new Map<string, Set<string>>();
    if (sandwichSetting.sandwichRuleEnabled) {
      await Promise.all(
        employees.map(async (emp) => {
          try {
            const sw = await SandwichLeaveService.evaluateEmployeeSandwichLeave(
              tenantId,
              emp.id,
              startOfMonth,
              endOfMonth
            );
            if (sw.sandwichDates.length > 0) {
              sandwichMap.set(emp.id, new Set(sw.sandwichDates));
            }
          } catch {
            // fallback gracefully
          }
        })
      );
    }

    const matrixRows = employees.map((emp) => {
      const empPolicy = getEmployeePolicy(emp);
      const workingDaysConfig = (empPolicy.workingDays || "Mon,Tue,Wed,Thu,Fri").toLowerCase();
      let empWorkingDays = 0;

      let presentCount = 0;
      let lateCount = 0;
      let halfDayCount = 0;
      let leaveCount = 0;
      let sandwichCount = 0;
      let absentCount = 0;
      let weeklyOffCount = 0;
      let holidayCount = 0;
      let totalHours = 0;
      let totalOvertimeMinutes = 0;

      const empSandwichDates = sandwichMap.get(emp.id);
      const days: any[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const curDate = new Date(Date.UTC(year, month - 1, day));
        const dayOfWeek = dayNames[curDate.getUTCDay()];
        const isFuture = curDate > todayUtc;
        const isToday = curDate.getTime() === todayUtc.getTime();

        // Check if holiday applies to this employee
        const holiday = holidays.find((h) => {
          const hd = new Date(h.date);
          const matchesDate =
            hd.getUTCFullYear() === year &&
            hd.getUTCMonth() === month - 1 &&
            hd.getUTCDate() === day;
          if (!matchesDate) return false;
          if (!h.branchIds || h.branchIds.length === 0) return true;
          return emp.branchId ? h.branchIds.includes(emp.branchId) : true;
        });

        // Check shift roster
        const roster = rosterMap.get(`${emp.id}_${day}`);
        let isWorkingDay = false;

        if (roster) {
          if (roster.status === "weekly_off") {
            isWorkingDay = false;
          } else {
            isWorkingDay = true;
          }
        } else {
          isWorkingDay = workingDaysConfig.includes(dayOfWeek);
        }

        // Working day count excluding holidays
        if (isWorkingDay && !holiday) {
          empWorkingDays++;
        }

        const record = attendanceMap.get(`${emp.id}_${day}`);
        const leave = leaveMap.get(`${emp.id}_${day}`);

        let statusCode = "NOT_ADDED";
        let displayLabel = "?";
        let hours = 0;
        let isLate = false;
        let isEarlyOut = false;
        let isOvertime = false;
        let checkIn: string | null = null;
        let checkOut: string | null = null;
        let notes = "";

        if (isFuture) {
          statusCode = "FUTURE";
          displayLabel = "-";
        } else if (record) {
          hours = record.hours ? Number(record.hours) : 0;
          totalHours += hours;
          checkIn = record.checkIn ? new Date(record.checkIn).toISOString() : null;
          checkOut = record.checkOut ? new Date(record.checkOut).toISOString() : null;
          notes = record.notes || "";
          isLate = !!(record.lateMinutes && record.lateMinutes > 0) || record.status === "late";
          isEarlyOut = !!(record.earlyOutMinutes && record.earlyOutMinutes > 0);
          isOvertime = !!(record.overtimeMinutes && record.overtimeMinutes > 0);
          if (record.overtimeMinutes) totalOvertimeMinutes += Number(record.overtimeMinutes);

          if (record.status === "present" || record.status === "late") {
            statusCode = "PRESENT";
            displayLabel = "P";
            presentCount++;
            if (isLate) lateCount++;
          } else if (record.status === "half_day") {
            statusCode = "HALF_DAY";
            displayLabel = "HD";
            halfDayCount++;
          } else if (record.status === "on_leave") {
            statusCode = "ON_LEAVE";
            displayLabel = "L";
            leaveCount++;
          } else if (record.status === "absent") {
            statusCode = "ABSENT";
            displayLabel = "A";
            absentCount++;
          } else {
            statusCode = "PRESENT";
            displayLabel = "P";
            presentCount++;
          }
        } else if (leave) {
          statusCode = "ON_LEAVE";
          displayLabel = "L";
          leaveCount++;
          notes = `Approved Leave: ${leave.leaveType?.name || "Leave"}`;
        } else if (empSandwichDates && empSandwichDates.has(curDate.toISOString().slice(0, 10))) {
          statusCode = "SANDWICH_LEAVE";
          displayLabel = "SL";
          sandwichCount++;
          leaveCount++;
          notes = "Sandwich Leave: Intervening non-working day bounded by approved leaves";
        } else if (holiday) {
          statusCode = "HOLIDAY";
          displayLabel = "H";
          holidayCount++;
          notes = `Holiday: ${holiday.name}`;
        } else if (!isWorkingDay) {
          statusCode = "WEEKLY_OFF";
          displayLabel = "WO";
          weeklyOffCount++;
        } else if (isToday) {
          statusCode = "NOT_ADDED";
          displayLabel = "?";
        } else {
          // Elapsed working day without punch is Absent
          statusCode = "ABSENT";
          displayLabel = "A";
          absentCount++;
        }

        days.push({
          day,
          date: curDate.toISOString().slice(0, 10),
          statusCode,
          displayLabel,
          hours,
          isLate,
          isEarlyOut,
          isOvertime,
          checkIn,
          checkOut,
          lateMinutes: record?.lateMinutes || 0,
          earlyOutMinutes: record?.earlyOutMinutes || 0,
          overtimeMinutes: record?.overtimeMinutes || 0,
          notes,
          source: record?.source || (leave ? "LEAVE" : holiday ? "HOLIDAY" : undefined),
        });
      }

      const totalActiveDays = presentCount + halfDayCount * 0.5;
      const attendancePercentage =
        empWorkingDays > 0 ? Math.round((totalActiveDays / empWorkingDays) * 100) : 100;

      return {
        employee: {
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`.trim(),
          code: emp.employeeCode,
          designation: emp.designation?.name || "Staff",
          department: emp.department?.name || "General",
          branch: emp.branch?.name || "HQ",
          avatarUrl: (emp as any).user?.profile?.avatarUrl || null,
        },
        days,
        summary: {
          presentCount,
          lateCount,
          halfDayCount,
          leaveCount,
          sandwichLeaveCount: sandwichCount,
          absentCount,
          weeklyOffCount,
          holidayCount,
          totalHours: Math.round(totalHours * 10) / 10,
          totalOvertimeMinutes,
          attendancePercentage,
          totalActiveDays: Math.round(totalActiveDays * 10) / 10,
          totalWorkingDays: empWorkingDays,
          attendanceScore: `${Math.round(totalActiveDays * 10) / 10}/${empWorkingDays}`,
        },
      };
    });

    // Month totals
    const totalPresentDays = matrixRows.reduce((acc, r) => acc + r.summary.presentCount, 0);
    const totalLateDays = matrixRows.reduce((acc, r) => acc + r.summary.lateCount, 0);
    const totalHalfDays = matrixRows.reduce((acc, r) => acc + r.summary.halfDayCount, 0);
    const totalLeaveDays = matrixRows.reduce((acc, r) => acc + r.summary.leaveCount, 0);
    const totalSandwichDays = matrixRows.reduce((acc, r) => acc + r.summary.sandwichLeaveCount, 0);
    const totalAbsentDays = matrixRows.reduce((acc, r) => acc + r.summary.absentCount, 0);
    const totalOvertimeHours = Math.round(
      matrixRows.reduce((acc, r) => acc + r.summary.totalOvertimeMinutes, 0) / 60
    );
    const totalWorkingDays =
      matrixRows.length > 0 ? Math.max(...matrixRows.map((r) => r.summary.totalWorkingDays)) : 0;

    return res.json({
      year,
      month,
      daysInMonth,
      totalWorkingDays,
      summary: {
        totalEmployees: employees.length,
        totalPresentDays,
        totalLateDays,
        totalHalfDays,
        totalLeaveDays,
        totalSandwichDays,
        totalAbsentDays,
        totalOvertimeHours,
      },
      matrix: matrixRows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate attendance matrix" });
  }
});

// POST /api/v1/hr/attendance/records (Manual adjustments)
hrAttendanceRouter.post("/records", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { employeeId, date, checkIn, checkOut, status, hours, notes } = req.body;

    if (!employeeId || !date || !notes) {
      return res.status(400).json({ error: "employeeId, date, and notes (reason) are required." });
    }

    // Contract boundary validation
    const boundary = await ContractLifecycleService.validateAttendanceContractBoundary({
      tenantId,
      employeeId,
      date,
    });
    if (!boundary.allowed) {
      return res.status(400).json({ error: boundary.reason });
    }

    const record = await AttendanceService.adjustAttendance(
      tenantId,
      { employeeId, date, checkIn, checkOut, status, hours: Number(hours), notes },
      req.user!.userId
    );

    return res.status(201).json(record);
  } catch (err: any) {
    if (err.code === "PERIOD_LOCKED") {
      return res.status(423).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || "Failed to adjust attendance" });
  }
});

// POST /api/v1/hr/attendance/records/bulk (Bulk Attendance Entry)
hrAttendanceRouter.post("/records/bulk", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const {
      employeeIds,
      date,
      checkIn,
      checkOut,
      status = "present",
      hours,
      breakMinutes,
      notes,
      overwriteExisting = true,
    } = req.body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ error: "employeeIds must be a non-empty array of employee IDs." });
    }
    if (!date) {
      return res.status(400).json({ error: "date is required." });
    }
    if (!notes) {
      return res.status(400).json({ error: "notes (reason) is required for audit compliance." });
    }

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    // Verify month is unlocked
    await AttendanceService.assertMonthUnlocked(tenantId, targetDate);

    // Validate employees belong to tenant
    const validEmployees = await rawPrisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        tenantId,
      },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    });

    if (validEmployees.length === 0) {
      return res.status(404).json({ error: "No valid employees found for tenant." });
    }

    // Validate contract boundaries across employees
    for (const emp of validEmployees) {
      const boundary = await ContractLifecycleService.validateAttendanceContractBoundary({
        tenantId,
        employeeId: emp.id,
        date: targetDate,
      });
      if (!boundary.allowed) {
        return res.status(400).json({
          error: `Contract boundary violation for employee ${emp.employeeCode} (${emp.firstName} ${emp.lastName}): ${boundary.reason}`,
        });
      }
    }

    const inTime = checkIn ? new Date(`${date.slice(0, 10)}T${checkIn.length === 5 ? checkIn + ":00" : checkIn}`) : null;
    const outTime = checkOut ? new Date(`${date.slice(0, 10)}T${checkOut.length === 5 ? checkOut + ":00" : checkOut}`) : null;

    let computedHours = hours ? Number(hours) : null;
    if (computedHours === null && inTime && outTime) {
      const diffMs = outTime.getTime() - inTime.getTime();
      if (diffMs > 0) {
        const breakMs = (breakMinutes ? Number(breakMinutes) : 60) * 60 * 1000;
        computedHours = Math.max(0, Math.round(((diffMs - breakMs) / (1000 * 60 * 60)) * 10) / 10);
      }
    }

    const results = await rawPrisma.$transaction(async (tx) => {
      const outcome: any[] = [];
      for (const emp of validEmployees) {
        const existing = await tx.attendance.findUnique({
          where: {
            tenantId_employeeId_date: {
              tenantId,
              employeeId: emp.id,
              date: targetDate,
            },
          },
        });

        if (existing && !overwriteExisting) {
          outcome.push({
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            name: `${emp.firstName} ${emp.lastName}`.trim(),
            status: "skipped",
            reason: "Record already exists and overwriteExisting is false",
          });
          continue;
        }

        const upserted = await tx.attendance.upsert({
          where: {
            tenantId_employeeId_date: {
              tenantId,
              employeeId: emp.id,
              date: targetDate,
            },
          },
          create: {
            tenantId,
            employeeId: emp.id,
            date: targetDate,
            checkIn: inTime,
            checkOut: outTime,
            status,
            hours: computedHours,
            notes,
            source: "MANUAL",
          },
          update: {
            checkIn: inTime !== null ? inTime : undefined,
            checkOut: outTime !== null ? outTime : undefined,
            status,
            hours: computedHours !== null ? computedHours : undefined,
            notes,
            source: "MANUAL",
          },
        });

        outcome.push({
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          name: `${emp.firstName} ${emp.lastName}`.trim(),
          status: "success",
          recordId: upserted.id,
        });
      }

      // Batch Audit Log
      await AuditService.logAudit(
        {
          tenantId,
          userId: req.user!.userId,
          action: "ATTENDANCE_BULK_ADJUSTMENT",
          entityType: "Attendance",
          entityId: tenantId,
          afterState: {
            totalRequested: employeeIds.length,
            succeeded: outcome.filter((o) => o.status === "success").length,
            date: targetDate.toISOString(),
            status,
            notes,
          },
        },
        tx
      );

      return outcome;
    });

    const succeeded = results.filter((r) => r.status === "success").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const failed = employeeIds.length - (succeeded + skipped);

    broadcastToTenant(tenantId, "attendance.bulk_updated", {
      date: targetDate.toISOString(),
      succeeded,
    });

    return res.status(201).json({
      success: true,
      totalRequested: employeeIds.length,
      succeeded,
      skipped,
      failed,
      results,
    });
  } catch (err: any) {
    if (err.code === "PERIOD_LOCKED") {
      return res.status(423).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || "Failed to process bulk attendance" });
  }
});

// GET /api/v1/hr/attendance/month-lock
hrAttendanceRouter.get("/month-lock", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const year = parseInt(String(req.query.year || new Date().getUTCFullYear()), 10);
    const month = parseInt(String(req.query.month || new Date().getUTCMonth() + 1), 10);

    const lock = await rawPrisma.attendanceMonthLock.findUnique({
      where: {
        tenantId_year_month: { tenantId, year, month },
      },
    });

    return res.json({ year, month, isLocked: !!lock?.isLocked, lockedAt: lock?.lockedAt, notes: lock?.notes });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/attendance/month-lock
hrAttendanceRouter.post("/month-lock", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { year, month, isLocked, notes } = req.body;

    if (!year || !month || typeof isLocked !== "boolean") {
      return res.status(400).json({ error: "year, month, and isLocked boolean are required." });
    }

    const lock = await AttendanceService.setMonthLock(
      tenantId,
      Number(year),
      Number(month),
      isLocked,
      req.user!.userId,
      notes
    );

    return res.json(lock);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/attendance/live (Today attendance punch live board)
hrAttendanceRouter.get("/live", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const [totalActive, punches, leaves] = await Promise.all([
      rawPrisma.employee.count({ where: { tenantId, status: "active" } }),
      rawPrisma.attendance.findMany({
        where: { tenantId, date: today },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              branch: { select: { name: true } },
              department: { select: { name: true } },
            },
          },
        },
      }),
      rawPrisma.leaveRequest.findMany({
        where: {
          tenantId,
          status: "approved",
          startDate: { lte: today },
          endDate: { gte: today },
        },
        include: { employee: true, leaveType: true },
      }),
    ]);

    const checkedInCount = punches.filter((p) => p.checkIn && !p.checkOut).length;
    const checkedOutCount = punches.filter((p) => p.checkOut).length;
    const lateCount = punches.filter((p) => p.status === "late").length;
    const onLeaveCount = leaves.length;
    const notYetInCount = Math.max(0, totalActive - punches.length - onLeaveCount);

    return res.json({
      summary: {
        totalActive,
        checkedIn: checkedInCount,
        checkedOut: checkedOutCount,
        late: lateCount,
        onLeave: onLeaveCount,
        notYetIn: notYetInCount,
      },
      todayPunches: punches,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/attendance/policies
hrAttendanceRouter.get("/policies", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const policies = await rawPrisma.attendancePolicy.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return res.json(policies);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/attendance/policies
hrAttendanceRouter.post("/policies", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { name, code, workingDays, graceMinutes, halfDayHours, fullDayHours, isDefault, branchId, departmentId } = req.body;

    const policy = await rawPrisma.attendancePolicy.create({
      data: {
        tenantId,
        name,
        code: code || `POL-${Date.now()}`,
        workingDays: workingDays || "Mon,Tue,Wed,Thu,Fri",
        graceMinutes: Number(graceMinutes) || 15,
        halfDayHours: Number(halfDayHours) || 4.0,
        fullDayHours: Number(fullDayHours) || 8.0,
        isDefault: !!isDefault,
        branchId: branchId || null,
        departmentId: departmentId || null,
      },
    });
    return res.status(201).json(policy);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/attendance/regularizations
hrAttendanceRouter.get("/regularizations", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const regularizations = await rawPrisma.attendanceRegularization.findMany({
      where: { tenantId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(regularizations);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/attendance/regularizations/:id/action
hrAttendanceRouter.post("/regularizations/:id/action", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { action, comments } = req.body; // 'approve' | 'reject'

    const reg = await rawPrisma.attendanceRegularization.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!reg || reg.tenantId !== tenantId) {
      return res.status(404).json({ error: "Regularization request not found" });
    }

    const authCheck = await assertNotSelfOrOutOfScopeApproval(req, tenantId, reg.employeeId);
    if (!authCheck.ok) {
      return res.status(authCheck.status).json({ error: authCheck.error, code: authCheck.code });
    }

    if (action === "approve") {
      await AttendanceService.assertMonthUnlocked(tenantId, reg.attendanceDate);

      const updated = await rawPrisma.$transaction(async (tx) => {
        const item = await tx.attendanceRegularization.update({
          where: { id },
          data: {
            status: "APPROVED",
            approverId: req.user!.userId,
            reviewedAt: new Date(),
            reviewComments: comments || null,
          },
        });

        // Update attendance record
        const hours =
          reg.proposedIn && reg.proposedOut
            ? Math.round(((reg.proposedOut.getTime() - reg.proposedIn.getTime()) / (1000 * 60 * 60)) * 100) / 100
            : 8.0;

        await tx.attendance.upsert({
          where: {
            tenantId_employeeId_date: {
              tenantId,
              employeeId: reg.employeeId,
              date: reg.attendanceDate,
            },
          },
          create: {
            tenantId,
            employeeId: reg.employeeId,
            date: reg.attendanceDate,
            checkIn: reg.proposedIn,
            checkOut: reg.proposedOut,
            hours,
            status: "present",
            notes: `Regularized: ${reg.reason}`,
            source: "REGULARIZATION",
          },
          update: {
            checkIn: reg.proposedIn || undefined,
            checkOut: reg.proposedOut || undefined,
            hours,
            status: "present",
            notes: `Regularized: ${reg.reason}`,
            source: "REGULARIZATION",
          },
        });

        return item;
      });

      return res.json(updated);
    } else {
      const rejected = await rawPrisma.attendanceRegularization.update({
        where: { id },
        data: {
          status: "REJECTED",
          approverId: req.user!.userId,
          reviewedAt: new Date(),
          reviewComments: comments || null,
        },
      });
      return res.json(rejected);
    }
  } catch (err: any) {
    if (err.code === "PERIOD_LOCKED") return res.status(423).json({ error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/attendance/shifts
hrAttendanceRouter.get("/shifts", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const shifts = await rawPrisma.shiftDefinition.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });
    return res.json(shifts);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/attendance/shifts
hrAttendanceRouter.post("/shifts", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { name, code, startTime, endTime, breakMinutes, isOvertimeEligible, color } = req.body;
    const shift = await rawPrisma.shiftDefinition.create({
      data: {
        tenantId,
        name,
        code: code || name.slice(0, 4).toUpperCase(),
        startTime: startTime || "09:30",
        endTime: endTime || "18:30",
        breakMinutes: Number(breakMinutes) || 60,
        isOvertimeEligible: isOvertimeEligible !== false,
        color: color || "blue",
      },
    });
    return res.status(201).json(shift);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/attendance/shifts/rosters
hrAttendanceRouter.get("/shifts/rosters", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const now = new Date();
    const month = parseInt(String(req.query.month || now.getUTCMonth() + 1), 10);
    const year = parseInt(String(req.query.year || now.getUTCFullYear()), 10);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const rosters = await rawPrisma.shiftRoster.findMany({
      where: {
        tenantId,
        rosterDate: { gte: start, lte: end },
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
        shift: true,
      },
      orderBy: { rosterDate: "asc" },
    });
    return res.json(rosters);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/attendance/shifts/rosters
hrAttendanceRouter.post("/shifts/rosters", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { employeeId, shiftId, rosterDate, notes } = req.body;

    const date = new Date(rosterDate);
    date.setUTCHours(0, 0, 0, 0);

    const roster = await rawPrisma.shiftRoster.upsert({
      where: {
        tenantId_employeeId_rosterDate: {
          tenantId,
          employeeId,
          rosterDate: date,
        },
      },
      create: {
        tenantId,
        employeeId,
        shiftId,
        rosterDate: date,
        notes,
      },
      update: {
        shiftId,
        notes,
      },
    });
    return res.status(201).json(roster);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/attendance/shifts/swaps
hrAttendanceRouter.get("/shifts/swaps", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const swaps = await rawPrisma.shiftSwapRequest.findMany({
      where: { tenantId },
      include: {
        requesterEmployee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        targetEmployee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(swaps);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/attendance/shifts/swaps/:id/action
hrAttendanceRouter.post("/shifts/swaps/:id/action", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { action, notes } = req.body; // 'approve' | 'reject'

    const swap = await rawPrisma.shiftSwapRequest.findUnique({ where: { id } });
    if (!swap || swap.tenantId !== tenantId) {
      return res.status(404).json({ error: "Shift swap request not found" });
    }

    const swapAuthCheck = await assertNotSelfOrOutOfScopeApproval(req, tenantId, swap.requesterEmployeeId);
    if (!swapAuthCheck.ok) {
      return res.status(swapAuthCheck.status).json({ error: swapAuthCheck.error, code: swapAuthCheck.code });
    }

    const updated = await rawPrisma.shiftSwapRequest.update({
      where: { id },
      data: {
        status: action === "approve" ? "approved" : "rejected",
        managerNotes: notes || null,
        approvedAt: action === "approve" ? new Date() : null,
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/attendance/timesheets
hrAttendanceRouter.get("/timesheets", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { status, employeeId } = req.query;
    const where: any = { tenantId };
    if (status && status !== "all") where.status = String(status);
    if (employeeId && employeeId !== "all") where.employeeId = String(employeeId);

    const timesheets = await rawPrisma.timesheet.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });
    return res.json(timesheets);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/attendance/timesheets/:id/action
hrAttendanceRouter.post("/timesheets/:id/action", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { action, reviewNotes } = req.body;

    const item = await rawPrisma.timesheet.findUnique({ where: { id } });
    if (!item || item.tenantId !== tenantId) {
      return res.status(404).json({ error: "Timesheet not found" });
    }

    const tsAuthCheck = await assertNotSelfOrOutOfScopeApproval(req, tenantId, item.employeeId);
    if (!tsAuthCheck.ok) {
      return res.status(tsAuthCheck.status).json({ error: tsAuthCheck.error, code: tsAuthCheck.code });
    }

    const updated = await rawPrisma.timesheet.update({
      where: { id },
      data: {
        status: action === "approve" ? "approved" : "rejected",
        reviewedBy: req.user!.userId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/attendance/overtime
hrAttendanceRouter.get("/overtime", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const requests = await rawPrisma.overtimeRequest.findMany({
      where: { tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(requests);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/attendance/overtime/:id/action
hrAttendanceRouter.post("/overtime/:id/action", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { action, reviewRemarks } = req.body;

    const item = await rawPrisma.overtimeRequest.findUnique({ where: { id } });
    if (!item || item.tenantId !== tenantId) {
      return res.status(404).json({ error: "Overtime request not found" });
    }

    const otAuthCheck = await assertNotSelfOrOutOfScopeApproval(req, tenantId, item.employeeId);
    if (!otAuthCheck.ok) {
      return res.status(otAuthCheck.status).json({ error: otAuthCheck.error, code: otAuthCheck.code });
    }

    const updated = await rawPrisma.overtimeRequest.update({
      where: { id },
      data: {
        status: action === "approve" ? "approved" : "rejected",
        reviewedBy: req.user!.userId,
        reviewedAt: new Date(),
        reviewRemarks: reviewRemarks || null,
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/attendance/devices
hrAttendanceRouter.get("/devices", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const devices = await rawPrisma.biometricDevice.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return res.json(devices);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/attendance/devices
hrAttendanceRouter.post("/devices", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { deviceName, deviceModel, deviceType, ipAddress, port, serialNumber, location } = req.body;

    const device = await rawPrisma.biometricDevice.create({
      data: {
        tenantId,
        deviceName,
        deviceModel: deviceModel || "ZKTeco MB20",
        deviceType: deviceType || "hybrid",
        ipAddress: ipAddress || null,
        port: Number(port) || 4370,
        serialNumber: serialNumber || `DEV-${Date.now()}`,
        location: location || "HQ Entrance",
        apiKey: `BIO-${tenantId.slice(0, 8)}-${Date.now()}`,
      },
    });
    return res.status(201).json(device);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/attendance/devices/:id/sync
hrAttendanceRouter.post("/devices/:id/sync", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const device = await rawPrisma.biometricDevice.findUnique({ where: { id } });
    if (!device || device.tenantId !== tenantId) {
      return res.status(404).json({ error: "Device not found" });
    }

    const updated = await rawPrisma.biometricDevice.update({
      where: { id },
      data: {
        lastSyncAt: new Date(),
        status: "online",
        totalPunchLogs: { increment: 1 },
      },
    });
    return res.json({ message: "Device sync triggered successfully", device: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/hr/attendance/shifts/:id
hrAttendanceRouter.put("/shifts/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { name, code, startTime, endTime, breakMinutes, isOvertimeEligible, color } = req.body;

    const existing = await rawPrisma.shiftDefinition.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return res.status(404).json({ error: "Shift not found" });
    }

    const updated = await rawPrisma.shiftDefinition.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        code: code !== undefined ? code : undefined,
        startTime: startTime !== undefined ? startTime : undefined,
        endTime: endTime !== undefined ? endTime : undefined,
        breakMinutes: breakMinutes !== undefined ? Number(breakMinutes) : undefined,
        isOvertimeEligible: isOvertimeEligible !== undefined ? !!isOvertimeEligible : undefined,
        color: color !== undefined ? color : undefined,
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/hr/attendance/shifts/:id
hrAttendanceRouter.delete("/shifts/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const existing = await rawPrisma.shiftDefinition.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return res.status(404).json({ error: "Shift not found" });
    }

    const activeRostersCount = await rawPrisma.shiftRoster.count({
      where: { tenantId, shiftId: id },
    });
    if (activeRostersCount > 0) {
      return res.status(400).json({
        error: `Cannot delete shift with ${activeRostersCount} active roster assignments. Reassign rosters first.`,
      });
    }

    await rawPrisma.shiftDefinition.delete({ where: { id } });
    return res.json({ message: "Shift definition deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/hr/attendance/policies/:id
hrAttendanceRouter.put("/policies/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const {
      name,
      code,
      description,
      workingDays,
      graceMinutes,
      halfDayHours,
      fullDayHours,
      isOvertimeAllowed,
      overtimeMultiplier,
      minOvertimeMinutes,
      regularizationLimit,
      isDefault,
    } = req.body;

    const existing = await rawPrisma.attendancePolicy.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return res.status(404).json({ error: "Policy not found" });
    }

    if (isDefault) {
      await rawPrisma.attendancePolicy.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await rawPrisma.attendancePolicy.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        code: code !== undefined ? code : undefined,
        description: description !== undefined ? description : undefined,
        workingDays: workingDays !== undefined ? workingDays : undefined,
        graceMinutes: graceMinutes !== undefined ? Number(graceMinutes) : undefined,
        halfDayHours: halfDayHours !== undefined ? Number(halfDayHours) : undefined,
        fullDayHours: fullDayHours !== undefined ? Number(fullDayHours) : undefined,
        isOvertimeAllowed: isOvertimeAllowed !== undefined ? !!isOvertimeAllowed : undefined,
        overtimeMultiplier: overtimeMultiplier !== undefined ? Number(overtimeMultiplier) : undefined,
        minOvertimeMinutes: minOvertimeMinutes !== undefined ? Number(minOvertimeMinutes) : undefined,
        regularizationLimit: regularizationLimit !== undefined ? Number(regularizationLimit) : undefined,
        isDefault: isDefault !== undefined ? !!isDefault : undefined,
        version: { increment: 1 },
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/hr/attendance/policies/:id
hrAttendanceRouter.delete("/policies/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const existing = await rawPrisma.attendancePolicy.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return res.status(404).json({ error: "Policy not found" });
    }

    if (existing.isDefault) {
      return res.status(400).json({ error: "Cannot delete active default policy. Assign another default policy first." });
    }

    await rawPrisma.attendancePolicy.delete({ where: { id } });
    return res.json({ message: "Attendance policy deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/attendance/timesheets
hrAttendanceRouter.post("/timesheets", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { employeeId, date, hours, description, projectId, taskId } = req.body;

    if (!employeeId || !date || hours === undefined) {
      return res.status(400).json({ error: "employeeId, date, and hours are required." });
    }

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const timesheet = await rawPrisma.timesheet.create({
      data: {
        tenantId,
        employeeId,
        date: targetDate,
        hours: Number(hours),
        description: description || null,
        projectId: projectId || null,
        taskId: taskId || null,
        status: "pending",
      },
    });
    return res.status(201).json(timesheet);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/hr/attendance/timesheets/:id
hrAttendanceRouter.put("/timesheets/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { hours, description, date, projectId, taskId } = req.body;

    const existing = await rawPrisma.timesheet.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return res.status(404).json({ error: "Timesheet not found" });
    }

    if (existing.status === "approved") {
      return res.status(403).json({ error: "Approved timesheet cannot be modified without reopening." });
    }

    const updated = await rawPrisma.timesheet.update({
      where: { id },
      data: {
        hours: hours !== undefined ? Number(hours) : undefined,
        description: description !== undefined ? description : undefined,
        date: date ? new Date(date) : undefined,
        projectId: projectId !== undefined ? projectId : undefined,
        taskId: taskId !== undefined ? taskId : undefined,
      },
    });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/hr/attendance/timesheets/:id
hrAttendanceRouter.delete("/timesheets/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const existing = await rawPrisma.timesheet.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return res.status(404).json({ error: "Timesheet not found" });
    }

    if (existing.status === "approved") {
      return res.status(403).json({ error: "Approved timesheet cannot be deleted." });
    }

    await rawPrisma.timesheet.delete({ where: { id } });
    return res.json({ message: "Timesheet entry deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hr/attendance/automation/jobs
hrAttendanceRouter.get("/automation/jobs", async (req: AuthRequest, res: Response) => {
  try {
    const jobs = await AttendanceAutomationService.getJobExecutions();
    return res.json(jobs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hr/attendance/automation/run
hrAttendanceRouter.post("/automation/run", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { jobType, date, year, month } = req.body;
    const targetDate = date ? new Date(date) : new Date();

    let result;
    switch (jobType) {
      case "period_init":
        result = await AttendanceAutomationService.initializePeriod(
          tenantId,
          year || targetDate.getUTCFullYear(),
          month || targetDate.getUTCMonth() + 1
        );
        break;
      case "shift_resolve":
        result = await AttendanceAutomationService.resolveShiftRosters(tenantId, targetDate);
        break;
      case "leave_sync":
        result = await AttendanceAutomationService.syncLeavesToAttendance(tenantId, targetDate);
        break;
      case "daily_process":
        result = await AttendanceAutomationService.processDailyAttendance(tenantId, targetDate);
        break;
      case "missing_detect":
        result = await AttendanceAutomationService.detectMissingAttendance(tenantId, targetDate);
        break;
      case "overtime_calc":
        result = await AttendanceAutomationService.calculateOvertime(tenantId, targetDate);
        break;
      case "reconcile_month":
        result = await AttendanceAutomationService.reconcileMonthlyAttendance(
          tenantId,
          year || targetDate.getUTCFullYear(),
          month || targetDate.getUTCMonth() + 1
        );
        break;
      case "process_timesheets":
        result = await AttendanceAutomationService.processTimesheets(tenantId);
        break;
      default:
        return res.status(400).json({ error: `Unknown jobType: ${jobType}` });
    }

    return res.json({ message: `Job ${jobType} completed`, result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADVANCED ATTENDANCE EXPORTS & SETTINGS
// ==========================================

// GET /api/v1/hr/attendance/export/excel/monthly
hrAttendanceRouter.get("/export/excel/monthly", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const year = parseInt(String(req.query.year || new Date().getUTCFullYear()), 10);
    const month = parseInt(String(req.query.month || new Date().getUTCMonth() + 1), 10);
    const cycle = (String(req.query.cycle || "25_24")) as AttendanceCycle;
    const { branchId, departmentId, employeeId, employeeIds, employmentType, includeInactive } = req.query;
    const resolvedEmployeeIds = employeeIds
      ? String(employeeIds).split(",").map((s) => s.trim()).filter(Boolean)
      : employeeId && String(employeeId).includes(",")
      ? String(employeeId).split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const workbook = await AttendanceExportService.generateMonthlyExcelWorkbook(
      tenantId,
      year,
      month,
      cycle,
      {
        branchId: branchId ? String(branchId) : undefined,
        departmentId: departmentId ? String(departmentId) : undefined,
        employeeId: employeeId ? String(employeeId) : undefined,
        employeeIds: resolvedEmployeeIds,
        employmentType: employmentType ? String(employmentType) : undefined,
        includeInactive: includeInactive === "true",
      }
    );

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="attendance_monthly_${year}_${month}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate monthly Excel export" });
  }
});

// GET /api/v1/hr/attendance/export/excel/yearly
hrAttendanceRouter.get("/export/excel/yearly", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const year = parseInt(String(req.query.year || new Date().getUTCFullYear()), 10);
    const cycle = (String(req.query.cycle || "25_24")) as AttendanceCycle;
    const { branchId, departmentId, employeeId, employeeIds, employmentType, includeInactive } = req.query;
    const resolvedEmployeeIds = employeeIds
      ? String(employeeIds).split(",").map((s) => s.trim()).filter(Boolean)
      : employeeId && String(employeeId).includes(",")
      ? String(employeeId).split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const workbook = await AttendanceExportService.generateYearlyConsolidatedWorkbook(
      tenantId,
      year,
      cycle,
      {
        branchId: branchId ? String(branchId) : undefined,
        departmentId: departmentId ? String(departmentId) : undefined,
        employeeId: employeeId ? String(employeeId) : undefined,
        employeeIds: resolvedEmployeeIds,
        employmentType: employmentType ? String(employmentType) : undefined,
        includeInactive: includeInactive === "true",
      }
    );

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="attendance_yearly_consolidated_${year}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate yearly consolidated Excel export" });
  }
});

// GET /api/v1/hr/attendance/export/pdf/monthly
hrAttendanceRouter.get("/export/pdf/monthly", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const year = parseInt(String(req.query.year || new Date().getUTCFullYear()), 10);
    const month = parseInt(String(req.query.month || new Date().getUTCMonth() + 1), 10);
    const cycle = (String(req.query.cycle || "25_24")) as AttendanceCycle;
    const { branchId, departmentId, employeeId, employeeIds, employmentType, includeInactive } = req.query;
    const resolvedEmployeeIds = employeeIds
      ? String(employeeIds).split(",").map((s) => s.trim()).filter(Boolean)
      : employeeId && String(employeeId).includes(",")
      ? String(employeeId).split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const pdfBuffer = await AttendanceExportService.generateMonthlyPdf(
      tenantId,
      year,
      month,
      cycle,
      {
        branchId: branchId ? String(branchId) : undefined,
        departmentId: departmentId ? String(departmentId) : undefined,
        employeeId: employeeId ? String(employeeId) : undefined,
        employeeIds: resolvedEmployeeIds,
        employmentType: employmentType ? String(employmentType) : undefined,
        includeInactive: includeInactive === "true",
      }
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="attendance_monthly_${year}_${month}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate monthly PDF export" });
  }
});

// GET /api/v1/hr/attendance/export/pdf/yearly
hrAttendanceRouter.get("/export/pdf/yearly", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const year = parseInt(String(req.query.year || new Date().getUTCFullYear()), 10);
    const cycle = (String(req.query.cycle || "25_24")) as AttendanceCycle;
    const { branchId, departmentId, employeeId, employeeIds, employmentType, includeInactive } = req.query;
    const resolvedEmployeeIds = employeeIds
      ? String(employeeIds).split(",").map((s) => s.trim()).filter(Boolean)
      : employeeId && String(employeeId).includes(",")
      ? String(employeeId).split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const pdfBuffer = await AttendanceExportService.generateYearlyConsolidatedPdf(
      tenantId,
      year,
      cycle,
      {
        branchId: branchId ? String(branchId) : undefined,
        departmentId: departmentId ? String(departmentId) : undefined,
        employeeId: employeeId ? String(employeeId) : undefined,
        employeeIds: resolvedEmployeeIds,
        employmentType: employmentType ? String(employmentType) : undefined,
        includeInactive: includeInactive === "true",
      }
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="attendance_yearly_consolidated_${year}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate yearly consolidated PDF export" });
  }
});

// GET /api/v1/hr/attendance/export/consolidated-data
hrAttendanceRouter.get("/export/consolidated-data", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const year = parseInt(String(req.query.year || new Date().getUTCFullYear()), 10);
    const cycle = (String(req.query.cycle || "25_24")) as AttendanceCycle;
    const { branchId, departmentId, employeeId, employmentType, includeInactive } = req.query;

    const data = await AttendanceExportService.getConsolidatedData(
      tenantId,
      year,
      cycle,
      {
        branchId: branchId ? String(branchId) : undefined,
        departmentId: departmentId ? String(departmentId) : undefined,
        employeeId: employeeId ? String(employeeId) : undefined,
        employmentType: employmentType ? String(employmentType) : undefined,
        includeInactive: includeInactive === "true",
      }
    );

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to retrieve consolidated data" });
  }
});

// GET /api/v1/hr/attendance/settings/sandwich-policy
hrAttendanceRouter.get("/settings/sandwich-policy", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const setting = await SandwichLeaveService.getSandwichPolicySetting(tenantId);
    return res.json(setting);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to retrieve sandwich policy" });
  }
});

// PATCH /api/v1/hr/attendance/settings/sandwich-policy
hrAttendanceRouter.patch("/settings/sandwich-policy", async (req: AuthRequest, res: Response) => {
  try {
    const elevatedRoles = ["super_admin", "admin", "hr_admin", "hr_manager", "HR Manager", "Workspace Admin", "tenant_admin"];
    if (!req.user?.roles?.some((r) => elevatedRoles.includes(r))) {
      return res.status(403).json({ error: "Forbidden: HR Administrator role required to modify organization sandwich policy." });
    }
    const tenantId = req.tenantId!;
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ error: "enabled (boolean) is required" });
    }

    const updated = await SandwichLeaveService.setSandwichPolicySetting(tenantId, enabled);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update sandwich policy" });
  }
});
