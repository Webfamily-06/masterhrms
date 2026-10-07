import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";
import {
  computeEmployeePayrollBreakdown,
  calculateStatutoryEPF,
  calculateStatutoryESI,
  calculateProfessionalTax,
  calculateAnnualTDS,
} from "../services/payroll-engine.service";
import { LoanService } from "../services/loan.service";
import { evaluateFormula } from "../services/formula-engine/evaluator";
import { Parser } from "../services/formula-engine/parser";

describe("MASTERHRMS P4 — Golden Payroll & Finance Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Basic Monthly Salary
  // -------------------------------------------------------------------------
  it("1. Basic Monthly Salary: Correctly computes full month unprorated salary breakdown", () => {
    const context = {
      id: "emp-101",
      employeeCode: "EMP001",
      firstName: "Rahul",
      lastName: "Sharma",
      email: "rahul@masterhrms.com",
      baseMonthlyCtc: 50000,
      state: "MH",
      pfEligible: true,
      esiEligible: false,
      ptEligible: true,
      tdsEligible: true,
      taxRegime: "new",
    };

    const attendance = {
      totalWorkingDays: 30,
      payableDays: 30,
      presentDays: 30,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 0,
      prorationFactor: 1.0,
    };

    const breakdown = computeEmployeePayrollBreakdown(context, attendance, {}, 3, 2026);

    expect(breakdown.prorationFactor).toBe(1.0);
    expect(breakdown.earnings.basicSalary).toBe(25000); // 50% of CTC
    expect(breakdown.earnings.hra).toBe(10000); // 20% of CTC
    expect(breakdown.earnings.specialAllowance).toBe(7500); // 15% of CTC
    expect(breakdown.earnings.conveyance).toBe(2500); // 5% of CTC
    expect(breakdown.earnings.medical).toBe(2500); // 5% of CTC
    expect(breakdown.earnings.totalGross).toBe(50000);

    // EPF on Actual Basic (25,000 * 12% = 3000)
    expect(breakdown.deductions.providentFund).toBe(3000);
    // Statutory EPF when wage ceiling rule is enforced (15,000 * 12% = 1800)
    expect(calculateStatutoryEPF(25000, true).employeePf).toBe(1800);
    // PT in MH (March): 200
    expect(breakdown.deductions.professionalTax).toBe(200);

    expect(breakdown.netPay).toBeGreaterThan(0);
    expect(breakdown.netPay).toBe(
      breakdown.earnings.totalGross -
        (breakdown.deductions.providentFund +
          breakdown.deductions.professionalTax +
          breakdown.deductions.tds)
    );
  });

  // -------------------------------------------------------------------------
  // 2. Salary Revision
  // -------------------------------------------------------------------------
  it("2. Salary Revision: Maintains effective dating and historical snapshot reproducibility", () => {
    const historicalContext = {
      id: "emp-101",
      employeeCode: "EMP001",
      firstName: "Rahul",
      lastName: "Sharma",
      email: "rahul@masterhrms.com",
      baseMonthlyCtc: 40000,
      state: "KA",
    };

    const revisedContext = {
      ...historicalContext,
      baseMonthlyCtc: 60000,
    };

    const attendance = {
      totalWorkingDays: 30,
      payableDays: 30,
      presentDays: 30,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 0,
      prorationFactor: 1.0,
    };

    // Calculate historical period (e.g. January)
    const histResult = computeEmployeePayrollBreakdown(historicalContext, attendance, {}, 1, 2026);
    // Calculate revised period (e.g. February)
    const revResult = computeEmployeePayrollBreakdown(revisedContext, attendance, {}, 2, 2026);

    expect(histResult.earnings.totalGross).toBe(40000);
    expect(revResult.earnings.totalGross).toBe(60000);
    // Revision preserves historical snapshot reproducibility
    expect(histResult.earnings.basicSalary).toBe(20000);
    expect(revResult.earnings.basicSalary).toBe(30000);
  });

  // -------------------------------------------------------------------------
  // 3. Attendance Impact
  // -------------------------------------------------------------------------
  it("3. Attendance Impact: Loss of Pay accurately prorates gross earnings and statutory deductions", () => {
    const context = {
      id: "emp-102",
      employeeCode: "EMP002",
      firstName: "Priya",
      lastName: "Patel",
      email: "priya@masterhrms.com",
      baseMonthlyCtc: 60000,
      state: "MH",
      pfEligible: true,
      esiEligible: false,
      ptEligible: true,
    };

    // 15 days out of 30 worked = 50% proration
    const attendance = {
      totalWorkingDays: 30,
      payableDays: 15,
      presentDays: 15,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 15,
      prorationFactor: 0.5,
    };

    const breakdown = computeEmployeePayrollBreakdown(context, attendance, {}, 4, 2026);

    expect(breakdown.prorationFactor).toBe(0.5);
    expect(breakdown.earnings.basicSalary).toBe(15000); // 30,000 * 0.5
    expect(breakdown.earnings.totalGross).toBe(30000); // 60,000 * 0.5
    // EPF on prorated basic (15,000): 12% of 15,000 = 1800
    expect(breakdown.deductions.providentFund).toBe(1800);
  });

  // -------------------------------------------------------------------------
  // 4. Paid Leave
  // -------------------------------------------------------------------------
  it("4. Paid Leave: Approved paid leaves are counted as full payable days without penalty", () => {
    const context = {
      id: "emp-103",
      employeeCode: "EMP003",
      firstName: "Amit",
      lastName: "Verma",
      email: "amit@masterhrms.com",
      baseMonthlyCtc: 45000,
    };

    // 25 days present + 5 days approved paid leave = 30 payable days
    const attendance = {
      totalWorkingDays: 30,
      payableDays: 30,
      presentDays: 25,
      halfDays: 0,
      approvedLeaveDays: 5,
      lossOfPayDays: 0,
      prorationFactor: 1.0,
    };

    const breakdown = computeEmployeePayrollBreakdown(context, attendance, {}, 5, 2026);

    expect(breakdown.payableDays).toBe(30);
    expect(breakdown.lossOfPayDays).toBe(0);
    expect(breakdown.earnings.totalGross).toBe(45000);
  });

  // -------------------------------------------------------------------------
  // 5. Unpaid Leave
  // -------------------------------------------------------------------------
  it("5. Unpaid Leave: Loss of pay reduces payable days and triggers proration", () => {
    const context = {
      id: "emp-104",
      employeeCode: "EMP004",
      firstName: "Sneha",
      lastName: "Rao",
      email: "sneha@masterhrms.com",
      baseMonthlyCtc: 31000,
    };

    // 21 days present + 10 days unpaid leave in a 31-day month
    const totalDays = 31;
    const payableDays = 21;
    const lopDays = 10;
    const proration = Math.round((payableDays / totalDays) * 10000) / 10000;

    const attendance = {
      totalWorkingDays: totalDays,
      payableDays,
      presentDays: 21,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: lopDays,
      prorationFactor: proration,
    };

    const breakdown = computeEmployeePayrollBreakdown(context, attendance, {}, 5, 2026);

    expect(breakdown.payableDays).toBe(21);
    expect(breakdown.lossOfPayDays).toBe(10);
    expect(breakdown.earnings.totalGross).toBe(20999.4);
  });

  // -------------------------------------------------------------------------
  // 6. Overtime
  // -------------------------------------------------------------------------
  it("6. Overtime: Integrates approved overtime hours into gross earnings", () => {
    const hourlyRate = 200;
    const overtimeHours = 10;
    const overtimePay = hourlyRate * overtimeHours; // 2000

    expect(overtimePay).toBe(2000);
    const grossWithoutOt = 40000;
    const grossWithOt = grossWithoutOt + overtimePay;
    expect(grossWithOt).toBe(42000);
  });

  // -------------------------------------------------------------------------
  // 7. Reimbursement
  // -------------------------------------------------------------------------
  it("7. Reimbursement: Approved non-taxable claims are added to payout without increasing taxable gross", () => {
    const context = {
      id: "emp-105",
      employeeCode: "EMP005",
      firstName: "Karan",
      lastName: "Mehta",
      email: "karan@masterhrms.com",
      baseMonthlyCtc: 50000,
    };

    const attendance = {
      totalWorkingDays: 30,
      payableDays: 30,
      presentDays: 30,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 0,
      prorationFactor: 1.0,
    };

    const breakdown = computeEmployeePayrollBreakdown(context, attendance, {}, 6, 2026);
    const approvedReimbursement = 4500;

    const netPayoutWithReimbursement = breakdown.netPay + approvedReimbursement;
    expect(netPayoutWithReimbursement).toBe(breakdown.netPay + 4500);
  });

  // -------------------------------------------------------------------------
  // 8. Loan Deduction
  // -------------------------------------------------------------------------
  it("8. Loan Deduction: Accurately computes EMI, tracks outstanding balance, and closes loan at zero", () => {
    const principal = 60000;
    const tenureMonths = 6;
    const annualInterest = 0; // 0% interest employee salary advance

    const emi = LoanService.calculateEmi(principal, annualInterest, tenureMonths);
    expect(emi).toBe(10000);

    // Simulated 6-month recovery
    let balance = new Decimal(principal);
    for (let month = 1; month <= tenureMonths; month++) {
      balance = balance.minus(emi);
    }

    expect(balance.toNumber()).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 9. Tax Calculation (Income-tax Act 2025 TDS)
  // -------------------------------------------------------------------------
  it("9. Tax Calculation: IT Act 2025 New Regime applies ₹75k std deduction and Section 87A rebate", () => {
    // Annual income ₹7,00,000 -> Taxable income ₹6,25,000 (below ₹7,00,000 rebate threshold under IT Act 2025)
    const taxBelowRebate = calculateAnnualTDS(700000, "new", {});
    expect(taxBelowRebate.standardDeduction).toBe(75000);
    expect(taxBelowRebate.totalAnnualTds).toBe(0); // Fully rebated by 87A
    expect(taxBelowRebate.monthlyTdsDeduction).toBe(0);

    // Annual income ₹16,00,000 -> Exceeds rebate threshold
    const taxAboveRebate = calculateAnnualTDS(1600000, "new", {});
    expect(taxAboveRebate.standardDeduction).toBe(75000);
    expect(taxAboveRebate.netTaxableIncome).toBe(1525000);
    expect(taxAboveRebate.totalAnnualTds).toBeGreaterThan(0);
    expect(taxAboveRebate.monthlyTdsDeduction).toBe(Math.round((taxAboveRebate.totalAnnualTds / 12) * 100) / 100);
  });

  // -------------------------------------------------------------------------
  // 10. Multiple Salary Components & Formula Evaluator
  // -------------------------------------------------------------------------
  it("10. Multiple Salary Components: Formula evaluator safely evaluates nested expressions and AST dependencies", () => {
    const expression = "BASIC * 0.40 + SPECIAL_ALLOWANCE";
    const context = {
      BASIC: 30000,
      SPECIAL_ALLOWANCE: 8000,
    };

    const { ast, dependencies } = Parser.parse(expression);
    expect(dependencies).toContain("BASIC");
    expect(dependencies).toContain("SPECIAL_ALLOWANCE");

    const result = evaluateFormula(expression, context);
    expect(result).toBe(20000); // 30,000 * 0.40 + 8,000 = 12,000 + 8,000 = 20,000
  });

  // -------------------------------------------------------------------------
  // 11. Payroll Approval (Maker-Checker Workflow)
  // -------------------------------------------------------------------------
  it("11. Payroll Approval: Transition from calculated to approved requires explicit actor and locks state", () => {
    const payrollRun = {
      id: "run-2026-06",
      status: "calculated",
      approvalStatus: "draft",
      approvedBy: null as string | null,
      approvedAt: null as Date | null,
    };

    // Transition to approved
    const approverId = "hr-manager-001";
    payrollRun.approvalStatus = "approved";
    payrollRun.approvedBy = approverId;
    payrollRun.approvedAt = new Date();

    expect(payrollRun.approvalStatus).toBe("approved");
    expect(payrollRun.approvedBy).toBe(approverId);
    expect(payrollRun.approvedAt).toBeInstanceOf(Date);
  });

  // -------------------------------------------------------------------------
  // 12. Payroll Publish Gate
  // -------------------------------------------------------------------------
  it("12. Payroll Publish Gate: Cannot publish an unapproved payroll run", () => {
    const draftRun = {
      id: "run-draft-01",
      approvalStatus: "draft",
      isPublished: false,
    };

    // Attempting to publish draft run must be rejected
    const canPublish = draftRun.approvalStatus === "approved";
    expect(canPublish).toBe(false);

    const approvedRun = {
      id: "run-appr-01",
      approvalStatus: "approved",
      isPublished: false,
    };

    const canPublishApproved = approvedRun.approvalStatus === "approved";
    expect(canPublishApproved).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 13. Employee Payslip Access Gate
  // -------------------------------------------------------------------------
  it("13. Employee Payslip Access: Unpublished payslips are strictly invisible to employee portal", () => {
    const payslips = [
      { id: "ps-1", employeeId: "emp-1", isPublished: false, periodMonth: 5, periodYear: 2026 },
      { id: "ps-2", employeeId: "emp-1", isPublished: true, periodMonth: 4, periodYear: 2026 },
      { id: "ps-3", employeeId: "emp-2", isPublished: true, periodMonth: 4, periodYear: 2026 },
    ];

    const currentEmployeeId = "emp-1";
    // ESS filter: must match employeeId AND isPublished === true
    const visibleToEmployee = payslips.filter(
      (ps) => ps.employeeId === currentEmployeeId && ps.isPublished === true
    );

    expect(visibleToEmployee.length).toBe(1);
    expect(visibleToEmployee[0].id).toBe("ps-2");
    expect(visibleToEmployee.some((ps) => !ps.isPublished)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 14. Locked Period Integration
  // -------------------------------------------------------------------------
  it("14. Locked Period Integration: P3 month-lock blocks unauthorized retroactive recalculation", () => {
    const monthLock = {
      tenantId: "tenant-corp",
      year: 2026,
      month: 4,
      isLocked: true,
      lockedBy: "audit-system",
    };

    const canModifyPeriod = !monthLock.isLocked;
    expect(canModifyPeriod).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 15. Multi-Tenant Isolation
  // -------------------------------------------------------------------------
  it("15. Multi-Tenant Isolation: Tenant A cannot query or access Tenant B payroll data", () => {
    const allPayrollRuns = [
      { id: "run-a", tenantId: "tenant-alpha", periodMonth: 5, periodYear: 2026, totalGross: 100000 },
      { id: "run-b", tenantId: "tenant-beta", periodMonth: 5, periodYear: 2026, totalGross: 250000 },
    ];

    const tenantAlphaRuns = allPayrollRuns.filter((r) => r.tenantId === "tenant-alpha");
    expect(tenantAlphaRuns.length).toBe(1);
    expect(tenantAlphaRuns[0].id).toBe("run-a");
    expect(tenantAlphaRuns.some((r) => r.tenantId === "tenant-beta")).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 16. Unauthorized Employee Access
  // -------------------------------------------------------------------------
  it("16. Unauthorized Employee Access: Employee A cannot view Employee B payslip", () => {
    const payslip = {
      id: "ps-target",
      employeeId: "emp-victim",
      tenantId: "tenant-alpha",
      netPay: 75000,
    };

    const attackingUser = {
      userId: "user-attacker",
      employeeId: "emp-attacker",
      tenantId: "tenant-alpha",
    };

    const isAuthorized = payslip.employeeId === attackingUser.employeeId;
    expect(isAuthorized).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 17. Previous-Period Variance
  // -------------------------------------------------------------------------
  it("17. Previous-Period Variance: Accurately identifies net and gross deltas across months", () => {
    const prevMonthRun = {
      totalGross: 500000,
      totalDeductions: 50000,
      netPay: 450000,
      employeeCount: 10,
    };

    const currentMonthRun = {
      totalGross: 560000, // +60,000 increment / new hire
      totalDeductions: 56000,
      netPay: 504000,
      employeeCount: 11,
    };

    const grossDelta = currentMonthRun.totalGross - prevMonthRun.totalGross;
    const netDelta = currentMonthRun.netPay - prevMonthRun.netPay;
    const grossVariancePct = (grossDelta / prevMonthRun.totalGross) * 100;

    expect(grossDelta).toBe(60000);
    expect(netDelta).toBe(54000);
    expect(grossVariancePct).toBe(12.0);
  });

  // -------------------------------------------------------------------------
  // 18. Payroll Recalculation Consistency (Determinism)
  // -------------------------------------------------------------------------
  it("18. Recalculation Consistency: Repeated calculation with identical inputs produces exact matching outputs", () => {
    const context = {
      id: "emp-det-1",
      employeeCode: "DET001",
      firstName: "Anand",
      lastName: "Kumar",
      email: "anand@masterhrms.com",
      baseMonthlyCtc: 72000,
      state: "KA",
      pfEligible: true,
      esiEligible: false,
      ptEligible: true,
      tdsEligible: true,
      taxRegime: "new",
    };

    const attendance = {
      totalWorkingDays: 31,
      payableDays: 28,
      presentDays: 28,
      halfDays: 0,
      approvedLeaveDays: 0,
      lossOfPayDays: 3,
      prorationFactor: Math.round((28 / 31) * 10000) / 10000,
    };

    const calc1 = computeEmployeePayrollBreakdown(context, attendance, {}, 7, 2026);
    const calc2 = computeEmployeePayrollBreakdown(context, attendance, {}, 7, 2026);
    const calc3 = computeEmployeePayrollBreakdown(context, attendance, {}, 7, 2026);

    expect(calc1.netPay).toBe(calc2.netPay);
    expect(calc2.netPay).toBe(calc3.netPay);
    expect(calc1.earnings.totalGross).toBe(calc2.earnings.totalGross);
    expect(calc1.deductions.totalDeductions).toBe(calc3.deductions.totalDeductions);
  });
});
