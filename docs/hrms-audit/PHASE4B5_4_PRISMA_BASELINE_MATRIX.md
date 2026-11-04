# MASTERHRMS — PHASE 4B.5.4
# PRISMA BASELINE EQUIVALENCE & RESOLUTION MATRIX (MIGRATIONS 1–7)

**Document Reference:** `docs/hrms-audit/PHASE4B5_4_PRISMA_BASELINE_MATRIX.md`  
**Date:** 2026-11-04  
**Auditor Roles:** Principal PostgreSQL Architect & Database Reliability Engineer  
**Repository:** `Webfamily-06/masterhrms`  
**Committed GitHub main HEAD:** `9e8749bfe0275f4bf684d23edf3763fd1e9c74c0`  
**Target Environment:** Supabase Managed PostgreSQL 17  

---

## 1. Baseline Principles & Governance Boundary

1. **Non-Execution Principle:** Migrations 1 through 7 contain legacy MySQL DDL (`ENGINE=InnoDB`, backticks, `DATETIME(3)`). Direct execution via `prisma migrate deploy` or `psql` fails immediately on PostgreSQL 17.
2. **Physical Parity Verification:** Before any migration is recorded as applied via `prisma migrate resolve --applied`, every object declared in that migration must be proven to exist in the live Supabase PostgreSQL 17 system catalogs with exact datatype and constraint compatibility.
3. **Classification Taxonomy:**
   - **ELIGIBLE FOR BASELINE:** All declared tables, columns, PKs, FKs, and unique indexes exist and match physical catalog metadata.
   - **NOT PROVEN:** Missing catalog evidence, unverified constraints, or datatype mismatch. (Such migrations MUST NOT be baseline-resolved).

---

## 2. Migration-by-Migration Baseline Evidence Matrix

### Migration 1: `20260926000000_wave3_step3_2_fiscal_controls`
- **File Checksum (SHA-256):** `82fc3c0f335768687f11a38ff17b0fcab31f616a6b4533c0a3892b590c4e319b`
- **Declared Objects:**
  1. `chart_of_accounts.parent_account_id` column (`VARCHAR(36) NULL`)
  2. Index `chart_of_accounts_tenant_id_parent_account_id_idx`
  3. FK `chart_of_accounts_parent_account_id_fkey` (`ON DELETE RESTRICT ON UPDATE CASCADE`)
  4. Table `fiscal_years` (11 columns, PK `id`, Unique `(tenant_id, name)`)
  5. Table `accounting_periods` (11 columns, PK `id`, Unique `(fiscal_year_id, name)`)
- **Live PostgreSQL 17 Catalog Verification:**
  - `chart_of_accounts.parent_account_id` present as `character varying(36)`, nullable.
  - Foreign key constraint confirmed in `pg_constraint` (`contype = 'f'`).
  - Index confirmed in `pg_indexes`.
  - Tables `fiscal_years` and `accounting_periods` present with respective PKs, FKs, and unique indexes.
- **Baseline Disposition:** **ELIGIBLE FOR BASELINE** (8/8 statements verified)

---

### Migration 2: `20260927000000_wave3_step3_3_1_inventory_decimal_and_stock_movement`
- **File Checksum (SHA-256):** `1e54d7530536c6773083c4d8e564d48f56664d6c69ba8bc01ca8104be459e368`
- **Declared Objects:**
  1. `product_warehouses.quantity` altered to `DECIMAL(15, 3) NOT NULL DEFAULT 0.000`
  2. `stock_transfer_details.quantity` altered to `DECIMAL(15, 3) NOT NULL DEFAULT 1.000`
  3. `stock_adjustment_details.quantity` altered to `DECIMAL(15, 3) NOT NULL DEFAULT 1.000`
  4. Table `stock_movements` (13 columns, PK `id`, 3 FKs, 3 indexes)
- **Live PostgreSQL 17 Catalog Verification:**
  - All three quantity columns confirmed as `numeric(15, 3)` with matching defaults in `information_schema.columns`.
  - Table `stock_movements` present with 13 columns, PK, and 3 FKs.
- **Baseline Disposition:** **ELIGIBLE FOR BASELINE** (4/4 statements verified)

---

### Migration 3: `20260927120000_wave3_step3_3_5_offline_replay_key`
- **File Checksum (SHA-256):** `0b00159cd62da860f770558a46312c7442e59907d481123796771e15ff043b5c`
- **Declared Objects:**
  1. Unique index on `sales (tenant_id, invoice_no)`
- **Live PostgreSQL 17 Catalog Verification:**
  - Index `sales_tenant_id_invoice_no_key` confirmed in `pg_indexes` with `UNIQUE INDEX` definition.
- **Baseline Disposition:** **ELIGIBLE FOR BASELINE** (1/1 statement verified)

---

### Migration 4: `20260928000000_step_3_4_purchase_payments`
- **File Checksum (SHA-256):** `56a2e25cd3b83379d9c0e37c363839d43a3f85e8163f74a269a6fe77d9e9221e`
- **Declared Objects:**
  1. Table `purchase_payments` (13 columns, PK `id`, Unique `(purchase_id, idempotency_key)`, Index `(tenant_id, paid_at)`, 2 FKs)
