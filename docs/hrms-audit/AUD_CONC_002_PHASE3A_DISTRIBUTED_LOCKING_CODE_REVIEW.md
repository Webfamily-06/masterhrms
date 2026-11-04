# MASTERHRMS — AUD-CONC-002 PHASE 3A DISTRIBUTED LOCKING CODE REVIEW

> **Audit Identifier**: AUD-CONC-002 (Phase 3A Code Audit)  
> **Inspection Date**: 2026-11-04T10:18:00+05:30 (UTC: 2026-11-04T04:48:00Z)  
> **Target Commit SHA**: `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0`  
> **Audited Subsystem**: Payroll Finalization, Ledger Posting, Loan Recovery & Invoice Automation  
> **Review Verdict**: **CRITICAL ARCHITECTURAL CONCURRENCY GAPS IDENTIFIED**  

---

## 1. Executive Summary

A comprehensive architectural and line-level source code audit of the payroll finalization lifecycle was performed across:
- `server/src/services/payroll-orchestrator.service.ts`
- `server/src/services/payroll-validation.service.ts`
- `server/src/services/ledger-posting.service.ts`
- `server/src/services/contract-invoice.service.ts`
- `server/src/routes/payroll-cycles.routes.ts`
- `server/prisma/schema.prisma`

The audit reveals that while individual transactions are wrapped in Prisma interactive transactions, **the concurrency control mechanisms rely exclusively on process-memory mutexes (`Set<string>`) and non-atomic application-level `findFirst` checks**. In a multi-instance serverless environment (such as Vercel AWS Lambda), concurrent requests bypass these checks, creating severe risks of duplicate general ledger postings, duplicate employee loan deductions, and duplicate commercial client invoices.

---

## 2. Detailed Verification Matrix

### A. Atomic Payroll Claim
- **Expected**: PostgreSQL atomic conditional state transition (`UPDATE "payroll_runs" SET approval_status = 'FINALIZING' WHERE id = $1 AND tenant_id = $2 AND approval_status = 'APPROVED' RETURNING *`).
- **Observed Source Code**:
  - `server/src/services/payroll-orchestrator.service.ts:1197–1219`:
    ```typescript
    const run = await db.payrollRun.findUnique({ where: { id: runId } });
    if (!run || run.tenantId !== tenantId) throw new Error("...");
    if (run.approvalStatus !== "APPROVED") throw new Error("...");
    const locked = this.acquireLock(runId); // <-- Process-memory check
    if (!locked) throw new Error("Finalization is already in progress...");
    ```
  - `server/src/services/payroll-orchestrator.service.ts:91`:
    ```typescript
    const activeRunLocks = new Set<string>();
    ```
- **Finding**: **UNSAFE IN SERVERLESS**. The claim is not atomic at the database level. Two simultaneous HTTP requests handled by separate Vercel Lambda workers will both execute `findUnique`, both evaluate `run.approvalStatus === "APPROVED"`, and both acquire their own process-local lock in `activeRunLocks`.

---

### B. Transaction Integrity & Ledger Posting
- **Expected**: Snapshot locking, ledger posting, and state transition must be unified in a single atomic database transaction or protected by a unique business key constraint.
- **Observed Source Code**:
  - `server/src/services/payroll-orchestrator.service.ts:1261–1270`:
    ```typescript
    // autoPostPayrollToLedger is executed OUTSIDE db.$transaction!
    await runWithTenantContext(tenantCtx, async () => {
      await autoPostPayrollToLedger({
        tenantId,
        payrollRunId: runId,
        period: periodStr,
        totalGross,
        totalNet,
        totalDeductions,
      });
    });
    ```
  - `server/src/services/ledger-posting.service.ts:182–185`:
    ```typescript
    const existing = await prisma.journalEntry.findFirst({
      where: { tenantId, reference: payrollRunId },
    });
    if (existing) return;
    ```
  - `server/prisma/schema.prisma:2746–2748`:
    ```prisma
    model JournalEntry {
      ...
      @@unique([tenantId, entryNumber])
      @@index([tenantId, entryDate])
      @@map("journal_entries")
    }
    ```
