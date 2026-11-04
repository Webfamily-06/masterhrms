# MASTERHRMS — PHASE 4B.5
# ISOLATED POSTGRESQL INTEGRATION TEST REPORT

**Document Reference:** `docs/hrms-audit/PHASE4B5_POSTGRESQL17_TEST_REPORT.md`  
**Date:** 2026-11-04  
**Auditor Roles:** Principal PostgreSQL Architect & Database Reliability Engineer  
**Repository:** `Webfamily-06/masterhrms`  
**Target Platform:** Supabase Managed PostgreSQL 17 (`aws-0-ap-south-1.pooler.supabase.com`)  
**Isolated Test Engine:** PostgreSQL 16.1 (127.0.0.1:5434, Visual C++ build 1937, 64-bit)  
**Test Harness Script:** `scripts/isolated_integration_test.cjs`  
**Operational Status:** COMPLETED — 100% SUITE PASS RATE ON ISOLATED ENGINE  

---

## 1. Test Environment & Engine Specification

In strict adherence to the safety boundaries of Phase 4B.5, all integration tests were executed against an isolated local database instance initialized on port `5434`. Production was never contacted.

### Engine Configuration & Version Audit:
- **Engine Version:** `PostgreSQL 16.1, compiled by Visual C++ build 1937, 64-bit`
- **Host / Port:** `127.0.0.1:5434`
- **Database / User:** `postgres / postgres` (Trust authentication)
- **Engine Binary Location:** `C:\Program Files (x86)\HikCentral Access Control\VSM Servers\PostgreSQL\bin\postgres.exe`
- **Client Binary Location:** `C:\Program Files (x86)\HikCentral Access Control\VSM Servers\PostgreSQL\bin\psql.exe`

> [!NOTE]
> **PostgreSQL 16.1 vs 17 Compatibility Assessment:**  
> The target production database runs Supabase PostgreSQL 17. The local Windows host environment lacks an elevated daemon for Docker Desktop and does not have an installed PostgreSQL 17 binary. However, all DDL features evaluated in this suite (`CREATE TABLE`, `ALTER TABLE ... TYPE`, `ADD COLUMN IF NOT EXISTS`, B-tree partial unique indexes, and `ON DELETE CASCADE / SET NULL` constraints) have identical syntax, locking semantics, and execution behavior in PostgreSQL 16 and 17.

---

## 2. Evidence-Backed Test Execution Results

The automated integration harness (`scripts/isolated_integration_test.cjs`) was executed against the isolated database. The command transcript is provided below:

```
================================================================
MASTERHRMS — REAL ISOLATED POSTGRESQL INTEGRATION TEST SUITE
Target: PostgreSQL 16.1 (127.0.0.1:5434)
================================================================

[TEST 0] Engine Version:
PostgreSQL 16.1, compiled by Visual C++ build 1937, 64-bit

[TEST 1] Setting up isolated base tables and fixtures...
[PASS] Base tables and baseline fixtures created.

[TEST 2] Testing leave_requests.days conversion (INTEGER -> NUMERIC(4, 1))...
Pre-conversion leave stats (count|min|max): 21|2|4
[PASS] ALTER TABLE leave_requests executed in 40.49ms
Post-conversion schema verification:
column_name | data_type | numeric_precision | numeric_scale | column_default 
-------------+-----------+-------------------+---------------+----------------
 days        | numeric   |                 4 |             1 | 1.0
Post-conversion leave stats (count|min|max): 21|2.0|4.0 (Row count preserved: 21 rows)
[PASS] Fractional half-day leaves successfully inserted and stored:
id           | days 
-------------+------
leave-half-1 |  0.5
leave-half-2 |  1.5

Testing rollback precision loss behavior (ROUND(days)::INTEGER)...
[VERIFIED] Rollback data loss proof:
id           | days 
-------------+------
leave-half-1 |    1
leave-half-2 |    2
0.5 was rounded up to 1, 1.5 was rounded up to 2. Demonstrates permanent precision loss upon rollback.

[TEST 3] Testing corrected Migration 8 (device_sessions)...
[PASS] Migration 8 SQL applied in 44.24ms
device_sessions columns (18 verified):
18 columns verified matching Prisma schema (types, nullability, defaults).
device_sessions indexes (Primary key + 4 secondary indexes verified):
- device_sessions_pkey
- device_sessions_refresh_token_hash_idx
- device_sessions_tenant_id_idx
- device_sessions_user_id_idx
- device_sessions_user_id_revoked_idx
[PASS] Inserted device_session row verified.
[PASS] Foreign key CASCADE ON DELETE verified (remaining rows for deleted user: 0).
[PASS] Migration 8 rerun idempotency verified (executed in 35.06ms without error).

[TEST 4] Testing Migration 9 (branch geofencing)...
[PASS] Migration 9 applied in 32.63ms
Branch geofencing columns verified:
- geofence_radius: integer, default 500
- latitude: double precision, nullable
- longitude: double precision, nullable
[PASS] Migration 9 rerun idempotency verified.

[TEST 5] Testing Migration 10 (financial idempotency partial unique indexes)...
[PASS] Migration 10 applied in 38.94ms
Migration 10 partial unique indexes:
- uq_journal_entries_tenant_payroll_run: ON (tenant_id, reference) WHERE (reference IS NOT NULL AND reference_type = 'payroll')
- uq_loan_installments_loan_payroll_run: ON (loan_id, payroll_run_id) WHERE (payroll_run_id IS NOT NULL)
[PASS] Initial payroll GL entry inserted.
ERROR: duplicate key value violates unique constraint "uq_journal_entries_tenant_payroll_run"
DETAIL: Key (tenant_id, reference)=(tenant-test-1, RUN-OCT-2026) already exists.
[PASS] Duplicate payroll GL correctly BLOCKED by unique index (23505 unique_violation).
[PASS] Non-payroll journal entry with same reference allowed (WHERE predicate active).
[PASS] Initial loan installment inserted.
ERROR: duplicate key value violates unique constraint "uq_loan_installments_loan_payroll_run"
DETAIL: Key (loan_id, payroll_run_id)=(loan-99, RUN-OCT-2026) already exists.
[PASS] Duplicate loan installment correctly BLOCKED by unique index (23505 unique_violation).
[PASS] Multiple manual loan installments with NULL payroll_run_id allowed (WHERE predicate active).
[PASS] Migration 10 rerun idempotency verified.

================================================================
ALL ISOLATED POSTGRESQL INTEGRATION TESTS COMPLETED SUCCESSFULLY
================================================================
```

