# MASTERHRMS — AUD-CONC-002 PHASE 3B DATABASE CONSTRAINT REQUIREMENTS
## Idempotency, Uniqueness & Schema Defense Architecture

**Document Reference:** `docs/hrms-audit/AUD_CONC_002_PHASE3B_DATABASE_CONSTRAINT_REQUIREMENTS.md`  
**Execution Date:** 2026-11-04  
**Target Environment:** Supabase PostgreSQL 15+ (`aws-0-ap-south-1`)  
**Status:** **PROPOSED & PREPARED (LOCAL ARTIFACTS ONLY — NOT APPLIED TO PRODUCTION)**

---

## 1. Objective & Scope

While software-level locks and conditional database updates (`updateMany` claim-check) prevent race conditions within running application instances, enterprise financial platforms require database-level constraints as the final line of defense.

This document details the exact SQL and Prisma schema constraints required to guarantee financial idempotency across:
1. General Ledger postings (`journal_entries`).
2. Employee loan recovery installments (`loan_installments`).
3. Contract staffing billing invoices (`sales`).
4. Payroll cycle state transitions (`payroll_runs`).

---

## 2. Proposed Database Constraints

### 2.1. General Ledger Single-Posting Constraint

#### Problem Statement
If network timeouts or application restarts occur during finalization, repeated invocations of `autoPostPayrollToLedger` could insert duplicate double-entry journal items for the same payroll run, causing double expenses in Account 5010 and double liabilities in Account 1020/2030.

#### Proposed PostgreSQL DDL
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_journal_entries_tenant_payroll_run
ON journal_entries (tenant_id, reference)
WHERE reference IS NOT NULL AND reference_type = 'payroll';
```

#### Why a Partial Unique Index?
`reference` is a general-purpose field on `journal_entries` used by sales, purchase orders, inventory adjustments, and asset depreciation. Some operations may have null references. By adding `WHERE reference IS NOT NULL AND reference_type = 'payroll'`, the unique index strictly enforces single-posting for payroll without interfering with existing multi-reference journal items.

---

### 2.2. Employee Loan Installment Idempotency Constraint

#### Problem Statement
When an employee has an active loan with an outstanding balance, finalization recovers an installment (`loanRecovery > 0`). If finalization retries or crashes midway, re-running loan deduction without constraint could deduct EMI multiple times, unfairly reducing the employee's loan balance and producing duplicate installment records.

#### Proposed PostgreSQL DDL
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_loan_installments_loan_payroll_run
ON loan_installments (loan_id, payroll_run_id)
WHERE payroll_run_id IS NOT NULL;
```

#### Why a Partial Unique Index?
Manual loan installments or ad-hoc off-cycle prepayments do not carry a `payroll_run_id`. Enforcing uniqueness on `(loan_id, payroll_run_id)` strictly when `payroll_run_id IS NOT NULL` guarantees that no employee loan can ever be decremented twice for the same payroll cycle.

---

### 2.3. Contract Staffing Invoice Idempotency Constraint

#### Problem Statement
Staffing invoices are generated from approved payroll manifests. Each client in a payroll cycle must have at most one active commercial invoice per cycle.

#### Proposed PostgreSQL DDL
```sql
-- In sales table, staffing invoices store metadata in notes JSON:
-- {"source":"STAFFING_PAYROLL_AUTOMATION","payrollRunId":"...","clientId":"..."}
-- Software-level unique check implemented in ContractInvoiceService.
-- Future enhancement: add dedicated payroll_run_id column to sales for native composite unique constraint:
-- ALTER TABLE sales ADD COLUMN payroll_run_id VARCHAR(36);
-- CREATE UNIQUE INDEX uq_sales_tenant_payroll_client ON sales (tenant_id, payroll_run_id, customer_id) WHERE type = 'staffing_billing';
```

---

## 3. Local Migration Artifact Verification

The migration file has been created locally at:
`server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql`

Contents:
```sql
-- AUD-CONC-002: Distributed Payroll Locking & Financial Idempotency Constraints
-- PROPOSED LOCAL MIGRATION ONLY - DO NOT APPLY TO PRODUCTION WITHOUT EXPLICIT APPROVAL

-- 1. General Ledger Single-Posting Constraint per Payroll Run
CREATE UNIQUE INDEX IF NOT EXISTS uq_journal_entries_tenant_payroll_run
ON journal_entries (tenant_id, reference)
WHERE reference IS NOT NULL AND reference_type = 'payroll';

-- 2. Employee Loan Installment Deduction Idempotency Constraint
CREATE UNIQUE INDEX IF NOT EXISTS uq_loan_installments_loan_payroll_run
ON loan_installments (loan_id, payroll_run_id)
WHERE payroll_run_id IS NOT NULL;
```

---

## 4. Production Application Protocol

When explicit authorization is granted for remote migration:
1. Verify no duplicate `(tenant_id, reference)` exists on `journal_entries`:
   ```sql
   SELECT tenant_id, reference, count(*) FROM journal_entries WHERE reference_type = 'payroll' GROUP BY tenant_id, reference HAVING count(*) > 1;
   ```
2. Verify no duplicate `(loan_id, payroll_run_id)` exists on `loan_installments`:
   ```sql
   SELECT loan_id, payroll_run_id, count(*) FROM loan_installments WHERE payroll_run_id IS NOT NULL GROUP BY loan_id, payroll_run_id HAVING count(*) > 1;
   ```
3. Execute the migration via Supabase SQL Editor or `prisma migrate deploy` in a maintenance window.
4. Verify index status:
   ```sql
   SELECT indexname, indexdef FROM pg_indexes WHERE indexname IN ('uq_journal_entries_tenant_payroll_run', 'uq_loan_installments_loan_payroll_run');
   ```