- **Finding**: **DUPLICATE GL POSTING VULNERABILITY**.
  1. `autoPostPayrollToLedger` runs before the main snapshot transaction. If the subsequent transaction fails, the GL entry is already posted.
  2. `journal_entries` does **not** define a unique constraint on `(tenantId, reference)`. It relies exclusively on an unshielded `findFirst` precheck. Under concurrent calls, two balanced journal entries with different entry numbers will be created for the same payroll run.

---

### C. Loan Deduction Integrity
- **Expected**: Guaranteed idempotency preventing an employee's loan balance from being deducted twice for the same payroll period.
- **Observed Source Code**:
  - `server/src/services/payroll-orchestrator.service.ts:1280–1322`:
    ```typescript
    for (const slip of run.payslips) {
      const loan = await tx.employeeLoan.findFirst({
        where: { tenantId, employeeId: slip.employeeId, status: "active", outstandingBalance: { gt: 0 } },
      });
      if (loan) {
        const newBalance = Math.max(0, Number(loan.outstandingBalance) - loanRecovery);
        await tx.employeeLoan.update({ where: { id: loan.id }, data: { outstandingBalance: newBalance, ... } });
        const count = await tx.loanInstallment.count({ where: { loanId: loan.id } });
        await tx.loanInstallment.create({
          data: { loanId: loan.id, tenantId, installmentNumber: count + 1, emiAmount: loanRecovery, ... },
        });
      }
    }
    ```
  - `server/prisma/schema.prisma:721–723`:
    ```prisma
    model LoanInstallment {
      ...
      @@index([tenantId, loanId, status])
      @@index([tenantId, periodYear, periodMonth, status])
      @@map("loan_installments")
    }
    ```
- **Finding**: **DUPLICATE LOAN DEDUCTION VULNERABILITY**.
  1. `LoanInstallment` lacks a unique constraint on `[loanId, periodYear, periodMonth]` or `[loanId, payrollRunId]`.
  2. The code does not check if an installment was already deducted for this `(loanId, periodMonth, periodYear)`.
  3. A duplicate finalization or re-run decrements `outstandingBalance` twice and creates duplicate installment receipts.

---

### D. Contract Invoice Concurrency
- **Expected**: Unique database constraint or atomic lock preventing duplicate commercial sales invoices for staffing clients.
- **Observed Source Code**:
  - `server/src/services/contract-invoice.service.ts:138–164`:
    ```typescript
    const existingInvoices = await db.sale.findMany({
      where: { tenantId, type: "staffing_billing" },
    });
    const duplicate = existingInvoices.find((sale) => {
      const meta = JSON.parse(sale.notes);
      return meta.payrollRunId === payrollRunId && meta.clientId === clientSummary.clientId;
    });
    ```
- **Finding**: **UNSTRUCTURED IN-MEMORY CHECK**. `Sale` has no unique constraint linking it to `payrollRunId`. Filtering is performed in JavaScript memory by parsing JSON inside `sale.notes`. Two concurrent requests will both generate invoices.

---

### E. Crash Recovery Endpoint
- **Expected**: `POST /api/payroll/cycles/:id/recover` allowing authenticated administrators to safely recover cycles stuck in `FINALIZING` state with idempotency.
- **Observed Source Code**:
  - Exhaustive search of `server/src/routes/payroll-cycles.routes.ts`: **ROUTE DOES NOT EXIST**.
  - `git grep -n "recover" server/src/`: Zero matches for payroll cycle recovery.
- **Finding**: **MISSING ENDPOINT**. If a serverless function times out during finalization, the cycle remains in an indeterminate state with no official recovery API available.

---

### F. Inventory of In-Memory Mutexes in Codebase
1. `server/src/services/payroll-orchestrator.service.ts:91`: `const activeRunLocks = new Set<string>();`
2. `server/src/services/payroll-validation.service.ts:57`: `const activeFinalizationLocks = new Set<string>();`

Both in-memory sets must be removed and replaced with database-backed atomic operations.

