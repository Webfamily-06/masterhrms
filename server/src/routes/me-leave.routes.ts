import { Router, Response } from "express";
import { rawPrisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { LeaveService, LeaveHttpError } from "../services/leave.service";
import { LeaveEncashmentCompOffService } from "../services/leave-encashment-compoff.service";

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

// =========================================================================
// ESS LEAVE ENCASHMENT & COMP-OFF (STRICT SELF-ONLY + DIRECT-REPORT MANAGER QUEUE)
// =========================================================================

async function resolveMeProfile(req: AuthRequest) {
  const tenantId = req.tenantId!;
  const profile = await LeaveEncashmentCompOffService.resolveCallerProfile(tenantId, {
    userId: req.user!.userId,
    email: req.user?.email || null,
    roles: req.user?.roles || [],
    permissions: req.user?.permissions || [],
  });
  if (!profile.employeeId) {
    throw new LeaveHttpError(
      "No employee profile is linked to this user account.",
      403,
      "EMPLOYEE_PROFILE_REQUIRED"
    );
  }
  return profile;
}

// GET /api/v1/me/leave/encashment-compoff/overview (Self summary, eligibility, Comp-Off balance & expiring alerts)
meLeaveRouter.get("/encashment-compoff/overview", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveMeProfile(req);
    const employeeId = profile.employeeId!;

    const [summary, encashmentEligibility, compOffBalance, activeEncashCfgs, activeCompOffCfgs] =
      await Promise.all([
        LeaveEncashmentCompOffService.getSummaryAggregates(tenantId, profile, { selfOnly: true }),
        LeaveEncashmentCompOffService.getEncashmentEligibilityForEmployee(tenantId, employeeId),
        LeaveEncashmentCompOffService.getCompOffBalanceAndExpiringLots(tenantId, employeeId, 14),
        rawPrisma.leaveEncashmentConfig.findMany({
          where: { tenantId, status: "active", enabled: true },
          select: { allowEssSubmission: true },
        }),
        rawPrisma.compOffConfig.findMany({
          where: { tenantId, status: "active", enabled: true },
          select: { allowEssSubmission: true },
        }),
      ]);

    const encashmentAllowed =
      activeEncashCfgs.length === 0 || activeEncashCfgs.some((c) => c.allowEssSubmission);
    const compOffAllowed =
      activeCompOffCfgs.length === 0 || activeCompOffCfgs.some((c) => c.allowEssSubmission);

    return res.json({
      currency: summary.currency || "INR",
      employee: profile.employee,
      directReportsCount: profile.directReportIds.length,
      viewerAccess: {
        isReportingManager: profile.isReportingManager,
        directReportsCount: profile.directReportIds.length,
        isHrAdmin: profile.isHrAdmin,
        isHrManager: profile.isHrManager,
      },
      essPolicy: {
        encashmentAllowed,
        compOffAllowed,
      },
      counts: {
        pendingRequests:
          Number(summary.pendingEncashmentRequests || 0) +
          Number(summary.pendingCompOffRequests || 0),
        paidEncashments: Number(summary.paidEncashmentRequests || 0),
      },
      summary,
      encashment: encashmentEligibility,
      encashmentEligibility,
      compOff: {
        ...compOffBalance,
        lots: compOffBalance.activeLots,
      },
      compOffBalance,
    });
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
});

async function handleListMyEncashmentCompOff(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveMeProfile(req);
    const result = await LeaveEncashmentCompOffService.listRequestsAndHistory(tenantId, profile, {
      selfOnly: true,
      tab: (req.query.tab as any) || "HISTORY",
      type: req.query.type ? String(req.query.type) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      leaveTypeId: req.query.leaveTypeId ? String(req.query.leaveTypeId) : undefined,
      startDate: req.query.startDate ? String(req.query.startDate) : undefined,
      endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      sortBy: req.query.sortBy ? String(req.query.sortBy) : "createdAt",
      sortOrder: req.query.sortOrder === "asc" ? "asc" : "desc",
    });
    return res.json(result);
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
}

