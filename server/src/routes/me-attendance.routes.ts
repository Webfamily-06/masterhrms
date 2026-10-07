import { Router, Response } from "express";
import { rawPrisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { AttendanceService } from "../services/attendance.service";

export const meAttendanceRouter = Router();

meAttendanceRouter.use(requireAuth, resolveTenantContext);

// Helper to get self employee
async function getSelfEmployee(req: AuthRequest) {
  const tenantId = req.tenantId!;
  const employee = await rawPrisma.employee.findFirst({
    where: { tenantId, userId: req.user!.userId },
    include: { branch: true, department: true, designation: true },
  });
  if (!employee) throw new Error("Employee profile not found for user");
  return employee;
}

// GET /api/v1/me/attendance/status (Today's active punch status & shift)
meAttendanceRouter.get("/status", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const [attendance, roster, policy] = await Promise.all([
      rawPrisma.attendance.findUnique({
        where: {
          tenantId_employeeId_date: {
            tenantId,
            employeeId: employee.id,
            date: today,
          },
        },
      }),
      rawPrisma.shiftRoster.findUnique({
        where: {
          tenantId_employeeId_rosterDate: {
            tenantId,
            employeeId: employee.id,
            rosterDate: today,
          },
        },
        include: { shift: true },
      }),
      rawPrisma.attendancePolicy.findFirst({
        where: {
          tenantId,
          OR: [
            { departmentId: employee.departmentId },
            { branchId: employee.branchId },
            { isDefault: true },
          ],
        },
        orderBy: { isDefault: "asc" },
      }),
    ]);

    let elapsedSeconds = 0;
    if (attendance?.checkIn && !attendance?.checkOut) {
      elapsedSeconds = Math.round((now.getTime() - attendance.checkIn.getTime()) / 1000);
    } else if (attendance?.hours) {
      elapsedSeconds = Math.round(Number(attendance.hours) * 3600);
    }

    return res.json({
      isCheckedIn: !!attendance?.checkIn && !attendance?.checkOut,
      checkInTime: attendance?.checkIn || null,
      checkOutTime: attendance?.checkOut || null,
      elapsedSeconds,
      status: attendance?.status || "not_marked",
      shift: roster?.shift || { name: "General Shift", startTime: "09:30", endTime: "18:30" },
      policy: policy ? { name: policy.name, graceMinutes: policy.graceMinutes, version: policy.version } : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/me/attendance/punch (Check-in / Check-out)
meAttendanceRouter.post("/punch", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const { type, latitude, longitude, notes } = req.body;

    if (!type || !["check_in", "check_out"].includes(type)) {
      return res.status(400).json({ error: "type must be 'check_in' or 'check_out'" });
    }

    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "";

    const result = await AttendanceService.recordPunch(tenantId, employee.id, {
      type,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      notes,
      source: "WEB",
      ipAddress,
    });

    return res.json(result);
  } catch (err: any) {
    if (err.code === "PERIOD_LOCKED") return res.status(423).json({ error: err.message });
    return res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/me/attendance/records (Month calendar & list)
meAttendanceRouter.get("/records", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const now = new Date();
    const month = parseInt(String(req.query.month || now.getUTCMonth() + 1), 10);
    const year = parseInt(String(req.query.year || now.getUTCFullYear()), 10);

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const records = await rawPrisma.attendance.findMany({
      where: {
        tenantId,
        employeeId: employee.id,
        date: { gte: start, lte: end },
      },
      orderBy: { date: "asc" },
    });

    // Summary calculation
    const presentCount = records.filter((r) => r.status === "present").length;
    const halfDayCount = records.filter((r) => r.status === "half_day").length;
    const lateCount = records.filter((r) => r.status === "late").length;
    const leaveCount = records.filter((r) => r.status === "on_leave").length;

    return res.json({
      records,
      summary: {
        totalRecords: records.length,
        present: presentCount,
        halfDay: halfDayCount,
        late: lateCount,
        leave: leaveCount,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/me/attendance/regularizations
meAttendanceRouter.get("/regularizations", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);

    const items = await rawPrisma.attendanceRegularization.findMany({
      where: { tenantId, employeeId: employee.id },
      orderBy: { createdAt: "desc" },
    });
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/me/attendance/regularizations
meAttendanceRouter.post("/regularizations", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const { attendanceDate, proposedIn, proposedOut, reason } = req.body;

    if (!attendanceDate || !reason) {
      return res.status(400).json({ error: "attendanceDate and reason are required" });
    }

    const date = new Date(attendanceDate);
    date.setUTCHours(0, 0, 0, 0);

    await AttendanceService.assertMonthUnlocked(tenantId, date);

    const reg = await rawPrisma.attendanceRegularization.create({
      data: {
        tenantId,
        employeeId: employee.id,
        attendanceDate: date,
        proposedIn: proposedIn ? new Date(proposedIn) : null,
        proposedOut: proposedOut ? new Date(proposedOut) : null,
        reason,
        status: "PENDING",
      },
    });
    return res.status(201).json(reg);
  } catch (err: any) {
    if (err.code === "PERIOD_LOCKED") return res.status(423).json({ error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/me/attendance/shifts
meAttendanceRouter.get("/shifts", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 14));

    const [rosters, swaps] = await Promise.all([
      rawPrisma.shiftRoster.findMany({
        where: {
          tenantId,
          employeeId: employee.id,
          rosterDate: { gte: start, lte: end },
        },
        include: { shift: true },
        orderBy: { rosterDate: "asc" },
      }),
      rawPrisma.shiftSwapRequest.findMany({
        where: {
          tenantId,
          OR: [{ requesterEmployeeId: employee.id }, { targetEmployeeId: employee.id }],
        },
        include: { requesterEmployee: true, targetEmployee: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return res.json({ rosters, swaps });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/me/attendance/policies
meAttendanceRouter.get("/policies", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);

    const policy = await rawPrisma.attendancePolicy.findFirst({
      where: {
        tenantId,
        OR: [
          { departmentId: employee.departmentId },
          { branchId: employee.branchId },
          { isDefault: true },
        ],
      },
      orderBy: { isDefault: "asc" },
    });

    return res.json(policy || { name: "Standard Corporate Policy", graceMinutes: 15, halfDayHours: 4.0, fullDayHours: 8.0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/me/attendance/requests (Unified OT, WFH)
meAttendanceRouter.get("/requests", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);

    const [overtime, wfh] = await Promise.all([
      rawPrisma.overtimeRequest.findMany({
        where: { tenantId, employeeId: employee.id },
        orderBy: { createdAt: "desc" },
      }),
      rawPrisma.wfhRequest.findMany({
        where: { tenantId, employeeId: employee.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return res.json({ overtime, wfh });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/me/attendance/requests (Submit OT or WFH)
meAttendanceRouter.post("/requests", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const { type, date, fromDate, toDate, hours, reason } = req.body;

    if (type === "OVERTIME") {
      const ot = await rawPrisma.overtimeRequest.create({
        data: {
          tenantId,
          employeeId: employee.id,
          overtimeDate: new Date(date),
          hoursRequested: Number(hours),
          reason,
          status: "pending",
        },
      });
      return res.status(201).json(ot);
    } else if (type === "WFH") {
      const wfh = await rawPrisma.wfhRequest.create({
        data: {
          tenantId,
          employeeId: employee.id,
          fromDate: new Date(fromDate || date),
          toDate: new Date(toDate || date),
          reason,
          status: "pending",
        },
      });
      return res.status(201).json(wfh);
    }

    return res.status(400).json({ error: "Unknown request type" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/me/attendance/timesheets
meAttendanceRouter.get("/timesheets", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);

    const timesheets = await rawPrisma.timesheet.findMany({
      where: { tenantId, employeeId: employee.id },
      include: { project: true },
      orderBy: { date: "desc" },
    });
    return res.json(timesheets);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/me/attendance/timesheets
meAttendanceRouter.post("/timesheets", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const { date, hours, description, projectId } = req.body;

    if (!date || !hours) {
      return res.status(400).json({ error: "date and hours are required" });
    }

    const tDate = new Date(date);
    tDate.setUTCHours(0, 0, 0, 0);

    await AttendanceService.assertMonthUnlocked(tenantId, tDate);

    const timesheet = await rawPrisma.timesheet.create({
      data: {
        tenantId,
        employeeId: employee.id,
        date: tDate,
        hours: Number(hours),
        description: description || null,
        projectId: projectId || null,
        status: "pending",
      },
    });
    return res.status(201).json(timesheet);
  } catch (err: any) {
    if (err.code === "PERIOD_LOCKED") return res.status(423).json({ error: err.message });
    return res.status(500).json({ error: err.message });
  }
});