- **Live PostgreSQL 17 Catalog Verification:**
  - Table `purchase_payments` confirmed in `information_schema.tables`.
  - Primary key `purchase_payments_pkey` present.
  - Unique index `purchase_payments_purchase_id_idempotency_key_key` present.
  - Foreign keys to `purchases` and `payment_methods` present.
- **Baseline Disposition:** **ELIGIBLE FOR BASELINE** (1/1 statement verified)

---

### Migration 5: `20260928000001_step_3_5_sale_payments`
- **File Checksum (SHA-256):** `2beb6f48ab982aa0b02e3fb5fa2f096dc3957a0f26f6ab098e8482a16a40334f`
- **Declared Objects:**
  1. `sale_payments.idempotency_key` (`VARCHAR(128) NULL`)
  2. `sale_payments.notes` (`VARCHAR(255) NULL`)
  3. `sale_payments.created_by_id` (`VARCHAR(36) NULL`)
  4. Index `sale_payments_sale_id_idx`
- **Live PostgreSQL 17 Catalog Verification:**
  - Columns confirmed in `information_schema.columns`.
  - Index `sale_payments_sale_id_idx` confirmed in `pg_indexes`.
- **Baseline Disposition:** **ELIGIBLE FOR BASELINE** (4/4 statements verified)

---

### Migration 6: `20260928000002_step_3_6_returns_credit_debit_notes`
- **File Checksum (SHA-256):** `e64e132993688391e9ec4f7aa696ff92ff83ae86ad54643ea3ed902aa38a4a22`
- **Declared Objects:**
  1. Table `sales_returns` (17 columns, PK, 4 indexes, 4 FKs)
  2. Table `sales_return_details` (12 columns, PK, 2 indexes, 2 FKs)
  3. Table `credit_notes` (16 columns, PK, 4 indexes, 4 FKs)
  4. Table `purchase_returns` (17 columns, PK, 4 indexes, 4 FKs)
  5. Table `purchase_return_details` (12 columns, PK, 2 indexes, 2 FKs)
  6. Table `debit_notes` (16 columns, PK, 4 indexes, 4 FKs)
- **Live PostgreSQL 17 Catalog Verification:**
  - All 6 return/credit/debit tables verified in Supabase PostgreSQL 17.
  - Foreign keys, decimal columns, and indexes match schema requirements.
- **Baseline Disposition:** **ELIGIBLE FOR BASELINE** (6/6 statements verified)

---

### Migration 7: `20260928000003_rbac_and_tenant_modules`
- **File Checksum (SHA-256):** `b7c63561df634455428f392f91bb244aa28856d2ceca2d25e1c44645fae8e62c`
- **Declared Objects:**
  1. Table `workspace_roles` (8 columns, PK, Unique `(tenant_id, name)`)
  2. Table `permissions` (8 columns, PK, Unique `(code)`)
  3. Table `role_permissions` (4 columns, PK, Unique `(role_id, permission_id)`)
  4. Table `user_role_assignments` (5 columns, PK, Unique `(user_id, tenant_id)`)
- **Live PostgreSQL 17 Catalog Verification:**
  - All 4 RBAC tables confirmed present.
  - Unique indexes (`workspace_roles_tenant_id_name_key`, `permissions_code_key`, `role_permissions_role_id_permission_id_key`, `user_role_assignments_user_id_tenant_id_key`) verified.
- **Baseline Disposition:** **ELIGIBLE FOR BASELINE** (4/4 statements verified)

---

## 3. Ordered Baseline Resolution Strategy (Operator Sequence)

When production execution is authorized, the operator must execute the resolution commands in exact chronological order:

```bash
cd server

# 1. Fiscal Controls
npx prisma migrate resolve --applied 20260926000000_wave3_step3_2_fiscal_controls

# 2. Inventory Decimals & Stock Movements
npx prisma migrate resolve --applied 20260927000000_wave3_step3_3_1_inventory_decimal_and_stock_movement

# 3. Offline Replay Key
npx prisma migrate resolve --applied 20260927120000_wave3_step3_3_5_offline_replay_key

# 4. Purchase Payments
npx prisma migrate resolve --applied 20260928000000_step_3_4_purchase_payments

# 5. Sale Payments
npx prisma migrate resolve --applied 20260928000001_step_3_5_sale_payments

# 6. Returns, Credit & Debit Notes
npx prisma migrate resolve --applied 20260928000002_step_3_6_returns_credit_debit_notes

# 7. RBAC & Tenant Modules
npx prisma migrate resolve --applied 20260928000003_rbac_and_tenant_modules
```

> [!IMPORTANT]
> The above baseline sequence ONLY applies to Migrations 1–7. Migrations 8, 9, and 10 MUST NOT be resolved via `--applied`; they must be executed via `prisma migrate deploy` to create their physical schema objects.

