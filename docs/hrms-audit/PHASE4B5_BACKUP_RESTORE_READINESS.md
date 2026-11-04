# MASTERHRMS — PHASE 4B.5
# PRODUCTION BACKUP & RESTORE READINESS SPECIFICATION

**Document Reference:** `docs/hrms-audit/PHASE4B5_BACKUP_RESTORE_READINESS.md`  
**Date:** 2026-11-04  
**Auditor Roles:** Principal Site Reliability Engineer & PostgreSQL Database Architect  
**Repository:** `Webfamily-06/masterhrms`  
**Target Environment:** Supabase Managed PostgreSQL 17 (`aws-0-ap-south-1.pooler.supabase.com`, project `ofzbhbcnizyegroggkxl`)  
**Direct Port:** `5432` | **Transaction Pooler Port:** `6543`  
**Status:** SPECIFIED & READY FOR OPERATOR RUNBOOK EXECUTION  
*(Operational Boundary: Read-Only Specification — No Production Backups or Restores Executed in this Phase)*

---

## 1. Connection Architecture: Direct Port 5432 vs Pooler Port 6543

A critical failure point on managed platforms like Supabase is attempting to run backup or non-transactional maintenance utilities through a connection pooler:

| Parameter / Capability | PgBouncer Pooler (Port 6543) | Direct PostgreSQL (Port 5432) |
| :--- | :--- | :--- |
| **Connection Protocol** | Transaction-level pooling | Direct dedicated backend session |
| **`pg_dump` Binary Streaming** | **UNSUPPORTED** (Fails with protocol errors / timeout) | **MANDATORY** (Supports continuous streaming) |
| **`pg_restore` COPY Execution** | **UNSUPPORTED** (Fails on multi-command batches) | **MANDATORY** (Full DDL & bulk copy support) |
| **`CREATE INDEX CONCURRENTLY`**| **UNSUPPORTED** (Fails outside single-transaction mode) | **MANDATORY** (Direct non-transactional execution) |
| **Session-level GUC Parameters** | Resets between transactions | Persists for duration of connection |

**Mandatory Rule:** All backup operations (`pg_dump`), restore testing (`pg_restore`), and concurrent index builds must connect **exclusively to Direct Port 5432**.

---

## 2. Secure Credential Handling (Zero CLI Exposure)

Under no circumstances may database passwords be passed as command-line arguments, written to plaintext files in the repository, or printed in command shell histories.

### Approved Secure Pattern: Masked Environment Prompt
```bash
# Prompt operator securely in interactive shell (no character echo)
read -s -p "Enter Supabase Database Password: " DB_PASS
export PGPASSWORD="$DB_PASS"

# Execute pg_dump on Direct Port 5432
pg_dump -h aws-0-ap-south-1.pooler.supabase.com \
        -p 5432 \
        -U postgres.ofzbhbcnizyegroggkxl \
        -d postgres \
        -n public \
        --no-owner \
        --no-acl \
        -Fc \
        -f backup_masterhrms_pre_phase4b_$(date +%Y%m%d_%H%M%S).dump

# Immediately unset variables from environment memory
unset PGPASSWORD
unset DB_PASS
```

---

## 3. Scope of Logical Dump vs Exclusions

The logical dump command targets the `public` application schema exclusively:

### Included in Dump:
- All 276 application tables and sequences.
- All live data tuples (including 21 `leave_requests` records, employee profiles, payroll runs).
- Primary keys, foreign keys, unique constraints, and B-tree indexes.

### Excluded from Dump:
- `auth` schema: Managed internally by Supabase GoTrue authentication microservice.
- `storage` schema: Managed by Supabase Storage service.
- `vault`, `graphql`, `realtime`: Managed Supabase extensions and publication slots.
- Database roles & ownerships (`--no-owner`, `--no-acl`): Enables restore into any clean test database without encountering missing role errors.

---

## 4. Disaster Recovery Architecture: PITR vs Logical Dump

| Disaster Recovery Layer | Mechanism | RPO (Data Loss Window) | RTO (Recovery Time) | Granularity |
| :--- | :--- | :--- | :--- | :--- |
| **Layer 1: Supabase PITR** | Continuous WAL archiving to AWS S3 every 2 minutes | ~2 minutes | 15–30 minutes | Full cluster restore (rewinds entire database) |
| **Layer 2: Custom Logical Dump** | `pg_dump -Fc` compressed archive on Port 5432 | Point of dump snapshot | 3–5 minutes | Granular table/schema restore (`pg_restore`) |

---

## 5. Isolated Restore Verification Protocol

Before declaring backup readiness for production changes, the operator must verify the dump archive using this isolated restore sequence:

```bash
# 1. Create temporary isolated test database on local/staging instance
createdb -h 127.0.0.1 -p 5434 -U postgres hrms_restore_verification

# 2. Execute dry-run TOC inspection
pg_restore -l backup_masterhrms_pre_phase4b_*.dump | grep "TABLE DATA public leave_requests"

# 3. Perform test restore into isolated database
pg_restore -h 127.0.0.1 \
           -p 5434 \
           -U postgres \
           -d hrms_restore_verification \
           --clean \
           --if-exists \
           --no-owner \
           --no-acl \
           --exit-on-error \
           backup_masterhrms_pre_phase4b_*.dump

# 4. Verify restored record counts
psql -h 127.0.0.1 -p 5434 -U postgres -d hrms_restore_verification -c "SELECT count(*) FROM leave_requests;"
# Must yield exactly 21 rows

# 5. Clean up verification database
dropdb -h 127.0.0.1 -p 5434 -U postgres hrms_restore_verification
```

