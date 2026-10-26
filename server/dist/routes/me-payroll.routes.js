"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mePayrollRouter = void 0;
const express_1 = require("express");
const decimal_js_1 = __importDefault(require("decimal.js"));
const tenant_context_1 = require("../context/tenant-context");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const audit_service_1 = require("../services/audit.service");
const outbox_service_1 = require("../services/outbox.service");
const financial_year_1 = require("../utils/financial-year");
exports.mePayrollRouter = (0, express_1.Router)();
// Apply Auth & Tenant Context
exports.mePayrollRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
/**
 * Helper to resolve authenticated Employee record
 */
async function resolveCurrentEmployee(req) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId)
        return null;
    const db = (0, tenant_context_1.getTenantDb)();
    let employee = await db.employee.findFirst({
        where: { tenantId, userId },
    });
    if (!employee) {
        employee = await db.employee.findFirst({
            where: { tenantId, id: userId },
        });
    }
    return employee;
}
// =========================================================================
// 1. EMPLOYEE PAYSLIPS (ME-PAY-01)
// =========================================================================
/**
 * GET /payslips — List published payslips for authenticated employee
 */
exports.mePayrollRouter.get("/payslips", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const employee = await resolveCurrentEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found" });
        const db = (0, tenant_context_1.getTenantDb)();
        const payslips = await db.payslip.findMany({
            where: {
                tenantId,
                employeeId: employee.id,
                isPublished: true, // STRICT: only published payslips visible to employee
            },
            orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
            select: {
                id: true,
                periodMonth: true,
                periodYear: true,
                grossSalary: true,
                deductions: true,
                netSalary: true,
                isPasswordProtected: true,
                pdfUrl: true,
                createdAt: true,
                publishedAt: true,
            },
        });
        return res.json({ payslips });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * GET /payslips/:id — View single payslip details
 */
exports.mePayrollRouter.get("/payslips/:id", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const payslipId = req.params.id;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const employee = await resolveCurrentEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found" });
        const db = (0, tenant_context_1.getTenantDb)();
        const payslip = await db.payslip.findFirst({
            where: {
                id: payslipId,
                tenantId,
                employeeId: employee.id, // STRICT: ownership check
                isPublished: true,
            },
        });
        if (!payslip)
            return res.status(404).json({ error: "Payslip not found or not published" });
        return res.json({ payslip });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 2. MY SALARY BREAKDOWN (ME-PAY-02)
// =========================================================================
/**
 * GET /salary — Current structure, CTC breakdown & revision history
 */
exports.mePayrollRouter.get("/salary", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const employee = await resolveCurrentEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found" });
        const db = (0, tenant_context_1.getTenantDb)();
        const currentAssignment = await db.employeeSalaryAssignment.findFirst({
            where: { tenantId, employeeId: employee.id, isCurrent: true },
            include: {
                structure: true,
                items: {
                    include: { component: true },
                    orderBy: { monthlyAmount: "desc" },
                },
            },
        });
        const revisionHistory = await db.employeeSalaryAssignment.findMany({
            where: { tenantId, employeeId: employee.id },
            orderBy: { effectiveFrom: "desc" },
            select: {
                id: true,
                ctcAnnual: true,
                ctcMonthly: true,
                effectiveFrom: true,
                effectiveTo: true,
                isCurrent: true,
                taxRegime: true,
                remarks: true,
            },
        });
        return res.json({
            currentSalary: currentAssignment,
            revisionHistory,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 3. TAX & INVESTMENTS (ME-PAY-03)
// =========================================================================
/**
 * GET /tax — View investment declarations & regime status
 */
exports.mePayrollRouter.get("/tax", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const employee = await resolveCurrentEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found" });
        const fy = req.query.financialYear
            ? (0, financial_year_1.normalizeFinancialYear)(req.query.financialYear)
            : (0, financial_year_1.getCurrentFinancialYear)();
        const db = (0, tenant_context_1.getTenantDb)();
        const declaration = await db.employeeTaxDeclaration.findFirst({
            where: { tenantId, employeeId: employee.id, financialYear: fy },
            include: { proofs: true },
        });
        return res.json({
            financialYear: fy,
            declaration,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * POST /tax/declare — Submit or update investment declaration
 */
exports.mePayrollRouter.post("/tax/declare", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "employee";
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const employee = await resolveCurrentEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found" });
        const { financialYear, taxRegime, houseRentPaid, landlordPan, landlordName, section80C, section80D, section80G, homeLoanInterest, otherIncome, } = req.body;
        const db = (0, tenant_context_1.getTenantDb)();
        const fy = (0, financial_year_1.normalizeFinancialYear)(financialYear);
        const totalDeductionClaimed = new decimal_js_1.default(section80C || 0)
            .plus(new decimal_js_1.default(section80D || 0))
            .plus(new decimal_js_1.default(section80G || 0))
            .plus(new decimal_js_1.default(homeLoanInterest || 0));
        const declaration = await db.employeeTaxDeclaration.upsert({
            where: {
                tenantId_employeeId_financialYear: {
                    tenantId,
                    employeeId: employee.id,
                    financialYear: fy,
                },
            },
            update: {
                taxRegime: taxRegime || "new",
                houseRentPaid: new decimal_js_1.default(houseRentPaid || 0),
                landlordPan,
                landlordName,
                section80C: new decimal_js_1.default(section80C || 0),
                section80D: new decimal_js_1.default(section80D || 0),
                section80G: new decimal_js_1.default(section80G || 0),
                homeLoanInterest: new decimal_js_1.default(homeLoanInterest || 0),
                otherIncome: new decimal_js_1.default(otherIncome || 0),
                totalDeductionClaimed,
                status: "submitted",
            },
            create: {
                tenantId,
                employeeId: employee.id,
                financialYear: fy,
                taxRegime: taxRegime || "new",
                houseRentPaid: new decimal_js_1.default(houseRentPaid || 0),
                landlordPan,
                landlordName,
                section80C: new decimal_js_1.default(section80C || 0),
                section80D: new decimal_js_1.default(section80D || 0),
                section80G: new decimal_js_1.default(section80G || 0),
                homeLoanInterest: new decimal_js_1.default(homeLoanInterest || 0),
                otherIncome: new decimal_js_1.default(otherIncome || 0),
                totalDeductionClaimed,
                status: "submitted",
            },
        });
        await audit_service_1.AuditService.log({
            tenantId,
            actorId,
            action: "TAX_DECLARATION_SUBMITTED",
            resourceType: "EmployeeTaxDeclaration",
            resourceId: declaration.id,
            details: { financialYear: fy, taxRegime },
        });
        return res.json({ declaration });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 4. REIMBURSEMENTS & LOANS (ME-PAY-04)
// =========================================================================
/**
 * GET /reimbursements-loans — Personal expense claims and loan EMI schedules
 */
exports.mePayrollRouter.get("/reimbursements-loans", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const employee = await resolveCurrentEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found" });
        const db = (0, tenant_context_1.getTenantDb)();
        const claims = await db.expenseClaim.findMany({
            where: { tenantId, employeeId: employee.id },
            include: { category: true },
            orderBy: { createdAt: "desc" },
        });
        const loans = await db.employeeLoan.findMany({
            where: { tenantId, employeeId: employee.id },
            include: {
                installments: { orderBy: { installmentNumber: "asc" } },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ claims, loans });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
/**
 * POST /loans/request — Employee submits a loan request
 */
exports.mePayrollRouter.post("/loans/request", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId || "employee";
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const employee = await resolveCurrentEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found" });
        const { principal, tenureMonths, deductionStartMonth, reason, loanType } = req.body;
        if (!principal || !tenureMonths || !deductionStartMonth) {
            return res.status(400).json({ error: "principal, tenureMonths, and deductionStartMonth required" });
        }
        const db = (0, tenant_context_1.getTenantDb)();
        const principalDec = new decimal_js_1.default(principal);
        const emi = principalDec.dividedBy(tenureMonths).toDecimalPlaces(2);
        const loan = await db.employeeLoan.create({
            data: {
                tenantId,
                employeeId: employee.id,
                loanType: loanType || "salary_advance",
                principal: principalDec,
                tenureMonths: Number(tenureMonths),
                monthlyEmi: emi,
                disbursedAmount: new decimal_js_1.default(0),
                outstandingBalance: principalDec,
                status: "pending",
                deductionStartMonth,
                reason,
            },
        });
        await audit_service_1.AuditService.log({
            tenantId,
            actorId,
            action: "LOAN_REQUESTED",
            resourceType: "EmployeeLoan",
            resourceId: loan.id,
            details: { principal: principal.toString(), tenureMonths },
        });
        await outbox_service_1.OutboxService.createEvent(tenantId, "loan.requested", "EmployeeLoan", loan.id, {
            employeeId: employee.id,
            principal: principal.toString(),
        });
        return res.status(201).json({ loan });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 5. STATUTORY FORMS (ME-PAY-05)
// =========================================================================
/**
 * GET /statutory-forms — Prefilled statutory declarations and documents
 */
exports.mePayrollRouter.get("/statutory-forms", async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const employee = await resolveCurrentEmployee(req);
        if (!employee)
            return res.status(404).json({ error: "Employee profile not found" });
        return res.json({
            employeeInfo: {
                id: employee.id,
                code: employee.employeeCode,
                name: `${employee.firstName} ${employee.lastName}`,
                pan: employee.pan ? `••••${employee.pan.slice(-4)}` : "Not provided",
                uan: employee.uan || "Not provided",
            },
            availableForms: [
                { code: "FORM_16", title: "Form 16 Annual Tax Certificate", available: true, year: "2025-26" },
                { code: "FORM_12BB", title: "Form 12BB Investment Declaration Statement", available: true, year: "2026-27" },
                { code: "PF_FORM_11", title: "EPF Form 11 New Joiner Declaration", available: true },
                { code: "PF_FORM_31", title: "EPF Form 31 Advance Claim Certificate", available: true },
            ],
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
