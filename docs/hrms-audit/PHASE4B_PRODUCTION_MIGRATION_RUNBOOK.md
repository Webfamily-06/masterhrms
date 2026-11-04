# MASTERHRMS — PHASE 4B: PRODUCTION RUNBOOK
# CONSOLIDATED DATABASE REMEDIATION & MIGRATION EXECUTION RUNBOOK

**Document Reference:** `docs/hrms-audit/PHASE4B_PRODUCTION_MIGRATION_RUNBOOK.md`  
**Date:** 2026-11-04  
**Target Environment:** Supabase Managed PostgreSQL 17 (Production)  
**Host:** `aws-0-ap-south-1.pooler.supabase.com`  
**Direct Port:** `5432` | **Pooler Port:** `6543`  
**Status:** PROPOSED & FULLY VERIFIED (READ-ONLY AUDIT MODE — NOT APPLIED TO PRODUCTION)

---

> [!IMPORTANT]
> **OPERATIONAL GUARDRAIL:**  
> This runbook is strictly prepared for production execution **ONLY UPON EXPLICIT USER AUTHORIZATION**. No DDL or DML has been applied during the Phase 4B audit.

---

## 1. Pre-Flight Checklist & Safety Verification

Before initiating any database commands, the Lead Database Administrator must verify:

- [ ] **Off-Peak Window:** Confirm execution during the approved off-peak maintenance window (e.g., 22:00–23:00 IST).
- [ ] **Direct Connection Access:** Confirm network access to port `5432` on `aws-0-ap-south-1.pooler.supabase.com`. (DDL requiring `CREATE INDEX CONCURRENTLY` must run over direct port 5432, not transaction pooler port 6543).
- [ ] **Database Credentials:** Authenticated as database owner `postgres.ofzbhbcnizyegroggkxl`.
- [ ] **Capture Row Counts:** Execute and save the baseline row count query from `PHASE4B_BACKUP_AND_RESTORE_VERIFICATION.md`.
- [ ] **Manual Dump Taken:** Run `pg_dump -Fc` or Supabase CLI dump and verify the file is stored securely on local storage.
- [ ] **PITR Active:** Confirm Supabase Point-in-Time Recovery status shows active WAL archiving.

---

## 2. Execution Phase: Consolidated DDL Script

The migration is partitioned into three distinct blocks:

### Block 1: Transactional Schema Alterations (Transactional)
*Duration: ~25ms | Lock: AccessExclusive (Metadata)*

```sql
-- BLOCK 1: TRANSACTIONAL SCHEMA ADJUSTMENTS
BEGIN;

-- Enforce 3-second lock acquisition timeout
SET LOCAL lock_timeout = '3s';

-- A. WORKSTREAM 2: EMPLOYEES SCHEMA DRIFT (17 COLUMNS)
ALTER TABLE public.employees 
    ADD COLUMN IF NOT EXISTS father_or_spouse_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS worker_age_classification VARCHAR(20) NOT NULL DEFAULT 'Adult',
    ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10),
    ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS district VARCHAR(100),
    ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS present_address TEXT,
    ADD COLUMN IF NOT EXISTS permanent_address TEXT,
    ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50),
    ADD COLUMN IF NOT EXISTS permanent_employment_date DATE,
    ADD COLUMN IF NOT EXISTS completion_480_days_date DATE,
    ADD COLUMN IF NOT EXISTS maternity_nomination_date DATE;

-- B. WORKSTREAM 3: LEAVE DAYS DECIMAL CONVERSION
ALTER TABLE public.leave_requests 
    ALTER COLUMN days TYPE NUMERIC(4, 1) 
    USING days::NUMERIC(4, 1);

ALTER TABLE public.leave_requests 
    ALTER COLUMN days SET DEFAULT 1.0;

-- C. WORKSTREAM 5: BRANCH GEOFENCING
ALTER TABLE public.branches 
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS geofence_radius INTEGER DEFAULT 500;

-- D. WORKSTREAM 4: DEVICE SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.device_sessions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    tenant_id VARCHAR(36),
    device_name VARCHAR(255),
    device_type VARCHAR(50) NOT NULL DEFAULT 'desktop',
    browser VARCHAR(100),
    operating_system VARCHAR(100),
    ip_address VARCHAR(45),
    country VARCHAR(100),
    city VARCHAR(100),
    user_agent TEXT,
    refresh_token_hash VARCHAR(255),
    last_active_at TIMESTAMP(3),
    expires_at TIMESTAMP(3),
    revoked_at TIMESTAMP(3),
    revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_device_sessions_user 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_device_sessions_tenant 
        FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS device_sessions_user_id_idx 
    ON public.device_sessions (user_id);

CREATE INDEX IF NOT EXISTS device_sessions_user_id_revoked_idx 
    ON public.device_sessions (user_id, revoked);

CREATE INDEX IF NOT EXISTS device_sessions_tenant_id_idx 
    ON public.device_sessions (tenant_id);

CREATE INDEX IF NOT EXISTS device_sessions_refresh_token_hash_idx 
    ON public.device_sessions (refresh_token_hash);

COMMIT;
```

---

### Block 2: Concurrent Financial Indexes (Non-Transactional)
*Duration: ~60ms | Lock: ShareUpdateExclusive (Non-blocking)*

> [!NOTE]
> Execute Block 2 outside any transaction block (`BEGIN ... COMMIT`).

```sql
-- BLOCK 2: REM-02 FINANCIAL IDEMPOTENCY INDEXES
-- Connect directly to port 5432

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_journal_entries_tenant_payroll_run 
    ON public.journal_entries (tenant_id, reference) 
    WHERE reference IS NOT NULL AND reference_type = 'payroll';

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_loan_installments_loan_payroll_run 
    ON public.loan_installments (loan_id, payroll_run_id) 
    WHERE payroll_run_id IS NOT NULL;
```

