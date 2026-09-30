import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { parsePaginationParams, formatPaginatedResponse } from "../lib/pagination";
import { broadcastToTenant } from "../socket";

export const warningsRouter = Router();

warningsRouter.use(requireAuth, resolveTenantContext);

const DEFAULT_WARNING_TYPES = [
  { name: "Attendance & Punctuality", defaultSeverity: "minor", description: "Unexcused absences, chronic tardiness, or unauthorized time off" },
  { name: "Policy & Code of Conduct", defaultSeverity: "moderate", description: "Non-compliance with organizational guidelines or workplace harassment" },
  { name: "Performance & Quality of Work", defaultSeverity: "moderate", description: "Consistently substandard deliverables or missed deadlines" },
  { name: "Insubordination & Misconduct", defaultSeverity: "major", description: "Refusal to follow reasonable instructions or hostile conduct" },
  { name: "Security & Data Breach", defaultSeverity: "critical", description: "Unauthorized access, sharing of proprietary data, or security violation" },
];

async function ensureDefaultWarningTypes(tenantId: string) {
  const count = await prisma.warningType.count({ where: { tenantId } });
  if (count === 0) {
    await prisma.$transaction(
      DEFAULT_WARNING_TYPES.map((t) =>
        prisma.warningType.create({
          data: {
            tenantId,
            name: t.name,
            defaultSeverity: t.defaultSeverity,
            description: t.description,
          },
        })
      )
    );
  }
}

// GET /api/warnings/types
warningsRouter.get("/types", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    await ensureDefaultWarningTypes(tenantId);

    const types = await prisma.warningType.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { warnings: true } },
      },
    });

    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch warning types." });
  }
});

// POST /api/warnings/types
warningsRouter.post("/types", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { name, defaultSeverity, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Warning type name is required." });
    }

    const type = await prisma.warningType.create({
      data: {
        tenantId,
        name: name.trim(),
        defaultSeverity: defaultSeverity || "moderate",
        description: description?.trim() || null,
      },
    });

    return res.status(201).json(type);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create warning type." });
  }
});

// GET /api/warnings
warningsRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { employeeId, warningTypeId, severity, status, search } = req.query;

    const where: any = { tenantId };

    // Employee isolation: If standard employee, only see own warnings
    const isEmployeeRole = req.user?.roles?.includes("employee") && !req.user?.roles?.some((r: string) => ["admin", "hr_admin", "super_admin"].includes(r));
    if (isEmployeeRole) {
      const myEmployee = await prisma.employee.findFirst({
        where: { tenantId, userId: req.user?.userId },
        select: { id: true },
      });
      if (myEmployee) {
        where.employeeId = myEmployee.id;
      }
    } else if (employeeId && employeeId !== "all") {
      where.employeeId = String(employeeId);
    }

    if (warningTypeId && warningTypeId !== "all") {
      where.warningTypeId = String(warningTypeId);
    }
    if (severity && severity !== "all") {
      where.severity = String(severity);
    }
    if (status && status !== "all") {
      where.status = String(status);
    }
    if (search) {
      where.OR = [
        { subject: { contains: String(search) } },
        { description: { contains: String(search) } },
        { warningBy: { contains: String(search) } },
        { employee: { firstName: { contains: String(search) } } },
        { employee: { lastName: { contains: String(search) } } },
        { employee: { employeeCode: { contains: String(search) } } },
      ];
    }

    const pagination = parsePaginationParams(req, "warningDate", 20);

    const [total, warnings, activeCount, criticalCount] = await Promise.all([
      prisma.disciplinaryWarning.count({ where }),
      prisma.disciplinaryWarning.findMany({
        where,
        include: {
          employee: {
            include: { department: true },
          },
          warningType: true,
        },
        orderBy: { warningDate: "desc" },
        ...(pagination.isPaginated ? { skip: pagination.skip, take: pagination.limit } : {}),
      }),
      prisma.disciplinaryWarning.count({ where: { ...where, status: "issued" } }),
      prisma.disciplinaryWarning.count({ where: { ...where, severity: "critical" } }),
    ]);

    return res.json({
      ...formatPaginatedResponse(warnings, total, pagination),
      stats: {
        totalWarnings: total,
        activeCount,
        criticalCount,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch disciplinary warnings." });
  }
});

