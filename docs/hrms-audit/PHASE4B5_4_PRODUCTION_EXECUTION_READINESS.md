# MASTERHRMS — PHASE 4B.5.4
# PRODUCTION BACKUP & EXECUTION READINESS AUDIT

**Document Reference:** `docs/hrms-audit/PHASE4B5_4_PRODUCTION_EXECUTION_READINESS.md`  
**Date:** 2026-11-04  
**Auditor Roles:** Principal Database Reliability Engineer & Security Auditor  
**Repository:** `Webfamily-06/masterhrms`  
**Target Environment:** Supabase Managed PostgreSQL 17 (`aws-0-ap-south-1.pooler.supabase.com`, project `ofzbhbcnizyegroggkxl`)  
**Production Status:** Zero Modifications Executed (Audit & Governance Preparation Only)  

---

## 1. Network Endpoint & Connection Topology

### Direct vs. Transaction Pooler Endpoint:
| Property | Transaction Pooler (Port 6543) | Direct Database Endpoint (Port 5432) | Selected for Migration |
| :--- | :--- | :--- | :---: |
| **Protocol** | PgBouncer session/transaction mode | Native PostgreSQL backend | **DIRECT (Port 5432)** |
| **Prepared Statements**| Disabled / Limited | Fully Supported | **Required for Prisma** |
| **Advisory Locks** | Not session-persistent | Session / Transaction Persistent | **Required for DDL Locks** |
| **`pg_dump` Compatibility**| Fails or hangs on large catalogs | Native snapshot stream | **Required for Backup** |
| **Configuration Key** | `process.env.DATABASE_URL` | `process.env.DIRECT_URL` | **`DIRECT_URL`** |

> [!CRITICAL]
> All backup operations, Prisma migration deployments, and DDL alterations must connect strictly to `DIRECT_URL` (direct PostgreSQL port 5432). Never run `pg_dump` or `prisma migrate deploy` through port 6543.

---

## 2. Pre-Execution Backup Specification

### A. Backup Command & Scope:
```bash
# Export compressed custom-format archive targeting public schema
pg_dump "$DIRECT_URL" \
  --format=custom \
  --blobs \
  --verbose \
  --schema=public \
  --file="masterhrms_pre_migration_$(date +%Y%m%d_%H%M%S).dump"
```

### B. Architectural Scope Analysis:
- **Public Schema:** Contains all 276 application tables, data, views, sequences, triggers, and indexes.
- **Supabase System Schemas (`auth`, `storage`, `realtime`, `graphql`, `vault`):** Excluded from the application dump because they are managed directly by Supabase managed control planes.
- **Extensions:** Handled by Supabase extension manager (`uuid-ossp`, `pgcrypto`).
- **Credential Protection:** Credentials must be supplied via standard `PGPASSWORD` or `.pgpass`. Zero passwords, tokens, or direct connection strings may be logged to stdout or committed to repository files.
- **Storage & Encryption:** Dump files must be encrypted with AES-256 (`gpg --symmetric --cipher-algo AES256`) and placed in an isolated, access-controlled backup repository prior to initiating DDL.

---

## 3. Restore Verification Status & Isolated Validation Protocol

> [!WARNING]
> **RESTORE EVIDENCE STATUS: NOT VERIFIED ON PRODUCTION CLUSTER**  
> In accordance with SRE standards, a backup command is not proof of a restorable database. Because production is strictly isolated and zero production mutations are authorized, a live production restore has NOT been performed.

### Required Preflight Restore Validation Protocol (In Isolated PostgreSQL 17 Container):
Before executing changes on production, the operator should validate the physical dump by restoring it into the test container:

```bash
# 1. Create a clean validation database in Docker
docker exec masterhrms-pg17-audit psql -U postgres -c "CREATE DATABASE restore_verify_test;"

# 2. Execute pg_restore against the isolated test instance
pg_restore -h 127.0.0.1 -p 5435 -U postgres -d restore_verify_test \
  --verbose --clean --if-exists "masterhrms_pre_migration_20261104.dump"

# 3. Assert schema and row count parity in test container
docker exec masterhrms-pg17-audit psql -U postgres -d restore_verify_test -c "
  SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
  SELECT count(*) FROM employees;
  SELECT count(*) FROM leave_requests;
"
```

---

## 4. Recovery Objectives & Rollback Strategy

| Parameter | Target Objective | Implementation Guard |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **0 seconds** (Zero data loss) | Scheduled maintenance window; application traffic paused via maintenance banner. |
| **Recovery Time Objective (RTO)** | **< 5 minutes** | Fast restore from local compressed `.dump` archive if DDL failure occurs. |

### Rollback Decision Tree:
1. **Migration 8, 9, or 10 Failure:**
   - Because `prisma migrate deploy` wraps each migration file in a transaction (`BEGIN ... COMMIT`), a syntax or constraint failure triggers an **automatic database transaction rollback**. No table corruption occurs.
2. **Post-Migration Application Anomaly:**
   - If application services encounter runtime issues immediately post-migration:
     - Migration 8 (`device_sessions`): Dropping or truncating `device_sessions` reverts state without affecting user or tenant tables.
     - Migration 9 (`branches` geofencing): Columns `latitude`, `longitude`, `geofence_radius` can be dropped or left inert without affecting existing branch routing.
     - Migration 10 (partial unique indexes): Partial indexes can be dropped instantaneously (`DROP INDEX uq_...`) without table locking.
3. **Leave Requests Precision Loss Warning:**
   - If `leave_requests.days` is converted to `NUMERIC(4, 1)` and fractional leaves (e.g., 0.5) are saved, rolling back the column type to `INTEGER` will round 0.5 to 1, causing permanent mathematical loss. The only safe rollback in that scenario is restoring the pre-migration snapshot taken before fractional rows were created.

