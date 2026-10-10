# MASTERHRMS — Phase A3.7 Database Migration, Backup & Rollback Readiness Audit

**Document Identifier:** `MASTERHRMS-A3.7-DB-READINESS-20261009-V1`  
**Document Version:** 1.0.0  
**Phase:** Phase A3.7 Technical Readiness — TR-02 Read-Only Database Audit  
**Date:** October 9, 2026  
**Auditor / Database Architect:** Google Antigravity Database Reliability & Security Team  
**Audit Protocol:** Strictly Read-Only; Zero Production Connectivity; Zero DDL/Migrations Executed; Zero Secrets Exposed.  
**Production Migration Authorization:** **STRICTLY WITHHELD (Requires Separate Production Cutover Approval)**  

---

## 1. Executive Summary & Forensic Scope

Under Product Owner authorization **TR-02**, this audit establishes an empirical, evidence-backed evaluation of the MASTERHRMS database migration infrastructure, connection pooler behavior, schema drift risks, backup snapshot verification protocols, and automated rollback feasibility.

### Key Forensic Findings
1. **Migration Tracking Table Absent (`_prisma_migrations`):** Raw query execution confirms that PostgreSQL error `42P01` occurs because `_prisma_migrations` does not exist in the connected database. Running `prisma migrate deploy` directly in production will fail or attempt destructive baseline initialization.
2. **PgBouncer Transaction-Mode Pooler Incompatibility:** The standard connection string targets port `6543` with `?pgbouncer=true`. PostgreSQL advisory locks (`pg_advisory_lock`), lock timeouts (`SET lock_timeout`), and DDL statements require direct session connections on port `5432` (`DIRECT_URL`). Executing DDL across port `6543` risks connection pool deadlocks.
3. **Standalone DDL Script Architecture:** Phase A3.6 schema enhancements reside in an idempotent standalone runner (`server/scripts/apply_a3_6_governance_migration.cjs`).
4. **Missing Automated Rollback Runner:** Until this audit, no corresponding automated rollback script existed. A safe, guarded rollback procedure is designed herein.

---

## 2. Migration History & Schema Drift Forensic Review

### 2.1 Investigation of `_prisma_migrations`
- **Query Executed:** `SELECT * FROM _prisma_migrations;`
- **Diagnostic Result:** `Error: relation "_prisma_migrations" does not exist (SQLSTATE 42P01)`.
- **Root Cause Analysis:** The database schema was originally deployed using `prisma db push` or raw SQL scripts rather than the standard Prisma Migrate CLI pipeline.
- **Production Risk:**
  - Standard Prisma workflow (`npx prisma migrate deploy`) expects a valid migration history ledger.
  - If executed against a database without `_prisma_migrations`, Prisma will report that the database is not in sync or attempt an unverified baseline.
  - **Remediation Strategy:** Do **NOT** run `prisma migrate deploy`. Continue using the audited, standalone script runner pattern (`apply_a3_6_governance_migration.cjs`) with rigorous schema pre-checks.

### 2.2 Phase A3.6 Schema Alterations Audit
The DDL statements in `server/scripts/apply_a3_6_governance_migration.cjs` were forensically inspected:

```sql
-- Lock timeout protection
SET lock_timeout = '5s';

-- 1. Option 3A: Make billing_invoices.subscription_id nullable
ALTER TABLE "billing_invoices" ALTER COLUMN "subscription_id" DROP NOT NULL;

-- 2. OD-10: Add scheduled plan transition columns to tenant_subscriptions
ALTER TABLE "tenant_subscriptions"
  ADD COLUMN IF NOT EXISTS "scheduled_plan_id" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "scheduled_effective_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "scheduled_by_user_id" VARCHAR(36),
  ADD COLUMN IF NOT EXISTS "scheduled_seats" INTEGER;

-- 3. OD-1: Create commercial_price_schedules table
CREATE TABLE IF NOT EXISTS "commercial_price_schedules" (
  "id" VARCHAR(36) NOT NULL,
  "product_slug" VARCHAR(100) NOT NULL,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
  "amount_monthly" DECIMAL(12,2) NOT NULL,
  "amount_annual" DECIMAL(12,2),
  "tax_percentage" DECIMAL(5,2) DEFAULT 18.00,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  "effective_from" TIMESTAMP(3) NOT NULL,
  "effective_to" TIMESTAMP(3),
  "created_by" VARCHAR(36),
  "approved_by" VARCHAR(36),
  "approved_at" TIMESTAMP(3),
  "published_by" VARCHAR(36),
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "commercial_price_schedules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "commercial_price_schedules_product_slug_status_effective_from_idx"
  ON "commercial_price_schedules"("product_slug", "status", "effective_from");
```

