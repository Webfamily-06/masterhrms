import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { broadcastToTenant } from "../socket";
import { resolveTenantId } from "../lib/tenant";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";

export const attendanceRouter = Router();

// GET /api/attendance (Stocky Rule 0: Universal Query Contract)
attendanceRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const pagination = parsePaginationParams(req, "date", 50);
    const { date, employeeId, month, year, status } = req.query;
    const where: any = { tenantId };

    if (employeeId && employeeId !== "all") {
      where.employeeId = String(employeeId);
    }

    if (status && status !== "all") {
      where.status = String(status);
    }

    if (date) {
      const parts = String(date).split("-");
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        where.date = new Date(Date.UTC(y, m, d));
      } else {
        where.date = new Date(String(date));
      }
    } else if (month) {
      const parts = String(month).split("-");
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const start = new Date(Date.UTC(y, m, 1));
        const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
        where.date = { gte: start, lte: end };
      }
    }

    if (pagination.search) {
      where.OR = [
        { employee: { firstName: { contains: pagination.search } } },
        { employee: { lastName: { contains: pagination.search } } },
        { employee: { employeeCode: { contains: pagination.search } } },
        { notes: { contains: pagination.search } },
      ];
    }

    const sortField = ["date", "checkIn", "checkOut", "hours", "status"].includes(pagination.sortField)
      ? pagination.sortField
      : "date";

    const [total, records] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              position: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { [sortField]: pagination.sortType },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
    ]);

    if (pagination.isPaginated) {
      return res.json(formatPaginatedResponse(records, total, pagination));
    }

    res.setHeader("X-Total-Count", String(total));
    return res.json(records);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/attendance/check-in (with Shift Roster auto-grace and late-in calculation)
attendanceRouter.post("/check-in", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { employeeId, notes } = req.body;
    let targetEmployeeId = employeeId;

    if (!targetEmployeeId) {
      const emp = await prisma.employee.findFirst({
        where: { tenantId, userId: req.user!.userId },
      });
      if (!emp) {
        return res.status(400).json({ error: "Employee record not found for current user." });
      }
      targetEmployeeId = emp.id;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const existing = await prisma.attendance.findUnique({
      where: {
        tenantId_employeeId_date: {
          tenantId,
          employeeId: targetEmployeeId,
          date: today,
        },
      },
    });

    if (existing && existing.checkIn) {
      return res.status(400).json({ error: "Already checked in for today." });
    }

    // Check assigned shift roster for today to detect late arrival
    let status: "present" | "late" = "present";
    let lateNote = "";

    const roster = await prisma.shiftRoster.findUnique({
      where: {
        tenantId_employeeId_rosterDate: {
          tenantId,
          employeeId: targetEmployeeId,
          rosterDate: today,
        },
      },
      include: { shift: true },
    });

    if (roster && roster.shift && roster.shift.startTime && roster.shift.startTime !== "00:00") {
      const [shH, shM] = roster.shift.startTime.split(":").map(Number);
      const shiftStartTime = new Date(today);
      shiftStartTime.setHours(shH, shM, 0, 0);

      const graceMinutes = 15;
      const graceThreshold = new Date(shiftStartTime.getTime() + graceMinutes * 60 * 1000);

      if (now > graceThreshold) {
        status = "late";
        const diffMinutes = Math.round((now.getTime() - shiftStartTime.getTime()) / (60 * 1000));
        lateNote = `Late In by ${diffMinutes} min(s) [Shift: ${roster.shift.name} ${roster.shift.startTime}]`;
      }
    }

    const combinedNotes = [lateNote, notes].filter(Boolean).join(" | ");

    const attendance = await prisma.attendance.upsert({
      where: {
        tenantId_employeeId_date: {
          tenantId,
          employeeId: targetEmployeeId,
          date: today,
        },
      },
      update: {
        checkIn: now,
        status,
        notes: combinedNotes || undefined,
      },
      create: {
        tenantId,
        employeeId: targetEmployeeId,
        date: today,
        checkIn: now,
        status,
        notes: combinedNotes || null,
      },
      include: {
        employee: true,
      },
    });

    // Real-time WebSocket event
    broadcastToTenant(tenantId, "attendance:updated", attendance);
    broadcastToTenant(tenantId, "punch:new", {
      type: "check_in",
      employeeName: `${attendance.employee?.firstName || ""} ${attendance.employee?.lastName || ""}`.trim() || "Staff Member",
      time: now.toLocaleTimeString(),
      status,
      timestamp: now.toISOString(),
    });

    return res.json(attendance);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/attendance/check-out (with hours and half-day threshold calculation)
attendanceRouter.post("/check-out", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { employeeId, notes } = req.body;
    let targetEmployeeId = employeeId;

    if (!targetEmployeeId) {
      const emp = await prisma.employee.findFirst({
        where: { tenantId, userId: req.user!.userId },
      });
      if (!emp) {
        return res.status(400).json({ error: "Employee record not found for current user." });
      }
      targetEmployeeId = emp.id;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const existing = await prisma.attendance.findUnique({
      where: {
        tenantId_employeeId_date: {
          tenantId,
          employeeId: targetEmployeeId,
          date: today,
        },
      },
    });

    if (!existing || !existing.checkIn) {
      return res.status(400).json({ error: "Must check in before checking out." });
    }

    // Calculate total hours
    const diffMs = now.getTime() - new Date(existing.checkIn).getTime();
    const totalHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);

    // Half-day check (< 4 hours worked)
    let newStatus = existing.status;
    if (totalHours < 4.0 && existing.status !== "late") {
      newStatus = "half_day";
    }

    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: now,
        hours: totalHours,
        status: newStatus,
        notes: notes ? `${existing.notes ? existing.notes + " | " : ""}${notes}` : existing.notes,
      },
      include: {
        employee: true,
      },
    });

    // Real-time WebSocket event
    broadcastToTenant(tenantId, "attendance:updated", attendance);
    broadcastToTenant(tenantId, "punch:new", {
      type: "check_out",
      employeeName: `${attendance.employee?.firstName || ""} ${attendance.employee?.lastName || ""}`.trim() || "Staff Member",
      time: now.toLocaleTimeString(),
      hours: totalHours,
      status: newStatus,
      timestamp: now.toISOString(),
    });

    return res.json(attendance);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/attendance/reconcile (Shift Roster vs Punch Auto-Reconciliation Engine)
