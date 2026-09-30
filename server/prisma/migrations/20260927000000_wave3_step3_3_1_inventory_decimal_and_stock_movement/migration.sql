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
