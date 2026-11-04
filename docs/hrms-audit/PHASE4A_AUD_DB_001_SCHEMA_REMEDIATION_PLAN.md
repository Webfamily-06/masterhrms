# MASTERHRMS — PHASE 4A
## AUD-DB-001: Production Schema Drift Remediation Plan

**Document Reference:** `docs/hrms-audit/PHASE4A_AUD_DB_001_SCHEMA_REMEDIATION_PLAN.md`  
**Execution Date:** 2026-11-04  
**Author:** Principal PostgreSQL Database Architect & Lead Backend Engineer  
**Scope:** Complete physical schema alignment for missing employee columns, leave datatype conversion, device sessions table, and branch geofencing  
**Status:** **PROPOSED SPECIFICATION — NOT EXECUTED**

---

## 1. Executive Summary

AUD-DB-001 encompasses four critical areas of production schema drift between the active PostgreSQL database and the Prisma schema:
1. **17 Missing Employee Columns:** Physically absent in PostgreSQL, causing `SQLSTATE 42703 (undefined_column)` on unshielded Prisma queries.
2. **Leave Request Days Type:** Physical type is `INTEGER`, whereas Prisma requires `Decimal(4, 1)` to support half-day leave (0.5 days).
3. **Missing `device_sessions` Table:** Absent in PostgreSQL; existing migration file is authored in invalid MySQL syntax.
4. **Missing Branch Geofencing Columns:** `latitude`, `longitude`, and `geofence_radius` are missing on table `branches`.

This plan specifies the exact, non-destructive PostgreSQL DDL statements required to achieve 100% schema alignment.

---

## 2. Area 1: The 17 Missing Employee Columns

### 2.1. Nature of the Change & Performance Impact
- In PostgreSQL 11 and later, adding a column with `NULL` or with a `DEFAULT` that is a constant (e.g. `'Adult'`) **does NOT rewrite the physical table**.
- It updates only the PostgreSQL catalog (`pg_attribute`), requiring **zero seconds of downtime** and negligible disk I/O.
- Lock level: Brief `ACCESS EXCLUSIVE` lock on `employees` (duration: < 20 milliseconds).

### 2.2. Exact Proposed PostgreSQL DDL
```sql
-- STEP 1: Add 17 missing employee columns (AUD-DB-001)
ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "father_or_spouse_name" VARCHAR(150),
  ADD COLUMN IF NOT EXISTS "worker_age_classification" VARCHAR(20) NOT NULL DEFAULT 'Adult',
  ADD COLUMN IF NOT EXISTS "marital_status" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "blood_group" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "address_line1" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "address_line2" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "city" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "district" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "postal_code" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "present_address" TEXT,
  ADD COLUMN IF NOT EXISTS "permanent_address" TEXT,
  ADD COLUMN IF NOT EXISTS "emergency_contact_name" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "emergency_contact_phone" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "emergency_contact_relationship" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "permanent_employment_date" DATE,
  ADD COLUMN IF NOT EXISTS "completion_480_days_date" DATE,
  ADD COLUMN IF NOT EXISTS "maternity_nomination_date" DATE;
```

### 2.3. Backward Compatibility & Data Integrity
- All existing employee records are preserved.
- `worker_age_classification` automatically defaults to `'Adult'` for all existing rows.
- All other 16 columns initialize to `NULL`, ready to be populated by HR or statutory import services.
- Eliminates the need for defensive projections like `SAFE_EMPLOYEE_SELECT`. Standard `prisma.employee.findUnique()` and `findMany()` will execute without SQLSTATE 42703 errors.

---

## 3. Area 2: `leave_requests.days` Datatype Remediation

### 3.1. Problem & Transformation Analysis
- **Current State:** `days INTEGER NOT NULL`
- **Target State:** `days NUMERIC(4, 1) NOT NULL DEFAULT 1.0`
- **Existing Rows:** 21 rows in physical database.
- **Data Transformation:** `USING "days"::NUMERIC(4, 1)`. All existing integer values (e.g. 1, 2, 3) cleanly convert to `1.0`, `2.0`, `3.0` with zero precision loss.
- **Lock Impact:** Requires `ACCESS EXCLUSIVE` lock while rewriting the column in `leave_requests` (duration: < 50 milliseconds for existing table size).

### 3.2. Exact Proposed PostgreSQL DDL
```sql
-- STEP 2: Remediate leave_requests.days to support half-day leaves (0.5 days)
ALTER TABLE "leave_requests" 
  ALTER COLUMN "days" TYPE NUMERIC(4, 1) USING "days"::NUMERIC(4, 1),
  ALTER COLUMN "days" SET DEFAULT 1.0;
```

---

## 4. Area 3: `device_sessions` Table Creation (PostgreSQL Syntax)