// POST /api/warnings (Issue warning)
warningsRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const {
      employeeId,
      warningTypeId,
      subject,
      severity,
      warningDate,
      description,
      letterUrl,
      warningBy,
    } = req.body;

    if (!employeeId || !subject || !description) {
      return res.status(400).json({ error: "Employee, subject, and description are required." });
    }

    const warning = await prisma.disciplinaryWarning.create({
      data: {
        tenantId,
        employeeId,
        warningTypeId: warningTypeId || null,
        subject: subject.trim(),
        severity: severity || "moderate",
        warningDate: warningDate ? new Date(warningDate) : new Date(),
        description: description.trim(),
        letterUrl: letterUrl || null,
        warningBy: warningBy?.trim() || (req.user as any)?.name || "HR Department",
        status: "issued",
      },
      include: {
        employee: {
          include: { department: true },
        },
        warningType: true,
      },
    });

    broadcastToTenant(tenantId, "warning:issued", warning);
    broadcastToTenant(tenantId, "notification:new", {
      title: `Disciplinary Notice: ${warning.subject}`,
      description: `A formal ${warning.severity.toUpperCase()} warning was issued to ${warning.employee.firstName} ${warning.employee.lastName}.`,
      type: "warning",
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json(warning);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to issue disciplinary warning." });
  }
});

// POST /api/warnings/:id/acknowledge (Employee sign-off)
warningsRouter.post("/:id/acknowledge", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { id } = req.params;
    const { employeeResponse } = req.body;

    const existing = await prisma.disciplinaryWarning.findFirst({
      where: { id, tenantId },
      include: { employee: true },
    });
    if (!existing) return res.status(404).json({ error: "Warning record not found." });

    const updated = await prisma.disciplinaryWarning.update({
      where: { id },
      data: {
        status: "acknowledged",
        employeeResponse: employeeResponse?.trim() || "Acknowledged and signed by employee.",
        acknowledgedAt: new Date(),
      },
      include: {
        employee: { include: { department: true } },
        warningType: true,
      },
    });

    broadcastToTenant(tenantId, "warning:acknowledged", updated);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to acknowledge warning." });
  }
});

// POST /api/warnings/:id/resolve (Manager resolution)
warningsRouter.post("/:id/resolve", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { id } = req.params;

    const existing = await prisma.disciplinaryWarning.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Warning record not found." });

    const updated = await prisma.disciplinaryWarning.update({
      where: { id },
      data: {
        status: "resolved",
        resolvedAt: new Date(),
      },
      include: {
        employee: { include: { department: true } },
        warningType: true,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to resolve warning." });
  }
});

// PUT /api/warnings/:id (Update warning)
warningsRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { id } = req.params;
    const {
      warningTypeId,
      subject,
      severity,
      warningDate,
      description,
      letterUrl,
      warningBy,
      status,
    } = req.body;

    const existing = await prisma.disciplinaryWarning.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Warning record not found." });

    const updated = await prisma.disciplinaryWarning.update({
      where: { id },
      data: {
        warningTypeId: warningTypeId !== undefined ? warningTypeId : existing.warningTypeId,
        subject: subject !== undefined ? subject.trim() : existing.subject,
        severity: severity || existing.severity,
        warningDate: warningDate ? new Date(warningDate) : existing.warningDate,
        description: description !== undefined ? description.trim() : existing.description,
        letterUrl: letterUrl !== undefined ? letterUrl : existing.letterUrl,
        warningBy: warningBy !== undefined ? warningBy : existing.warningBy,
        status: status || existing.status,
      },
      include: {
        employee: { include: { department: true } },
        warningType: true,
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update warning." });
  }
});

// DELETE /api/warnings/:id
warningsRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context is required." });

    const { id } = req.params;
    const existing = await prisma.disciplinaryWarning.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Warning record not found." });

    await prisma.disciplinaryWarning.delete({ where: { id } });
    return res.json({ success: true, message: "Warning deleted successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete warning." });
  }
});
