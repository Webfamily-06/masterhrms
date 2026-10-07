import { Router, Response } from "express";
import { rawPrisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { LeaveService } from "../services/leave.service";

export const meLeaveRouter = Router();

meLeaveRouter.use(requireAuth, resolveTenantContext);

async function getSelfEmployee(req: AuthRequest) {
  const tenantId = req.tenantId!;
  const employee = await rawPrisma.employee.findFirst({
    where: { tenantId, userId: req.user!.userId },
    include: { branch: true, department: true },
  });
  if (!employee) throw new Error("Employee profile not found for user");
  return employee;
}

// GET /api/v1/me/leave/applications
meLeaveRouter.get("/applications", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);

    const applications = await rawPrisma.leaveRequest.findMany({
      where: { tenantId, employeeId: employee.id },
      include: { leaveType: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json(applications);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/me/leave/applications/dry-run (Validation & day breakdown)
meLeaveRouter.post("/applications/dry-run", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const { leaveTypeId, startDate, endDate, halfDay, reason } = req.body;

    if (!leaveTypeId || !startDate || !endDate) {
      return res.status(400).json({ error: "leaveTypeId, startDate, and endDate are required" });
    }

    const preview = await LeaveService.validateDryRun({
      tenantId,
      employeeId: employee.id,
      leaveTypeId,
      startDate,
      endDate,
      halfDay,
      reason,
    });

    return res.json(preview);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/me/leave/applications (Submit leave request)
meLeaveRouter.post("/applications", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const { leaveTypeId, startDate, endDate, halfDay, reason } = req.body;

    if (!leaveTypeId || !startDate || !endDate || !reason) {
      return res.status(400).json({ error: "leaveTypeId, startDate, endDate, and reason are required" });
    }

    const application = await LeaveService.submitApplication(tenantId, employee.id, {
      leaveTypeId,
      startDate,
      endDate,
      halfDay,
      reason,
    });

    return res.status(201).json(application);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/me/leave/applications/:id/cancel
meLeaveRouter.post("/applications/:id/cancel", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const { id } = req.params;
    const { reason } = req.body;

    const reqItem = await rawPrisma.leaveRequest.findUnique({ where: { id } });
    if (!reqItem || reqItem.employeeId !== employee.id || reqItem.tenantId !== tenantId) {
      return res.status(403).json({ error: "Forbidden: Cannot cancel another employee's request" });
    }

    const result = await LeaveService.cancelApplication(tenantId, id, req.user!.userId, reason);
    return res.json(result);
  } catch (err: any) {
    if (err.code === "PERIOD_LOCKED") return res.status(423).json({ error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/me/leave/balance (Authoritative ledger balances)
meLeaveRouter.get("/balance", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);

    const leaveTypes = await rawPrisma.leaveType.findMany({ where: { tenantId } });

    const balances = await Promise.all(
      leaveTypes.map(async (lt) => {
        const bal = await LeaveService.getEmployeeBalance(tenantId, employee.id, lt.id);
        const entries = await rawPrisma.leaveLedgerEntry.findMany({
          where: { tenantId, employeeId: employee.id, leaveTypeId: lt.id },
          orderBy: { effectiveAt: "desc" },
        });

        return {
          leaveTypeId: lt.id,
          leaveTypeName: lt.name,
          quota: lt.daysPerYear,
          isPaid: lt.isPaid,
          available: bal,
          ledger: entries,
        };
      })
    );

    return res.json(balances);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/me/leave/policies
meLeaveRouter.get("/policies", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const policy = await rawPrisma.leavePolicy.findFirst({
      where: { tenantId, isDefault: true },
    });
    return res.json(policy || { name: "Standard Leave Policy", noticeDays: 2, maxConsecutiveDays: 14, sandwichRule: false });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/me/leave/team-calendar (Peer absence grid with privacy filter)
meLeaveRouter.get("/team-calendar", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const now = new Date();
    const month = parseInt(String(req.query.month || now.getUTCMonth() + 1), 10);
    const year = parseInt(String(req.query.year || now.getUTCFullYear()), 10);

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    // Team calendar: find colleagues in the same department
    const teamLeaves = await rawPrisma.leaveRequest.findMany({
      where: {
        tenantId,
        status: "approved",
        startDate: { lte: end },
        endDate: { gte: start },
        employee: { departmentId: employee.departmentId },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        days: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
        leaveType: {
          select: { name: true, color: true },
        },
      },
    });

    return res.json(teamLeaves);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