// GET /api/v1/me/leave/encashment-compoff & /encashment-compoff/requests (Strictly own requests)
meLeaveRouter.get("/encashment-compoff", handleListMyEncashmentCompOff);
meLeaveRouter.get("/encashment-compoff/requests", handleListMyEncashmentCompOff);

async function handleGetMyEncashmentCompOffDetail(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveMeProfile(req);
    const detail = await LeaveEncashmentCompOffService.getTransactionDetail(
      tenantId,
      req.params.id,
      profile,
      { selfOnly: true }
    );
    return res.json(detail);
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
}

// GET /api/v1/me/leave/encashment-compoff/requests/:id (Strictly own transaction detail)
meLeaveRouter.get("/encashment-compoff/requests/:id", handleGetMyEncashmentCompOffDetail);

async function handleSelfEncashmentPreview(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveMeProfile(req);
    const preview = await LeaveEncashmentCompOffService.calculateEncashmentPreview(tenantId, {
      employeeId: profile.employeeId!,
      leaveTypeId: String(req.body?.leaveTypeId || ""),
      requestedDays: Number(req.body?.requestedDays ?? req.body?.days ?? 0),
      effectiveDate: req.body?.effectiveDate ? String(req.body.effectiveDate) : undefined,
      excludeEncashmentId: req.body?.excludeEncashmentId,
      isSelfService: true,
    });
    return res.json(preview);
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
}

meLeaveRouter.post("/encashment-compoff/encashments/preview", handleSelfEncashmentPreview);
meLeaveRouter.post("/encashment/preview", handleSelfEncashmentPreview);

async function handleCreateSelfEncashment(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveMeProfile(req);
    if (req.body?.employeeId && req.body.employeeId !== profile.employeeId) {
      return res.status(403).json({
        error: "Forbidden: Employees can only submit encashment requests for their own record.",
        code: "SELF_ONLY_VIOLATION",
      });
    }
    const created = await LeaveEncashmentCompOffService.createEncashmentRequest(
      tenantId,
      profile,
      {
        employeeId: profile.employeeId!,
        leaveTypeId: req.body?.leaveTypeId,
        days: Number(req.body?.days ?? req.body?.requestedDays ?? 0),
        reason: req.body?.reason,
        effectiveDate: req.body?.effectiveDate,
        attachmentUrl: req.body?.attachmentUrl,
        submitAsDraft: Boolean(req.body?.submitAsDraft),
        idempotencyKey:
          req.body?.idempotencyKey || (req.headers["idempotency-key"] as string | undefined),
      },
      { selfOnly: true }
    );
    return res.status(201).json(created);
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
}

meLeaveRouter.post("/encashment-compoff/encashments", handleCreateSelfEncashment);
meLeaveRouter.post("/encashment", handleCreateSelfEncashment);

// PATCH /api/v1/me/leave/encashment-compoff/encashments/:id (Edit own draft/pending/clarification encashment)
meLeaveRouter.patch(
  "/encashment-compoff/encashments/:id",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveMeProfile(req);
      const updated = await LeaveEncashmentCompOffService.updateEncashmentRequest(
        tenantId,
        req.params.id,
        profile,
        {
          leaveTypeId: req.body?.leaveTypeId,
          days:
            req.body?.days !== undefined
              ? Number(req.body.days)
              : req.body?.requestedDays !== undefined
                ? Number(req.body.requestedDays)
                : undefined,
          reason: req.body?.reason,
          effectiveDate: req.body?.effectiveDate,
          attachmentUrl: req.body?.attachmentUrl,
          submitNow: req.body?.submitNow,
        },
        { selfOnly: true }
      );
      return res.json(updated);
    } catch (err: any) {
      return sendMeLeaveError(res, err, 500);
    }
  }
);

// POST /api/v1/me/leave/encashment-compoff/encashments/:id/cancel (Cancel own eligible encashment)
meLeaveRouter.post(
  "/encashment-compoff/encashments/:id/cancel",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveMeProfile(req);
      const cancelled = await LeaveEncashmentCompOffService.cancelEncashmentRequest(
        tenantId,
        req.params.id,
        profile,
        req.body?.reason || req.body?.comments,
        { selfOnly: true }
      );
      return res.json(cancelled);
    } catch (err: any) {
      return sendMeLeaveError(res, err, 500);
    }
  }
);

