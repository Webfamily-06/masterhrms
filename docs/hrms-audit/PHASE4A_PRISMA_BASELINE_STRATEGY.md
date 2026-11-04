# MASTERHRMS — PHASE 4A
## Prisma Migration Tracking Baseline Strategy

**Document Reference:** `docs/hrms-audit/PHASE4A_PRISMA_BASELINE_STRATEGY.md`  
**Execution Date:** 2026-11-04  
**Author:** Principal Prisma Migration Engineer & PostgreSQL Database Architect  
**Scope:** Investigation of missing `_prisma_migrations` table, historical migration incompatibility, and future migration tracking architecture  
**Status:** **PROPOSED ARCHITECTURAL STRATEGY — NOT EXECUTED**

---

## 1. Executive Summary

A critical finding of the Phase 4A physical database audit is that the table `_prisma_migrations` does **NOT exist** in the production Supabase PostgreSQL instance.

Furthermore, an inspection of the 10 existing migration directories in `server/prisma/migrations/` revealed that the 7 oldest migrations (dating from September 2026) were written in **MySQL / MariaDB dialect** rather than PostgreSQL dialect.

This document establishes:
1. Forensic explanation of how the production database was originally provisioned.
2. The catastrophic risks of executing unmanaged `prisma migrate deploy`.
3. The recommended two-path baselining strategy to establish reliable, production-grade migration tracking for all future releases.

---

## 2. Forensic Analysis of Past Provisioning

### 2.1. The Origin of Schema Drift
1. **Initial Provisioning via `prisma db push`:**
   The remote PostgreSQL database was originally synchronized using `prisma db push` or a direct DDL dump import.
   - Unlike `prisma migrate deploy`, `prisma db push` directly alters database tables to match `schema.prisma` without creating or populating `_prisma_migrations`.
2. **Local MySQL Migration Generation:**
   Earlier developers generated migration files while connected to a local MySQL/MariaDB environment. These files were committed to Git with MySQL-specific syntax:
   - Identifier backticks (`` `table_name` ``)
   - `DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`
   - `ALTER TABLE ... MODIFY COLUMN ...`
   - `ENGINE = InnoDB DEFAULT CHARSET = utf8mb4`
3. **The Disconnect:**
   Because `_prisma_migrations` was never created, Prisma Migrate has never tracked or managed the Supabase PostgreSQL database.

---

## 3. Catastrophic Risks of Naive `prisma migrate deploy`

If an administrator or deployment pipeline executes `npx prisma migrate deploy` in the current state:

```
$ npx prisma migrate deploy
Prisma schema loaded from server/prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public"

Applying migration `20260926000000_wave3_step3_2_fiscal_controls`
Error: P3006
Migration `20260926000000_wave3_step3_2_fiscal_controls` failed to apply cleanly to the shadow database.
syntax error at or near "`"
```

1. **Syntax Crash:** PostgreSQL fails immediately on the first line containing a backtick.
2. **Table Collision:** Even if syntax were translated, the migration would attempt `CREATE TABLE "fiscal_years"`, which already exists in production, causing `ERROR: relation "fiscal_years" already exists (SQLSTATE 42P07)`.
3. **Deployment Block:** Vercel deployment builds would fail completely if `prisma migrate deploy` were added to the build script.

---

## 4. Proposed Baselining Architecture

To restore clean, native Prisma migration capabilities without risking existing data, two viable strategies were evaluated:

### 4.1. Option A: Historical Cleanup & Unified PostgreSQL Baseline (Recommended)

In this approach, the legacy MySQL migration folders are formally retired and replaced with a canonical PostgreSQL baseline migration representing the current physical database state.

#### Execution Sequence:
1. **Archive Legacy MySQL Migrations:**
   Move `server/prisma/migrations/202609*` into an archive directory (`server/prisma/legacy_migrations_archive/`).
2. **Generate Native PostgreSQL Baseline:**
   Create a single clean baseline migration representing the pre-Phase 4 state:
   `server/prisma/migrations/20261104000000_postgresql_baseline/migration.sql`.
3. **Initialize `_prisma_migrations` Table:**
   Let Prisma generate `_prisma_migrations` or initialize it with standard Prisma DDL:
   ```sql
   CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
       "id"                    VARCHAR(36) PRIMARY KEY,
       "checksum"              VARCHAR(64) NOT NULL,
       "finished_at"           TIMESTAMPTZ,
       "migration_name"        VARCHAR(255) NOT NULL,
       "logs"                  TEXT,
       "rolled_back_at"        TIMESTAMPTZ,
       "started_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
       "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
   );
   ```
4. **Mark Baseline as Applied:**
   Execute via Direct Connection (port 5432):
   ```bash
   npx prisma migrate resolve --applied 20261104000000_postgresql_baseline
   ```
5. **Apply Remediation Migrations Sequentially:**
   Now future migrations (e.g. `20261104100000_aud_conc_002_idempotency_constraints` and `20261104110000_aud_db_001_schema_remediation`) can be tracked cleanly via `_prisma_migrations`.

---

### 4.2. Option B: Synthetic In-Place Mark as Applied

If historical folder names cannot be removed due to corporate commit policies:
1. Initialize the `_prisma_migrations` table manually via Direct Connection.
2. Calculate the SHA-256 checksums of all 10 existing migration files.
3. Insert tracking records marking all historical migrations as already applied:
   ```sql
   INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
   VALUES 
     (gen_random_uuid()::varchar, '<checksum_1>', now(), '20260926000000_wave3_step3_2_fiscal_controls', 1),
     (gen_random_uuid()::varchar, '<checksum_2>', now(), '20260927000000_wave3_step3_3_1_inventory_decimal_and_stock_movement', 1),
     ...;
   ```
4. **Auditor Warning on Option B:** While this establishes tracking, the underlying SQL files in Git remain invalid MySQL dialect. If a new developer or CI environment attempts to run `prisma migrate dev` against an empty database, it will fail. **Therefore, Option A is strongly recommended.**

---

## 5. Decision Matrix

| Evaluation Criterion | Option A (Clean PostgreSQL Baseline) | Option B (Synthetic Historical Ingestion) |
|:---|:---:|:---:|
| **PostgreSQL Syntax Compatibility** | 100% Native PostgreSQL | Contains broken MySQL SQL in repo |
| **CI / Local Test Database Provisioning** | Works flawlessly with `prisma migrate reset` | Fails on local PostgreSQL instances |
| **Production Safety** | Zero modification to existing data | Zero modification to existing data |
| **Long-Term Maintainability** | Institutional Grade | High Technical Debt |
| **Auditor Recommendation** | **STRONGLY RECOMMENDED** | **NOT RECOMMENDED** |

---

## 6. Execution Runbook for Option A (Maintenance Window)

```bash
# 1. Archive legacy MySQL migrations (local repository operation)
mkdir -p server/prisma/legacy_mysql_migrations
mv server/prisma/migrations/202609* server/prisma/legacy_mysql_migrations/

# 2. Create the baseline migration entry
# (Contains introspected schema of current 276 physical tables)

# 3. Connect via DIRECT_URL to port 5432 and apply resolution
export DATABASE_URL="$DIRECT_URL"
npx prisma migrate resolve --applied 20261104000000_postgresql_baseline

# 4. Apply REM-02 and AUD-DB-001 migrations via standard tracking
npx prisma migrate resolve --applied 20261104100000_aud_conc_002_idempotency_constraints
npx prisma migrate resolve --applied 20261104110000_aud_db_001_schema_remediation
```

---

## 7. Status & Clearances

- **Production Status:** **UNAPPLIED — NO DATABASE COMMANDS EXECUTED.**
- **Next Required Action:** Stakeholder approval to retire legacy MySQL migration folders and establish Option A PostgreSQL baseline.

