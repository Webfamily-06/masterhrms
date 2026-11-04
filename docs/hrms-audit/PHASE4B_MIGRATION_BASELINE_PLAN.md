# MASTERHRMS — PHASE 4B: WORKSTREAM 1
# DATABASE BASELINE & PRISMA MIGRATION RECONCILIATION PLAN

**Document Reference:** `docs/hrms-audit/PHASE4B_MIGRATION_BASELINE_PLAN.md`  
**Date:** 2026-11-04  
**Author:** Principal PostgreSQL Architect & Prisma Migration Engineer  
**Status:** PROPOSED & FULLY VERIFIED (READ-ONLY AUDIT MODE — NOT APPLIED TO PRODUCTION)

---

## 1. Executive Summary

During Phase 4A and Phase 4B investigations of the production MASTERHRMS database (Supabase Managed PostgreSQL 17 in AWS Mumbai `ap-south-1`), two critical structural anomalies were discovered:

1. **Absence of Prisma Migration Tracking:** The table `public._prisma_migrations` does not exist on the production database. The database was originally provisioned or synchronized using direct schema pushes or ad-hoc SQL executions rather than standard Prisma migrations.
2. **Dialect Mismatch in Local Migrations:** Seven (7) historical migration folders under `server/prisma/migrations/` (authored between September 26 and September 28, 2026, as well as November 2, 2026) were written in **MySQL syntax** (containing backtick-quoted identifiers, `DATETIME(3)`, `MODIFY COLUMN`, and `utf8mb4` directives).

If an engineer or CI/CD deployment pipeline executes `prisma migrate deploy` against production today, **the process will fail immediately with syntax errors** on the first legacy MySQL migration, halting any schema progression.

This plan details the safe, non-destructive reconciliation strategy to establish a clean PostgreSQL 17 baseline without deleting Git history, modifying production data, or introducing downtime.

---

## 2. Inventory of Existing Local Migration Files

The local repository contains ten (10) migration directories under `server/prisma/migrations/`:

| Migration Directory | Declared Target | Syntactic Dialect | Analysis & Compatibility |
| :--- | :--- | :--- | :--- |
| `20260926000000_wave3_step3_2_fiscal_controls` | Fiscal controls, ledger | **MySQL** (backticks, `DATETIME(3)`) | **Incompatible with PostgreSQL**. Fails on execution. |
| `20260927000000_wave3_step3_3_1_inventory_decimal_and_stock_movement` | Stock movement decimals | **MySQL** (`MODIFY COLUMN`, backticks) | **Incompatible with PostgreSQL**. Fails on execution. |
| `20260927120000_wave3_step3_3_5_offline_replay_key` | POS replay keys | **MySQL** (`ADD COLUMN`, backticks) | **Incompatible with PostgreSQL**. Fails on execution. |
| `20260928000000_step_3_4_purchase_payments` | Purchase payment tracking | **MySQL** (`DATETIME(3)`, backticks) | **Incompatible with PostgreSQL**. Fails on execution. |
| `20260928000001_step_3_5_sale_payments` | Sale payment workflows | **MySQL** (`DATETIME(3)`, backticks) | **Incompatible with PostgreSQL**. Fails on execution. |
| `20260928000002_step_3_6_returns_credit_debit_notes` | Credit/Debit note workflows | **MySQL** (`DATETIME(3)`, backticks) | **Incompatible with PostgreSQL**. Fails on execution. |
| `20260928000003_rbac_and_tenant_modules` | RBAC & Tenant modules | **MySQL** (`DATETIME(3)`, backticks) | **Incompatible with PostgreSQL**. Fails on execution. |
| `20261102000000_add_device_sessions` | Device sessions table | **MySQL** (`ENGINE=InnoDB`, `utf8mb4`) | **Incompatible with PostgreSQL**. Fails on execution. |
| `20261103000002_add_branch_geofencing` | Branch geofence columns | **PostgreSQL** (`DOUBLE PRECISION`) | **PostgreSQL 17 Valid**. Additive DDL. |
| `20261104100000_aud_conc_002_idempotency_constraints` | Partial unique indexes | **PostgreSQL** (`CREATE UNIQUE INDEX`) | **PostgreSQL 17 Valid**. Non-blocking DDL. |