// GET /api/v1/me/leave/encashment-compoff/encashments/:id/payroll-status (Self payroll tracking)
meLeaveRouter.get(
  "/encashment-compoff/encashments/:id/payroll-status",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveMeProfile(req);
      const status = await LeaveEncashmentCompOffService.getEncashmentPayrollStatus(
        tenantId,
        req.params.id,
        profile,
        { selfOnly: true }
      );
      return res.json(status);
    } catch (err: any) {
      return sendMeLeaveError(res, err, 500);
    }
  }
);

async function handleSelfCompOffVerify(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveMeProfile(req);
    const workedOnDate = String(req.body?.workedOnDate || req.body?.workDate || "").trim();
    if (!workedOnDate) {
      return res.status(400).json({ error: "workedOnDate is required." });
    }
    const verification = await LeaveEncashmentCompOffService.verifyAndPreviewCompOff(tenantId, {
      employeeId: profile.employeeId!,
      workedOnDate,
      workType: req.body?.workType,
      attendanceId: req.body?.attendanceId || null,
      overtimeRequestId: req.body?.overtimeRequestId || null,
      actualHoursWorked:
        req.body?.actualHoursWorked !== undefined ? Number(req.body.actualHoursWorked) : undefined,
      requestedDays:
        req.body?.requestedDays !== undefined
          ? Number(req.body.requestedDays)
          : req.body?.days !== undefined
            ? Number(req.body.days)
            : undefined,
      excludeRequestId: req.body?.excludeRequestId,
    });
    return res.json(verification);
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
}

meLeaveRouter.post("/encashment-compoff/comp-offs/preview", handleSelfCompOffVerify);
meLeaveRouter.post("/comp-off/verify", handleSelfCompOffVerify);

async function handleCreateSelfCompOff(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveMeProfile(req);
    if (req.body?.employeeId && req.body.employeeId !== profile.employeeId) {
      return res.status(403).json({
        error: "Forbidden: Employees can only submit Comp-Off requests for their own record.",
        code: "SELF_ONLY_VIOLATION",
      });
    }
    const created = await LeaveEncashmentCompOffService.createCompOffRequest(
      tenantId,
      profile,
      {
        employeeId: profile.employeeId!,
        workedOnDate: req.body?.workedOnDate || req.body?.workDate,
        workType: req.body?.workType,
        attendanceId: req.body?.attendanceId,
        overtimeRequestId: req.body?.overtimeRequestId,
        actualHoursWorked:
          req.body?.actualHoursWorked !== undefined ? Number(req.body.actualHoursWorked) : undefined,
        requestedDays:
          req.body?.requestedDays !== undefined
            ? Number(req.body.requestedDays)
            : req.body?.days !== undefined
              ? Number(req.body.days)
              : undefined,
        reason: req.body?.reason,
        attachmentUrl: req.body?.attachmentUrl,
        submitAsDraft: Boolean(req.body?.submitAsDraft),
        idempotencyKey:
          req.body?.idempotencyKey || (req.headers["idempotency-key"] as string | undefined),
      },
      { selfOnly: true }
    );
    return res.status(201).json(created);
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
}

meLeaveRouter.post("/encashment-compoff/comp-offs", handleCreateSelfCompOff);
meLeaveRouter.post("/comp-off", handleCreateSelfCompOff);

// PATCH /api/v1/me/leave/encashment-compoff/comp-offs/:id (Edit own draft/pending Comp-Off request)
meLeaveRouter.patch(
  "/encashment-compoff/comp-offs/:id",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveMeProfile(req);
      const updated = await LeaveEncashmentCompOffService.updateCompOffRequest(
        tenantId,
        req.params.id,
        profile,
        {
          workedOnDate: req.body?.workedOnDate || req.body?.workDate,
          workType: req.body?.workType,
          attendanceId: req.body?.attendanceId,
          overtimeRequestId: req.body?.overtimeRequestId,
          actualHoursWorked:
            req.body?.actualHoursWorked !== undefined
              ? Number(req.body.actualHoursWorked)
              : undefined,
          requestedDays:
            req.body?.requestedDays !== undefined
              ? Number(req.body.requestedDays)
              : req.body?.days !== undefined
                ? Number(req.body.days)
                : undefined,
          reason: req.body?.reason,
          attachmentUrl: req.body?.attachmentUrl,
          submitNow: req.body?.submitNow,
        },
        { selfOnly: true }
      );
      return res.json(updated);
    } catch (err: any) {
      return sendMeLeaveError(res, err, 500);
    }
  }
);

