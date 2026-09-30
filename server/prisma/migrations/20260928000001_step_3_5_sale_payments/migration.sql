-- AlterTable
ALTER TABLE `sale_payments`
  ADD COLUMN `idempotency_key` VARCHAR(128) NULL,
  ADD COLUMN `notes` VARCHAR(255) NULL,
  ADD COLUMN `created_by_id` VARCHAR(36) NULL;

-- CreateIndex
CREATE INDEX `sale_payments_sale_id_idx` ON `sale_payments`(`sale_id`);
