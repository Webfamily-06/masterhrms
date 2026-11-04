# MASTERHRMS — PHASE 4A
## REM-02: Payroll Idempotency Index Migration Plan

**Document Reference:** `docs/hrms-audit/PHASE4A_REM02_INDEX_MIGRATION_PLAN.md`  
**Execution Date:** 2026-11-04  
**Author:** Principal PostgreSQL Database Architect & Financial Systems Auditor  
**Scope:** Technical specification, lock analysis, execution methodology, and invalid-index cleanup for REM-02  
**Target Migration:** `server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql`  
**Status:** **PROPOSED SPECIFICATION — NOT EXECUTED**

---

## 1. Executive Summary

REM-02 establishes physical database-level idempotency guarantees for:
1. **General Ledger Journal Entries:** At most one payroll journal entry per `(tenant_id, reference)` where `reference_type = 'payroll'`.
2. **Employee Loan Installments:** At most one installment deduction per `(loan_id, payroll_run_id)`.

This document establishes the exact DDL commands, physical table validation, lock level analysis, transaction runner limitations, and execution protocol.

---

## 2. Target Constraints Specification

### 2.1. General Ledger Single-Posting Constraint
- **Physical Table:** `journal_entries`
- **Indexed Columns:** `tenant_id`, `reference`
- **Partial Predicate:** `WHERE reference IS NOT NULL AND reference_type = 'payroll'`
- **Index Name:** `uq_journal_entries_tenant_payroll_run`

#### Proposed DDL:
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_journal_entries_tenant_payroll_run
ON journal_entries (tenant_id, reference)
WHERE reference IS NOT NULL AND reference_type = 'payroll';
```

#### Behavior & NULL Handling:
- Non-payroll journal entries (sales, purchase, manual vouchers) have `reference_type != 'payroll'` or `reference IS NULL`. They are completely excluded from the index.
- Multiple manual entries with `reference = NULL` are permitted.
- For payroll entries, any attempt to insert a duplicate `(tenant_id, reference)` triggers PostgreSQL error `23505 (unique_violation)`.

---

### 2.2. Employee Loan Installment Deduction Idempotency Constraint
- **Physical Table:** `loan_installments`
- **Indexed Columns:** `loan_id`, `payroll_run_id`
- **Partial Predicate:** `WHERE payroll_run_id IS NOT NULL`
- **Index Name:** `uq_loan_installments_loan_payroll_run`

#### Proposed DDL:
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_loan_installments_loan_payroll_run
ON loan_installments (loan_id, payroll_run_id)
WHERE payroll_run_id IS NOT NULL;
```

#### Behavior & NULL Handling:
- Ad-hoc, manual, or non-payroll loan adjustments (where `payroll_run_id IS NULL`) are excluded from the index. Multiple manual installments with `NULL` payroll run are permitted.
- For payroll deductions, each employee loan can have at most one installment linked to a specific payroll run ID. Any concurrent second deduction immediately fails with error `23505`.

---

## 3. Physical Pre-Flight Verification Evidence

Read-only queries against Supabase PostgreSQL on 2026-11-04 confirmed:

### 3.1. Table & Column Verification
- `journal_entries.tenant_id`: `character varying(36)` (NOT NULL) — **VERIFIED**
- `journal_entries.reference`: `character varying(100)` (NULLABLE) — **VERIFIED**
- `journal_entries.reference_type`: `character varying(50)` (NOT NULL) — **VERIFIED**
- `loan_installments.loan_id`: `character varying(36)` (NOT NULL) — **VERIFIED**
- `loan_installments.payroll_run_id`: `character varying(36)` (NULLABLE) — **VERIFIED**

### 3.2. Duplicate Records Check
```sql
-- Query 1: Check Journal Entries
SELECT tenant_id, reference, COUNT(*) 
FROM journal_entries 
WHERE reference IS NOT NULL AND reference_type = 'payroll' 
GROUP BY tenant_id, reference 
HAVING COUNT(*) > 1;
-- Result: 0 rows

-- Query 2: Check Loan Installments
SELECT loan_id, payroll_run_id, COUNT(*) 
FROM loan_installments 
WHERE payroll_run_id IS NOT NULL 
GROUP BY loan_id, payroll_run_id 
HAVING COUNT(*) > 1;
-- Result: 0 rows
```
**Conclusion:** Zero duplicate records exist. The indexes can be built cleanly without duplicate-key constraint aborts.

