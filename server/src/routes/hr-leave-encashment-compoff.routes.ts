import { Router, Response } from "express";
import { rawPrisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { LeaveHttpError } from "../services/leave.service";
import {
  LeaveEncashmentCompOffService,
  CallerAuthorizationProfile,
} from "../services/leave-encashment-compoff.service";

export const hrLeaveEncashmentCompOffRouter = Router();

hrLeaveEncashmentCompOffRouter.use(requireAuth, resolveTenantContext);

function sendRouteError(res: Response, err: any, fallbackStatus: number = 500) {
  if (err?.code === "PERIOD_LOCKED") {
    return res.status(423).json({ error: err.message, code: "PERIOD_LOCKED" });
  }
  if (err instanceof LeaveHttpError || typeof err?.status === "number") {
    return res.status(err.status || 400).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.details ? { details: err.details, ...err.details } : {}),
    });
  }
  return res.status(fallbackStatus).json({ error: err?.message || "Internal server error" });
}

async function resolveProfile(req: AuthRequest): Promise<CallerAuthorizationProfile> {
  const tenantId = req.tenantId!;
  return LeaveEncashmentCompOffService.resolveCallerProfile(tenantId, {
    userId: req.user!.userId,
    email: req.user?.email || null,
    roles: req.user?.roles || [],
    permissions: req.user?.permissions || [],
  });
}

function assertAuthorizedWorkspaceAccess(profile: CallerAuthorizationProfile) {
  const hasAccess =
    profile.isHrAdmin ||
    profile.isHrManager ||
    profile.isPayrollRole ||
    profile.isReportingManager ||
    Boolean(profile.employeeId) ||
    profile.permissions.some(
      (p) =>
        p === "*" ||
        p.startsWith("hrm.leave.") ||
        p.startsWith("payroll.") ||
        p.startsWith("hrm.payroll.")
    );

  if (!hasAccess) {
    throw new LeaveHttpError(
      "Forbidden: Insufficient permissions to access Leave Encashment & Comp-Off.",
      403,
      "FORBIDDEN"
    );
  }
}

function assertCanAccessEmployeeScope(
  profile: CallerAuthorizationProfile,
  targetEmployeeId: string
) {
  if (profile.isHrAdmin || profile.isHrManager || profile.isPayrollRole) return;
  if (profile.employeeId && profile.employeeId === targetEmployeeId) return;
  if (profile.directReportIds.includes(targetEmployeeId)) return;
  throw new LeaveHttpError(
    "Forbidden: You do not have organizational access to this employee record.",
    403,
    "EMPLOYEE_SCOPE_FORBIDDEN"
  );
}

// =========================================================================
// 0. DYNAMIC FILTER METADATA, AGGREGATE SUMMARY & BACKWARD COMPATIBILITY
// =========================================================================

hrLeaveEncashmentCompOffRouter.get("/metadata", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    assertAuthorizedWorkspaceAccess(profile);
    const meta = await LeaveEncashmentCompOffService.getDynamicFilterMetadata(tenantId, profile);
    return res.json(meta);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
});

hrLeaveEncashmentCompOffRouter.get("/summary", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    assertAuthorizedWorkspaceAccess(profile);
    const summary = await LeaveEncashmentCompOffService.getSummaryAggregates(tenantId, profile);
    return res.json(summary);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
});

// Backward-compatible root list endpoint (/api/v1/hr/leave/encashment-compoff)
hrLeaveEncashmentCompOffRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    assertAuthorizedWorkspaceAccess(profile);

    const result = await LeaveEncashmentCompOffService.listRequestsAndHistory(tenantId, profile, {
      tab: (req.query.tab as any) || "HISTORY",
      type:
        req.query.type || req.query.transactionType
          ? String(req.query.type || req.query.transactionType)
          : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
      departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
      branchId: req.query.branchId ? String(req.query.branchId) : undefined,
      leaveTypeId: req.query.leaveTypeId ? String(req.query.leaveTypeId) : undefined,
      payrollPeriod: req.query.payrollPeriod ? String(req.query.payrollPeriod) : undefined,
      payrollMonth: req.query.payrollMonth ? String(req.query.payrollMonth) : undefined,
      payrollYear: req.query.payrollYear ? String(req.query.payrollYear) : undefined,
      startDate: req.query.startDate ? String(req.query.startDate) : undefined,
      endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      sortBy: req.query.sortBy ? String(req.query.sortBy) : "createdAt",
      sortOrder: req.query.sortOrder === "asc" ? "asc" : "desc",
    });

    if (req.query.paginated === "true" || req.query.page !== undefined) {
      return res.json(result);
    }
    return res.json(result.data);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
});

