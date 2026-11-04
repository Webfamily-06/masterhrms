# MASTERHRMS — PHASE 4A
## Production Database Current State Audit & Schema Drift Analysis

**Document Reference:** `docs/hrms-audit/PHASE4A_DATABASE_CURRENT_STATE_AUDIT.md`  
**Execution Date:** 2026-11-04  
**Auditor:** Principal PostgreSQL Database Architect & SRE Lead  
**Database Platform:** Supabase Managed PostgreSQL (`aws-0-ap-south-1.pooler.supabase.com`)  
**Database Version:** PostgreSQL 15.8 (Ubuntu / Supabase Cloud)  
**Connection Modes:**
- Transaction Pooler: Port `6543` (PgBouncer, transaction mode)
- Direct Connection: Port `5432` (Direct PostgreSQL connection for DDL/admin)
**Git Base Commit:** `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0`  
**Audit Classification:** **EMPIRICAL READ-ONLY AUDIT COMPLETED**

---

## 1. Executive Summary

An exhaustive, non-destructive, read-only physical database inspection was performed on the active production Supabase PostgreSQL instance. This audit compared the physical database schema against the application's Prisma schema (`server/prisma/schema.prisma`) and historical migration directory (`server/prisma/migrations/`).

### Key Findings Summary:
1. **Prisma Migration Tracking Table is Missing:** Table `_prisma_migrations` does **NOT exist** in the physical database.
2. **Critical Employee Column Drift (17 Columns Missing):** Out of 58 columns defined in Prisma `model Employee`, only 41 physical columns exist. All 17 statutory and personal employee columns reported in AUD-DB-001 are physically absent.
3. **Leave Days Column Datatype Mismatch:** Physical column `leave_requests.days` is `INTEGER` (`int4`), whereas `schema.prisma` defines `Decimal(4, 1)`.
4. **Missing Physical Tables:** Table `device_sessions` is physically absent from the database despite being modeled in Prisma and actively referenced in `auth.routes.ts`.
5. **Historical Migration Syntax Incompatibility:** The 7 historical migrations in `server/prisma/migrations/` (from September 2026) were written in **MySQL / MariaDB dialect** (using backticks, `DATETIME(3)`, and `MODIFY COLUMN`), proving that `prisma migrate deploy` has never been executed against this PostgreSQL instance.
6. **Zero Duplicate Financial Records:** Physical duplicate scans on `journal_entries` and `loan_installments` confirmed **0 historical duplicate rows**, clearing the path for unique index creation.

---

## 2. Detailed Physical Schema Inventory

### 2.1. Physical Tables & Objects
- Total physical tables in `public` schema: **276 tables**.
- Core ERP tables present: `users`, `tenants`, `employees`, `payroll_runs`, `payslips`, `payroll_snapshots`, `journal_entries`, `journal_items`, `employee_loans`, `loan_installments`, `sales`, `purchases`, `credit_notes`, `debit_notes`, `chart_of_accounts`, `fiscal_years`, `branches`.
- Tables modeled in Prisma but physically absent:
  - `device_sessions` (Modeled in `schema.prisma:186-215`, absent in PostgreSQL).
  - `_prisma_migrations` (Standard Prisma tracking table, absent in PostgreSQL).

---

## 3. Discrepancy Breakdown: AUD-DB-001 Schema Drift

### 3.1. The 17 Missing Employee Columns
A query against `information_schema.columns WHERE table_name = 'employees'` was cross-referenced against `server/prisma/schema.prisma`:

| Column Name | Prisma Field | Prisma Definition | Physical DB Status | Nullable? | Impact |
|:---|:---|:---|:---:|:---:|:---|
| `father_or_spouse_name` | `fatherOrSpouseName` | `String? @db.VarChar(150)` | **ABSENT** | YES | Breaks Form V, W, S, X |
| `worker_age_classification`| `workerAgeClassification` | `String @default("Adult") @db.VarChar(20)` | **ABSENT** | NO (Default 'Adult') | Age classification |
| `marital_status` | `maritalStatus` | `String? @db.VarChar(20)` | **ABSENT** | YES | Personal records |
| `blood_group` | `bloodGroup` | `String? @db.VarChar(10)` | **ABSENT** | YES | Medical/Emergency |
| `address_line1` | `addressLine1` | `String? @db.VarChar(255)` | **ABSENT** | YES | Address reporting |
| `address_line2` | `addressLine2` | `String? @db.VarChar(255)` | **ABSENT** | YES | Address reporting |
| `city` | `city` | `String? @db.VarChar(100)` | **ABSENT** | YES | City reporting |
| `district` | `district` | `String? @db.VarChar(100)` | **ABSENT** | YES | District reporting |
| `postal_code` | `postalCode` | `String? @db.VarChar(20)` | **ABSENT** | YES | PIN code reporting |
| `present_address` | `presentAddress` | `String? @db.Text` | **ABSENT** | YES | Compliance registers |
| `permanent_address` | `permanentAddress` | `String? @db.Text` | **ABSENT** | YES | Compliance registers |
| `emergency_contact_name` | `emergencyContactName` | `String? @db.VarChar(100)` | **ABSENT** | YES | Safety compliance |
| `emergency_contact_phone` | `emergencyContactPhone` | `String? @db.VarChar(30)` | **ABSENT** | YES | Safety compliance |
| `emergency_contact_relationship` | `emergencyContactRelationship` | `String? @db.VarChar(50)` | **ABSENT** | YES | Safety compliance |
| `permanent_employment_date` | `permanentEmploymentDate` | `DateTime? @db.Date` | **ABSENT** | YES | Gratuity/Standing Orders |
| `completion_480_days_date` | `completion480DaysDate` | `DateTime? @db.Date` | **ABSENT** | YES | Tamil Nadu Conferment of Permanent Status Act |
| `maternity_nomination_date` | `maternityNominationDate` | `DateTime? @db.Date` | **ABSENT** | YES | Maternity Benefit Act Form 138 |

#### Root Cause of Runtime Failures:
When an application route invokes `prisma.employee.findFirst()` or `prisma.employee.findMany()` without an explicit `select` projection (e.g. in `attendance.routes.ts:27`, `timesheets.routes.ts:28`, `workspace.routes.ts:1042`), Prisma automatically generates:
```sql
SELECT "employees"."id", ..., "employees"."father_or_spouse_name", "employees"."worker_age_classification", ... FROM "employees" ...
```
PostgreSQL immediately terminates the transaction with:
```
ERROR: column employees.father_or_spouse_name does not exist (SQLSTATE 42703)
```
Currently, developers have had to deploy defensive projection workarounds (e.g. `SAFE_EMPLOYEE_SELECT` in statutory services) to avoid crashes.

---

### 3.2. Datatype Discrepancy: `leave_requests.days`

Physical database inspection:
```sql
SELECT column_name, data_type, udt_name, numeric_precision, numeric_scale
FROM information_schema.columns 
WHERE table_name = 'leave_requests' AND column_name = 'days';
```
- **Physical PostgreSQL Type:** `data_type: 'integer', udt_name: 'int4', precision: 32, scale: 0`.
- **Prisma Schema Expectation:** `days Decimal @default(1.0) @db.Decimal(4, 1)`.
- **Existing Rows in DB:** 21 rows (e.g. `days: 2`, `days: 3`, `days: 4`).
- **Operational Risk:** Half-day leave applications (0.5 days) cannot be stored in an integer column. If Prisma attempts to write `0.5`, PostgreSQL rejects the write or truncates to `0`.
- **Remediation Feasibility:** 100% non-destructive. Converting `INTEGER` to `NUMERIC(4, 1)` via `USING "days"::NUMERIC(4, 1)` preserves all 21 existing records exactly as `2.0`, `3.0`, `4.0`.

---

### 3.3. Missing Table: `device_sessions`
- **Physical DB Status:** Does not exist (`table_name = 'device_sessions' -> 0 rows`).
- **Prisma Schema Status:** Modeled with 18 fields and 4 indexes.
- **Application Impact:** In `server/src/routes/auth.routes.ts:643, 1174`, every user login generates a non-fatal warning:
  `[DeviceSession] Non-fatal session create failure: relation "device_sessions" does not exist (SQLSTATE 42P01)`.
  Multi-device session revocation and refresh token rotation are completely non-functional.
- **Migration Bug Discovered:** The existing migration file `20261102000000_add_device_sessions/migration.sql` was authored in **MySQL syntax** (`CREATE TABLE IF NOT EXISTS \`device_sessions\` ... DEFAULT CHARACTER SET utf8mb4`). It cannot be executed on PostgreSQL without total syntax rewriting.

---

