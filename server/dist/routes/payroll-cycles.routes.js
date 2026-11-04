"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payrollCyclesRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const payroll_orchestrator_service_1 = require("../services/payroll-orchestrator.service");
exports.payrollCyclesRouter = (0, express_1.Router)();
// Enforce Request-Scoped Authentication and Tenant Context
exports.payrollCyclesRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * POST /api/payroll/cycles
 * Stage 1: Initialize Monthly Payroll Period
 * Role: Admin, HR Manager
 */
exports.payrollCyclesRouter.post("/", (0, auth_1.requireRole)("super_admin", "tenant_admin", "admin", "hr_manager", "hr_admin"), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        const { periodMonth, periodYear } = req.body;
        if (!periodMonth || !periodYear) {
            return res.status(400).json({ error: "periodMonth and periodYear are required." });
        }
        const result = await payroll_orchestrator_service_1.PayrollOrchestratorService.createPeriod(tenantId, Number(periodMonth), Number(periodYear), req.user?.id);
        return res.status(result.isNew ? 201 : 200).json({
            success: true,
            message: result.isNew
                ? "Payroll cycle successfully initialized in DRAFT state."
                : "Existing payroll cycle retrieved.",
            ...result,
        });
    }
    catch (err) {
        console.error("[PayrollCycles:Create]", err);
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});
/**
 * GET /api/payroll/cycles
 * List all payroll cycles for current tenant
 */
exports.payrollCyclesRouter.get("/", (0, auth_1.requireRole)("super_admin", "tenant_admin", "admin", "hr_manager", "hr_admin", "finance_manager", "finance_director", "finance_admin"), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        const year = req.query.year ? Number(req.query.year) : undefined;
        const status = req.query.status ? String(req.query.status) : undefined;
        const where = { tenantId };
        if (year)
            where.periodYear = year;
        if (status)
            where.approvalStatus = status;
        const cycles = await prisma_1.prisma.payrollRun.findMany({
            where,
            orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
            include: {
                _count: {
                    select: { payslips: true, snapshots: true },
                },
            },
        });
        return res.json({
            success: true,
            cycles: cycles.map((c) => ({
                id: c.id,
                periodMonth: c.periodMonth,
                periodYear: c.periodYear,
                periodDisplay: `${String(c.periodMonth).padStart(2, "0")}/${c.periodYear}`,
                state: c.approvalStatus,
                status: c.status,
                headcount: c.employeeCount,
                totalGross: Number(c.totalAmount || 0),
                totalNet: Number(c.totalNet || 0),
                totalDeductions: Number(c.totalDeductions || 0),
                approvedBy: c.approvedBy,
                approvedAt: c.approvedAt,
                isPublished: c.isPublished,
                createdAt: c.createdAt,
            })),
        });
    }
    catch (err) {
        console.error("[PayrollCycles:List]", err);
        return res.status(500).json({ error: err.message });
    }
});
/**
 * GET /api/payroll/cycles/:id
 * Retrieve cycle detail with 16-stage lifecycle progress
 */
