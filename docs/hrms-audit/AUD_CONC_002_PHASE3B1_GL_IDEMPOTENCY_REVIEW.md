# MASTERHRMS — AUD-CONC-002 PHASE 3B.1
## Independent Audit Report: General Ledger Idempotency & Transaction Boundaries

**Document Reference:** `docs/hrms-audit/AUD_CONC_002_PHASE3B1_GL_IDEMPOTENCY_REVIEW.md`  
**Audit Date:** 2026-11-04  
**Auditor:** Independent Principal PostgreSQL Engineer & Financial Systems Auditor  
**Target Codebase:** `server/src/services/ledger-posting.service.ts`  
**Database:** Supabase Managed PostgreSQL (`aws-0-ap-south-1`)  
**Audit Status:** **CONDITIONALLY ACCEPTED — APPLICATION-LEVEL SAFE, DATABASE CONSTRAINT UNAPPLIED**

---

## 1. Scope & Objective

This audit investigates `autoPostPayrollToLedger` in `server/src/services/ledger-posting.service.ts`. Specifically, it examines whether two concurrent PostgreSQL transactions can both pass the application-level `findFirst` check and generate duplicate double-entry postings, and reviews the physical database schema and proposed partial unique index.

---

## 2. Code Inspection: `autoPostPayrollToLedger`

```typescript
export async function autoPostPayrollToLedger(params: {
  tenantId: string;
  payrollRunId: string;
  period: string;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
}) {
  const { tenantId, payrollRunId, period, totalGross, totalNet, totalDeductions } = params;
  if (totalGross <= 0) return;

  try {
    const existing = await prisma.journalEntry.findFirst({
      where: { tenantId, reference: payrollRunId },
    });
    if (existing) return;

    // Account lookups and JournalItem generation...
    
    await prisma.$transaction(async (tx) => {
      // AUD-CONC-002: Idempotency check inside transaction
      const existingInTx = await tx.journalEntry.findFirst({
        where: { tenantId, reference: payrollRunId },
      });
      if (existingInTx) {
        console.log(`[LEDGER] Journal Entry for payroll ${payrollRunId} already exists (${existingInTx.entryNumber}). Skipping duplicate.`);
        return;
      }

      await assertOpenPeriodForPosting(tx, tenantId, new Date());
      const entry = await tx.journalEntry.create({
        data: {
          tenantId,
          entryNumber,
          entryDate: new Date(),
          reference: payrollRunId,
          referenceType: "payroll",
          description: `Auto-posted Payroll Disbursement for ${period}`,
          totalAmount: totalGross,
          status: "posted",
        },
      });

      for (const item of itemsToCreate) {
        await tx.journalItem.create({ ... });
        await tx.chartOfAccount.update({ ... });
      }
    });
  } catch (err) { ... }
}
```

---

## 3. Detailed Technical Analysis

### 3.1. Transaction Isolation & The "Check-Then-Act" Vulnerability
- **PostgreSQL Isolation Level:** Empirical query confirmed default isolation is `READ COMMITTED`.
  ```sql
  SHOW default_transaction_isolation; -- Result: 'read committed'
  ```
- **Concurrency Scenario:**
  Suppose two independent database connections concurrently call `autoPostPayrollToLedger` with the same `(tenantId, payrollRunId)` without external orchestration:
  1. Connection 1 starts `tx1`, executes `SELECT ... WHERE tenant_id = $1 AND reference = $2 LIMIT 1`. Finds no existing row.
  2. Connection 2 starts `tx2`, executes `SELECT ... WHERE tenant_id = $1 AND reference = $2 LIMIT 1`. Finds no existing row.
  3. Connection 1 executes `INSERT INTO journal_entries ...`, increments accounts, and commits.
  4. Connection 2 executes `INSERT INTO journal_entries ...`, increments accounts, and commits.
- **Finding:** Under `READ COMMITTED` isolation, `findFirst` does not take predicate locks on non-existent rows. Application-level `findFirst` is therefore **insufficient on its own** to guarantee idempotency across raw concurrent database transactions unless:
  - Enforced by an orchestrator-level exclusive claim, OR
  - Backed by a physical unique database index in PostgreSQL, OR
  - Protected by a transactional advisory lock (`pg_advisory_xact_lock`).

### 3.2. Orchestrator-Level Protection (Mitigating Factor)
In the normal application workflow:
- `autoPostPayrollToLedger` is invoked exclusively by `PayrollOrchestratorService.finalizePayroll`.
- As proven in Report 1, `PayrollOrchestratorService.finalizePayroll` serializes execution at the `payroll_runs` row level (`approvalStatus: "APPROVED" -> "FINALIZING"`).
- Consequently, two concurrent finalization calls never reach `autoPostPayrollToLedger` simultaneously in production operation.

### 3.3. Physical Database Constraint Verification
An independent query on the physical Supabase database was executed:
```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'journal_entries';
```
**Physical Indexes Present:**
1. `journal_entries_pkey` ON `id` (UNIQUE)
2. `journal_entries_tenant_id_entry_date_idx` ON `(tenant_id, entry_date)`
3. `journal_entries_tenant_id_entry_number_key` ON `(tenant_id, entry_number)` (UNIQUE)

**Finding:** The proposed partial unique index:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_journal_entries_tenant_payroll_run
ON journal_entries (tenant_id, reference)
WHERE reference IS NOT NULL AND reference_type = 'payroll';
```
**HAS NOT BEEN APPLIED TO PRODUCTION.** It exists only as a local proposal in `server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql`.

### 3.4. Duplicate Scan on Existing Data
An independent query was run against the physical database:
```sql
SELECT tenant_id, reference, count(*)::int
FROM journal_entries
WHERE reference_type = 'payroll' AND reference IS NOT NULL
GROUP BY tenant_id, reference
HAVING count(*) > 1;
```
**Result:** `0 rows returned.` No historical duplicate payroll journal entries exist in the database.

---

## 4. Audit Verdict & Required Action

**CONDITIONALLY ACCEPTED.**
- The application is protected in normal operation by the atomic claim check in `PayrollOrchestratorService`.
- **Pre-Deployment Requirement:** To achieve true ACID idempotency at the database engine tier, the proposed migration `20261104100000_aud_conc_002_idempotency_constraints` MUST be formally applied to Supabase PostgreSQL under authorized maintenance before high-volume multi-tenant scaling.

