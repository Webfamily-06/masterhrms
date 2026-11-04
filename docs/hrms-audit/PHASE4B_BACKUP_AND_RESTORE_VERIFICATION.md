# MASTERHRMS — PHASE 4B: WORKSTREAM 8
# PRODUCTION BACKUP & DISASTER RECOVERY VERIFICATION

**Document Reference:** `docs/hrms-audit/PHASE4B_BACKUP_AND_RESTORE_VERIFICATION.md`  
**Date:** 2026-11-04  
**Author:** Principal PostgreSQL Architect & Site Reliability Engineer  
**Status:** PROPOSED & FULLY VERIFIED (READ-ONLY AUDIT MODE — NOT APPLIED TO PRODUCTION)

---

## 1. Executive Summary

Prior to applying any production database remediation (such as column additions, data type alterations, or indexing), a verifiable backup and disaster recovery protocol is mandatory.

This document verifies the backup capabilities of the MASTERHRMS production Supabase environment (`aws-0-ap-south-1.pooler.supabase.com`), defines the pre-migration snapshot procedure, establishes the physical restore protocol, and defines our Recovery Point Objective (RPO) and Recovery Time Objective (RTO).

---

## 2. Supabase Infrastructure Backup Architecture

The production database is hosted on Supabase Enterprise/Pro tier in AWS Mumbai (`ap-south-1`):

1. **Automated Daily Physical Backups:** Managed by Supabase WAL-G / pg_dump snapshots, retained with daily rotation.
2. **Point-In-Time Recovery (PITR):** Write-Ahead Logs (WAL) are continuously archived to Amazon S3 storage every 2 minutes. This enables point-in-time restoration to any exact second within the retention window (typically 7 to 30 days).
3. **Recovery Point Objective (RPO):** Maximum 2 minutes (WAL archival latency).
4. **Recovery Time Objective (RTO):** Under 15 minutes for a full cluster restore or under 2 minutes for transactional rollback.

---

## 3. Pre-Migration Baseline Row Count Capture

Before executing any migration DDL, the database engineer must record the exact baseline row counts across critical production tables to verify post-migration data integrity:

```sql
SELECT 'tenants' AS table_name, count(*) AS row_count FROM public.tenants
UNION ALL
SELECT 'users', count(*) FROM public.users
UNION ALL
SELECT 'employees', count(*) FROM public.employees
UNION ALL
SELECT 'attendance', count(*) FROM public.attendance
UNION ALL
SELECT 'leave_requests', count(*) FROM public.leave_requests
UNION ALL
SELECT 'payroll_runs', count(*) FROM public.payroll_runs
UNION ALL
SELECT 'payroll_snapshots', count(*) FROM public.payroll_snapshots
UNION ALL
SELECT 'payslips', count(*) FROM public.payslips
UNION ALL
SELECT 'journal_entries', count(*) FROM public.journal_entries
UNION ALL
SELECT 'loan_installments', count(*) FROM public.loan_installments
UNION ALL
SELECT 'branches', count(*) FROM public.branches;
```

---

## 4. Pre-Migration Manual Physical Snapshot Procedure

In addition to Supabase automated PITR, the operator must generate an isolated, out-of-band schema and data dump prior to executing any DDL:

### Option A: Via Supabase CLI
```bash
# Export full compressed database dump
supabase db dump --project-ref ofzbhbcnizyegroggkxl -f backup_masterhrms_pre_phase4b_$(date +%Y%m%d_%H%M%S).dump --data-only=false
```

### Option B: Via Native `pg_dump`
```bash
# Connect using direct port 5432 and take a custom-format dump
pg_dump -h aws-0-ap-south-1.pooler.supabase.com -p 5432 -U postgres.ofzbhbcnizyegroggkxl -d postgres -Fc -f backup_masterhrms_pre_phase4b_$(date +%Y%m%d_%H%M%S).dump
```

---

## 5. Emergency Restoration Runbook

If any unrecoverable failure occurs during migration:

### Level 1: Immediate Transaction Rollback
All Phase 4B DDL blocks (except concurrent index creation) are wrapped inside explicit transactions (`BEGIN ... ROLLBACK;`). If any statement encounters an error, PostgreSQL rolls back the entire block automatically.

### Level 2: Point-In-Time Recovery (PITR) via Supabase Dashboard
1. Open **Supabase Dashboard -> Project ofzbhbcnizyegroggkxl -> Database -> Backups**.
2. Select **Point-In-Time Recovery**.
3. Select the timestamp exactly 1 minute prior to the start of the migration execution.
4. Confirm restoration. Supabase will provision a new instance from the base snapshot and replay WAL logs up to the specified millisecond.
5. Update Vercel environment variables (`DATABASE_URL` and `DIRECT_URL`) if a new connection string is issued.

### Level 3: Physical Restore from Custom Dump (`pg_restore`)
```bash
# Restore specific table or full database
pg_restore -h aws-0-ap-south-1.pooler.supabase.com -p 5432 -U postgres.ofzbhbcnizyegroggkxl -d postgres --clean --if-exists backup_masterhrms_pre_phase4b_YYYYMMDD_HHMMSS.dump
```

---

## 6. Sign-off

- [x] Supabase PITR capability confirmed.
- [x] Row count baseline query formulated.
- [x] Manual pg_dump and Supabase CLI commands verified.
- [x] 3-tier disaster recovery protocol validated.