// POST /api/v1/me/leave/encashment-compoff/comp-offs/:id/cancel (Cancel own pending Comp-Off)
meLeaveRouter.post(
  "/encashment-compoff/comp-offs/:id/cancel",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveMeProfile(req);
      const cancelled = await LeaveEncashmentCompOffService.cancelCompOffRequest(
        tenantId,
        req.params.id,
        profile,
        req.body?.reason || req.body?.comments,
        { selfOnly: true }
      );
      return res.json(cancelled);
    } catch (err: any) {
      return sendMeLeaveError(res, err, 500);
    }
  }
);

// Unified ESS Detail, Edit & Cancel routes (/api/v1/me/leave/encashment-compoff/:id)
meLeaveRouter.get("/encashment-compoff/:id", handleGetMyEncashmentCompOffDetail);

async function handleUnifiedSelfUpdate(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveMeProfile(req);
    const existing = await rawPrisma.leaveEncashmentRequest.findFirst({
      where: { id: req.params.id, tenantId, employeeId: profile.employeeId! },
      select: { id: true, type: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Request not found." });
    }
    if (existing.type === "COMP_OFF") {
      const updated = await LeaveEncashmentCompOffService.updateCompOffRequest(
        tenantId,
        req.params.id,
        profile,
        {
          workedOnDate: req.body?.workedOnDate || req.body?.workDate,
          workType: req.body?.workType,
          attendanceId: req.body?.attendanceId,
          overtimeRequestId: req.body?.overtimeRequestId,
          actualHoursWorked:
            req.body?.actualHoursWorked !== undefined
              ? Number(req.body.actualHoursWorked)
              : undefined,
          requestedDays:
            req.body?.requestedDays !== undefined
              ? Number(req.body.requestedDays)
              : req.body?.days !== undefined
                ? Number(req.body.days)
                : undefined,
          reason: req.body?.reason,
          attachmentUrl: req.body?.attachmentUrl,
          submitNow: req.body?.submitNow,
        },
        { selfOnly: true }
      );
      return res.json(updated);
    }
    const updated = await LeaveEncashmentCompOffService.updateEncashmentRequest(
      tenantId,
      req.params.id,
      profile,
      {
        leaveTypeId: req.body?.leaveTypeId,
        days:
          req.body?.days !== undefined
            ? Number(req.body.days)
            : req.body?.requestedDays !== undefined
              ? Number(req.body.requestedDays)
              : undefined,
        reason: req.body?.reason,
        effectiveDate: req.body?.effectiveDate,
        attachmentUrl: req.body?.attachmentUrl,
        submitNow: req.body?.submitNow,
      },
      { selfOnly: true }
    );
    return res.json(updated);
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
}

meLeaveRouter.put("/encashment-compoff/:id", handleUnifiedSelfUpdate);
meLeaveRouter.patch("/encashment-compoff/:id", handleUnifiedSelfUpdate);

meLeaveRouter.post("/encashment-compoff/:id/cancel", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveMeProfile(req);
    const existing = await rawPrisma.leaveEncashmentRequest.findFirst({
      where: { id: req.params.id, tenantId, employeeId: profile.employeeId! },
      select: { id: true, type: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Request not found." });
    }
    if (existing.type === "COMP_OFF") {
      const cancelled = await LeaveEncashmentCompOffService.cancelCompOffRequest(
        tenantId,
        req.params.id,
        profile,
        req.body?.reason || req.body?.comments,
        { selfOnly: true }
      );
      return res.json(cancelled);
    }
    const cancelled = await LeaveEncashmentCompOffService.cancelEncashmentRequest(
      tenantId,
      req.params.id,
      profile,
      req.body?.reason || req.body?.comments,
      { selfOnly: true }
    );
    return res.json(cancelled);
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
});

// GET /api/v1/me/leave/team-encashment-compoff (Reporting Manager direct-report requests queue)
meLeaveRouter.get("/team-encashment-compoff", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveMeProfile(req);
    if (profile.directReportIds.length === 0 && !profile.isHrAdmin && !profile.isHrManager) {
      return res.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    }

    const where: any = {
      tenantId,
      ...(profile.isHrAdmin || profile.isHrManager
        ? {}
        : { employeeId: { in: profile.directReportIds } }),
      ...(req.query.type && req.query.type !== "all" ? { type: String(req.query.type) } : {}),
      ...(req.query.status && req.query.status !== "all"
        ? { status: String(req.query.status) }
        : {}),
    };

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const [rows, total] = await Promise.all([
      rawPrisma.leaveEncashmentRequest.findMany({
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
          leaveType: { select: { id: true, name: true, code: true, color: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      rawPrisma.leaveEncashmentRequest.count({ where }),
    ]);

    // Redact employee salary basis/amounts for Reporting Managers who are not HR/Payroll
    const canSeeSalary = profile.isHrAdmin || profile.isHrManager || profile.isPayrollRole;
    return res.json({
      data: rows.map((r) => ({
        ...r,
        days: Number(r.days),
        approvedDays: r.approvedDays !== null ? Number(r.approvedDays) : null,
        actualHoursWorked: r.actualWorkedHours !== null ? Number(r.actualWorkedHours) : null,
        actualWorkedHours: r.actualWorkedHours !== null ? Number(r.actualWorkedHours) : null,
        eligibleSalaryBasis:
          canSeeSalary && r.salaryBasisAmount !== null ? Number(r.salaryBasisAmount) : null,
        salaryBasisAmount:
          canSeeSalary && r.salaryBasisAmount !== null ? Number(r.salaryBasisAmount) : null,
        unitDailyRate:
          canSeeSalary && r.dailyRate !== null ? Number(r.dailyRate) : null,
        dailyRate:
          canSeeSalary && r.dailyRate !== null ? Number(r.dailyRate) : null,
        totalAmount:
          canSeeSalary && r.netPayableAmount !== null ? Number(r.netPayableAmount) : null,
        netPayableAmount:
          canSeeSalary && r.netPayableAmount !== null ? Number(r.netPayableAmount) : null,
        grossAmount:
          canSeeSalary && r.grossAmount !== null ? Number(r.grossAmount) : null,
        calculationSnapshot: canSeeSalary ? r.calculationSnapshot : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err: any) {
    return sendMeLeaveError(res, err, 500);
  }
});

// POST /api/v1/me/leave/team-encashment-compoff/:id/decide (Reporting Manager approve/reject direct-report request)
meLeaveRouter.post(
  "/team-encashment-compoff/:id/decide",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveMeProfile(req);
      const rec = await rawPrisma.leaveEncashmentRequest.findFirst({
        where: { id: req.params.id, tenantId },
        select: { id: true, type: true },
      });
      if (!rec) {
        return res.status(404).json({ error: "Request not found." });
      }

      const action = req.body?.action === "reject" ? "reject" : "approve";
      if (rec.type === "COMP_OFF") {
        const updated = await LeaveEncashmentCompOffService.decideCompOffRequest(
          tenantId,
          req.params.id,
          profile,
          {
            action,
            comments: req.body?.comments || req.body?.reason,
            approvedDays:
              req.body?.approvedDays !== undefined ? Number(req.body.approvedDays) : undefined,
          }
        );
        return res.json(updated);
      }

      const updated = await LeaveEncashmentCompOffService.decideEncashmentRequest(
        tenantId,
        req.params.id,
        profile,
        {
          action: req.body?.action === "request_clarification" ? "request_clarification" : action,
          comments: req.body?.comments || req.body?.reason,
          approvedDays:
            req.body?.approvedDays !== undefined ? Number(req.body.approvedDays) : undefined,
        }
      );
      return res.json(updated);
    } catch (err: any) {
      return sendMeLeaveError(res, err, 500);
    }
  }
);

