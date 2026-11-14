import { Router, Response } from "express";
import { rawPrisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { LeaveService, LeaveHttpError } from "../services/leave.service";

export const meLeaveRouter = Router();

meLeaveRouter.use(requireAuth, resolveTenantContext);

function sendMeLeaveError(res: Response, err: any, defaultStatus: number = 500) {
  if (err instanceof LeaveHttpError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.details ? { details: err.details } : {}),
    });
  }
  if (err?.code === "PERIOD_LOCKED") {
    return res.status(423).json({ error: err.message, code: "PERIOD_LOCKED" });
  }
  return res.status(defaultStatus).json({ error: err?.message || "Leave operation failed" });
}

async function getSelfEmployee(req: AuthRequest) {
  const tenantId = req.tenantId!;
  const employee = await rawPrisma.employee.findFirst({
    where: { tenantId, userId: req.user!.userId },
    include: { branch: true, department: true },
  });
  if (!employee) {
    throw new LeaveHttpError(
      "No employee profile is linked to this user account.",
      403,
      "EMPLOYEE_PROFILE_REQUIRED"
    );
  }
  return employee;
}

// GET /api/v1/me/leave/catalog (Active leave types + resolved policy rules + live balances + eligibility)
meLeaveRouter.get("/catalog", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getUTCFullYear();
    const catalog = await LeaveService.getEligibleEmployeeLeaveCatalog(tenantId, employee.id, year);
    return res.json(catalog);
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
});

// GET /api/v1/me/leave/types (Active leave types array for ESS forms)
meLeaveRouter.get("/types", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getUTCFullYear();
    const catalog = await LeaveService.getEligibleEmployeeLeaveCatalog(tenantId, employee.id, year);
    return res.json(catalog.leaveTypes);
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
});

// GET /api/v1/me/leave/applications
meLeaveRouter.get("/applications", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const { status, leaveTypeId, year } = req.query;

    const where: any = { tenantId, employeeId: employee.id };
    if (status && status !== "all") {
      where.status = String(status);
    }
    if (leaveTypeId && leaveTypeId !== "all") {
      where.leaveTypeId = String(leaveTypeId);
    }
    if (year) {
      const y = parseInt(String(year), 10);
      if (!Number.isNaN(y)) {
        where.startDate = { lte: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)) };
        where.endDate = { gte: new Date(Date.UTC(y, 0, 1, 0, 0, 0)) };
      }
    }

    const applications = await rawPrisma.leaveRequest.findMany({
      where,
      include: { leaveType: true },
      orderBy: [{ createdAt: "desc" }],
    });

    const approverIds = Array.from(
      new Set(applications.map((a) => a.approverId).filter((x): x is string => Boolean(x)))
    );
    const approverUsers =
      approverIds.length > 0
        ? await rawPrisma.user.findMany({
            where: { id: { in: approverIds } },
            select: { id: true, email: true, profile: { select: { fullName: true } } },
          })
        : [];
    const approverMap = new Map(
      approverUsers.map((u) => [u.id, u.profile?.fullName || u.email || "Reviewer"])
    );

    const enriched = applications.map((a) => ({
      ...a,
      days: Number(a.days),
      approverName: a.approverId
        ? approverMap.get(a.approverId) ||
          (a.approverId === "SYSTEM_POLICY_AUTO_APPROVAL" ? "Auto-Approved by Policy" : "HR / Manager")
        : null,
    }));

    return res.json(enriched);
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
});