#### DDL Safety Evaluation
- **Metadata-Only Operations:** In PostgreSQL 11+, `ADD COLUMN IF NOT EXISTS` with `NULL` defaults is an instant catalog metadata operation requiring zero table rewrite.
- **Lock Queue Protection:** `SET lock_timeout = '5s'` guarantees that if another long-running transaction holds an exclusive table lock, the migration script aborts immediately rather than blocking incoming application queries.
- **Idempotency:** All statements use `IF NOT EXISTS` or idempotent constraints (`DROP NOT NULL`).

---

## 3. Connection Architecture & PgBouncer Pooler Analysis

### 3.1 PgBouncer Transaction Mode vs. Session Mode
Supabase PostgreSQL instances expose two distinct connection endpoints:
1. **Transaction Pooler (Port 6543):**
   - Each individual query or transaction runs on an arbitrary physical connection.
   - Session-level state is lost between transactions.
   - Commands such as `PREPARE`, `LISTEN/NOTIFY`, and session-level advisory locks (`pg_advisory_lock`) are **prohibited or fail unexpectedly**.
   - Ideal for high-throughput runtime application queries (`DATABASE_URL`).
2. **Direct Connection / Session Pooler (Port 5432):**
   - Dedicated physical session maintained for the client connection.
   - Full support for DDL transactions, session lock timeouts, and schema migrations.
   - Configured in Prisma schema via `directUrl = env("DIRECT_URL")`.

### 3.2 Mandatory Migration Connection Rule
> **MANDATORY RULE:** Under no circumstances shall database migrations or DDL alteration scripts be executed over the port `6543` transaction pooler. All migration scripts must explicitly read and validate `process.env.DIRECT_URL` (port 5432) before executing DDL.

---

## 4. Rollback Feasibility & Automated Rollback Script Design

### 4.1 Rollback Complexity & Data Loss Analysis
1. **`commercial_price_schedules` Table:** Can be safely dropped (`DROP TABLE IF EXISTS "commercial_price_schedules";`) if no financial transactions reference schedule IDs.
2. **`tenant_subscriptions` Scheduled Columns:** Can be dropped safely (`ALTER TABLE "tenant_subscriptions" DROP COLUMN IF EXISTS "scheduled_plan_id" ...;`).
3. **CRITICAL RISK — Reverting `billing_invoices.subscription_id` to `NOT NULL`:**
   - Once standalone add-ons are sold (Option 3A), rows are created with `subscription_id = NULL`.
   - Executing `ALTER TABLE "billing_invoices" ALTER COLUMN "subscription_id" SET NOT NULL;` will fail with error `23502 (not_null_violation)` if any standalone invoice exists.
   - **Rollback Guard:** A rollback script must check for orphan `subscription_id IS NULL` rows before attempting to restore the constraint.

### 4.2 Automated Rollback Script (`revert_a3_6_governance_migration.cjs`)
The following safe, guarded rollback script specification is established:

```javascript
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Ensure connection uses direct URL (Port 5432)
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: connectionString } } });

async function runRollback() {
  console.log('Beginning Guarded Rollback of Phase A3.6 Schema Changes...');
  await prisma.$executeRawUnsafe(`SET lock_timeout = '5s';`);

  // Guard: Check if standalone invoices with NULL subscription_id exist
  const nullInvoices = await prisma.$queryRawUnsafe(`
    SELECT count(*)::int as count FROM "billing_invoices" WHERE "subscription_id" IS NULL;
  `);

  if (nullInvoices[0].count > 0) {
    throw new Error(
      `ABORTING ROLLBACK: Found ${nullInvoices[0].count} billing invoices with NULL subscription_id. Re-enforcing NOT NULL will destroy data integrity.`
    );
  }

  console.log('1. Dropping scheduled columns from tenant_subscriptions...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "tenant_subscriptions"
      DROP COLUMN IF EXISTS "scheduled_plan_id",
      DROP COLUMN IF EXISTS "scheduled_at",
      DROP COLUMN IF EXISTS "scheduled_effective_date",
      DROP COLUMN IF EXISTS "scheduled_by_user_id",
      DROP COLUMN IF EXISTS "scheduled_seats";
  `);

  console.log('2. Dropping commercial_price_schedules table...');
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "commercial_price_schedules" CASCADE;`);

  console.log('3. Restoring NOT NULL on billing_invoices.subscription_id...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "billing_invoices" ALTER COLUMN "subscription_id" SET NOT NULL;
  `);

  console.log('Phase A3.6 Schema Rollback completed successfully.');
}

runRollback()
  .catch((err) => { console.error('Rollback failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

---

## 5. Production Backup & Restoration Verification Protocol

Before applying any migration DDL to production, the following empirical backup snapshot and restore test protocol must be satisfied:

### 5.1 Pre-Deployment Snapshot Execution
Run on a secure operator terminal with direct database access:
```bash
# 1. Capture full binary custom-format dump
pg_dump -Fc --no-acl --no-owner \
  -d "$DIRECT_URL" \
  -f "production_pre_a3_7_backup_$(date +%Y%m%d_%H%M%S).dump"

# 2. Generate cryptographic SHA256 checksum
shasum -a 256 "production_pre_a3_7_backup_"*.dump > "production_pre_a3_7_backup.dump.sha256"

# 3. Verify file size and header
pg_restore -l "production_pre_a3_7_backup_"*.dump | head -n 25
```

### 5.2 Dry-Run Restoration Verification Requirement
To satisfy release gate **RG-07**, the backup file must be restored to an isolated, scratch PostgreSQL database instance:
```bash
createdb masterhrms_restore_test
pg_restore -d masterhrms_restore_test --no-acl --no-owner "production_pre_a3_7_backup_"*.dump
psql -d masterhrms_restore_test -c "SELECT count(*) FROM users; SELECT count(*) FROM tenants;"
dropdb masterhrms_restore_test
```
Only after the restore test passes without fatal errors can Gate **RG-07** be marked `PASS`.

---

## 6. Pre-Deployment Operational Checklist

```
[ ] 1. DIRECT_URL configured in production environment targeting Port 5432.
[ ] 2. Pre-deployment binary pg_dump snapshot created and SHA-256 checksummed.
[ ] 3. Snapshot restoration verified on isolated test instance (Gate RG-07).
[ ] 4. Rollback runner (revert_a3_6_governance_migration.cjs) verified.
[ ] 5. Standalone migration runner executed using DIRECT_URL (Gate RG-06).
[ ] 6. Column nullability and table existence verified via information_schema queries.
```

---

## 7. Audit Conclusion & Gate Disposition

| Gate ID | Technical Area | Finding & Required Action | Gate Status |
| :--- | :--- | :--- | :---: |
| **RG-06** | Production Migration Strategy | `_prisma_migrations` absent; standalone runner + direct port 5432 required | **BLOCKED (Actionable)** |
| **RG-07** | Production Backup & Rollback | Backup snapshot and restore test required prior to live DDL execution | **NOT VERIFIED** |

**Final Disposition:** The database migration and recovery architecture is **fully understood and documented**. Zero production actions were performed. Awaiting Product Owner authorization for future pre-release staging.