exports.payrollCyclesRouter.get("/:id", (0, auth_1.requireRole)("super_admin", "tenant_admin", "admin", "hr_manager", "hr_admin", "finance_manager", "finance_director", "finance_admin"), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const run = await prisma_1.prisma.payrollRun.findUnique({
            where: { id: req.params.id },
            include: {
                _count: {
                    select: { payslips: true, snapshots: true },
                },
            },
        });
        if (!run || run.tenantId !== tenantId) {
            return res.status(404).json({ error: "Payroll cycle not found." });
        }
        // Build 16-stage status indicators
        const state = run.approvalStatus;
        const stages = [
            { stage: 1, name: "Period Creation", status: "COMPLETED" },
            { stage: 2, name: "Employee Eligibility", status: run.employeeCount > 0 ? "COMPLETED" : "IN_PROGRESS" },
            { stage: 3, name: "Attendance Lock", status: ["DRAFT"].includes(state) ? "PENDING" : "COMPLETED" },
            { stage: 4, name: "Leave & LOP Reconciliation", status: ["DRAFT"].includes(state) ? "PENDING" : "COMPLETED" },
            { stage: 5, name: "Overtime Authorization", status: ["DRAFT", "ATTENDANCE_LOCKED"].includes(state) ? "PENDING" : "COMPLETED" },
            { stage: 6, name: "Salary Resolution", status: ["DRAFT", "ATTENDANCE_LOCKED"].includes(state) ? "PENDING" : "COMPLETED" },
            { stage: 7, name: "Earnings Computation", status: ["DRAFT", "ATTENDANCE_LOCKED"].includes(state) ? "PENDING" : "COMPLETED" },
            { stage: 8, name: "Statutory Deductions", status: ["DRAFT", "ATTENDANCE_LOCKED"].includes(state) ? "PENDING" : "COMPLETED" },
            { stage: 9, name: "Projected Tax (TDS)", status: ["DRAFT", "ATTENDANCE_LOCKED"].includes(state) ? "PENDING" : "COMPLETED" },
            { stage: 10, name: "Loan Deductions", status: ["DRAFT", "ATTENDANCE_LOCKED"].includes(state) ? "PENDING" : "COMPLETED" },
            {
                stage: 11,
                name: "Pre-Run Variance Gate",
                status: ["DRAFT", "ATTENDANCE_LOCKED"].includes(state)
                    ? "PENDING"
                    : state === "CALCULATED"
                        ? "BLOCKED"
                        : "PASSED",
            },
            {
                stage: 12,
                name: "Dual Governance Approval",
                status: ["APPROVED", "FINALIZING", "OUTPUTS_GENERATED", "CLOSED"].includes(state)
                    ? "APPROVED"
                    : state === "UNDER_REVIEW"
                        ? "UNDER_REVIEW"
                        : "PENDING",
            },
            {
                stage: 13,
                name: "Ledger Posting & Immutability",
                status: ["OUTPUTS_GENERATED", "CLOSED"].includes(state) ? "COMPLETED" : "PENDING",
            },
            {
                stage: 14,
                name: "Statutory Registers (U, V, W, X, S)",
                status: ["OUTPUTS_GENERATED", "CLOSED"].includes(state) ? "COMPLETED" : "PENDING",
            },
            {
                stage: 15,
                name: "Client Invoicing (Workstream B)",
                status: ["OUTPUTS_GENERATED", "CLOSED"].includes(state) ? "COMPLETED" : "PENDING",
            },
            {
                stage: 16,
                name: "Bank Advice & ESS Payslips",
                status: state === "CLOSED" ? "COMPLETED" : "PENDING",
            },
        ];
        return res.json({
            success: true,
            cycle: {
                id: run.id,
                periodMonth: run.periodMonth,
                periodYear: run.periodYear,
                periodDisplay: `${String(run.periodMonth).padStart(2, "0")}/${run.periodYear}`,
                state: run.approvalStatus,
                status: run.status,
                headcount: run.employeeCount,
                totalGross: Number(run.totalAmount || 0),
                totalNet: Number(run.totalNet || 0),
                totalDeductions: Number(run.totalDeductions || 0),
                approvedBy: run.approvedBy,
                approvedAt: run.approvedAt,
                processedAt: run.processedAt,
                isPublished: run.isPublished,
                publishedAt: run.publishedAt,
                varianceSummary: run.varianceSummary,
                statutoryManifest: run.statutoryManifest,
                stages,
            },
        });
    }
    catch (err) {
        console.error("[PayrollCycles:Get]", err);
        return res.status(500).json({ error: err.message });
    }
});
/**
 * POST /api/payroll/cycles/:id/lock-attendance
 * Stages 3 & 4: Lock attendance and leave ledger
 */
exports.payrollCyclesRouter.post("/:id/lock-attendance", (0, auth_1.requireRole)("super_admin", "tenant_admin", "admin", "hr_manager", "hr_admin"), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const result = await payroll_orchestrator_service_1.PayrollOrchestratorService.lockAttendance(tenantId, req.params.id, req.user?.id || "SYSTEM", req.body?.notes);
        return res.json({
            success: true,
            message: "Attendance locked successfully. Ready for calculation.",
            ...result,
        });
    }
    catch (err) {
        console.error("[PayrollCycles:LockAttendance]", err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
});
/**
 * POST /api/payroll/cycles/:id/calculate
 * Stages 5 to 10 + 11: Execute batch payroll calculation
 */
