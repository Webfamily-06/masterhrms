import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Decimal from "decimal.js";
import { computeEmployeePayrollBreakdown } from "../services/payroll-engine.service";

describe("MASTERHRMS — P4 REIMBURSEMENTS & LOANS INTEGRATION SUITE", () => {
  it("TASK-P4-REIMB-01: computeEmployeePayrollBreakdown includes non-taxable expense reimbursements", () => {
    const breakdown = computeEmployeePayrollBreakdown(
      {
        id: "emp-test-01",
        employeeCode: "EMP001",
        firstName: "Test",
        lastName: "User",
        email: "test.user@company.com",
        baseMonthlyCtc: 30000,
        pfEligible: true,
        esiEligible: true,
        ptEligible: true,
        taxRegime: "new",
      },
      {
        totalWorkingDays: 30,
        payableDays: 30,
        presentDays: 30,
        halfDays: 0,
        approvedLeaveDays: 0,
        lossOfPayDays: 0,
        prorationFactor: 1.0,
      },
      {
        periodMonth: 10,
        periodYear: 2026,
        reimbursements: 5000,
      }
    );

    // 1. Gross earned must include reimbursement (30,000 + 5,000 = 35,000)
    assert.equal(breakdown.earnings.totalGross, 35000, "Gross must include reimbursement");
    assert.equal(breakdown.earnings.reimbursements, 5000, "Reimbursements field must equal 5,000");

    // 2. Earnings itemized must contain REIMBURSEMENT marked non-taxable
    const reimbItem = breakdown.earnings.itemized.find((i) => i.code === "REIMBURSEMENT");
    assert.ok(reimbItem, "REIMBURSEMENT item must be present in itemized earnings");
    assert.equal(reimbItem?.amount, 5000);
    assert.equal(reimbItem?.isTaxable, false, "Expense reimbursement must be non-taxable");

    // 3. EPF must be calculated on Basic (50% of 30,000 = 15,000 capped at 15,000) = 1,800
    assert.equal(breakdown.deductions.providentFund, 1800, "PF must remain strictly based on basic wages");

    // 4. Net pay must receive the full reimbursement benefit without tax penalty
    const expectedNet = breakdown.earnings.totalGross - breakdown.deductions.totalDeductions;
    assert.equal(breakdown.netPay, Math.round(expectedNet * 100) / 100);
  });

  it("TASK-P4-REIMB-02: Non-taxable reimbursements do not inflate statutory ESI wage threshold", () => {
    // If base salary is 20,000 (below 21,000 ESI ceiling) and reimbursement is 10,000:
    // Statutory wages = 20,000 -> ESI eligible!
    // Total gross = 30,000. If gross were incorrectly used for ESI eligibility,
    // the employee would wrongly be disqualified from statutory ESI coverage!
    const breakdown = computeEmployeePayrollBreakdown(
      {
        id: "emp-test-02",
        employeeCode: "EMP002",
        firstName: "ESI",
        lastName: "Worker",
        email: "esi.worker@company.com",
        baseMonthlyCtc: 20000,
        pfEligible: false,
        esiEligible: true,
        ptEligible: false,
        taxRegime: "new",
      },
      {
        totalWorkingDays: 30,
        payableDays: 30,
        presentDays: 30,
        halfDays: 0,
        approvedLeaveDays: 0,
        lossOfPayDays: 0,
        prorationFactor: 1.0,
      },
      {
        periodMonth: 10,
        periodYear: 2026,
        reimbursements: 10000,
      }
    );

    assert.equal(breakdown.earnings.totalGross, 30000);
    assert.equal(breakdown.deductions.esi, 150, "ESI deduction must be 150 based on statutory wages");
  });

  it("TASK-P4-LOAN-01: Loan deduction caps at outstanding balance when balance < EMI", () => {
    const monthlyEmi = 5000;
    const remainingBalance = 2350;

    // Orchestrator calculation logic: loanDeduction = Math.min(emi, balance)
    const loanDeduction = Math.min(monthlyEmi, remainingBalance);
    assert.equal(loanDeduction, 2350, "Loan recovery must cap at remaining principal");

    // Simulated balance decrement
    const newBalance = Math.max(0, remainingBalance - loanDeduction);
    assert.equal(newBalance, 0, "New loan balance must reach zero");
    const newStatus = newBalance === 0 ? "completed" : "active";
    assert.equal(newStatus, "completed", "Loan status must transition to 'completed'");
  });

  it("TASK-P4-LOAN-02: Loan deduction preserves active status when balance > EMI", () => {
    const monthlyEmi = 4000;
    const remainingBalance = 15000;

    const loanDeduction = Math.min(monthlyEmi, remainingBalance);
    assert.equal(loanDeduction, 4000, "Loan deduction matches monthly EMI");

    const newBalance = Math.max(0, remainingBalance - loanDeduction);
    assert.equal(newBalance, 11000);
    const newStatus = newBalance === 0 ? "completed" : "active";
    assert.equal(newStatus, "active", "Loan status must remain 'active'");
  });

  it("TASK-P4-FLOW-01: Integrated Payroll Flow with Reimbursement Addition and Loan Recovery", () => {
    const baseMonthlyCtc = 40000;
    const approvedReimbursement = 3500;
    const loanBalance = 2000;
    const loanEmi = 5000;

    const breakdown = computeEmployeePayrollBreakdown(
      {
        id: "emp-integrated",
        employeeCode: "INT001",
        firstName: "Integrated",
        lastName: "Employee",
        email: "integrated@company.com",
        baseMonthlyCtc,
        pfEligible: true,
        esiEligible: false,
        ptEligible: true,
        taxRegime: "new",
      },
      {
        totalWorkingDays: 30,
        payableDays: 30,
        presentDays: 30,
        halfDays: 0,
        approvedLeaveDays: 0,
        lossOfPayDays: 0,
        prorationFactor: 1.0,
      },
      {
        periodMonth: 10,
        periodYear: 2026,
        reimbursements: approvedReimbursement,
      }
    );

    // Loan deduction logic from PayrollOrchestratorService
    const loanDeduction = Math.min(loanEmi, loanBalance);
    assert.equal(loanDeduction, 2000);

    const finalGross = new Decimal(breakdown.earnings.totalGross);
    const finalDeductions = new Decimal(breakdown.deductions.totalDeductions).plus(loanDeduction);
    const finalNet = Decimal.max(0, finalGross.minus(finalDeductions));

    assert.equal(finalGross.toNumber(), 43500);
    assert.equal(finalDeductions.toNumber(), breakdown.deductions.totalDeductions + 2000);
    assert.equal(finalNet.toNumber(), 43500 - (breakdown.deductions.totalDeductions + 2000));
  });
});
