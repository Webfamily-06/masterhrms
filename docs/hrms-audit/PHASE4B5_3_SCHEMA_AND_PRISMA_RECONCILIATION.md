# MASTERHRMS — PHASE 4B.5.3
# SCHEMA & PRISMA RECONCILIATION AUDIT

**Document Reference:** `docs/hrms-audit/PHASE4B5_3_SCHEMA_AND_PRISMA_RECONCILIATION.md`  
**Date:** 2026-11-04  
**Auditor Roles:** Principal PostgreSQL Architect & Database Reliability Engineer  
**Repository:** `Webfamily-06/masterhrms`  
**Committed GitHub main HEAD:** `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0`  
**Target Platform:** PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2)  

---

## 1. 17 Employee Columns Reconciliation

### Current Production State:
- The production `employees` table currently has **41 columns**.
- The Prisma schema `model Employee` defines **58 columns**.
- Exactly **17 lifecycle and statutory columns** are absent in live production:

| # | Column Name | PostgreSQL 17 Data Type | Nullability & Default | Prisma Field Mapping |
| :-: | :--- | :--- | :--- | :--- |
| **1** | `father_or_spouse_name` | `character varying(150)` | Nullable | `fatherOrSpouseName` |
| **2** | `worker_age_classification`| `character varying(20)` | `NOT NULL DEFAULT 'Adult'` | `workerAgeClassification` |
| **3** | `marital_status` | `character varying(20)` | Nullable | `maritalStatus` |
| **4** | `blood_group` | `character varying(10)` | Nullable | `bloodGroup` |
| **5** | `address_line1` | `character varying(255)` | Nullable | `addressLine1` |
| **6** | `address_line2` | `character varying(255)` | Nullable | `addressLine2` |
| **7** | `city` | `character varying(100)` | Nullable | `city` |
| **8** | `district` | `character varying(100)` | Nullable | `district` |
| **9** | `postal_code` | `character varying(20)` | Nullable | `postalCode` |
| **10** | `present_address` | `text` | Nullable | `presentAddress` |
| **11** | `permanent_address` | `text` | Nullable | `permanentAddress` |
| **12** | `emergency_contact_name` | `character varying(150)` | Nullable | `emergencyContactName` |
| **13** | `emergency_contact_phone`| `character varying(50)` | Nullable | `emergencyContactPhone` |
| **14** | `emergency_contact_relationship` | `character varying(50)` | Nullable | `emergencyContactRelationship` |
| **15** | `permanent_employment_date` | `date` | Nullable | `permanentEmploymentDate` |
| **16** | `completion_480_days_date`| `date` | Nullable | `completion480DaysDate` |
| **17** | `maternity_nomination_date`| `date` | Nullable | `maternityNominationDate` |

### PostgreSQL 17 Container Execution Evidence:
The exact DDL statement adding all 17 columns with `IF NOT EXISTS` guards executed in `masterhrms-pg17-audit` with 0 errors. A query against `information_schema.columns` confirmed all 17 columns are accurately typed with matching constraints.

---

## 2. `leave_requests.days` Type Conversion & Rollback Precision Loss

### Type Conversion:
- **Operation:** `INTEGER -> NUMERIC(4, 1)`
- **DDL Executed:**
  ```sql
  SET LOCAL lock_timeout = '3s';
  SET LOCAL statement_timeout = '10s';
  ALTER TABLE leave_requests ALTER COLUMN days TYPE NUMERIC(4, 1) USING days::NUMERIC(4, 1);
  ALTER TABLE leave_requests ALTER COLUMN days SET DEFAULT 1.0;
  ```
- **PostgreSQL 17 Timing:** **105.06 ms**
- **Row Preservation:** 21 integer rows (simulating production data profile) preserved without truncation.
- **Fractional Test:** Inserted `0.5` and `1.5` days; retrieved exactly as `0.5` and `1.5`.

### Empirical Rollback Precision Loss Proof:
- Running rollback DDL:
  ```sql
  ALTER TABLE leave_requests ALTER COLUMN days TYPE INTEGER USING ROUND(days)::INTEGER;
  ```
- **Result:**
  - `0.5` days was permanently rounded up to `1`
  - `1.5` days was permanently rounded up to `2`
- **Architectural Notice:**
  > [!WARNING]
  > Once fractional leaves are recorded post-migration, rolling back this column type to `INTEGER` will cause irreversible data corruption. The migration runbook specifies a complete database snapshot before applying this change.

---

## 3. GitHub main vs. Local Migration State Comparison

| Migration Directory | Committed GitHub main (`9e8749b`) | Local Working Tree | Reconciliation Action Required |
| :--- | :--- | :--- | :--- |
| `20261102000000_add_device_sessions` | **DEFECTIVE (MySQL Syntax):** Backtick identifiers, `DATETIME(3)`, `utf8mb4`, `ENGINE=InnoDB` | **CORRECTED:** Pure PostgreSQL 17 DDL (`VARCHAR(36)`, `TIMESTAMP(3)`, `IF NOT EXISTS`, 5 indexes) | Commit corrected `migration.sql` to a dedicated migration branch / PR |
| `20261103000002_add_branch_geofencing` | **COMMITTED & CORRECT:** Pure PostgreSQL DDL | Identical to GitHub main | Ready for execution |
| `20261104100000_aud_conc_002_idempotency_constraints` | **ABSENT:** File does not exist on GitHub main | **PREPARED:** Contains 2 partial unique indexes with `WHERE` clauses | Commit to dedicated migration branch / PR |

---

## 4. Isolation of Application Code Changes

The local working directory contains modifications in application service files that must NOT be mixed with the database migration commit:
- `server/src/routes/payroll-cycles.routes.ts`
- `server/src/services/contract-invoice.service.ts`
- `server/src/services/ledger-posting.service.ts`
- `server/src/services/payroll-orchestrator.service.ts`
- `server/src/services/payroll-validation.service.ts`

These changes implement crash recovery, distributed advisory locks, and atomic claim-checks. They must be merged in an independent application release PR after database migrations are applied.

