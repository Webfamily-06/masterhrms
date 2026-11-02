-- AddDeviceSessions
-- Migration: 20261102000000_add_device_sessions
-- Safe to apply: creates new table only, no destructive changes

CREATE TABLE IF NOT EXISTS `device_sessions` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `tenant_id` VARCHAR(36) NULL,
  `device_name` VARCHAR(255) NULL,
  `device_type` VARCHAR(50) NOT NULL DEFAULT 'desktop',
  `browser` VARCHAR(100) NULL,
  `operating_system` VARCHAR(100) NULL,
  `ip_address` VARCHAR(45) NULL,
  `country` VARCHAR(100) NULL,
  `city` VARCHAR(100) NULL,
  `user_agent` TEXT NULL,
  `refresh_token_hash` VARCHAR(255) NULL,
  `last_active_at` DATETIME(3) NULL,
  `expires_at` DATETIME(3) NULL,
  `revoked_at` DATETIME(3) NULL,
  `revoked` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `device_sessions_user_id_idx`(`user_id`),
  INDEX `device_sessions_user_id_revoked_idx`(`user_id`, `revoked`),
  INDEX `device_sessions_tenant_id_idx`(`tenant_id`),
  INDEX `device_sessions_refresh_token_hash_idx`(`refresh_token_hash`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `device_sessions`
  ADD CONSTRAINT `device_sessions_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `device_sessions`
  ADD CONSTRAINT `device_sessions_tenant_id_fkey`
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

