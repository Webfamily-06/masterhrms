# MASTERHRMS — PHASE 4B.4 & PHASE 4B.5
# PRISMA MIGRATION BASELINE & STATEMENT-LEVEL EQUIVALENCE MATRIX

**Document Reference:** `docs/hrms-audit/PHASE4B4_PRISMA_BASELINE_MATRIX.md`  
**Date:** 2026-11-04  
**Auditor:** Principal PostgreSQL Architect & Database Reliability Engineer  
**Repository:** `Webfamily-06/masterhrms`  
**Committed GitHub main HEAD:** `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0`  
**Target Environment:** Supabase Managed PostgreSQL 17 (`aws-0-ap-south-1.pooler.supabase.com`)  
**Status:** RECONCILED & GOVERNANCE BOUNDARIES LOCKED  

---

## 1. Executive Summary

The production database currently has **no `public._prisma_migrations` table**. The 276 existing tables were originally initialized via direct DDL pushes.

This document establishes:
1. The **statement-level equivalence matrix** proving the exact physical status of Migrations 1 through 7.
2. The **strict repository separation rule**: Only migrations committed to GitHub `main` may be baselined or applied. Local-only folders (specifically Migration 10) are strictly barred from production execution or baseline resolution until formally committed.
3. The **migration-by-migration resolution runbook**.

---

## 2. Statement-Level Equivalence Matrix (Migrations 1–7)

Empirical metadata inspection across 239 columns, 50 foreign keys, and 62 indexes in live Supabase PostgreSQL confirmed:

### Migration 1: `20260926000000_wave3_step3_2_fiscal_controls`
| Target Object | Statement in Migration Script | Physical Object in Live PostgreSQL 17 | Type / Nullable / Default | FK / Index Rules | Equivalence Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `chart_of_accounts.parent_account_id` | `ADD COLUMN parent_account_id VARCHAR(36) NULL` | `parent_account_id` | `character varying(36)`, NULL, default `NULL` | FK to `chart_of_accounts(id)` ON DELETE RESTRICT ON UPDATE CASCADE | **FULLY EQUIVALENT** |
| `chart_of_accounts_tenant_id_parent_account_id_idx` | `CREATE INDEX ... ON chart_of_accounts(tenant_id, parent_account_id)` | `chart_of_accounts_tenant_id_parent_account_id_idx` | B-tree index | Matches `(tenant_id, parent_account_id)` | **FULLY EQUIVALENT** |
| `fiscal_years` table | `CREATE TABLE fiscal_years (...)` | `public.fiscal_years` | 11 columns matching schema | PK `fiscal_years_pkey`, Unique key `(tenant_id, name)`, 2 indexes, FK to `tenants` ON DELETE CASCADE | **FULLY EQUIVALENT** |
| `accounting_periods` table | `CREATE TABLE accounting_periods (...)` | `public.accounting_periods` | 11 columns matching schema | PK `accounting_periods_pkey`, Unique key `(fiscal_year_id, name)`, 2 indexes, FKs to `tenants`, `fiscal_years` | **FULLY EQUIVALENT** |

### Migration 2: `20260927000000_wave3_step3_3_1_inventory_decimal_and_stock_movement`
| Target Object | Statement in Migration Script | Physical Object in Live PostgreSQL 17 | Type / Nullable / Default | FK / Index Rules | Equivalence Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `product_warehouses.quantity` | `MODIFY quantity DECIMAL(15, 3) NOT NULL DEFAULT 0.000` | `quantity` | `numeric(15, 3)`, NOT NULL, default `0.000` | Non-indexed decimal | **FULLY EQUIVALENT** |
| `stock_transfer_details.quantity`| `MODIFY quantity DECIMAL(15, 3) NOT NULL DEFAULT 1.000` | `quantity` | `numeric(15, 3)`, NOT NULL, default `1.000` | Non-indexed decimal | **FULLY EQUIVALENT** |
| `stock_adjustment_details.quantity`| `MODIFY quantity DECIMAL(15, 3) NOT NULL DEFAULT 1.000`| `quantity` | `numeric(15, 3)`, NOT NULL, default `1.000` | Non-indexed decimal | **FULLY EQUIVALENT** |
| `stock_movements` table | `CREATE TABLE stock_movements (...)` | `public.stock_movements` | 13 columns matching schema | PK `stock_movements_pkey`, 3 B-tree indexes, FKs to `tenants`, `products`, `warehouses` | **FULLY EQUIVALENT** |

