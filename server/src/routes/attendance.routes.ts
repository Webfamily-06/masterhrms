import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { broadcastToTenant } from "../socket";
import { z } from "zod";

export const attendanceRouter = Router();

// GET /api/attendance
// List attendance records for the tenant, optionally filtered by date or employee
attendanceRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required." });
    }

    const { date, employeeId, month, year } = req.query;
    const where: any = { tenantId };

    if (employeeId) {
      where.employeeId = String(employeeId);
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

    const records = await prisma.attendance.findMany({
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
      orderBy: { date: "asc" },
    });

    return res.json(records);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/attendance/check-in
attendanceRouter.post("/check-in", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required." });
    }

    const { employeeId, notes } = req.body;
    let targetEmployeeId = employeeId;

    // If employeeId is not supplied, look up the employee linked to current user
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
        status: "present",
        notes: notes || undefined,
      },
      create: {
        tenantId,
        employeeId: targetEmployeeId,
        date: today,
        checkIn: now,
        status: "present",
        notes,
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
      timestamp: now.toISOString(),
    });

    return res.json(attendance);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/attendance/check-out
attendanceRouter.post("/check-out", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required." });
    }

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

    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: now,
        hours: totalHours,
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
      timestamp: now.toISOString(),
    });

    return res.json(attendance);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});