---

## 4. Concurrency & Lock Level Analysis

| Index Creation Mode | Lock Mode Acquired | Blocks Reads? | Blocks Writes? | Safe for Production Live Traffic? |
|:---|:---|:---:|:---:|:---:|
| `CREATE UNIQUE INDEX` | `ACCESS EXCLUSIVE` | **NO** | **YES (Blocks all INSERT/UPDATE/DELETE)** | **NO** (Risks request timeouts during index build) |
| `CREATE UNIQUE INDEX CONCURRENTLY` | `SHARE UPDATE EXCLUSIVE` | **NO** | **NO (Zero write blocking)** | **YES (Recommended for Production)** |

### Why `CONCURRENTLY` is Essential:
1. `journal_entries` and `loan_installments` are heavily queried and modified during live business hours.
2. Standard `CREATE INDEX` takes an `ACCESS EXCLUSIVE` lock, queuing all incoming transactions until two full table scans complete.
3. `CREATE UNIQUE INDEX CONCURRENTLY` builds the index in two phases using a `SHARE UPDATE EXCLUSIVE` lock. Writes and reads continue uninterrupted.

---

## 5. Prisma Migration Runner Limitation & Dedicated Script Execution

### 5.1. The PostgreSQL Transaction Block Restriction
PostgreSQL strictly forbids `CONCURRENTLY` operations inside an active transaction block:
```
ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block (SQLSTATE 25001)
```

### 5.2. Prisma Runner Incompatibility
- By default, `prisma migrate deploy` wraps every migration script in an implicit `BEGIN ... COMMIT` transaction block.
- If `CREATE UNIQUE INDEX CONCURRENTLY` is executed via standard `prisma migrate deploy`, the migration fails immediately with SQLSTATE 25001.

### 5.3. Recommended Execution Strategy
To deploy REM-02 safely in production:
1. **Connection Target:** Direct connection via port `5432` (`DIRECT_URL`), bypassing PgBouncer transaction pooling (port `6543`), because PgBouncer in transaction mode does not support session-level non-transactional DDL.
2. **Execution Method:** Execute via a dedicated administrative node script (`server/scripts/apply_rem02_concurrently.cjs`) or raw `psql` session:
   ```bash
   psql "$DIRECT_URL" -f server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql
   ```
3. **Prisma Migration Baseline:** Once built, mark the migration as resolved in Prisma tracking:
   ```bash
   npx prisma migrate resolve --applied 20261104100000_aud_conc_002_idempotency_constraints
   ```

---

## 6. Failure Recovery & Invalid Index Cleanup

If an index creation fails mid-execution (e.g. server crash or duplicate inserted during phase 2 scan), PostgreSQL leaves an **INVALID** index:
- An invalid index consumes disk space.
- An invalid index is updated on writes, slowing down insertions.
- An invalid index cannot be used by the query planner.

### 6.1. Detection Query
```sql
SELECT schemaname, relname, indexrelname, indisvalid
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN ('uq_journal_entries_tenant_payroll_run', 'uq_loan_installments_loan_payroll_run')
  AND indisvalid = false;
```

### 6.2. Cleanup & Recovery Runbook
If an index is flagged as `indisvalid = false`:
1. Drop the invalid index without blocking:
   ```sql
   DROP INDEX CONCURRENTLY IF EXISTS uq_journal_entries_tenant_payroll_run;
   DROP INDEX CONCURRENTLY IF EXISTS uq_loan_installments_loan_payroll_run;
   ```
2. Identify and resolve any conflicting rows that caused the failure.
3. Re-run `CREATE UNIQUE INDEX CONCURRENTLY`.

---

## 7. Rollback Specification

```sql
-- REM-02 ROLLBACK DDL
DROP INDEX CONCURRENTLY IF EXISTS uq_journal_entries_tenant_payroll_run;
DROP INDEX CONCURRENTLY IF EXISTS uq_loan_installments_loan_payroll_run;
```
Rollback is completely non-destructive, zero-downtime, and instant.

---

## 8. Approval Gate

- **Technical Prerequisite:** Direct port 5432 connection established.
- **Data Prerequisite:** Duplicate check re-verified immediately before execution.
- **Sign-off Required:** Principal Database Architect & Finance Director.
- **Status:** **PROPOSED SPECIFICATION — NOT EXECUTED.**

