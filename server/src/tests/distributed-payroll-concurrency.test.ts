import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { prisma, rawPrisma } from "../prisma";
import { runWithTenantContext, TenantContext } from "../context/tenant-context";
import { PayrollOrchestratorService } from "../services/payroll-orchestrator.service";
import { autoPostPayrollToLedger } from "../services/ledger-posting.service";
import { ContractInvoiceService } from "../services/contract-invoice.service";
import { ContractBillingService } from "../services/contract-billing.service";

const db = rawPrisma || prisma;

/**
 * ============================================================================
 * AUD-CONC-002: DISTRIBUTED PAYROLL LOCKING & CONCURRENCY TEST SUITE
 * ============================================================================
 * 
 * Verifies against the real PostgreSQL database:
 * 1. Multi-worker atomic conditional claiming via updateMany (claim-check pattern).
 * 2. Fail-closed concurrency protection (HTTP 409 Conflict) on concurrent requests.
 * 3. Finalized cycle immutability rejection (HTTP 409 Conflict).
 * 4. General Ledger posting idempotency (single journal entry).
 * 5. REM-03: Real PostgreSQL employee loan deduction concurrency and idempotency.
 * 6. Contract invoice generation idempotency (returns existing invoices without failure).
 * 7. Crash recovery threshold guard and safe rollforward / rollback.
 * 8. REM-01: Crash recovery GL backfill, duplicate avoidance, and double-entry validation.
 * 9. REM-01: Concurrent crash recovery race condition protection.
 * 10. REM-01: Tenant isolation and post-recovery retry immutability.
 */