attendanceRouter.post("/reconcile", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const { date, startDate, endDate, departmentId } = req.body;

    const start = startDate ? new Date(startDate) : (date ? new Date(date) : new Date(Date.now() - 24 * 3600 * 1000));
    const end = endDate ? new Date(endDate) : (date ? new Date(date) : new Date());

    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    const empWhere: any = { tenantId, status: "active" };
    if (departmentId && departmentId !== "all") {
      empWhere.departmentId = String(departmentId);
    }

    const employees = await prisma.employee.findMany({
      where: empWhere,
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    });

    let totalEvaluated = 0;
    let markedAbsent = 0;
    let markedOnLeave = 0;
    let markedLate = 0;
    let alreadyPresent = 0;

    const cur = new Date(startDay);

    while (cur <= endDay) {
      const targetDate = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate());

      for (const emp of employees) {
        totalEvaluated++;

        // 1. Check existing attendance record
        const att = await prisma.attendance.findUnique({
          where: {
            tenantId_employeeId_date: {
              tenantId,
              employeeId: emp.id,
              date: targetDate,
            },
          },
        });

        // 2. Check approved leave on this date
        const approvedLeave = await prisma.leaveRequest.findFirst({
          where: {
            tenantId,
            employeeId: emp.id,
            status: "approved",
            startDate: { lte: targetDate },
            endDate: { gte: targetDate },
          },
          include: { leaveType: true },
        });

        if (approvedLeave) {
          if (!att || att.status !== "on_leave") {
            await prisma.attendance.upsert({
              where: {
                tenantId_employeeId_date: { tenantId, employeeId: emp.id, date: targetDate },
              },
              update: { status: "on_leave", notes: `Approved Leave: ${approvedLeave.leaveType?.name || "Leave"}` },
              create: {
                tenantId,
                employeeId: emp.id,
                date: targetDate,
                status: "on_leave",
                notes: `Approved Leave: ${approvedLeave.leaveType?.name || "Leave"}`,
              },
            });
            markedOnLeave++;
          }
          continue;
        }

        // 3. Check scheduled shift in ShiftRoster
        const roster = await prisma.shiftRoster.findUnique({
          where: {
            tenantId_employeeId_rosterDate: {
              tenantId,
              employeeId: emp.id,
              rosterDate: targetDate,
            },
          },
          include: { shift: true },
        });

        const isScheduledOff = roster?.shift?.code === "OFF";

        // If employee has a check-in
        if (att && att.checkIn) {
          if (roster && roster.shift && roster.shift.startTime && roster.shift.startTime !== "00:00") {
            const [shH, shM] = roster.shift.startTime.split(":").map(Number);
            const shiftStart = new Date(targetDate);
            shiftStart.setHours(shH, shM, 0, 0);

            const graceThreshold = new Date(shiftStart.getTime() + 15 * 60 * 1000);
            if (new Date(att.checkIn) > graceThreshold && att.status === "present") {
              await prisma.attendance.update({
                where: { id: att.id },
                data: { status: "late", notes: `Auto-reconciled: Checked in past 15-min shift grace period.` },
              });
              markedLate++;
            } else {
              alreadyPresent++;
            }
          } else {
            alreadyPresent++;
          }
          continue;
        }

        // If no check-in, no leave, and was scheduled to work (not weekly off)
        if (!att && !isScheduledOff) {
          // If the day is in the past, flag as absent
          const isPastDate = targetDate.getTime() < new Date(new Date().setHours(0, 0, 0, 0)).getTime();
          if (isPastDate) {
            await prisma.attendance.create({
              data: {
                tenantId,
                employeeId: emp.id,
                date: targetDate,
                status: "absent",
                notes: `Auto-reconciled: No punch recorded for scheduled ${roster?.shift?.name || "Shift"}.`,
              },
            });
            markedAbsent++;
          }
        }
      }

      cur.setDate(cur.getDate() + 1);
    }

    broadcastToTenant(tenantId, "attendance:reconciled", {
      startDate: startDay.toISOString(),
      endDate: endDay.toISOString(),
      totalEvaluated,
      markedAbsent,
      markedOnLeave,
      markedLate,
    });

    return res.json({
      success: true,
      message: `Shift roster auto-reconciliation complete for ${employees.length} employees.`,
      metrics: {
        totalEvaluated,
        markedAbsent,
        markedOnLeave,
        markedLate,
        alreadyPresent,
      },
    });
  } catch (err: any) {
    console.error("Attendance reconcile error:", err);
    return res.status(500).json({ error: err.message || "Failed to reconcile attendance." });
  }
});