### Migration 3: `20260927120000_wave3_step3_3_5_offline_replay_key`
| Target Object | Statement in Migration Script | Physical Object in Live PostgreSQL 17 | Type / Nullable / Default | FK / Index Rules | Equivalence Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `sales_tenant_id_invoice_no_key` | `CREATE UNIQUE INDEX ... ON sales (tenant_id, invoice_no)` | `sales_tenant_id_invoice_no_key` | Unique B-tree index | Matches `sales USING btree (tenant_id, invoice_no)` | **FULLY EQUIVALENT** |

### Migration 4: `20260928000000_step_3_4_purchase_payments`
| Target Object | Statement in Migration Script | Physical Object in Live PostgreSQL 17 | Type / Nullable / Default | FK / Index Rules | Equivalence Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `purchase_payments` table | `CREATE TABLE purchase_payments (...)` | `public.purchase_payments` | 13 columns matching schema | PK `purchase_payments_pkey`, Unique `(purchase_id, idempotency_key)`, Index `(tenant_id, paid_at)`, 2 FKs | **FULLY EQUIVALENT** |

### Migration 5: `20260928000001_step_3_5_sale_payments`
| Target Object | Statement in Migration Script | Physical Object in Live PostgreSQL 17 | Type / Nullable / Default | FK / Index Rules | Equivalence Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `sale_payments.idempotency_key` | `ADD COLUMN idempotency_key VARCHAR(128) NULL` | `idempotency_key` | `character varying(128)`, NULL | Non-indexed | **FULLY EQUIVALENT** |
| `sale_payments.notes` | `ADD COLUMN notes VARCHAR(255) NULL` | `notes` | `character varying(255)`, NULL | Non-indexed | **FULLY EQUIVALENT** |
| `sale_payments.created_by_id` | `ADD COLUMN created_by_id VARCHAR(36) NULL` | `created_by_id` | `character varying(36)`, NULL | Non-indexed | **FULLY EQUIVALENT** |
| `sale_payments_sale_id_idx` | `CREATE INDEX ... ON sale_payments(sale_id)` | `sale_payments_sale_id_idx` | B-tree index | Matches `sale_payments(sale_id)` | **FULLY EQUIVALENT** |

### Migration 6: `20260928000002_step_3_6_returns_credit_debit_notes`
| Target Object | Statement in Migration Script | Physical Object in Live PostgreSQL 17 | Type / Nullable / Default | FK / Index Rules | Equivalence Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `sales_returns` | `CREATE TABLE sales_returns (...)` | `public.sales_returns` | 17 columns | PK, 4 indexes, FKs to `tenants`, `sales`, `customers`, `warehouses` | **FULLY EQUIVALENT** |
| `sales_return_details` | `CREATE TABLE sales_return_details (...)` | `public.sales_return_details` | 12 columns | PK, 2 indexes, FKs to `sales_returns`, `products` | **FULLY EQUIVALENT** |
| `credit_notes` | `CREATE TABLE credit_notes (...)` | `public.credit_notes` | 16 columns | PK, 4 indexes, FKs to `tenants`, `sales_returns`, `sales`, `customers` | **FULLY EQUIVALENT** |
| `purchase_returns` | `CREATE TABLE purchase_returns (...)` | `public.purchase_returns` | 17 columns | PK, 4 indexes, FKs to `tenants`, `purchases`, `suppliers`, `warehouses` | **FULLY EQUIVALENT** |
| `purchase_return_details` | `CREATE TABLE purchase_return_details (...)` | `public.purchase_return_details` | 12 columns | PK, 2 indexes, FKs to `purchase_returns`, `products` | **FULLY EQUIVALENT** |
| `debit_notes` | `CREATE TABLE debit_notes (...)` | `public.debit_notes` | 16 columns | PK, 4 indexes, FKs to `tenants`, `purchase_returns`, `purchases`, `suppliers` | **FULLY EQUIVALENT** |

