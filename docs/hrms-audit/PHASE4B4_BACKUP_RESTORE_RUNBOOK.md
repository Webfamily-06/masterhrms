# MASTERHRMS — PHASE 4B.4 & PHASE 4B.5
# PRODUCTION BACKUP & ISOLATED RESTORE RUNBOOK

**Document Reference:** `docs/hrms-audit/PHASE4B4_BACKUP_RESTORE_RUNBOOK.md`  
**Date:** 2026-11-04  
**Auditor:** Principal PostgreSQL Architect & Site Reliability Engineer  
**Target Platform:** Supabase Managed PostgreSQL 17 (`aws-0-ap-south-1.pooler.supabase.com`)  
**Direct Port:** `5432` | **Pooler Port:** `6543`  
**Status:** FULLY RECONCILED — READY FOR PRODUCTION AUTHORIZATION GATE  
*(Operational Boundary: Read-Only Audit — No Production Backup or Restore Operations Executed in this Phase)*

---

## 1. Executive Summary

Prior to applying any DDL statements to the production Supabase PostgreSQL instance, a verified physical disaster recovery protocol must be established. 

This runbook defines:
1. The **secure logical backup protocol** using direct connection port 5432 and masked credentials.
2. The exact **exclusions and boundaries** of public-schema logical dumps.
3. The **distinction between Supabase Point-in-Time Recovery (PITR) and Logical Dump**.
4. The **isolated restore verification protocol** and acceptance criteria.

---

## 2. Infrastructure Backup Architecture: PITR vs Logical Dump

A critical architectural distinction exists between Supabase platform PITR and operator-controlled logical dumps:

```
+-----------------------------------------------------------------------------------+
|                           DISASTER RECOVERY ARCHITECTURE                          |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ LAYER 1: PLATFORM POINT-IN-TIME RECOVERY (PITR) ]                              |
|  - Managed infrastructure service by Supabase / AWS.                              |
|  - Continuous WAL streaming archived to Amazon S3 every 2 minutes.                |
|  - Granularity: Sub-second recovery across the entire PostgreSQL cluster.         |
|  - RPO: ~2 minutes.                                                               |
|  - Caveat: Full cluster restore. Rewinds the ENTIRE database (auth, storage,      |
|    all tenants). Cannot selectively restore a single table or single tenant.      |
|                                                                                   |
|  [ LAYER 2: LOGICAL SCHEMA & DATA BACKUP (pg_dump -Fc) ]                          |
|  - Operator-controlled custom format dump executed on Direct Port 5432.           |
|  - Scope: `public` application schema only (276 tables, data, indexes, sequences). |
|  - Granularity: Granular restore via `pg_restore`. Allows restoring specific      |
|    tables (e.g., `leave_requests`, `device_sessions`) without rewinding cluster.  |
|  - Requirement: Must be tested and verified against an isolated test engine       |
|    before DDL operations begin.                                                   |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 3. Secure Logical Dump Execution Protocol (Direct Port 5432)

### Connection Requirement:
- **Port 5432 (Direct PostgreSQL):** Mandatory. PgBouncer on port 6543 transaction mode terminates long-running cursor reads and does not support binary copy streaming.
- **Credential Masking:** Zero credentials logged to shell history.

### Operator Backup Command:
```bash
# Prompt DBA securely for production password (no CLI echo)
read -s -p "Enter Supabase Database Password: " DB_PASS
export PGPASSWORD="$DB_PASS"

# Run custom-format compressed public schema dump
pg_dump -h aws-0-ap-south-1.pooler.supabase.com \
        -p 5432 \
        -U postgres.ofzbhbcnizyegroggkxl \
        -d postgres \
        -n public \
        --no-owner \
        --no-acl \
        -Fc \
        -f backup_masterhrms_pre_phase4b_$(date +%Y%m%d_%H%M%S).dump

# Purge password immediately
unset PGPASSWORD
unset DB_PASS
```

### Logical Dump Scope & Exclusions:
| Scope Component | Included / Excluded | Technical Rationale |
| :--- | :--- | :--- |
| **`public` Application Tables** | **INCLUDED** | All 276 application tables and active records |
| **`public` Foreign Keys & Indexes** | **INCLUDED** | Full relational integrity definitions preserved |
| **`public` Sequences** | **INCLUDED** | Sequence counters preserved |
| **`auth` Schema** | **EXCLUDED** | Managed by Supabase GoTrue; dump would conflict with internal auth triggers |
| **`storage` Schema** | **EXCLUDED** | Managed by Supabase Storage microservice |
| **`vault`, `graphql`, `realtime`** | **EXCLUDED** | Internal Supabase infrastructure extensions |
| **Database Roles & Owners** | **EXCLUDED (`--no-owner`)** | Allows frictionless restore into any isolated PostgreSQL test instance |

---

## 4. Isolated Restore Verification Protocol

An untested backup is not a recovery plan. Before taking any production write action, the logical dump must be validated through an isolated restore dry-run.

### Step 1: Provision Isolated Disposable Test Database
```bash
createdb -h 127.0.0.1 -p 5434 -U postgres hrms_restore_test
```

### Step 2: Restore Logical Dump into Isolated Engine
```bash
pg_restore -h 127.0.0.1 \
           -p 5434 \
           -U postgres \
           -d hrms_restore_test \
           --clean \
           --if-exists \
           --no-owner \
           --no-acl \
           --exit-on-error \
           backup_masterhrms_pre_phase4b_*.dump
```

### Step 3: Acceptance Integrity Checks
1. **Table Count:** Verify restored database has exactly 276 tables in `public`.
2. **Leave Requests Record Count:** Verify `SELECT count(*) FROM leave_requests;` yields exactly 21.
3. **Data Parity:** Spot-check sample records across `users`, `tenants`, and `employees`.
4. **Cleanup:**
   ```bash
   dropdb -h 127.0.0.1 -p 5434 -U postgres hrms_restore_test
   ```
