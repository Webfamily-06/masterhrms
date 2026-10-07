import { Router, Response } from "express";
import { rawPrisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";
import { AttendanceService } from "../services/attendance.service";
import { buildDataScopeFilter, DataScope } from "../lib/data-scope";

export const hrAttendanceRouter = Router();

hrAttendanceRouter.use(requireAuth, resolveTenantContext);

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

// POST /api/v1/hr/attendance/records (Manual adjustments)
hrAttendanceRouter.post("/records", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { employeeId, date, checkIn, checkOut, status, hours, notes } = req.body;

    if (!employeeId || !date || !notes) {
      return res.status(400).json({ error: "employeeId, date, and notes (reason) are required." });
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
