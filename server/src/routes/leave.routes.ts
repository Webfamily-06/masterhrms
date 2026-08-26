import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { broadcastToTenant } from "../socket";
import { z } from "zod";

export const leaveRouter = Router();

// GET /api/leave/types
leaveRouter.get("/types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required." });
    }

    let types = await prisma.leaveType.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });

    // Auto-seed default leave types if empty
    if (types.length === 0) {
      const defaults = [
        { name: "Casual Leave", daysPerYear: 12, color: "#3B82F6" },
        { name: "Sick Leave", daysPerYear: 10, color: "#EF4444" },
        { name: "Earned / Annual Leave", daysPerYear: 15, color: "#10B981" },
        { name: "Maternity / Paternity", daysPerYear: 90, color: "#8B5CF6" },
      ];

      await Promise.all(
        defaults.map((d) =>
          prisma.leaveType.create({
            data: {
              tenantId,
              name: d.name,
              daysPerYear: d.daysPerYear,
              color: d.color,
            },
          }),
        ),
      );

      types = await prisma.leaveType.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
      });
    }

    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/leave/requests
leaveRouter.get("/requests", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required." });
    }

    const { employeeId, status } = req.query;
    const where: any = { tenantId };

    if (employeeId) where.employeeId = String(employeeId);
    if (status) where.status = String(status);

    const requests = await prisma.leaveRequest.findMany({
      where,
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
        leaveType: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(requests);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/leave/requests
leaveRouter.post("/requests", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required." });
    }

    const { employeeId, leaveTypeId, startDate, endDate, reason } = req.body;
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

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );

    const request = await prisma.leaveRequest.create({
      data: {
        tenantId,
        employeeId: targetEmployeeId,
        leaveTypeId: leaveTypeId || null,
        startDate: start,
        endDate: end,
        days: diffDays,
        reason,
        status: "pending",
      },
      include: {
        employee: true,
        leaveType: true,
      },
    });

    broadcastToTenant(tenantId, "leave:updated", request);
    broadcastToTenant(tenantId, "notification:new", {
      title: "New Leave Application",
      description: `${request.employee?.firstName || ""} applied for ${request.days} day(s) ${request.leaveType?.name || "Leave"}`,
      type: "leave",
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json(request);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// PATCH /api/leave/requests/:id/status
leaveRouter.patch("/requests/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const request = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        approverId: req.user?.userId,
        approvedAt: status === "approved" ? new Date() : null,
      },
      include: {
        employee: true,
        leaveType: true,
      },
    });

    if (request.tenantId) {
      broadcastToTenant(request.tenantId, "leave:updated", request);
      broadcastToTenant(request.tenantId, "notification:new", {
        title: `Leave Request ${status.toUpperCase()}`,
        description: `Leave request for ${request.employee?.firstName || "Employee"} was ${status}.`,
        type: "leave",
        timestamp: new Date().toISOString(),
      });
    }

    return res.json(request);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/leave/types
leaveRouter.post("/types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });
    const { name, daysPerYear, days_per_year, color } = req.body;
    const leaveType = await prisma.leaveType.create({
      data: {
        tenantId,
        name,
        daysPerYear: Number(daysPerYear || days_per_year || 12),
        color: color || "#3B82F6",
      },
    });
    return res.status(201).json(leaveType);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// PUT /api/leave/types/:id
leaveRouter.put("/types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const { name, daysPerYear, days_per_year, color } = req.body;

    const existing = await prisma.leaveType.findUnique({ where: { id } });
    if (!existing || (tenantId && existing.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Leave type not found." });
    }

    const updated = await prisma.leaveType.update({
      where: { id },
      data: {
        ...(name && { name: String(name).trim() }),
        ...((daysPerYear !== undefined || days_per_year !== undefined) && {
          daysPerYear: Number(daysPerYear ?? days_per_year),
        }),
        ...(color && { color }),
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// DELETE /api/leave/types/:id
leaveRouter.delete("/types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.leaveType.delete({ where: { id } });
    return res.json({ success: true, message: "Leave type deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});
