-- CreateTable sales_returns
CREATE TABLE IF NOT EXISTS `sales_returns` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `sale_id` VARCHAR(36) NOT NULL,
    `customer_id` VARCHAR(36) NULL,
    `warehouse_id` VARCHAR(36) NULL,
    `return_number` VARCHAR(100) NOT NULL,
    `return_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(50) NOT NULL DEFAULT 'draft',
    `reason` VARCHAR(255) NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `notes` TEXT NULL,
    `created_by_id` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sales_returns_tenant_id_return_number_key`(`tenant_id`, `return_number`),
    INDEX `sales_returns_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `sales_returns_tenant_id_sale_id_idx`(`tenant_id`, `sale_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable sales_return_details
CREATE TABLE IF NOT EXISTS `sales_return_details` (
    `id` VARCHAR(36) NOT NULL,
    `return_id` VARCHAR(36) NOT NULL,
    `product_id` VARCHAR(36) NOT NULL,
    `original_detail_id` VARCHAR(36) NULL,
    `product_name` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL DEFAULT 1.000,
    `unit_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `tax_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `is_restocked` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sales_return_details_return_id_idx`(`return_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable credit_notes
CREATE TABLE IF NOT EXISTS `credit_notes` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `return_id` VARCHAR(36) NULL,
    `sale_id` VARCHAR(36) NULL,
    `customer_id` VARCHAR(36) NULL,
    `note_number` VARCHAR(100) NOT NULL,
    `note_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `allocated_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `balance_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `reason` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `created_by_id` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `credit_notes_tenant_id_note_number_key`(`tenant_id`, `note_number`),
    INDEX `credit_notes_tenant_id_customer_id_idx`(`tenant_id`, `customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable purchase_returns
CREATE TABLE IF NOT EXISTS `purchase_returns` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `purchase_id` VARCHAR(36) NOT NULL,
    `supplier_id` VARCHAR(36) NULL,
    `warehouse_id` VARCHAR(36) NULL,
    `return_number` VARCHAR(100) NOT NULL,
    `return_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(50) NOT NULL DEFAULT 'draft',
    `reason` VARCHAR(255) NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `notes` TEXT NULL,
    `created_by_id` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `purchase_returns_tenant_id_return_number_key`(`tenant_id`, `return_number`),
    INDEX `purchase_returns_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `purchase_returns_tenant_id_purchase_id_idx`(`tenant_id`, `purchase_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable purchase_return_details
CREATE TABLE IF NOT EXISTS `purchase_return_details` (
    `id` VARCHAR(36) NOT NULL,
    `return_id` VARCHAR(36) NOT NULL,
    `product_id` VARCHAR(36) NOT NULL,
    `original_detail_id` VARCHAR(36) NULL,
    `product_name` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL DEFAULT 1.000,
    `unit_cost` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `tax_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `purchase_return_details_return_id_idx`(`return_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable debit_notes
CREATE TABLE IF NOT EXISTS `debit_notes` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(36) NOT NULL,
    `return_id` VARCHAR(36) NULL,
    `purchase_id` VARCHAR(36) NULL,
    `supplier_id` VARCHAR(36) NULL,
    `note_number` VARCHAR(100) NOT NULL,
    `note_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `allocated_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `balance_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `reason` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `created_by_id` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `debit_notes_tenant_id_note_number_key`(`tenant_id`, `note_number`),
    INDEX `debit_notes_tenant_id_supplier_id_idx`(`tenant_id`, `supplier_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sales_returns` ADD CONSTRAINT `sales_returns_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `sales_returns` ADD CONSTRAINT `sales_returns_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `sales_returns` ADD CONSTRAINT `sales_returns_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `sales_returns` ADD CONSTRAINT `sales_returns_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales_return_details` ADD CONSTRAINT `sales_return_details_return_id_fkey` FOREIGN KEY (`return_id`) REFERENCES `sales_returns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `sales_return_details` ADD CONSTRAINT `sales_return_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `sales_return_details` ADD CONSTRAINT `sales_return_details_original_detail_id_fkey` FOREIGN KEY (`original_detail_id`) REFERENCES `sale_details`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_notes` ADD CONSTRAINT `credit_notes_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `credit_notes` ADD CONSTRAINT `credit_notes_return_id_fkey` FOREIGN KEY (`return_id`) REFERENCES `sales_returns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `credit_notes` ADD CONSTRAINT `credit_notes_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `credit_notes` ADD CONSTRAINT `credit_notes_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_purchase_id_fkey` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `purchase_returns` ADD CONSTRAINT `purchase_returns_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_return_details` ADD CONSTRAINT `purchase_return_details_return_id_fkey` FOREIGN KEY (`return_id`) REFERENCES `purchase_returns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `purchase_return_details` ADD CONSTRAINT `purchase_return_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `purchase_return_details` ADD CONSTRAINT `purchase_return_details_original_detail_id_fkey` FOREIGN KEY (`original_detail_id`) REFERENCES `purchase_details`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `debit_notes` ADD CONSTRAINT `debit_notes_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `debit_notes` ADD CONSTRAINT `debit_notes_return_id_fkey` FOREIGN KEY (`return_id`) REFERENCES `purchase_returns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `debit_notes` ADD CONSTRAINT `debit_notes_purchase_id_fkey` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `debit_notes` ADD CONSTRAINT `debit_notes_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