// Backward-compatible action endpoint (/api/v1/hr/leave/encashment-compoff/:id/action)
hrLeaveEncashmentCompOffRouter.post("/:id/action", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    const { id } = req.params;
    const { action, comments, approvedDays } = req.body || {};

    const rec = await rawPrisma.leaveEncashmentRequest.findFirst({
      where: { id, tenantId },
      select: { id: true, type: true },
    });
    if (!rec) {
      return res.status(404).json({ error: "Request not found." });
    }

    if (rec.type === "COMP_OFF") {
      const updated = await LeaveEncashmentCompOffService.decideCompOffRequest(
        tenantId,
        id,
        profile,
        {
          action: action === "reject" ? "reject" : "approve",
          comments,
          approvedDays: approvedDays !== undefined ? Number(approvedDays) : undefined,
        }
      );
      return res.json(updated);
    }

    const updated = await LeaveEncashmentCompOffService.decideEncashmentRequest(
      tenantId,
      id,
      profile,
      {
        action:
          action === "reject"
            ? "reject"
            : action === "request_clarification"
              ? "request_clarification"
              : "approve",
        comments,
        approvedDays: approvedDays !== undefined ? Number(approvedDays) : undefined,
      }
    );
    return res.json(updated);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
});

// =========================================================================
// 1. MODULE A — LEAVE ENCASHMENT ENDPOINTS
// =========================================================================

hrLeaveEncashmentCompOffRouter.get("/encashments", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    assertAuthorizedWorkspaceAccess(profile);

    const result = await LeaveEncashmentCompOffService.listRequestsAndHistory(tenantId, profile, {
      tab: "ENCASHMENT",
      status: req.query.status ? String(req.query.status) : undefined,
      employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
      departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
      branchId: req.query.branchId ? String(req.query.branchId) : undefined,
      leaveTypeId: req.query.leaveTypeId ? String(req.query.leaveTypeId) : undefined,
      payrollPeriod: req.query.payrollPeriod ? String(req.query.payrollPeriod) : undefined,
      payrollMonth: req.query.payrollMonth ? String(req.query.payrollMonth) : undefined,
      payrollYear: req.query.payrollYear ? String(req.query.payrollYear) : undefined,
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
    return sendRouteError(res, err);
  }
});

async function handleEncashmentEligibility(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    assertAuthorizedWorkspaceAccess(profile);

    const employeeId = String(req.query.employeeId || profile.employeeId || "").trim();
    if (!employeeId) {
      return res.status(400).json({ error: "employeeId is required." });
    }
    assertCanAccessEmployeeScope(profile, employeeId);

    const effectiveDate = req.query.effectiveDate ? String(req.query.effectiveDate) : undefined;
    const eligibility = await LeaveEncashmentCompOffService.getEncashmentEligibilityForEmployee(
      tenantId,
      employeeId,
      effectiveDate
    );
    return res.json(eligibility);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
}

hrLeaveEncashmentCompOffRouter.get("/encashments/eligibility", handleEncashmentEligibility);
hrLeaveEncashmentCompOffRouter.get("/encashments/eligible-types", handleEncashmentEligibility);

