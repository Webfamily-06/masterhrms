# MASTERHRMS — PHASE 4B.5.3
# MIGRATIONS 1–10 POSTGRESQL 17 EXECUTION & CERTIFICATION REPORT

**Document Reference:** `docs/hrms-audit/PHASE4B5_3_MIGRATIONS_1_10_EXECUTION_REPORT.md`  
**Date:** 2026-11-04  
**Auditor Roles:** Principal PostgreSQL Architect & Database Reliability Engineer  
**Repository:** `Webfamily-06/masterhrms`  
**Committed GitHub main HEAD:** `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0`  
**Target Platform:** PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2)  
**Test Suite Script:** `scripts/pg17_container_certification.cjs`  

---

## 1. Migrations 1–10 Inventory & Cryptographic Checksums

Every migration file in `server/prisma/migrations/` was hashed using SHA-256 and audited on the filesystem:

| Mig # | Migration Folder Name | Size (Bytes) | SHA-256 Checksum | Origin / Commit Status |
| :---: | :--- | :---: | :--- | :--- |
| **1** | `20260926000000_wave3_step3_2_fiscal_controls` | 2,452 | `82fc3c0f335768687f11a38ff17b0fcab31f616a6b4533c0a3892b590c4e319b` | Committed (Sept 2026) |
| **2** | `20260927000000_wave3_step3_3_1_inventory_decimal_and_stock_movement` | 2,353 | `1e54d7530536c6773083c4d8e564d48f56664d6c69ba8bc01ca8104be459e368` | Committed (Sept 2026) |
| **3** | `20260927120000_wave3_step3_3_5_offline_replay_key` | 1,454 | `0b00159cd62da860f770558a46312c7442e59907d481123796771e15ff043b5c` | Committed (Sept 2026) |
| **4** | `20260928000000_step_3_4_purchase_payments` | 1,517 | `56a2e25cd3b83379d9c0e37c363839d43a3f85e8163f74a269a6fe77d9e9221e` | Committed (Sept 2026) |
| **5** | `20260928000001_step_3_5_sale_payments` | 275 | `2beb6f48ab982aa0b02e3fb5fa2f096dc3957a0f26f6ab098e8482a16a40334f` | Committed (Sept 2026) |
| **6** | `20260928000002_step_3_6_returns_credit_debit_notes` | 10,336 | `e64e132993688391e9ec4f7aa696ff92ff83ae86ad54643ea3ed902aa38a4a22` | Committed (Sept 2026) |
| **7** | `20260928000003_rbac_and_tenant_modules` | 4,754 | `b7c63561df634455428f392f91bb244aa28856d2ceca2d25e1c44645fae8e62c` | Committed (Sept 2026) |
| **8** | `20261102000000_add_device_sessions` | 1,998 | `b2685a0f108cabb31dd6508f7489f226d242e8b2350f51f64a20ab8918149dc4` | Local Reconciled (PostgreSQL DDL) |
| **9** | `20261103000002_add_branch_geofencing` | 257 | `79e4bc5d3dad92bd34629a5d04d8435c67efa1af6d2d9ed2c61b3587737aa475` | Committed (Nov 2026) |
| **10** | `20261104100000_aud_conc_002_idempotency_constraints` | 887 | `c690e00389f5d80c548f2ca74deeff24534894a680b7957d6119dede4f26070e` | Local Prepared (AUD-CONC-002) |

---

## 2. Migrations 1–7 Execution Certification on PostgreSQL 17

Direct raw execution of Migrations 1–7 SQL files was conducted on a clean PostgreSQL 17 database to verify engine compatibility:

| Mig # | Duration | Exit Status | Engine Output / Error Description | Operational Disposition |
| :---: | :---: | :---: | :--- | :--- |
| **1** | 96.48 ms | 0 (error printed) | `ERROR: syntax error at or near "\`"` | Baseline Resolve `--applied` |
| **2** | 102.74 ms | 0 (error printed) | `ERROR: syntax error at or near "\`"` | Baseline Resolve `--applied` |
| **3** | 113.12 ms | 0 (error printed) | `ERROR: syntax error at or near "\`"` | Baseline Resolve `--applied` |
| **4** | 103.18 ms | 0 (error printed) | `ERROR: syntax error at or near "\`"` | Baseline Resolve `--applied` |
| **5** | 104.16 ms | 0 (error printed) | `ERROR: syntax error at or near "\`"` | Baseline Resolve `--applied` |
| **6** | 103.27 ms | 0 (error printed) | `ERROR: syntax error at or near "\`"` | Baseline Resolve `--applied` |
| **7** | 94.01 ms | 0 (error printed) | `ERROR: syntax error at or near "\`"` | Baseline Resolve `--applied` |

