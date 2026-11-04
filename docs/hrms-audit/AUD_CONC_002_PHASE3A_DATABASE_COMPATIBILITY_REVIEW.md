# MASTERHRMS — AUD-CONC-002 PHASE 3A DATABASE COMPATIBILITY REVIEW

> **Audit Identifier**: AUD-CONC-002 (Phase 3A Database Schema Audit)  
> **Inspection Date**: 2026-11-04T10:18:00+05:30 (UTC: 2026-11-04T04:48:00Z)  
> **Target Database**: Supabase PostgreSQL (`aws-0-ap-south-1.pooler.supabase.com:6543`, DB: `postgres`)  
> **Investigation Mode**: STRICT READ-ONLY — ZERO DDL / ZERO MIGRATIONS EXECUTED  
> **Verdict**: **DISTRIBUTED LOCKING FEASIBLE WITH ZERO DDL — COMPATIBILITY CONSTRAINTS IDENTIFIED**  

---

## 1. Executive Summary

This review investigates whether the proposed **AUD-CONC-002 PostgreSQL-backed Distributed Locking** implementation can be implemented safely within the existing physical database schema without triggering migrations, and analyzes its relationship with the unresolved **AUD-DB-001** database drift.

### Core Conclusion:
1. **Core Atomic State Lock Requires ZERO Schema Changes**: The target column `approval_status` (`VARCHAR(30)`) already exists in the remote `payroll_runs` table. An atomic conditional update (`UPDATE "payroll_runs" SET approval_status = 'FINALIZING' WHERE id = $1 AND tenant_id = $2 AND approval_status = 'APPROVED'`) is 100% compatible with the current live database schema without executing DDL or Prisma migrations.
2. **`AUD-DB-001` Remains Unresolved**: The physical database still lacks `_prisma_migrations`, `device_sessions`, and employee demographic columns (`father_or_spouse_name`, `permanent_address`, etc.). The distributed locking code must strictly avoid querying these missing columns.

---

## 2. Distributed Locking Schema Compatibility Matrix

| Feature Component | Physical DB Table | Target Column | Exists in Physical DB? | DDL / Migration Required? | Safe Implementation Method |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Atomic Run Claim** | `payroll_runs` | `approval_status` | **YES** (`VARCHAR(30)`) | **NO** | Atomic conditional `UPDATE ... WHERE approval_status = 'APPROVED'` |
| **Claim Timestamp** | `payroll_runs` | `processed_at` | **YES** (`TIMESTAMP(3)`) | **NO** | Updated during claim |
| **Claim Actor** | `payroll_runs` | `approved_by` | **YES** (`VARCHAR(150)`) | **NO** | Updated during claim |
| **Run Ownership** | `payroll_runs` | `tenant_id` | **YES** (`VARCHAR(36)`) | **NO** | Guard condition in WHERE clause |
| **Cryptographic Hash** | `payroll_runs` | `statutory_manifest`| **YES** (`JSONB`) | **NO** | Sealed inside manifest JSON |
| **GL Duplicate Prevention** | `journal_entries` | `reference` | **YES** (`VARCHAR(150)`) | **NO (If Advisory Lock)** | Use `pg_try_advisory_xact_lock(hashtext(runId))` to avoid DDL |
| **Loan Duplicate Prevention**| `loan_installments` | `payroll_run_id` | **YES** (`VARCHAR(36)`) | **NO (If Conditional)** | Add check `WHERE loanId = $1 AND payrollRunId = $2` before update |

---

## 3. Unresolved Schema Drift Register (`AUD-DB-001`)

The following known schema discrepancies remain active in the remote Supabase database:

1. **`_prisma_migrations` Table**: **ABSENT**. The physical database was provisioned without Prisma migration tracking. Any attempt to execute `npx prisma migrate deploy` will fail or risk aborting due to missing tracking metadata.
2. **Missing Employee Demographic Columns**:
   - `employees.father_or_spouse_name`: Absent
   - `employees.permanent_address`: Absent
   - `employees.present_address`: Absent
   - `employees.completion_480_days_date`: Absent
   - `employees.permanent_employment_date`: Absent
   - `employees.maternity_nomination_date`: Absent
3. **`device_sessions` Table**: **ABSENT**.
4. **Column Type Discrepancy**: `leave_requests.days` is stored as an integer in physical Postgres, whereas `schema.prisma` declares `Decimal(4,1)`.

### Safeguard Mandate:
Any implementation of AUD-CONC-002 must **NOT** introduce Prisma queries that execute blanket `findMany` or `findUnique` on `Employee` without explicit `select` clauses, to prevent PostgreSQL Error 42703 (column does not exist).

