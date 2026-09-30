# Phase C — Wave 3 — Step 3.3.1: Migration Verification Report

## Migration Metadata
* **Migration Directory**: `server/prisma/migrations/20260927000000_wave3_step3_3_1_inventory_decimal_and_stock_movement/`
* **Migration Name**: `20260927000000_wave3_step3_3_1_inventory_decimal_and_stock_movement`
* **Execution Timestamp**: 2026-09-27T00:59:23+05:30
* **Target Database Host**: `127.0.0.1:3306`
* **Target Database Name**: `master_hrms_dev`
* **Applied Command**: `npx prisma migrate deploy` (ran from `/Users/apple/Documents/hrms/server`)
* **Execution Exit Code**: `0` (Success)
* **Remote Access Safeguard**: Verified that neither `.env` nor `server/.env` was modified, and no remote host (`147.79.66.214`) was accessed.

---

## 1. Migration SQL Review & Execution Proof

The applied SQL script contains exclusively safe, additive statements:

```sql
-- Phase C, Wave 3, Step 3.3.1: Inventory Decimal Precision and Stock Movement Ledger
-- Safe, additive migration: Alter integer quantity columns to DECIMAL(15, 3) and create stock_movements table.

-- AlterTable product_warehouses: Modify quantity to DECIMAL(15, 3) with default 0.000
ALTER TABLE `product_warehouses` MODIFY `quantity` DECIMAL(15, 3) NOT NULL DEFAULT 0.000;

-- AlterTable stock_transfer_details: Modify quantity to DECIMAL(15, 3) with default 1.000
ALTER TABLE `stock_transfer_details` MODIFY `quantity` DECIMAL(15, 3) NOT NULL DEFAULT 1.000;

-- AlterTable stock_adjustment_details: Modify quantity to DECIMAL(15, 3) with default 1.000
ALTER TABLE `stock_adjustment_details` MODIFY `quantity` DECIMAL(15, 3) NOT NULL DEFAULT 1.000;

-- CreateTable stock_movements
CREATE TABLE `stock_movements` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `product_id` VARCHAR(36) NOT NULL,
    `warehouse_id` VARCHAR(36) NOT NULL,
    `movement_type` VARCHAR(50) NOT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL,
    `before_quantity` DECIMAL(15, 3) NOT NULL,
    `after_quantity` DECIMAL(15, 3) NOT NULL,
    `reference_type` VARCHAR(50) NULL,
    `reference_id` VARCHAR(36) NULL,
    `notes` TEXT NULL,
    `created_by_id` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_movements_tenant_id_product_id_warehouse_id_idx`(`tenant_id`, `product_id`, `warehouse_id`),
    INDEX `stock_movements_tenant_id_reference_type_reference_id_idx`(`tenant_id`, `reference_type`, `reference_id`),
    INDEX `stock_movements_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
```

---

## 2. Live Database Verification Findings

Direct inspection of `INFORMATION_SCHEMA` in `master_hrms_dev` confirms:

### A. Column Modification Verification
| Table Name | Column | Data Type | Precision | Scale | Nullable | Default |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `product_warehouses` | `quantity` | `decimal` | 15 | 3 | NO | `0.000` |
| `stock_transfer_details` | `quantity` | `decimal` | 15 | 3 | NO | `1.000` |
| `stock_adjustment_details` | `quantity` | `decimal` | 15 | 3 | NO | `1.000` |

### B. `stock_movements` Table Verification
* Table exists: **YES** (`INFORMATION_SCHEMA.TABLES`)
* Character set: `utf8mb4` | Collation: `utf8mb4_unicode_ci`
* Column count: 13 columns verified:
  1. `id` (`varchar(36)`, PK)
  2. `tenant_id` (`varchar(36)`, FK)
  3. `product_id` (`varchar(36)`, FK)
  4. `warehouse_id` (`varchar(36)`, FK)
  5. `movement_type` (`varchar(50)`)
  6. `quantity` (`decimal(15,3)`)
  7. `before_quantity` (`decimal(15,3)`)
  8. `after_quantity` (`decimal(15,3)`)
  9. `reference_type` (`varchar(50)`, nullable)
  10. `reference_id` (`varchar(36)`, nullable)
  11. `notes` (`text`, nullable)
  12. `created_by_id` (`varchar(36)`, nullable)
  13. `created_at` (`datetime(3)`, default `CURRENT_TIMESTAMP(3)`)

### C. Foreign Key & Index Verification
* `stock_movements_tenant_id_fkey` $\to$ `tenants.id` (ON DELETE CASCADE)
* `stock_movements_product_id_fkey` $\to$ `products.id` (ON DELETE RESTRICT)
* `stock_movements_warehouse_id_fkey` $\to$ `warehouses.id` (ON DELETE RESTRICT)
* `stock_movements_tenant_id_product_id_warehouse_id_idx` (`tenant_id`, `product_id`, `warehouse_id`)
* `stock_movements_tenant_id_reference_type_reference_id_idx` (`tenant_id`, `reference_type`, `reference_id`)
* `stock_movements_tenant_id_created_at_idx` (`tenant_id`, `created_at`)

---

## 3. Migration History Table (`_prisma_migrations`)

```sql
SELECT migration_name, finished_at, rolled_back_at, applied_steps_count 
FROM _prisma_migrations;
```
Result:
1. `20260926000000_wave3_step3_2_fiscal_controls` | `finished_at: 2026-09-26 18:25:47` | `rolled_back_at: NULL` | `applied_steps_count: 1`
2. `20260927000000_wave3_step3_3_1_inventory_decimal_and_stock_movement` | `finished_at: 2026-09-27 00:59:23` | `rolled_back_at: NULL` | `applied_steps_count: 1`

`npx prisma migrate status` report:
> **Database schema is up to date!**

---

## 4. Confirmation of Non-Destructive Impact

1. No tables were dropped or renamed.
2. Step 3.2 tables (`fiscal_years`, `accounting_periods`, `chart_of_accounts.parent_account_id`) remain present and unhindered.
3. Pre-migration table count: 109 $\to$ Post-migration: 110 (+1 `stock_movements`).
4. Pre-migration record counts in all existing tables were 100% preserved.
