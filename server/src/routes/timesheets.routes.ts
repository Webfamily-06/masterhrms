import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { parsePagination } from "../lib/pagination";
import { broadcastToTenant } from "../socket";

export const timesheetsRouter = Router();

timesheetsRouter.use(requireAuth, resolveTenantContext as any);

/**
 * GET /api/timesheets
 * - Employee role: strictly returns their own timesheets
 * - HR Admin / Manager: returns all timesheets in the workspace with filtering
 */
timesheetsRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const isEmployee = req.user?.roles?.includes("employee") || req.user?.workspaceRole === "employee";
    const { status, employeeId, projectId } = req.query;

    const pagination = parsePagination(req.query, ["createdAt", "date", "hours", "status"]);

    const where: any = { tenantId };

    if (isEmployee) {
      const employee = await prisma.employee.findFirst({
        where: { tenantId, userId: req.user?.userId },
      });
      if (!employee) {
        return res.json({ items: [], total: 0, page: 1, limit: pagination.limit });
      }
      where.employeeId = employee.id;
    } else {
      if (employeeId) where.employeeId = String(employeeId);
    }

    if (status && status !== "all") where.status = String(status);
    if (projectId && projectId !== "all") where.projectId = String(projectId);

    const [total, timesheets] = await Promise.all([
      prisma.timesheet.count({ where }),
      prisma.timesheet.findMany({
        where,
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
          },
          project: {
            select: { id: true, name: true },
          },
        },
        orderBy: pagination.orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    const items = timesheets.map((t) => ({
      id: t.id,
      employeeId: t.employeeId,
      employeeName: `${t.employee.firstName} ${t.employee.lastName}`.trim(),
      employeeCode: t.employee.employeeCode,
      projectId: t.projectId,
      projectName: t.project?.name || "General Work",
      taskId: t.taskId,
      date: t.date.toISOString().split("T")[0],
      hours: Number(t.hours),
      description: t.description || "",
      status: t.status,
      reviewedBy: t.reviewedBy,
      reviewedAt: t.reviewedAt ? t.reviewedAt.toISOString() : null,
      reviewNotes: t.reviewNotes || "",
      createdAt: t.createdAt.toISOString(),
    }));

    res.setHeader("X-Total-Count", String(total));
    return res.json({
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
    });
  } catch (err: any) {
    console.error("Timesheets GET error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch timesheets" });
  }
});

/**
 * POST /api/timesheets
 * Employee logs hours for a day
 */
timesheetsRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { date, hours, projectId, taskId, description } = req.body;

    if (!date || hours === undefined) {
      return res.status(400).json({ error: "Date and hours are required." });
    }

    const numHours = Number(hours);
    if (isNaN(numHours) || numHours <= 0 || numHours > 24) {
      return res.status(400).json({ error: "Hours must be between 0.5 and 24." });
    }

    // Determine target employee
    const isEmployeeRole = req.user?.roles?.includes("employee") || req.user?.workspaceRole === "employee";
    let targetEmployeeId = req.body.employeeId;
    if (!targetEmployeeId || isEmployeeRole) {
      const employee = await prisma.employee.findFirst({
        where: { tenantId, userId: req.user?.userId },
      });
      if (!employee) {
        return res.status(400).json({ error: "No employee profile found for your account." });
      }
      targetEmployeeId = employee.id;
    }

    const timesheet = await prisma.timesheet.create({
      data: {
        tenantId,
        employeeId: targetEmployeeId,
        projectId: projectId || null,
        taskId: taskId || null,
        date: new Date(date),
        hours: numHours,
        description: description || null,
        status: "pending",
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } },
      },
    });

    broadcastToTenant(tenantId, "timesheet:submitted", {
      id: timesheet.id,
      employeeName: `${timesheet.employee.firstName} ${timesheet.employee.lastName}`,
      hours: Number(timesheet.hours),
      date: timesheet.date,
    });

    return res.status(201).json({
      id: timesheet.id,
      employeeId: timesheet.employeeId,
      employeeName: `${timesheet.employee.firstName} ${timesheet.employee.lastName}`.trim(),
      projectName: timesheet.project?.name || "General Work",
      date: timesheet.date.toISOString().split("T")[0],
      hours: Number(timesheet.hours),
      description: timesheet.description,
      status: timesheet.status,
      createdAt: timesheet.createdAt.toISOString(),
    });
  } catch (err: any) {
    console.error("Timesheets POST error:", err);
    return res.status(500).json({ error: err.message || "Failed to create timesheet entry" });
  }
});

/**
 * PUT /api/timesheets/:id/approve
 * Manager/HR approves timesheet
 */
timesheetsRouter.put("/:id/approve", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;

    const timesheet = await prisma.timesheet.findFirst({
      where: { id, tenantId },
    });
    if (!timesheet) {
      return res.status(404).json({ error: "Timesheet entry not found" });
    }

    const updated = await prisma.timesheet.update({
      where: { id },
      data: {
        status: "approved",
        reviewedBy: req.user?.userId || "manager",
        reviewedAt: new Date(),
        reviewNotes: req.body.notes || null,
      },
    });

    broadcastToTenant(tenantId, "timesheet:approved", { id, status: "approved" });

    return res.json({ success: true, timesheet: updated });
  } catch (err: any) {
    console.error("Timesheets approve error:", err);
    return res.status(500).json({ error: err.message || "Failed to approve timesheet" });
  }
});

/**
 * PUT /api/timesheets/:id/reject
 * Manager/HR rejects timesheet
 */
timesheetsRouter.put("/:id/reject", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;
    const { reason } = req.body;

    const timesheet = await prisma.timesheet.findFirst({
      where: { id, tenantId },
    });
    if (!timesheet) {
      return res.status(404).json({ error: "Timesheet entry not found" });
    }

    const updated = await prisma.timesheet.update({
      where: { id },
      data: {
        status: "rejected",
        reviewedBy: req.user?.userId || "manager",
        reviewedAt: new Date(),
        reviewNotes: reason || "Rejected by supervisor",
      },
    });

    broadcastToTenant(tenantId, "timesheet:rejected", { id, status: "rejected", reason });

    return res.json({ success: true, timesheet: updated });
  } catch (err: any) {
    console.error("Timesheets reject error:", err);
    return res.status(500).json({ error: err.message || "Failed to reject timesheet" });
  }
});

/**
 * DELETE /api/timesheets/:id
 * Remove pending timesheet
 */
timesheetsRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { id } = req.params;

    const timesheet = await prisma.timesheet.findFirst({
      where: { id, tenantId },
    });
    if (!timesheet) {
      return res.status(404).json({ error: "Timesheet entry not found" });
    }

    const isEmployeeRole = req.user?.roles?.includes("employee") || req.user?.workspaceRole === "employee";
    if (timesheet.status === "approved" && isEmployeeRole) {
      return res.status(400).json({ error: "Cannot delete an approved timesheet." });
    }

    await prisma.timesheet.delete({ where: { id } });

    return res.json({ success: true, message: "Timesheet entry deleted." });
  } catch (err: any) {
    console.error("Timesheets delete error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete timesheet" });
  }
});