describe("AUD-CONC-002: Distributed Payroll Locking & PostgreSQL Concurrency Suite", () => {
  let testTenantId = "tenant-default-001";
  let testEmployeeId = "";
  let concRunId = "";
  const testMonth = 11;
  const testYear = 2026;
  const actor = {
    id: "user-conc-cfo",
    email: "cfo.concurrency@company.test",
    role: "finance_director",
  };

  const getTenantCtx = (tId: string): TenantContext => ({
    tenantId: tId,
    userId: actor.id,
    roles: [actor.role],
    status: "ACTIVE",
    tenancyStrategy: "SHARED_SCHEMA",
    db: rawPrisma,
  });

  before(async () => {
    // 1. Resolve active tenant with employees
    const t =
      (await db.tenant.findFirst({
        where: { id: "tenant-default-001", employees: { some: {} } },
      })) ||
      (await db.tenant.findFirst({ where: { employees: { some: {} } } })) ||
      (await db.tenant.findFirst());

    if (t) {
      testTenantId = t.id;
    }

    // Resolve active employee for foreign key relations
    const emp =
      (await db.employee.findFirst({
        where: { tenantId: testTenantId },
        select: { id: true, employeeCode: true, tenantId: true },
      })) ||
      (await db.employee.findFirst({
        select: { id: true, employeeCode: true, tenantId: true },
      }));

    if (emp) {
      testEmployeeId = emp.id;
      if (emp.tenantId && emp.tenantId !== testTenantId) {
        testTenantId = emp.tenantId;
      }
    }

    // 2. Clean up test runs for test period (Month 11, 2026)
    const existing = await db.payrollRun.findMany({
      where: {
        tenantId: testTenantId,
        periodMonth: testMonth,
        periodYear: testYear,
      },
    });

    for (const r of existing) {
      await db.payrollSnapshot.deleteMany({ where: { payrollRunId: r.id } });
      await db.payslip.deleteMany({ where: { payrollRunId: r.id } });
      await db.journalItem.deleteMany({ where: { journalEntry: { reference: r.id } } });
      await db.journalEntry.deleteMany({ where: { reference: r.id } });
      await db.payrollRun.delete({ where: { id: r.id } });
    }

    // 3. Create a clean APPROVED payroll run ready for finalization
    const created = await db.payrollRun.create({
      data: {
        tenantId: testTenantId,
        periodMonth: testMonth,
        periodYear: testYear,
        status: "processing",
        approvalStatus: "APPROVED",
        employeeCount: 1,
        totalAmount: 50000,
        totalNet: 45000,
        totalDeductions: 5000,
        approvedBy: "cfo@company.test",
        approvedAt: new Date(),
      },
    });

    concRunId = created.id;

    // Create 1 payslip & 1 snapshot
    const empId = testEmployeeId || "EMP-CONC-01";

    await db.payslip.create({
      data: {
        tenantId: testTenantId,
        payrollRunId: concRunId,
        employeeId: empId,
        periodMonth: testMonth,
        periodYear: testYear,
        grossSalary: 50000,
        netSalary: 45000,
        deductions: 5000,
        status: "generated",
        breakdown: {
          baseMonthlyCtc: 50000,
          grossSalary: 50000,
          netSalary: 45000,
          loanRecovery: 0,
        },
      },
    });

    await db.payrollSnapshot.create({
      data: {
        tenantId: testTenantId,
        payrollRunId: concRunId,
        employeeId: empId,
        periodMonth: testMonth,
        periodYear: testYear,
        snapshotData: { baseMonthlyCtc: 50000 },
        ctcAnnual: 600000,
        grossEarned: 50000,
        totalDeductions: 5000,
        netPay: 45000,
        isLocked: false,
      },
    });
  });

  after(async () => {
    // Cleanup created test records
    try {
      if (concRunId) {
        await db.payrollSnapshot.deleteMany({ where: { payrollRunId: concRunId } });
        await db.payslip.deleteMany({ where: { payrollRunId: concRunId } });
        await db.journalItem.deleteMany({ where: { journalEntry: { reference: concRunId } } });
        await db.journalEntry.deleteMany({ where: { reference: concRunId } });
        await db.payrollRun.deleteMany({ where: { id: concRunId } });
      }
    } catch {
      // Ignored in cleanup
    }
  });

  // =========================================================================
  // 1. CONCURRENCY: MULTI-WORKER ATOMIC CONDITIONAL CLAIM
  // =========================================================================
  it("CONC-01: Multiple concurrent workers attempting to finalize the same cycle - exactly ONE claims, others fail with 409 Conflict", async () => {
    let successfulClaims = 0;
    let conflictErrors = 0;
    const concurrentWorkers = 5;

    // Launch 5 simultaneous parallel requests directly against PostgreSQL
    const workerPromises = Array.from({ length: concurrentWorkers }).map(async (_, idx) => {
      try {
        const result = await PayrollOrchestratorService.finalizePayroll(
          testTenantId,
          concRunId,
          {
            id: `actor-worker-${idx}`,
            email: `worker-${idx}@company.test`,
            role: "finance_director",
          }
        );
        if (result && result.run) {
          successfulClaims++;
        }
      } catch (err: any) {
        if (err.statusCode === 409 || err.message?.includes("already finalized or currently being processed")) {
          conflictErrors++;
        } else {
          throw err;
        }
      }
    });

    await Promise.all(workerPromises);

    assert.strictEqual(
      successfulClaims,
      1,
      "CRITICAL: Exactly ONE worker must acquire the atomic claim on the payroll cycle"
    );
    assert.strictEqual(
      conflictErrors,
      concurrentWorkers - 1,
      "CRITICAL: All other concurrent workers must fail-closed with HTTP 409 Conflict"
    );

    // Verify cycle state in PostgreSQL
    const inDb = await db.payrollRun.findUnique({ where: { id: concRunId } });
    assert.ok(
      inDb?.approvalStatus === "CLOSED" || inDb?.approvalStatus === "OUTPUTS_GENERATED",
      `Expected cycle to be in finalized state, found: ${inDb?.approvalStatus}`
    );
  });

  // =========================================================================
  // 2. CONCURRENCY: HIGH-CONCURRENCY RACE CONDITION (20 WORKERS)
  // =========================================================================
  it("CONC-02: High-concurrency race condition: 20 parallel finalization attempts on APPROVED cycle - zero double finalizations", async () => {
    // Create a fresh test run for high-concurrency race test
    const raceRun = await db.payrollRun.create({
      data: {
        tenantId: testTenantId,
        periodMonth: 10,
        periodYear: 2026,
        status: "processing",
        approvalStatus: "APPROVED",
        employeeCount: 1,
        totalAmount: 30000,
        totalNet: 27000,
        totalDeductions: 3000,
      },
    });

    const empId = testEmployeeId || "EMP-CONC-01";
    await db.payslip.create({
      data: {
        tenantId: testTenantId,
        payrollRunId: raceRun.id,
        employeeId: empId,
        periodMonth: 10,
        periodYear: 2026,
        grossSalary: 30000,
        netSalary: 27000,
        deductions: 3000,
        status: "generated",
        breakdown: { baseMonthlyCtc: 30000, grossSalary: 30000, netSalary: 27000, loanRecovery: 0 },
      },
    });

    await db.payrollSnapshot.create({
      data: {
        tenantId: testTenantId,
        payrollRunId: raceRun.id,
        employeeId: empId,
        periodMonth: 10,
        periodYear: 2026,
        snapshotData: { baseMonthlyCtc: 30000 },
        ctcAnnual: 360000,
        grossEarned: 30000,
        totalDeductions: 3000,
        netPay: 27000,
        isLocked: false,
      },
    });

    try {
      let claims = 0;
      let conflicts = 0;
      const workers = 20;

      await Promise.all(
        Array.from({ length: workers }).map(async (_, idx) => {
          try {
            await PayrollOrchestratorService.finalizePayroll(
              testTenantId,
              raceRun.id,
              {
                id: `race-actor-${idx}`,
                email: `race-${idx}@company.test`,
                role: "finance_director",
              }
            );
            claims++;
          } catch (err: any) {
            if (err.statusCode === 409) {
              conflicts++;
            }
          }
        })
      );

      assert.strictEqual(claims, 1, "Under 20 concurrent workers, exactly 1 claim succeeds");
      assert.strictEqual(conflicts, 19, "Under 20 concurrent workers, exactly 19 receive 409 Conflict");
    } finally {
      await db.payrollSnapshot.deleteMany({ where: { payrollRunId: raceRun.id } });
      await db.payslip.deleteMany({ where: { payrollRunId: raceRun.id } });
      await db.journalItem.deleteMany({ where: { journalEntry: { reference: raceRun.id } } });
      await db.journalEntry.deleteMany({ where: { reference: raceRun.id } });
      await db.payrollRun.delete({ where: { id: raceRun.id } });
    }
  });

  // =========================================================================
  // 3. FINANCIAL IDEMPOTENCY: GENERAL LEDGER POSTING
  // =========================================================================
  it("CONC-03: General Ledger auto-posting idempotency - second call with identical payrollRunId is a no-op", async () => {
    const glRunId = `RUN-GL-TEST-${Date.now()}`;

    await runWithTenantContext(getTenantCtx(testTenantId), async () => {
      // First posting
      await autoPostPayrollToLedger({
        tenantId: testTenantId,
        payrollRunId: glRunId,
        period: "11/2026",
        totalGross: 50000,
        totalNet: 45000,
        totalDeductions: 5000,
      });

      const countAfterFirst = await db.journalEntry.count({
        where: { tenantId: testTenantId, reference: glRunId },
      });
      assert.strictEqual(countAfterFirst, 1, "First posting must create exactly 1 JournalEntry");

      // Second duplicate posting
      await autoPostPayrollToLedger({
        tenantId: testTenantId,
        payrollRunId: glRunId,
        period: "11/2026",
        totalGross: 50000,
        totalNet: 45000,
        totalDeductions: 5000,
      });

      const countAfterSecond = await db.journalEntry.count({
        where: { tenantId: testTenantId, reference: glRunId },
      });
      assert.strictEqual(
        countAfterSecond,
        1,
        "CRITICAL: Second posting must be a no-op (JournalEntry count remains exactly 1)"
      );

      // Clean up test entry
      await db.journalItem.deleteMany({
        where: { journalEntry: { reference: glRunId } },
      });
      await db.journalEntry.deleteMany({
        where: { tenantId: testTenantId, reference: glRunId },
      });
    });
  });

  // =========================================================================
  // 4. REM-03: REAL POSTGRESQL EMPLOYEE LOAN RECOVERY CONCURRENCY & IDEMPOTENCY
  // =========================================================================
  it("CONC-04: REM-03: Real PostgreSQL Loan Concurrency - two concurrent deduction transactions create exactly ONE installment and decrement balance exactly once", async () => {
    assert.ok(testEmployeeId, "A real PostgreSQL Employee fixture must exist for loan concurrency test");

    // 1. Create real EmployeeLoan fixture directly in PostgreSQL
    const loan = await db.employeeLoan.create({
      data: {
        tenantId: testTenantId,
        employeeId: testEmployeeId,
        loanType: "personal",
        principal: 20000,
        outstandingBalance: 20000,
        monthlyEmi: 5000,
        tenureMonths: 4,
        status: "active",
        deductionStartMonth: "2026-11",
      },
    });

    const testLoanRunId = `RUN-LOAN-CONC-${Date.now()}`;
    const emiAmount = 5000;

    try {
      // 2. Simulated loan recovery execution (mirroring finalizePayrollCycle transaction logic)
      const executeLoanRecovery = async () => {
        return db.$transaction(async (tx: any) => {
          const activeLoan = await tx.employeeLoan.findFirst({
            where: {
              id: loan.id,
              tenantId: testTenantId,
              status: "active",
              outstandingBalance: { gt: 0 },
            },
          });

          if (!activeLoan) return { status: "NO_ACTIVE_LOAN" };

          // Serialize concurrent deductions for this loan via PostgreSQL transaction advisory lock
          await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('loan_${loan.id}'))`);

          const existingInstallment = await tx.loanInstallment.findFirst({
            where: {
              loanId: activeLoan.id,
              payrollRunId: testLoanRunId,
            },
          });

          if (existingInstallment) {
            return { status: "ALREADY_DEDUCTED", installmentId: existingInstallment.id };
          }

          const currentBal = Number(activeLoan.outstandingBalance);
          const newBal = Math.max(0, currentBal - emiAmount);

          await tx.employeeLoan.update({
            where: { id: activeLoan.id },
            data: {
              outstandingBalance: newBal,
              status: newBal === 0 ? "completed" : "active",
            },
          });

          const count = await tx.loanInstallment.count({ where: { loanId: activeLoan.id } });
          const inst = await tx.loanInstallment.create({
            data: {
              loanId: activeLoan.id,
              tenantId: testTenantId,
              installmentNumber: count + 1,
              periodMonth: 11,
              periodYear: 2026,
              emiAmount,
              principalComponent: emiAmount,
              interestComponent: 0,
              status: "paid",
              payrollRunId: testLoanRunId,
              deductedAt: new Date(),
            },
          });

          return { status: "DEDUCTED", installmentId: inst.id };
        });
      };

      // 3. Execute two concurrent transactions through independent promises against PostgreSQL
      await Promise.all([
        executeLoanRecovery(),
        executeLoanRecovery(),
      ]);

      // 4. Verify in PostgreSQL database
      const persistedLoan = await db.employeeLoan.findUnique({
        where: { id: loan.id },
      });
      const persistedInstallments = await db.loanInstallment.findMany({
        where: { loanId: loan.id, payrollRunId: testLoanRunId },
      });

      assert.strictEqual(
        Number(persistedLoan?.outstandingBalance),
        15000,
        "CRITICAL: Real PostgreSQL loan balance must decrease by exactly ₹5,000 (from ₹20,000 to ₹15,000), not double-decremented"
      );
      assert.strictEqual(
        persistedInstallments.length,
        1,
        "CRITICAL: Exactly ONE LoanInstallment must exist in PostgreSQL for this payroll run"
      );

      // 5. Test retry idempotency: repeated execution with identical payrollRunId
      const retryResult = await executeLoanRecovery();
      assert.strictEqual(retryResult.status, "ALREADY_DEDUCTED");

      const finalLoan = await db.employeeLoan.findUnique({
        where: { id: loan.id },
      });
      const finalInstallments = await db.loanInstallment.findMany({
        where: { loanId: loan.id, payrollRunId: testLoanRunId },
      });

      assert.strictEqual(
        Number(finalLoan?.outstandingBalance),
        15000,
        "Retry execution must preserve loan balance (Idempotency intact)"
      );
      assert.strictEqual(finalInstallments.length, 1);
    } finally {
      // 6. Safe cleanup of PostgreSQL test fixtures
      await db.loanInstallment.deleteMany({ where: { loanId: loan.id } });
      await db.employeeLoan.delete({ where: { id: loan.id } });
    }
  });

  // =========================================================================
  // 5. CONTRACT STAFFING INVOICE IDEMPOTENCY
  // =========================================================================
  it("CONC-05: Contract invoice generation idempotency - existing invoice returned safely without throwing or duplicating", async () => {
    await runWithTenantContext(getTenantCtx(testTenantId), async () => {
      // Create a mock sale representing an already generated staffing invoice
      const existingSale = await db.sale.create({
        data: {
          tenantId: testTenantId,
          invoiceNo: "INV-202611-TEST-001",
          type: "staffing_billing",
          subtotal: 100000,
          totalTax: 18000,
          total: 118000,
          paidAmount: 0,
          paymentStatus: "unpaid",
          notes: JSON.stringify({
            source: "STAFFING_PAYROLL_AUTOMATION",
            payrollRunId: concRunId,
            clientId: "CLIENT-001",
            workflowStatus: "DRAFT",
          }),
        },
      });

      try {
        const originalManifest = (ContractBillingService as any).generateRunBillingManifest;
        (ContractBillingService as any).generateRunBillingManifest = async () => ({
          payrollRunId: concRunId,
          periodMonth: 11,
          periodYear: 2026,
          totalHeadcount: 1,
          clients: [
            {
              clientId: "CLIENT-001",
              clientName: "Test Client Ltd",
              clientCode: "TEST",
              headcount: 1,
              totalBillableCtc: 100000,
              totalMmu: 10000,
              taxableSupplyValue: 110000,
              supplyType: "INTRA_STATE",
              cgst: 9900,
              sgst: 9900,
              igst: 0,
              totalGst: 19800,
              totalInvoiceAmount: 129800,
              gstRate: 18,
            },
          ],
        });

        const invoiceResult = await ContractInvoiceService.generateInvoicesForPayrollRun(
          concRunId,
          testTenantId,
          "billing@company.test"
        );

        assert.ok(invoiceResult.invoices.length >= 1, "Returns existing invoice");
        assert.strictEqual(invoiceResult.invoices[0].invoiceNo, "INV-202611-TEST-001");
        assert.strictEqual(invoiceResult.invoices[0].status, "DRAFT");

        (ContractBillingService as any).generateRunBillingManifest = originalManifest;
      } finally {
        await db.sale.delete({ where: { id: existingSale.id } });
      }
    });
  });

  // =========================================================================
  // 6. CRASH RECOVERY: PREMATURE RECOVERY GUARD
  // =========================================================================
  it("CONC-06: Crash recovery - premature recovery attempt (< 15 mins) is rejected with HTTP 400 without force flag", async () => {
    const prematureRun = await db.payrollRun.create({
      data: {
        tenantId: testTenantId,
        periodMonth: 12,
        periodYear: 2026,
        status: "processing",
        approvalStatus: "FINALIZING",
        processedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 mins ago
      },
    });

    try {
      await PayrollOrchestratorService.recoverPayrollCycle(
        testTenantId,
        prematureRun.id,
        actor
      );
      assert.fail("Should have rejected premature recovery (< 15 mins)!");
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes("not yet considered stale"));
    } finally {
      await db.payrollRun.delete({ where: { id: prematureRun.id } });
    }
  });

  // =========================================================================
  // 7. CRASH RECOVERY: CLEAN ROLLBACK (NO FINANCIAL SIDE-EFFECTS)
  // =========================================================================
  it("CONC-07: Crash recovery - cycle stuck for > 15 mins with NO committed financials safely rolls back to APPROVED", async () => {
    const staleCleanRun = await db.payrollRun.create({
      data: {
        tenantId: testTenantId,
        periodMonth: 12,
        periodYear: 2026,
        status: "processing",
        approvalStatus: "FINALIZING",
        processedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
      },
    });

    try {
      const recovery = await PayrollOrchestratorService.recoverPayrollCycle(
        testTenantId,
        staleCleanRun.id,
        actor
      );

      assert.strictEqual(recovery.success, true);
      assert.strictEqual(recovery.actionTaken, "ROLLED_BACK_TO_APPROVED");

      const inDb = await db.payrollRun.findUnique({ where: { id: staleCleanRun.id } });
      assert.strictEqual(inDb?.approvalStatus, "APPROVED", "Cycle must be restored to APPROVED");
    } finally {
      await db.payrollRun.delete({ where: { id: staleCleanRun.id } });
    }
  });

  // =========================================================================
  // 8. REM-01: CRASH RECOVERY: ROLLFORWARD WITH GL BACKFILL (LOCKED SNAPSHOTS + MISSING GL)
  // =========================================================================
  it("CONC-08: REM-01: Crash recovery - cycle stuck with locked snapshots but MISSING GL entry successfully backfills GL and closes cycle", async () => {
    const staleRun = await db.payrollRun.create({
      data: {
        tenantId: testTenantId,
        periodMonth: 12,
        periodYear: 2026,
        status: "processing",
        approvalStatus: "FINALIZING",
        totalAmount: 40000,
        totalNet: 36000,
        totalDeductions: 4000,
        processedAt: new Date(Date.now() - 25 * 60 * 1000), // 25 mins ago
      },
    });

    const empId = testEmployeeId || "EMP-CONC-02";

    // Create locked snapshot (committed financials before crash)
    await db.payrollSnapshot.create({
      data: {
        tenantId: testTenantId,
        payrollRunId: staleRun.id,
        employeeId: empId,
        periodMonth: 12,
        periodYear: 2026,
        snapshotData: { baseMonthlyCtc: 40000 },
        ctcAnnual: 480000,
        grossEarned: 40000,
        totalDeductions: 4000,
        netPay: 36000,
        isLocked: true,
      },
    });

    // Ensure NO journal entry exists initially
    const glBefore = await db.journalEntry.findFirst({
      where: { tenantId: testTenantId, reference: staleRun.id },
    });
    assert.strictEqual(glBefore, null, "Precondition: GL entry must be missing prior to recovery");

    try {
      const recovery = await PayrollOrchestratorService.recoverPayrollCycle(
        testTenantId,
        staleRun.id,
        actor
      );

      assert.strictEqual(recovery.success, true);
      assert.strictEqual(recovery.actionTaken, "ROLLED_FORWARD_TO_CLOSED");

      // Verify that GL entry was backfilled into PostgreSQL
      const glAfter = await db.journalEntry.findFirst({
        where: { tenantId: testTenantId, reference: staleRun.id },
      });
      assert.ok(glAfter, "CRITICAL: General Ledger journal entry must be backfilled into PostgreSQL");
      assert.strictEqual(glAfter?.status, "posted");
      assert.strictEqual(Number(glAfter?.totalAmount), 40000);

      const inDb = await db.payrollRun.findUnique({ where: { id: staleRun.id } });
      assert.strictEqual(inDb?.approvalStatus, "CLOSED", "Cycle must be rolled forward to CLOSED");
      assert.strictEqual(inDb?.status, "completed");
      assert.strictEqual(inDb?.isPublished, true);
    } finally {
      await db.payrollSnapshot.deleteMany({ where: { payrollRunId: staleRun.id } });
      await db.journalItem.deleteMany({ where: { journalEntry: { reference: staleRun.id } } });
      await db.journalEntry.deleteMany({ where: { reference: staleRun.id } });
      await db.payrollRun.delete({ where: { id: staleRun.id } });
    }
  });

  // =========================================================================
  // 9. REM-01: CRASH RECOVERY: ROLLFORWARD WITH ALREADY EXISTING GL (IDEMPOTENT SKIP)
  // =========================================================================
  it("CONC-09: REM-01: Crash recovery - cycle stuck with locked snapshots and ALREADY EXISTING GL entry skips duplicate posting and closes cycle", async () => {
    const staleRun = await db.payrollRun.create({
      data: {
        tenantId: testTenantId,
        periodMonth: 12,
        periodYear: 2026,
        status: "processing",
        approvalStatus: "FINALIZING",
        totalAmount: 40000,
        totalNet: 36000,
        totalDeductions: 4000,
        processedAt: new Date(Date.now() - 25 * 60 * 1000),
      },
    });

    const empId = testEmployeeId || "EMP-CONC-02";
    await db.payrollSnapshot.create({
      data: {
        tenantId: testTenantId,
        payrollRunId: staleRun.id,
        employeeId: empId,
        periodMonth: 12,
        periodYear: 2026,
        snapshotData: { baseMonthlyCtc: 40000 },
        ctcAnnual: 480000,
        grossEarned: 40000,
        totalDeductions: 4000,
        netPay: 36000,
        isLocked: true,
      },
    });

    // Pre-create GL entry
    await runWithTenantContext(getTenantCtx(testTenantId), async () => {
      await autoPostPayrollToLedger({
        tenantId: testTenantId,
        payrollRunId: staleRun.id,
        period: "12/2026",
        totalGross: 40000,
        totalNet: 36000,
        totalDeductions: 4000,
      });
    });

    const glCountBefore = await db.journalEntry.count({
      where: { tenantId: testTenantId, reference: staleRun.id },
    });
    assert.strictEqual(glCountBefore, 1, "Precondition: Exactly 1 GL entry exists before recovery");

    try {
      const recovery = await PayrollOrchestratorService.recoverPayrollCycle(
        testTenantId,
        staleRun.id,
        actor
      );

      assert.strictEqual(recovery.success, true);
      assert.strictEqual(recovery.actionTaken, "ROLLED_FORWARD_TO_CLOSED");

      // Verify GL count remained exactly 1 (no duplicate entry generated)
      const glCountAfter = await db.journalEntry.count({
        where: { tenantId: testTenantId, reference: staleRun.id },
      });
      assert.strictEqual(glCountAfter, 1, "CRITICAL: Duplicate GL entry must NOT be created during recovery");

      const inDb = await db.payrollRun.findUnique({ where: { id: staleRun.id } });
      assert.strictEqual(inDb?.approvalStatus, "CLOSED");
    } finally {
      await db.payrollSnapshot.deleteMany({ where: { payrollRunId: staleRun.id } });
      await db.journalItem.deleteMany({ where: { journalEntry: { reference: staleRun.id } } });
      await db.journalEntry.deleteMany({ where: { reference: staleRun.id } });
      await db.payrollRun.delete({ where: { id: staleRun.id } });
    }
  });

  // =========================================================================
  // 10. REM-01: DOUBLE-ENTRY DEBIT-CREDIT FINANCIAL RECONCILIATION GUARD
  // =========================================================================
  it("CONC-10: REM-01: Financial Reconciliation Guard - debit-credit imbalance (Gross != Net + Deductions) blocks rollforward with HTTP 422", async () => {
    // Gross: 50,000 but Net: 40,000 + Deductions: 5,000 = 45,000 (Imbalance of 5,000)
    const imbalancedRun = await db.payrollRun.create({
      data: {
        tenantId: testTenantId,
        periodMonth: 12,
        periodYear: 2026,
        status: "processing",
        approvalStatus: "FINALIZING",
        totalAmount: 50000,
        totalNet: 40000,
        totalDeductions: 5000,
        processedAt: new Date(Date.now() - 25 * 60 * 1000),
      },
    });

    const empId = testEmployeeId || "EMP-CONC-02";
    await db.payrollSnapshot.create({
      data: {
        tenantId: testTenantId,
        payrollRunId: imbalancedRun.id,
        employeeId: empId,
        periodMonth: 12,
        periodYear: 2026,
        snapshotData: { baseMonthlyCtc: 50000 },
        ctcAnnual: 600000,
        grossEarned: 50000,
        totalDeductions: 5000,
        netPay: 40000,
        isLocked: true,
      },
    });

    try {
      await PayrollOrchestratorService.recoverPayrollCycle(
        testTenantId,
        imbalancedRun.id,
        actor
      );
      assert.fail("Should have blocked recovery due to debit-credit imbalance!");
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 422, "Imbalance must be rejected with HTTP 422 Unprocessable Entity");
      assert.ok(err.message.includes("Financial Reconciliation Error"), `Expected error message, got: ${err.message}`);

      // Verify cycle was NOT closed
      const inDb = await db.payrollRun.findUnique({ where: { id: imbalancedRun.id } });
      assert.strictEqual(inDb?.approvalStatus, "FINALIZING", "Cycle must remain in FINALIZING, not CLOSED");

      // Verify no GL entry was created
      const gl = await db.journalEntry.findFirst({ where: { reference: imbalancedRun.id } });
      assert.strictEqual(gl, null, "No GL entry may be created for imbalanced payroll");
    } finally {
      await db.payrollSnapshot.deleteMany({ where: { payrollRunId: imbalancedRun.id } });
      await db.payrollRun.delete({ where: { id: imbalancedRun.id } });
    }
  });

  // =========================================================================
  // 11. REM-01: CONCURRENT CRASH RECOVERY RACE CONDITION PROTECTION
  // =========================================================================
  it("CONC-11: REM-01: Concurrent crash recovery requests - safely handled without duplicate GL entries or race condition errors", async () => {
    const concurrentRecoveryRun = await db.payrollRun.create({
      data: {
        tenantId: testTenantId,
        periodMonth: 12,
        periodYear: 2026,
        status: "processing",
        approvalStatus: "FINALIZING",
        totalAmount: 60000,
        totalNet: 54000,
        totalDeductions: 6000,
        processedAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    });

    const empId = testEmployeeId || "EMP-CONC-02";
    await db.payrollSnapshot.create({
      data: {
        tenantId: testTenantId,
        payrollRunId: concurrentRecoveryRun.id,
        employeeId: empId,
        periodMonth: 12,
        periodYear: 2026,
        snapshotData: { baseMonthlyCtc: 60000 },
        ctcAnnual: 720000,
        grossEarned: 60000,
        totalDeductions: 6000,
        netPay: 54000,
        isLocked: true,
      },
    });

    try {
      // Execute 2 simultaneous recovery calls for the same stuck cycle
      const [rec1, rec2] = await Promise.all([
        PayrollOrchestratorService.recoverPayrollCycle(
          testTenantId,
          concurrentRecoveryRun.id,
          { id: "recovery-worker-1", email: "worker1@company.test", role: "finance_director" }
        ),
        PayrollOrchestratorService.recoverPayrollCycle(
          testTenantId,
          concurrentRecoveryRun.id,
          { id: "recovery-worker-2", email: "worker2@company.test", role: "finance_director" }
        ),
      ]);

      assert.strictEqual(rec1.success, true);
      assert.strictEqual(rec2.success, true);
      assert.strictEqual(rec1.actionTaken, "ROLLED_FORWARD_TO_CLOSED");
      assert.strictEqual(rec2.actionTaken, "ROLLED_FORWARD_TO_CLOSED");

      // Verify GL entries in PostgreSQL - exactly 1 must exist
      const glEntries = await db.journalEntry.findMany({
        where: { tenantId: testTenantId, reference: concurrentRecoveryRun.id },
      });
      assert.strictEqual(
        glEntries.length,
        1,
        "CRITICAL: Exactly 1 GL JournalEntry must be created across concurrent recovery workers"
      );

      const inDb = await db.payrollRun.findUnique({ where: { id: concurrentRecoveryRun.id } });
      assert.strictEqual(inDb?.approvalStatus, "CLOSED");
    } finally {
      await db.payrollSnapshot.deleteMany({ where: { payrollRunId: concurrentRecoveryRun.id } });
      await db.journalItem.deleteMany({ where: { journalEntry: { reference: concurrentRecoveryRun.id } } });
      await db.journalEntry.deleteMany({ where: { reference: concurrentRecoveryRun.id } });
      await db.payrollRun.delete({ where: { id: concurrentRecoveryRun.id } });
    }
  });

  // =========================================================================
  // 12. REM-01: TENANT ISOLATION GUARD
  // =========================================================================
  it("CONC-12: REM-01: Crash recovery - tenant isolation guard rejects unauthorized cross-tenant recovery with HTTP 404", async () => {
    const foreignRun = await db.payrollRun.create({
      data: {
        tenantId: testTenantId,
        periodMonth: 12,
        periodYear: 2026,
        status: "processing",
        approvalStatus: "FINALIZING",
        processedAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    });

    try {
      await PayrollOrchestratorService.recoverPayrollCycle(
        "tenant-unauthorized-attacker-999",
        foreignRun.id,
        actor
      );
      assert.fail("Cross-tenant recovery must be rejected!");
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 404, "Must return HTTP 404 for mismatched tenant");
    } finally {
      await db.payrollRun.delete({ where: { id: foreignRun.id } });
    }
  });

  // =========================================================================
  // 13. REM-01: RECOVERY RETRY ON ALREADY CLOSED CYCLE
  // =========================================================================
  it("CONC-13: REM-01: Recovery retry on already CLOSED cycle is rejected with HTTP 400", async () => {
    // Try to recover concRunId, which was finalized and closed in CONC-01
    try {
      await PayrollOrchestratorService.recoverPayrollCycle(
        testTenantId,
        concRunId,
        actor,
        { force: true }
      );
      assert.fail("Should have rejected recovery on already closed cycle!");
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes("Only stuck finalizing cycles can be recovered"));
    }
  });
});
