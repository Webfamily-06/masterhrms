"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrPayrollRouter = void 0;
const express_1 = require("express");
const decimal_js_1 = __importDefault(require("decimal.js"));
const tenant_context_1 = require("../context/tenant-context");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const audit_service_1 = require("../services/audit.service");
const outbox_service_1 = require("../services/outbox.service");
const socket_1 = require("../socket");
const loan_service_1 = require("../services/loan.service");
const payroll_attendance_service_1 = require("../services/payroll-attendance.service");
const payroll_engine_service_1 = require("../services/payroll-engine.service");
const evaluator_1 = require("../services/formula-engine/evaluator");
const jurisdictions_1 = require("../constants/jurisdictions");
const statutory_rule_registry_service_1 = require("../services/statutory-rule-registry.service");
const statutory_amendment_ingestion_service_1 = require("../services/statutory-amendment-ingestion.service");
exports.hrPayrollRouter = (0, express_1.Router)();
// Apply Auth & Tenant Context to all HR Payroll Endpoints
exports.hrPayrollRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
// =========================================================================
// 1. PAYROLL RUNS LIFECYCLE (HR-PAY-02)
// =========================================================================
/**
 * GET /runs — List payroll runs
 */
exports.hrPayrollRouter.get("/runs", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const db = (0, tenant_context_1.getTenantDb)();
        const runs = await db.payrollRun.findMany({
            where: { tenantId },
            orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
            include: {
                _count: {
                    select: { payslips: true, snapshots: true },
                },
            },
        });
        return res.json({ runs });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * POST /runs — Initialize a new payroll run for a period
 */
exports.hrPayrollRouter.post("/runs", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const { periodMonth, periodYear } = req.body;
        if (!periodMonth || !periodYear) {
            return res.status(400).json({ error: "periodMonth and periodYear are required" });
        }
        const db = (0, tenant_context_1.getTenantDb)();
        // Check if run already exists for period
        const existing = await db.payrollRun.findFirst({
            where: { tenantId, periodMonth: Number(periodMonth), periodYear: Number(periodYear) },
        });
        if (existing) {
            return res.status(409).json({ error: `Payroll run already exists for ${periodMonth}/${periodYear}`, run: existing });
        }
        const run = await db.payrollRun.create({
            data: {
                tenantId,
                periodMonth: Number(periodMonth),
                periodYear: Number(periodYear),
                approvalStatus: "draft",
                status: "draft",
            },
        });
        await audit_service_1.AuditService.log({
            tenantId,
            actorId,
            action: "PAYROLL_RUN_CREATED",
            resourceType: "PayrollRun",
            resourceId: run.id,
            details: { periodMonth, periodYear },
        });
        return res.status(201).json({ run });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * POST /runs/:id/calculate — Execute batch payroll calculation
 */
exports.hrPayrollRouter.post("/runs/:id/calculate", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const runId = req.params.id;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const db = (0, tenant_context_1.getTenantDb)();
        const run = await db.payrollRun.findFirst({
            where: { id: runId, tenantId },
        });
        if (!run)
            return res.status(404).json({ error: "Payroll run not found" });
        if (run.approvalStatus === "approved" || run.approvalStatus === "finalized" || run.isPublished) {
            return res.status(400).json({ error: "Cannot recalculate an approved or published payroll run." });
        }
        const attendanceService = new payroll_attendance_service_1.PayrollAttendanceService(db);
        const attendanceMap = await attendanceService.computeTenantAttendance(tenantId, {
            periodMonth: run.periodMonth,
            periodYear: run.periodYear,
        });
        // Fetch active employees with current salary assignments
        const employees = await db.employee.findMany({
            where: { tenantId, status: "active" },
            include: {
                salaryAssignments: {
                    where: { isCurrent: true },
                    include: {
                        items: { include: { component: true } },
                    },
                    take: 1,
                },
                department: true,
            },
        });
        // Fetch active expense claims to be reimbursed via payroll
        const approvedClaims = await db.expenseClaim.findMany({
            where: {
                tenantId,
                status: "finance_approved",
                reimbursementMethod: "payroll_addition",
            },
        });
        let totalGrossAmount = new decimal_js_1.default(0);
        let totalDeductionsAmount = new decimal_js_1.default(0);
        let totalNetAmount = new decimal_js_1.default(0);
        let processedEmployeeCount = 0;
        // Execute in transaction
        await db.$transaction(async (tx) => {
            // Clear previous draft snapshots and payslips for this run
            await tx.payrollSnapshot.deleteMany({ where: { payrollRunId: run.id, tenantId } });
            await tx.payslip.deleteMany({ where: { payrollRunId: run.id, tenantId } });
            for (const emp of employees) {
                const assignment = emp.salaryAssignments[0];
                if (!assignment)
                    continue; // Skip employees without salary assignment
                const att = attendanceMap.get(emp.id) || {
                    totalMonthDays: 30,
                    totalWorkingDays: 30,
                    presentDays: 30,
                    halfDays: 0,
                    approvedPaidLeaveDays: 0,
                    approvedUnpaidLeaveDays: 0,
                    calculatedLopDays: 0,
                    manualLopAdjustment: 0,
                    finalLopDays: 0,
                    payableDays: 30,
                    prorationFactor: new decimal_js_1.default(1),
                    overtimeHours: 0,
                    isAttendanceLocked: false,
                };
                const monthlyCtc = new decimal_js_1.default(assignment.ctcMonthly || 0);
                const proration = new decimal_js_1.default(att.prorationFactor);
                // Earnings from components
                let grossEarnings = new decimal_js_1.default(0);
                const earningsBreakdown = [];
                const deductionsBreakdown = [];
                // Check assigned items
                for (const item of assignment.items) {
                    const comp = item.component;
                    if (comp.type === "earning") {
                        const baseAmt = new decimal_js_1.default(item.monthlyAmount);
                        const proratedAmt = baseAmt.times(proration).toDecimalPlaces(2);
                        grossEarnings = grossEarnings.plus(proratedAmt);
                        earningsBreakdown.push({
                            code: comp.code,
                            name: comp.name,
                            amount: proratedAmt.toNumber(),
                            isTaxable: comp.isTaxable,
                        });
                    }
                }
                // Add Overtime if eligible
                if (att.overtimeHours > 0) {
                    const hourlyRate = monthlyCtc.dividedBy(240).toDecimalPlaces(2); // standard 30*8
                    const otAmount = hourlyRate.times(att.overtimeHours).times(1.5).toDecimalPlaces(2); // 1.5x multiplier
                    grossEarnings = grossEarnings.plus(otAmount);
                    earningsBreakdown.push({
                        code: "OVERTIME",
                        name: `Overtime (${att.overtimeHours} hrs)`,
                        amount: otAmount.toNumber(),
                        isTaxable: true,
                    });
                }
                // Add Approved Expense Reimbursements
                const empClaims = approvedClaims.filter((c) => c.employeeId === emp.id);
                let totalClaimAmount = new decimal_js_1.default(0);
                for (const claim of empClaims) {
                    totalClaimAmount = totalClaimAmount.plus(new decimal_js_1.default(claim.amount));
                }
                if (totalClaimAmount.greaterThan(0)) {
                    grossEarnings = grossEarnings.plus(totalClaimAmount);
                    earningsBreakdown.push({
                        code: "REIMBURSEMENT",
                        name: "Approved Expense Reimbursements",
                        amount: totalClaimAmount.toNumber(),
                        isTaxable: false,
                    });
                }
                // Deductions from assigned components
                let totalDeductions = new decimal_js_1.default(0);
                for (const item of assignment.items) {
                    const comp = item.component;
                    if (comp.type === "deduction") {
                        const amt = new decimal_js_1.default(item.monthlyAmount).times(proration).toDecimalPlaces(2);
                        totalDeductions = totalDeductions.plus(amt);
                        deductionsBreakdown.push({
                            code: comp.code,
                            name: comp.name,
                            amount: amt.toNumber(),
                            isStatutory: comp.isStatutory,
                        });
                    }
                }
                // Recover Loan Installments
                const recoveredEmi = await loan_service_1.LoanService.recoverInstallmentForPeriod(tx, tenantId, emp.id, run.periodMonth, run.periodYear, run.id);
                if (recoveredEmi.greaterThan(0)) {
                    totalDeductions = totalDeductions.plus(recoveredEmi);
                    deductionsBreakdown.push({
                        code: "LOAN_EMI",
                        name: "Loan Installment Deduction",
                        amount: recoveredEmi.toNumber(),
                        isStatutory: false,
                    });
                }
                // Calculate standard EPF & PT if not explicit
                const basicItem = earningsBreakdown.find((e) => e.code === "BASIC");
                const basicAmt = basicItem ? basicItem.amount : grossEarnings.times(0.5).toNumber();
                const epfDeduction = Math.min(1800, Math.round(basicAmt * 0.12));
                if (!deductionsBreakdown.some((d) => d.code === "EPF" || d.code === "PF")) {
                    totalDeductions = totalDeductions.plus(epfDeduction);
                    deductionsBreakdown.push({
                        code: "EPF",
                        name: "Employee Provident Fund",
                        amount: epfDeduction,
                        isStatutory: true,
                    });
                }
                const netPay = decimal_js_1.default.max(0, grossEarnings.minus(totalDeductions));
                totalGrossAmount = totalGrossAmount.plus(grossEarnings);
                totalDeductionsAmount = totalDeductionsAmount.plus(totalDeductions);
                totalNetAmount = totalNetAmount.plus(netPay);
                processedEmployeeCount++;
                const snapshotData = {
                    employee: {
                        id: emp.id,
                        code: emp.employeeCode,
                        name: `${emp.firstName} ${emp.lastName}`,
                        department: emp.department?.name,
                    },
                    attendance: att,
                    earnings: earningsBreakdown,
                    deductions: deductionsBreakdown,
                    grossSalary: grossEarnings.toNumber(),
                    totalDeductions: totalDeductions.toNumber(),
                    netPay: netPay.toNumber(),
                };
                // Create frozen Snapshot
                await tx.payrollSnapshot.create({
                    data: {
                        tenantId,
                        payrollRunId: run.id,
                        employeeId: emp.id,
                        periodMonth: run.periodMonth,
                        periodYear: run.periodYear,
                        snapshotData,
                        ctcAnnual: assignment.ctcAnnual,
                        grossEarned: grossEarnings,
                        totalDeductions,
                        netPay,
                        lopDays: new decimal_js_1.default(att.finalLopDays),
                        payableDays: new decimal_js_1.default(att.payableDays),
                        isLocked: true,
                    },
                });
                // Create Draft Payslip
                await tx.payslip.create({
                    data: {
                        tenantId,
                        payrollRunId: run.id,
                        employeeId: emp.id,
                        periodMonth: run.periodMonth,
                        periodYear: run.periodYear,
                        grossSalary: grossEarnings,
                        deductions: totalDeductions,
                        netSalary: netPay,
                        status: "draft",
                        isPublished: false,
                        breakdown: snapshotData,
                    },
                });
            }
            // Compute variance against previous month
            const prevMonth = run.periodMonth === 1 ? 12 : run.periodMonth - 1;
            const prevYear = run.periodMonth === 1 ? run.periodYear - 1 : run.periodYear;
            const prevRun = await tx.payrollRun.findFirst({
                where: { tenantId, periodMonth: prevMonth, periodYear: prevYear },
            });
            let varianceSummary = null;
            if (prevRun && prevRun.totalAmount) {
                const grossDelta = totalGrossAmount.minus(new decimal_js_1.default(prevRun.totalAmount));
                const netDelta = totalNetAmount.minus(new decimal_js_1.default(prevRun.totalNet || 0));
                const headcountDelta = processedEmployeeCount - (prevRun.employeeCount || 0);
                varianceSummary = {
                    previousPeriod: `${prevMonth}/${prevYear}`,
                    previousGross: prevRun.totalAmount,
                    currentGross: totalGrossAmount,
                    grossDelta: grossDelta.toNumber(),
                    grossDeltaPct: prevRun.totalAmount.isZero()
                        ? 0
                        : grossDelta.dividedBy(new decimal_js_1.default(prevRun.totalAmount)).times(100).toDecimalPlaces(2).toNumber(),
                    netDelta: netDelta.toNumber(),
                    headcountDelta,
                };
            }
            // Update Run Status
            await tx.payrollRun.update({
                where: { id: run.id },
                data: {
                    totalAmount: totalGrossAmount,
                    totalNet: totalNetAmount,
                    totalDeductions: totalDeductionsAmount,
                    employeeCount: processedEmployeeCount,
                    approvalStatus: "calculated",
                    status: "completed",
                    processedAt: new Date(),
                    varianceSummary,
                },
            });
        });
        await audit_service_1.AuditService.log({
            tenantId,
            actorId,
            action: "PAYROLL_CALCULATED",
            resourceType: "PayrollRun",
            resourceId: run.id,
            details: {
                employeeCount: processedEmployeeCount,
                totalNet: totalNetAmount.toString(),
            },
        });
        await outbox_service_1.OutboxService.createEvent(tenantId, "payroll.calculated", "PayrollRun", run.id, {
            periodMonth: run.periodMonth,
            periodYear: run.periodYear,
            employeeCount: processedEmployeeCount,
        });
        (0, socket_1.broadcastToTenant)(tenantId, "payroll.calculated", { runId: run.id });
        return res.json({
            message: "Payroll calculated successfully",
            employeeCount: processedEmployeeCount,
            totalNet: totalNetAmount.toNumber(),
            totalGross: totalGrossAmount.toNumber(),
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * GET /runs/:id/variance — Comparative audit against previous period
 */
exports.hrPayrollRouter.get("/runs/:id/variance", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const runId = req.params.id;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const db = (0, tenant_context_1.getTenantDb)();
        const currentRun = await db.payrollRun.findFirst({
            where: { id: runId, tenantId },
            include: { snapshots: true },
        });
        if (!currentRun)
            return res.status(404).json({ error: "Run not found" });
        const prevMonth = currentRun.periodMonth === 1 ? 12 : currentRun.periodMonth - 1;
        const prevYear = currentRun.periodMonth === 1 ? currentRun.periodYear - 1 : currentRun.periodYear;
        const previousRun = await db.payrollRun.findFirst({
            where: { tenantId, periodMonth: prevMonth, periodYear: prevYear },
            include: { snapshots: true },
        });
        return res.json({
            currentRun: {
                period: `${currentRun.periodMonth}/${currentRun.periodYear}`,
                gross: currentRun.totalAmount,
                net: currentRun.totalNet,
                headcount: currentRun.employeeCount,
            },
            previousRun: previousRun
                ? {
                    period: `${previousRun.periodMonth}/${previousRun.periodYear}`,
                    gross: previousRun.totalAmount,
                    net: previousRun.totalNet,
                    headcount: previousRun.employeeCount,
                }
                : null,
            varianceSummary: currentRun.varianceSummary,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * POST /runs/:id/approve — Maker-checker approval
 */
exports.hrPayrollRouter.post("/runs/:id/approve", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "hr_admin";
        const runId = req.params.id;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const db = (0, tenant_context_1.getTenantDb)();
        const run = await db.payrollRun.findFirst({
            where: { id: runId, tenantId },
        });
        if (!run)
            return res.status(404).json({ error: "Payroll run not found" });
        if (run.approvalStatus !== "calculated" && run.approvalStatus !== "under_review") {
            return res.status(400).json({ error: `Cannot approve payroll in status: ${run.approvalStatus}` });
        }
        const updated = await db.payrollRun.update({
            where: { id: run.id },
            data: {
                approvalStatus: "approved",
                approvedBy: actorId,
                approvedAt: new Date(),
            },
        });
        await audit_service_1.AuditService.log({
            tenantId,
            actorId,
            action: "PAYROLL_APPROVED",
            resourceType: "PayrollRun",
            resourceId: run.id,
            details: { approvedBy: actorId },
        });
        await outbox_service_1.OutboxService.createEvent(tenantId, "payroll.approved", "PayrollRun", run.id, {
            approvedBy: actorId,
        });
        return res.json({ message: "Payroll run approved successfully", run: updated });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * POST /runs/:id/publish — Publish payslips to employee portal & freeze
 */
exports.hrPayrollRouter.post("/runs/:id/publish", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "hr_admin";
        const runId = req.params.id;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const db = (0, tenant_context_1.getTenantDb)();
        const run = await db.payrollRun.findFirst({
            where: { id: runId, tenantId },
        });
        if (!run)
            return res.status(404).json({ error: "Payroll run not found" });
        if (run.approvalStatus !== "approved") {
            return res.status(400).json({ error: "Only approved payroll runs can be published." });
        }
        await db.$transaction(async (tx) => {
            // Mark all payslips for this run as published
            await tx.payslip.updateMany({
                where: { payrollRunId: run.id, tenantId },
                data: {
                    status: "published",
                    isPublished: true,
                    publishedAt: new Date(),
                },
            });
            // Update run publish flags
            await tx.payrollRun.update({
                where: { id: run.id },
                data: {
                    isPublished: true,
                    publishedAt: new Date(),
                    publishedBy: actorId,
                    approvalStatus: "finalized",
                },
            });
        });
        await audit_service_1.AuditService.log({
            tenantId,
            actorId,
            action: "PAYROLL_PUBLISHED",
            resourceType: "PayrollRun",
            resourceId: run.id,
            details: { publishedBy: actorId },
        });
        await outbox_service_1.OutboxService.createEvent(tenantId, "payroll.published", "PayrollRun", run.id, {
            publishedBy: actorId,
        });
        (0, socket_1.broadcastToTenant)(tenantId, "payslip.published", {
            periodMonth: run.periodMonth,
            periodYear: run.periodYear,
        });
        return res.json({ message: "Payroll published and payslips released successfully" });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 2. PAYSLIPS MANAGEMENT (HR-PAY-01)
// =========================================================================
/**
 * GET /payslips — List payslips across tenant
 */
exports.hrPayrollRouter.get("/payslips", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const { periodMonth, periodYear, employeeId, isPublished } = req.query;
        const db = (0, tenant_context_1.getTenantDb)();
        const where = { tenantId };
        if (periodMonth)
            where.periodMonth = Number(periodMonth);
        if (periodYear)
            where.periodYear = Number(periodYear);
        if (employeeId)
            where.employeeId = String(employeeId);
        if (isPublished !== undefined)
            where.isPublished = isPublished === "true";
        const payslips = await db.payslip.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                        department: { select: { name: true } },
                    },
                },
            },
            orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
        });
        return res.json({ payslips });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * POST /payslips/bulk-publish — Bulk publish payslips
 */
exports.hrPayrollRouter.post("/payslips/bulk-publish", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "hr_admin";
        const { payslipIds, periodMonth, periodYear } = req.body;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const db = (0, tenant_context_1.getTenantDb)();
        const where = { tenantId };
        if (payslipIds && Array.isArray(payslipIds)) {
            where.id = { in: payslipIds };
        }
        else if (periodMonth && periodYear) {
            where.periodMonth = Number(periodMonth);
            where.periodYear = Number(periodYear);
        }
        else {
            return res.status(400).json({ error: "Specify payslipIds or periodMonth & periodYear" });
        }
        const result = await db.payslip.updateMany({
            where,
            data: {
                status: "published",
                isPublished: true,
                publishedAt: new Date(),
            },
        });
        await audit_service_1.AuditService.log({
            tenantId,
            actorId,
            action: "PAYSLIPS_BULK_PUBLISHED",
            resourceType: "Payslip",
            resourceId: "bulk",
            details: { count: result.count },
        });
        return res.json({ message: `Successfully published ${result.count} payslips.` });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 3. SALARY COMPONENTS & FORMULA ENGINE (HR-PAY-04)
// =========================================================================
/**
 * GET /components — List components & structures
 */
exports.hrPayrollRouter.get("/components", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const db = (0, tenant_context_1.getTenantDb)();
        const components = await db.salaryComponent.findMany({
            where: { tenantId },
            orderBy: { sortOrder: "asc" },
        });
        const structures = await db.salaryStructure.findMany({
            where: { tenantId },
            include: {
                items: {
                    include: { component: true },
                    orderBy: { sortOrder: "asc" },
                },
            },
        });
        return res.json({ components, structures });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * POST /components — Create salary component
 */
exports.hrPayrollRouter.post("/components", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const { name, code, type, calculationType, formulaString, defaultValue, isTaxable, isStatutory, includeInPf, includeInEsi, description } = req.body;
        if (!name || !code || !type) {
            return res.status(400).json({ error: "name, code, and type are required" });
        }
        const db = (0, tenant_context_1.getTenantDb)();
        const component = await db.salaryComponent.create({
            data: {
                tenantId,
                name,
                code: code.toUpperCase(),
                type,
                calculationType: calculationType || "flat",
                formulaString,
                defaultValue: new decimal_js_1.default(defaultValue || 0),
                isTaxable: isTaxable ?? true,
                isStatutory: isStatutory ?? false,
                includeInPf: includeInPf ?? false,
                includeInEsi: includeInEsi ?? false,
                description,
            },
        });
        await audit_service_1.AuditService.log({
            tenantId,
            actorId,
            action: "SALARY_COMPONENT_CREATED",
            resourceType: "SalaryComponent",
            resourceId: component.id,
            details: { code, name },
        });
        return res.status(201).json({ component });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * POST /components/test-formula — Evaluate formula expression with DAG
 */
exports.hrPayrollRouter.post("/components/test-formula", async (req, res) => {
    try {
        const { formula, context } = req.body;
        if (!formula)
            return res.status(400).json({ error: "formula is required" });
        const sampleContext = context || {
            BASIC: 25000,
            HRA: 10000,
            CTC: 50000,
            SPECIAL: 10000,
            WORKING_DAYS: 30,
            PAYABLE_DAYS: 30,
        };
        const result = (0, evaluator_1.evaluateFormula)(formula, sampleContext);
        return res.json({ formula, context: sampleContext, result, isValid: true });
    }
    catch (err) {
        return res.status(400).json({ error: err.message, isValid: false });
    }
});
// =========================================================================
// 4. EMPLOYEE SALARY ASSIGNMENTS (HR-PAY-03)
// =========================================================================
/**
 * GET /employee-salaries — List assignments
 */
exports.hrPayrollRouter.get("/employee-salaries", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const db = (0, tenant_context_1.getTenantDb)();
        const assignments = await db.employeeSalaryAssignment.findMany({
            where: { tenantId },
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                        department: { select: { name: true } },
                    },
                },
                structure: true,
                items: { include: { component: true } },
            },
            orderBy: { effectiveFrom: "desc" },
        });
        return res.json({ assignments });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * POST /employee-salaries/assign — Assign salary structure
 */
exports.hrPayrollRouter.post("/employee-salaries/assign", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const { employeeId, structureId, ctcAnnual, effectiveFrom, taxRegime, remarks } = req.body;
        if (!employeeId || !ctcAnnual || !effectiveFrom) {
            return res.status(400).json({ error: "employeeId, ctcAnnual, and effectiveFrom are required" });
        }
        const db = (0, tenant_context_1.getTenantDb)();
        const annual = new decimal_js_1.default(ctcAnnual);
        const monthly = annual.dividedBy(12).toDecimalPlaces(2);
        const assignment = await db.$transaction(async (tx) => {
            // Mark current assignment as not current
            await tx.employeeSalaryAssignment.updateMany({
                where: { tenantId, employeeId, isCurrent: true },
                data: { isCurrent: false, effectiveTo: new Date(effectiveFrom) },
            });
            // Create new assignment
            const created = await tx.employeeSalaryAssignment.create({
                data: {
                    tenantId,
                    employeeId,
                    structureId,
                    ctcAnnual: annual,
                    ctcMonthly: monthly,
                    effectiveFrom: new Date(effectiveFrom),
                    isCurrent: true,
                    taxRegime: taxRegime || "new",
                    remarks,
                },
            });
            // Default breakdown: 50% Basic, 20% HRA, 30% Special Allowance
            const components = await tx.salaryComponent.findMany({ where: { tenantId } });
            const basicComp = components.find((c) => c.code === "BASIC");
            const hraComp = components.find((c) => c.code === "HRA");
            const specialComp = components.find((c) => c.code === "SPECIAL" || c.code === "SPECIAL_ALLOW");
            const itemsData = [];
            if (basicComp) {
                const bMonthly = monthly.times(0.5).toDecimalPlaces(2);
                itemsData.push({
                    assignmentId: created.id,
                    componentId: basicComp.id,
                    monthlyAmount: bMonthly,
                    annualAmount: bMonthly.times(12),
                });
            }
            if (hraComp) {
                const hMonthly = monthly.times(0.2).toDecimalPlaces(2);
                itemsData.push({
                    assignmentId: created.id,
                    componentId: hraComp.id,
                    monthlyAmount: hMonthly,
                    annualAmount: hMonthly.times(12),
                });
            }
            if (specialComp) {
                const sMonthly = monthly.times(0.3).toDecimalPlaces(2);
                itemsData.push({
                    assignmentId: created.id,
                    componentId: specialComp.id,
                    monthlyAmount: sMonthly,
                    annualAmount: sMonthly.times(12),
                });
            }
            if (itemsData.length > 0) {
                await tx.employeeSalaryItem.createMany({ data: itemsData });
            }
            return created;
        });
        await audit_service_1.AuditService.log({
            tenantId,
            actorId,
            action: "SALARY_ASSIGNED",
            resourceType: "EmployeeSalaryAssignment",
            resourceId: assignment.id,
            details: { employeeId, ctcAnnual: annual.toString() },
        });
        return res.status(201).json({ assignment });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 5. EMPLOYEE LOANS & REIMBURSEMENTS (HR-PAY-07)
// =========================================================================
/**
 * GET /loans — List employee loans
 */
exports.hrPayrollRouter.get("/loans", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const loans = await loan_service_1.LoanService.listLoans(tenantId);
        return res.json({ loans });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * POST /loans — Create / approve a loan
 */
exports.hrPayrollRouter.post("/loans", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const { employeeId, loanType, principal, interestRate, tenureMonths, deductionStartMonth, reason } = req.body;
        if (!employeeId || !principal || !tenureMonths || !deductionStartMonth) {
            return res.status(400).json({ error: "employeeId, principal, tenureMonths, deductionStartMonth required" });
        }
        const loan = await loan_service_1.LoanService.createLoan(tenantId, {
            employeeId,
            loanType,
            principal: Number(principal),
            interestRate: Number(interestRate || 0),
            tenureMonths: Number(tenureMonths),
            deductionStartMonth,
            reason,
        }, actorId);
        return res.status(201).json({ loan });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * GET /reimbursements — List approved claims ready for payroll
 */
exports.hrPayrollRouter.get("/reimbursements", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const db = (0, tenant_context_1.getTenantDb)();
        const claims = await db.expenseClaim.findMany({
            where: { tenantId, reimbursementMethod: "payroll_addition" },
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                category: true,
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ reimbursements: claims });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 6. TAX DECLARATIONS & STATUTORY FORMS (HR-PAY-06, HR-PAY-08)
// =========================================================================
/**
 * GET /tax/declarations — List declarations
 */
exports.hrPayrollRouter.get("/tax/declarations", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const { financialYear } = req.query;
        const db = (0, tenant_context_1.getTenantDb)();
        const where = { tenantId };
        if (financialYear)
            where.financialYear = String(financialYear);
        const declarations = await db.employeeTaxDeclaration.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        firstName: true,
                        lastName: true,
                        department: { select: { name: true } },
                    },
                },
                proofs: true,
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ declarations });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * PATCH /tax/proofs/:id — Review and verify / reject proof
 */
exports.hrPayrollRouter.patch("/tax/proofs/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const proofId = req.params.id;
        const { status, approvedAmount, rejectionReason } = req.body;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const db = (0, tenant_context_1.getTenantDb)();
        const proof = await db.taxDeclarationProof.update({
            where: { id: proofId },
            data: {
                status,
                approvedAmount: approvedAmount !== undefined ? new decimal_js_1.default(approvedAmount) : undefined,
                rejectionReason,
            },
        });
        await audit_service_1.AuditService.log({
            tenantId,
            actorId,
            action: "TAX_PROOF_VERIFIED",
            resourceType: "TaxDeclarationProof",
            resourceId: proof.id,
            details: { status, approvedAmount },
        });
        return res.json({ proof });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * GET /forms/summary — Statutory compliance summary
 */
exports.hrPayrollRouter.get("/forms/summary", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const db = (0, tenant_context_1.getTenantDb)();
        const runsCount = await db.payrollRun.count({ where: { tenantId } });
        const employeesCount = await db.employee.count({ where: { tenantId, status: "active" } });
        const declarationsCount = await db.employeeTaxDeclaration.count({ where: { tenantId } });
        return res.json({
            statutoryForms: [
                { code: "FORM_16", title: "Form 16 (Part A & B)", act: "Income-tax Act, 2025", status: "READY" },
                { code: "PF_FORM_11", title: "EPF Form 11 (Declaration)", act: "Employees' Provident Funds Act, 1952", status: "READY" },
                { code: "PF_FORM_19", title: "EPF Form 19 (Final Settlement)", act: "EPF Act, 1952", status: "READY" },
                { code: "ESI_FORM_1", title: "ESIC Form 1 (Declaration)", act: "Employees' State Insurance Act, 1948", status: "READY" },
                { code: "PT_FORM_5", title: "Professional Tax Return (Monthly)", act: "State PT Act", status: "READY" },
            ],
            metrics: { runsCount, employeesCount, declarationsCount },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 8. ALL-INDIA STATUTORY REGISTRY & HR PAYROLL SETTINGS
// =========================================================================
/**
 * GET /jurisdictions — List all 36 Indian States and Union Territories
 */
exports.hrPayrollRouter.get("/jurisdictions", async (_req, res) => {
    return res.json({
        jurisdictions: jurisdictions_1.ALL_INDIA_JURISDICTIONS,
        totalCount: jurisdictions_1.ALL_INDIA_JURISDICTIONS.length,
        statesCount: jurisdictions_1.ALL_INDIA_JURISDICTIONS.filter((j) => j.type === "STATE").length,
        unionTerritoriesCount: jurisdictions_1.ALL_INDIA_JURISDICTIONS.filter((j) => j.type === "UNION_TERRITORY").length,
    });
});
/**
 * GET /jurisdictions/:code/rules — Retrieve statutory rules for a specific jurisdiction
 */
exports.hrPayrollRouter.get("/jurisdictions/:code/rules", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const stateCode = req.params.code.toUpperCase();
        const rules = await statutory_rule_registry_service_1.StatutoryRuleRegistryService.listRules({
            stateCode: stateCode === "CENTRAL" || stateCode === "ALL" ? "ALL" : stateCode,
            tenantId,
        });
        return res.json({
            stateCode,
            rules,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * GET /settings — Fetch current tenant's persisted payroll & statutory setup
 */
exports.hrPayrollRouter.get("/settings", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const db = (0, tenant_context_1.getTenantDb)();
        const settingRecord = await db.setting.findFirst({
            where: {
                scope: "TENANT",
                scopeId: tenantId,
                group: "payroll",
                key: "payroll_config",
            },
        });
        const defaultSettings = {
            cutoffDay: 1,
            cutoffEndDay: 30,
            payCycle: "monthly",
            bankFormat: "HDFC_CMS",
            voluntaryPfAllowed: true,
            defaultWorkState: "TN",
            statutoryAutoDeduction: true,
            lwfEnabled: true,
            ptEnabled: true,
            updatedAt: new Date().toISOString(),
        };
        const currentSettings = settingRecord
            ? { ...defaultSettings, ...settingRecord.valueJson }
            : defaultSettings;
        // Fetch active statutory rule summary for this tenant
        const activeRules = await statutory_rule_registry_service_1.StatutoryRuleRegistryService.listRules({
            publicationStatus: "published",
            tenantId,
        });
        return res.json({
            settings: currentSettings,
            activeRulesSummary: {
                totalRules: activeRules.length,
                epfRule: activeRules.find((r) => r.ruleType === "EPF"),
                esiRule: activeRules.find((r) => r.ruleType === "ESI"),
                tdsRule: activeRules.find((r) => r.ruleType === "TDS_ITA2025"),
                gratuityRule: activeRules.find((r) => r.ruleType === "GRATUITY"),
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * POST /settings — Persist tenant's payroll & statutory configuration parameters
 */
exports.hrPayrollRouter.post("/settings", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const { cutoffDay, cutoffEndDay, payCycle, bankFormat, voluntaryPfAllowed, defaultWorkState, statutoryAutoDeduction, lwfEnabled, ptEnabled, } = req.body;
        const db = (0, tenant_context_1.getTenantDb)();
        const configPayload = {
            cutoffDay: Number(cutoffDay) || 1,
            cutoffEndDay: Number(cutoffEndDay) || 30,
            payCycle: payCycle || "monthly",
            bankFormat: bankFormat || "HDFC_CMS",
            voluntaryPfAllowed: voluntaryPfAllowed !== false,
            defaultWorkState: defaultWorkState || "TN",
            statutoryAutoDeduction: statutoryAutoDeduction !== false,
            lwfEnabled: lwfEnabled !== false,
            ptEnabled: ptEnabled !== false,
            updatedAt: new Date().toISOString(),
            updatedBy: actorId,
        };
        const setting = await db.setting.upsert({
            where: {
                scope_scopeId_key: {
                    scope: "TENANT",
                    scopeId: tenantId,
                    key: "payroll_config",
                },
            },
            create: {
                scope: "TENANT",
                scopeId: tenantId,
                group: "payroll",
                key: "payroll_config",
                valueType: "JSON",
                valueJson: configPayload,
                updatedBy: actorId,
            },
            update: {
                valueJson: configPayload,
                updatedBy: actorId,
            },
        });
        await audit_service_1.AuditService.log({
            tenantId,
            actorId,
            action: "PAYROLL_SETTINGS_UPDATED",
            resourceType: "Setting",
            resourceId: setting.id,
            details: configPayload,
        });
        return res.json({
            success: true,
            message: "Payroll configuration persisted successfully to database",
            settings: configPayload,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * GET /amendments/sources — List official statutory government sources monitored
 */
exports.hrPayrollRouter.get("/amendments/sources", async (_req, res) => {
    return res.json({
        sources: statutory_amendment_ingestion_service_1.StatutoryAmendmentIngestionService.getOfficialSources(),
    });
});
/**
 * POST /amendments/ingest — Ingest an official government gazette / circular amendment as DRAFT
 */
exports.hrPayrollRouter.post("/amendments/ingest", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const actorRole = req.user?.roles?.[0] || "hr_admin";
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const result = await statutory_amendment_ingestion_service_1.StatutoryAmendmentIngestionService.ingestNotificationAsDraft(req.body, actorId, actorRole, tenantId);
        await audit_service_1.AuditService.log({
            tenantId,
            actorId,
            action: "STATUTORY_AMENDMENT_INGESTED",
            resourceType: "StatutoryRule",
            resourceId: result.draftRule.id,
            details: {
                notificationRef: req.body.notificationRef,
                ruleType: req.body.ruleType,
                stateCode: req.body.stateCode,
                diffSummary: result.diff,
            },
        });
        return res.status(201).json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
/**
 * POST /simulate — Interactive payroll calculation simulation with proposed or custom rules
 */
exports.hrPayrollRouter.post("/simulate", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const { monthlyGross = 50000, basicSalary = 25000, state = "TN", taxRegime = "new", isResident = true, pfEligible = true, esiEligible = true, ptEligible = true, lwfEligible = true, proposedRuleOverride, } = req.body;
        // Fetch baseline active statutory rules
        const activeRules = await statutory_rule_registry_service_1.StatutoryRuleRegistryService.listRules({
            publicationStatus: "published",
            tenantId,
        });
        const statutoryRules = [...activeRules];
        if (proposedRuleOverride && proposedRuleOverride.ruleType) {
            // Prepend proposed rule override to test against calculation engine
            statutoryRules.unshift({
                id: "SIM_PROPOSAL_" + Date.now(),
                ruleType: proposedRuleOverride.ruleType,
                stateCode: proposedRuleOverride.stateCode || "ALL",
                configJson: proposedRuleOverride.configJson,
                version: proposedRuleOverride.version || 99,
                effectiveFrom: new Date(),
                publicationStatus: "draft",
                isActive: true,
            });
        }
        const syntheticEmployee = {
            id: "SIM_EMP_001",
            employeeCode: "SIM001",
            firstName: "Simulation",
            lastName: "Subject",
            baseMonthlyCtc: Number(monthlyGross),
            state: state.toUpperCase(),
            taxRegime,
            isResident,
            pfEligible,
            esiEligible,
            ptEligible,
            lwfEligible,
        };
        const attendanceContext = {
            payableDays: 30,
            totalDays: 30,
            prorationFactor: 1.0,
            lopDays: 0,
        };
        const breakdown = (0, payroll_engine_service_1.computeEmployeePayrollBreakdown)(syntheticEmployee, attendanceContext, {
            statutoryRules: statutoryRules,
            periodMonth: 1,
            periodYear: 2026,
        });
        return res.json({
            simulation: {
                input: {
                    monthlyGross: Number(monthlyGross),
                    basicSalary: Number(basicSalary),
                    state: state.toUpperCase(),
                    taxRegime,
                },
                breakdown,
                statutoryManifest: breakdown.statutoryManifest,
                safetyNotice: "Simulation preview only. Release Gate is BLOCKED. Does not modify or publish live payslips.",
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * POST /rules/draft — Create a tenant-specific draft rule override
 */
exports.hrPayrollRouter.post("/rules/draft", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const actorRole = req.user?.roles?.[0] || "hr_admin";
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const draft = await statutory_rule_registry_service_1.StatutoryRuleRegistryService.createDraftRule(req.body, actorId, actorRole, tenantId);
        return res.status(201).json({ draft });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
/**
 * POST /rules/:id/submit — Submit a draft rule for compliance review
 */
exports.hrPayrollRouter.post("/rules/:id/submit", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "system";
        const actorRole = req.user?.roles?.[0] || "hr_admin";
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const rule = await statutory_rule_registry_service_1.StatutoryRuleRegistryService.submitForReview(req.params.id, actorId, actorRole);
        return res.json({ rule });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
