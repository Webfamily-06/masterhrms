# MASTERHRMS — PHASE 4A
## Production Database Pre-Migration Safety, Backup & Rollback Plan

**Document Reference:** `docs/hrms-audit/PHASE4A_BACKUP_AND_ROLLBACK_PLAN.md`  
**Execution Date:** 2026-11-04  
**Author:** Principal SRE Lead & PostgreSQL Database Architect  
**Platform:** Supabase Managed PostgreSQL (`aws-0-ap-south-1.pooler.supabase.com`)  
**Scope:** Pre-migration safety checklist, snapshot & logical backup procedures, lock level analysis, connection pool routing, and rapid rollback runbooks  
**Status:** **OPERATIONAL SAFETY PLAN — READY FOR SCHEDULED MAINTENANCE**

---

## 1. Executive Summary

Executing database DDL in a production HRMS/payroll environment requires institutional-grade risk management. Even non-destructive migrations (adding columns, creating indexes) carry locking and connection saturation risks if executed improperly.

This document details the complete safety checklist, backup protocols, connection pool routing, lock level expectations, and contingency procedures for Phase 4 database remediation.

---

## 2. Backup & Recovery Point Verification

### 2.1. Supabase Automated Backups & PITR
- **Infrastructure Provider:** Supabase Cloud / AWS Mumbai (`ap-south-1`).
- **Physical Snapshots:** Supabase Pro/Team plans execute daily automated physical snapshots with a default 7-day retention period.
- **Point-in-Time Recovery (PITR):**
  - **Verification Status:** Unverified in application configuration (requires Supabase Dashboard access).
  - **Requirement:** Before initiating maintenance, the database administrator must confirm via the Supabase Dashboard (`Settings -> Backups`) that PITR is enabled with a recovery granularity of at least 7 days.
  - If PITR is not enabled, the **Logical Backup Alternative** (Section 2.2) is mandatory.

### 2.2. Pre-Migration Logical Backup (`pg_dump`)
Prior to executing any DDL, an independent, verifiable logical backup must be generated using `pg_dump` over the Direct Connection (port `5432`).

#### Command for Full Database Backup:
```bash
# Execute from an authorized bastion or administrative terminal with direct connectivity:
pg_dump "$DIRECT_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --verbose \
  --file="masterhrms_pre_migration_backup_$(date +%Y%m%d_%H%M%S).dump"
```

#### Command for Specific High-Risk Tables (`employees`, `leave_requests`, `journal_entries`, `loan_installments`):
```bash
pg_dump "$DIRECT_URL" \
  --format=custom \
  --table=public.employees \
  --table=public.leave_requests \
  --table=public.journal_entries \
  --table=public.journal_items \
  --table=public.loan_installments \
  --file="masterhrms_critical_tables_$(date +%Y%m%d_%H%M%S).dump"
```

### 2.3. Backup Integrity Verification
A backup is invalid until verified. Immediately following logical extraction:
```bash
# Verify dump archive integrity and list contents without restoring
pg_restore --list masterhrms_critical_tables_*.dump > /dev/null
echo "Backup verification exit code: $?"
```

---

## 3. Connection Pool & Routing Architecture

### 3.1. Direct Connection vs Transaction Pooler
- **Transaction Pooler (Port `6543` / PgBouncer):**
  - Configured for application runtime traffic (`DATABASE_URL`).
  - **DO NOT USE FOR DDL:** PgBouncer in transaction pooling mode breaks session-level features, disallows `CREATE INDEX CONCURRENTLY`, and drops connections during long-running DDL operations.
- **Direct PostgreSQL Connection (Port `5432` / `DIRECT_URL`):**
  - Bypasses PgBouncer and connects directly to the PostgreSQL engine.
  - **MANDATORY FOR ALL DDL:** Required for `ALTER TABLE`, `CREATE INDEX CONCURRENTLY`, and administrative scripts.

---

## 4. Operation Lock Levels & Execution Durations

The proposed migration steps have been analyzed for PostgreSQL lock impact:

