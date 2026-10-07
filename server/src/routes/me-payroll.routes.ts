import { Router, Response } from "express";
import Decimal from "decimal.js";
import { getTenantDb } from "../context/tenant-context";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { AuditService } from "../services/audit.service";
import { OutboxService } from "../services/outbox.service";

export const mePayrollRouter = Router();

// Apply Auth & Tenant Context
mePayrollRouter.use(requireAuth, resolveTenantContext);

/**
 * Helper to resolve authenticated Employee record
 */
async function resolveCurrentEmployee(req: AuthRequest) {
  const tenantId = req.user?.tenantId;
  const userId = req.user?.userId;
  if (!tenantId || !userId) return null;

  const db = getTenantDb();
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
mePayrollRouter.get("/payslips", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const employee = await resolveCurrentEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found" });

    const db = getTenantDb();
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /payslips/:id — View single payslip details
 */
mePayrollRouter.get("/payslips/:id", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const payslipId = req.params.id;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const employee = await resolveCurrentEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found" });

    const db = getTenantDb();
    const payslip = await db.payslip.findFirst({
      where: {
        id: payslipId,
        tenantId,
        employeeId: employee.id, // STRICT: ownership check
        isPublished: true,
      },
    });

    if (!payslip) return res.status(404).json({ error: "Payslip not found or not published" });

    return res.json({ payslip });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 2. MY SALARY BREAKDOWN (ME-PAY-02)
// =========================================================================

/**
 * GET /salary — Current structure, CTC breakdown & revision history
 */
mePayrollRouter.get("/salary", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const employee = await resolveCurrentEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found" });

    const db = getTenantDb();
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 3. TAX & INVESTMENTS (ME-PAY-03)
// =========================================================================

/**
 * GET /tax — View investment declarations & regime status
 */
mePayrollRouter.get("/tax", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const employee = await resolveCurrentEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found" });

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const fy = currentMonth >= 4 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;

    const db = getTenantDb();
    const declaration = await db.employeeTaxDeclaration.findFirst({
      where: { tenantId, employeeId: employee.id, financialYear: fy },
      include: { proofs: true },
    });

    return res.json({
      financialYear: fy,
      declaration,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /tax/declare — Submit or update investment declaration
 */
mePayrollRouter.post("/tax/declare", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "employee";
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const employee = await resolveCurrentEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found" });

    const {
      financialYear,
      taxRegime,
      houseRentPaid,
      landlordPan,
      landlordName,
      section80C,
      section80D,
      section80G,
      homeLoanInterest,
      otherIncome,
    } = req.body;

    const db = getTenantDb();
    const fy = financialYear || "2026-2027";

    const totalDeductionClaimed = new Decimal(section80C || 0)
      .plus(new Decimal(section80D || 0))
      .plus(new Decimal(section80G || 0))
      .plus(new Decimal(homeLoanInterest || 0));

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
        houseRentPaid: new Decimal(houseRentPaid || 0),
        landlordPan,
        landlordName,
        section80C: new Decimal(section80C || 0),
        section80D: new Decimal(section80D || 0),
        section80G: new Decimal(section80G || 0),
        homeLoanInterest: new Decimal(homeLoanInterest || 0),
        otherIncome: new Decimal(otherIncome || 0),
        totalDeductionClaimed,
        status: "submitted",
      },
      create: {
        tenantId,
        employeeId: employee.id,
        financialYear: fy,
        taxRegime: taxRegime || "new",
        houseRentPaid: new Decimal(houseRentPaid || 0),
        landlordPan,
        landlordName,
        section80C: new Decimal(section80C || 0),
        section80D: new Decimal(section80D || 0),
        section80G: new Decimal(section80G || 0),
        homeLoanInterest: new Decimal(homeLoanInterest || 0),
        otherIncome: new Decimal(otherIncome || 0),
        totalDeductionClaimed,
        status: "submitted",
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "TAX_DECLARATION_SUBMITTED",
      resourceType: "EmployeeTaxDeclaration",
      resourceId: declaration.id,
      details: { financialYear: fy, taxRegime },
    });

    return res.json({ declaration });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 4. REIMBURSEMENTS & LOANS (ME-PAY-04)
// =========================================================================

/**
 * GET /reimbursements-loans — Personal expense claims and loan EMI schedules
 */
mePayrollRouter.get("/reimbursements-loans", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const employee = await resolveCurrentEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found" });

    const db = getTenantDb();
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /loans/request — Employee submits a loan request
 */
mePayrollRouter.post("/loans/request", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId || "employee";
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const employee = await resolveCurrentEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found" });

    const { principal, tenureMonths, deductionStartMonth, reason, loanType } = req.body;
    if (!principal || !tenureMonths || !deductionStartMonth) {
      return res.status(400).json({ error: "principal, tenureMonths, and deductionStartMonth required" });
    }

    const db = getTenantDb();
    const principalDec = new Decimal(principal);
    const emi = principalDec.dividedBy(tenureMonths).toDecimalPlaces(2);

    const loan = await db.employeeLoan.create({
      data: {
        tenantId,
        employeeId: employee.id,
        loanType: loanType || "salary_advance",
        principal: principalDec,
        tenureMonths: Number(tenureMonths),
        monthlyEmi: emi,
        disbursedAmount: new Decimal(0),
        outstandingBalance: principalDec,
        status: "pending",
        deductionStartMonth,
        reason,
      },
    });

    await AuditService.log({
      tenantId,
      actorId,
      action: "LOAN_REQUESTED",
      resourceType: "EmployeeLoan",
      resourceId: loan.id,
      details: { principal: principal.toString(), tenureMonths },
    });

    await OutboxService.createEvent(tenantId, "loan.requested", "EmployeeLoan", loan.id, {
      employeeId: employee.id,
      principal: principal.toString(),
    });

    return res.status(201).json({ loan });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 5. STATUTORY FORMS (ME-PAY-05)
// =========================================================================

/**
 * GET /statutory-forms — Prefilled statutory declarations and documents
 */
mePayrollRouter.get("/statutory-forms", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const employee = await resolveCurrentEmployee(req);
    if (!employee) return res.status(404).json({ error: "Employee profile not found" });

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
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