exports.payrollCyclesRouter.post("/:id/calculate", (0, auth_1.requireRole)("super_admin", "tenant_admin", "admin", "hr_manager", "hr_admin"), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const result = await payroll_orchestrator_service_1.PayrollOrchestratorService.calculatePayroll(tenantId, req.params.id, req.user?.id || "SYSTEM", {
            lopOverrides: req.body?.lopOverrides,
            overtimeHours: req.body?.overtimeHours,
        });
        return res.json({
            success: true,
            message: result.state === "PREVIEW_READY"
                ? "Payroll calculation passed pre-run variance gate. Ready for HR review."
                : "Payroll calculated with blocking validation findings. Remediation required.",
            ...result,
        });
    }
    catch (err) {
        console.error("[PayrollCycles:Calculate]", err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
});
/**
 * GET /api/payroll/cycles/:id/variance
 * Stage 11: Pre-run Variance & Anomaly Validation Report
 */
exports.payrollCyclesRouter.get("/:id/variance", (0, auth_1.requireRole)("super_admin", "tenant_admin", "admin", "hr_manager", "hr_admin", "finance_manager", "finance_director", "finance_admin"), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const report = await payroll_orchestrator_service_1.PayrollOrchestratorService.evaluatePreRunVariance(tenantId, req.params.id);
        return res.json({
            success: true,
            report,
        });
    }
    catch (err) {
        console.error("[PayrollCycles:Variance]", err);
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});
/**
 * PATCH /api/payroll/cycles/:id/submit-review
 * Stage 12a: HR Manager submits for Finance approval
 */
exports.payrollCyclesRouter.patch("/:id/submit-review", (0, auth_1.requireRole)("super_admin", "tenant_admin", "admin", "hr_manager", "hr_admin"), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const actor = {
            id: req.user?.id || "USER_UNKNOWN",
            email: req.user?.email || "hr@company.com",
            role: req.user?.role || req.user?.roles?.[0] || "hr_manager",
        };
        const updated = await payroll_orchestrator_service_1.PayrollOrchestratorService.submitForReview(tenantId, req.params.id, actor, req.body?.comments, {
            allowBlockerOverride: req.body?.allowBlockerOverride,
            approvedExceptions: req.body?.approvedExceptions,
        });
        return res.json({
            success: true,
            message: "Payroll cycle successfully submitted for Finance authorization.",
            cycle: updated,
        });
    }
    catch (err) {
        console.error("[PayrollCycles:SubmitReview]", err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
});
/**
 * PATCH /api/payroll/cycles/:id/approve
 * Stage 12b: Finance Director / CFO authorization
 * Anti-Collusion: Submitter cannot approve!
 */
exports.payrollCyclesRouter.patch("/:id/approve", (0, auth_1.requireRole)("super_admin", "tenant_admin", "finance_director", "finance_admin", "finance_manager"), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const actor = {
            id: req.user?.id || "USER_UNKNOWN",
            email: req.user?.email || "finance@company.com",
            role: req.user?.role || req.user?.roles?.[0] || "finance_director",
        };
        const updated = await payroll_orchestrator_service_1.PayrollOrchestratorService.approvePayroll(tenantId, req.params.id, actor, req.body?.notes);
        return res.json({
            success: true,
            message: "Payroll cycle approved. Authorized for finalization & ledger posting.",
            cycle: updated,
        });
    }
    catch (err) {
        console.error("[PayrollCycles:Approve]", err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
});
/**
 * PATCH /api/payroll/cycles/:id/reject
 * Stage 12 Rejection: Rejects cycle from UNDER_REVIEW back to DRAFT with reason
 */
exports.payrollCyclesRouter.patch("/:id/reject", (0, auth_1.requireRole)("super_admin", "tenant_admin", "finance_director", "finance_admin", "finance_manager", "hr_manager"), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const actor = {
            id: req.user?.id || "USER_UNKNOWN",
            email: req.user?.email || "reviewer@company.com",
            role: req.user?.role || req.user?.roles?.[0] || "finance_director",
        };
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ error: "Rejection reason is mandatory." });
        }
        const updated = await payroll_orchestrator_service_1.PayrollOrchestratorService.rejectPayroll(tenantId, req.params.id, actor, reason);
        return res.json({
            success: true,
            message: "Payroll cycle rejected and returned to DRAFT state for remediation.",
            cycle: updated,
        });
    }
    catch (err) {
        console.error("[PayrollCycles:Reject]", err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
});
/**
 * POST /api/payroll/cycles/:id/recover
 * AUD-CONC-002 Crash Recovery: Safely recovers a payroll cycle stuck in FINALIZING state.
 * Roles: super_admin, tenant_admin, finance_director, finance_admin
 */