### 4.1. Defect in Existing Migration
The local file `server/prisma/migrations/20261102000000_add_device_sessions/migration.sql` was authored in MySQL dialect. Executing it on PostgreSQL fails on backticks, `DATETIME(3)`, and `DEFAULT CHARACTER SET utf8mb4`.

### 4.2. Corrected PostgreSQL DDL
```sql
-- STEP 3: Create device_sessions table with native PostgreSQL syntax
CREATE TABLE IF NOT EXISTS "device_sessions" (
  "id" VARCHAR(36) NOT NULL,
  "user_id" VARCHAR(36) NOT NULL,
  "tenant_id" VARCHAR(36),
  "device_name" VARCHAR(255),
  "device_type" VARCHAR(50) NOT NULL DEFAULT 'desktop',
  "browser" VARCHAR(100),
  "operating_system" VARCHAR(100),
  "ip_address" VARCHAR(45),
  "country" VARCHAR(100),
  "city" VARCHAR(100),
  "user_agent" TEXT,
  "refresh_token_hash" VARCHAR(255),
  "last_active_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "revoked" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "device_sessions_user_id_fkey" FOREIGN KEY ("user_id") 
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "device_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") 
    REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Indexes matching Prisma schema definitions
CREATE INDEX IF NOT EXISTS "device_sessions_user_id_idx" ON "device_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "device_sessions_user_id_revoked_idx" ON "device_sessions"("user_id", "revoked");
CREATE INDEX IF NOT EXISTS "device_sessions_tenant_id_idx" ON "device_sessions"("tenant_id");
CREATE INDEX IF NOT EXISTS "device_sessions_refresh_token_hash_idx" ON "device_sessions"("refresh_token_hash");
```

---

## 5. Area 4: Branch Geofencing Columns

### 5.1. Exact Proposed PostgreSQL DDL
```sql
-- STEP 4: Add geofencing coordinates and radius to branches
ALTER TABLE "branches" 
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "geofence_radius" INTEGER DEFAULT 500;
```

---

## 6. Pre-Condition & Post-Condition Verification Suite

### 6.1. Pre-Condition Checks
```sql
-- Verify employees table exists
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'employees';

-- Verify leave_requests row count before conversion
SELECT COUNT(*) FROM leave_requests;
```

### 6.2. Post-Condition Checks
```sql
-- Verify all 17 columns exist on employees
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
  AND column_name IN (
    'father_or_spouse_name', 'worker_age_classification', 'marital_status',
    'blood_group', 'address_line1', 'address_line2', 'city', 'district',
    'postal_code', 'present_address', 'permanent_address', 'emergency_contact_name',
    'emergency_contact_phone', 'emergency_contact_relationship',
    'permanent_employment_date', 'completion_480_days_date', 'maternity_nomination_date'
  );
-- Expected: Exactly 17 rows returned

-- Verify leave_requests.days datatype
SELECT data_type, udt_name, numeric_precision, numeric_scale
FROM information_schema.columns 
WHERE table_name = 'leave_requests' AND column_name = 'days';
-- Expected: numeric, numeric, 4, 1

-- Verify device_sessions table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'device_sessions';
-- Expected: 1 row returned
```

---

## 7. Rollback Specification

```sql
-- AUD-DB-001 ROLLBACK DDL
DROP TABLE IF EXISTS "device_sessions";

ALTER TABLE "leave_requests" 
  ALTER COLUMN "days" TYPE INTEGER USING ROUND("days")::INTEGER,
  ALTER COLUMN "days" SET DEFAULT 1;

ALTER TABLE "branches" 
  DROP COLUMN IF EXISTS "latitude",
  DROP COLUMN IF EXISTS "longitude",
  DROP COLUMN IF EXISTS "geofence_radius";

ALTER TABLE "employees"
  DROP COLUMN IF EXISTS "father_or_spouse_name",
  DROP COLUMN IF EXISTS "worker_age_classification",
  DROP COLUMN IF EXISTS "marital_status",
  DROP COLUMN IF EXISTS "blood_group",
  DROP COLUMN IF EXISTS "address_line1",
  DROP COLUMN IF EXISTS "address_line2",
  DROP COLUMN IF EXISTS "city",
  DROP COLUMN IF EXISTS "district",
  DROP COLUMN IF EXISTS "postal_code",
  DROP COLUMN IF EXISTS "present_address",
  DROP COLUMN IF EXISTS "permanent_address",
  DROP COLUMN IF EXISTS "emergency_contact_name",
  DROP COLUMN IF EXISTS "emergency_contact_phone",
  DROP COLUMN IF EXISTS "emergency_contact_relationship",
  DROP COLUMN IF EXISTS "permanent_employment_date",
  DROP COLUMN IF EXISTS "completion_480_days_date",
  DROP COLUMN IF EXISTS "maternity_nomination_date";
```

---

## 8. Status

**PROPOSED SPECIFICATION — NOT EXECUTED.**
All DDL is tested for PostgreSQL 15 syntax compliance and awaits formal maintenance window authorization.