hrLeaveEncashmentCompOffRouter.post(
  "/encashments/calculate-preview",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      assertAuthorizedWorkspaceAccess(profile);

      const employeeId = String(req.body?.employeeId || profile.employeeId || "").trim();
      const leaveTypeId = String(req.body?.leaveTypeId || "").trim();
      const requestedDays = Number(req.body?.requestedDays ?? req.body?.days ?? 0);

      if (!employeeId || !leaveTypeId) {
        return res.status(400).json({ error: "employeeId and leaveTypeId are required." });
      }
      assertCanAccessEmployeeScope(profile, employeeId);

      const preview = await LeaveEncashmentCompOffService.calculateEncashmentPreview(tenantId, {
        employeeId,
        leaveTypeId,
        requestedDays,
        effectiveDate: req.body?.effectiveDate ? String(req.body.effectiveDate) : undefined,
        excludeEncashmentId: req.body?.excludeEncashmentId
          ? String(req.body.excludeEncashmentId)
          : undefined,
        isSelfService: employeeId === profile.employeeId && !profile.isHrAdmin,
      });
      return res.json(preview);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.post("/encashments", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    assertAuthorizedWorkspaceAccess(profile);

    if (profile.isPayrollRole && !profile.isHrAdmin && !profile.isHrManager && req.body?.employeeId && req.body.employeeId !== profile.employeeId) {
      return res.status(403).json({
        error: "Forbidden: Payroll role cannot create encashment requests on behalf of other employees.",
        code: "FORBIDDEN",
      });
    }

    const created = await LeaveEncashmentCompOffService.createEncashmentRequest(
      tenantId,
      profile,
      {
        employeeId: req.body?.employeeId,
        leaveTypeId: req.body?.leaveTypeId,
        days: Number(req.body?.days ?? req.body?.requestedDays ?? 0),
        reason: req.body?.reason,
        effectiveDate: req.body?.effectiveDate,
        attachmentUrl: req.body?.attachmentUrl,
        submitAsDraft: Boolean(req.body?.submitAsDraft),
        idempotencyKey:
          req.body?.idempotencyKey || (req.headers["idempotency-key"] as string | undefined),
      }
    );
    return res.status(201).json(created);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
});

hrLeaveEncashmentCompOffRouter.get("/encashments/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    assertAuthorizedWorkspaceAccess(profile);

    const detail = await LeaveEncashmentCompOffService.getTransactionDetail(
      tenantId,
      req.params.id,
      profile
    );
    if (detail.type !== "ENCASHMENT") {
      return res.status(404).json({ error: "Encashment request not found." });
    }
    return res.json(detail);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
});

async function handleUpdateEncashment(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    assertAuthorizedWorkspaceAccess(profile);

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
      }
    );
    return res.json(updated);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
}

hrLeaveEncashmentCompOffRouter.patch("/encashments/:id", handleUpdateEncashment);
hrLeaveEncashmentCompOffRouter.put("/encashments/:id", handleUpdateEncashment);