### Architectural Conclusion for Migrations 1–7:
- Raw execution on PostgreSQL 17 fails immediately due to legacy MySQL DDL syntax (backtick identifiers, `DATETIME(3)`, `ENGINE=InnoDB`).
- All 48 schema objects declared across these 7 migrations were previously proven to exist in the live Supabase PostgreSQL 17 catalogs with 100% equivalence (`scripts/verify_migrations_1_7.cjs`).
- Therefore, executing `prisma migrate deploy` on Migrations 1–7 would be catastrophic. The correct, verified path is recording them as baseline markers via `prisma migrate resolve --applied`.

---

## 3. Migration 8 (`device_sessions`) PostgreSQL 17 Validation

- **Execution Duration:** 118.84 ms
- **Rerun Idempotency Duration:** 87.85 ms (Exit status: 0)

### Column Schema Verification (18 Columns Verified):
```
 ordinal_position |    column_name     |          data_type          | is_nullable |  column_default   
------------------+--------------------+-----------------------------+-------------+-------------------
                1 | id                 | character varying           | NO          | 
                2 | user_id            | character varying           | NO          | 
                3 | tenant_id          | character varying           | NO          | 
                4 | device_name        | character varying           | YES         | 
                5 | device_type        | character varying           | YES         | 
                6 | browser            | character varying           | YES         | 
                7 | operating_system   | character varying           | YES         | 
                8 | ip_address         | character varying           | YES         | 
                9 | country            | character varying           | YES         | 
               10 | city               | character varying           | YES         | 
               11 | user_agent         | text                        | YES         | 
               12 | refresh_token_hash | character varying           | YES         | 
               13 | last_active_at     | timestamp without time zone | YES         | 
               14 | expires_at         | timestamp without time zone | YES         | 
               15 | revoked_at         | timestamp without time zone | YES         | 
               16 | revoked            | boolean                     | NO          | false
               17 | created_at         | timestamp without time zone | NO          | CURRENT_TIMESTAMP
               18 | updated_at         | timestamp without time zone | NO          | CURRENT_TIMESTAMP
```

### Index Verification (Primary Key + 4 B-Tree Indexes):
1. `device_sessions_pkey` ON `(id)` (UNIQUE)
2. `device_sessions_refresh_token_hash_idx` ON `(refresh_token_hash)`
3. `device_sessions_tenant_id_idx` ON `(tenant_id)`
4. `device_sessions_user_id_idx` ON `(user_id)`
5. `device_sessions_user_id_revoked_idx` ON `(user_id, revoked)`

### Foreign Key & Cascade Verification:
- Deleting a user (`user-cascade-test`) cascaded deletion of all associated `device_sessions` records. Post-deletion count: `0`.

---

## 4. Migration 9 (`branches` Geofencing) PostgreSQL 17 Validation

- **Execution Duration:** 88.16 ms
- **Rerun Idempotency Duration:** 90.21 ms (Exit status: 0)

### Column Parity:
```
   column_name   |    data_type     | is_nullable | column_default 
-----------------+------------------+-------------+----------------
 geofence_radius | integer          | YES         | 500
 latitude        | double precision | YES         | 
 longitude       | double precision | YES         | 
```

- Idempotency confirmed via `ADD COLUMN IF NOT EXISTS`.

---

## 5. Migration 10 (Financial Idempotency Constraints) PostgreSQL 17 Validation

- **Execution Duration:** 86.97 ms
- **Rerun Idempotency Duration:** 89.70 ms (Exit status: 0)

### Partial Unique Indexes in `pg_indexes`:
1. `uq_journal_entries_tenant_payroll_run`:
   ```sql
   CREATE UNIQUE INDEX uq_journal_entries_tenant_payroll_run 
   ON public.journal_entries USING btree (tenant_id, reference) 
   WHERE ((reference IS NOT NULL) AND ((reference_type)::text = 'payroll'::text))
   ```
2. `uq_loan_installments_loan_payroll_run`:
   ```sql
   CREATE UNIQUE INDEX uq_loan_installments_loan_payroll_run 
   ON public.loan_installments USING btree (loan_id, payroll_run_id) 
   WHERE (payroll_run_id IS NOT NULL)
   ```

### Functional Concurrency & Idempotency Tests:
1. **Journal Entries Duplicate Rejection:**
   - Attempting to insert a second journal entry for the same tenant and reference with `reference_type = 'payroll'` was immediately rejected with:
     `ERROR: duplicate key value violates unique constraint "uq_journal_entries_tenant_payroll_run"` (SQLSTATE `23505`).
2. **Non-Payroll Pass-Through:**
   - An entry with the same reference but `reference_type = 'invoice'` succeeded without conflict.
3. **Loan Installment Duplicate Rejection:**
   - Attempting to record a second installment for `(loan-101, PR-RUN-2026-11)` was rejected with:
     `ERROR: duplicate key value violates unique constraint "uq_loan_installments_loan_payroll_run"` (SQLSTATE `23505`).
4. **Manual Installment Pass-Through:**
   - Multiple manual repayments with `payroll_run_id = NULL` inserted cleanly without triggering the unique constraint.

