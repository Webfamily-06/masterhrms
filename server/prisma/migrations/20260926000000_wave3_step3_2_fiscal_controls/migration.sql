-- Phase C, Wave 3, Step 3.2. Additive only; no existing accounting rows are altered.
ALTER TABLE `chart_of_accounts` ADD COLUMN `parent_account_id` VARCHAR(36) NULL;
CREATE INDEX `chart_of_accounts_tenant_id_parent_account_id_idx` ON `chart_of_accounts`(`tenant_id`, `parent_account_id`);
ALTER TABLE `chart_of_accounts` ADD CONSTRAINT `chart_of_accounts_parent_account_id_fkey`
  FOREIGN KEY (`parent_account_id`) REFERENCES `chart_of_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `fiscal_years` (
  `id` VARCHAR(36) NOT NULL,
  `tenant_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `is_current` BOOLEAN NOT NULL DEFAULT false,
  `status` VARCHAR(20) NOT NULL DEFAULT 'open',
  `closed_at` DATETIME(3) NULL,
  `closed_by_id` VARCHAR(36) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fiscal_years_tenant_id_name_key` (`tenant_id`, `name`),
  KEY `fiscal_years_tenant_id_start_date_end_date_idx` (`tenant_id`, `start_date`, `end_date`),
  KEY `fiscal_years_tenant_id_is_current_idx` (`tenant_id`, `is_current`),
  CONSTRAINT `fiscal_years_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `accounting_periods` (
  `id` VARCHAR(36) NOT NULL,
  `tenant_id` VARCHAR(36) NOT NULL,
  `fiscal_year_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'open',
  `closed_at` DATETIME(3) NULL,
  `closed_by_id` VARCHAR(36) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `accounting_periods_fiscal_year_id_name_key` (`fiscal_year_id`, `name`),
  KEY `accounting_periods_tenant_id_start_date_end_date_idx` (`tenant_id`, `start_date`, `end_date`),
  KEY `accounting_periods_fiscal_year_id_start_date_end_date_idx` (`fiscal_year_id`, `start_date`, `end_date`),
  CONSTRAINT `accounting_periods_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `accounting_periods_fiscal_year_id_fkey` FOREIGN KEY (`fiscal_year_id`) REFERENCES `fiscal_years`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