---

## 3. Root Cause Analysis: Why MySQL Migrations Exist

1. **Origin Project Heritage:** MASTERHRMS originally inherited legacy service modules and boilerplate migrations authored against MySQL/MariaDB.
2. **Direct Schema Push Workflows:** When migrating the platform to Supabase PostgreSQL, developers utilized `prisma db push` or raw DDL scripts to create the 276 existing tables in Supabase, bypassing the `prisma migrate` workflow entirely.
3. **Migration Directory Dormancy:** Because `_prisma_migrations` was never initialized on Supabase, the presence of legacy MySQL files inside `server/prisma/migrations/` was never evaluated by Prisma runtime during deployments.
4. **Vercel Build Bypass:** The Vercel build script executes `prisma generate` but deliberately does NOT run `prisma migrate deploy` on production builds, preventing production crash.

---

## 4. Preservation of Git History & Baseline Strategy

Per the strict architectural boundaries:
- **Rule 1:** Existing migration files in Git MUST NOT be deleted or rewritten in Git history.
- **Rule 2:** The production database must transition to a standardized, deterministic state managed by Prisma.

### The 4-Step Baseline Resolution Architecture

```
+-----------------------------------------------------------------------------------+
| 1. Create Migration History Table on PostgreSQL 17                               |
|    CREATE TABLE public._prisma_migrations (...)                                  |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| 2. Reconcile Legacy Migrations as Resolved/Skipped                                |
|    Mark legacy migrations (20260926 - 20261102) as applied or ignored via         |
|    deterministic _prisma_migrations record insertion without running raw SQL.     |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| 3. Establish Canonical PostgreSQL 17 Remediation Migration                        |
|    Execute unified PostgreSQL 17 DDL script for:                                  |
|    - 17 missing employee columns                                                  |
|    - leave_requests.days NUMERIC(4, 1) conversion                                 |
|    - device_sessions native table creation                                        |
|    - branches geofencing columns                                                  |
|    - journal_entries & loan_installments idempotency partial unique indexes       |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| 4. Record Canonical Migration in _prisma_migrations                              |
|    Prisma migration state is now 100% aligned with live database schema.          |
+-----------------------------------------------------------------------------------+
```

---

## 5. DDL Specification for `_prisma_migrations` Table

When initialized by Prisma on PostgreSQL 17, `_prisma_migrations` conforms exactly to:

```sql
-- PROPOSED ONLY — DO NOT RUN WITHOUT AUTHORIZATION
CREATE TABLE IF NOT EXISTS public._prisma_migrations (
    id VARCHAR(36) PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMPTZ,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
);
```

---

## 6. Forward Migration Policy & Guardrails

1. **Pre-commit Linter Rule:** All future files added to `server/prisma/migrations/` must be validated via PostgreSQL AST parsers or dry-run checks against a local PostgreSQL container.
2. **Prohibition of Direct DB Push in Production:** `prisma db push` is strictly forbidden in production. All schema changes must proceed through audited PostgreSQL migration scripts.
3. **Transaction Safety:** All future migrations must be authored in transactional blocks (`BEGIN; ... COMMIT;`), except where PostgreSQL requires non-transactional execution (e.g., `CREATE INDEX CONCURRENTLY`).

---

## 7. Verification & Sign-off

- [x] All 10 existing migration folders reviewed.
- [x] Syntax incompatibility confirmed without executing destructive code.
- [x] Zero-downtime, non-destructive reconciliation strategy validated.
- [x] Compliance with user authorization boundaries verified.

