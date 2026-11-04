# MASTERHRMS — PHASE 4B.4 & PHASE 4B.5
# POSTGRESQL MIGRATION COMPATIBILITY & RECONCILIATION SPECIFICATION

**Document Reference:** `docs/hrms-audit/PHASE4B4_POSTGRESQL_MIGRATION_COMPATIBILITY.md`  
**Date:** 2026-11-04  
**Auditor:** Principal PostgreSQL Architect & Prisma Migration Specialist  
**Repository:** `Webfamily-06/masterhrms`  
**Committed GitHub main HEAD:** `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0`  
**Target Platform:** Supabase Managed PostgreSQL 17 (`aws-0-ap-south-1.pooler.supabase.com`)  
**Status:** FULLY RECONCILED & VALIDATED VIA REAL POSTGRESQL ENGINE  

---

## 1. Executive Summary

This document provides the exhaustive technical reconciliation between the committed GitHub `main` tree (`9e8749bf`) and the local migration scripts for MASTERHRMS.

### Status Matrix Across Migrations 8, 9, and 10:
1. **Migration 8 (`20261102000000_add_device_sessions`):**
   - **GitHub Remote:** Authored in MySQL dialect (backticks, `DATETIME(3)`, `utf8mb4_unicode_ci`, MySQL inline index definitions). Fails immediately if executed on PostgreSQL 17.
   - **Local Working Tree:** Re-engineered into 100% compliant PostgreSQL 17 DDL matching `server/prisma/schema.prisma` lines 345–375.
2. **Migration 9 (`20261103000002_add_branch_geofencing`):**
   - **GitHub Remote & Local:** Matches PostgreSQL 17 DDL (`latitude`, `longitude`, `geofence_radius`). Verified idempotent via `ADD COLUMN IF NOT EXISTS`.
3. **Migration 10 (`20261104100000_aud_conc_002_idempotency_constraints`):**
   - **GitHub Remote:** **DOES NOT EXIST** on GitHub `main`.
   - **Local Working Tree:** Exists only locally as an uncommitted folder. Verified semantically against application write paths (`ledger-posting.service.ts` and `payroll-orchestrator.service.ts`). Tested against real PostgreSQL engine. Must NOT be marked as applied on production until reviewed and committed to GitHub.

---

## 2. GitHub vs Local Migration 8: Exhaustive Syntax Comparison

| Aspect / Token | Committed GitHub `main` (`9e8749bf`) | Reconciled Local Working Copy | PostgreSQL 17 Impact / Reason |
| :--- | :--- | :--- | :--- |
| **Identifier Quoting** | Backticks: `` `device_sessions` ``, `` `user_id` `` | ANSI Double Quotes: `"device_sessions"`, `"user_id"` | PostgreSQL rejects backticks with syntax error `42601`. ANSI quotes ensure case preservation and keyword safety. |
| **Timestamp Types** | `DATETIME(3)` | `TIMESTAMP(3)` | `DATETIME` is not a valid PostgreSQL data type; `TIMESTAMP(3)` maps directly to Prisma `DateTime`. |
| **Collation & Engine** | `DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` | Omitted (inherits PostgreSQL database/schema collation) | MySQL table options are syntax errors in PostgreSQL. |
| **Index Syntax** | Inline MySQL: `INDEX \`device_sessions_user_id_idx\`(\`user_id\`)` | Independent DDL: `CREATE INDEX IF NOT EXISTS "device_sessions_user_id_idx" ON "device_sessions"("user_id");` | PostgreSQL requires `CREATE INDEX` statements outside the `CREATE TABLE` column definition list. |
| **Foreign Keys** | Inline MySQL foreign key constraints inside table definition | Safe PL/pgSQL idempotent constraint addition block (`DO $$ BEGIN IF NOT EXISTS (...) THEN ALTER TABLE ... END IF; END $$;`) | Prevents duplicate constraint errors if rerun or partially applied. |
| **Nullability & Precision** | `last_active_at` and `expires_at` defined without precision alignment | Explicit `TIMESTAMP(3) NULL` matching Prisma schema | Guarantees millisecond precision consistency across application runtimes. |

