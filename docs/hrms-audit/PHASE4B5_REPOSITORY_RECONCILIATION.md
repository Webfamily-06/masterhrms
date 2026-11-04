# MASTERHRMS — PHASE 4B.5
# REPOSITORY RECONCILIATION & MIGRATION BASELINE INVENTORY

**Document Reference:** `docs/hrms-audit/PHASE4B5_REPOSITORY_RECONCILIATION.md`  
**Date:** 2026-11-04  
**Auditor Roles:** Principal PostgreSQL Architect, Prisma Migration Specialist & Git Release Engineer  
**Repository:** `Webfamily-06/masterhrms`  
**Current Branch:** `main`  
**Committed GitHub main HEAD:** `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0`  
**Target Database:** Supabase Managed PostgreSQL 17 (`aws-0-ap-south-1.pooler.supabase.com`, project `ofzbhbcnizyegroggkxl`)  
**Status:** RECONCILED — EVIDENCE-BACKED AUDIT COMPLETED  

---

## 1. Baseline Git Repository & Working Tree State

An exhaustive audit of the repository working tree and commit graph was conducted prior to modifying any files:

### Current Git Identification:
- **Active Branch:** `main` (tracking `origin/main`)
- **Remote HEAD Commit:** `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0` (`feat(payroll): complete workstream d 16-stage payroll automation lifecycle, dual approval gates, and cms command hub`)
- **Local vs Remote Divergence:** Local `main` branch is at commit `9e8749bf`. Working tree contains unstaged modifications and untracked audit documents from Phase 4B/4B.4/4B.5.

### Working Tree Inventory:
1. **Unstaged Modified Source & Migration Files:**
   - `server/prisma/migrations/20261102000000_add_device_sessions/migration.sql` (MySQL dialect converted to PostgreSQL 17)
   - `server/src/routes/payroll-cycles.routes.ts`
   - `server/src/services/contract-invoice.service.ts`
   - `server/src/services/ledger-posting.service.ts`
   - `server/src/services/payroll-orchestrator.service.ts`
   - `server/src/services/payroll-validation.service.ts`
   - `server/dist/...` (transpiled JavaScript artifacts)
2. **Untracked Directories & Test Files:**
   - `server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/` (Local-only Migration 10)
   - `server/src/tests/distributed-payroll-concurrency.test.ts`
   - `scripts/isolated_integration_test.cjs`
   - `docs/hrms-audit/...` (Phase 3 and Phase 4 audit reports)

---

## 2. Complete Migration Baseline Inventory Table

The repository currently contains **ten (10) migration directories** under `server/prisma/migrations/`. Each has been audited against GitHub `main`, `schema.prisma`, and database dialect compatibility:

| Migration Directory | Timestamp | SQL File Present | Database Dialect | Prisma Schema Target Object | Local Git Status | Present on GitHub `main`? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `20260926000000_wave3_step3_2_fiscal_controls` | 2026-09-26 00:00:00 | YES (`migration.sql`) | PostgreSQL 17 | `fiscal_years`, `accounting_periods`, `chart_of_accounts.parent_account_id` | Tracked, Clean | **YES** |
| `20260927000000_wave3_step3_3_1_inventory_decimal_and_stock_movement` | 2026-09-27 00:00:00 | YES (`migration.sql`) | PostgreSQL 17 | `stock_movements`, 3 quantity `DECIMAL(15,3)` | Tracked, Clean | **YES** |
| `20260927120000_wave3_step3_3_5_offline_replay_key` | 2026-09-27 12:00:00 | YES (`migration.sql`) | PostgreSQL 17 | `sales (tenant_id, invoice_no)` unique index | Tracked, Clean | **YES** |
| `20260928000000_step_3_4_purchase_payments` | 2026-09-28 00:00:00 | YES (`migration.sql`) | PostgreSQL 17 | `purchase_payments` table | Tracked, Clean | **YES** |
| `20260928000001_step_3_5_sale_payments` | 2026-09-28 00:00:01 | YES (`migration.sql`) | PostgreSQL 17 | `sale_payments` idempotency & created_by columns | Tracked, Clean | **YES** |
| `20260928000002_step_3_6_returns_credit_debit_notes` | 2026-09-28 00:00:02 | YES (`migration.sql`) | PostgreSQL 17 | 6 return & credit/debit tables | Tracked, Clean | **YES** |
| `20260928000003_rbac_and_tenant_modules` | 2026-09-28 00:00:03 | YES (`migration.sql`) | PostgreSQL 17 | 6 RBAC and tenant module tables | Tracked, Clean | **YES** |
| `20261102000000_add_device_sessions` | 2026-11-02 00:00:00 | YES (`migration.sql`) | **MySQL** on GitHub / **PostgreSQL 17** locally | `device_sessions` (18 columns, 4 indexes, 2 FKs) | Tracked, Modified | **YES (Defective MySQL syntax)** |
| `20261103000002_add_branch_geofencing` | 2026-11-03 00:00:02 | YES (`migration.sql`) | PostgreSQL 17 | `branches` (latitude, longitude, geofence_radius) | Tracked, Clean | **YES** |
| `20261104100000_aud_conc_002_idempotency_constraints` | 2026-11-04 10:00:00 | YES (`migration.sql`) | PostgreSQL 17 | `journal_entries` & `loan_installments` partial unique indexes | **Untracked Directory** | **NO (Local Only)** |