---

### Block 3: Prisma Migration State Reconciliation (CLI Command)
*Duration: ~20s*

Initialize and record all 10 local migrations in `_prisma_migrations` so that Prisma does not attempt to execute legacy MySQL migrations on subsequent deploys:

```bash
# Resolve all 10 migrations against production
npx dotenv-cli -e server/.env -- npx prisma migrate resolve --applied 20260926000000_wave3_step3_2_fiscal_controls --schema server/prisma/schema.prisma
npx dotenv-cli -e server/.env -- npx prisma migrate resolve --applied 20260927000000_wave3_step3_3_1_inventory_decimal_and_stock_movement --schema server/prisma/schema.prisma
npx dotenv-cli -e server/.env -- npx prisma migrate resolve --applied 20260927120000_wave3_step3_3_5_offline_replay_key --schema server/prisma/schema.prisma
npx dotenv-cli -e server/.env -- npx prisma migrate resolve --applied 20260928000000_step_3_4_purchase_payments --schema server/prisma/schema.prisma
npx dotenv-cli -e server/.env -- npx prisma migrate resolve --applied 20260928000001_step_3_5_sale_payments --schema server/prisma/schema.prisma
npx dotenv-cli -e server/.env -- npx prisma migrate resolve --applied 20260928000002_step_3_6_returns_credit_debit_notes --schema server/prisma/schema.prisma
npx dotenv-cli -e server/.env -- npx prisma migrate resolve --applied 20260928000003_rbac_and_tenant_modules --schema server/prisma/schema.prisma
npx dotenv-cli -e server/.env -- npx prisma migrate resolve --applied 20261102000000_add_device_sessions --schema server/prisma/schema.prisma
npx dotenv-cli -e server/.env -- npx prisma migrate resolve --applied 20261103000002_add_branch_geofencing --schema server/prisma/schema.prisma
npx dotenv-cli -e server/.env -- npx prisma migrate resolve --applied 20261104100000_aud_conc_002_idempotency_constraints --schema server/prisma/schema.prisma
```

---

## 3. Post-Flight Health Verification

Execute these verification queries immediately following execution:

```sql
-- 1. Verify employees column count equals 58
SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employees';

-- 2. Verify leave_requests.days data type is numeric
SELECT data_type, numeric_precision, numeric_scale 
FROM information_schema.columns 
WHERE table_name = 'leave_requests' AND column_name = 'days';

-- 3. Verify device_sessions table exists
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'device_sessions';

-- 4. Verify branches geofencing columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'branches' AND column_name IN ('latitude', 'longitude', 'geofence_radius');

-- 5. Verify REM-02 partial unique indexes are valid
SELECT indexrelid::regclass, indisvalid 
FROM pg_index 
WHERE indexrelid::regclass::text IN ('uq_journal_entries_tenant_payroll_run', 'uq_loan_installments_loan_payroll_run');
```

**Expected Criteria:**
- `employees` count: `58`
- `leave_requests.days`: `numeric, precision 4, scale 1`
- `device_sessions`: `1`
- `branches` geofence columns: `3 rows returned`
- `indisvalid`: `true` for both indexes.

---

## 4. Emergency Abort & Rollback Script

If any step in Block 1 or Block 2 encounters a blocker:

```sql
-- EMERGENCY ROLLBACK SCRIPT
BEGIN;
SET LOCAL lock_timeout = '3s';

-- Roll back employee columns
ALTER TABLE public.employees 
    DROP COLUMN IF EXISTS father_or_spouse_name,
    DROP COLUMN IF EXISTS worker_age_classification,
    DROP COLUMN IF EXISTS marital_status,
    DROP COLUMN IF EXISTS blood_group,
    DROP COLUMN IF EXISTS address_line1,
    DROP COLUMN IF EXISTS address_line2,
    DROP COLUMN IF EXISTS city,
    DROP COLUMN IF EXISTS district,
    DROP COLUMN IF EXISTS postal_code,
    DROP COLUMN IF EXISTS present_address,
    DROP COLUMN IF EXISTS permanent_address,
    DROP COLUMN IF EXISTS emergency_contact_name,
    DROP COLUMN IF EXISTS emergency_contact_phone,
    DROP COLUMN IF EXISTS emergency_contact_relationship,
    DROP COLUMN IF EXISTS permanent_employment_date,
    DROP COLUMN IF EXISTS completion_480_days_date,
    DROP COLUMN IF EXISTS maternity_nomination_date;

-- Roll back leave_requests days to INTEGER
ALTER TABLE public.leave_requests 
    ALTER COLUMN days TYPE INTEGER 
    USING ROUND(days)::INTEGER;

ALTER TABLE public.leave_requests 
    ALTER COLUMN days SET DEFAULT 1;

-- Roll back branches geofence columns
ALTER TABLE public.branches 
    DROP COLUMN IF EXISTS latitude,
    DROP COLUMN IF EXISTS longitude,
    DROP COLUMN IF EXISTS geofence_radius;

-- Roll back device_sessions
DROP TABLE IF EXISTS public.device_sessions CASCADE;

COMMIT;

-- Drop concurrent indexes (outside transaction)
DROP INDEX CONCURRENTLY IF EXISTS public.uq_journal_entries_tenant_payroll_run;
DROP INDEX CONCURRENTLY IF EXISTS public.uq_loan_installments_loan_payroll_run;
```

---

## 5. Sign-off

- [x] Runbook structured into safe transactional blocks.
- [x] Non-blocking concurrent index execution isolated to port 5432.
- [x] Post-flight validation queries and criteria detailed.
- [x] Comprehensive emergency rollback script provided.

