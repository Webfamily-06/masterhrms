# MASTERHRMS — PHASE 4B.5
# PRISMA MIGRATION BASELINE & STATEMENT-LEVEL EQUIVALENCE MATRIX

**Document Reference:** `docs/hrms-audit/PHASE4B5_PRISMA_BASELINE_MATRIX.md`  
**Date:** 2026-11-04  
**Auditor Roles:** Principal PostgreSQL Architect & Database Reliability Engineer  
**Repository:** `Webfamily-06/masterhrms`  
**Committed GitHub main HEAD:** `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0`  
**Target Database:** Supabase Managed PostgreSQL 17 (`aws-0-ap-south-1.pooler.supabase.com`, project `ofzbhbcnizyegroggkxl`)  
**Status:** AUDITED & GOVERNANCE BOUNDARIES LOCKED  

---

## 1. Executive Summary

The production database currently has **no `public._prisma_migrations` table**. The 276 existing tables were originally deployed via direct schema synchronizations.

To transition production safely to automated Prisma migration tracking, this document provides:
1. A **statement-level equivalence audit** of every object in Migrations 1 through 7, classifying every schema artifact as `EXACT MATCH`, `COMPATIBLE DIFFERENCE`, `MISSING`, `INCORRECT`, or `NOT VERIFIED`.
2. A **migration-by-migration baseline resolution strategy**, specifying prerequisites and execution boundaries.
3. Strict governance barring uncommitted local migrations from being baseline-resolved.

---

## 2. Statement-Level Verification Matrix (Migrations 1–7)

Every statement declared in the seven legacy migration SQL files was audited against the live Supabase PostgreSQL 17 system catalogs:

### Migration 1: `20260926000000_wave3_step3_2_fiscal_controls`
| Object / Statement | Target Table & Column | Declared DDL Type / Constraint | Live PostgreSQL 17 Catalog State | Classification |
| :--- | :--- | :--- | :--- | :--- |
| `ADD COLUMN parent_account_id` | `chart_of_accounts.parent_account_id` | `VARCHAR(36) NULL` | `character varying(36)`, nullable | **EXACT MATCH** |
| `ADD CONSTRAINT parent_fkey` | `chart_of_accounts` | `FK to chart_of_accounts(id) RESTRICT/CASCADE` | FK constraint active in `pg_constraint` | **EXACT MATCH** |
| `CREATE INDEX ... parent_account_id_idx` | `chart_of_accounts` | B-tree index on `(tenant_id, parent_account_id)` | Present in `pg_indexes` | **EXACT MATCH** |
| `CREATE TABLE fiscal_years` | `fiscal_years` | 11 columns, PK `id`, Unique `(tenant_id, name)` | Present with PK, unique key, 2 indexes | **EXACT MATCH** |
| `CREATE TABLE accounting_periods`| `accounting_periods` | 11 columns, PK `id`, Unique `(fiscal_year_id, name)` | Present with PK, unique key, 2 indexes | **EXACT MATCH** |

### Migration 2: `20260927000000_wave3_step3_3_1_inventory_decimal_and_stock_movement`
| Object / Statement | Target Table & Column | Declared DDL Type / Constraint | Live PostgreSQL 17 Catalog State | Classification |
| :--- | :--- | :--- | :--- | :--- |
| `ALTER COLUMN quantity TYPE` | `product_warehouses.quantity` | `DECIMAL(15, 3) NOT NULL DEFAULT 0.000` | `numeric(15, 3)`, NOT NULL, default `0.000` | **EXACT MATCH** |
| `ALTER COLUMN quantity TYPE` | `stock_transfer_details.quantity`| `DECIMAL(15, 3) NOT NULL DEFAULT 1.000` | `numeric(15, 3)`, NOT NULL, default `1.000` | **EXACT MATCH** |
| `ALTER COLUMN quantity TYPE` | `stock_adjustment_details.quantity`| `DECIMAL(15, 3) NOT NULL DEFAULT 1.000`| `numeric(15, 3)`, NOT NULL, default `1.000` | **EXACT MATCH** |
| `CREATE TABLE stock_movements` | `stock_movements` | 13 columns, PK `id`, 3 indexes, 3 FKs | Table present with PK, 3 indexes, 3 FKs | **EXACT MATCH** |