### 3.4. Missing Branch Geofencing Columns
Inspection of `branches` table:
- Modeled in Prisma / local migration `20261103000002_add_branch_geofencing`:
  - `latitude DOUBLE PRECISION`
  - `longitude DOUBLE PRECISION`
  - `geofence_radius INTEGER DEFAULT 500`
- Physical DB status: **ABSENT** (`information_schema.columns` returned 0 rows for these 3 fields).

---

## 4. Part A: REM-02 Payroll Idempotency Constraints Audit

### 4.1. Target 1: `journal_entries` Payroll Unique Constraint
- **Physical Table:** `journal_entries`
- **Columns Required:** `tenant_id`, `reference`
- **Filter Condition:** `reference IS NOT NULL AND reference_type = 'payroll'`
- **Physical Indexes Present:**
  1. `journal_entries_pkey` ON `(id)`
  2. `journal_entries_tenant_id_entry_date_idx` ON `(tenant_id, entry_date)`
  3. `journal_entries_tenant_id_entry_number_key` ON `(tenant_id, entry_number)`
- **Unique Constraint on (tenant_id, reference):** **ABSENT**.
- **Historical Duplicate Scan:**
  ```sql
  SELECT tenant_id, reference, count(*)::int as count
  FROM journal_entries
  WHERE reference IS NOT NULL AND reference_type = 'payroll'
  GROUP BY tenant_id, reference
  HAVING count(*) > 1;
  ```
  **Result:** `0 rows returned.` Clean for immediate indexing.

---

### 4.2. Target 2: `loan_installments` Payroll Run Unique Constraint
- **Physical Table:** `loan_installments`
- **Columns Required:** `loan_id`, `payroll_run_id`
- **Filter Condition:** `payroll_run_id IS NOT NULL`
- **Physical Indexes Present:**
  1. `loan_installments_pkey` ON `(id)`
  2. `loan_installments_tenant_id_loan_id_status_idx` ON `(tenant_id, loan_id, status)`
  3. `loan_installments_tenant_id_period_year_period_month_status_idx` ON `(tenant_id, period_year, period_month, status)`
- **Unique Constraint on (loan_id, payroll_run_id):** **ABSENT**.
- **Historical Duplicate Scan:**
  ```sql
  SELECT loan_id, payroll_run_id, count(*)::int as count
  FROM loan_installments
  WHERE payroll_run_id IS NOT NULL
  GROUP BY loan_id, payroll_run_id
  HAVING count(*) > 1;
  ```
  **Result:** `0 rows returned.` Clean for immediate indexing.

---

## 5. Part C: Migration Tracking Genesis Investigation

### 5.1. The Missing `_prisma_migrations` Table
Inspection confirms that `_prisma_migrations` does not exist in the database.
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = '_prisma_migrations';
-- Returned 0 rows
```

### 5.2. Forensic Analysis of Past Provisioning
1. The remote database holds 276 tables matching the majority of models in `schema.prisma`.
2. The 7 earliest migrations in `server/prisma/migrations/` (from September 2026) contain MySQL syntax:
   `ALTER TABLE \`chart_of_accounts\` ADD COLUMN ...`
   `ALTER TABLE \`product_warehouses\` MODIFY \`quantity\` DECIMAL(15, 3) ...`
3. Because these files contain MySQL syntax, `prisma migrate deploy` was never executed against this database.
4. The database was provisioned via `prisma db push` or an initial schema dump import. `prisma db push` synchronizes schemas directly without creating or updating `_prisma_migrations`.

### 5.3. Catastrophic Risk of Uncontrolled `prisma migrate deploy`
If an operator runs `prisma migrate deploy` today:
- Prisma will see `_prisma_migrations` is missing.
- Prisma will attempt to execute migration `20260926000000_wave3_step3_2_fiscal_controls/migration.sql`.
- PostgreSQL will immediately fail with syntax error on backtick (`` ` ``).
- Even if syntax were corrected, it would attempt `CREATE TABLE fiscal_years`, which already exists, aborting the process.

**Conclusion:** Standard `prisma migrate deploy` **MUST NEVER BE RUN** until a formal PostgreSQL baselining migration is established.

---

## 6. Audit Verdict

The physical database exhibits substantial, verifiable schema drift against `schema.prisma`. However, because existing data is 100% clean of duplicate violations, a structured, non-destructive remediation sequence can completely align the database with zero data loss.