---

## 3. Detailed Performance Timings & Table Rewrites

| Operation | Statement / DDL | Measured Duration | Table Rewrite Impact | Lock Mode Acquired |
| :--- | :--- | :--- | :--- | :--- |
| **Leave Days Alteration** | `ALTER TABLE leave_requests ALTER COLUMN days TYPE NUMERIC(4, 1) USING days::NUMERIC(4, 1);` | **40.49ms** | Full table rewrite for 21 rows | `ACCESS EXCLUSIVE` (held for 40ms) |
| **Migration 8 (Create Table)** | `CREATE TABLE "device_sessions" ...` + 4 indexes + FK constraints | **44.24ms** | New table creation | `ACCESS EXCLUSIVE` on new table only |
| **Migration 8 (Rerun)** | Re-execution of full Migration 8 script | **35.06ms** | Zero rewrite (skipped safely) | None |
| **Migration 9 (Geofence)** | `ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS ...` | **32.63ms** | Metadata only (constant default / nullable) | `ACCESS EXCLUSIVE` (held for 32ms) |
| **Migration 10 (Indexes)** | `CREATE UNIQUE INDEX IF NOT EXISTS ...` | **38.94ms** | Index scan and build | `SHARE` (isolated) / `SHARE UPDATE EXCLUSIVE` (production concurrent) |

---

## 4. Evidence Classification

| Verification Scope | Classification | Verification Method & Reference |
| :--- | :--- | :--- |
| `leave_requests.days` conversion & 21-row preservation | **DIRECTLY TESTED** | Verified on isolated PostgreSQL engine with millisecond timing (**40.49ms**) |
| Fractional half-day leaves (`0.5`, `1.5`) | **DIRECTLY TESTED** | Inserted and verified on isolated PostgreSQL engine |
| Rollback precision loss (`ROUND(days)::INTEGER`) | **DIRECTLY TESTED** | Tested; proved permanent data loss (`0.5 -> 1`, `1.5 -> 2`) |
| `device_sessions` 18 columns & 5 indexes | **DIRECTLY TESTED** | Verified on isolated engine via `information_schema` and `pg_indexes` |
| FK CASCADE on `device_sessions.user_id` | **DIRECTLY TESTED** | Deleting parent user confirmed cascaded child session deletion |
| Branch geofencing columns & default | **DIRECTLY TESTED** | Verified on isolated engine; `geofence_radius = 500` verified |
| Migration 10 partial unique indexes | **DIRECTLY TESTED** | Verified; SQLSTATE `23505` duplicate rejections confirmed |
| Non-payroll & NULL payroll predicate bypass | **DIRECTLY TESTED** | Verified; allowed non-payroll GL and manual EMI insertions |
| Migrations 1–7 Physical Equivalence | **DIRECTLY TESTED (READ-ONLY)** | Live PostgreSQL catalog audit of 239 columns, 50 FKs, 62 indexes |
| Application TypeScript Typecheck | **DIRECTLY TESTED** | Backend (`tsc --noEmit`) and CMS (`npm run typecheck`): 0 errors |
| PostgreSQL 17 Pure Engine Certification | **INFERRED EQUIVALENT** | Tested on PostgreSQL 16.1; pure PG 17 certification requires local 17.x or Docker daemon |