---

## 3. Detailed Audit of Migration 8 (Device Sessions)

### The GitHub `main` Defect:
Remote commit `9e8749bf` contains MySQL syntax in `server/prisma/migrations/20261102000000_add_device_sessions/migration.sql`:
```sql
-- GitHub main version: FAILS ON POSTGRESQL
CREATE TABLE IF NOT EXISTS `device_sessions` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `tenant_id` VARCHAR(36) NULL,
  `device_name` VARCHAR(255) NULL,
  `device_type` VARCHAR(50) NOT NULL DEFAULT 'desktop',
  `browser` VARCHAR(100) NULL,
  `operating_system` VARCHAR(100) NULL,
  `ip_address` VARCHAR(45) NULL,
  `country` VARCHAR(100) NULL,
  `city` VARCHAR(100) NULL,
  `user_agent` TEXT NULL,
  `refresh_token_hash` VARCHAR(255) NULL,
  `last_active_at` DATETIME(3) NULL,
  `expires_at` DATETIME(3) NULL,
  `revoked_at` DATETIME(3) NULL,
  `revoked` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `device_sessions_user_id_idx`(`user_id`),
  INDEX `device_sessions_user_id_revoked_idx`(`user_id`, `revoked`),
  INDEX `device_sessions_tenant_id_idx`(`tenant_id`),
  INDEX `device_sessions_refresh_token_hash_idx`(`refresh_token_hash`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Local PostgreSQL 17 Reconciled Version:
```sql
-- Reconciled PostgreSQL 17 Version (server/prisma/migrations/20261102000000_add_device_sessions/migration.sql)
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

    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "device_sessions_user_id_idx" ON "device_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "device_sessions_user_id_revoked_idx" ON "device_sessions"("user_id", "revoked");
CREATE INDEX IF NOT EXISTS "device_sessions_tenant_id_idx" ON "device_sessions"("tenant_id");
CREATE INDEX IF NOT EXISTS "device_sessions_refresh_token_hash_idx" ON "device_sessions"("refresh_token_hash");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'device_sessions_user_id_fkey') THEN
        ALTER TABLE "device_sessions" 
            ADD CONSTRAINT "device_sessions_user_id_fkey" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'device_sessions_tenant_id_fkey') THEN
        ALTER TABLE "device_sessions" 
            ADD CONSTRAINT "device_sessions_tenant_id_fkey" 
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
```

### Full Prisma Model Parity Verification:
Audited against `server/prisma/schema.prisma` lines 345–375:
- **18 Columns:** Exactly matches Prisma types, field names, defaults, and millisecond timestamp precision.
- **Foreign Keys:**
  * `userId`: references `User(id)` with `onDelete: Cascade` (verified).
  * `tenantId`: references `Tenant(id)` with `onDelete: SetNull` (verified).
- **Indexes:** 4 secondary B-tree indexes matching `@@index` annotations in Prisma.
- **Primary Key:** `device_sessions_pkey` on `("id")`.
- **Rerun Idempotency:** Uses `IF NOT EXISTS` on table and indexes, and PL/pgSQL constraint checks.

---

## 4. Detailed Audit of Migration 9 (Branch Geofencing)

File: `server/prisma/migrations/20261103000002_add_branch_geofencing/migration.sql`

```sql
-- AlterTable
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "geofence_radius" INTEGER DEFAULT 500;
```

### Prisma Parity:
Audited against `schema.prisma` lines 4427–4429:
- `latitude`: `Float? @map("latitude")` -> `DOUBLE PRECISION NULL` (EXACT MATCH)
- `longitude`: `Float? @map("longitude")` -> `DOUBLE PRECISION NULL` (EXACT MATCH)
- `geofenceRadius`: `Int? @default(500) @map("geofence_radius")` -> `INTEGER DEFAULT 500` (EXACT MATCH)
- **Data Safety:** Fully backwards compatible with existing `branches` rows (all new columns nullable or have default). Zero fabricated coordinates.

---

## 5. Detailed Audit of Migration 10 (Financial Idempotency Indexes)

File: `server/prisma/migrations/20261104100000_aud_conc_002_idempotency_constraints/migration.sql`

```sql
CREATE UNIQUE INDEX IF NOT EXISTS "uq_journal_entries_tenant_payroll_run"
ON "journal_entries" ("tenant_id", "reference")
WHERE "reference" IS NOT NULL AND "reference_type" = 'payroll';

CREATE UNIQUE INDEX IF NOT EXISTS "uq_loan_installments_loan_payroll_run"
ON "loan_installments" ("loan_id", "payroll_run_id")
WHERE "payroll_run_id" IS NOT NULL;
```

### Application Write Path Alignment:
1. `ledger-posting.service.ts` lines 228–245 writes `reference = payrollRunId` and `referenceType = 'payroll'`. The index enforces that only one journal entry can ever exist per payroll cycle per tenant. Non-payroll journal entries are excluded.
2. `payroll-orchestrator.service.ts` lines 1324–1355 writes `payrollRunId = runId` on loan installments. The index prevents double installment deduction in a payroll run. Manual installments have `payroll_run_id = NULL` and are excluded by the predicate.

### Repository Status:
- Exists **only locally** in the working copy.
- **GOVERNANCE MANDATE:** Migration 10 MUST NOT be marked applied or resolved in the production database until it has been formally reviewed, committed, and merged into GitHub `main`.

