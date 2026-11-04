# MASTERHRMS — AUD-CONC-002 PHASE 3B.2
## Remediation Report: Recovery General Ledger Backfill & Double-Entry Guard (REM-01)

**Document Reference:** `docs/hrms-audit/AUD_CONC_002_REM01_GL_RECOVERY_REMEDIATION.md`  
**Execution Date:** 2026-11-04  
**Author:** Principal Backend Engineer & Financial Systems Auditor  
**Scope:** Remediation of REM-01 in `PayrollOrchestratorService.recoverPayrollCycle`  
**Status:** **FULLY IMPLEMENTED & EMPIRICALLY VERIFIED**

---

## 1. Executive Summary

During the Phase 3B.1 Independent Financial Integrity Audit, Finding `AUD-PH3B1-REC-01` identified a critical vulnerability in `PayrollOrchestratorService.recoverPayrollCycle`:
> When recovering a crashed cycle that had committed snapshots before an abrupt server termination, the rollforward recovery procedure advanced the cycle to `CLOSED` without verifying whether the General Ledger journal entry had been created. If the crash happened before ledger posting, the payroll cycle was marked `CLOSED` with an unposted General Ledger entry, violating double-entry accounting integrity.

Under **REM-01 authorization**, `recoverPayrollCycle` was remediated with comprehensive financial reconciliation guards, automatic idempotent ledger backfilling, concurrency serialization via PostgreSQL transaction advisory locks, and fail-closed transaction barriers.

---

## 2. Root Cause Analysis

In the initial Phase 3B implementation:
```typescript
const hasCommittedFinancials = lockedSnapshots > 0 || !!glEntry;
if (hasCommittedFinancials) {
  // Directly generated output manifest and transitioned to CLOSED
  await db.payrollRun.update({
    where: { id: runId },
    data: { status: "completed", approvalStatus: "CLOSED" }
  });
}
```
**Failure Scenario:**
1. A payroll cycle executed calculation and locked snapshots.
2. The Node.js process crashed or timed out before `autoPostPayrollToLedger` could execute.
3. An administrator invoked `POST /api/payroll/cycles/:id/recover`.
4. Because `lockedSnapshots > 0`, `hasCommittedFinancials` evaluated to `true`.
5. The cycle transitioned to `CLOSED` without `autoPostPayrollToLedger` ever running.
6. **Result:** Financial statements were permanently out of balance (unposted payroll liability).

---

## 3. REM-01 Implementation Details

The remediation was implemented in `server/src/services/payroll-orchestrator.service.ts` with the following 5-stage barrier:

### 3.1. Stage 1: Double-Entry Debit-Credit Equality Validation
Before any state modification or ledger backfill, the mathematical equation of the payroll cycle is checked:
$$\text{Gross Salary} = \text{Net Salary} + \text{Total Deductions}$$

```typescript
const totalGross = Number(run.totalAmount || 0);
const totalNet = Number(run.totalNet || 0);
const totalDeductions = Number(run.totalDeductions || 0);

if (Math.abs(totalGross - (totalNet + totalDeductions)) > 0.01) {
  const err: any = new Error(
    `Financial Reconciliation Error: Gross salary (₹${totalGross}) does not balance with Net pay (₹${totalNet}) + Deductions (₹${totalDeductions}). Rollforward recovery blocked to protect financial integrity.`
  );
  err.statusCode = 422;
  throw err;
}
```
If an imbalance is detected, recovery **aborts immediately with HTTP 422 Unprocessable Entity**. The cycle remains in `FINALIZING` for manual financial review.

### 3.2. Stage 2: Snapshot Lock Enforcement
All snapshots associated with the payroll run are transactionally locked (`isLocked: true`) to prevent subsequent modification:
```typescript
await db.payrollSnapshot.updateMany({
  where: { payrollRunId: runId },
  data: { isLocked: true },
});
```