| Step | Target Table | Operation | Lock Level Acquired | Blocks Reads? | Blocks Writes? | Estimated Duration |
|:---|:---|:---|:---|:---:|:---:|:---:|
| **1. REM-02 Index 1** | `journal_entries` | `CREATE UNIQUE INDEX CONCURRENTLY` | `SHARE UPDATE EXCLUSIVE` | **NO** | **NO** | 1.5 – 3.0s |
| **2. REM-02 Index 2** | `loan_installments` | `CREATE UNIQUE INDEX CONCURRENTLY` | `SHARE UPDATE EXCLUSIVE` | **NO** | **NO** | 1.0 – 2.5s |
| **3. Employee Drift** | `employees` | `ALTER TABLE ... ADD COLUMN (17 cols)` | `ACCESS EXCLUSIVE` (Catalog only) | **NO** | Brief (<50ms) | < 100ms |
| **4. Leave Days Type** | `leave_requests` | `ALTER TABLE ... ALTER COLUMN days TYPE NUMERIC(4,1)` | `ACCESS EXCLUSIVE` (Row scan/cast) | **NO** | Brief (<200ms) | < 250ms (21 rows) |
| **5. Device Sessions** | `device_sessions` | `CREATE TABLE IF NOT EXISTS` | `ACCESS EXCLUSIVE` (New table) | **NO** | **NO** (Table does not exist) | < 150ms |
| **6. Geofencing** | `branches` | `ALTER TABLE ... ADD COLUMN (3 cols)` | `ACCESS EXCLUSIVE` (Catalog only) | **NO** | Brief (<20ms) | < 50ms |
| **7. Baseline Tracking**| `_prisma_migrations` | `CREATE TABLE` & `INSERT` | `ACCESS EXCLUSIVE` (New table) | **NO** | **NO** | < 100ms |

### Key Architectural Takeaways:
1. **Zero Long-Running Table Locks:** Because `employees` columns are either `NULL` or constant defaults, PostgreSQL 11+ updates catalog metadata without rewriting rows.
2. **Zero Write-Blocking on Financials:** `CREATE UNIQUE INDEX CONCURRENTLY` ensures incoming ledger entries and loan deductions continue unimpeded.
3. **Total Cumulative Maintenance Lock Time:** Less than 1 second across the entire database.

---

## 5. Maintenance Window Recommendations

- **Recommended Window:** Sunday 01:00 AM – 03:00 AM IST (off-peak business hours, zero payroll processing).
- **Preparation Lead Time:** 48 hours prior notification to tenant administrators.
- **Application Traffic Strategy:**
  - Standard user sessions may remain active (read-only queries are completely unaffected).
  - Automated cron jobs (especially automated payroll runs) should be paused for a 15-minute maintenance interval.

---

## 6. Comprehensive Emergency Rollback Runbook

If any stage fails or produces unexpected application regressions, execute the appropriate rollback script immediately:

```sql
-- ============================================================================
-- EMERGENCY MASTER ROLLBACK SCRIPT (PHASE 4)
-- ============================================================================

-- 1. Rollback REM-02 Indexes
DROP INDEX CONCURRENTLY IF EXISTS uq_journal_entries_tenant_payroll_run;
DROP INDEX CONCURRENTLY IF EXISTS uq_loan_installments_loan_payroll_run;

-- 2. Rollback Device Sessions
DROP TABLE IF EXISTS "device_sessions";

-- 3. Rollback Leave Requests Datatype
ALTER TABLE "leave_requests" 
  ALTER COLUMN "days" TYPE INTEGER USING ROUND("days")::INTEGER,
  ALTER COLUMN "days" SET DEFAULT 1;

-- 4. Rollback Branch Geofencing
ALTER TABLE "branches" 
  DROP COLUMN IF EXISTS "latitude",
  DROP COLUMN IF EXISTS "longitude",
  DROP COLUMN IF EXISTS "geofence_radius";

-- 5. Rollback Employee Columns
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

## 7. Operational Checklist & Sign-Off

- [ ] Direct connection (`DIRECT_URL` on port `5432`) validated.
- [ ] Pre-migration logical backup archive completed and verified with `pg_restore --list`.
- [ ] Maintenance window scheduled and announced.
- [ ] Off-peak cron jobs temporarily paused.
- [ ] Rollback script verified and standing by.
- [ ] Approved by Lead Database Architect and SRE Director.