// GET /api/v1/me/leave/applications/:id
meLeaveRouter.get("/applications/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const { id } = req.params;

    const application = await rawPrisma.leaveRequest.findFirst({
      where: { id, tenantId },
      include: { leaveType: true },
    });

    if (!application) {
      return res.status(404).json({ error: "Leave application not found." });
    }
    if (application.employeeId !== employee.id) {
      return res.status(403).json({ error: "Forbidden: You can only view your own leave requests." });
    }

    const [approverUser, ledgerTransactions] = await Promise.all([
      application.approverId
        ? rawPrisma.user.findUnique({
            where: { id: application.approverId },
            select: { id: true, email: true, profile: { select: { fullName: true } } },
          })
        : Promise.resolve(null),
      rawPrisma.leaveLedgerEntry.findMany({
        where: { tenantId, referenceId: id },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return res.json({
      ...application,
      days: Number(application.days),
      approverName: approverUser
        ? approverUser.profile?.fullName || approverUser.email
        : application.approverId === "SYSTEM_POLICY_AUTO_APPROVAL"
        ? "Auto-Approved by Policy"
        : null,
      ledgerTransactions: ledgerTransactions.map((t) => ({
        ...t,
        days: Number(t.days),
        balance: Number(t.balance),
      })),
    });
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
});

// POST /api/v1/me/leave/applications/dry-run (Validation & day breakdown)
meLeaveRouter.post("/applications/dry-run", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const { leaveTypeId, startDate, endDate, halfDay, halfDaySession, reason, excludeRequestId } = req.body;

    if (!leaveTypeId || !startDate || !endDate) {
      return res.status(400).json({ error: "leaveTypeId, startDate, and endDate are required." });
    }

    const preview = await LeaveService.validateDryRun({
      tenantId,
      employeeId: employee.id,
      leaveTypeId,
      startDate,
      endDate,
      halfDay: Boolean(halfDay),
      halfDaySession,
      reason,
      excludeRequestId,
      bypassNoticePeriod: false,
    });

    return res.json(preview);
  } catch (err: any) {
    return sendMeLeaveError(res, err, 400);
  }
});

// POST /api/v1/me/leave/applications (Submit leave request)
meLeaveRouter.post("/applications", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const { leaveTypeId, startDate, endDate, halfDay, halfDaySession, reason, attachmentUrl } = req.body;

    if (!leaveTypeId || !startDate || !endDate || !reason || !String(reason).trim()) {
      return res
        .status(400)
        .json({ error: "leaveTypeId, startDate, endDate, and reason are required." });
    }

    const application = await LeaveService.submitApplication(
      tenantId,
      employee.id,
      {
        leaveTypeId,
        startDate,
        endDate,
        halfDay: Boolean(halfDay),
        halfDaySession,
        reason: String(reason).trim(),
        attachmentUrl: attachmentUrl || undefined,
      },
      req.user!.userId,
      { bypassNoticePeriod: false }
    );

    return res.status(201).json(application);
  } catch (err: any) {
    return sendMeLeaveError(res, err, 400);
  }
});

// PUT /api/v1/me/leave/applications/:id (Edit own pending leave request)
meLeaveRouter.put("/applications/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const { id } = req.params;

    const updated = await LeaveService.updatePendingApplication(
      tenantId,
      id,
      req.body,
      req.user!.userId,
      { callerEmployeeId: employee.id, isElevatedHR: false }
    );

    return res.json(updated);
  } catch (err: any) {
    return sendMeLeaveError(res, err, 400);
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
    if (!reqItem || reqItem.tenantId !== tenantId) {
      return res.status(404).json({ error: "Leave request not found." });
    }
    if (reqItem.employeeId !== employee.id) {
      return res.status(403).json({ error: "Forbidden: Cannot cancel another employee's request." });
    }

    if (reqItem.status === "approved") {
      const todayUtc = new Date();
      todayUtc.setUTCHours(0, 0, 0, 0);
      const startUtc = new Date(reqItem.startDate);
      startUtc.setUTCHours(0, 0, 0, 0);
      if (startUtc < todayUtc) {
        return res.status(400).json({
          error:
            "Approved leave that has already started cannot be self-cancelled. Please ask HR or your reporting manager to reverse it.",
          code: "PAST_APPROVED_LEAVE_REQUIRES_HR_REVERSAL",
        });
      }
    }

    const result = await LeaveService.cancelApplication(
      tenantId,
      id,
      req.user!.userId,
      reason || "Cancelled by employee"
    );
    return res.json(result);
  } catch (err: any) {
    return sendMeLeaveError(res, err, 400);
  }
});