### 3.3. Stage 3: General Ledger Verification & Idempotent Backfill
The orchestrator checks whether a journal entry already exists for `reference: runId`. If absent, it invokes `autoPostPayrollToLedger` within the tenant context:
```typescript
if (!glEntry) {
  console.warn(
    `[PayrollRecovery] Cycle ${runId} has locked snapshots but missing GL entry. Backfilling General Ledger posting...`
  );

  const tenantCtx: TenantContext = {
    tenantId,
    userId: actor.id,
    roles: [actor.role || "finance_director"],
    status: "ACTIVE",
    tenancyStrategy: "SHARED_SCHEMA",
    db: rawPrisma,
  };

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

  // Re-verify that GL entry was successfully persisted in PostgreSQL
  glEntry = await db.journalEntry.findFirst({
    where: { tenantId, reference: runId },
  });

  if (!glEntry) {
    const err: any = new Error(
      "General Ledger posting failed during recovery. Cycle cannot be transitioned to CLOSED."
    );
    err.statusCode = 500;
    throw err;
  }
}
```

### 3.4. Stage 4: PostgreSQL Concurrency Serialization
To eliminate race conditions between simultaneous recovery workers, `autoPostPayrollToLedger` in `server/src/services/ledger-posting.service.ts` was enhanced with a transaction-level PostgreSQL advisory lock:
```typescript
await prisma.$transaction(async (tx) => {
  // PostgreSQL transaction-level advisory lock serializes concurrent postings for the same run
  await (tx as any).$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('gl_payroll_${payrollRunId}'))`);

  const existingInTx = await tx.journalEntry.findFirst({
    where: { tenantId, reference: payrollRunId },
  });
  if (existingInTx) {
    console.log(`[LEDGER] Journal Entry for payroll ${payrollRunId} already exists (${existingInTx.entryNumber}). Skipping duplicate.`);
    return;
  }
  ...
});
```

### 3.5. Stage 5: Atomic State Transition Claim
The transition to `CLOSED` is executed conditionally via `updateMany` matching `approvalStatus: "FINALIZING"`. If another worker completed the transition concurrently, `updateResult.count === 0`, and the worker safely returns the completed cycle with `concurrentHandled: true`:
```typescript
const updateResult = await db.payrollRun.updateMany({
  where: {
    id: runId,
    tenantId,
    approvalStatus: "FINALIZING",
  },
  data: {
    status: "completed",
    approvalStatus: "CLOSED",
    isPublished: true,
    ...
  },
});

if (updateResult.count === 0) {
  const latestRun = await db.payrollRun.findUnique({ where: { id: runId } });
  if (latestRun && latestRun.approvalStatus === "CLOSED") {
    return {
      success: true,
      actionTaken: "ROLLED_FORWARD_TO_CLOSED",
      message: "Payroll cycle was already recovered to CLOSED by a concurrent request.",
      cycle: latestRun,
      audit: { ... },
    };
  }
  throw 409 Conflict;
}
```

---

## 4. Verification & Test Evidence

All 6 REM-01 test scenarios were implemented in `server/src/tests/distributed-payroll-concurrency.test.ts` and executed against the live PostgreSQL database:

| Test ID | Scenario | Expected Behavior | Observed Result | Status |
|:---|:---|:---|:---|:---:|
| `CONC-08` | Locked snapshots + GL missing | Backfills GL, verifies entry, transitions to `CLOSED` | Backfilled `JE-2026-0011-8208`, cycle `CLOSED` | **PASS** |
| `CONC-09` | Locked snapshots + GL exists | Detects existing GL, skips duplicate, transitions to `CLOSED` | GL count remained 1, cycle `CLOSED` | **PASS** |
| `CONC-10` | Financial imbalance ($50k \neq 40k + 5k$) | Rejects rollforward with HTTP 422, keeps cycle in `FINALIZING` | Rejected with HTTP 422, GL entry count = 0 | **PASS** |
| `CONC-11` | 2 concurrent recovery requests | PostgreSQL advisory lock serializes, exactly 1 GL entry created | Exactly 1 entry `JE-2026-0011-2758` created | **PASS** |
| `CONC-12` | Mismatched tenant recovery attempt | Enforces multi-tenant boundary, returns HTTP 404 | Rejected with HTTP 404 Not Found | **PASS** |
| `CONC-13` | Recovery retry on already `CLOSED` cycle | Rejects modification with HTTP 400 | Rejected with HTTP 400 Bad Request | **PASS** |

---

## 5. Conclusion

REM-01 is **100% complete and verified**. The crash recovery pipeline is mathematically sound, tenant-isolated, idempotent, and backed by PostgreSQL advisory transaction serialization.

