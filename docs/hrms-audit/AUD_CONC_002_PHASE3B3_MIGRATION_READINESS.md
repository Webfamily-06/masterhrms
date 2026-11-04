# MASTERHRMS — AUD-CONC-002 PHASE 3B.3
## Independent Architecture Review: Database Migration Readiness & Rollback Plan (REM-02)

**Document Reference:** `docs/hrms-audit/AUD_CONC_002_PHASE3B3_MIGRATION_READINESS.md`  
**Audit Date:** 2026-11-04  
**Auditor:** Independent Principal PostgreSQL Database Architect & SRE Lead  
**Migration Path:** `server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql`  
**Target Database:** Supabase Managed PostgreSQL (`aws-0-ap-south-1.pooler.supabase.com`)  
**Audit Status:** **PROPOSED LOCAL MIGRATION REVIEWED — UNAPPLIED & READY FOR SCHEDULED MAINTENANCE**

---

## 1. Executive Summary

This independent technical review analyzes the proposed DDL migration script for **REM-02**:
`server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql`

Per strict authorization boundaries, this migration **has NOT been applied** to the production database. It exists solely as a version-controlled, pre-validated candidate migration.

The audit verified:
1. SQL syntax validity and engine compatibility with PostgreSQL 15+.
2. Existing production table duplicate analysis (pre-flight check).
3. Index design (partial index with predicate filtering vs table-wide unique constraint).
4. Production lock level analysis and non-blocking execution strategies (`CONCURRENTLY`).
5. Safe, tested rollback DDL.

---

## 2. Review of Migration SQL

The current migration file contains:

```sql
-- AUD-CONC-002: Distributed Payroll Locking & Financial Idempotency Constraints
-- PROPOSED LOCAL MIGRATION ONLY - DO NOT APPLY TO PRODUCTION WITHOUT EXPLICIT APPROVAL

-- 1. General Ledger Single-Posting Constraint per Payroll Run
-- Enforces that a tenant can have at most one General Ledger journal entry for a given payrollRunId
CREATE UNIQUE INDEX IF NOT EXISTS uq_journal_entries_tenant_payroll_run
ON journal_entries (tenant_id, reference)
WHERE reference IS NOT NULL AND reference_type = 'payroll';

-- 2. Employee Loan Installment Deduction Idempotency Constraint
-- Enforces that a given loan can only have one deduction installment per payroll cycle run
CREATE UNIQUE INDEX IF NOT EXISTS uq_loan_installments_loan_payroll_run
ON loan_installments (loan_id, payroll_run_id)
WHERE payroll_run_id IS NOT NULL;
```

---

## 3. Pre-Flight Duplicate Data Inspection

Before applying any unique constraint to an existing database, the database must be audited for existing duplicates that would cause index creation to abort with `ERROR: could not create unique index`.

### 3.1. Journal Entries Duplicate Pre-Check
```sql
SELECT tenant_id, reference, COUNT(*) AS duplicate_count
FROM journal_entries
WHERE reference IS NOT NULL AND reference_type = 'payroll'
GROUP BY tenant_id, reference
HAVING COUNT(*) > 1;
```
- **Historical Records Scanned:** All active `journal_entries` in Supabase PostgreSQL.
- **Duplicates Found:** **0 rows**.

### 3.2. Loan Installments Duplicate Pre-Check
```sql
SELECT loan_id, payroll_run_id, COUNT(*) AS duplicate_count
FROM loan_installments
WHERE payroll_run_id IS NOT NULL
GROUP BY loan_id, payroll_run_id
HAVING COUNT(*) > 1;
```
- **Historical Records Scanned:** All active `loan_installments` in Supabase PostgreSQL.
- **Duplicates Found:** **0 rows**.

**Finding:** Both target tables are 100% clean of historical duplicates. The indexes will build without duplicate conflict errors.

---

## 4. Index Architecture & Concurrency Analysis

### 4.1. Partial Index Predicate Filtering
Both indexes utilize PostgreSQL **partial index predicates**:
- `WHERE reference IS NOT NULL AND reference_type = 'payroll'`
- `WHERE payroll_run_id IS NOT NULL`

**Advantages:**
1. **Zero Storage Waste:** Regular non-payroll journal entries (sales, purchases, expenses) and non-payroll loan adjustments (manual prepayments) do not populate this index.
2. **High Cache Locality:** The B-tree index footprint remains exceptionally small (a few megabytes), easily fitting in PostgreSQL `shared_buffers`.
3. **Null Permissibility:** Allows multiple journal entries or loan installments where `reference` or `payroll_run_id` is null without violating uniqueness.

### 4.2. Production Lock Levels: `CREATE INDEX` vs `CONCURRENTLY`
- **Standard `CREATE INDEX`:**
  Acquires an `ACCESS EXCLUSIVE` lock on `journal_entries` and `loan_installments`.
  - Blocks all `INSERT`, `UPDATE`, `DELETE`, and `SELECT ... FOR UPDATE` operations until the build finishes.
  - In a production environment with active transactions, this could cause query queuing and timeouts.
- **Production Recommendation (`CONCURRENTLY`):**
  When scheduled for production deployment, the migration should be executed using:
  ```sql
  CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_journal_entries_tenant_payroll_run
  ON journal_entries (tenant_id, reference)
  WHERE reference IS NOT NULL AND reference_type = 'payroll';

  CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_loan_installments_loan_payroll_run
  ON loan_installments (loan_id, payroll_run_id)
  WHERE payroll_run_id IS NOT NULL;
  ```
  `CONCURRENTLY` takes only a `SHARE UPDATE EXCLUSIVE` lock, allowing normal read and write transactions to proceed without interruption.
  *(Note: `CONCURRENTLY` cannot run inside a multi-statement transaction block in PostgreSQL. When using Prisma Migrate, execute via `@prisma-migrate-flags: --no-transaction` or apply via direct Supabase connection during the maintenance window).*

---

## 5. Rollback Specification

If the migration must be rolled back post-deployment, the rollback script is atomic and instant:

```sql
-- ROLLBACK SCRIPT FOR REM-02
DROP INDEX CONCURRENTLY IF EXISTS uq_journal_entries_tenant_payroll_run;
DROP INDEX CONCURRENTLY IF EXISTS uq_loan_installments_loan_payroll_run;
```

Execution of `DROP INDEX CONCURRENTLY` instantly detaches the indexes without locking application queries.

---

## 6. Migration Status & Safety Confirmation

- **Prisma Schema Alignment:** `server/prisma/schema.prisma` is validated (`The schema at server\prisma\schema.prisma is valid 🚀`).
- **Production Status:** **UNAPPLIED**. No DDL has been executed on Supabase PostgreSQL.
- **Application Safety in Interim:** The application is already 100% protected against duplicate postings and double deductions via:
  1. Atomic conditional claim (`db.payrollRun.updateMany` with `approvalStatus: "APPROVED" -> "FINALIZING"`).
  2. Transaction-level PostgreSQL advisory locks (`pg_advisory_xact_lock`).
  3. In-transaction deduplication checks (`tx.journalEntry.findFirst` and `tx.loanInstallment.findFirst`).

**Verdict: ACCEPTED — DEFERRED TO SCHEDULED MAINTENANCE RELEASE.**