// GET /api/v1/me/leave/balance (Authoritative ledger balances + full ledger history in 1 pass)
meLeaveRouter.get("/balance", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getUTCFullYear();

    const [detailedBalances, ledgerEntries] = await Promise.all([
      LeaveService.getEmployeeDetailedBalances(tenantId, employee.id, year, {
        includeInactiveWithHistory: true,
      }),
      LeaveService.getEmployeeLedger(tenantId, employee.id, year),
    ]);

    const ledgerByType = new Map<string, any[]>();
    for (const entry of ledgerEntries) {
      const list = ledgerByType.get(entry.leaveTypeId) || [];
      list.push(entry);
      ledgerByType.set(entry.leaveTypeId, list);
    }

    const balances = detailedBalances.map((b) => ({
      ...b,
      quota: b.total,
      entitlement: b.total,
      year,
      ledger: ledgerByType.get(b.leaveTypeId) || [],
    }));

    return res.json(balances);
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
});

// GET /api/v1/me/leave/policies (Applicable active policies + per-type resolved policy rules)
meLeaveRouter.get("/policies", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getUTCFullYear();

    const [catalog, rawPolicies] = await Promise.all([
      LeaveService.getEligibleEmployeeLeaveCatalog(tenantId, employee.id, year),
      rawPrisma.leavePolicy.findMany({
        where: { tenantId, status: "active" },
        include: { leaveType: true },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      }),
    ]);

    const refDate = new Date();
    refDate.setUTCHours(0, 0, 0, 0);

    const applicablePolicies = rawPolicies
      .filter((p) => {
        if (p.branchId && p.branchId !== employee.branchId) return false;
        if (p.departmentId && p.departmentId !== employee.departmentId) return false;
        if (p.effectiveFrom) {
          const ef = new Date(p.effectiveFrom);
          ef.setUTCHours(0, 0, 0, 0);
          if (refDate < ef) return false;
        }
        if (p.effectiveTo) {
          const et = new Date(p.effectiveTo);
          et.setUTCHours(23, 59, 59, 999);
          if (refDate > et) return false;
        }
        return true;
      })
      .map((p) => LeaveService.enrichPolicy(p));

    const defaultPolicy =
      applicablePolicies.find((p) => p.isDefault) || applicablePolicies[0] || null;

    return res.json({
      ...(defaultPolicy || {}),
      defaultPolicy,
      policies: applicablePolicies,
      leaveTypePolicies: catalog.leaveTypes,
      employee: catalog.employee,
      year,
    });
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
});

// GET /api/v1/me/leave/team-calendar (Peer & team absence grid with privacy filter)
meLeaveRouter.get("/team-calendar", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const employee = await getSelfEmployee(req);
    const now = new Date();
    const month = parseInt(String(req.query.month || now.getUTCMonth() + 1), 10);
    const year = parseInt(String(req.query.year || now.getUTCFullYear()), 10);

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const peerOrConditions: any[] = [{ id: employee.id }, { managerId: employee.id }];
    if (employee.departmentId) {
      peerOrConditions.push({ departmentId: employee.departmentId });
    }
    if (employee.managerId) {
      peerOrConditions.push({ id: employee.managerId });
    }

    const [teamLeaves, holidays] = await Promise.all([
      rawPrisma.leaveRequest.findMany({
        where: {
          tenantId,
          status: "approved",
          startDate: { lte: end },
          endDate: { gte: start },
          employee: { OR: peerOrConditions },
        },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          days: true,
          halfDay: true,
          halfDaySession: true,
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
        orderBy: { startDate: "asc" },
      }),
      rawPrisma.holiday.findMany({
        where: {
          tenantId,
          status: "active",
          date: { gte: start, lte: end },
        },
        select: { id: true, name: true, date: true, type: true },
        orderBy: { date: "asc" },
      }),
    ]);

    if (String(req.query.includeMeta) === "true") {
      return res.json({
        month,
        year,
        leaves: teamLeaves.map((l) => ({ ...l, days: Number(l.days) })),
        holidays,
      });
    }

    return res.json(teamLeaves.map((l) => ({ ...l, days: Number(l.days) })));
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
});
