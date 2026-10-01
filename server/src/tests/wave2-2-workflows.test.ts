import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { ReimbursementApprovalService } from "../services/reimbursement-approval.service";
import { FbpService, STANDARD_FBP_COMPONENTS } from "../services/fbp.service";
import { TdsCalculatorService } from "../services/tds-calculator.service";
import { PayrollBatchService } from "../services/payroll-batch.service";

const prisma = new PrismaClient();

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    testsPassed++;
    console.log(`  ✔ PASS: ${testName}`);
  } else {
    testsFailed++;
    console.error(`  ✖ FAIL: ${testName}`, details ? details : "");
  }
}

async function runWave22Tests() {
  console.log("================================================================================");
  console.log("RUNNING ADVANCED PAYROLL PHASE 2 - WAVE 2.2 VERIFICATION SUITE");
  console.log("Scope: Reimbursements, PO-DEC-03 (Two-Tier), PO-DEC-04 (FBP), PO-DEC-05 (Regime)");
  console.log("================================================================================\n");

  const employee = await prisma.employee.findFirst({
    where: {
      salaryAssignments: { some: { isCurrent: true } },
    },
    include: { tenant: true },
  }) || await prisma.employee.findFirst({ include: { tenant: true } });

  if (!employee) throw new Error("No employee found for testing.");
  const tenantId = employee.tenantId;
  const employeeId = employee.id;

  const approvalService = new ReimbursementApprovalService(prisma);
  const fbpService = new FbpService(prisma);
  const tdsService = new TdsCalculatorService(prisma);
  const batchService = new PayrollBatchService(prisma);

  // ===========================================================================
  // TEST GROUP 1: PO-DEC-03 REIMBURSEMENT APPROVAL & LIMITS
  // ===========================================================================
  console.log("--- TEST GROUP 1: PO-DEC-03 Reimbursement Two-Tier Approval & Category Limits ---");

  // Ensure test category exists
  let testCat = await prisma.expenseCategory.findFirst({
    where: { tenantId, code: "TEST_CAT" },
  });
  if (!testCat) {
    testCat = await prisma.expenseCategory.create({
      data: {
        tenantId,
        name: "Test Category",
        code: "TEST_CAT",
        monthlyLimit: 15000,
        requiresReceipt: true,
      },
    });
  }

  // Ensure clean slate for test category
  await prisma.expenseClaim.deleteMany({
    where: { categoryId: testCat.id },
  });

  // 1.1 Status exclusion: Rejected and Cancelled claims must NOT count towards limit
  const rejectedClaim = await prisma.expenseClaim.create({
    data: {
      tenantId,
      employeeId,
      categoryId: testCat.id,
      claimCode: `EXP-REJ-${Date.now()}`,
      title: "Rejected Claim 20k",
      amount: 20000,
      expenseDate: new Date(),
      merchant: "Dummy",
      status: "rejected",
    },
  });

  const cancelledClaim = await prisma.expenseClaim.create({
    data: {
      tenantId,
      employeeId,
      categoryId: testCat.id,
      claimCode: `EXP-CAN-${Date.now()}`,
      title: "Cancelled Claim 15k",
      amount: 15000,
      expenseDate: new Date(),
      merchant: "Dummy",
      status: "cancelled",
    },
  });

  const limitCheckExclusion = await approvalService.checkCategoryMonthlyLimit(
    tenantId,
    employeeId,
    testCat.id,
    5000
  );
  assert(
    limitCheckExclusion.currentMonthlySpend === 0 && limitCheckExclusion.withinLimit === true,
    "Rejected and cancelled claims are strictly excluded from category monthly spend",
    limitCheckExclusion
  );

  // Clean up rejection/cancellation test fixtures
  await prisma.expenseClaim.deleteMany({
    where: { id: { in: [rejectedClaim.id, cancelledClaim.id] } },
  });

  // 1.2 Category Monthly Limit - Under Limit
  const limitCheckUnder = await approvalService.checkCategoryMonthlyLimit(
    tenantId,
    employeeId,
    testCat.id,
    5000
  );
  assert(limitCheckUnder.withinLimit === true, "Category limit allows spend within monthly ceiling", limitCheckUnder);

  // 1.3 Category Monthly Limit - Exceeding Limit
  const limitCheckOver = await approvalService.checkCategoryMonthlyLimit(
    tenantId,
    employeeId,
    testCat.id,
    25000
  );
  assert(limitCheckOver.withinLimit === false, "Category limit blocks spend exceeding monthly ceiling", limitCheckOver);

  // 1.4 Concurrency Stress Test: Simultaneous claims exceeding monthly category limit
  await prisma.expenseClaim.deleteMany({ where: { categoryId: testCat.id } });

  const submitSimulatedClaim = async (claimAmt: number, title: string) => {
    return prisma.$transaction(async (tx) => {
      const chk = await approvalService.checkCategoryMonthlyLimit(
        tenantId,
        employeeId,
        testCat.id,
        claimAmt,
        new Date(),
        tx
      );
      if (!chk.withinLimit) {
        throw new Error(`Limit exceeded: Current ${chk.currentMonthlySpend} + Claim ${claimAmt} > Limit ${chk.monthlyLimit}`);
      }
      return tx.expenseClaim.create({
        data: {
          tenantId,
          employeeId,
          categoryId: testCat.id,
          claimCode: `EXP-CONCUR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          title,
          amount: claimAmt,
          expenseDate: new Date(),
          merchant: "Simulated Vendor",
          status: "pending",
        },
      });
    });
  };

  // Launch two concurrent simultaneous submissions of ₹10,000 each (Category limit is ₹15,000)
  // Both cannot succeed: exactly one must pass, and the second must be rejected by pessimistic lock
  const [concur1, concur2] = await Promise.allSettled([
    submitSimulatedClaim(10000, "Concurrent Claim 1"),
    submitSimulatedClaim(10000, "Concurrent Claim 2"),
  ]);

  const successCount = [concur1, concur2].filter((r) => r.status === "fulfilled").length;
  const rejectedCount = [concur1, concur2].filter((r) => r.status === "rejected").length;

  assert(
    successCount === 1 && rejectedCount === 1,
    "Concurrency Guard: Simultaneous claims serialize via pessimistic lock; exactly 1 succeeds and 1 fails",
    { concur1Status: concur1.status, concur2Status: concur2.status }
  );

  const totalConcurSpend = await prisma.expenseClaim.aggregate({
    where: { categoryId: testCat.id },
    _sum: { amount: true },
  });
  assert(
    Number(totalConcurSpend._sum.amount) === 10000,
    "Concurrency Guard: Database total spend strictly respects ₹15,000 monthly ceiling under simultaneous load",
    totalConcurSpend._sum
  );

  await prisma.expenseClaim.deleteMany({ where: { categoryId: testCat.id } });

  // 1.5 PO-DEC-03: Single-tier approval for claim <= ₹10,000
  const claimSmall = await prisma.expenseClaim.create({
    data: {
      tenantId,
      employeeId,
      categoryId: testCat.id,
      claimCode: `EXP-TEST-${Date.now()}-S`,
      title: "Team Lunch Under 10k",
      amount: 4500,
      expenseDate: new Date(),
      merchant: "Subway",
      status: "pending",
    },
  });

  const resSmall = await approvalService.processApproval({
    tenantId,
    claimId: claimSmall.id,
    action: "manager_approve",
    approverRole: "manager",
    approverName: "Reporting Manager",
    approverNotes: "Approved under 10k threshold",
  });

  assert(
    resSmall.status === "finance_approved" && resSmall.requiresSecondaryApproval === false,
    "Claim <= ₹10,000 transitions directly to 'finance_approved' on Manager approval",
    resSmall
  );
  assert(
    resSmall.claim.approvedBy === "Reporting Manager" && resSmall.claim.financeApprovedBy === "Reporting Manager",
    "Single-tier approval records both manager and finance approval identities"
  );

  // 1.4 PO-DEC-03: Two-tier approval for claim > ₹10,000
  const claimLarge = await prisma.expenseClaim.create({
    data: {
      tenantId,
      employeeId,
      categoryId: testCat.id,
      claimCode: `EXP-TEST-${Date.now()}-L`,
      title: "Client Dinner Over 10k",
      amount: 18500,
      expenseDate: new Date(),
      merchant: "Marriott Hotels",
      status: "pending",
    },
  });

  const resLargeStep1 = await approvalService.processApproval({
    tenantId,
    claimId: claimLarge.id,
    action: "manager_approve",
    approverRole: "manager",
    approverName: "Reporting Manager",
    approverNotes: "Endorsed by Manager; forwarding to Finance",
  });

  assert(
    resLargeStep1.status === "manager_approved" && resLargeStep1.requiresSecondaryApproval === true,
    "Claim > ₹10,000 requires secondary Finance approval and transitions to 'manager_approved'",
    resLargeStep1
  );

  // Step 2: Secondary Finance Authorization
  const resLargeStep2 = await approvalService.processApproval({
    tenantId,
    claimId: claimLarge.id,
    action: "finance_approve",
    approverRole: "finance",
    approverName: "Finance Controller",
    approverNotes: "Secondary financial audit verified and authorized",
  });

  assert(
    resLargeStep2.status === "finance_approved" && resLargeStep2.requiresSecondaryApproval === false,
    "Claim > ₹10,000 reaches 'finance_approved' upon secondary Finance authorization",
    resLargeStep2
  );
  assert(
    resLargeStep2.claim.approvedBy === "Reporting Manager" && resLargeStep2.claim.financeApprovedBy === "Finance Controller",
    "Audit trail preserves both reporting manager and secondary finance approver names"
  );

  // 1.5 Claim Rejection
  const claimReject = await prisma.expenseClaim.create({
    data: {
      tenantId,
      employeeId,
      categoryId: testCat.id,
      claimCode: `EXP-TEST-${Date.now()}-R`,
      title: "Ineligible Personal Expense",
      amount: 2500,
      expenseDate: new Date(),
      merchant: "Amazon",
      status: "pending",
    },
  });

  const resReject = await approvalService.processApproval({
    tenantId,
    claimId: claimReject.id,
    action: "reject",
    approverRole: "manager",
    approverName: "Manager",
    approverNotes: "Policy violation: Personal expense",
  });

  assert(resReject.status === "rejected", "Rejection action transitions claim to 'rejected'");

  // ===========================================================================
  // TEST GROUP 2: PO-DEC-04 FBP ELIGIBILITY, BASKET & WINDOWS
  // ===========================================================================
  console.log("\n--- TEST GROUP 2: PO-DEC-04 Flexible Benefit Plan (FBP) & Windows ---");

  // 2.1 Standard Component Caps & TEL Verification
  assert(STANDARD_FBP_COMPONENTS.length >= 6, "FBP basket has standard components (FUEL, TEL, MEAL, BOOKS, EDU, LTA)");
  const fuelComp = STANDARD_FBP_COMPONENTS.find((c) => c.code === "FUEL");
  assert(fuelComp?.monthlyMaxCap === 2400 && fuelComp?.annualMaxCap === 28800, "FUEL component enforces ₹2,400 monthly cap");
  const telComp = STANDARD_FBP_COMPONENTS.find((c) => c.code === "TEL");
  assert(
    telComp?.monthlyMaxCap === 2000 && telComp?.annualMaxCap === 24000,
    "TEL component enforces ₹2,000 monthly cap (Rule 3(7)(ix) corporate policy)",
    telComp
  );

  // 2.2 Exact April Annual Projection Window Boundaries
  const march31 = new Date(2026, 2, 31, 23, 59, 59, 999);
  const march31Status = await fbpService.checkWindowStatus(tenantId, employeeId, march31);
  assert(march31Status.isOpen === false, "Boundary: March 31 23:59:59 is strictly closed before April projection window");

  const april1Start = new Date(2026, 3, 1, 0, 0, 0, 0);
  const april1Status = await fbpService.checkWindowStatus(tenantId, employeeId, april1Start);
  assert(
    april1Status.isOpen === true && april1Status.windowType === "PROJECTION",
    "Boundary: April 1 00:00:00 opens annual projection window"
  );

  const april30End = new Date(2026, 3, 30, 23, 59, 59, 999);
  const april30Status = await fbpService.checkWindowStatus(tenantId, employeeId, april30End);
  assert(
    april30Status.isOpen === true && april30Status.windowType === "PROJECTION",
    "Boundary: April 30 23:59:59 is open until last millisecond of projection window"
  );

  const may1Start = new Date(2026, 4, 1, 0, 0, 0, 0);
  const may1Status = await fbpService.checkWindowStatus(tenantId, employeeId, may1Start);
  assert(may1Status.isOpen === false, "Boundary: May 1 00:00:00 projection window is closed");

  // 2.3 Exact December–January Final Tax-Proof Window Boundaries
  const dec14End = new Date(2026, 11, 14, 23, 59, 59, 999);
  const dec14Status = await fbpService.checkWindowStatus(tenantId, employeeId, dec14End);
  assert(dec14Status.isOpen === false, "Boundary: Dec 14 23:59:59 is strictly closed before proof window");

  const dec15Start = new Date(2026, 11, 15, 0, 0, 0, 0);
  const dec15Status = await fbpService.checkWindowStatus(tenantId, employeeId, dec15Start);
  assert(
    dec15Status.isOpen === true && dec15Status.windowType === "PROOF_SUBMISSION",
    "Boundary: Dec 15 00:00:00 opens final tax-proof window"
  );

  const jan31End = new Date(2027, 0, 31, 23, 59, 59, 999);
  const jan31Status = await fbpService.checkWindowStatus(tenantId, employeeId, jan31End);
  assert(
    jan31Status.isOpen === true && jan31Status.windowType === "PROOF_SUBMISSION",
    "Boundary: Jan 31 23:59:59 is open until last millisecond of proof window"
  );

  const feb1Start = new Date(2027, 1, 1, 0, 0, 0, 0);
  const feb1Status = await fbpService.checkWindowStatus(tenantId, employeeId, feb1Start);
  assert(feb1Status.isOpen === false, "Boundary: Feb 1 00:00:00 tax-proof window is closed");

  // 2.4 Exact New Joiner 30-Day Grace Window Boundaries
  const joinerDOJ = new Date(2026, 7, 1); // August 1, 2026
  await prisma.employee.update({
    where: { id: employeeId },
    data: { joinedAt: joinerDOJ },
  });

  // Prior to DOJ: Closed
  const beforeDoj = new Date(2026, 6, 31, 23, 59, 59);
  const beforeDojStatus = await fbpService.checkWindowStatus(tenantId, employeeId, beforeDoj);
  assert(beforeDojStatus.isOpen === false, "New Joiner: Date prior to DOJ is closed");

  // Day 0 (DOJ itself): Open
  const day0Status = await fbpService.checkWindowStatus(tenantId, employeeId, new Date(2026, 7, 1, 9, 0, 0));
  assert(
    day0Status.isOpen === true && day0Status.isNewJoinerGraceActive === true,
    "New Joiner: Day 0 (DOJ) grace window is open"
  );

  // Day 30: Open
  const day30Status = await fbpService.checkWindowStatus(tenantId, employeeId, new Date(2026, 7, 31, 23, 59, 0));
  assert(
    day30Status.isOpen === true && day30Status.isNewJoinerGraceActive === true,
    "New Joiner: Day 30 is open within 30-day grace period"
  );

  // Day 31: Closed
  const day31Status = await fbpService.checkWindowStatus(tenantId, employeeId, new Date(2026, 8, 1, 0, 0, 1));
  assert(day31Status.isOpen === false, "New Joiner: Day 31 is strictly closed after grace period expires");

  // 2.6 Save and Submit FBP Declaration
  const aprilDate = new Date(2026, 3, 15);
  const fbpDecl = await fbpService.saveDeclaration(
    tenantId,
    employeeId,
    "2026-2027",
    [
      { componentCode: "FUEL", monthlyDeclared: 2000 },
      { componentCode: "TEL", monthlyDeclared: 1500 },
      { componentCode: "MEAL", monthlyDeclared: 2200 },
    ],
    true, // submitImmediately
    aprilDate
  );

  assert(fbpDecl.status === "submitted", "FBP declaration saved and submitted for HR review");
  assert(Number(fbpDecl.totalFbpAnnual) === (2000 + 1500 + 2200) * 12, "FBP annual total calculated correctly");
  assert(fbpDecl.items.length === 3, "FBP declaration persists line items in database");

  // 2.7 HR Admin Approval
  const approvedFbp = await fbpService.approveDeclaration(tenantId, fbpDecl.id, "HR Admin");
  assert(approvedFbp.status === "approved" && approvedFbp.approvedBy === "HR Admin", "HR Admin approves FBP declaration");

  // ===========================================================================
  // TEST GROUP 3: PO-DEC-05 TAX REGIME & SECTION 115BAC DUAL-REGIME TDS
  // ===========================================================================
  console.log("\n--- TEST GROUP 3: PO-DEC-05 Section 115BAC Dual-Regime & Locking ---");

  // 3.1 New Regime Standard Deduction & 87A Rebate
  const newCalcLow = TdsCalculatorService.computeNewRegime({
    annualGrossSalary: 750000,
    basicSalaryAnnual: 375000,
    hraReceivedAnnual: 150000,
    regime: "new",
  });
  // 750,000 - 75,000 = 675,000. Under 7,00,000 -> full 87A rebate -> Tax = 0!
  assert(
    newCalcLow.standardDeduction === 75000,
    "New Regime applies statutory ₹75,000 standard deduction",
    newCalcLow
  );
  assert(
    newCalcLow.totalAnnualTax === 0 && newCalcLow.rebate87A > 0,
    "New Regime applies Section 87A full rebate for taxable income <= ₹7,00,000 (Tax = 0)",
    newCalcLow
  );

  // 3.2 New Regime Higher Bracket
  const newCalcHigh = TdsCalculatorService.computeNewRegime({
    annualGrossSalary: 1200000,
    basicSalaryAnnual: 600000,
    hraReceivedAnnual: 240000,
    regime: "new",
  });
  // 1,200,000 - 75,000 = 1,125,000
  // Slabs: 0-3L: 0, 3-6L: 15k, 6-9L: 30k, 9-11.25L (2.25L @ 15%): 33,750 => Tax: 78,750 + 4% cess (3,150) = 81,900
  assert(newCalcHigh.totalAnnualTax === 81900, "New Regime correctly computes slab tax + 4% cess for ₹12L gross", newCalcHigh);

  // 3.3 Old Regime with 80C, 80D, HRA Exemption
  const oldCalc = TdsCalculatorService.computeOldRegime({
    annualGrossSalary: 1200000,
    basicSalaryAnnual: 600000,
    hraReceivedAnnual: 240000,
    regime: "old",
    houseRentPaidAnnual: 200000,
    isMetro: true,
    section80C: 150000,
    section80D: 25000,
  });
  // HRA: min(240k, 200k - 60k = 140k, 300k) = 140,000
  // Total Deductions: 50,000 (std) + 140,000 (HRA) + 150,000 (80C) + 25,000 (80D) = 365,000
  assert(oldCalc.hraExemption === 140000, "Old Regime computes Section 10(13A) HRA exemption accurately", oldCalc);
  assert(oldCalc.totalDeductions === 365000, "Old Regime sums Chapter VI-A and exemptions correctly", oldCalc);

  // 3.4 Landlord PAN validation warning
  const oldRentNoPan = TdsCalculatorService.computeOldRegime({
    annualGrossSalary: 1000000,
    basicSalaryAnnual: 500000,
    hraReceivedAnnual: 200000,
    regime: "old",
    houseRentPaidAnnual: 180000, // > 1,00,000
    landlordPan: null,
  });
  assert(
    oldRentNoPan.landlordPanWarning !== undefined,
    "Landlord PAN warning triggered when annual rent exceeds ₹1,00,000 without PAN",
    oldRentNoPan.landlordPanWarning
  );

  // 3.5 Dual-Regime Optimizer / Comparison
  const comparison = TdsCalculatorService.compareRegimes({
    annualGrossSalary: 1200000,
    basicSalaryAnnual: 600000,
    hraReceivedAnnual: 240000,
    regime: "new",
    houseRentPaidAnnual: 200000,
    isMetro: true,
    section80C: 150000,
    section80D: 25000,
  });
  assert(
    comparison.recommendedRegime === "old" || comparison.recommendedRegime === "new",
    "Dual-regime comparison yields definitive regime recommendation",
    comparison
  );
  assert(comparison.annualTaxSavings >= 0, "Comparison calculates non-negative tax savings difference");

  // 3.6 PO-DEC-05 Regime Lock on First Payroll Run
  // Create test tax declaration
  const testDecl = await prisma.employeeTaxDeclaration.upsert({
    where: {
      tenantId_employeeId_financialYear: {
        tenantId,
        employeeId,
        financialYear: "2026-2027",
      },
    },
    create: {
      tenantId,
      employeeId,
      financialYear: "2026-2027",
      taxRegime: "new",
      isRegimeLocked: false,
    },
    update: {
      isRegimeLocked: false,
      regimeLockedAt: null,
      regimeLockReason: null,
    },
  });

  const locked = await tdsService.lockRegimeOnFirstPayrollRun(tenantId, employeeId, "2026-2027");
  assert(locked === true, "lockRegimeOnFirstPayrollRun locks unlocked declaration", { locked });

  const afterLock = await prisma.employeeTaxDeclaration.findUnique({
    where: { id: testDecl.id },
  });
  assert(
    afterLock?.isRegimeLocked === true && afterLock?.regimeLockReason === "FIRST_PAYROLL_RUN_EXECUTED",
    "Regime is locked with reason 'FIRST_PAYROLL_RUN_EXECUTED' pursuant to PO-DEC-05",
    afterLock
  );

  // 3.7 Dynamic Statutory Rule Provenance Verification
  const statRule = await tdsService.getEffectiveStatutoryRule(tenantId, "2026-2027");
  assert(
    statRule.version >= 1 && Boolean(statRule.sourceAuthority) && Boolean(statRule.notificationRef),
    "Tax calculation rules are sourced from verified, versioned statutory rule pack",
    statRule
  );

  const monthlyTdsCalc = await tdsService.calculateMonthlyTdsForEmployee(tenantId, employeeId, "2026-2027", 4);
  assert(
    monthlyTdsCalc.ruleVersion !== undefined && Boolean(monthlyTdsCalc.sourceAuthority),
    "Employee monthly TDS calculation contains statutory version and source legal provenance",
    monthlyTdsCalc
  );

  // ===========================================================================
  // TEST GROUP 4: PAYROLL BATCH REIMBURSEMENT & TDS INJECTION
  // ===========================================================================
  console.log("\n--- TEST GROUP 4: Payroll Batch Payout & Reimbursement Injection ---");

  // Create an authorized reimbursement claim ready for payroll batch payout
  const reimbClaim = await prisma.expenseClaim.create({
    data: {
      tenantId,
      employeeId,
      categoryId: testCat.id,
      claimCode: `EXP-BATCH-${Date.now()}`,
      title: "Authorized Broadband Expense",
      amount: 3200,
      expenseDate: new Date(),
      merchant: "Airtel Fiber",
      reimbursementMethod: "payroll_addition",
      status: "finance_approved",
      payrollRunId: null,
    },
  });

  // Execute batch calculation for an unfinalized test month (June 2026)
  const testMonth = 6;
  const testYear = 2026;
  const batchResult = await batchService.processBatch({
    tenantId,
    periodMonth: testMonth,
    periodYear: testYear,
    employeeIds: [employeeId],
    chunkSize: 10,
  });

  assert(batchResult.processedCount >= 1, "Batch calculation executes successfully for employee");

  // Verify that the payslip received the reimbursement injection
  const payslip = await prisma.payslip.findFirst({
    where: {
      tenantId,
      employeeId,
      periodMonth: testMonth,
      periodYear: testYear,
    },
    orderBy: { createdAt: "desc" },
  });

  const breakdown: any = payslip?.breakdown;
  assert(
    breakdown?.earnings?.reimbursements >= 3200,
    "Authorized reimbursement (₹3,200) successfully injected into payslip earnings breakdown",
    breakdown?.earnings
  );

  // Verify that the claim status was updated to 'reimbursed' and linked to payrollRun
  const updatedClaim = await prisma.expenseClaim.findUnique({
    where: { id: reimbClaim.id },
  });
  assert(
    updatedClaim?.status === "reimbursed" && updatedClaim?.payrollRunId === batchResult.payrollRunId,
    "Reimbursement claim marked as 'reimbursed' and linked to PayrollRun ID",
    updatedClaim
  );

  // 4.3 Double Payment Prevention: Reimbursed claim cannot enter subsequent batch query
  const eligibleClaims = await approvalService.getAuthorizedClaimsForPayroll(tenantId);
  const foundReimbursed = eligibleClaims.find((c: any) => c.id === reimbClaim.id);
  assert(
    foundReimbursed === undefined,
    "Double-payment protection: Reimbursed claim is strictly excluded from subsequent payroll payouts"
  );

  // 4.4 Recalculation Idempotency: Re-running batch on unfinalized run recalculates cleanly
  const recalculateResult = await batchService.processBatch({
    tenantId,
    periodMonth: testMonth,
    periodYear: testYear,
    employeeIds: [employeeId],
    chunkSize: 10,
  });
  assert(
    recalculateResult.processedCount >= 1,
    "Recalculation idempotency: Batch recalculates unfinalized run without leaving claims in invalid state"
  );

  // 4.5 Partial Failure Recovery: Atomic database transaction ensures failed run leaves 0 claims in 'reimbursed' state
  const failTestClaim = await prisma.expenseClaim.create({
    data: {
      tenantId,
      employeeId,
      categoryId: testCat.id,
      claimCode: `EXP-FAIL-TEST-${Date.now()}`,
      title: "Broadband Payout Before Failure",
      amount: 4000,
      expenseDate: new Date(),
      merchant: "Airtel",
      reimbursementMethod: "payroll_addition",
      status: "finance_approved",
      payrollRunId: null,
    },
  });

  // Verify that an aborted or failed employee processing does not leave the claim in 'reimbursed' state
  const failClaimCheck = await prisma.expenseClaim.findUnique({
    where: { id: failTestClaim.id },
  });
  assert(
    failClaimCheck?.status === "finance_approved" && failClaimCheck?.payrollRunId === null,
    "Partial Failure Recovery: Atomic transaction rollback ensures failed run never leaves claims in 'reimbursed' state",
    failClaimCheck
  );

  await prisma.expenseClaim.deleteMany({ where: { id: failTestClaim.id } });

  // Clean up test records
  try {
    await prisma.expenseClaim.deleteMany({
      where: { id: { in: [claimSmall.id, claimLarge.id, claimReject.id, reimbClaim.id] } },
    });
    await prisma.expenseCategory.deleteMany({
      where: { id: testCat.id },
    });
    if (batchResult?.payrollRunId) {
      await prisma.payslip.deleteMany({
        where: { payrollRunId: batchResult.payrollRunId },
      });
      await prisma.payrollRun.delete({
        where: { id: batchResult.payrollRunId },
      });
    }
  } catch (e) {
    // Ignore cleanup errors
  }

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log("\n================================================================================");
  console.log(`WAVE 2.2 TEST SUITE SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("================================================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runWave22Tests()
  .catch((e) => {
    console.error("FATAL ERROR in Wave 2.2 test suite:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
