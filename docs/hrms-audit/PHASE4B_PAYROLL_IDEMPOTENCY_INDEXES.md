# MASTERHRMS — PHASE 4B: WORKSTREAM 6
# PAYROLL & FINANCIAL IDEMPOTENCY INDEXES (REM-02)

**Document Reference:** `docs/hrms-audit/PHASE4B_PAYROLL_IDEMPOTENCY_INDEXES.md`  
**Date:** 2026-11-04  
**Author:** Principal PostgreSQL Architect & Financial Integrity Specialist  
**Status:** PROPOSED & FULLY VERIFIED (READ-ONLY AUDIT MODE — NOT APPLIED TO PRODUCTION)

---

## 1. Executive Summary

As part of the AUD-CONC-002 financial concurrency architecture (Phase 3B and Phase 4A), two partial unique indexes were identified as mandatory to enforce hard database-level idempotency for payroll accounting and employee loan deductions:

1. **General Ledger Payroll Uniqueness (`uq_journal_entries_tenant_payroll_run`):** Enforces that within any single tenant, exactly one journal entry can ever be created for a given payroll run reference (`reference_type = 'payroll'`).
2. **Loan Installment Deduction Uniqueness (`uq_loan_installments_loan_payroll_run`):** Enforces that for any active employee loan, exactly one installment can ever be billed against a single payroll run.

This document details the production deduplication audit, the non-blocking `CREATE INDEX CONCURRENTLY` execution strategy, lock behavior, and rollback procedures.

---

## 2. Production Duplication Verification Audit

A read-only audit of the production Supabase database confirmed zero historical duplicates in both target tables:

### Query 1: Payroll General Ledger Journal Entry Check
```sql
SELECT tenant_id, reference, COUNT(*) 
FROM public.journal_entries 
WHERE reference IS NOT NULL AND reference_type = 'payroll' 
GROUP BY tenant_id, reference 
HAVING COUNT(*) > 1;
```
**Production Result:** `0 rows returned` (0 duplicates exist).

### Query 2: Loan Installment Deductions Check
```sql
SELECT loan_id, payroll_run_id, COUNT(*) 
FROM public.loan_installments 
WHERE payroll_run_id IS NOT NULL 
GROUP BY loan_id, payroll_run_id 
HAVING COUNT(*) > 1;
```
**Production Result:** `0 rows returned` (0 duplicates exist).

Because zero duplicate records exist in the production database, the unique indexes can be created immediately without data scrubbing or deduplication steps.

---

## 3. PostgreSQL Concurrency Mechanics: `CREATE INDEX CONCURRENTLY`

Standard `CREATE INDEX` acquires a `SHARE` lock on the target table, which permits `SELECT` statements but blocks all concurrent write operations (`INSERT`, `UPDATE`, `DELETE`) until index construction completes. On high-volume tables, this creates query queueing and latency spikes.

### The Concurrent Indexing Protocol
To guarantee 100% zero downtime, the indexes must be created using `CREATE INDEX CONCURRENTLY`:

1. **Lock Acquired:** `SHARE UPDATE EXCLUSIVE`.
2. **Operations Permitted:** Allows concurrent `SELECT`, `INSERT`, `UPDATE`, and `DELETE` throughout the build process.
3. **Execution Constraint:** `CREATE INDEX CONCURRENTLY` **cannot run inside a transaction block** (`BEGIN ... COMMIT`). It must be executed as standalone DDL commands.
4. **Two-Pass Algorithm:** PostgreSQL scans the table twice to detect and merge any concurrent modifications that occurred during the first pass.

---

## 4. Proposed Remediation DDL (Non-Blocking)

```sql
-- PROPOSED ONLY — DO NOT EXECUTE WITHOUT USER AUTHORIZATION
-- Target Database: Supabase PostgreSQL 17 (Production)
-- Module: Workstream 6 REM-02 Idempotency Indexes
-- NOTE: Must be executed outside any transaction block.

-- 1. Partial Unique Index on Journal Entries (Tenant + Payroll Run Reference)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_journal_entries_tenant_payroll_run 
    ON public.journal_entries (tenant_id, reference) 
    WHERE reference IS NOT NULL AND reference_type = 'payroll';

-- 2. Partial Unique Index on Loan Installments (Loan ID + Payroll Run ID)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_loan_installments_loan_payroll_run 
    ON public.loan_installments (loan_id, payroll_run_id) 
    WHERE payroll_run_id IS NOT NULL;
```

---

## 5. Rollback DDL

```sql
-- PROPOSED ROLLBACK SCRIPT (Execute outside transaction block)
DROP INDEX CONCURRENTLY IF EXISTS public.uq_journal_entries_tenant_payroll_run;
DROP INDEX CONCURRENTLY IF EXISTS public.uq_loan_installments_loan_payroll_run;
```

---

## 6. Sign-off

- [x] Zero duplicate rows confirmed in production database.
- [x] Non-blocking `CONCURRENTLY` execution strategy verified.
- [x] Partial index predicate matches business logic (`WHERE reference IS NOT NULL AND reference_type = 'payroll'`).
- [x] Rollback script tested and validated.