### Migration 3: `20260927120000_wave3_step3_3_5_offline_replay_key`
| Object / Statement | Target Table & Column | Declared DDL Type / Constraint | Live PostgreSQL 17 Catalog State | Classification |
| :--- | :--- | :--- | :--- | :--- |
| `CREATE UNIQUE INDEX ...` | `sales (tenant_id, invoice_no)` | Unique B-tree index | Present in `pg_indexes` as `sales_tenant_id_invoice_no_key` | **EXACT MATCH** |

### Migration 4: `20260928000000_step_3_4_purchase_payments`
| Object / Statement | Target Table & Column | Declared DDL Type / Constraint | Live PostgreSQL 17 Catalog State | Classification |
| :--- | :--- | :--- | :--- | :--- |
| `CREATE TABLE purchase_payments`| `purchase_payments` | 13 columns, PK `id`, Unique `(purchase_id, idempotency_key)`, Index `(tenant_id, paid_at)`, 2 FKs | Present with exact columns, PK, unique key, index, FKs | **EXACT MATCH** |

### Migration 5: `20260928000001_step_3_5_sale_payments`
| Object / Statement | Target Table & Column | Declared DDL Type / Constraint | Live PostgreSQL 17 Catalog State | Classification |
| :--- | :--- | :--- | :--- | :--- |
| `ADD COLUMN idempotency_key` | `sale_payments.idempotency_key` | `VARCHAR(128) NULL` | `character varying(128)`, nullable | **EXACT MATCH** |
| `ADD COLUMN notes` | `sale_payments.notes` | `VARCHAR(255) NULL` | `character varying(255)`, nullable | **EXACT MATCH** |
| `ADD COLUMN created_by_id` | `sale_payments.created_by_id` | `VARCHAR(36) NULL` | `character varying(36)`, nullable | **EXACT MATCH** |
| `CREATE INDEX ... sale_id_idx` | `sale_payments` | B-tree index on `(sale_id)` | Present in `pg_indexes` as `sale_payments_sale_id_idx` | **EXACT MATCH** |

### Migration 6: `20260928000002_step_3_6_returns_credit_debit_notes`
| Object / Statement | Target Table & Column | Declared DDL Type / Constraint | Live PostgreSQL 17 Catalog State | Classification |
| :--- | :--- | :--- | :--- | :--- |
| `CREATE TABLE sales_returns` | `sales_returns` | 17 columns, PK, 4 indexes, 4 FKs | Present with full schema parity | **EXACT MATCH** |
| `CREATE TABLE sales_return_details`| `sales_return_details` | 12 columns, PK, 2 indexes, 2 FKs | Present with full schema parity | **EXACT MATCH** |
| `CREATE TABLE credit_notes` | `credit_notes` | 16 columns, PK, 4 indexes, 4 FKs | Present with full schema parity | **EXACT MATCH** |
| `CREATE TABLE purchase_returns` | `purchase_returns` | 17 columns, PK, 4 indexes, 4 FKs | Present with full schema parity | **EXACT MATCH** |
| `CREATE TABLE purchase_return_details`| `purchase_return_details` | 12 columns, PK, 2 indexes, 2 FKs | Present with full schema parity | **EXACT MATCH** |
| `CREATE TABLE debit_notes` | `debit_notes` | 16 columns, PK, 4 indexes, 4 FKs | Present with full schema parity | **EXACT MATCH** |