### Exact Reconciled Migration 8 DDL:
```sql
-- Migration: 20261102000000_add_device_sessions (PostgreSQL 17 compatible)
-- Creates the device_sessions table with Prisma schema parity

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

-- Indexes
CREATE INDEX IF NOT EXISTS "device_sessions_user_id_idx" ON "device_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "device_sessions_user_id_revoked_idx" ON "device_sessions"("user_id", "revoked");
CREATE INDEX IF NOT EXISTS "device_sessions_tenant_id_idx" ON "device_sessions"("tenant_id");
CREATE INDEX IF NOT EXISTS "device_sessions_refresh_token_hash_idx" ON "device_sessions"("refresh_token_hash");

-- Foreign Keys
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

---

## 3. Migration 8 Verification against Prisma `DeviceSession` Model

The schema in `server/prisma/schema.prisma` (lines 345–375) defines:
```prisma
model DeviceSession {
  id               String    @id @default(uuid()) @db.VarChar(36)
  userId           String    @map("user_id") @db.VarChar(36)
  tenantId         String?   @map("tenant_id") @db.VarChar(36)
  deviceName       String?   @map("device_name") @db.VarChar(255)
  deviceType       String    @default("desktop") @map("device_type") @db.VarChar(50)
  browser          String?   @db.VarChar(100)
  operatingSystem  String?   @map("operating_system") @db.VarChar(100)
  ipAddress        String?   @map("ip_address") @db.VarChar(45)
  country          String?   @db.VarChar(100)
  city             String?   @db.VarChar(100)
  userAgent        String?   @map("user_agent") @db.Text
  refreshTokenHash String?   @map("refresh_token_hash") @db.VarChar(255)
  lastActiveAt     DateTime? @map("last_active_at")
  expiresAt        DateTime? @map("expires_at")
  revokedAt        DateTime? @map("revoked_at")
  revoked          Boolean   @default(false)
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant           Tenant?   @relation(fields: [tenantId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([userId, revoked])
  @@index([tenantId])
  @@index([refreshTokenHash])
  @@map("device_sessions")
}
```

### Complete Column, Constraint, and Index Verification Matrix:
| Prisma Model Attribute | Column Name in DDL | PostgreSQL 17 Type | Nullable? | Default Value | Foreign Key / Index Action | Verified in Engine |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id String @id` | `id` | `VARCHAR(36)` | NO | None | Primary Key (`device_sessions_pkey`) | YES |
| `userId String` | `user_id` | `VARCHAR(36)` | NO | None | FK to `users(id)` ON DELETE CASCADE | YES |
| `tenantId String?` | `tenant_id` | `VARCHAR(36)` | YES | NULL | FK to `tenants(id)` ON DELETE SET NULL | YES |
| `deviceName String?` | `device_name` | `VARCHAR(255)` | YES | NULL | None | YES |
| `deviceType String` | `device_type` | `VARCHAR(50)` | NO | `'desktop'` | None | YES |
| `browser String?` | `browser` | `VARCHAR(100)` | YES | NULL | None | YES |
| `operatingSystem String?` | `operating_system` | `VARCHAR(100)` | YES | NULL | None | YES |
| `ipAddress String?` | `ip_address` | `VARCHAR(45)` | YES | NULL | None | YES |
| `country String?` | `country` | `VARCHAR(100)` | YES | NULL | None | YES |
| `city String?` | `city` | `VARCHAR(100)` | YES | NULL | None | YES |
| `userAgent String?` | `user_agent` | `TEXT` | YES | NULL | None | YES |
| `refreshTokenHash String?` | `refresh_token_hash` | `VARCHAR(255)` | YES | NULL | B-tree index | YES |
| `lastActiveAt DateTime?` | `last_active_at` | `TIMESTAMP(3)` | YES | NULL | None | YES |
| `expiresAt DateTime?` | `expires_at` | `TIMESTAMP(3)` | YES | NULL | None | YES |
| `revokedAt DateTime?` | `revoked_at` | `TIMESTAMP(3)` | YES | NULL | None | YES |
| `revoked Boolean` | `revoked` | `BOOLEAN` | NO | `false` | Composite index with `user_id` | YES |
| `createdAt DateTime` | `created_at` | `TIMESTAMP(3)` | NO | `CURRENT_TIMESTAMP` | None | YES |
| `updatedAt DateTime` | `updated_at` | `TIMESTAMP(3)` | NO | `CURRENT_TIMESTAMP` | None | YES |

---

## 4. Migration 10: Semantic Validation Against Application Write Paths

Migration 10 (`20261104100000_aud_conc_002_idempotency_constraints/migration.sql`) establishes two partial unique indexes designed to prevent double posting during concurrent transactions or recovery cycles.

### Rule 1: General Ledger Single-Posting Constraint per Payroll Run
- **Target Table:** `journal_entries`
- **Columns:** `tenant_id`, `reference`
- **Predicate:** `WHERE reference IS NOT NULL AND reference_type = 'payroll'`
- **Index Name:** `uq_journal_entries_tenant_payroll_run`
- **Application Write Path Inspection (`server/src/services/ledger-posting.service.ts` lines 228–245):**
  When payroll GL posting executes, the service creates the journal entry with:
  ```typescript
  reference: payrollRunId,
  referenceType: 'payroll'
  ```
  The partial index strictly enforces that for a given `tenant_id`, only one journal entry can ever reference this `payrollRunId` when `referenceType = 'payroll'`. Non-payroll entries (e.g., invoices, sales, inventory adjustments) are filtered out by `WHERE reference_type = 'payroll'` and are completely unaffected.

### Rule 2: Loan Installment Single-Deduction Constraint per Payroll Run
- **Target Table:** `loan_installments`
- **Columns:** `loan_id`, `payroll_run_id`
- **Predicate:** `WHERE payroll_run_id IS NOT NULL`
- **Index Name:** `uq_loan_installments_loan_payroll_run`
- **Application Write Path Inspection (`server/src/services/payroll-orchestrator.service.ts` lines 1324–1355):**
  During payroll calculation and execution, employee loan deductions record the installment with `payroll_run_id = runId`. The partial index enforces that a given loan cannot have two installment records for the same payroll run. For manual installment payments made outside payroll, `payroll_run_id` is set to `NULL`, which is ignored by `WHERE payroll_run_id IS NOT NULL`, allowing multiple manual cash/bank payments without restriction.

---

## 5. Concurrent Indexing Protocol & Remnant Cleanup

PostgreSQL allows non-blocking index creation via `CREATE INDEX CONCURRENTLY`. However:
1. `CREATE INDEX CONCURRENTLY` cannot run inside a multi-statement transaction block (`BEGIN ... COMMIT`).
2. If aborted midway (e.g. timeout or connection disruption), PostgreSQL leaves an invalid index marked `indisvalid = false` in `pg_index`.
3. To ensure complete safety on live systems, any invalid index remnant must be dropped before retrying:

```sql
-- Step 1: Drop any preexisting or invalid remnant concurrently outside a transaction block
DROP INDEX CONCURRENTLY IF EXISTS public.uq_journal_entries_tenant_payroll_run;
DROP INDEX CONCURRENTLY IF EXISTS public.uq_loan_installments_loan_payroll_run;

-- Step 2: Create partial unique indexes concurrently
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_journal_entries_tenant_payroll_run 
    ON public.journal_entries (tenant_id, reference) 
    WHERE reference IS NOT NULL AND reference_type = 'payroll';

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_loan_installments_loan_payroll_run 
    ON public.loan_installments (loan_id, payroll_run_id) 
    WHERE payroll_run_id IS NOT NULL;
```