exports.payrollCyclesRouter.post("/:id/recover", (0, auth_1.requireRole)("super_admin", "tenant_admin", "finance_director", "finance_admin"), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const actor = {
            id: req.user?.id || "USER_UNKNOWN",
            email: req.user?.email || "finance@company.com",
            role: req.user?.role || req.user?.roles?.[0] || "finance_director",
        };
        const result = await payroll_orchestrator_service_1.PayrollOrchestratorService.recoverPayrollCycle(tenantId, req.params.id, actor, {
            staleThresholdMinutes: req.body?.staleThresholdMinutes ? Number(req.body.staleThresholdMinutes) : undefined,
            force: Boolean(req.body?.force),
        });
        return res.json({
            success: true,
            ...result,
        });
    }
    catch (err) {
        console.error("[PayrollCycles:Recover]", err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
});
/**
 * POST /api/payroll/cycles/:id/finalize
 * Stage 13: Finalize, Post to Ledger, Lock Snapshots, Emit Stages 14-16 Outputs
 */
exports.payrollCyclesRouter.post("/:id/finalize", (0, auth_1.requireRole)("super_admin", "tenant_admin", "finance_director", "finance_admin"), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const actor = {
            id: req.user?.id || "USER_UNKNOWN",
            email: req.user?.email || "finance@company.com",
            role: req.user?.role || req.user?.roles?.[0] || "finance_director",
        };
        const result = await payroll_orchestrator_service_1.PayrollOrchestratorService.finalizePayroll(tenantId, req.params.id, actor);
        return res.json({
            success: true,
            message: "Payroll cycle successfully finalized, posted to General Ledger, and outputs generated.",
            ...result,
        });
    }
    catch (err) {
        console.error("[PayrollCycles:Finalize]", err);
        return res.status(err.statusCode || 400).json({ error: err.message });
    }
});
/**
 * GET /api/payroll/cycles/:id/outputs
 * Stages 14-16: Get status and download metadata of outputs
 */
exports.payrollCyclesRouter.get("/:id/outputs", (0, auth_1.requireRole)("super_admin", "tenant_admin", "admin", "hr_manager", "hr_admin", "finance_manager", "finance_director", "finance_admin"), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const run = await prisma_1.prisma.payrollRun.findUnique({
            where: { id: req.params.id },
        });
        if (!run || run.tenantId !== tenantId) {
            return res.status(404).json({ error: "Payroll cycle not found." });
        }
        const manifest = run.statutoryManifest || {};
        return res.json({
            success: true,
            cycleId: run.id,
            state: run.approvalStatus,
            cryptographicHash: manifest.cryptographicHash || null,
            statutoryRegisters: {
                available: ["FORM_U", "FORM_V", "FORM_W", "FORM_X", "FORM_S"],
                downloadBundleUrl: `/api/payroll/statutory-registers/bundle?runId=${run.id}`,
            },
            clientBilling: {
                invoicesGenerated: manifest.outputs?.clientBilling?.invoicesCreated || 0,
                invoices: manifest.outputs?.clientBilling?.invoices || [],
            },
            bankDisbursement: {
                disbursementAdviceUrl: `/api/payroll/cycles/${run.id}/bank-export`,
                totalAmount: Number(run.totalNet || 0),
                headcount: run.employeeCount,
            },
            essPayslips: {
                isPublished: run.isPublished,
                publishedAt: run.publishedAt,
                publishedBy: run.publishedBy,
            },
        });
    }
    catch (err) {
        console.error("[PayrollCycles:Outputs]", err);
        return res.status(500).json({ error: err.message });
    }
});
/**
 * GET /api/payroll/cycles/:id/bank-export
 * Stage 16: Download Bank Payment Advice (CSV format)
 */
exports.payrollCyclesRouter.get("/:id/bank-export", (0, auth_1.requireRole)("super_admin", "tenant_admin", "admin", "finance_manager", "finance_director", "finance_admin"), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: "Tenant context is required." });
        const isMasked = req.query.masked === "true";
        const exportData = await payroll_orchestrator_service_1.PayrollOrchestratorService.generateBankDisbursementExport(tenantId, req.params.id, { masked: isMasked });
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="Bank_Advice_${req.params.id}_${isMasked ? "masked" : "final"}.csv"`);
        return res.send(exportData.csvContent);
    }
    catch (err) {
        console.error("[PayrollCycles:BankExport]", err);
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});