hrLeaveEncashmentCompOffRouter.post(
  "/encashments/:id/decide",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const rawAction = String(req.body?.action || "approve").toLowerCase();
      const action =
        rawAction === "reject"
          ? "reject"
          : rawAction === "request_clarification" || rawAction === "clarify"
            ? "request_clarification"
            : "approve";
      const updated = await LeaveEncashmentCompOffService.decideEncashmentRequest(
        tenantId,
        req.params.id,
        profile,
        {
          action,
          comments: req.body?.comments || req.body?.rejectionReason || req.body?.reason,
          approvedDays:
            req.body?.approvedDays !== undefined ? Number(req.body.approvedDays) : undefined,
        }
      );
      return res.json(updated);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.post(
  "/encashments/:id/approve",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const updated = await LeaveEncashmentCompOffService.decideEncashmentRequest(
        tenantId,
        req.params.id,
        profile,
        {
          action: "approve",
          comments: req.body?.comments,
          approvedDays:
            req.body?.approvedDays !== undefined ? Number(req.body.approvedDays) : undefined,
        }
      );
      return res.json(updated);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.post(
  "/encashments/:id/reject",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const updated = await LeaveEncashmentCompOffService.decideEncashmentRequest(
        tenantId,
        req.params.id,
        profile,
        {
          action: "reject",
          comments: req.body?.comments || req.body?.reason,
        }
      );
      return res.json(updated);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.post(
  "/encashments/:id/clarify",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const updated = await LeaveEncashmentCompOffService.decideEncashmentRequest(
        tenantId,
        req.params.id,
        profile,
        {
          action: "request_clarification",
          comments: req.body?.comments || req.body?.note,
        }
      );
      return res.json(updated);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.post(
  "/encashments/:id/cancel",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const updated = await LeaveEncashmentCompOffService.cancelEncashmentRequest(
        tenantId,
        req.params.id,
        profile,
        req.body?.reason || req.body?.comments
      );
      return res.json(updated);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.post(
  "/encashments/:id/process-payroll",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const updated = await LeaveEncashmentCompOffService.processEncashmentToPayroll(
        tenantId,
        req.params.id,
        profile,
        {
          payrollMonth: Number(req.body?.payrollMonth),
          payrollYear: Number(req.body?.payrollYear),
          payrollRunId: req.body?.payrollRunId,
          salaryComponentId: req.body?.salaryComponentId,
          allowControlledAdjustment: Boolean(req.body?.allowControlledAdjustment),
          notes: req.body?.notes,
        }
      );
      return res.json(updated);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

async function handleMarkEncashmentPayrollFailed(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    const updated = await LeaveEncashmentCompOffService.markEncashmentPayrollFailed(
      tenantId,
      req.params.id,
      profile,
      req.body?.failureReason || req.body?.reason || ""
    );
    return res.json(updated);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
}

hrLeaveEncashmentCompOffRouter.post(
  "/encashments/:id/payroll-failed",
  handleMarkEncashmentPayrollFailed
);
hrLeaveEncashmentCompOffRouter.post(
  "/encashments/:id/mark-payroll-failed",
  handleMarkEncashmentPayrollFailed
);

async function handleReconcileEncashmentPaid(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    if (!profile.isHrAdmin && !profile.isPayrollRole) {
      return res.status(403).json({
        error:
          "Forbidden: Only authorized Payroll Officers or HR Admins can reconcile paid status.",
        code: "UNAUTHORIZED_PAYROLL_PROCESSOR",
      });
    }

    // Prevent self-reconciliation
    const target = await rawPrisma.leaveEncashmentRequest.findFirst({
      where: { id: req.params.id, tenantId },
      include: { employee: true },
    });
    if (!target) {
      return res.status(404).json({ error: "Encashment request not found." });
    }
    if (
      (profile.employeeId && profile.employeeId === target.employeeId) ||
      (target.employee?.userId && target.employee.userId === profile.userId)
    ) {
      return res.status(403).json({
        error: "Forbidden: You cannot mark your own encashment request as paid.",
        code: "SELF_APPROVAL_FORBIDDEN",
      });
    }

    const result = await LeaveEncashmentCompOffService.reconcileAndMarkPayrollPaid(tenantId, {
      requestId: req.params.id,
      payrollRunId: req.body?.payrollRunId,
      disbursementRef:
        req.body?.disbursementRef || req.body?.payrollRef || req.body?.payrollReference,
      actorUserId: profile.userId,
      actorEmail: profile.email,
    });
    return res.json(result.records[0] || result);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
}

hrLeaveEncashmentCompOffRouter.post("/encashments/:id/mark-paid", handleReconcileEncashmentPaid);
hrLeaveEncashmentCompOffRouter.post(
  "/encashments/:id/reconcile-paid",
  handleReconcileEncashmentPaid
);

hrLeaveEncashmentCompOffRouter.get(
  "/encashments/:id/payroll-status",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const status = await LeaveEncashmentCompOffService.getEncashmentPayrollStatus(
        tenantId,
        req.params.id,
        profile
      );
      return res.json(status);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.post(
  "/encashments/:id/reverse",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const reversed = await LeaveEncashmentCompOffService.reverseTransaction(
        tenantId,
        req.params.id,
        profile,
        {
          reason: req.body?.reason || req.body?.comments || "",
          payrollRecoveryRef: req.body?.payrollRecoveryRef || req.body?.recoveryRef || undefined,
        }
      );
      return res.json(reversed);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

// =========================================================================
// 2. MODULE B — COMP-OFF MANAGEMENT ENDPOINTS
// =========================================================================

hrLeaveEncashmentCompOffRouter.get("/comp-offs", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    assertAuthorizedWorkspaceAccess(profile);

    if (profile.isPayrollRole && !profile.isHrAdmin && !profile.isHrManager && !profile.isReportingManager) {
      return res.status(403).json({
        error: "Forbidden: Payroll role is restricted to Leave Encashment payroll processing.",
        code: "FORBIDDEN",
      });
    }

    const result = await LeaveEncashmentCompOffService.listRequestsAndHistory(tenantId, profile, {
      tab: "COMP_OFF",
      status: req.query.status ? String(req.query.status) : undefined,
      employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
      departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
      branchId: req.query.branchId ? String(req.query.branchId) : undefined,
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
    return sendRouteError(res, err);
  }
});

async function handleVerifyOrPreviewCompOff(req: AuthRequest, res: Response, defaultWorkType?: string) {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    assertAuthorizedWorkspaceAccess(profile);

    const employeeId = String(req.body?.employeeId || profile.employeeId || "").trim();
    const workedOnDate = String(req.body?.workedOnDate || req.body?.workDate || "").trim();
    if (!employeeId || !workedOnDate) {
      return res.status(400).json({ error: "employeeId and workedOnDate are required." });
    }
    assertCanAccessEmployeeScope(profile, employeeId);

    const verification = await LeaveEncashmentCompOffService.verifyAndPreviewCompOff(tenantId, {
      employeeId,
      workedOnDate,
      workType: req.body?.workType || defaultWorkType,
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
    return sendRouteError(res, err);
  }
}

hrLeaveEncashmentCompOffRouter.post("/comp-offs/verify-eligibility", (req, res) =>
  handleVerifyOrPreviewCompOff(req, res)
);
hrLeaveEncashmentCompOffRouter.post("/comp-offs/verify-overtime", (req, res) =>
  handleVerifyOrPreviewCompOff(req, res, "OVERTIME")
);
hrLeaveEncashmentCompOffRouter.post("/comp-offs/preview-credit", (req, res) =>
  handleVerifyOrPreviewCompOff(req, res)
);

hrLeaveEncashmentCompOffRouter.post("/comp-offs", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    assertAuthorizedWorkspaceAccess(profile);

    if (profile.isPayrollRole && !profile.isHrAdmin && !profile.isHrManager) {
      return res.status(403).json({
        error: "Forbidden: Payroll role cannot submit Comp-Off requests.",
        code: "FORBIDDEN",
      });
    }

    const created = await LeaveEncashmentCompOffService.createCompOffRequest(tenantId, profile, {
      employeeId: req.body?.employeeId,
      leaveTypeId: req.body?.leaveTypeId,
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
      managerEmployeeId: req.body?.managerEmployeeId,
      submitAsDraft: Boolean(req.body?.submitAsDraft),
      idempotencyKey:
        req.body?.idempotencyKey || (req.headers["idempotency-key"] as string | undefined),
    });
    return res.status(201).json(created);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
});

hrLeaveEncashmentCompOffRouter.get("/comp-offs/balance", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    assertAuthorizedWorkspaceAccess(profile);

    const employeeId = String(req.query.employeeId || profile.employeeId || "").trim();
    if (!employeeId) {
      return res.status(400).json({ error: "employeeId is required." });
    }
    assertCanAccessEmployeeScope(profile, employeeId);

    const bal = await LeaveEncashmentCompOffService.getCompOffBalanceAndExpiringLots(
      tenantId,
      employeeId,
      req.query.warningDays ? Number(req.query.warningDays) : 14
    );
    return res.json(bal);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
});

hrLeaveEncashmentCompOffRouter.get(
  "/comp-offs/expiring",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      assertAuthorizedWorkspaceAccess(profile);

      const warningDays = Math.min(90, Math.max(1, Number(req.query.warningDays || 14)));
      const employeeId = req.query.employeeId ? String(req.query.employeeId).trim() : null;

      if (employeeId) {
        assertCanAccessEmployeeScope(profile, employeeId);
        const bal = await LeaveEncashmentCompOffService.getCompOffBalanceAndExpiringLots(
          tenantId,
          employeeId,
          warningDays
        );
        return res.json({
          warningDays,
          totalExpiringSoonDays: bal.expiringSoonDays,
          lots: bal.expiringSoonLots,
        });
      }

      // Tenant-wide / manager-scoped expiring lots
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const horizon = new Date(today.getTime() + warningDays * 86400000);

      const scopeFilter: any = {};
      if (!profile.isHrAdmin && !profile.isHrManager) {
        const ids = [
          ...(profile.employeeId ? [profile.employeeId] : []),
          ...profile.directReportIds,
        ];
        scopeFilter.employeeId = { in: ids };
      }

      const lots = await rawPrisma.leaveEncashmentRequest.findMany({
        where: {
          tenantId,
          type: "COMP_OFF",
          status: { in: ["CREDITED", "PARTIALLY_USED"] },
          remainingDays: { gt: 0 },
          expiresAt: { gte: today, lte: horizon },
          ...scopeFilter,
        },
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
          leaveType: { select: { id: true, name: true, code: true } },
        },
        orderBy: { expiresAt: "asc" },
        take: 100,
      });

      const totalExpiringSoonDays = lots.reduce(
        (sum, l) => sum + Number(l.remainingDays || 0),
        0
      );

      return res.json({
        warningDays,
        totalExpiringSoonDays: Number(totalExpiringSoonDays.toFixed(2)),
        lots: lots.map((l) => ({
          ...l,
          days: Number(l.days),
          approvedDays: l.approvedDays !== null ? Number(l.approvedDays) : null,
          remainingDays: Number(l.remainingDays || 0),
          daysUntilExpiry: l.expiresAt
            ? Math.max(0, Math.ceil((new Date(l.expiresAt).getTime() - today.getTime()) / 86400000))
            : null,
        })),
      });
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

async function handleProcessCompOffExpirySweep(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    if (!profile.isHrAdmin) {
      return res.status(403).json({
        error:
          "Forbidden: Only HR Administrators can manually trigger Comp-Off expiry processing.",
        code: "HR_ADMIN_REQUIRED",
      });
    }

    const refDate = req.body?.referenceDate ? new Date(req.body.referenceDate) : undefined;
    const summary = await LeaveEncashmentCompOffService.processTenantCompOffExpiry(tenantId, {
      referenceDate: refDate,
      actorUserId: profile.userId,
      actorEmail: profile.email,
    });
    return res.json(summary);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
}

hrLeaveEncashmentCompOffRouter.post(
  "/comp-offs/process-expiry",
  handleProcessCompOffExpirySweep
);
hrLeaveEncashmentCompOffRouter.post(
  "/comp-offs/run-expiry-sweep",
  handleProcessCompOffExpirySweep
);

hrLeaveEncashmentCompOffRouter.get("/comp-offs/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    assertAuthorizedWorkspaceAccess(profile);

    const detail = await LeaveEncashmentCompOffService.getTransactionDetail(
      tenantId,
      req.params.id,
      profile
    );
    if (detail.type !== "COMP_OFF") {
      return res.status(404).json({ error: "Comp-Off request not found." });
    }
    return res.json(detail);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
});

async function handleUpdateCompOff(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    assertAuthorizedWorkspaceAccess(profile);

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
      }
    );
    return res.json(updated);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
}

hrLeaveEncashmentCompOffRouter.patch("/comp-offs/:id", handleUpdateCompOff);
hrLeaveEncashmentCompOffRouter.put("/comp-offs/:id", handleUpdateCompOff);

hrLeaveEncashmentCompOffRouter.post(
  "/comp-offs/:id/decide",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const action = String(req.body?.action || "approve").toLowerCase() === "reject" ? "reject" : "approve";
      const updated = await LeaveEncashmentCompOffService.decideCompOffRequest(
        tenantId,
        req.params.id,
        profile,
        {
          action,
          comments: req.body?.comments || req.body?.rejectionReason || req.body?.reason,
          approvedDays:
            req.body?.approvedDays !== undefined ? Number(req.body.approvedDays) : undefined,
        }
      );
      return res.json(updated);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.post(
  "/comp-offs/:id/approve",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const updated = await LeaveEncashmentCompOffService.decideCompOffRequest(
        tenantId,
        req.params.id,
        profile,
        {
          action: "approve",
          comments: req.body?.comments,
          approvedDays:
            req.body?.approvedDays !== undefined ? Number(req.body.approvedDays) : undefined,
        }
      );
      return res.json(updated);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.post(
  "/comp-offs/:id/reject",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const updated = await LeaveEncashmentCompOffService.decideCompOffRequest(
        tenantId,
        req.params.id,
        profile,
        {
          action: "reject",
          comments: req.body?.comments || req.body?.reason,
        }
      );
      return res.json(updated);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.post(
  "/comp-offs/:id/credit",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const credited = await LeaveEncashmentCompOffService.creditApprovedCompOff(
        tenantId,
        req.params.id,
        profile
      );
      return res.json(credited);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.post(
  "/comp-offs/:id/cancel",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const cancelled = await LeaveEncashmentCompOffService.cancelCompOffRequest(
        tenantId,
        req.params.id,
        profile,
        req.body?.reason || req.body?.comments
      );
      return res.json(cancelled);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.post(
  "/comp-offs/:id/reverse",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const reversed = await LeaveEncashmentCompOffService.reverseTransaction(
        tenantId,
        req.params.id,
        profile,
        {
          reason: req.body?.reason || req.body?.comments || "",
          payrollRecoveryRef: req.body?.payrollRecoveryRef || req.body?.recoveryRef || undefined,
        }
      );
      return res.json(reversed);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

// =========================================================================
// 3. MODULE C — UNIFIED TRANSACTION HISTORY & EXPORT
// =========================================================================

hrLeaveEncashmentCompOffRouter.get("/transactions", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    assertAuthorizedWorkspaceAccess(profile);

    const result = await LeaveEncashmentCompOffService.listRequestsAndHistory(tenantId, profile, {
      tab: "HISTORY",
      type:
        req.query.type || req.query.transactionType
          ? String(req.query.type || req.query.transactionType)
          : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
      departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
      branchId: req.query.branchId ? String(req.query.branchId) : undefined,
      leaveTypeId: req.query.leaveTypeId ? String(req.query.leaveTypeId) : undefined,
      payrollPeriod: req.query.payrollPeriod ? String(req.query.payrollPeriod) : undefined,
      payrollMonth: req.query.payrollMonth ? String(req.query.payrollMonth) : undefined,
      payrollYear: req.query.payrollYear ? String(req.query.payrollYear) : undefined,
      startDate: req.query.startDate ? String(req.query.startDate) : undefined,
      endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 25,
      sortBy: req.query.sortBy ? String(req.query.sortBy) : "createdAt",
      sortOrder: req.query.sortOrder === "asc" ? "asc" : "desc",
    });
    return res.json(result);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
});

hrLeaveEncashmentCompOffRouter.get(
  "/transactions/export",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      assertAuthorizedWorkspaceAccess(profile);

      const resolvedType =
        req.query.type || req.query.transactionType
          ? String(req.query.type || req.query.transactionType)
          : undefined;

      if (String(req.query.format || "").toLowerCase() === "json") {
        const result = await LeaveEncashmentCompOffService.listRequestsAndHistory(
          tenantId,
          profile,
          {
            tab: "HISTORY",
            type: resolvedType,
            status: req.query.status ? String(req.query.status) : undefined,
            employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
            departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
            branchId: req.query.branchId ? String(req.query.branchId) : undefined,
            leaveTypeId: req.query.leaveTypeId ? String(req.query.leaveTypeId) : undefined,
            payrollPeriod: req.query.payrollPeriod ? String(req.query.payrollPeriod) : undefined,
            payrollMonth: req.query.payrollMonth ? String(req.query.payrollMonth) : undefined,
            payrollYear: req.query.payrollYear ? String(req.query.payrollYear) : undefined,
            startDate: req.query.startDate ? String(req.query.startDate) : undefined,
            endDate: req.query.endDate ? String(req.query.endDate) : undefined,
            search: req.query.search ? String(req.query.search) : undefined,
            page: 1,
            limit: 1000,
          }
        );
        return res.json(result);
      }

      const csv = await LeaveEncashmentCompOffService.exportTransactionsCsv(tenantId, profile, {
        tab: "HISTORY",
        type: resolvedType,
        status: req.query.status ? String(req.query.status) : undefined,
        employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
        branchId: req.query.branchId ? String(req.query.branchId) : undefined,
        leaveTypeId: req.query.leaveTypeId ? String(req.query.leaveTypeId) : undefined,
        payrollPeriod: req.query.payrollPeriod ? String(req.query.payrollPeriod) : undefined,
        payrollMonth: req.query.payrollMonth ? String(req.query.payrollMonth) : undefined,
        payrollYear: req.query.payrollYear ? String(req.query.payrollYear) : undefined,
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      });

      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="leave_encashment_compoff_transactions_${stamp}.csv"`
      );
      return res.send(csv);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.get(
  "/transactions/employee/:employeeId",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      assertAuthorizedWorkspaceAccess(profile);
      assertCanAccessEmployeeScope(profile, req.params.employeeId);

      const result = await LeaveEncashmentCompOffService.listRequestsAndHistory(
        tenantId,
        profile,
        {
          tab: "HISTORY",
          employeeId: req.params.employeeId,
          type: req.query.type ? String(req.query.type) : undefined,
          status: req.query.status ? String(req.query.status) : undefined,
          page: req.query.page ? Number(req.query.page) : 1,
          limit: req.query.limit ? Number(req.query.limit) : 25,
          sortBy: req.query.sortBy ? String(req.query.sortBy) : "createdAt",
          sortOrder: req.query.sortOrder === "asc" ? "asc" : "desc",
        }
      );
      return res.json(result);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.get(
  "/transactions/:id",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      assertAuthorizedWorkspaceAccess(profile);

      const detail = await LeaveEncashmentCompOffService.getTransactionDetail(
        tenantId,
        req.params.id,
        profile
      );
      return res.json(detail);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

// =========================================================================
// 4. MODULE D — TENANT CONFIGURATION CRUD (HR ADMIN RESTRICTED FOR MUTATIONS)
// =========================================================================

hrLeaveEncashmentCompOffRouter.get(
  "/configs/encashment",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      assertAuthorizedWorkspaceAccess(profile);

      const includeArchived = String(req.query.includeArchived || "true") !== "false";
      const configs = await LeaveEncashmentCompOffService.listEncashmentConfigs(
        tenantId,
        includeArchived
      );
      return res.json(configs);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.post(
  "/configs/encashment",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const created = await LeaveEncashmentCompOffService.createEncashmentConfig(
        tenantId,
        profile,
        req.body || {}
      );
      return res.status(201).json(created);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

async function handleUpdateEncashmentConfig(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    const updated = await LeaveEncashmentCompOffService.updateEncashmentConfig(
      tenantId,
      req.params.id,
      profile,
      req.body || {}
    );
    return res.json(updated);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
}

hrLeaveEncashmentCompOffRouter.put("/configs/encashment/:id", handleUpdateEncashmentConfig);
hrLeaveEncashmentCompOffRouter.patch("/configs/encashment/:id", handleUpdateEncashmentConfig);

hrLeaveEncashmentCompOffRouter.post(
  "/configs/encashment/:id/deactivate",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const updated = await LeaveEncashmentCompOffService.deactivateEncashmentConfig(
        tenantId,
        req.params.id,
        profile
      );
      return res.json(updated);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.get(
  "/configs/comp-off",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      assertAuthorizedWorkspaceAccess(profile);

      const includeArchived = String(req.query.includeArchived || "true") !== "false";
      const configs = await LeaveEncashmentCompOffService.listCompOffConfigs(
        tenantId,
        includeArchived
      );
      return res.json(configs);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

hrLeaveEncashmentCompOffRouter.post(
  "/configs/comp-off",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const created = await LeaveEncashmentCompOffService.createCompOffConfig(
        tenantId,
        profile,
        req.body || {}
      );
      return res.status(201).json(created);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);

async function handleUpdateCompOffConfig(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const profile = await resolveProfile(req);
    const updated = await LeaveEncashmentCompOffService.updateCompOffConfig(
      tenantId,
      req.params.id,
      profile,
      req.body || {}
    );
    return res.json(updated);
  } catch (err: any) {
    return sendRouteError(res, err);
  }
}

hrLeaveEncashmentCompOffRouter.put("/configs/comp-off/:id", handleUpdateCompOffConfig);
hrLeaveEncashmentCompOffRouter.patch("/configs/comp-off/:id", handleUpdateCompOffConfig);

hrLeaveEncashmentCompOffRouter.post(
  "/configs/comp-off/:id/deactivate",
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const profile = await resolveProfile(req);
      const updated = await LeaveEncashmentCompOffService.deactivateCompOffConfig(
        tenantId,
        req.params.id,
        profile
      );
      return res.json(updated);
    } catch (err: any) {
      return sendRouteError(res, err);
    }
  }
);