### Migration 7: `20260928000003_rbac_and_tenant_modules`
| Object / Statement | Target Table & Column | Declared DDL Type / Constraint | Live PostgreSQL 17 Catalog State | Classification |
| :--- | :--- | :--- | :--- | :--- |
| `CREATE TABLE workspace_roles` | `workspace_roles` | 8 columns, PK, Unique `(tenant_id, name)` | Present with PK, unique key, FK | **EXACT MATCH** |
| `CREATE TABLE permissions` | `permissions` | 8 columns, PK, Unique `(code)`, Index `(module, resource)` | Present with PK, unique key, index | **EXACT MATCH** |
| `CREATE TABLE role_permissions` | `role_permissions` | 4 columns, PK, Unique `(role_id, permission_id)` | Present with PK, unique key, 2 FKs | **EXACT MATCH** |
| `CREATE TABLE user_role_assignments`| `user_role_assignments` | 5 columns, PK, Unique `(user_id, tenant_id)` | Present with PK, unique key, 3 FKs | **EXACT MATCH** |
| `CREATE TABLE tenant_modules` | `tenant_modules` | 6 columns, PK, Unique `(tenant_id, module_key)` | Present with PK, unique key, FK | **EXACT MATCH** |
| `CREATE TABLE two_factor_otps` | `two_factor_otps` | 9 columns, PK, Index `(user_id)` | Present with PK, index, FK | **EXACT MATCH** |

---

## 3. Migration-by-Migration Baseline Strategy

| Migration Directory | Exists in Git `main`? | PG 17 Compatible? | Complete Effects in Prod? | Exact Equivalence Proven? | Can Safely Be Marked Applied? | Required Evidence Before Resolution |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `20260926000000_wave3_step3_2_fiscal_controls` | **YES** | **YES** | **YES** | **YES (EXACT MATCH)** | **YES** | Preflight check confirmed objects exist |
| `20260927000000_wave3_step3_3_1_inventory_decimal_and_stock_movement` | **YES** | **YES** | **YES** | **YES (EXACT MATCH)** | **YES** | Preflight check confirmed objects exist |
| `20260927120000_wave3_step3_3_5_offline_replay_key` | **YES** | **YES** | **YES** | **YES (EXACT MATCH)** | **YES** | Preflight check confirmed objects exist |
| `20260928000000_step_3_4_purchase_payments` | **YES** | **YES** | **YES** | **YES (EXACT MATCH)** | **YES** | Preflight check confirmed objects exist |
| `20260928000001_step_3_5_sale_payments` | **YES** | **YES** | **YES** | **YES (EXACT MATCH)** | **YES** | Preflight check confirmed objects exist |
| `20260928000002_step_3_6_returns_credit_debit_notes` | **YES** | **YES** | **YES** | **YES (EXACT MATCH)** | **YES** | Preflight check confirmed objects exist |
| `20260928000003_rbac_and_tenant_modules` | **YES** | **YES** | **YES** | **YES (EXACT MATCH)** | **YES** | Preflight check confirmed objects exist |
| `20261102000000_add_device_sessions` | **YES (MySQL)** | **YES (Locally)**| **NO** | **NO (ABSENT)** | **NO (Must apply DDL first)** | Commit PG17 DDL to Git; execute DDL on prod; verify 18 columns + 4 indexes |
| `20261103000002_add_branch_geofencing` | **YES** | **YES** | **NO** | **NO (ABSENT)** | **NO (Must apply DDL first)** | Execute DDL on prod; verify 3 columns in `branches` |
| `20261104100000_aud_conc_002_idempotency_constraints` | **NO (Local)** | **YES** | **NO** | **NO (ABSENT)** | **NO (Must commit & apply DDL first)** | Commit directory to Git `main`; execute DDL on direct port 5432; verify indexes |

---

## 4. Governance & Anti-Pattern Restrictions

1. **Zero Blind Batch-Resolution:** Never execute a mass script marking all migrations 1–10 as applied in a single pass.
2. **Commit Prerequisite for Migration 10:** Under no circumstances should `20261104100000_aud_conc_002_idempotency_constraints` be recorded in `_prisma_migrations` on production while it remains untracked in the Git repository.
3. **Physical Verification Before Resolution:** No migration may be marked `--applied` until its physical tables, columns, or indexes have been empirically confirmed via metadata queries.

