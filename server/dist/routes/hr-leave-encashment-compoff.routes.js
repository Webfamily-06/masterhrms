"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrLeaveEncashmentCompOffRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const leave_service_1 = require("../services/leave.service");
const leave_encashment_compoff_service_1 = require("../services/leave-encashment-compoff.service");
exports.hrLeaveEncashmentCompOffRouter = (0, express_1.Router)();
exports.hrLeaveEncashmentCompOffRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
function sendRouteError(res, err, fallbackStatus = 500) {
    if (err?.code === "PERIOD_LOCKED") {
        return res.status(423).json({ error: err.message, code: "PERIOD_LOCKED" });
    }
    if (err instanceof leave_service_1.LeaveHttpError || typeof err?.status === "number") {
        return res.status(err.status || 400).json({
            error: err.message,
            ...(err.code ? { code: err.code } : {}),
            ...(err.details ? { details: err.details, ...err.details } : {}),
        });
    }
    return res.status(fallbackStatus).json({ error: err?.message || "Internal server error" });
}
async function resolveProfile(req) {
    const tenantId = req.tenantId;
    return leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.resolveCallerProfile(tenantId, {
        userId: req.user.userId,
        email: req.user?.email || null,
        roles: req.user?.roles || [],
        permissions: req.user?.permissions || [],
    });
}
function assertAuthorizedWorkspaceAccess(profile) {
    const hasAccess = profile.isHrAdmin ||
        profile.isHrManager ||
        profile.isPayrollRole ||
        profile.isReportingManager ||
        Boolean(profile.employeeId) ||
        profile.permissions.some((p) => p === "*" ||
            p.startsWith("hrm.leave.") ||
            p.startsWith("payroll.") ||
            p.startsWith("hrm.payroll."));
    if (!hasAccess) {
        throw new leave_service_1.LeaveHttpError("Forbidden: Insufficient permissions to access Leave Encashment & Comp-Off.", 403, "FORBIDDEN");
    }
}
function assertCanAccessEmployeeScope(profile, targetEmployeeId) {
    if (profile.isHrAdmin || profile.isHrManager || profile.isPayrollRole)
        return;
    if (profile.employeeId && profile.employeeId === targetEmployeeId)
        return;
    if (profile.directReportIds.includes(targetEmployeeId))
        return;
    throw new leave_service_1.LeaveHttpError("Forbidden: You do not have organizational access to this employee record.", 403, "EMPLOYEE_SCOPE_FORBIDDEN");
}
// =========================================================================
// 0. DYNAMIC FILTER METADATA, AGGREGATE SUMMARY & BACKWARD COMPATIBILITY
// =========================================================================
exports.hrLeaveEncashmentCompOffRouter.get("/metadata", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const meta = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.getDynamicFilterMetadata(tenantId, profile);
        return res.json(meta);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.get("/summary", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const summary = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.getSummaryAggregates(tenantId, profile);
        return res.json(summary);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
// Backward-compatible root list endpoint (/api/v1/hr/leave/encashment-compoff)
exports.hrLeaveEncashmentCompOffRouter.get("/", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const result = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.listRequestsAndHistory(tenantId, profile, {
            tab: req.query.tab || "HISTORY",
            type: req.query.type || req.query.transactionType
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
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
// Backward-compatible action endpoint (/api/v1/hr/leave/encashment-compoff/:id/action)
exports.hrLeaveEncashmentCompOffRouter.post("/:id/action", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const { id } = req.params;
        const { action, comments, approvedDays } = req.body || {};
        const rec = await prisma_1.rawPrisma.leaveEncashmentRequest.findFirst({
            where: { id, tenantId },
            select: { id: true, type: true },
        });
        if (!rec) {
            return res.status(404).json({ error: "Request not found." });
        }
        if (rec.type === "COMP_OFF") {
            const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.decideCompOffRequest(tenantId, id, profile, {
                action: action === "reject" ? "reject" : "approve",
                comments,
                approvedDays: approvedDays !== undefined ? Number(approvedDays) : undefined,
            });
            return res.json(updated);
        }
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.decideEncashmentRequest(tenantId, id, profile, {
            action: action === "reject"
                ? "reject"
                : action === "request_clarification"
                    ? "request_clarification"
                    : "approve",
            comments,
            approvedDays: approvedDays !== undefined ? Number(approvedDays) : undefined,
        });
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
// =========================================================================
// 1. MODULE A — LEAVE ENCASHMENT ENDPOINTS
// =========================================================================
exports.hrLeaveEncashmentCompOffRouter.get("/encashments", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const result = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.listRequestsAndHistory(tenantId, profile, {
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
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
async function handleEncashmentEligibility(req, res) {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const employeeId = String(req.query.employeeId || profile.employeeId || "").trim();
        if (!employeeId) {
            return res.status(400).json({ error: "employeeId is required." });
        }
        assertCanAccessEmployeeScope(profile, employeeId);
        const effectiveDate = req.query.effectiveDate ? String(req.query.effectiveDate) : undefined;
        const eligibility = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.getEncashmentEligibilityForEmployee(tenantId, employeeId, effectiveDate);
        return res.json(eligibility);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
}
exports.hrLeaveEncashmentCompOffRouter.get("/encashments/eligibility", handleEncashmentEligibility);
exports.hrLeaveEncashmentCompOffRouter.get("/encashments/eligible-types", handleEncashmentEligibility);
exports.hrLeaveEncashmentCompOffRouter.post("/encashments/calculate-preview", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const employeeId = String(req.body?.employeeId || profile.employeeId || "").trim();
        const leaveTypeId = String(req.body?.leaveTypeId || "").trim();
        const requestedDays = Number(req.body?.requestedDays ?? req.body?.days ?? 0);
        if (!employeeId || !leaveTypeId) {
            return res.status(400).json({ error: "employeeId and leaveTypeId are required." });
        }
        assertCanAccessEmployeeScope(profile, employeeId);
        const preview = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.calculateEncashmentPreview(tenantId, {
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
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.post("/encashments", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        if (profile.isPayrollRole && !profile.isHrAdmin && !profile.isHrManager && req.body?.employeeId && req.body.employeeId !== profile.employeeId) {
            return res.status(403).json({
                error: "Forbidden: Payroll role cannot create encashment requests on behalf of other employees.",
                code: "FORBIDDEN",
            });
        }
        const created = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.createEncashmentRequest(tenantId, profile, {
            employeeId: req.body?.employeeId,
            leaveTypeId: req.body?.leaveTypeId,
            days: Number(req.body?.days ?? req.body?.requestedDays ?? 0),
            reason: req.body?.reason,
            effectiveDate: req.body?.effectiveDate,
            attachmentUrl: req.body?.attachmentUrl,
            submitAsDraft: Boolean(req.body?.submitAsDraft),
            idempotencyKey: req.body?.idempotencyKey || req.headers["idempotency-key"],
        });
        return res.status(201).json(created);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.get("/encashments/:id", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const detail = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.getTransactionDetail(tenantId, req.params.id, profile);
        if (detail.type !== "ENCASHMENT") {
            return res.status(404).json({ error: "Encashment request not found." });
        }
        return res.json(detail);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
async function handleUpdateEncashment(req, res) {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.updateEncashmentRequest(tenantId, req.params.id, profile, {
            leaveTypeId: req.body?.leaveTypeId,
            days: req.body?.days !== undefined
                ? Number(req.body.days)
                : req.body?.requestedDays !== undefined
                    ? Number(req.body.requestedDays)
                    : undefined,
            reason: req.body?.reason,
            effectiveDate: req.body?.effectiveDate,
            attachmentUrl: req.body?.attachmentUrl,
            submitNow: req.body?.submitNow,
        });
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
}
exports.hrLeaveEncashmentCompOffRouter.patch("/encashments/:id", handleUpdateEncashment);
exports.hrLeaveEncashmentCompOffRouter.put("/encashments/:id", handleUpdateEncashment);
exports.hrLeaveEncashmentCompOffRouter.post("/encashments/:id/decide", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const rawAction = String(req.body?.action || "approve").toLowerCase();
        const action = rawAction === "reject"
            ? "reject"
            : rawAction === "request_clarification" || rawAction === "clarify"
                ? "request_clarification"
                : "approve";
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.decideEncashmentRequest(tenantId, req.params.id, profile, {
            action,
            comments: req.body?.comments || req.body?.rejectionReason || req.body?.reason,
            approvedDays: req.body?.approvedDays !== undefined ? Number(req.body.approvedDays) : undefined,
        });
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.post("/encashments/:id/approve", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.decideEncashmentRequest(tenantId, req.params.id, profile, {
            action: "approve",
            comments: req.body?.comments,
            approvedDays: req.body?.approvedDays !== undefined ? Number(req.body.approvedDays) : undefined,
        });
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.post("/encashments/:id/reject", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.decideEncashmentRequest(tenantId, req.params.id, profile, {
            action: "reject",
            comments: req.body?.comments || req.body?.reason,
        });
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.post("/encashments/:id/clarify", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.decideEncashmentRequest(tenantId, req.params.id, profile, {
            action: "request_clarification",
            comments: req.body?.comments || req.body?.note,
        });
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.post("/encashments/:id/cancel", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.cancelEncashmentRequest(tenantId, req.params.id, profile, req.body?.reason || req.body?.comments);
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.post("/encashments/:id/process-payroll", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.processEncashmentToPayroll(tenantId, req.params.id, profile, {
            payrollMonth: Number(req.body?.payrollMonth),
            payrollYear: Number(req.body?.payrollYear),
            payrollRunId: req.body?.payrollRunId,
            salaryComponentId: req.body?.salaryComponentId,
            allowControlledAdjustment: Boolean(req.body?.allowControlledAdjustment),
            notes: req.body?.notes,
        });
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
async function handleMarkEncashmentPayrollFailed(req, res) {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.markEncashmentPayrollFailed(tenantId, req.params.id, profile, req.body?.failureReason || req.body?.reason || "");
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
}
exports.hrLeaveEncashmentCompOffRouter.post("/encashments/:id/payroll-failed", handleMarkEncashmentPayrollFailed);
exports.hrLeaveEncashmentCompOffRouter.post("/encashments/:id/mark-payroll-failed", handleMarkEncashmentPayrollFailed);
async function handleReconcileEncashmentPaid(req, res) {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        if (!profile.isHrAdmin && !profile.isPayrollRole) {
            return res.status(403).json({
                error: "Forbidden: Only authorized Payroll Officers or HR Admins can reconcile paid status.",
                code: "UNAUTHORIZED_PAYROLL_PROCESSOR",
            });
        }
        // Prevent self-reconciliation
        const target = await prisma_1.rawPrisma.leaveEncashmentRequest.findFirst({
            where: { id: req.params.id, tenantId },
            include: { employee: true },
        });
        if (!target) {
            return res.status(404).json({ error: "Encashment request not found." });
        }
        if ((profile.employeeId && profile.employeeId === target.employeeId) ||
            (target.employee?.userId && target.employee.userId === profile.userId)) {
            return res.status(403).json({
                error: "Forbidden: You cannot mark your own encashment request as paid.",
                code: "SELF_APPROVAL_FORBIDDEN",
            });
        }
        const result = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.reconcileAndMarkPayrollPaid(tenantId, {
            requestId: req.params.id,
            payrollRunId: req.body?.payrollRunId,
            disbursementRef: req.body?.disbursementRef || req.body?.payrollRef || req.body?.payrollReference,
            actorUserId: profile.userId,
            actorEmail: profile.email,
        });
        return res.json(result.records[0] || result);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
}
exports.hrLeaveEncashmentCompOffRouter.post("/encashments/:id/mark-paid", handleReconcileEncashmentPaid);
exports.hrLeaveEncashmentCompOffRouter.post("/encashments/:id/reconcile-paid", handleReconcileEncashmentPaid);
exports.hrLeaveEncashmentCompOffRouter.get("/encashments/:id/payroll-status", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const status = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.getEncashmentPayrollStatus(tenantId, req.params.id, profile);
        return res.json(status);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.post("/encashments/:id/reverse", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const reversed = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.reverseTransaction(tenantId, req.params.id, profile, {
            reason: req.body?.reason || req.body?.comments || "",
            payrollRecoveryRef: req.body?.payrollRecoveryRef || req.body?.recoveryRef || undefined,
        });
        return res.json(reversed);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
// =========================================================================
// 2. MODULE B — COMP-OFF MANAGEMENT ENDPOINTS
// =========================================================================
exports.hrLeaveEncashmentCompOffRouter.get("/comp-offs", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        if (profile.isPayrollRole && !profile.isHrAdmin && !profile.isHrManager && !profile.isReportingManager) {
            return res.status(403).json({
                error: "Forbidden: Payroll role is restricted to Leave Encashment payroll processing.",
                code: "FORBIDDEN",
            });
        }
        const result = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.listRequestsAndHistory(tenantId, profile, {
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
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
async function handleVerifyOrPreviewCompOff(req, res, defaultWorkType) {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const employeeId = String(req.body?.employeeId || profile.employeeId || "").trim();
        const workedOnDate = String(req.body?.workedOnDate || req.body?.workDate || "").trim();
        if (!employeeId || !workedOnDate) {
            return res.status(400).json({ error: "employeeId and workedOnDate are required." });
        }
        assertCanAccessEmployeeScope(profile, employeeId);
        const verification = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.verifyAndPreviewCompOff(tenantId, {
            employeeId,
            workedOnDate,
            workType: req.body?.workType || defaultWorkType,
            attendanceId: req.body?.attendanceId || null,
            overtimeRequestId: req.body?.overtimeRequestId || null,
            actualHoursWorked: req.body?.actualHoursWorked !== undefined ? Number(req.body.actualHoursWorked) : undefined,
            requestedDays: req.body?.requestedDays !== undefined
                ? Number(req.body.requestedDays)
                : req.body?.days !== undefined
                    ? Number(req.body.days)
                    : undefined,
            excludeRequestId: req.body?.excludeRequestId,
        });
        return res.json(verification);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
}
exports.hrLeaveEncashmentCompOffRouter.post("/comp-offs/verify-eligibility", (req, res) => handleVerifyOrPreviewCompOff(req, res));
exports.hrLeaveEncashmentCompOffRouter.post("/comp-offs/verify-overtime", (req, res) => handleVerifyOrPreviewCompOff(req, res, "OVERTIME"));
exports.hrLeaveEncashmentCompOffRouter.post("/comp-offs/preview-credit", (req, res) => handleVerifyOrPreviewCompOff(req, res));
exports.hrLeaveEncashmentCompOffRouter.post("/comp-offs", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        if (profile.isPayrollRole && !profile.isHrAdmin && !profile.isHrManager) {
            return res.status(403).json({
                error: "Forbidden: Payroll role cannot submit Comp-Off requests.",
                code: "FORBIDDEN",
            });
        }
        const created = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.createCompOffRequest(tenantId, profile, {
            employeeId: req.body?.employeeId,
            leaveTypeId: req.body?.leaveTypeId,
            workedOnDate: req.body?.workedOnDate || req.body?.workDate,
            workType: req.body?.workType,
            attendanceId: req.body?.attendanceId,
            overtimeRequestId: req.body?.overtimeRequestId,
            actualHoursWorked: req.body?.actualHoursWorked !== undefined ? Number(req.body.actualHoursWorked) : undefined,
            requestedDays: req.body?.requestedDays !== undefined
                ? Number(req.body.requestedDays)
                : req.body?.days !== undefined
                    ? Number(req.body.days)
                    : undefined,
            reason: req.body?.reason,
            attachmentUrl: req.body?.attachmentUrl,
            managerEmployeeId: req.body?.managerEmployeeId,
            submitAsDraft: Boolean(req.body?.submitAsDraft),
            idempotencyKey: req.body?.idempotencyKey || req.headers["idempotency-key"],
        });
        return res.status(201).json(created);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.get("/comp-offs/balance", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const employeeId = String(req.query.employeeId || profile.employeeId || "").trim();
        if (!employeeId) {
            return res.status(400).json({ error: "employeeId is required." });
        }
        assertCanAccessEmployeeScope(profile, employeeId);
        const bal = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.getCompOffBalanceAndExpiringLots(tenantId, employeeId, req.query.warningDays ? Number(req.query.warningDays) : 14);
        return res.json(bal);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.get("/comp-offs/expiring", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const warningDays = Math.min(90, Math.max(1, Number(req.query.warningDays || 14)));
        const employeeId = req.query.employeeId ? String(req.query.employeeId).trim() : null;
        if (employeeId) {
            assertCanAccessEmployeeScope(profile, employeeId);
            const bal = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.getCompOffBalanceAndExpiringLots(tenantId, employeeId, warningDays);
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
        const scopeFilter = {};
        if (!profile.isHrAdmin && !profile.isHrManager) {
            const ids = [
                ...(profile.employeeId ? [profile.employeeId] : []),
                ...profile.directReportIds,
            ];
            scopeFilter.employeeId = { in: ids };
        }
        const lots = await prisma_1.rawPrisma.leaveEncashmentRequest.findMany({
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
        const totalExpiringSoonDays = lots.reduce((sum, l) => sum + Number(l.remainingDays || 0), 0);
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
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
async function handleProcessCompOffExpirySweep(req, res) {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        if (!profile.isHrAdmin) {
            return res.status(403).json({
                error: "Forbidden: Only HR Administrators can manually trigger Comp-Off expiry processing.",
                code: "HR_ADMIN_REQUIRED",
            });
        }
        const refDate = req.body?.referenceDate ? new Date(req.body.referenceDate) : undefined;
        const summary = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.processTenantCompOffExpiry(tenantId, {
            referenceDate: refDate,
            actorUserId: profile.userId,
            actorEmail: profile.email,
        });
        return res.json(summary);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
}
exports.hrLeaveEncashmentCompOffRouter.post("/comp-offs/process-expiry", handleProcessCompOffExpirySweep);
exports.hrLeaveEncashmentCompOffRouter.post("/comp-offs/run-expiry-sweep", handleProcessCompOffExpirySweep);
exports.hrLeaveEncashmentCompOffRouter.get("/comp-offs/:id", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const detail = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.getTransactionDetail(tenantId, req.params.id, profile);
        if (detail.type !== "COMP_OFF") {
            return res.status(404).json({ error: "Comp-Off request not found." });
        }
        return res.json(detail);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
async function handleUpdateCompOff(req, res) {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.updateCompOffRequest(tenantId, req.params.id, profile, {
            workedOnDate: req.body?.workedOnDate || req.body?.workDate,
            workType: req.body?.workType,
            attendanceId: req.body?.attendanceId,
            overtimeRequestId: req.body?.overtimeRequestId,
            actualHoursWorked: req.body?.actualHoursWorked !== undefined
                ? Number(req.body.actualHoursWorked)
                : undefined,
            requestedDays: req.body?.requestedDays !== undefined
                ? Number(req.body.requestedDays)
                : req.body?.days !== undefined
                    ? Number(req.body.days)
                    : undefined,
            reason: req.body?.reason,
            attachmentUrl: req.body?.attachmentUrl,
            submitNow: req.body?.submitNow,
        });
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
}
exports.hrLeaveEncashmentCompOffRouter.patch("/comp-offs/:id", handleUpdateCompOff);
exports.hrLeaveEncashmentCompOffRouter.put("/comp-offs/:id", handleUpdateCompOff);
exports.hrLeaveEncashmentCompOffRouter.post("/comp-offs/:id/decide", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const action = String(req.body?.action || "approve").toLowerCase() === "reject" ? "reject" : "approve";
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.decideCompOffRequest(tenantId, req.params.id, profile, {
            action,
            comments: req.body?.comments || req.body?.rejectionReason || req.body?.reason,
            approvedDays: req.body?.approvedDays !== undefined ? Number(req.body.approvedDays) : undefined,
        });
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.post("/comp-offs/:id/approve", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.decideCompOffRequest(tenantId, req.params.id, profile, {
            action: "approve",
            comments: req.body?.comments,
            approvedDays: req.body?.approvedDays !== undefined ? Number(req.body.approvedDays) : undefined,
        });
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.post("/comp-offs/:id/reject", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.decideCompOffRequest(tenantId, req.params.id, profile, {
            action: "reject",
            comments: req.body?.comments || req.body?.reason,
        });
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.post("/comp-offs/:id/credit", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const credited = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.creditApprovedCompOff(tenantId, req.params.id, profile);
        return res.json(credited);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.post("/comp-offs/:id/cancel", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const cancelled = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.cancelCompOffRequest(tenantId, req.params.id, profile, req.body?.reason || req.body?.comments);
        return res.json(cancelled);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.post("/comp-offs/:id/reverse", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const reversed = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.reverseTransaction(tenantId, req.params.id, profile, {
            reason: req.body?.reason || req.body?.comments || "",
            payrollRecoveryRef: req.body?.payrollRecoveryRef || req.body?.recoveryRef || undefined,
        });
        return res.json(reversed);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
// =========================================================================
// 3. MODULE C — UNIFIED TRANSACTION HISTORY & EXPORT
// =========================================================================
exports.hrLeaveEncashmentCompOffRouter.get("/transactions", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const result = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.listRequestsAndHistory(tenantId, profile, {
            tab: "HISTORY",
            type: req.query.type || req.query.transactionType
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
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.get("/transactions/export", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const resolvedType = req.query.type || req.query.transactionType
            ? String(req.query.type || req.query.transactionType)
            : undefined;
        if (String(req.query.format || "").toLowerCase() === "json") {
            const result = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.listRequestsAndHistory(tenantId, profile, {
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
            });
            return res.json(result);
        }
        const csv = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.exportTransactionsCsv(tenantId, profile, {
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
        res.setHeader("Content-Disposition", `attachment; filename="leave_encashment_compoff_transactions_${stamp}.csv"`);
        return res.send(csv);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.get("/transactions/employee/:employeeId", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        assertCanAccessEmployeeScope(profile, req.params.employeeId);
        const result = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.listRequestsAndHistory(tenantId, profile, {
            tab: "HISTORY",
            employeeId: req.params.employeeId,
            type: req.query.type ? String(req.query.type) : undefined,
            status: req.query.status ? String(req.query.status) : undefined,
            page: req.query.page ? Number(req.query.page) : 1,
            limit: req.query.limit ? Number(req.query.limit) : 25,
            sortBy: req.query.sortBy ? String(req.query.sortBy) : "createdAt",
            sortOrder: req.query.sortOrder === "asc" ? "asc" : "desc",
        });
        return res.json(result);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.get("/transactions/:id", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const detail = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.getTransactionDetail(tenantId, req.params.id, profile);
        return res.json(detail);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
// =========================================================================
// 4. MODULE D — TENANT CONFIGURATION CRUD (HR ADMIN RESTRICTED FOR MUTATIONS)
// =========================================================================
exports.hrLeaveEncashmentCompOffRouter.get("/configs/encashment", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const includeArchived = String(req.query.includeArchived || "true") !== "false";
        const configs = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.listEncashmentConfigs(tenantId, includeArchived);
        return res.json(configs);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.post("/configs/encashment", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const created = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.createEncashmentConfig(tenantId, profile, req.body || {});
        return res.status(201).json(created);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
async function handleUpdateEncashmentConfig(req, res) {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.updateEncashmentConfig(tenantId, req.params.id, profile, req.body || {});
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
}
exports.hrLeaveEncashmentCompOffRouter.put("/configs/encashment/:id", handleUpdateEncashmentConfig);
exports.hrLeaveEncashmentCompOffRouter.patch("/configs/encashment/:id", handleUpdateEncashmentConfig);
exports.hrLeaveEncashmentCompOffRouter.post("/configs/encashment/:id/deactivate", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.deactivateEncashmentConfig(tenantId, req.params.id, profile);
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.get("/configs/comp-off", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        assertAuthorizedWorkspaceAccess(profile);
        const includeArchived = String(req.query.includeArchived || "true") !== "false";
        const configs = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.listCompOffConfigs(tenantId, includeArchived);
        return res.json(configs);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
exports.hrLeaveEncashmentCompOffRouter.post("/configs/comp-off", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const created = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.createCompOffConfig(tenantId, profile, req.body || {});
        return res.status(201).json(created);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
async function handleUpdateCompOffConfig(req, res) {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.updateCompOffConfig(tenantId, req.params.id, profile, req.body || {});
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
}
exports.hrLeaveEncashmentCompOffRouter.put("/configs/comp-off/:id", handleUpdateCompOffConfig);
exports.hrLeaveEncashmentCompOffRouter.patch("/configs/comp-off/:id", handleUpdateCompOffConfig);
exports.hrLeaveEncashmentCompOffRouter.post("/configs/comp-off/:id/deactivate", async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const profile = await resolveProfile(req);
        const updated = await leave_encashment_compoff_service_1.LeaveEncashmentCompOffService.deactivateCompOffConfig(tenantId, req.params.id, profile);
        return res.json(updated);
    }
    catch (err) {
        return sendRouteError(res, err);
    }
});