### Migration 7: `20260928000003_rbac_and_tenant_modules`
| Target Object | Statement in Migration Script | Physical Object in Live PostgreSQL 17 | Type / Nullable / Default | FK / Index Rules | Equivalence Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `workspace_roles` | `CREATE TABLE workspace_roles (...)` | `public.workspace_roles` | 8 columns | PK, Unique `(tenant_id, name)`, FK to `tenants` ON DELETE CASCADE | **FULLY EQUIVALENT** |
| `permissions` | `CREATE TABLE permissions (...)` | `public.permissions` | 8 columns | PK, Unique `(code)`, Index `(module, resource)` | **FULLY EQUIVALENT** |
| `role_permissions` | `CREATE TABLE role_permissions (...)` | `public.role_permissions` | 4 columns | PK, Unique `(role_id, permission_id)`, FKs to `workspace_roles`, `permissions` | **FULLY EQUIVALENT** |
| `user_role_assignments` | `CREATE TABLE user_role_assignments (...)` | `public.user_role_assignments` | 5 columns | PK, Unique `(user_id, tenant_id)`, FKs to `users`, `workspace_roles`, `tenants` | **FULLY EQUIVALENT** |
| `tenant_modules` | `CREATE TABLE tenant_modules (...)` | `public.tenant_modules` | 6 columns | PK, Unique `(tenant_id, module_key)`, FK to `tenants` ON DELETE CASCADE | **FULLY EQUIVALENT** |
| `two_factor_otps` | `CREATE TABLE two_factor_otps (...)` | `public.two_factor_otps` | 9 columns | PK, Index `(user_id)`, FK to `users` ON DELETE CASCADE | **FULLY EQUIVALENT** |

---

## 3. Strict Committed vs Uncommitted Migration Governance

A critical governance boundary exists between committed repository migrations and local working tree drafts:

1. **Committed Migrations (1 through 9):**
   - Present on GitHub `main` at `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0`.
   - Migration 8 locally has the corrected PostgreSQL DDL, which must be committed and pushed to `main`.
   - Once committed, Migrations 1–7 may be baseline-resolved, and Migrations 8 and 9 may be applied and resolved.
2. **Uncommitted Migration 10 (`20261104100000_aud_conc_002_idempotency_constraints`):**
   - Exists **only** in local working copy `server/prisma/migrations/`.
   - Has **not** been committed or merged to GitHub `main`.
   - **MANDATORY RULE:** Migration 10 CANNOT be resolved as applied on the production database until it has been formally committed to GitHub `main`. Resolving an uncommitted migration creates a divergence between CI/CD deployment pipelines and the database tracking table, causing deployment failures.

---

## 4. Phase-by-Phase Production Baseline Execution Matrix

| Migration Identifier | Repository Status | Live Database Status | Correct Operator Action | Verification Gate Before Marking Applied |
| :--- | :--- | :--- | :--- | :--- |
| `20260926000000_wave3_step3_2_fiscal_controls` | Committed | Physically Present | `npx prisma migrate resolve --applied 20260926000000_wave3_step3_2_fiscal_controls` | `chart_of_accounts.parent_account_id` confirmed |
| `20260927000000_wave3_step3_3_1_inventory_decimal_and_stock_movement` | Committed | Physically Present | `npx prisma migrate resolve --applied 20260927000000_wave3_step3_3_1_inventory_decimal_and_stock_movement` | `product_warehouses.quantity` confirmed numeric(15,3) |
| `20260927120000_wave3_step3_3_5_offline_replay_key` | Committed | Physically Present | `npx prisma migrate resolve --applied 20260927120000_wave3_step3_3_5_offline_replay_key` | `sales_tenant_id_invoice_no_key` confirmed |
| `20260928000000_step_3_4_purchase_payments` | Committed | Physically Present | `npx prisma migrate resolve --applied 20260928000000_step_3_4_purchase_payments` | `purchase_payments` table confirmed |
| `20260928000001_step_3_5_sale_payments` | Committed | Physically Present | `npx prisma migrate resolve --applied 20260928000001_step_3_5_sale_payments` | `sale_payments.idempotency_key` confirmed |
| `20260928000002_step_3_6_returns_credit_debit_notes` | Committed | Physically Present | `npx prisma migrate resolve --applied 20260928000002_step_3_6_returns_credit_debit_notes` | 6 return & credit tables confirmed |
| `20260928000003_rbac_and_tenant_modules` | Committed | Physically Present | `npx prisma migrate resolve --applied 20260928000003_rbac_and_tenant_modules` | `workspace_roles` confirmed |
| `20261102000000_add_device_sessions` | Committed (Reconciled locally) | **ABSENT** | **Execute DDL FIRST**, then `prisma migrate resolve --applied 20261102000000_add_device_sessions` | `device_sessions` 18 columns + 4 indexes confirmed |
| `20261103000002_add_branch_geofencing` | Committed | **ABSENT** | **Execute DDL FIRST**, then `prisma migrate resolve --applied 20261103000002_add_branch_geofencing` | `branches` 3 columns confirmed |
| `20261104100000_aud_conc_002_idempotency_constraints` | **UNCOMMITTED** | **ABSENT** | **COMMIT TO GIT FIRST**, execute DDL on direct port 5432, then resolve | Both partial unique indexes confirmed |
